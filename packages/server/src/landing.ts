// High-fidelity, simplified conversion-focused landing page template
// Strictly follows the Pirate King Design System (design.md)
export const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>project-ads · build the first developer-owned ad network</title>
<meta name="description" content="Get paid to watch an ad while you code. Participate in the first developer-owned terminal advertising network.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --primary: #F096E4;
    --secondary: #FFC900;
    --accent: #34A8A2;
    --background: #000000;
    --surface: #262626;
    --border: #505050;
    --on-surface: #FFFFFF;
    --on-surface-secondary: #C8C8C8;
    --on-surface-muted: #8F8F8F;
    --input-background: #2B2B2B;
    --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background-color: var(--background);
    color: var(--on-surface);
    font-family: 'Inter', sans-serif;
    line-height: 1.5;
    padding: 56px 16px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .container {
    width: 100%;
    max-width: 900px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 0 8px;
  }

  .logo {
    font-size: 24px;
    font-weight: 600;
    color: var(--primary);
    letter-spacing: -1.2px;
  }

  .live-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #3fb950;
    border: 1px solid #1a3a24;
    border-radius: 999px;
    padding: 4px 10px;
    font-family: var(--mono);
    text-transform: uppercase;
  }

  .dot {
    width: 6px;
    height: 6px;
    background: #3fb950;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .3; }
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  @media (max-width: 768px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 20px;
  }

  .card.hero {
    grid-column: span 2;
    background: #111;
    border-color: #333;
  }

  .card.full-row {
    grid-column: span 2;
  }

  @media (max-width: 768px) {
    .card.hero, .card.full-row {
      grid-column: span 1;
    }
  }

  .headline {
    font-size: 38px;
    font-weight: 500;
    line-height: 1.15;
    letter-spacing: -1.2px;
    margin-bottom: 8px;
  }

  .headline span {
    color: var(--primary);
  }

  .desc {
    font-size: 16px;
    color: var(--on-surface-secondary);
    line-height: 1.5;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
  }

  .input-wrapper {
    display: flex;
    gap: 8px;
  }

  @media (max-width: 600px) {
    .input-wrapper {
      flex-direction: column;
    }
  }

  .input {
    flex: 1;
    height: 52px;
    padding: 0 16px;
    background-color: var(--input-background);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--on-surface);
    font-family: inherit;
    font-size: 16px;
    outline: none;
  }

  .input:focus {
    border-color: var(--primary);
  }

  .btn {
    height: 52px;
    padding: 0 24px;
    background-color: var(--primary);
    color: var(--background);
    font-family: inherit;
    font-size: 16px;
    font-weight: 600;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
    transition: transform 100ms ease-out;
  }

  .btn:hover {
    transform: scale(1.02);
  }

  .btn:active {
    transform: scale(0.98);
  }

  .card-title {
    font-size: 11px;
    color: var(--on-surface-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  .target-display {
    font-size: 40px;
    font-weight: bold;
    color: var(--secondary);
    letter-spacing: -1.2px;
  }

  .bar-container {
    margin-top: auto;
  }

  .bar {
    height: 16px;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    margin: 8px 0;
  }

  .fill {
    width: 0%;
    height: 100%;
    background: var(--secondary);
    transition: width 1.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--on-surface-secondary);
  }

  .code-block {
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    font-family: var(--mono);
    color: var(--accent);
    font-size: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .copy-btn {
    color: var(--on-surface-muted);
    cursor: pointer;
    font-size: 12px;
    user-select: none;
  }

  .copy-btn:hover {
    color: var(--on-surface);
  }

  .stats-container {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    flex-wrap: wrap;
  }

  .stat-item {
    flex: 1;
    min-width: 180px;
  }

  .stat-item:not(:first-child) {
    border-left: 1px solid var(--border);
    padding-left: 24px;
  }

  @media (max-width: 600px) {
    .stat-item:not(:first-child) {
      border-left: none;
      padding-left: 0;
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }
  }

  .stat-num {
    font-size: 32px;
    font-weight: bold;
    color: var(--on-surface);
    margin-bottom: 4px;
  }

  /* Success & extra fields */
  .success-card {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 12px 0;
  }

  .token-copy {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px;
    margin-top: 8px;
  }

  .token-copy code {
    flex: 1;
    font-family: var(--mono);
    color: var(--primary);
    font-size: 13px;
    text-align: left;
    word-break: break-all;
  }

  #canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
  }

  .profile-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  footer {
    margin-top: 32px;
    border-top: 1px solid var(--border);
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 13px;
    color: var(--on-surface-muted);
  }

  footer a {
    color: var(--on-surface-muted);
    text-decoration: none;
    margin-left: 16px;
  }

  footer a:hover {
    color: var(--on-surface);
  }
</style>
</head>
<body>

<canvas id="canvas"></canvas>

<div class="container">
  
  <header>
    <div class="logo">📢 project-ads</div>
    <div class="live-badge"><span class="dot"></span>live count</div>
  </header>

  <div class="grid">
    
    <!-- Hero Block -->
    <div class="card hero" id="form-card">
      <div>
        <h1 class="headline">Get paid to watch an ad <span>while you code</span>.</h1>
        <p class="desc">
          We show a non-intrusive sponsored developer tip in your terminal (Claude Code) status bar during code generation wait-states. Publishers receive 70% of CPM payouts directly to their local wallets.
        </p>
      </div>

      <form id="signup-form" onsubmit="handleSignup(event)">
        <!-- Step 1: Capture Email -->
        <div id="step-1" class="form-group">
          <div class="input-wrapper">
            <input type="email" id="email" required placeholder="Enter your developer email" class="input">
            <button type="submit" class="btn">Join Waitlist</button>
          </div>
        </div>

        <!-- Step 2: Publisher Profile Details -->
        <div id="step-2" class="profile-form" style="display: none;">
          <p class="desc" style="font-size: 14px; margin-bottom: 4px; color: var(--primary);">Complete your publisher profile:</p>
          <div class="profile-grid">
            <input type="text" id="profile-name" required placeholder="Name" class="input" style="height: 46px; font-size: 15px;">
            <select id="profile-role" class="input" style="height: 46px; font-size: 15px; padding: 0 12px;">
              <option value="Developer">Developer</option>
              <option value="AI Engineer">AI Engineer</option>
              <option value="Maintainer">Maintainer</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="profile-grid">
            <input type="text" id="profile-country" placeholder="Country" class="input" style="height: 46px; font-size: 15px;">
            <input type="text" id="profile-hear" placeholder="Heard from? (e.g. GitHub)" class="input" style="height: 46px; font-size: 15px;">
          </div>
          <button type="submit" id="submit-btn" class="btn" style="width: 100%;">Join Waitlist Cohort</button>
        </div>
      </form>
    </div>

    <!-- Progress Block -->
    <div class="card">
      <div>
        <div class="card-title">Launch Milestone</div>
        <div class="target-display" id="pub-count">— / 10,000</div>
        <p class="desc" style="font-size: 14px; margin-top: 4px;">Publishers registered</p>
      </div>
      
      <div class="bar-container">
        <div class="bar">
          <div class="fill" id="pub-fill"></div>
        </div>
        <div class="progress-info">
          <span id="pub-percent">0% completed</span>
          <span id="pub-left">— left to launch</span>
        </div>
      </div>
    </div>

    <!-- Installation Block -->
    <div class="card">
      <div>
        <div class="card-title">Setup CLI Integration</div>
        <p class="desc" style="font-size: 14px;">Run this command in your project terminal to register your terminal and wire hooks automatically.</p>
      </div>
      <div class="code-block">
        <span id="cmd-text">npx @project-ads/setup</span>
        <span class="copy-btn" onclick="copyCommand()">[Copy]</span>
      </div>
    </div>

    <!-- Stats Block -->
    <div class="card full-row">
      <div class="card-title" style="margin-bottom: 12px;">Live Network Metrics</div>
      <div class="stats-container">
        <div class="stat-item">
          <div class="stat-num" id="stat-impressions">—</div>
          <div class="card-title">Impressions Served</div>
        </div>
        <div class="stat-item">
          <div class="stat-num" id="stat-campaigns">—</div>
          <div class="card-title">Active Campaigns</div>
        </div>
        <div class="stat-item">
          <div class="stat-num" id="stat-terminals">—</div>
          <div class="card-title">Active Terminals</div>
        </div>
      </div>
    </div>

  </div>

  <footer>
    <span>© 2026 project-ads. Proprietary License.</span>
    <div>
      <a href="/stats">Network Stats</a>
      <a href="/dashboard">Dashboard</a>
      <a href="/advertiser">Advertiser Portal</a>
    </div>
  </footer>

</div>

<script>
var target = 10000;
var publishersCount = 7421;

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n || 0);
}

