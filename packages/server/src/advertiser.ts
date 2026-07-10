// Advertiser portal — static HTML served at /advertiser. Token lives in
// localStorage; every API call carries Authorization: Bearer <token>, verified
// server-side with a hard tenancy filter (own campaigns only).
export const ADVERTISER_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>project-ads · advertiser</title>
<style>
  :root { color-scheme: dark; }
  * { margin: 0; box-sizing: border-box; }
  body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0d1117; color: #e6edf3; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 48px 16px; gap: 10px; }
  h1 { font-size: 18px; font-weight: 600; margin-bottom: 2px; }
  h2 { font-size: 11px; font-weight: 600; color: #7d8590; text-transform: uppercase; letter-spacing: .5px; margin: 22px 0 10px; }
  .sub { color: #7d8590; font-size: 13px; margin-bottom: 12px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 22px; width: 100%; max-width: 680px; }
  input { width: 100%; padding: 9px 11px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; font: inherit; margin-bottom: 10px; }
  button { padding: 9px 14px; background: #238636; border: none; border-radius: 6px; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  button:hover { background: #2ea043; }
  button.sec { background: #21262d; border: 1px solid #30363d; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
  .err { color: #f85149; font-size: 13px; margin-top: 8px; white-space: pre-wrap; }
  .ok { color: #3fb950; font-size: 13px; margin-top: 8px; white-space: pre-wrap; }
  .muted { color: #7d8590; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; }
  .badge.active { background: #1a3a24; color: #3fb950; }
  .badge.pending { background: #3a2f1a; color: #d29922; }
  .badge.paused { background: #21262d; color: #7d8590; }
  .badge.rejected { background: #3a1a1a; color: #f85149; }
  .camp { border: 1px solid #21262d; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; }
  .camp .row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .stats { display: flex; gap: 8px; margin-top: 10px; }
  .stat { flex: 1; background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 10px; text-align: center; }
  .sn { font-size: 18px; font-weight: 700; }
  .sn.green { color: #3fb950; }
  .sl { font-size: 10px; color: #7d8590; margin-top: 2px; text-transform: uppercase; letter-spacing: .5px; }
  .banner { background: #3a2f1a; border: 1px solid #d29922; color: #d29922; border-radius: 6px; padding: 8px 12px; font-size: 12px; margin-top: 10px; }
  .reason { background: #3a1a1a; border: 1px solid #f85149; color: #f85149; border-radius: 6px; padding: 8px 12px; font-size: 12px; margin-top: 10px; }
  svg.spark { width: 100%; height: 36px; display: block; margin-top: 10px; }
  #portal { display: none; width: 100%; max-width: 680px; flex-direction: column; gap: 10px; }
</style>
</head>
<body>
<h1>📢 project-ads</h1>
<div class="sub">advertiser portal — reach developers inside Claude Code</div>

<div class="card" id="gate">
  <h2 style="margin-top:0">sign in</h2>
  <input id="tok" type="password" placeholder="advertiser token">
  <button onclick="login()">Open dashboard</button>
  <h2>new advertiser</h2>
  <input id="r_email" type="email" placeholder="work email">
  <input id="r_company" placeholder="company name">
  <button class="sec" onclick="register()">Register</button>
  <div class="err" id="gateErr"></div>
  <div class="ok" id="gateOk"></div>
</div>

<div id="portal">
  <div class="card">
    <div class="row" style="display:flex;justify-content:space-between;align-items:baseline">
      <h2 style="margin:0" id="who">campaigns</h2>
      <span style="font-size:12px"><a href="#" onclick="refresh();return false" style="color:#58a6ff;margin-right:12px">refresh</a><a href="#" onclick="logout();return false" style="color:#7d8590">sign out</a></span>
    </div>
    <div id="camps" style="margin-top:14px"></div>
  </div>

  <div class="card">
    <h2 style="margin-top:0">new campaign</h2>
    <input id="c_text" placeholder="ad_text (≤160 chars, shown in terminals)">
    <input id="c_url" placeholder="https://your-landing-page">
    <div class="grid2">
      <input id="c_cpm" type="number" placeholder="cpm_cents (e.g. 500 = $5 CPM)">
      <input id="c_budget" type="number" placeholder="requested budget (cents)">
      <input id="c_start" type="datetime-local">
      <input id="c_end" type="datetime-local">
    </div>
    <button onclick="createCampaign()">Submit for review</button>
    <div class="muted" style="font-size:12px;margin-top:8px">Campaigns are human-reviewed before serving (usually within 24h). Billing by invoice — we'll reach out.</div>
    <div class="err" id="cErr"></div>
    <div class="ok" id="cOk"></div>
  </div>
</div>

<script>
var $ = function(id) { return document.getElementById(id) }
var token = function() { return localStorage.getItem('pa_adv_token') }

function api(path, opts) {
  opts = opts || {}
  var hdrs = Object.assign({ 'content-type': 'application/json', 'authorization': 'Bearer ' + token() }, opts.headers || {})
  return fetch(path, Object.assign({}, opts, { headers: hdrs })).then(function(res) {
    return res.json().catch(function() { return {} }).then(function(body) {
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status))
      return body
    })
  })
}

function esc(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML }
function usd(cents) { return '$' + (cents / 100).toFixed(2) }

function register() {
  $('gateErr').textContent = ''; $('gateOk').textContent = ''
  fetch('/v1/advertiser/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: $('r_email').value.trim(), company_name: $('r_company').value.trim() }),
  }).then(function(res) { return res.json().then(function(b) { return { ok: res.ok, b: b } }) })
    .then(function(r) {
      if (!r.ok) throw new Error(r.b.error || 'registration failed')
      if (r.b.token) {
        localStorage.setItem('pa_adv_token', r.b.token)
        $('gateOk').textContent = 'Registered. Your token (save it!): ' + r.b.token
        setTimeout(function() { login(r.b.token) }, 1200)
      } else {
        $('gateOk').textContent = 'This email is already registered. We\\'ll re-send your token — contact us if you\\'ve lost it.'
      }
    }).catch(function(e) { $('gateErr').textContent = e.message })
}

function login(t) {
  t = t || $('tok').value.trim() || token()
  if (!t) return
  localStorage.setItem('pa_adv_token', t)
  $('gateErr').textContent = ''
  api('/v1/advertiser/campaigns').then(function(d) {
    $('gate').style.display = 'none'
    $('portal').style.display = 'flex'
    render(d)
  }).catch(function(e) {
    localStorage.removeItem('pa_adv_token')
    $('gateErr').textContent = e.message
  })
}

function logout() {
  localStorage.removeItem('pa_adv_token')
  $('portal').style.display = 'none'
  $('gate').style.display = 'block'
}

function refresh() {
  api('/v1/advertiser/campaigns').then(render).catch(function(e) { $('cErr').textContent = e.message })
}

function spark(daily) {
  var days = [], max = 1
  for (var i = 29; i >= 0; i--) {
    var k = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    var v = (daily && daily[k] && daily[k].impressions) || 0
    days.push(v); if (v > max) max = v
  }
  var W = 620, H = 36, gap = 2, bw = (W - gap * 29) / 30
  return '<svg class="spark" viewBox="0 0 620 36" preserveAspectRatio="none">' + days.map(function(v, i) {
    var bh = Math.max((v / max) * H, v > 0 ? 2 : 0)
    return '<rect x="' + (i * (bw + gap)).toFixed(1) + '" y="' + (H - bh).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(bh, 0.1).toFixed(1) + '" rx="1" fill="#3fb950" opacity="' + (v > 0 ? '0.75' : '0.1') + '"/>'
  }).join('') + '</svg>'
}

function render(d) {
  $('who').textContent = esc(d.company_name || '') + ' · campaigns'
  var camps = d.campaigns || []
  $('camps').innerHTML = camps.map(function(cp) {
    var html = '<div class="camp"><div class="row"><div><strong>' + esc(cp.ad_text) + '</strong><br><span class="muted" style="font-size:12px">' + esc(cp.url) + '</span></div>' +
      '<div><span class="badge ' + esc(cp.status) + '">' + esc(cp.status) + '</span>'
    if (cp.status === 'active') html += ' <button class="sec" style="font-size:11px;padding:3px 8px" onclick="setPaused(\\'' + cp.id + '\\', true)">pause</button>'
    if (cp.status === 'paused') html += ' <button class="sec" style="font-size:11px;padding:3px 8px" onclick="setPaused(\\'' + cp.id + '\\', false)">resume</button>'
    html += '</div></div>'
    html += '<div class="stats">' +
      '<div class="stat"><div class="sn">' + (cp.impressions_delivered || 0).toLocaleString() + '</div><div class="sl">impressions</div></div>' +
      '<div class="stat"><div class="sn green">' + usd(cp.spent_cents || 0) + '</div><div class="sl">spent</div></div>' +
      '<div class="stat"><div class="sn">' + usd(cp.budget_cents || 0) + '</div><div class="sl">budget</div></div>' +
      '<div class="stat"><div class="sn">' + (cp.cpm_cents / 100).toFixed(2) + '</div><div class="sl">cpm usd</div></div></div>'
    if (cp.status === 'pending') html += '<div class="banner">Under review — usually within 24h. Requested budget: ' + usd(cp.requested_budget_cents || 0) + '</div>'
    if (cp.status === 'rejected') html += '<div class="reason">Rejected: ' + esc(cp.rejection_reason || '') + ' — submit a new campaign with changes.</div>'
    html += spark(cp.daily)
    html += '</div>'
    return html
  }).join('') || '<div class="muted">No campaigns yet — create your first below.</div>'
}

function setPaused(id, pause) {
  api('/v1/advertiser/campaign/' + id + '/' + (pause ? 'pause' : 'resume'), { method: 'POST', body: '{}' })
    .then(refresh).catch(function(e) { $('cErr').textContent = e.message })
}

function createCampaign() {
  $('cErr').textContent = ''; $('cOk').textContent = ''
  var body = {
    ad_text: $('c_text').value.trim(),
    url: $('c_url').value.trim(),
    cpm_cents: Number($('c_cpm').value),
    requested_budget_cents: Number($('c_budget').value),
    starts_at: $('c_start').value ? new Date($('c_start').value).toISOString() : '',
    ends_at: $('c_end').value ? new Date($('c_end').value).toISOString() : '',
  }
  api('/v1/advertiser/campaign', { method: 'POST', body: JSON.stringify(body) })
    .then(function() {
      $('cOk').textContent = 'Submitted — pending review.'
      $('c_text').value = ''; $('c_url').value = ''; $('c_cpm').value = ''; $('c_budget').value = ''
      refresh()
    }).catch(function(e) { $('cErr').textContent = e.message })
}

if (token()) login(token())
$('tok').addEventListener('keydown', function(e) { if (e.key === 'Enter') login() })
</script>
</body>
</html>`
