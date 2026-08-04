// Premium, modern design-revamped landing page template
export const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>project-ads · make money while you code</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --primary: #F096E4;
    --secondary: #F45BB5;
    --accent: #34A8A2;
    --background: #09090b;
    --surface: rgba(22, 22, 26, 0.7);
    --border: rgba(255, 255, 255, 0.08);
    --on-surface: #FFFFFF;
    --on-surface-secondary: #a1a1aa;
    --on-surface-muted: #71717a;
    --input-background: rgba(255, 255, 255, 0.03);
    --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    --transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background-color: var(--background);
    background-image: 
      radial-gradient(circle at 15% 15%, rgba(240, 150, 228, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 85% 85%, rgba(52, 168, 162, 0.06) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(255, 201, 0, 0.04) 0%, transparent 60%);
    background-attachment: fixed;
    color: var(--on-surface);
    font-family: 'Inter', sans-serif;
    padding: 80px 24px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    -webkit-font-smoothing: antialiased;
  }

  .container {
    width: 100%;
    max-width: 900px;
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  /* Header Section - Glassmorphic bar */
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(18, 18, 22, 0.6);
    border: 1px solid var(--border);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 24px;
    padding: 16px 28px;
    width: 100%;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
  }

  .logo-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .clapboard {
    width: 42px;
    height: 42px;
    border: 2px solid var(--on-surface);
    background: #111;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 15px rgba(240, 150, 228, 0.2);
  }

  .clapboard-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 11px;
    background: var(--on-surface);
    background-image: repeating-linear-gradient(
      -45deg,
      #000,
      #000 4px,
      #fff 4px,
      #fff 8px
    );
    border-bottom: 2px solid var(--on-surface);
  }

  .clapboard-term {
    font-family: var(--mono);
    font-size: 13px;
    font-weight: bold;
    color: var(--primary);
    margin-top: 10px;
  }

  .logo-text {
    font-family: 'Outfit', sans-serif;
    font-size: 24px;
    font-weight: 800;
    color: var(--primary);
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, #FFF 30%, var(--primary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .header-link {
    color: var(--on-surface-secondary);
    display: flex;
    align-items: center;
    text-decoration: none;
    transition: var(--transition);
  }

  .header-link:hover {
    color: var(--primary);
    transform: translateY(-1px);
  }

  /* Unboxed Top Hero Block - Premium & Clean */
  .unboxed-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 24px;
    padding: 32px 0 16px 0;
  }

  .headline {
    font-family: 'Outfit', sans-serif;
    font-size: 52px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -1.5px;
    background: linear-gradient(135deg, #FFFFFF 40%, #a1a1aa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .headline span {
    background: linear-gradient(135deg, #F096E4 20%, #e054ce 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
  }

  .desc {
    font-size: 17px;
    color: var(--on-surface-secondary);
    line-height: 1.6;
    max-width: 680px;
  }

  /* Input fields & Buttons */
  .input-wrapper {
    display: flex;
    gap: 12px;
    width: 100%;
    margin-top: 12px;
  }

  @media (max-width: 640px) {
    .input-wrapper {
      flex-direction: column;
    }
  }

  .input {
    flex: 1;
    padding: 16px 20px;
    background: var(--input-background);
    border: 1px solid var(--border);
    border-radius: 16px;
    color: var(--on-surface);
    font-family: inherit;
    font-size: 16px;
    outline: none;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: var(--transition);
  }

  .input:focus {
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 0 20px rgba(240, 150, 228, 0.15);
  }

  .btn {
    padding: 16px 28px;
    background: linear-gradient(135deg, #F096E4 0%, #d869cb 100%);
    color: #000000;
    font-size: 16px;
    font-weight: 700;
    border: none;
    border-radius: 16px;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: 0 4px 20px rgba(240, 150, 228, 0.3);
    transition: var(--transition);
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(240, 150, 228, 0.45);
  }

  .btn:active {
    transform: translateY(0);
  }

  .btn-outline {
    background: rgba(255, 255, 255, 0.03);
    color: var(--on-surface);
    border: 1px solid var(--border);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: none;
  }

  .btn-outline:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .lbl {
    font-size: 12px;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 700;
  }

  /* Grid Layout */
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  @media (max-width: 768px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  /* Premium Card Design with subtle glows */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: 28px;
    padding: 36px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    transition: var(--transition);
  }

  .card:hover {
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  }

  .card.full-row {
    grid-column: span 2;
  }

  @media (max-width: 768px) {
    .card.full-row {
      grid-column: span 1;
    }
  }

  /* Milestone Display */
  .hp-display {
    font-family: var(--mono);
    font-size: 40px;
    font-weight: 800;
    color: var(--secondary);
    letter-spacing: -1.5px;
    margin-top: 8px;
    text-shadow: 0 0 20px rgba(255, 201, 0, 0.15);
  }

  /* Live Launch Progress Card */
  .launch-progress-card {
    text-align: center;
  }

  .launch-stats-row {
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    gap: 0;
    margin: 12px 0 4px;
  }

  .launch-stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
  }

  .launch-num {
    font-family: 'Outfit', sans-serif;
    font-size: 52px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -2px;
  }

  .launch-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--on-surface-secondary);
  }

  .launch-divider {
    width: 1px;
    background: var(--border);
    margin: 4px 0;
    flex-shrink: 0;
  }

  .launch-bar-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--on-surface-muted);
    margin-top: 8px;
    font-family: var(--mono);
  }

  @media (max-width: 540px) {
    .launch-num { font-size: 36px; }
    .launch-divider { display: none; }
    .launch-stats-row { flex-wrap: wrap; gap: 16px; }
  }

  .bar {
    height: 12px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--border);
    border-radius: 99px;
    overflow: hidden;
    margin: 12px 0;
  }

  .fill {
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, var(--secondary) 0%, #ff4fa3 100%);
    box-shadow: 0 0 10px rgba(244, 91, 181, 0.4);
    border-radius: 99px;
    transition: width 1.8s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .progress-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--on-surface-secondary);
    font-family: var(--mono);
  }

  /* CLI code component */
  .code-container {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px 20px;
    font-family: var(--mono);
    color: var(--accent);
    font-size: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    white-space: nowrap;
    box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
  }

  .copy-action {
    color: var(--on-surface-muted);
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    user-select: none;
    transition: var(--transition);
  }

  .copy-action:hover {
    color: var(--on-surface);
  }

  .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 6px 12px;
    cursor: pointer;
    color: var(--on-surface-muted);
    font-size: 12px;
    font-family: inherit;
    font-weight: 600;
    letter-spacing: 0.3px;
    transition: var(--transition);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .copy-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: var(--on-surface);
  }

  .copy-btn.copied {
    background: rgba(52, 168, 162, 0.12);
    border-color: rgba(52, 168, 162, 0.3);
    color: var(--accent);
  }

  /* CLI Card — horizontal split: text left, command right */
  .cli-card-inner {
    display: flex;
    align-items: center;
    gap: 28px;
  }

  .cli-card-info {
    flex: 1;
    min-width: 0;
  }

  .cli-card-cmd {
    flex-shrink: 0;
    width: fit-content;
    min-width: 320px;
  }

  @media (max-width: 640px) {
    .cli-card-inner {
      flex-direction: column;
      align-items: flex-start;
    }
    .cli-card-cmd {
      width: 100%;
    }
  }

  /* Install highlight animation (triggered on scroll) */
  @keyframes installGlow {
    0%   { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); border-color: rgba(255, 255, 255, 0.08); }
    40%  { box-shadow: 0 0 40px rgba(240, 150, 228, 0.35), 0 8px 32px rgba(0, 0, 0, 0.3); border-color: rgba(240, 150, 228, 0.5); }
    100% { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); border-color: rgba(255, 255, 255, 0.08); }
  }

  .install-highlight {
    animation: installGlow 1.4s ease forwards;
  }

  /* Interactive CLI Animation Frame */
  .terminal-surfaces {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: start;
  }

  @media (max-width: 700px) {
    .terminal-surfaces {
      grid-template-columns: 1fr;
    }
  }

  .surface-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--primary);
    margin-bottom: 10px;
    opacity: 0.8;
  }

  .terminal-box {
    background: rgba(10, 10, 12, 0.97);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    overflow: hidden;
    font-family: var(--mono);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  }

  .terminal-header {
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 10px 16px;
    font-size: 12px;
    color: var(--on-surface-muted);
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
  .dot-red { background: #ff5f56; }
  .dot-yellow { background: #ffbd2e; }
  .dot-green { background: #27c93f; }

  .terminal-screen {
    padding: 20px 20px 16px;
    font-size: 13px;
    line-height: 1.7;
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--on-surface-secondary);
  }

  /* ── Surface 1: Spinner ad (shown during thinking, transient) ── */
  .spinner-line {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--on-surface-muted);
    font-size: 13px;
  }

  .c-spinner {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    font-size: 14px;
    font-weight: 900;
    color: var(--primary);
    animation: spin-c 2s steps(4, end) infinite;
    flex-shrink: 0;
  }

  @keyframes spin-c {
    0%   { content: 'C'; opacity: 1; }
    25%  { opacity: 0.4; }
    50%  { opacity: 1; }
    75%  { opacity: 0.4; }
    100% { opacity: 1; }
  }

  .spinner-ad-line {
    display: flex;
    align-items: center;
    gap: 0;
    font-size: 13px;
    color: var(--on-surface-secondary);
    border-left: 2px solid var(--primary);
    padding-left: 14px;
    margin-top: 4px;
    opacity: 0;
    animation: fadeInLine 0.6s ease forwards;
    animation-delay: 1.2s;
  }

  @keyframes fadeInLine {
    to { opacity: 1; }
  }

  /* ── Surface 2: Persistent statusline ad (always visible bottom bar) ── */
  .statusline-box {
    background: #1a1a1f;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    overflow: hidden;
    font-family: var(--mono);
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    position: relative;
  }

  .statusline-chat {
    padding: 16px 20px 10px;
    font-size: 13px;
    color: var(--on-surface-secondary);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .statusline-prompt-arrow {
    color: #888;
    font-size: 16px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .statusline-bar {
    padding: 6px 20px;
    font-size: 12.5px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--secondary);
    background: rgba(0,0,0,0.3);
    border-top: 1px solid rgba(255,255,255,0.04);
    position: relative;
    cursor: pointer;
  }

  .statusline-bar:hover .statusline-tooltip {
    opacity: 1;
    transform: translateY(0);
  }

  .statusline-icon {
    font-size: 10px;
    background: rgba(255, 201, 0, 0.15);
    border: 1px solid rgba(255, 201, 0, 0.2);
    color: var(--secondary);
    border-radius: 3px;
    padding: 1px 4px;
    letter-spacing: 0.5px;
  }

  .statusline-dot {
    color: var(--on-surface-muted);
    margin: 0 2px;
  }

  .statusline-mode {
    color: var(--accent);
    margin-left: auto;
    font-size: 12px;
    opacity: 0.8;
  }

  .statusline-tooltip {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 16px;
    background: #2d5ca0;
    color: #7ab3f5;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12.5px;
    white-space: nowrap;
    opacity: 0;
    transform: translateY(4px);
    transition: all 0.2s ease;
    pointer-events: none;
    border: 1px solid rgba(100, 160, 255, 0.3);
  }

  @keyframes rotate {
    to { transform: rotate(360deg); }
  }

  @keyframes slideUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Dynamic Network Stats Section */
  .stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 24px;
    width: 100%;
  }

  @media (max-width: 600px) {
    .stats-row {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }

  .stat-block {
    text-align: center;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px 16px;
    transition: var(--transition);
  }

  .stat-block:hover {
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.02);
  }

  .stat-val {
    font-family: 'Outfit', sans-serif;
    font-size: 44px;
    font-weight: 800;
    margin-bottom: 6px;
    letter-spacing: -1.5px;
    text-shadow: 0 0 25px rgba(255, 255, 255, 0.05);
  }

  /* Two-step waitlist success UI */
  .success-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
    padding: 20px 0;
  }

  .token-box {
    display: flex;
    align-items: center;
    width: 100%;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px 20px;
    margin-top: 8px;
    box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
  }

  .token-box code {
    flex: 1;
    font-family: var(--mono);
    color: var(--primary);
    font-size: 14px;
    text-align: left;
    word-break: break-all;
  }

  #confetti-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
  }

  /* Bottom Section (Direct Contact - Clean design) */
  .advertiser-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 20px;
    padding: 64px 0 24px 0;
    border-top: 1px solid var(--border);
    width: 100%;
  }

  .advertiser-section h3 {
    font-family: 'Outfit', sans-serif;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  footer {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--on-surface-muted);
    border-top: 1px solid var(--border);
    padding-top: 24px;
    margin-top: 24px;
    width: 100%;
  }

  footer a {
    color: var(--on-surface-muted);
    text-decoration: none;
    margin-left: 16px;
    transition: var(--transition);
  }

  footer a:hover {
    color: var(--on-surface);
  }