async function fetchStats() {
  try {
    var r = await fetch('/v1/stats');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var d = await r.json();
    
    publishersCount = d.publishers || 7421;
    updateProgress(publishersCount);
    
    document.getElementById('stat-impressions').textContent = fmt(d.impressions);
    document.getElementById('stat-campaigns').textContent = String(d.active_campaigns || 0);
    document.getElementById('stat-terminals').textContent = fmt(d.activated || 0);
  } catch (e) {
    updateProgress(publishersCount);
  }
}

function updateProgress(count) {
  document.getElementById('pub-count').textContent = count.toLocaleString() + ' / ' + target.toLocaleString();
  var percent = Math.min((count / target) * 100, 100);
  document.getElementById('pub-fill').style.width = percent + '%';
  document.getElementById('pub-percent').textContent = percent.toFixed(1) + '% completed';
  document.getElementById('pub-left').textContent = Math.max(target - count, 0).toLocaleString() + ' left to launch';
}

function copyCommand() {
  var cmd = document.getElementById('cmd-text').textContent;
  navigator.clipboard.writeText(cmd);
  var btn = document.querySelector('.copy-btn');
  btn.textContent = '[Copied!]';
  setTimeout(function() { btn.textContent = '[Copy]'; }, 2000);
}

var step = 1;
async function handleSignup(e) {
  e.preventDefault();
  if (step === 1) {
    document.getElementById('step-1').style.display = 'none';
    document.getElementById('step-2').style.display = 'flex';
    step = 2;
    return;
  }
  
  var email = document.getElementById('email').value;
  var name = document.getElementById('profile-name').value;
  var role = document.getElementById('profile-role').value;
  var country = document.getElementById('profile-country').value;
  var heard = document.getElementById('profile-hear').value;
  
  var btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Joining Waitlist...';
  
  try {
    var res = await fetch('/v1/publisher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, name: name, role: role, country: country, heard_from: heard })
    });
    var data = await res.json();
    if (res.ok) {
      renderSuccess(data.publisher_token);
      publishersCount += 1;
      updateProgress(publishersCount);
      triggerConfetti();
    } else {
      alert(data.error || 'Failed to join waitlist');
      btn.disabled = false;
      btn.textContent = 'Join Waitlist Cohort';
    }
  } catch (err) {
    alert('Network error. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Join Waitlist Cohort';
  }
}

