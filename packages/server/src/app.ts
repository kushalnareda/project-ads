import { Hono } from 'hono'
import { config } from './config.js'
import { listCampaigns, logImpression, registerPublisher, upsertCampaign, incrementCampaignSpend, creditLedger, getLedger, type Campaign } from './r2.js'

const app = new Hono()

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

async function selectCampaign(surface: string): Promise<{ campaign: Campaign; credits_delta: number } | null> {
  const now = Date.now()
  if (!campaignCache || now > campaignCache.expires) {
    try {
      const campaigns = await listCampaigns()
      campaignCache = { data: campaigns, expires: now + 60_000 }
    } catch (err) {
      console.error('[campaigns] list failed:', err instanceof Error ? err.message : err)
      if (!campaignCache) {
        // No stale cache — fall through to default ad check below
        campaignCache = { data: [], expires: 0 }
      }
    }
  }

  const nowIso = new Date().toISOString()
  const eligible = campaignCache.data.filter(c =>
    c.active &&
    c.starts_at <= nowIso &&
    c.ends_at >= nowIso &&
    c.spent_cents < c.budget_cents
  )

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
        starts_at: '',
        ends_at: '',
        created_at: '',
      },
      credits_delta,
    }
  }

  // Highest CPM wins — simple priority auction
  const campaign = eligible.sort((a, b) => b.cpm_cents - a.cpm_cents)[0]
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

  // Fire-and-forget: log impression + update spend + credit ledger concurrently, don't block response
  void Promise.all([
    logImpression(impression),
    incrementCampaignSpend(campaign.id, costCents),
    impression.publisher_token
      ? creditLedger(impression.publisher_token, credits_delta, impression.timestamp)
      : Promise.resolve(),
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

// Publisher earnings — authenticated by publisher_token (bearer or query)
app.get('/v1/publisher/earnings', async (c) => {
  const auth = c.req.header('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : c.req.query('token')

  if (!token) {
    return c.json({ error: 'publisher token required (Authorization: Bearer <token>)' }, 401)
  }

  try {
    const ledger = await getLedger(token)
    if (!ledger) {
      // Registered but no impressions yet — return empty ledger rather than 404
      return c.json({
        total_credits: 0,
        total_impressions: 0,
        daily: {},
        updated_at: null,
      })
    }
    return c.json({
      total_credits: ledger.total_credits,
      total_impressions: ledger.total_impressions,
      daily: ledger.daily,
      updated_at: ledger.updated_at,
    })
  } catch (err) {
    console.error('[earnings]', err instanceof Error ? err.message : err)
    return c.json({ error: 'failed to load earnings' }, 500)
  }
})

// Publisher dashboard — static HTML, fetches earnings client-side
app.get('/dashboard', (c) => c.html(DASHBOARD_HTML))

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
  input { width: 100%; padding: 10px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; font: inherit; margin-bottom: 12px; }
  button { width: 100%; padding: 10px; background: #238636; border: none; border-radius: 6px; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  button:hover { background: #2ea043; }
  .stats { display: none; }
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
<div class="sub">publisher earnings</div>
<div class="card">
  <div id="login">
    <input id="token" type="password" placeholder="publisher token (from ~/.project-ads/config.json)">
    <button onclick="load()">View earnings</button>
    <div class="err" id="err"></div>
  </div>
  <div class="stats" id="stats">
    <div class="row">
      <div class="stat"><div class="num" id="credits">–</div><div class="label">credits earned</div></div>
      <div class="stat"><div class="num" id="impressions">–</div><div class="label">impressions</div></div>
    </div>
    <table>
      <thead><tr><th>day</th><th class="r">impressions</th><th class="r">credits</th></tr></thead>
      <tbody id="days"></tbody>
    </table>
    <div style="margin-top:16px;font-size:12px;color:#7d8590;text-align:right">
      <a href="#" onclick="load(localStorage.getItem('pa_token'));return false" style="color:#58a6ff;margin-right:12px">refresh</a>
      <a href="#" onclick="logout();return false" style="color:#7d8590">sign out</a>
    </div>
  </div>
</div>
<script>
async function load(tokenArg) {
  const token = (tokenArg ?? document.getElementById('token').value).trim()
  const err = document.getElementById('err')
  err.style.display = 'none'
  if (!token) return
  try {
    const res = await fetch('/v1/publisher/earnings', { headers: { authorization: 'Bearer ' + token } })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const d = await res.json()
    localStorage.setItem('pa_token', token)
    document.getElementById('credits').textContent = (d.total_credits ?? 0).toFixed(4)
    document.getElementById('impressions').textContent = d.total_impressions ?? 0
    const days = Object.entries(d.daily ?? {}).sort((a, b) => b[0].localeCompare(a[0]))
    document.getElementById('days').innerHTML = days.map(([day, v]) =>
      '<tr><td>' + day + '</td><td class="r">' + v.impressions + '</td><td class="r">' + v.credits.toFixed(4) + '</td></tr>'
    ).join('') || '<tr><td colspan="3" style="color:#7d8590">no impressions yet</td></tr>'
    document.getElementById('login').style.display = 'none'
    document.getElementById('stats').style.display = 'block'
  } catch (e) {
    localStorage.removeItem('pa_token')
    err.textContent = 'failed to load: ' + e.message
    err.style.display = 'block'
  }
}
function logout() {
  localStorage.removeItem('pa_token')
  history.replaceState(null, '', '/dashboard')
  document.getElementById('stats').style.display = 'none'
  document.getElementById('login').style.display = 'block'
}
// Auto-login: ?token= in URL wins, else saved token from a previous visit
const urlToken = new URLSearchParams(location.search).get('token')
if (urlToken) {
  history.replaceState(null, '', '/dashboard') // strip token from address bar
  load(urlToken)
} else if (localStorage.getItem('pa_token')) {
  load(localStorage.getItem('pa_token'))
}
document.getElementById('token').addEventListener('keydown', e => { if (e.key === 'Enter') load() })
</script>
</body>
</html>`

app.get('/health', (c) => c.json({ ok: true }))

export default app
