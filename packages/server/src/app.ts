import { Hono } from 'hono'
import { config } from './config.js'
import { listCampaigns, logImpression, registerPublisher, upsertCampaign, incrementCampaignSpend, type Campaign } from './r2.js'

const app = new Hono()

// Fraction of full CPM value each surface earns for publisher
const SURFACE_FRACTION: Record<string, number> = {
  'claude-code-spinner': 1.0,
  'claude-code-statusline': 0.2,
}

// Campaign cache — refresh every 60s to avoid R2 reads per impression
let campaignCache: { data: Campaign[]; expires: number } | null = null

async function selectCampaign(surface: string): Promise<{ campaign: Campaign; credits_delta: number } | null> {
  const now = Date.now()
  if (!campaignCache || now > campaignCache.expires) {
    try {
      const campaigns = await listCampaigns()
      campaignCache = { data: campaigns, expires: now + 60_000 }
    } catch (err) {
      console.error('[campaigns] list failed:', err instanceof Error ? err.message : err)
      // Serve from stale cache rather than dropping the impression
      if (!campaignCache) return null
    }
  }

  const nowIso = new Date().toISOString()
  const eligible = campaignCache.data.filter(c =>
    c.active &&
    c.starts_at <= nowIso &&
    c.ends_at >= nowIso &&
    c.spent_cents < c.budget_cents
  )

  if (eligible.length === 0) return null

  // Highest CPM wins — simple priority auction
  const campaign = eligible.sort((a, b) => b.cpm_cents - a.cpm_cents)[0]

  const surfaceFraction = SURFACE_FRACTION[surface] ?? 1.0
  const credits_delta = (campaign.cpm_cents / 1000 / 100) * config.publisherShare * surfaceFraction

  return { campaign, credits_delta }
}

app.post('/v1/impression', async (c) => {
  let body: { surface?: unknown; sdk_version?: unknown; publisher_token?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (typeof body.surface !== 'string' || !body.surface) {
    return c.json({ error: 'surface is required' }, 400)
  }

  const surface = body.surface
  const result = await selectCampaign(surface)

  if (!result) {
    // No fill — SDK checks res.ok + ad_text type, 204 triggers the graceful fallback
    return c.body(null, 204)
  }

  const { campaign, credits_delta } = result
  const costCents = campaign.cpm_cents / 1000

  const impression = {
    campaign_id: campaign.id,
    surface,
    sdk_version: typeof body.sdk_version === 'string' ? body.sdk_version : 'unknown',
    ad_text: campaign.ad_text,
    url: campaign.url,
    credits_delta,
    cost_cents: costCents,
    timestamp: new Date().toISOString(),
    tool: 'claude-code',
    publisher_token: typeof body.publisher_token === 'string' ? body.publisher_token : null,
  }

  // Fire-and-forget: log impression + update spend concurrently, don't block response
  void Promise.all([
    logImpression(impression),
    incrementCampaignSpend(campaign.id, costCents),
  ])

  // Invalidate cache so spend change reflects within next 60s window
  if (campaignCache) {
    const cached = campaignCache.data.find(c => c.id === campaign.id)
    if (cached) cached.spent_cents += costCents
  }

  return c.json({ ad_text: campaign.ad_text, url: campaign.url, credits_delta })
})

app.post('/v1/publisher/register', async (c) => {
  let body: { email?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (typeof body.email !== 'string' || !body.email.includes('@')) {
    return c.json({ error: 'valid email is required' }, 400)
  }

  try {
    const publisher = await registerPublisher(body.email)
    return c.json({ token: publisher.token, registered_at: publisher.registered_at })
  } catch (err) {
    console.error('[register]', err instanceof Error ? err.message : err)
    return c.json({ error: 'registration failed' }, 500)
  }
})

// Admin: create or update a campaign
// Protected by ADMIN_TOKEN header
app.post('/v1/admin/campaign', async (c) => {
  if (c.req.header('x-admin-token') !== config.adminToken) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  let body: Partial<Campaign>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (
    typeof body.ad_text !== 'string' ||
    typeof body.url !== 'string' ||
    typeof body.advertiser_name !== 'string' ||
    typeof body.budget_cents !== 'number' ||
    typeof body.cpm_cents !== 'number' ||
    typeof body.starts_at !== 'string' ||
    typeof body.ends_at !== 'string'
  ) {
    return c.json({ error: 'missing required fields: ad_text, url, advertiser_name, budget_cents, cpm_cents, starts_at, ends_at' }, 400)
  }

  const campaign: Campaign = {
    id: body.id ?? crypto.randomUUID(),
    advertiser_name: body.advertiser_name,
    ad_text: body.ad_text,
    url: body.url,
    budget_cents: body.budget_cents,
    spent_cents: body.spent_cents ?? 0,
    cpm_cents: body.cpm_cents,
    active: body.active ?? true,
    starts_at: body.starts_at,
    ends_at: body.ends_at,
    created_at: body.created_at ?? new Date().toISOString(),
  }

  try {
    await upsertCampaign(campaign)
    // Bust cache so new campaign is picked up immediately
    campaignCache = null
    return c.json({ campaign })
  } catch (err) {
    console.error('[admin/campaign]', err instanceof Error ? err.message : err)
    return c.json({ error: 'failed to save campaign' }, 500)
  }
})

// Admin: list all campaigns (for dashboard)
app.get('/v1/admin/campaigns', async (c) => {
  if (c.req.header('x-admin-token') !== config.adminToken) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  try {
    const campaigns = await listCampaigns()
    return c.json({ campaigns })
  } catch (err) {
    console.error('[admin/campaigns]', err instanceof Error ? err.message : err)
    return c.json({ error: 'failed to list campaigns' }, 500)
  }
})

app.get('/health', (c) => c.json({ ok: true }))

export default app
