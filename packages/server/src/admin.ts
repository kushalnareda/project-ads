// Admin console — static HTML served at /admin. The page itself is public;
// every API call it makes carries x-admin-token, which the server verifies
// per request. Token lives in sessionStorage only (cleared on tab close).
export const ADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Adline · admin</title>
<style>
  :root { color-scheme: dark; }
  * { margin: 0; box-sizing: border-box; }
  body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0d1117; color: #e6edf3; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 48px 16px; }
  h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
  h2 { font-size: 13px; font-weight: 600; color: #7d8590; text-transform: uppercase; letter-spacing: 0.5px; margin: 32px 0 12px; }
  .sub { color: #7d8590; font-size: 13px; margin-bottom: 32px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 24px; width: 100%; max-width: 760px; }
  input, select { width: 100%; padding: 8px 10px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; font: inherit; margin-bottom: 10px; }
  button { padding: 8px 14px; background: #238636; border: none; border-radius: 6px; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  button:hover { background: #2ea043; }
  button.secondary { background: #21262d; border: 1px solid #30363d; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 7px 6px; border-bottom: 1px solid #21262d; vertical-align: top; }
  th { color: #7d8590; font-weight: 500; }
  td.r, th.r { text-align: right; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
  .err { color: #f85149; font-size: 13px; margin-top: 8px; white-space: pre-wrap; }
  .ok { color: #3fb950; font-size: 13px; margin-top: 8px; }
  .pill { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 11px; }
  .pill.on { background: #1a3a24; color: #3fb950; }
  .pill.off { background: #3a1a1a; color: #f85149; }
  .muted { color: #7d8590; }
  #main { display: none; width: 100%; max-width: 760px; }
</style>
</head>
<body>
<h1>📢 Adline</h1>
<div class="sub">admin console</div>

<div class="card" id="login">
  <input id="tok" type="password" placeholder="admin token">
  <button onclick="unlock()">Unlock</button>
  <div class="err" id="loginErr"></div>
</div>

<div id="main">
  <div class="card">
    <h2 style="margin-top:0">campaigns</h2>
    <table>
      <thead><tr><th>advertiser</th><th>ad</th><th class="r">cpm ¢</th><th class="r">spent / budget ¢</th><th>window</th><th>status</th></tr></thead>
      <tbody id="campaigns"></tbody>
    </table>

    <h2>new / update campaign</h2>
    <div class="grid">
      <input id="c_advertiser" placeholder="advertiser_name">
      <input id="c_id" placeholder="id (blank = new)">
      <input id="c_text" placeholder="ad_text (≤160 chars)" style="grid-column:1/3">
      <input id="c_url" placeholder="https://…" style="grid-column:1/3">
      <input id="c_budget" type="number" placeholder="budget_cents">
      <input id="c_cpm" type="number" placeholder="cpm_cents">
      <input id="c_start" type="datetime-local">
      <input id="c_end" type="datetime-local">
    </div>
    <button onclick="saveCampaign()">Save campaign</button>
    <span class="ok" id="campOk"></span>
    <div class="err" id="campErr"></div>

    <h2>payouts due</h2>
    <table>
      <thead><tr><th>email</th><th>token</th><th class="r">earned</th><th class="r">unpaid</th><th></th></tr></thead>
      <tbody id="due"></tbody>
    </table>
    <div class="err" id="dueErr"></div>
    <div style="margin-top:16px;font-size:12px;text-align:right">
      <a href="#" onclick="refresh();return false" style="color:#58a6ff;margin-right:12px">refresh</a>
      <a href="#" onclick="sessionStorage.removeItem('pa_admin');location.reload();return false" style="color:#7d8590">lock</a>
    </div>
  </div>
</div>

<script>
const $ = id => document.getElementById(id)
const token = () => sessionStorage.getItem('pa_admin')

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { 'content-type': 'application/json', 'x-admin-token': token(), ...(opts.headers || {}) } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status))
  return body
}

async function unlock() {
  const t = $('tok').value.trim() || token()
  if (!t) return
  sessionStorage.setItem('pa_admin', t)
  $('loginErr').textContent = ''
  try {
    await api('/v1/admin/campaigns')
    $('login').style.display = 'none'
    $('main').style.display = 'block'
    refresh()
  } catch (e) {
    sessionStorage.removeItem('pa_admin')
    $('loginErr').textContent = e.message
  }
}

function esc(s) { const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML }

let CAMPAIGNS = []
let DUE = []

async function refresh() {
  try {
    const { campaigns } = await api('/v1/admin/campaigns')
    CAMPAIGNS = campaigns
    $('campaigns').innerHTML = campaigns.map((c, i) =>
      '<tr><td>' + esc(c.advertiser_name) + '</td><td>' + esc(c.ad_text) + '<br><span class="muted">' + esc(c.url) + '</span></td>' +
      '<td class="r">' + c.cpm_cents + '</td><td class="r">' + Math.round(c.spent_cents) + ' / ' + c.budget_cents + '</td>' +
      '<td>' + esc((c.starts_at || '').slice(0, 10)) + ' → ' + esc((c.ends_at || '').slice(0, 10)) + '</td>' +
      '<td><span class="pill ' + (c.active ? 'on' : 'off') + '">' + (c.active ? 'active' : 'off') + '</span> ' +
      '<a href="#" style="color:#58a6ff" onclick="editCampaign(' + i + ');return false">edit</a></td></tr>'
    ).join('') || '<tr><td colspan="6" class="muted">no campaigns</td></tr>'
  } catch (e) { $('campErr').textContent = e.message }

  try {
    const { all, payout_minimum } = await api('/v1/admin/payouts/due')
    DUE = all
    $('due').innerHTML = all.map((d, i) =>
      '<tr><td>' + esc(d.email ?? '?') + '</td><td class="muted">' + esc(d.publisher_token.slice(0, 8)) + '…</td>' +
      '<td class="r">$' + d.total_credits.toFixed(4) + '</td><td class="r">$' + d.unpaid_credits.toFixed(4) + '</td>' +
      '<td>' + (d.payable ? '<button class="secondary" onclick="payout(' + i + ')">record payout</button>' : '<span class="muted">&lt; $' + payout_minimum + '</span>') + '</td></tr>'
    ).join('') || '<tr><td colspan="5" class="muted">no ledgers yet</td></tr>'
  } catch (e) { $('dueErr').textContent = e.message }
}

function editCampaign(i) {
  const c = CAMPAIGNS[i]
  $('c_id').value = c.id
  $('c_advertiser').value = c.advertiser_name
  $('c_text').value = c.ad_text
  $('c_url').value = c.url
  $('c_budget').value = c.budget_cents
  $('c_cpm').value = c.cpm_cents
  $('c_start').value = c.starts_at.slice(0, 16)
  $('c_end').value = c.ends_at.slice(0, 16)
}

async function saveCampaign() {
  $('campErr').textContent = ''; $('campOk').textContent = ''
  const body = {
    advertiser_name: $('c_advertiser').value.trim(),
    ad_text: $('c_text').value.trim(),
    url: $('c_url').value.trim(),
    budget_cents: Number($('c_budget').value),
    cpm_cents: Number($('c_cpm').value),
    starts_at: $('c_start').value ? new Date($('c_start').value).toISOString() : '',
    ends_at: $('c_end').value ? new Date($('c_end').value).toISOString() : '',
  }
  if ($('c_id').value.trim()) body.id = $('c_id').value.trim()
  try {
    await api('/v1/admin/campaign', { method: 'POST', body: JSON.stringify(body) })
    $('campOk').textContent = 'saved'
    refresh()
  } catch (e) { $('campErr').textContent = e.message }
}

async function payout(i) {
  const { publisher_token, unpaid_credits: unpaid } = DUE[i]
  const amount = Number(prompt('Amount to record (USD):', unpaid.toFixed(2)))
  if (!amount) return
  const method = prompt('Method (stripe/paypal/bank/manual):', 'manual')
  if (!method) return
  const reference = prompt('Payment reference (idempotency key):', '') ?? ''
  try {
    await api('/v1/admin/payouts', { method: 'POST', body: JSON.stringify({ publisher_token, amount, method, reference }) })
    refresh()
  } catch (e) { $('dueErr').textContent = e.message }
}

if (token()) unlock()
$('tok').addEventListener('keydown', e => { if (e.key === 'Enter') unlock() })
</script>
</body>
</html>`
