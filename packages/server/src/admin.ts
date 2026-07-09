// Admin console — static HTML served at /admin. Every API call carries x-admin-token,
// verified per request. Token lives in sessionStorage only (cleared on tab close).
export const ADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>project-ads · admin</title>
<style>
  :root { color-scheme: dark; }
  * { margin: 0; box-sizing: border-box; }
  body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0d1117; color: #e6edf3; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 40px 16px; gap: 10px; }
  h1 { font-size: 18px; font-weight: 600; margin-bottom: 2px; }
  h2 { font-size: 11px; font-weight: 600; color: #7d8590; text-transform: uppercase; letter-spacing: .5px; margin: 26px 0 10px; }
  .sub { color: #7d8590; font-size: 13px; margin-bottom: 8px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px 22px; width: 100%; max-width: 800px; }
  input, select { width: 100%; padding: 8px 10px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; font: inherit; margin-bottom: 10px; }
  button { padding: 8px 14px; background: #238636; border: none; border-radius: 6px; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  button:hover { background: #2ea043; }
  button.sec { background: #21262d; border: 1px solid #30363d; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 7px 6px; border-bottom: 1px solid #21262d; vertical-align: top; }
  th { color: #7d8590; font-weight: 500; }
  td.r, th.r { text-align: right; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
  .err { color: #f85149; font-size: 13px; margin-top: 8px; white-space: pre-wrap; }
  .ok { color: #3fb950; font-size: 13px; margin-top: 8px; }
  .pill { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 11px; }
  .pill.on { background: #1a3a24; color: #3fb950; }
  .pill.off { background: #3a1a1a; color: #f85149; }
  .muted { color: #7d8590; }
  .green { color: #3fb950; }
  #main { display: none; flex-direction: column; gap: 10px; width: 100%; max-width: 800px; }
  /* stats grid */
  .sg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
  .sc { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 12px 10px; text-align: center; }
  .sn { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
  .sl { font-size: 10px; color: #7d8590; margin-top: 3px; text-transform: uppercase; letter-spacing: .5px; }
  .chart-lbl { font-size: 11px; color: #7d8590; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
  #spark { width: 100%; height: 40px; display: block; overflow: visible; }
</style>
</head>
<body>
<h1>📢 project-ads</h1>
<div class="sub">admin console</div>

<div class="card" id="login">
  <input id="tok" type="password" placeholder="admin token">
  <button onclick="unlock()">Unlock</button>
  <div class="err" id="loginErr"></div>
</div>

<div id="main">

  <div class="card">
    <h2 style="margin-top:0">network overview</h2>
    <div class="sg">
      <div class="sc"><div class="sn green" id="s_reg">—</div><div class="sl">publishers</div></div>
      <div class="sc"><div class="sn" id="s_act">—</div><div class="sl">activated</div></div>
      <div class="sc"><div class="sn green" id="s_n7">—</div><div class="sl">new 7d</div></div>
      <div class="sc"><div class="sn" id="s_imp">—</div><div class="sl">impressions</div></div>
      <div class="sc"><div class="sn green" id="s_cred">—</div><div class="sl">earned usd</div></div>
      <div class="sc"><div class="sn" id="s_unpaid">—</div><div class="sl">unpaid</div></div>
    </div>
    <div class="chart-lbl">daily impressions · last 30 days</div>
    <svg id="spark" viewBox="0 0 720 40" preserveAspectRatio="none"></svg>
    <div id="topPubs"></div>
  </div>

  <div class="card">
    <h2 style="margin-top:0">campaigns</h2>
    <table>
      <thead><tr><th>advertiser</th><th>ad</th><th class="r">cpm ¢</th><th class="r">spent / budget ¢</th><th>window</th><th>status</th></tr></thead>
      <tbody id="campaigns"></tbody>
    </table>

    <h2>new / update campaign</h2>
    <div class="grid2">
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
      <a href="/stats" style="color:#58a6ff;margin-right:12px" target="_blank">public stats ↗</a>
      <a href="#" onclick="sessionStorage.removeItem('pa_admin');location.reload();return false" style="color:#7d8590">lock</a>
    </div>
  </div>

</div>

<script>
var $ = function(id) { return document.getElementById(id) }
var token = function() { return sessionStorage.getItem('pa_admin') }

function api(path, opts) {
  opts = opts || {}
  var hdrs = Object.assign({ 'content-type': 'application/json', 'x-admin-token': token() }, opts.headers || {})
  return fetch(path, Object.assign({}, opts, { headers: hdrs })).then(function(res) {
    return res.json().catch(function() { return {} }).then(function(body) {
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status))
      return body
    })
  })
}

function unlock() {
  var t = $('tok').value.trim() || token()
  if (!t) return
  sessionStorage.setItem('pa_admin', t)
  $('loginErr').textContent = ''
  api('/v1/admin/campaigns').then(function() {
    $('login').style.display = 'none'
    $('main').style.display = 'flex'
    refresh()
  }).catch(function(e) {
    sessionStorage.removeItem('pa_admin')
    $('loginErr').textContent = e.message
  })
}

function esc(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML }

function fmt(n) {
  n = n || 0
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return String(n)
}

function drawSpark(daily) {
  var days = []
  for (var i = 29; i >= 0; i--) {
    var d = new Date(Date.now() - i * 86400000)
    var k = d.toISOString().slice(0, 10)
    days.push((daily && daily[k]) || 0)
  }
  var max = Math.max.apply(null, days.concat([1]))
  var W = 720, H = 40, gap = 2, bw = (W - gap * 29) / 30
  var bars = days.map(function(v, i) {
    var bh = Math.max((v / max) * H, v > 0 ? 2 : 0)
    var x = (i * (bw + gap)).toFixed(1)
    var y = (H - bh).toFixed(1)
    return '<rect x="' + x + '" y="' + y + '" width="' + bw.toFixed(1) + '" height="' + Math.max(bh, 0.1).toFixed(1) + '" rx="1" fill="#3fb950" opacity="' + (v > 0 ? '0.75' : '0.1') + '"/>'
  }).join('')
  $('spark').innerHTML = bars
}

var CAMPAIGNS = []
var DUE = []

function refresh() {
  api('/v1/admin/stats').then(function(s) {
    $('s_reg').textContent = fmt(s.publishers.total)
    $('s_act').textContent = fmt(s.publishers.activated)
    $('s_n7').textContent = '+' + (s.publishers.new_last_7_days || 0)
    $('s_imp').textContent = fmt(s.impressions.total)
    $('s_cred').textContent = '$' + (s.credits.total_earned || 0).toFixed(2)
    $('s_unpaid').textContent = '$' + (s.credits.unpaid || 0).toFixed(2)
    drawSpark(s.impressions.daily)
    var tops = s.top_publishers || []
    if (tops.length) {
      var rows = tops.map(function(t) {
        return '<tr><td class="muted">' + esc(t.token_prefix) + '…</td><td class="r">' + (t.impressions || 0).toLocaleString() + '</td><td class="r green">$' + (t.credits || 0).toFixed(4) + '</td></tr>'
      }).join('')
      $('topPubs').innerHTML = '<div style="font-size:11px;color:#7d8590;text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px">top publishers</div><table><thead><tr><th>token</th><th class="r">impressions</th><th class="r">earned</th></tr></thead><tbody>' + rows + '</tbody></table>'
    }
  }).catch(function() {})

  api('/v1/admin/campaigns').then(function(data) {
    CAMPAIGNS = data.campaigns || []
    $('campaigns').innerHTML = CAMPAIGNS.map(function(c, i) {
      return '<tr><td>' + esc(c.advertiser_name) + '</td><td>' + esc(c.ad_text) + '<br><span class="muted">' + esc(c.url) + '</span></td>' +
        '<td class="r">' + c.cpm_cents + '</td><td class="r">' + Math.round(c.spent_cents) + ' / ' + c.budget_cents + '</td>' +
        '<td>' + esc((c.starts_at || '').slice(0, 10)) + ' → ' + esc((c.ends_at || '').slice(0, 10)) + '</td>' +
        '<td><span class="pill ' + (c.active ? 'on' : 'off') + '">' + (c.active ? 'active' : 'off') + '</span> ' +
        '<a href="#" style="color:#58a6ff" onclick="editCampaign(' + i + ');return false">edit</a></td></tr>'
    }).join('') || '<tr><td colspan="6" class="muted">no campaigns</td></tr>'
  }).catch(function(e) { $('campErr').textContent = e.message })

  api('/v1/admin/payouts/due').then(function(data) {
    DUE = data.all || []
    $('due').innerHTML = DUE.map(function(d, i) {
      return '<tr><td>' + esc(d.email || '?') + '</td><td class="muted">' + esc(d.publisher_token.slice(0, 8)) + '…</td>' +
        '<td class="r">$' + d.total_credits.toFixed(4) + '</td><td class="r">$' + d.unpaid_credits.toFixed(4) + '</td>' +
        '<td>' + (d.payable ? '<button class="sec" onclick="payout(' + i + ')">record payout</button>' : '<span class="muted">&lt; $' + data.payout_minimum + '</span>') + '</td></tr>'
    }).join('') || '<tr><td colspan="5" class="muted">no ledgers yet</td></tr>'
  }).catch(function(e) { $('dueErr').textContent = e.message })
}

function editCampaign(i) {
  var c = CAMPAIGNS[i]
  $('c_id').value = c.id
  $('c_advertiser').value = c.advertiser_name
  $('c_text').value = c.ad_text
  $('c_url').value = c.url
  $('c_budget').value = c.budget_cents
  $('c_cpm').value = c.cpm_cents
  $('c_start').value = c.starts_at.slice(0, 16)
  $('c_end').value = c.ends_at.slice(0, 16)
}

function saveCampaign() {
  $('campErr').textContent = ''; $('campOk').textContent = ''
  var body = {
    advertiser_name: $('c_advertiser').value.trim(),
    ad_text: $('c_text').value.trim(),
    url: $('c_url').value.trim(),
    budget_cents: Number($('c_budget').value),
    cpm_cents: Number($('c_cpm').value),
    starts_at: $('c_start').value ? new Date($('c_start').value).toISOString() : '',
    ends_at: $('c_end').value ? new Date($('c_end').value).toISOString() : '',
  }
  if ($('c_id').value.trim()) body.id = $('c_id').value.trim()
  api('/v1/admin/campaign', { method: 'POST', body: JSON.stringify(body) }).then(function() {
    $('campOk').textContent = 'saved'
    refresh()
  }).catch(function(e) { $('campErr').textContent = e.message })
}

function payout(i) {
  var d = DUE[i]
  var amount = Number(prompt('Amount to record (USD):', d.unpaid_credits.toFixed(2)))
  if (!amount) return
  var method = prompt('Method (stripe/paypal/bank/manual):', 'manual')
  if (!method) return
  var reference = prompt('Payment reference:', '') || ''
  api('/v1/admin/payouts', { method: 'POST', body: JSON.stringify({ publisher_token: d.publisher_token, amount: amount, method: method, reference: reference }) })
    .then(function() { refresh() })
    .catch(function(e) { $('dueErr').textContent = e.message })
}

if (token()) unlock()
$('tok').addEventListener('keydown', function(e) { if (e.key === 'Enter') unlock() })
</script>
</body>
</html>`