</style>
</head>
<body>

<canvas id="confetti-canvas"></canvas>

<div class="container">
  
  <!-- Header Bar -->
  <header>
    <div class="logo-group">
      <div class="clapboard">
        <div class="clapboard-bar"></div>
        <div class="clapboard-term">&gt;_</div>
      </div>
      <div class="logo-text">project-ads</div>
    </div>
    
    <div class="header-actions">
      <a href="#install" onclick="smoothScrollInstall(event)" class="btn btn-outline" style="padding: 10px 20px; font-size: 14px; border-radius: 12px;">Install Extension</a>
      
      <!-- GitHub Link -->
      <a href="https://github.com/kushalnareda/project-ads" class="header-link" target="_blank" aria-label="GitHub">
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
      </a>
      
      <!-- LinkedIn Link -->
      <a href="https://www.linkedin.com/in/kushal-singh-nareda-4a4890213/" class="header-link" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
      </a>
    </div>
  </header>

  <!-- Unboxed Top Hero Block (Advertiser Waitlist) -->
  <div class="unboxed-hero" id="hero-section">
    <div>
      <h2 class="headline">Make money <span>while you code</span>.</h2>
      <p class="desc">
        Get paid to wait for AI responses. We show a single-line sponsored tip in your terminal (Claude Code) status bar during code generation wait-states. <span style="color: var(--secondary); font-weight: 500;">Publishers keep 70% of CPM revenue.</span>
      </p>
    </div>
    
    <div style="margin-top: 12px; width: 100%; display: flex; justify-content: center;">
      <a href="https://docs.google.com/forms/d/18wXj_51yYtJ7Gp-M9TDqR0FC6yMpiGKtySLwT8jIhBI/edit" target="_blank" rel="noopener noreferrer" class="btn" id="submit-btn" style="display: inline-block; width: auto; text-decoration: none; padding: 16px 32px; font-size: 16px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: var(--transition);">Click here if you want to advertise</a>
    </div>
  </div>

  <!-- Grid Structure: Launch Progress (full) → CLI + Ad Sim (2-col) -->
  <div class="grid">

    <!-- Live Launch Progress (full-row) -->
    <div class="card full-row launch-progress-card">
      <div class="lbl" style="text-align:center;">Live Launch Progress</div>

      <div class="launch-stats-row">
        <div class="launch-stat">
          <div class="launch-num" id="launch-publishers" style="color: var(--primary);">—</div>
          <div class="launch-label">Publishers Joined</div>
        </div>
        <div class="launch-divider"></div>
        <div class="launch-stat">
          <div class="launch-num" id="launch-pct" style="color: var(--secondary);">0.0%</div>
          <div class="launch-label">To Launch Goal</div>
        </div>
        <div class="launch-divider"></div>
        <div class="launch-stat">
          <div class="launch-num" id="launch-needed" style="color: #fff;">10,000</div>
          <div class="launch-label">Publishers Needed</div>
        </div>
      </div>

      <div style="margin-top: 8px;">
        <div class="bar">
          <div class="fill" id="pub-fill"></div>
        </div>
        <div class="launch-bar-row">
          <span>Active Node instances serving: <span id="launch-terminals" style="color: var(--accent);">— terminals</span></span>
          <span>Goal: 10,000 publishers</span>
        </div>
      </div>
    </div>

    <!-- Installation Block (Card 2: left info, right command) -->
    <div class="card full-row" id="install">
      <div class="cli-card-inner">
        <div class="cli-card-info">
          <div class="lbl">Setup CLI Integration</div>
          <p class="desc" style="font-size: 14px; color: var(--on-surface-secondary); margin-top: 8px; white-space: nowrap;">Run in your project directory to link hooks automatically.</p>
        </div>
        <div class="cli-card-cmd">
          <div class="code-container">
            <span id="cmd-text">npx @project-ads/setup</span>
            <button class="copy-btn" id="copy-btn" onclick="copySetup()" aria-label="Copy command">
              <svg id="copy-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <!-- clipboard icon (shown by default) -->
                <g id="icon-clipboard">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </g>
                <!-- checkmark icon (hidden by default) -->
                <g id="icon-check" style="display:none">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </g>
              </svg>
              <span id="copy-label">Copy</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Terminal Animation Simulator (full-row, big box) -->
    <div class="card full-row" id="ad-sim">
      <div class="lbl">How Ads Appear in Claude Code</div>
      
      <div class="terminal-surfaces">

        <!-- Surface 1: Spinner (transient, shown during thinking) — animated -->
        <div>
          <div class="surface-label">Surface 1 · Thinking (transient)</div>
          <div class="terminal-box" id="sim-box">
            <div class="terminal-header">
              <div class="dot dot-red"></div>
              <div class="dot dot-yellow"></div>
              <div class="dot dot-green"></div>
              <span style="margin-left: auto; font-size: 11px; opacity: 0.5;">claude-code-spinner</span>
            </div>
            <div class="terminal-screen" id="sim-screen">
              <!-- JS-driven animation renders here -->
            </div>
          </div>
        </div>

        <!-- Surface 2: Statusline (persistent, always below chat) -->
        <div>
          <div class="surface-label">Surface 2 · Persistent status bar</div>
          <div class="statusline-box">
            <div class="statusline-chat">
              <span class="statusline-prompt-arrow">›</span>
              <div>
                <div style="color: var(--on-surface); font-size: 13px;">What's the best way to handle DB migrations?</div>
              </div>
            </div>
            <div class="statusline-bar" title="hover to see URL">
              <div class="statusline-tooltip">https://github.com/kushalnareda/project-ads (cmd + click)</div>
              <span class="statusline-icon">AD</span>
              <span style="color: var(--on-surface-muted);">—·</span>
              <span style="color: var(--secondary); font-weight: 600;">Project Ads</span>
              <span class="statusline-dot">·</span>
              <span style="color: var(--secondary);">reach devs in their terminal</span>
              <span class="statusline-mode">&gt;&gt; auto mode on (shift+tab to cycle) · ← 1 agent</span>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>

  <!-- Reverted Bottom Direct Contact Section -->
  <div class="advertiser-section">
    <h3>Reach 10,000+ AI Developers</h3>
    <p class="desc" style="max-width: 500px; font-size: 15px;">
      Looking to configure direct campaigns or custom terminal integrations? Contact our team.
    </p>
    <a href="mailto:kushalsinghnareda@gmail.com" class="btn btn-outline" style="border-radius: 12px; font-size: 14px; padding: 12px 28px;">Contact Team</a>
  </div>

  <footer>
    <span>© 2026 project-ads. All rights reserved.</span>
    <div>
      <a href="/dashboard">Publisher Dashboard</a>
      <a href="mailto:kushalsinghnareda@gmail.com">Advertiser Portal</a>
    </div>
  </footer>

