import { Hono, type Context } from 'hono'
import { timingSafeEqual } from 'node:crypto'
import { config } from './config.js'
import { listCampaigns, logImpression, registerPublisher, upsertCampaign, incrementCampaignSpend, creditLedger, getLedger, listLedgers, listPublishers, getPublisherByToken, getPayouts, recordPayout, createPayoutRequest, getPayoutRequests, listPayoutRequests, updatePayoutRequestStatus, getAdminStats, registerAdvertiser, listAdvertisers, getCampaign, type Campaign, type Payout, type PayoutRequest, type Advertiser } from './r2.js'
import { allow } from './ratelimit.js'
import { withLock } from './locks.js'
import { isPublisherToken, isUuid, isValidAdUrl, isValidEmail, isIsoDate, sanitizeAdText, sanitizeLine, AD_TEXT_MAX } from './validate.js'
import { log } from './logger.js'
import { ADMIN_HTML } from './admin.js'
import { STATS_HTML } from './stats.js'
import { ADVERTISER_HTML } from './advertiser.js'
import { LANDING_HTML } from './landing.js'

const app = new Hono()

// Serve landing page at root
app.get('/', (c) => c.html(LANDING_HTML))

// Surface 5xx responses in structured logs; individual handlers already log
// their own failure detail.
app.use('*', async (c, next) => {
  await next()
  if (c.res.status >= 500) {
    log.error('http.5xx', undefined, { method: c.req.method, path: c.req.path, status: c.res.status })
  }
})

// Constant-time admin auth — a plain === leaks token prefixes through timing.
function isAdmin(c: Context): boolean {
  const given = c.req.header('x-admin-token') ?? ''
  const a = Buffer.from(given)
  const b = Buffer.from(config.adminToken)
  return a.length === b.length && timingSafeEqual(a, b)
}

function clientIp(c: Context): string {
  // Fly terminates TLS and sets Fly-Client-IP; X-Forwarded-For as fallback.
  return c.req.header('fly-client-ip')
    ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'
}

// Hooks fire at most every 5s per process (12/min); generous headroom for
// parallel CI agents sharing one token or NAT'd IP.
const IMPRESSION_LIMIT = { limit: 60, windowMs: 60_000 }
const REGISTER_LIMIT = { limit: 10, windowMs: 3_600_000 }

// Fraction of full CPM value each surface earns for publisher
const SURFACE_FRACTION: Record<string, number> = {
  'claude-code-spinner': 1.0,
  'claude-code-statusline': 0.2,
  'claude-code-userprompt': 1.0,
}

// Base credits for default (env-var) ad per full-fraction impression
const DEFAULT_BASE_CREDITS = 0.001

// Campaign cache — refresh every 60s to avoid R2 reads per impression
let campaignCache: { data: Campaign[]; expires: number } | null = null

// Test hook.
export function resetCampaignCache(): void {
  campaignCache = null
}

async function loadCampaigns(): Promise<Campaign[]> {
  const now = Date.now()
  if (!campaignCache || now > campaignCache.expires) {
    try {
      const campaigns = await listCampaigns()
      campaignCache = { data: campaigns, expires: now + 60_000 }
    } catch (err) {
      log.error('campaigns.list_failed', err)
      if (!campaignCache) {
        // No stale cache — callers fall back to the default ad / no-fill
        campaignCache = { data: [], expires: 0 }
      }
    }
  }
  return campaignCache.data
}

// Only 'active' serves: pending (awaiting review), rejected, and paused
// campaigns must never reach a publisher terminal — nor be billed for one.
function isServable(c: Campaign, nowIso: string): boolean {
  return (
    c.status === 'active' &&
    c.starts_at <= nowIso &&
    c.ends_at >= nowIso &&
    c.spent_cents < c.budget_cents
  )
}

async function selectCampaign(surface: string): Promise<{ campaign: Campaign; credits_delta: number } | null> {
  const campaigns = await loadCampaigns()

  const nowIso = new Date().toISOString()
  const eligible = campaigns.filter(c => isServable(c, nowIso))

  const surfaceFraction = SURFACE_FRACTION[surface] ?? 1.0

  if (eligible.length === 0) {
    // Fall back to default env-var ad (house ad / placeholder)
    if (!config.defaultAd.text || !config.defaultAd.url) return null
    const credits_delta = DEFAULT_BASE_CREDITS * surfaceFraction
    return {
      campaign: {
        id: 'default',
        advertiser_name: 'default',
        ad_text: config.defaultAd.text,
        url: config.defaultAd.url,
        budget_cents: Infinity,
        spent_cents: 0,
        cpm_cents: 0,
        active: true,
        status: 'active' as const,
        advertiser_token: null,
        daily: {},
        starts_at: '',
        ends_at: '',
        created_at: '',
      },
      credits_delta,
    }
  }

  // Highest CPM wins — simple priority auction. Campaigns tied at the top
  // CPM rotate randomly so multiple advertisers at the same price all get
  // impressions instead of one starving the rest.
  const sorted = eligible.sort((a, b) => b.cpm_cents - a.cpm_cents)
  const topCpm = sorted[0].cpm_cents
  const top = sorted.filter(c => c.cpm_cents === topCpm)
  const campaign = top[Math.floor(Math.random() * top.length)]
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

  if (typeof body.surface !== 'string' || !body.surface || body.surface.length > 64) {
    return c.json({ error: 'surface is required' }, 400)
  }

  // Tokens are server-issued UUIDs and become R2 object keys — anything else
  // is either a misconfigured publisher or a key-traversal attempt.
  const publisherToken = isPublisherToken(body.publisher_token) ? body.publisher_token : null
  if (body.publisher_token != null && !publisherToken) {
    return c.json({ error: 'invalid publisher_token' }, 400)
  }

  if (!allow(`imp:${publisherToken ?? `ip:${clientIp(c)}`}`, IMPRESSION_LIMIT)) {
    return c.json({ error: 'rate limited' }, 429)
  }

  const surface = body.surface
  const result = await selectCampaign(surface)

  if (!result) {
    // No fill — SDK checks res.ok + ad_text type, 204 triggers the graceful fallback
    return c.body(null, 204)
  }

  const { campaign, credits_delta } = result
  const costCents = campaign.cpm_cents / 1000

  // Sanitize at serve time too: covers campaigns written before validation
  // existed and the env-var default ad. This text lands in raw terminals.
  const adText = sanitizeAdText(campaign.ad_text)

  const impression = {
    campaign_id: campaign.id,
    surface,
    sdk_version: typeof body.sdk_version === 'string' ? body.sdk_version : 'unknown',
    ad_text: adText,
    url: campaign.url,
    credits_delta,
    cost_cents: costCents,
    timestamp: new Date().toISOString(),
    tool: 'claude-code',
    publisher_token: publisherToken,
  }

  // Fire-and-forget: log impression + update spend + credit ledger concurrently, don't block response
  void Promise.all([
    logImpression(impression),
    // Default (env-var) ad has no stored campaign object and costs nothing
    campaign.id !== 'default' ? incrementCampaignSpend(campaign.id, costCents) : Promise.resolve(),
    impression.publisher_token
      ? creditLedger(impression.publisher_token, credits_delta, impression.timestamp)
      : Promise.resolve(),
  ])

  // Invalidate cache so spend change reflects within next 60s window
  if (campaignCache) {
    const cached = campaignCache.data.find(c => c.id === campaign.id)
    if (cached) cached.spent_cents += costCents
  }

  // campaign_id lets a client that renders the ad later (see
  // /v1/impression/confirm) tell us exactly which campaign it displayed.
  return c.json({ ad_text: adText, url: campaign.url, credits_delta, campaign_id: campaign.id })
})