function renderSuccess(token) {
  var wrapper = document.getElementById('form-card');
  wrapper.innerHTML = '<div class="success-card">' +
    '<h3 style="font-size: 24px; color: var(--primary);">Welcome to the Network!</h3>' +
    '<p class="desc" style="font-size: 14px;">You are registered. Your publisher token is ready. Copy it to link your local terminal configuration:</p>' +
    '<div class="token-copy">' +
      '<code id="token-text">' + token + '</code>' +
      '<span class="copy-btn" onclick="copyToken()">[Copy]</span>' +
    '</div>' +
    '<p class="desc" style="font-size: 13px; color: var(--on-surface-muted); margin-top: 8px;">Run npx @project-ads/setup locally to finalize hook settings.</p>' +
  '</div>';
}

function copyToken() {
  var t = document.getElementById('token-text').textContent;
  navigator.clipboard.writeText(t);
  var btn = document.querySelector('.token-copy .copy-btn');
  btn.textContent = '[Copied!]';
  setTimeout(function() { btn.textContent = '[Copy]'; }, 2000);
}

// Confetti canvas animation
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var particles = [];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function triggerConfetti() {
  var colors = ['#F096E4', '#FFC900', '#34A8A2', '#FFFFFF'];
  for (var i = 0; i < 100; i++) {
    particles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 - 100,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * 360,
      speed: Math.random() * 12 + 6,
      decay: 0.98,
      opacity: 1
    });
  }
}

function anim() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.y += p.speed * Math.sin(p.angle * Math.PI / 180);
    p.x += p.speed * Math.cos(p.angle * Math.PI / 180);
    p.speed *= p.decay;
    p.opacity -= 0.01;
    
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.restore();
    
    if (p.opacity <= 0) {
      particles.splice(i, 1);
    }
  }
  requestAnimationFrame(anim);
}
requestAnimationFrame(anim);

fetchStats();
</script>
</body>
</html>`