</div>

<script>
// ── Terminal Simulation: Surface 1 (spinner / transient) ──
(function() {
  var screen = document.getElementById('sim-screen');
  if (!screen) return;

  var C = '#34A8A2';   // accent
  var Y = '#F45BB5';   // secondary / ad color
  var M = '#71717a';   // muted

  function el(tag, html, style) {
    var d = document.createElement(tag);
    if (html) d.innerHTML = html;
    if (style) d.style.cssText = style;
    return d;
  }

  function sleep(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }

  var ads = [
    { brand: 'Project Ads', copy: 'reach devs in their terminal\u2026' },
    { brand: 'Neon DB', copy: 'scale Postgres to zero\u2026' },
    { brand: 'Warp', copy: 'the terminal for the AI age\u2026' },
  ];
  var adIdx = 0;

  async function runLoop() {
    while (true) {
      screen.innerHTML = '';

      // Step 1: prompt line
      var promptLine = el('div',
        '<span style="color:' + C + ';font-size:15px">\u203a</span>&nbsp;<span style="color:#fff">write me a db migration script</span>',
        'display:flex;align-items:center;gap:8px;'
      );
      screen.appendChild(promptLine);
      await sleep(400);

      // Step 2: churning indicator (counts up)
      var churnLine = el('div', '', 'color:' + M + ';');
      screen.appendChild(churnLine);
      for (var i = 1; i <= 6; i++) {
        await sleep(500);
        churnLine.innerHTML = '<span style="color:' + C + '">*</span> Churned for ' + i + 's';
      }

      // Step 3: ad fades in
      var ad = ads[adIdx % ads.length]; adIdx++;
      var adLine = el('div',
        '<span style="color:' + Y + '">\u00b7</span>&nbsp;<span style="color:' + Y + ';font-weight:700">' + ad.brand + '</span>&nbsp;<span style="color:' + M + '">\u00b7</span>&nbsp;<span style="color:' + Y + '">' + ad.copy + '</span>',
        'border-left:2px solid ' + Y + ';padding-left:14px;margin-top:4px;opacity:0;transition:opacity 0.7s ease;'
      );
      screen.appendChild(adLine);
      await sleep(80);
      adLine.style.opacity = '1';
      await sleep(2200);

      // Step 4: response arrives — ad disappears, response shown
      adLine.style.opacity = '0';
      await sleep(600);
      screen.removeChild(adLine);

      var respLine = el('div',
        '<span style="color:' + M + '">\u2514 Here\u2019s your migration script\u2026</span>',
        'padding-left:20px;font-size:12px;opacity:0;transition:opacity 0.5s;'
      );
      screen.appendChild(respLine);
      await sleep(80);
      respLine.style.opacity = '1';
      await sleep(1800);
    }
  }

  runLoop();
})();

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
    
    publishersCount = d.publishers || publishersCount;
    updateProgress(publishersCount);
  } catch (e) {
    updateProgress(publishersCount);
  }
}

