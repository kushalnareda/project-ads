// Public network stats page — no auth, embeddable, auto-refreshes every 60s
export const STATS_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>project-ads · live stats</title>
<style>
  :root { color-scheme: dark; }
  * { margin: 0; box-sizing: border-box; }
  body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0d1117; color: #e6edf3; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 56px 16px 40px; gap: 10px; }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .brand-name { font-size: 15px; font-weight: 600; letter-spacing: 0.5px; }
  .live { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: #3fb950; border: 1px solid #1a3a24; border-radius: 10px; padding: 2px 9px; }
  .dot { width: 6px; height: 6px; background: #3fb950; border-radius: 50%; flex-shrink: 0; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.3} }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; max-width: 560px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 22px 20px; }
  .card.full { grid-column: span 2; }
  .num { font-size: 38px; font-weight: 700; letter-spacing: -1.5px; line-height: 1; }
  .num.green { color: #3fb950; }
  .lbl { font-size: 11px; color: #7d8590; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .sub { font-size: 12px; color: #3fb950; margin-top: 4px; min-height: 16px; }
  .chart { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 18px 20px 14px; width: 100%; max-width: 560px; }
  .chart-title { font-size: 11px; color: #7d8590; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
  #spark { width: 100%; height: 52px; display: block; overflow: visible; }
  .asof { font-size: 11px; color: #484f58; text-align: center; }
  .loading { opacity: 0.4; }
</style>
</head>
<body>
<div class="brand">
  <span class="brand-name">📢 project-ads</span>
  <span class="live"><span class="dot"></span>live</span>
</div>

<div class="grid" id="grid">
  <div class="card">
    <div class="num green" id="publishers">—</div>
    <div class="lbl">publishers</div>
    <div class="sub" id="publishers_sub"></div>
  </div>
  <div class="card">
    <div class="num" id="campaigns">—</div>
    <div class="lbl">active campaigns</div>
    <div class="sub"></div>
  </div>
  <div class="card full">
    <div class="num" id="impressions">—</div>
    <div class="lbl">impressions served</div>
    <div class="sub" id="impressions_sub"></div>
  </div>
</div>

<div class="chart">
  <div class="chart-title">daily impressions — last 30 days</div>
  <svg id="spark" viewBox="0 0 520 52" preserveAspectRatio="none"></svg>
</div>

<div class="asof" id="asof">loading…</div>

<script>
function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return String(n || 0)
}

function drawSpark(daily) {
  var days = []
  for (var i = 29; i >= 0; i--) {
    var d = new Date(Date.now() - i * 86400000)
    var k = d.toISOString().slice(0, 10)
    days.push((daily && daily[k]) || 0)
  }
  var max = Math.max.apply(null, days.concat([1]))
  var W = 520, H = 52, gap = 2, bw = (W - gap * 29) / 30
  var bars = days.map(function(v, i) {
    var bh = Math.max((v / max) * H, v > 0 ? 2 : 0)
    var x = (i * (bw + gap)).toFixed(1)
    var y = (H - bh).toFixed(1)
    return '<rect x="' + x + '" y="' + y + '" width="' + bw.toFixed(1) + '" height="' + Math.max(bh, 0.1).toFixed(1) + '" rx="1.5" fill="#3fb950" opacity="' + (v > 0 ? '0.8' : '0.1') + '"/>'
  }).join('')
  document.getElementById('spark').innerHTML = bars
}

async function refresh() {
  try {
    var r = await fetch('/v1/stats')
    if (!r.ok) throw new Error('HTTP ' + r.status)
    var d = await r.json()

    document.getElementById('publishers').textContent = fmt(d.publishers)
    document.getElementById('publishers_sub').textContent = (d.activated || 0) + ' activated'

    document.getElementById('impressions').textContent = fmt(d.impressions)
    var w7 = d.impressions_last_7_days || 0
    document.getElementById('impressions_sub').textContent = w7 > 0 ? '+' + fmt(w7) + ' this week' : ''

    document.getElementById('campaigns').textContent = String(d.active_campaigns || 0)

    drawSpark(d.daily_impressions || {})
    document.getElementById('asof').textContent = 'updated ' + new Date(d.as_of).toLocaleTimeString()
  } catch (e) {
    document.getElementById('asof').textContent = 'error: ' + e.message
  }
}

refresh()
setInterval(refresh, 60000)
</script>
</body>
</html>`