// Deferred render confirmation.
//
// The ambient surface cannot bill at fetch time. Claude Code reads
// `spinnerVerbs` from settings.json once at startup, so an ad fetched during
// session N is not on screen until session N+1 — and never, if the user does
// not start another session. Billing at fetch would charge advertisers for
// impressions that never happened.
//
// So the client records which campaign it cached and calls this once the ad
// is actually being displayed. No auction runs here: we bill the campaign the
// client named, or nothing at all.
app.post('/v1/impression/confirm', async (c) => {
  let body: { campaign_id?: unknown; surface?: unknown; sdk_version?: unknown; publisher_token?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (typeof body.surface !== 'string' || !body.surface || body.surface.length > 64) {
    return c.json({ error: 'surface is required' }, 400)
  }
  if (typeof body.campaign_id !== 'string' || !isUuid(body.campaign_id)) {
    return c.json({ error: 'campaign_id must be a UUID' }, 400)
  }

  const publisherToken = isPublisherToken(body.publisher_token) ? body.publisher_token : null
  if (body.publisher_token != null && !publisherToken) {
    return c.json({ error: 'invalid publisher_token' }, 400)
  }

  // Shares the impression bucket: a confirm costs an advertiser real money,
  // so it must not be a way around the impression rate limit.
  if (!allow(`imp:${publisherToken ?? `ip:${clientIp(c)}`}`, IMPRESSION_LIMIT)) {
    return c.json({ error: 'rate limited' }, 429)
  }

  const campaigns = await loadCampaigns()
  const campaign = campaigns.find(cp => cp.id === body.campaign_id)

  // Unknown campaign, or one that has since been paused, rejected, exhausted
  // or run past its end date. The client is still showing it (it cannot know
  // until its next fetch), but the advertiser has stopped paying — so we do
  // not bill. 204 keeps this a normal outcome rather than a client error.
  if (!campaign || !isServable(campaign, new Date().toISOString())) {
    return c.body(null, 204)
  }

  const surface = body.surface
  const surfaceFraction = SURFACE_FRACTION[surface] ?? 1.0
  const costCents = campaign.cpm_cents / 1000
  const credits_delta = (campaign.cpm_cents / 1000 / 100) * config.publisherShare * surfaceFraction

  const impression = {
    campaign_id: campaign.id,
    surface,
    sdk_version: typeof body.sdk_version === 'string' ? body.sdk_version : 'unknown',
    ad_text: sanitizeAdText(campaign.ad_text),
    url: campaign.url,
    credits_delta,
    cost_cents: costCents,
    timestamp: new Date().toISOString(),
    tool: 'claude-code',
    publisher_token: publisherToken,
    // Distinguishes a deferred render from a fetch-time impression in the log.
    deferred: true,
  }

  void Promise.all([
    logImpression(impression),
    incrementCampaignSpend(campaign.id, costCents),
    publisherToken
      ? creditLedger(publisherToken, credits_delta, impression.timestamp)
      : Promise.resolve(),
  ])

  if (campaignCache) {
    const cached = campaignCache.data.find(cp => cp.id === campaign.id)
    if (cached) cached.spent_cents += costCents
  }

  return c.json({ credits_delta })
})

app.post('/v1/publisher/register', async (c) => {
  let body: { email?: unknown; name?: unknown; role?: unknown; country?: unknown; heard_from?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (!isValidEmail(body.email)) {
    return c.json({ error: 'valid email is required' }, 400)
  }

  // name required; role/country/heard_from optional profile fields for targeting.
  const name = typeof body.name === 'string' ? sanitizeLine(body.name, 80) : ''
  if (!name) {
    return c.json({ error: 'name is required' }, 400)
  }
  const profile = {
    name,
    role: typeof body.role === 'string' && body.role.trim() ? sanitizeLine(body.role, 80) : undefined,
    country: typeof body.country === 'string' && body.country.trim() ? sanitizeLine(body.country, 80) : undefined,
    heard_from: typeof body.heard_from === 'string' && body.heard_from.trim() ? sanitizeLine(body.heard_from, 120) : undefined,
  }

  if (!allow(`reg:${clientIp(c)}`, REGISTER_LIMIT)) {
    return c.json({ error: 'rate limited' }, 429)
  }

  try {
    const publisher = await registerPublisher(body.email, profile)
    return c.json({ token: publisher.token, name: publisher.name, registered_at: publisher.registered_at })
  } catch (err) {
    log.error('register.failed', err)
    return c.json({ error: 'registration failed' }, 500)
  }
})

// Admin: create or update a campaign
// Protected by ADMIN_TOKEN header
app.post('/v1/admin/campaign', async (c) => {
  if (!isAdmin(c)) {
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

  const adText = sanitizeAdText(body.ad_text)
  if (!adText) {
    return c.json({ error: `ad_text must contain printable text (max ${AD_TEXT_MAX} chars)` }, 400)
  }
  if (!isValidAdUrl(body.url)) {
    return c.json({ error: 'url must be a valid http(s) URL' }, 400)
  }
  if (!body.advertiser_name.trim() || body.advertiser_name.length > 100) {
    return c.json({ error: 'advertiser_name must be 1–100 chars' }, 400)
  }
  if (!Number.isFinite(body.budget_cents) || body.budget_cents <= 0 || !Number.isFinite(body.cpm_cents) || body.cpm_cents <= 0) {
    return c.json({ error: 'budget_cents and cpm_cents must be positive numbers' }, 400)
  }
  if (!isIsoDate(body.starts_at) || !isIsoDate(body.ends_at) || body.ends_at <= body.starts_at) {
    return c.json({ error: 'starts_at and ends_at must be ISO dates with ends_at after starts_at' }, 400)
  }
  // id becomes an R2 object key — restrict to server-generated UUID shape.
  if (body.id !== undefined && !isUuid(body.id)) {
    return c.json({ error: 'id must be a UUID' }, 400)
  }

  // Legacy `active` maps to status; maintainer-created campaigns go straight
  // to 'active' (no self-review needed).
  const status = body.status ?? ((body.active ?? true) ? 'active' : 'paused')

  const campaign: Campaign = {
    id: body.id ?? crypto.randomUUID(),
    advertiser_name: body.advertiser_name.trim(),
    ad_text: adText,
    url: body.url,
    budget_cents: body.budget_cents,
    spent_cents: body.spent_cents ?? 0,
    cpm_cents: body.cpm_cents,
    active: status === 'active',
    status,
    advertiser_token: body.advertiser_token ?? null,
    daily: body.daily ?? {},
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
    log.error('admin.campaign_save_failed', err)
    return c.json({ error: 'failed to save campaign' }, 500)
  }
})

// Admin: list all campaigns (for dashboard), joined with advertiser emails
app.get('/v1/admin/campaigns', async (c) => {
  if (!isAdmin(c)) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  try {
    const [campaigns, advertisers] = await Promise.all([listCampaigns(), listAdvertisers()])
    const emailByToken = new Map(advertisers.map(a => [a.token, a.email]))
    return c.json({
      campaigns: campaigns.map(cp => ({
        ...cp,
        advertiser_email: cp.advertiser_token ? emailByToken.get(cp.advertiser_token) ?? null : null,
      })),
    })
  } catch (err) {
    log.error('admin.campaigns_list_failed', err)
    return c.json({ error: 'failed to list campaigns' }, 500)
  }
})

// Admin: list advertisers (email join + lost-token recovery)
app.get('/v1/admin/advertisers', async (c) => {
  if (!isAdmin(c)) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  try {
    return c.json({ advertisers: await listAdvertisers() })
  } catch (err) {
    log.error('admin.advertisers_list_failed', err)
    return c.json({ error: 'failed to list advertisers' }, 500)
  }
})

// Admin: approve or reject a pending campaign. Approve activates immediately
// (invoice trails — explicit v1 policy) and sets the funded budget.
app.post('/v1/admin/campaign/:id/review', async (c) => {
  if (!isAdmin(c)) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const id = c.req.param('id')
  if (!isUuid(id)) {
    return c.json({ error: 'invalid campaign id' }, 400)
  }

  let body: { action?: unknown; budget_cents?: unknown; cpm_cents?: unknown; rejection_reason?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (body.action !== 'approve' && body.action !== 'reject') {
    return c.json({ error: "action must be 'approve' or 'reject'" }, 400)
  }

  try {
    const result = await withLockedCampaign(id, async (campaign) => {
      if (campaign.status !== 'pending') {
        return { status: 409 as const, error: `campaign is ${campaign.status}, not pending` }
      }

      if (body.action === 'approve') {
        const budget = typeof body.budget_cents === 'number' && Number.isFinite(body.budget_cents)
          ? body.budget_cents
          : campaign.requested_budget_cents ?? 0
        if (budget <= 0) {
          return { status: 400 as const, error: 'budget_cents required (no requested budget to fall back on)' }
        }
        campaign.status = 'active'
        campaign.budget_cents = budget
        if (typeof body.cpm_cents === 'number' && Number.isFinite(body.cpm_cents) && body.cpm_cents > 0) {
          campaign.cpm_cents = body.cpm_cents
        }
      } else {
        campaign.status = 'rejected'
        campaign.rejection_reason = sanitizeLine(body.rejection_reason, 300) || 'not approved'
      }

      await upsertCampaign(campaign)
      return { status: 200 as const, campaign }
    })

    if (!result) return c.json({ error: 'campaign not found' }, 404)
    if (result.status !== 200) return c.json({ error: result.error }, result.status)

    campaignCache = null  // approval/rejection affects serving immediately
    log.info('admin.campaign_reviewed', { campaign_id: id, action: body.action })
    return c.json({ campaign: result.campaign })
  } catch (err) {
    log.error('admin.campaign_review_failed', err, { campaign_id: id })
    return c.json({ error: 'review failed' }, 500)
  }
})

// ---------- Advertiser portal API ----------

const ADVERTISER_CREATE_LIMIT = { limit: 10, windowMs: 3_600_000 }
const ADVERTISER_LIST_LIMIT = { limit: 60, windowMs: 60_000 }

// Resolve Bearer token → advertiser via list-scan (n≤10s scale; rate limits
// above protect the scan from unauthenticated cost amplification).
async function advertiserFromBearer(c: Context): Promise<Advertiser | null> {
  const auth = c.req.header('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined
  if (!isUuid(token)) return null
  const advertisers = await listAdvertisers()
  return advertisers.find(a => a.token === token) ?? null
}

// Load + mutate a campaign under its lock (same key incrementCampaignSpend
// uses, so status transitions never race spend updates). Null when missing.
async function withLockedCampaign<T>(id: string, fn: (campaign: Campaign) => Promise<T>): Promise<T | null> {
  return withLock(`campaigns/${id}.json`, async () => {
    const campaign = await getCampaign(id)
    if (!campaign) return null
    return fn(campaign)
  })
}

app.post('/v1/advertiser/register', async (c) => {
  let body: { email?: unknown; company_name?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (!isValidEmail(body.email)) {
    return c.json({ error: 'valid email is required' }, 400)
  }
  const company = sanitizeLine(body.company_name)
  if (!company) {
    return c.json({ error: 'company_name is required (1–100 chars)' }, 400)
  }

  if (!allow(`adreg:${clientIp(c)}`, REGISTER_LIMIT)) {
    return c.json({ error: 'rate limited' }, 429)
  }

  try {
    const { advertiser, existing } = await registerAdvertiser(body.email, company)
    if (existing) {
      // Anti-hijack: never return the token for a known email. Maintainer
      // re-sends manually via GET /v1/admin/advertisers.
      return c.json({ ok: true })
    }
    return c.json({ token: advertiser.token, registered_at: advertiser.registered_at })
  } catch (err) {
    log.error('advertiser.register_failed', err)
    return c.json({ error: 'registration failed' }, 500)
  }
})

app.get('/v1/advertiser/campaigns', async (c) => {
  if (!allow(`advlist:${clientIp(c)}`, ADVERTISER_LIST_LIMIT)) {
    return c.json({ error: 'rate limited' }, 429)
  }

  try {
    const advertiser = await advertiserFromBearer(c)
    if (!advertiser) {
      return c.json({ error: 'advertiser token required (Authorization: Bearer <token>)' }, 401)
    }

    const campaigns = (await listCampaigns()).filter(cp => cp.advertiser_token === advertiser.token)
    return c.json({
      company_name: advertiser.company_name,
      campaigns: campaigns.map(cp => ({
        id: cp.id,
        ad_text: cp.ad_text,
        url: cp.url,
        cpm_cents: cp.cpm_cents,
        budget_cents: cp.budget_cents,
        requested_budget_cents: cp.requested_budget_cents ?? null,
        // Display spend capped at budget: the 60s cache can overrun slightly;
        // the network eats overrun, the advertiser never sees spend > budget.
        spent_cents: Math.min(cp.spent_cents, cp.budget_cents),
        // True counts from daily buckets — derived spent/cpm math corrupts
        // under CPM override at approval.
        impressions_delivered: Object.values(cp.daily).reduce((sum, d) => sum + d.impressions, 0),
        daily: cp.daily,
        status: cp.status,
        rejection_reason: cp.rejection_reason ?? null,
        starts_at: cp.starts_at,
        ends_at: cp.ends_at,
        created_at: cp.created_at,
      })),
    })
  } catch (err) {
    log.error('advertiser.campaigns_failed', err)
    return c.json({ error: 'failed to load campaigns' }, 500)
  }
})

app.post('/v1/advertiser/campaign', async (c) => {
  let advertiser: Advertiser | null
  try {
    advertiser = await advertiserFromBearer(c)
  } catch (err) {
    log.error('advertiser.auth_failed', err)
    return c.json({ error: 'auth failed' }, 500)
  }
  if (!advertiser) {
    return c.json({ error: 'advertiser token required (Authorization: Bearer <token>)' }, 401)
  }

  if (!allow(`advcreate:${advertiser.token}`, ADVERTISER_CREATE_LIMIT)) {
    return c.json({ error: 'rate limited' }, 429)
  }

  let body: { ad_text?: unknown; url?: unknown; cpm_cents?: unknown; requested_budget_cents?: unknown; starts_at?: unknown; ends_at?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (typeof body.ad_text !== 'string' || typeof body.url !== 'string' || typeof body.starts_at !== 'string' || typeof body.ends_at !== 'string') {
    return c.json({ error: 'required: ad_text, url, cpm_cents, requested_budget_cents, starts_at, ends_at' }, 400)
  }
  const adText = sanitizeAdText(body.ad_text)
  if (!adText) {
    return c.json({ error: `ad_text must contain printable text (max ${AD_TEXT_MAX} chars)` }, 400)
  }
  if (!isValidAdUrl(body.url)) {
    return c.json({ error: 'url must be a valid http(s) URL' }, 400)
  }
  if (typeof body.cpm_cents !== 'number' || !Number.isFinite(body.cpm_cents) || body.cpm_cents <= 0) {
    return c.json({ error: 'cpm_cents must be a positive number' }, 400)
  }
  if (typeof body.requested_budget_cents !== 'number' || !Number.isInteger(body.requested_budget_cents) || body.requested_budget_cents <= 0) {
    return c.json({ error: 'requested_budget_cents must be a positive integer' }, 400)
  }
  if (!isIsoDate(body.starts_at) || !isIsoDate(body.ends_at) || body.ends_at <= body.starts_at) {
    return c.json({ error: 'starts_at and ends_at must be ISO dates with ends_at after starts_at' }, 400)
  }

  // Forced server-side: pending status, zero funded budget, caller ownership.
  // NO edit endpoint exists by design — content changes go through a new
  // campaign + review, or the human-review gate would be bypassable.
  const campaign: Campaign = {
    id: crypto.randomUUID(),
    advertiser_name: advertiser.company_name,
    ad_text: adText,
    url: body.url,
    budget_cents: 0,
    requested_budget_cents: body.requested_budget_cents,
    spent_cents: 0,
    cpm_cents: body.cpm_cents,
    active: false,
    status: 'pending',
    advertiser_token: advertiser.token,
    daily: {},
    starts_at: body.starts_at,
    ends_at: body.ends_at,
    created_at: new Date().toISOString(),
  }

  try {
    await upsertCampaign(campaign)
    log.info('campaign.pending_created', { campaign_id: campaign.id, advertiser_email: advertiser.email, requested_budget_cents: body.requested_budget_cents })
    return c.json({ campaign: { id: campaign.id, status: campaign.status } })
  } catch (err) {
    log.error('advertiser.campaign_create_failed', err)
    return c.json({ error: 'failed to create campaign' }, 500)
  }
})

async function advertiserSetPaused(c: Context, paused: boolean) {
  const id = c.req.param('id')
  if (!isUuid(id)) {
    return c.json({ error: 'invalid campaign id' }, 400)
  }

  let advertiser: Advertiser | null
  try {
    advertiser = await advertiserFromBearer(c)
  } catch (err) {
    log.error('advertiser.auth_failed', err)
    return c.json({ error: 'auth failed' }, 500)
  }
  if (!advertiser) {
    return c.json({ error: 'advertiser token required' }, 401)
  }

  try {
    const result = await withLockedCampaign(id, async (campaign) => {
      // Tenancy: the id alone is never sufficient authority. 404 (not 403)
      // so existence of other advertisers' campaign ids doesn't leak.
      if (campaign.advertiser_token !== advertiser!.token) {
        return { status: 404 as const, error: 'campaign not found' }
      }
      const from = paused ? 'active' : 'paused'
      if (campaign.status !== from) {
        return { status: 409 as const, error: `campaign is ${campaign.status}, not ${from}` }
      }
      campaign.status = paused ? 'paused' : 'active'
      await upsertCampaign(campaign)
      return { status: 200 as const, campaign }
    })

    if (!result) return c.json({ error: 'campaign not found' }, 404)
    if (result.status !== 200) return c.json({ error: result.error }, result.status)

    campaignCache = null  // pause/resume affects serving immediately
    return c.json({ campaign: { id, status: result.campaign.status } })
  } catch (err) {
    log.error('advertiser.pause_failed', err, { campaign_id: id })
    return c.json({ error: 'failed to update campaign' }, 500)
  }
}

app.post('/v1/advertiser/campaign/:id/pause', (c) => advertiserSetPaused(c, true))
app.post('/v1/advertiser/campaign/:id/resume', (c) => advertiserSetPaused(c, false))

// Minimum unpaid balance (credits == USD) before a publisher is payable
const PAYOUT_MIN = 10

// Publisher earnings — authenticated by publisher_token (bearer or query)
app.get('/v1/publisher/earnings', async (c) => {
  const auth = c.req.header('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : c.req.query('token')

  if (!isPublisherToken(token)) {
    return c.json({ error: 'publisher token required (Authorization: Bearer <token>)' }, 401)
  }

  try {
    const [ledger, payouts, publisher, requests] = await Promise.all([
      getLedger(token), getPayouts(token), getPublisherByToken(token), getPayoutRequests(token),
    ])
    const paid = payouts.reduce((sum, p) => sum + p.amount, 0)
    const total = ledger?.total_credits ?? 0
    return c.json({
      name: publisher?.name ?? null,
      total_credits: total,
      total_impressions: ledger?.total_impressions ?? 0,
      paid_credits: paid,
      unpaid_credits: Math.max(0, total - paid),
      payout_minimum: PAYOUT_MIN,
      payouts,
      payout_requests: requests,
      daily: ledger?.daily ?? {},
      updated_at: ledger?.updated_at ?? null,
    })
  } catch (err) {
    log.error('earnings.load_failed', err)
    return c.json({ error: 'failed to load earnings' }, 500)
  }
})

// Accepted cash-out destinations
const PAYOUT_METHODS = new Set(['paypal', 'bank', 'wise', 'other'])
const PAYOUT_REQUEST_LIMIT = { limit: 5, windowMs: 3_600_000 }

// Publisher-initiated cash-out request. Auth by publisher token.
app.post('/v1/publisher/payout-request', async (c) => {
  const auth = c.req.header('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined
  if (!isPublisherToken(token)) {
    return c.json({ error: 'publisher token required (Authorization: Bearer <token>)' }, 401)
  }

  let body: { method?: unknown; destination?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  const method = typeof body.method === 'string' ? body.method.toLowerCase() : ''
  if (!PAYOUT_METHODS.has(method)) {
    return c.json({ error: `method must be one of: ${[...PAYOUT_METHODS].join(', ')}` }, 400)
  }
  const destination = typeof body.destination === 'string' ? sanitizeLine(body.destination, 200) : ''
  if (!destination) {
    return c.json({ error: 'destination is required' }, 400)
  }

  if (!allow(`payreq:${token}`, PAYOUT_REQUEST_LIMIT)) {
    return c.json({ error: 'rate limited' }, 429)
  }

  try {
    const [ledger, payouts, existing] = await Promise.all([
      getLedger(token), getPayouts(token), getPayoutRequests(token),
    ])
    const paid = payouts.reduce((sum, p) => sum + p.amount, 0)
    const unpaid = Math.max(0, (ledger?.total_credits ?? 0) - paid)

    if (unpaid < PAYOUT_MIN) {
      return c.json({ error: `unpaid balance ${unpaid.toFixed(4)} is below the $${PAYOUT_MIN} minimum` }, 400)
    }
    if (existing.some(r => r.status === 'pending')) {
      return c.json({ error: 'a payout request is already pending' }, 409)
    }

    const request: PayoutRequest = {
      publisher_token: token,
      amount: unpaid,
      method,
      destination,
      status: 'pending',
      requested_at: new Date().toISOString(),
    }
    await createPayoutRequest(request)
    return c.json({ request })
  } catch (err) {
    log.error('payout_request.create_failed', err)
    return c.json({ error: 'failed to create payout request' }, 500)
  }
})

// Admin: list publishers with unpaid balance ≥ PAYOUT_MIN (with email so you can pay them)
app.get('/v1/admin/payouts/due', async (c) => {
  if (!isAdmin(c)) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  try {
    const [ledgers, publishers] = await Promise.all([listLedgers(), listPublishers()])
    const emailByToken = new Map(publishers.map(p => [p.token, p.email]))

    const due = await Promise.all(
      ledgers.map(async (l) => {
        const payouts = await getPayouts(l.publisher_token)
        const paid = payouts.reduce((sum, p) => sum + p.amount, 0)
        const unpaid = l.total_credits - paid
        return {
          publisher_token: l.publisher_token,
          email: emailByToken.get(l.publisher_token) ?? null,
          total_credits: l.total_credits,
          paid_credits: paid,
          unpaid_credits: unpaid,
          payable: unpaid >= PAYOUT_MIN,
        }
      })
    )

    return c.json({
      payout_minimum: PAYOUT_MIN,
      payable: due.filter(d => d.payable),
      all: due.sort((a, b) => b.unpaid_credits - a.unpaid_credits),
    })
  } catch (err) {
    log.error('admin.payouts_due_failed', err)
    return c.json({ error: 'failed to compute payouts due' }, 500)
  }
})

// Admin: record a payout after paying a publisher externally (Stripe/bank/PayPal/manual)
app.post('/v1/admin/payouts', async (c) => {
  if (!isAdmin(c)) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  let body: { publisher_token?: unknown; amount?: unknown; method?: unknown; reference?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (
    !isPublisherToken(body.publisher_token) ||
    typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0 ||
    typeof body.method !== 'string' || !body.method
  ) {
    return c.json({ error: 'required: publisher_token (uuid), amount (number > 0), method (string); optional: reference' }, 400)
  }

  try {
    const [ledger, payouts] = await Promise.all([getLedger(body.publisher_token), getPayouts(body.publisher_token)])

    // Idempotency: replaying the same external payment reference must not
    // double-record. Callers should pass the Stripe/PayPal/bank reference.
    if (typeof body.reference === 'string' && body.reference) {
      const existing = payouts.find(p => p.reference === body.reference)
      if (existing) {
        return c.json({ payout: existing, idempotent: true })
      }
    }

    // Guard against overpaying: amount must not exceed unpaid balance
    const paid = payouts.reduce((sum, p) => sum + p.amount, 0)
    const unpaid = (ledger?.total_credits ?? 0) - paid
    if (body.amount > unpaid + 1e-9) {
      return c.json({ error: `amount ${body.amount} exceeds unpaid balance ${unpaid.toFixed(4)}` }, 400)
    }

    const payout: Payout = {
      publisher_token: body.publisher_token,
      amount: body.amount,
      method: body.method,
      reference: typeof body.reference === 'string' ? body.reference : '',
      paid_at: new Date().toISOString(),
    }
    await recordPayout(payout)
    return c.json({ payout, remaining_unpaid: unpaid - body.amount })
  } catch (err) {
    log.error('admin.payout_record_failed', err)
    return c.json({ error: 'failed to record payout' }, 500)
  }
})

// Public network stats — 60s cache, no auth required
let publicStatsCache: { data: object; expires: number } | null = null

app.get('/v1/stats', async (c) => {
  const now = Date.now()
  if (publicStatsCache && now < publicStatsCache.expires) {
    return c.json(publicStatsCache.data)
  }
  try {
    const s = await getAdminStats()
    const data = {
      publishers: s.publishers.total,
      activated: s.publishers.activated,
      new_last_7_days: s.publishers.new_last_7_days,
      impressions: s.impressions.total,
      impressions_last_7_days: s.impressions.last_7_days,
      credits_distributed: s.credits.total_earned,
      active_campaigns: s.campaigns.active,
      daily_impressions: s.impressions.daily,
      as_of: s.computed_at,
    }
    publicStatsCache = { data, expires: now + 60_000 }
    return c.json(data)
  } catch (err) {
    log.error('stats.public_failed', err)
    return c.json({ error: 'stats unavailable' }, 500)
  }
})

app.get('/v1/admin/stats', async (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  try {
    return c.json(await getAdminStats())
  } catch (err) {
    log.error('admin.stats_failed', err)
    return c.json({ error: 'failed to compute stats' }, 500)
  }
})

app.get('/stats', (c) => c.html(STATS_HTML))

// Admin: list publisher-initiated payout requests (joined with email + name)
app.get('/v1/admin/payout-requests', async (c) => {
  if (!isAdmin(c)) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  try {
    const [requests, publishers] = await Promise.all([listPayoutRequests(), listPublishers()])
    const byToken = new Map(publishers.map(p => [p.token, p]))
    const enriched = requests.map(r => ({
      ...r,
      email: byToken.get(r.publisher_token)?.email ?? null,
      name: byToken.get(r.publisher_token)?.name ?? null,
    }))
    // Pending first, then newest resolved
    const rank = (s: string) => (s === 'pending' ? 0 : 1)
    enriched.sort((a, b) => rank(a.status) - rank(b.status) || b.requested_at.localeCompare(a.requested_at))
    return c.json({ requests: enriched })
  } catch (err) {
    log.error('admin.payout_requests_list_failed', err)
    return c.json({ error: 'failed to list payout requests' }, 500)
  }
})

// Admin: resolve a payout request — 'paid' records a Payout receipt too, 'rejected' just closes it
app.post('/v1/admin/payout-requests/resolve', async (c) => {
  if (!isAdmin(c)) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  let body: { publisher_token?: unknown; requested_at?: unknown; action?: unknown; reference?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }
  if (
    !isPublisherToken(body.publisher_token) ||
    typeof body.requested_at !== 'string' || !body.requested_at ||
    (body.action !== 'paid' && body.action !== 'rejected')
  ) {
    return c.json({ error: "required: publisher_token (uuid), requested_at (string), action ('paid'|'rejected')" }, 400)
  }
  const token = body.publisher_token
  const requestedAt = body.requested_at

  try {
    const requests = await getPayoutRequests(token)
    const req = requests.find(r => r.requested_at === requestedAt)
    if (!req) {
      return c.json({ error: 'payout request not found' }, 404)
    }
    if (req.status !== 'pending') {
      return c.json({ error: `request already ${req.status}` }, 409)
    }

    if (body.action === 'rejected') {
      const updated = await updatePayoutRequestStatus(token, requestedAt, 'rejected')
      return c.json({ request: updated })
    }

    // action === 'paid': re-validate balance, record the payout, then close the request.
    const [ledger, payouts] = await Promise.all([getLedger(token), getPayouts(token)])
    const paid = payouts.reduce((sum, p) => sum + p.amount, 0)
    const unpaid = (ledger?.total_credits ?? 0) - paid
    if (req.amount > unpaid + 1e-9) {
      return c.json({ error: `request amount ${req.amount} exceeds current unpaid balance ${unpaid.toFixed(4)}` }, 400)
    }
    // Reference ties the receipt to this request for idempotency.
    const reference = typeof body.reference === 'string' && body.reference
      ? body.reference
      : `payout-request:${requestedAt}`
    if (!payouts.some(p => p.reference === reference)) {
      await recordPayout({
        publisher_token: token,
        amount: req.amount,
        method: req.method,
        reference,
        paid_at: new Date().toISOString(),
      })
    }
    const updated = await updatePayoutRequestStatus(token, requestedAt, 'paid', reference)
    return c.json({ request: updated, remaining_unpaid: unpaid - req.amount })
  } catch (err) {
    log.error('admin.payout_request_resolve_failed', err)
    return c.json({ error: 'failed to resolve payout request' }, 500)
  }
})

// Publisher dashboard — static HTML, fetches earnings client-side
app.get('/dashboard', (c) => c.html(DASHBOARD_HTML))

// Admin console — static HTML; every API call it makes is x-admin-token gated
app.get('/admin', (c) => c.html(ADMIN_HTML))

// Advertiser portal — static HTML, token auth client-side against /v1/advertiser/*
app.get('/advertiser', (c) => c.html(ADVERTISER_HTML))

const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>project-ads · earnings</title>
<style>
  :root { color-scheme: dark; }
  * { margin: 0; box-sizing: border-box; }
  body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0d1117; color: #e6edf3; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 48px 16px; }
  h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
  .sub { color: #7d8590; font-size: 13px; margin-bottom: 32px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 24px; width: 100%; max-width: 560px; }
  input, select { width: 100%; padding: 10px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; font: inherit; margin-bottom: 12px; }
  button { width: 100%; padding: 10px; background: #238636; border: none; border-radius: 6px; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  button:hover { background: #2ea043; }
  button:disabled { background: #21262d; color: #7d8590; cursor: default; }
  .stats { display: none; }
  .section-label { font-size: 11px; color: #7d8590; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  .banner { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 12px; font-size: 13px; margin: 4px 0 20px; }
  .banner.pending { border-color: #9e6a03; color: #e3b341; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 11px; }
  .badge.pending { background: #3a2d0a; color: #e3b341; }
  .badge.paid { background: #1a3a24; color: #3fb950; }
  .badge.rejected { background: #3a1a1a; color: #f85149; }
  .row { display: flex; gap: 12px; margin: 24px 0; }
  .stat { flex: 1; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 16px; text-align: center; }
  .stat .num { font-size: 24px; font-weight: 700; color: #3fb950; }
  .stat .label { font-size: 11px; color: #7d8590; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #21262d; }
  th { color: #7d8590; font-weight: 500; }
  td.r, th.r { text-align: right; }
  .err { color: #f85149; font-size: 13px; margin-top: 8px; display: none; }
</style>
</head>
<body>
<h1>📢 project-ads</h1>
<div class="sub" id="sub">publisher earnings</div>
<div class="card">
  <div id="login">
    <input id="token" type="password" placeholder="publisher token (from ~/.project-ads/config.json)">
    <button onclick="load()">View earnings</button>
    <div class="err" id="err"></div>
  </div>
  <div class="stats" id="stats">
    <div class="row">
      <div class="stat"><div class="num" id="credits">–</div><div class="label">earned (usd)</div></div>
      <div class="stat"><div class="num" id="unpaid">–</div><div class="label">unpaid balance</div></div>
      <div class="stat"><div class="num" id="impressions">–</div><div class="label">impressions</div></div>
    </div>
    <div id="payhint" style="font-size:12px;color:#7d8590;margin:-12px 0 20px;text-align:center"></div>

    <div id="cashoutWrap" style="display:none;margin-bottom:24px">
      <div class="section-label">cash out</div>
      <div id="cashoutBanner" class="banner" style="display:none"></div>
      <div id="cashoutForm" style="display:none">
        <select id="co_method">
          <option value="paypal">PayPal</option>
          <option value="bank">Bank transfer</option>
          <option value="wise">Wise</option>
          <option value="other">Other</option>
        </select>
        <input id="co_dest" placeholder="PayPal email / bank details / etc.">
        <button id="co_submit" onclick="requestPayout()">Request payout</button>
        <div class="err" id="co_err"></div>
      </div>
      <button id="cashoutBtn" onclick="showCashout()">Cash out</button>
    </div>

    <table>
      <thead><tr><th>day</th><th class="r">impressions</th><th class="r">credits</th></tr></thead>
      <tbody id="days"></tbody>
    </table>

    <div id="requestsWrap" style="display:none;margin-top:20px">
      <div class="section-label">payout requests</div>
      <table>
        <thead><tr><th>date</th><th>method</th><th class="r">amount</th><th class="r">status</th></tr></thead>
        <tbody id="requests"></tbody>
      </table>
    </div>

    <div id="payoutsWrap" style="display:none;margin-top:20px">
      <div style="font-size:12px;color:#7d8590;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">payouts</div>
      <table>
        <thead><tr><th>date</th><th>method</th><th class="r">amount</th></tr></thead>
        <tbody id="payouts"></tbody>
      </table>
    </div>
    <div style="margin-top:16px;font-size:12px;color:#7d8590;text-align:right">
      <a href="#" onclick="load(localStorage.getItem('pa_token'));return false" style="color:#58a6ff;margin-right:12px">refresh</a>
      <a href="#" onclick="logout();return false" style="color:#7d8590">sign out</a>
    </div>
  </div>
</div>
<script>
const $ = id => document.getElementById(id)
function esc(s) { const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML }
let currentToken = null
let payoutMin = 10

async function load(tokenArg) {
  const token = (tokenArg ?? $('token').value).trim()
  const err = $('err')
  err.style.display = 'none'
  if (!token) return
  try {
    const res = await fetch('/v1/publisher/earnings', { headers: { authorization: 'Bearer ' + token } })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const d = await res.json()
    localStorage.setItem('pa_token', token)
    currentToken = token
    $('sub').textContent = d.name ? 'Hi, ' + d.name + ' — your earnings' : 'publisher earnings'
    $('credits').textContent = '$' + (d.total_credits ?? 0).toFixed(4)
    $('unpaid').textContent = '$' + (d.unpaid_credits ?? 0).toFixed(4)
    $('impressions').textContent = d.total_impressions ?? 0
    const min = d.payout_minimum ?? 10
    payoutMin = min
    const unpaid = d.unpaid_credits ?? 0
    $('payhint').textContent = unpaid >= min
      ? 'payout eligible — request a cash-out below'
      : '$' + (min - unpaid).toFixed(2) + ' more until $' + min + ' payout minimum'

    const requests = d.payout_requests ?? []
    const pending = requests.find(r => r.status === 'pending')
    renderCashout(unpaid, min, pending)
    renderRequests(requests)

    const payouts = d.payouts ?? []
    if (payouts.length) {
      $('payoutsWrap').style.display = 'block'
      $('payouts').innerHTML = payouts.map(p =>
        '<tr><td>' + p.paid_at.slice(0, 10) + '</td><td>' + esc(p.method) + '</td><td class="r">$' + p.amount.toFixed(2) + '</td></tr>'
      ).join('')
    }
    const days = Object.entries(d.daily ?? {}).sort((a, b) => b[0].localeCompare(a[0]))
    $('days').innerHTML = days.map(([day, v]) =>
      '<tr><td>' + day + '</td><td class="r">' + v.impressions + '</td><td class="r">' + v.credits.toFixed(4) + '</td></tr>'
    ).join('') || '<tr><td colspan="3" style="color:#7d8590">no impressions yet</td></tr>'
    $('login').style.display = 'none'
    $('stats').style.display = 'block'
  } catch (e) {
    localStorage.removeItem('pa_token')
    err.textContent = 'failed to load: ' + e.message
    err.style.display = 'block'
  }
}

function renderCashout(unpaid, min, pending) {
  const wrap = $('cashoutWrap'), banner = $('cashoutBanner'), form = $('cashoutForm'), btn = $('cashoutBtn')
  wrap.style.display = 'block'
  form.style.display = 'none'
  banner.style.display = 'none'
  btn.style.display = 'none'
  if (pending) {
    banner.className = 'banner pending'
    banner.style.display = 'block'
    banner.textContent = 'Payout of $' + pending.amount.toFixed(2) + ' requested via ' + pending.method + ' — pending review.'
  } else if (unpaid >= min) {
    btn.style.display = 'block'
  } else {
    wrap.style.display = 'none'
  }
}
function showCashout() {
  $('cashoutBtn').style.display = 'none'
  $('cashoutForm').style.display = 'block'
}
async function requestPayout() {
  const err = $('co_err'); err.style.display = 'none'
  const method = $('co_method').value
  const destination = $('co_dest').value.trim()
  if (!destination) { err.textContent = 'destination is required'; err.style.display = 'block'; return }
  $('co_submit').disabled = true
  try {
    const res = await fetch('/v1/publisher/payout-request', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + currentToken, 'content-type': 'application/json' },
      body: JSON.stringify({ method, destination }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status))
    load(currentToken)
  } catch (e) {
    err.textContent = e.message; err.style.display = 'block'
    $('co_submit').disabled = false
  }
}
function renderRequests(requests) {
  if (!requests.length) { $('requestsWrap').style.display = 'none'; return }
  $('requestsWrap').style.display = 'block'
  $('requests').innerHTML = requests.map(r =>
    '<tr><td>' + r.requested_at.slice(0, 10) + '</td><td>' + esc(r.method) + '</td><td class="r">$' + r.amount.toFixed(2) +
    '</td><td class="r"><span class="badge ' + r.status + '">' + r.status + '</span></td></tr>'
  ).join('')
}

function logout() {
  localStorage.removeItem('pa_token')
  history.replaceState(null, '', '/dashboard')
  document.getElementById('stats').style.display = 'none'
  document.getElementById('login').style.display = 'block'
}
// Try local token server (installed by npx @project-ads/setup, port 41042)
async function tryLocalToken() {
  try {
    const r = await fetch('http://localhost:41042/token', { signal: AbortSignal.timeout(400) })
    if (r.ok) { const d = await r.json(); return d.token || null }
  } catch {}
  return null
}
// Auto-login priority: ?token= URL param → localStorage → local token server
async function autoLogin() {
  const urlToken = new URLSearchParams(location.search).get('token')
  if (urlToken) {
    history.replaceState(null, '', '/dashboard')
    return load(urlToken)
  }
  const stored = localStorage.getItem('pa_token')
  if (stored) return load(stored)
  const local = await tryLocalToken()
  if (local) return load(local)
}
autoLogin()
document.getElementById('token').addEventListener('keydown', e => { if (e.key === 'Enter') load() })
</script>
</body>
</html>`

app.get('/health', (c) => c.json({ ok: true }))

export default app
