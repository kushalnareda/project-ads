import { Hono, type Context } from 'hono'
import { timingSafeEqual } from 'node:crypto'
import { config } from './config.js'
import { listCampaigns, logImpression, registerPublisher, upsertCampaign, incrementCampaignSpend, creditLedger, getLedger, listLedgers, listPublishers, getPayouts, recordPayout, getAdminStats, type Campaign, type Payout } from './r2.js'
import { allow } from './ratelimit.js'
import { isPublisherToken, isUuid, isValidAdUrl, isValidEmail, isIsoDate, sanitizeAdText, AD_TEXT_MAX } from './validate.js'
import { log } from './logger.js'
import { ADMIN_HTML } from './admin.js'
import { STATS_HTML } from './stats.js'

const app = new Hono()

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

async function selectCampaign(surface: string): Promise<{ campaign: Campaign; credits_delta: number } | null> {
  const now = Date.now()
  if (!campaignCache || now > campaignCache.expires) {
    try {
      const campaigns = await listCampaigns()
      campaignCache = { data: campaigns, expires: now + 60_000 }
    } catch (err) {
      log.error('campaigns.list_failed', err)
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

  return c.json({ ad_text: adText, url: campaign.url, credits_delta })
})

app.post('/v1/publisher/register', async (c) => {
  let body: { email?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (!isValidEmail(body.email)) {
    return c.json({ error: 'valid email is required' }, 400)
  }

  if (!allow(`reg:${clientIp(c)}`, REGISTER_LIMIT)) {
    return c.json({ error: 'rate limited' }, 429)
  }

  try {
    const publisher = await registerPublisher(body.email)
    return c.json({ token: publisher.token, registered_at: publisher.registered_at })
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

  const campaign: Campaign = {
    id: body.id ?? crypto.randomUUID(),
    advertiser_name: body.advertiser_name.trim(),
    ad_text: adText,
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
    log.error('admin.campaign_save_failed', err)
    return c.json({ error: 'failed to save campaign' }, 500)
  }
})

// Admin: list all campaigns (for dashboard)
app.get('/v1/admin/campaigns', async (c) => {
  if (!isAdmin(c)) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  try {
    const campaigns = await listCampaigns()
    return c.json({ campaigns })
  } catch (err) {
    log.error('admin.campaigns_list_failed', err)
    return c.json({ error: 'failed to list campaigns' }, 500)
  }
})

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
    const [ledger, payouts] = await Promise.all([getLedger(token), getPayouts(token)])
    const paid = payouts.reduce((sum, p) => sum + p.amount, 0)
    const total = ledger?.total_credits ?? 0
    return c.json({
      total_credits: total,
      total_impressions: ledger?.total_impressions ?? 0,
      paid_credits: paid,
      unpaid_credits: Math.max(0, total - paid),
      payout_minimum: PAYOUT_MIN,
      payouts,
      daily: ledger?.daily ?? {},
      updated_at: ledger?.updated_at ?? null,
    })
  } catch (err) {
    log.error('earnings.load_failed', err)
    return c.json({ error: 'failed to load earnings' }, 500)
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

// Publisher dashboard — static HTML, fetches earnings client-side
app.get('/dashboard', (c) => c.html(DASHBOARD_HTML))

// Admin console — static HTML; every API call it makes is x-admin-token gated
app.get('/admin', (c) => c.html(ADMIN_HTML))

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
      <div class="stat"><div class="num" id="credits">–</div><div class="label">earned (usd)</div></div>
      <div class="stat"><div class="num" id="unpaid">–</div><div class="label">unpaid balance</div></div>
      <div class="stat"><div class="num" id="impressions">–</div><div class="label">impressions</div></div>
    </div>
    <div id="payhint" style="font-size:12px;color:#7d8590;margin:-12px 0 20px;text-align:center"></div>
    <table>
      <thead><tr><th>day</th><th class="r">impressions</th><th class="r">credits</th></tr></thead>
      <tbody id="days"></tbody>
    </table>
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
    document.getElementById('credits').textContent = '$' + (d.total_credits ?? 0).toFixed(4)
    document.getElementById('unpaid').textContent = '$' + (d.unpaid_credits ?? 0).toFixed(4)
    document.getElementById('impressions').textContent = d.total_impressions ?? 0
    const min = d.payout_minimum ?? 10
    const unpaid = d.unpaid_credits ?? 0
    document.getElementById('payhint').textContent = unpaid >= min
      ? 'payout eligible — you will be paid this cycle'
      : '$' + (min - unpaid).toFixed(2) + ' more until $' + min + ' payout minimum'
    const payouts = d.payouts ?? []
    if (payouts.length) {
      document.getElementById('payoutsWrap').style.display = 'block'
      document.getElementById('payouts').innerHTML = payouts.map(p =>
        '<tr><td>' + p.paid_at.slice(0, 10) + '</td><td>' + p.method + '</td><td class="r">$' + p.amount.toFixed(2) + '</td></tr>'
      ).join('')
    }
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