function updateProgress(count) {
  var percent = Math.min((count / target) * 100, 100);
  var needed = Math.max(target - count, 0);

  var elPubs = document.getElementById('launch-publishers');
  var elPct = document.getElementById('launch-pct');
  var elNeeded = document.getElementById('launch-needed');
  var elFill = document.getElementById('pub-fill');
  var elTerminals = document.getElementById('launch-terminals');

  if (elPubs) elPubs.textContent = count.toLocaleString();
  if (elPct) elPct.textContent = percent.toFixed(1) + '%';
  if (elNeeded) elNeeded.textContent = needed.toLocaleString();
  if (elFill) elFill.style.width = percent + '%';
  if (elTerminals) elTerminals.textContent = count.toLocaleString() + ' terminals';
}

function smoothScrollInstall(e) {
  e.preventDefault();
  var target = document.getElementById('install');
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(function() {
    target.classList.remove('install-highlight');
    void target.offsetWidth; // force reflow
    target.classList.add('install-highlight');
    target.addEventListener('animationend', function() {
      target.classList.remove('install-highlight');
    }, { once: true });
  }, 600);
}

var _copyTimeout = null;

function showCopyFeedback() {
  var btn = document.getElementById('copy-btn');
  var label = document.getElementById('copy-label');
  var iconClipboard = document.getElementById('icon-clipboard');
  var iconCheck = document.getElementById('icon-check');

  if (!btn || !label || !iconClipboard || !iconCheck) return;
  if (_copyTimeout) clearTimeout(_copyTimeout);

  btn.classList.add('copied');
  iconClipboard.style.display = 'none';
  iconCheck.style.display = 'inline';
  label.textContent = 'Copied!';

  _copyTimeout = setTimeout(function() {
    btn.classList.remove('copied');
    iconClipboard.style.display = 'inline';
    iconCheck.style.display = 'none';
    label.textContent = 'Copy';
    _copyTimeout = null;
  }, 2000);
}

function copySetup() {
  var cmd = document.getElementById('cmd-text').textContent.trim();

  // Try modern clipboard API first (preferred, works reliably)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(cmd).then(function() {
      showCopyFeedback();
    }).catch(function(err) {
      // Fallback to old method if modern API fails
      copyViaExecCommand(cmd);
    });
  } else {
    // Fallback for older browsers
    copyViaExecCommand(cmd);
  }
}

function copyViaExecCommand(cmd) {
  try {
    var ta = document.createElement('textarea');
    ta.value = cmd;
    ta.style.cssText = 'position:fixed;top:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showCopyFeedback();
  } catch(e) {
    console.error('Copy failed:', e);
  }
}



// Submit Advertiser Waitlist Registration (Main form at top)
async function advertisePrompt() {
  var company = prompt("Enter your Company Name:");
  if (company === null) return;
  company = company.trim();
  if (!company) {
    alert("Company Name is required.");
    return;
  }

  var email = prompt("Enter your email address:");
  if (email === null) return;
  email = email.trim();
  if (!email) {
    alert("Email address is required.");
    return;
  }

  var btn = document.getElementById('submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Joining Waitlist...';
  }

  try {
    var res = await fetch('/v1/advertiser/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, company_name: company })
    });
    var data = await res.json();
    if (res.ok) {
      showSuccess(data.token || 'verified', company);
      triggerConfetti();
    } else {
      alert(data.error || 'Failed to join waitlist.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Click here if you want to advertise';
      }
    }
  } catch (err) {
    alert('Network error. Please try again.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Click here if you want to advertise';
    }
  }
}

function showSuccess(token, company) {
  var container = document.getElementById('hero-section');
  container.innerHTML = '<div class="success-container">' +
    '<h3 style="font-size: 24px; color: var(--primary);">Waitlist Joined!</h3>' +
    '<p class="desc" style="font-size: 14px; max-width: 600px; margin-top: 4px;">' +
      'Thank you. We have registered <strong>' + company + '</strong> on the advertiser waitlist. Your access token is ready:' +
    '</p>' +
    '<div class="token-box">' +
      '<code id="token-val">' + token + '</code>' +
      '<span class="copy-action" onclick="copyToken()">[Copy]</span>' +
    '</div>' +
    '<p class="desc" style="font-size: 13px; color: var(--on-surface-muted); margin-top: 8px;">Keep this token safe. You will use it to configure campaign bids on launch.</p>' +
  '</div>';
}

function copyToken() {
  var t = document.getElementById('token-val').textContent;
  navigator.clipboard.writeText(t);
  var btn = document.querySelector('.success-container .copy-action');
  btn.textContent = '[Copied!]';
  setTimeout(function() { btn.textContent = '[Copy]'; }, 2000);
}

// Confetti Particle Animation
var canvas = document.getElementById('confetti-canvas');
var ctx = canvas.getContext('2d');
var particles = [];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
// Make entire command box clickable for copy
document.addEventListener('DOMContentLoaded', function() {
  var codeContainer = document.querySelector('.code-container');
  if (codeContainer) {
    codeContainer.style.cursor = 'pointer';
    codeContainer.addEventListener('click', copySetup);
  }
});

window.addEventListener('resize', resize);
resize();

function triggerConfetti() {
  var colors = ['#F096E4', '#FFC900', '#34A8A2', '#FFFFFF'];
  for (var i = 0; i < 80; i++) {
    particles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 - 100,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * 360,
      speed: Math.random() * 10 + 5,
      decay: 0.98,
      opacity: 1
    });
  }
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.y += p.speed * Math.sin(p.angle * Math.PI / 180);
    p.x += p.speed * Math.cos(p.angle * Math.PI / 180);
    p.speed *= p.decay;
    p.opacity -= 0.012;
    
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.restore();
    
    if (p.opacity <= 0) {
      particles.splice(i, 1);
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

fetchStats();
</script>
</body>
</html>`
