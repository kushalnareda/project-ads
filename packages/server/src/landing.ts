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
    --secondary: #FFC900;
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
    background: linear-gradient(90deg, var(--secondary) 0%, #ff8c00 100%);
    box-shadow: 0 0 10px rgba(255, 201, 0, 0.4);
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

  /* ── "How ads appear" simulator: one unified app window ── */
  #ad-sim .sim-sub {
    font-size: 14px;
    color: var(--on-surface-secondary);
    line-height: 1.6;
    margin: 2px 0 20px;
    max-width: 640px;
  }
  #ad-sim .sim-sub b { color: var(--on-surface); font-weight: 600; }

  #ad-sim .app-window {
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    font-family: var(--mono);
    background: rgba(10, 10, 12, 0.97);
    box-shadow: 0 20px 60px rgba(0,0,0,0.55);
    max-width: 720px;
    width: 100%;
    margin: 0 auto;
  }

  #ad-sim .title-bar {
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #ad-sim .title-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  #ad-sim .title-dot.red { background: #ff5f56; }
  #ad-sim .title-dot.yellow { background: #ffbd2e; }
  #ad-sim .title-dot.green { background: #27c93f; }
  #ad-sim .title-label {
    flex: 1;
    text-align: center;
    color: var(--on-surface-muted);
    font-size: 12px;
  }

  #ad-sim .chat-panel {
    transition: opacity 0.45s ease;
    min-height: 132px;
    padding: 20px 22px 4px;
    font-size: 13.5px;
    line-height: 1.55;
    color: var(--on-surface-secondary);
  }

  #ad-sim .input-row {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 12px;
    margin: 0 0 14px;
    color: var(--on-surface);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #ad-sim .prompt { color: var(--accent); }
  #ad-sim .caret {
    display: inline-block;
    width: 7px;
    height: 14px;
    background: var(--on-surface);
    animation: simBlink 1s steps(1) infinite;
    vertical-align: -2px;
  }
  @keyframes simBlink { 50% { opacity: 0; } }

  #ad-sim a.link { color: var(--on-surface); text-decoration: none; }
  #ad-sim a.link:hover { text-decoration: underline; }
  #ad-sim .brandname { color: var(--secondary); font-weight: 700; }
  #ad-sim .star {
    color: var(--secondary);
    display: inline-block;
    animation: simStarPulse 1.6s ease-in-out infinite;
  }
  @keyframes simStarPulse {
    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.85; }
    50%      { transform: scale(1.2) rotate(15deg); opacity: 1; text-shadow: 0 0 8px rgba(255,201,0,0.6); }
  }

  /* transient ad row (surface 1) */
  #ad-sim .ad-row {
    padding: 4px 0;
    margin: 0 0 8px;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.5s ease, transform 0.5s ease;
    border-left: 2px solid var(--secondary);
    padding-left: 12px;
  }
  #ad-sim .ad-row.reveal { animation: simAdIn 0.5s ease forwards; }
  #ad-sim .ad-row.fade { opacity: 0; }
  #ad-sim .ad-row.gone { display: none; }
  @keyframes simAdIn { to { opacity: 1; transform: translateY(0); } }
  #ad-sim .ad-row .tip { color: var(--on-surface-muted); font-size: 12.5px; }

  #ad-sim .surface-tag {
    display: inline-block;
    color: var(--primary);
    background: rgba(240,150,228,0.12);
    border: 1px solid rgba(240,150,228,0.5);
    border-radius: 20px;
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-left: 6px;
    vertical-align: middle;
    animation: simTagPulse 2s ease-in-out infinite;
  }
  @keyframes simTagPulse {
    0%, 100% { box-shadow: 0 0 0 rgba(240,150,228,0); opacity: 0.9; }
    50%      { box-shadow: 0 0 10px rgba(240,150,228,0.45); opacity: 1; }
  }

  /* generating / streaming response */
  #ad-sim .gen-status {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--on-surface-muted);
    font-size: 12.5px;
    opacity: 0;
    height: 0;
    overflow: hidden;
  }
  #ad-sim .gen-status.show { opacity: 1; height: auto; margin-bottom: 6px; }
  #ad-sim .gen-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    display: inline-block;
    animation: simDotPulse 1s ease-in-out infinite;
  }
  @keyframes simDotPulse {
    0%, 100% { opacity: 0.4; transform: scale(0.85); }
    50%      { opacity: 1; transform: scale(1.1); }
  }

  #ad-sim .response-body { display: none; opacity: 0; line-height: 1.4; }
  #ad-sim .response-body.rendering { display: block; opacity: 1; }
  #ad-sim .response-body .r-line { opacity: 0; transform: translateY(4px); display: block; }
  #ad-sim .response-body li.r-line { display: list-item; }
  #ad-sim .response-body .r-line.shown { animation: simLineIn 0.35s ease forwards; }
  @keyframes simLineIn { to { opacity: 1; transform: translateY(0); } }

  #ad-sim ol.steps { margin: 4px 0; padding-left: 20px; }
  #ad-sim ol.steps li { margin-bottom: 2px; }
  #ad-sim ol.steps li b { color: var(--on-surface); font-weight: 600; }
  #ad-sim ol.steps ul { margin: 0; padding-left: 16px; color: var(--on-surface-muted); }
  #ad-sim code.k { color: var(--accent); }

  #ad-sim .chat-panel.clearing { opacity: 0; }

  #ad-sim .followup-row { display: none; opacity: 0; margin: 14px 0 0; }
  #ad-sim .followup-row.show { display: flex; animation: simFadeIn 0.4s ease forwards; }
  @keyframes simFadeIn { to { opacity: 1; } }

  /* persistent status bar (surface 2) — same surface, attached under the chat */
  #ad-sim .status-footer {
    padding: 4px 22px 18px;
    font-size: 13px;
  }
  #ad-sim .status-footer .sl-bar {
    color: var(--secondary);
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 8px;
    padding: 6px 0 6px;
    line-height: 1.6;
    border-bottom: 1.5px solid rgba(255, 201, 0, 0.55);
    cursor: pointer;
    transition: border-color 0.25s ease, opacity 0.25s ease;
  }
  #ad-sim .status-footer .sl-bar:hover {
    border-bottom-color: var(--secondary);
  }
  #ad-sim .brand-logo {
    width: 15px;
    height: 15px;
    border-radius: 4px;
    background: var(--secondary);
    display: inline-block;
    flex-shrink: 0;
  }
  #ad-sim .status-footer a.brandname {
    color: var(--secondary);
    font-weight: 700;
    text-decoration: none;
  }
  @media (max-width: 640px) {
    #ad-sim .chat-panel { padding: 16px 14px 4px; font-size: 12.5px; }
    #ad-sim .status-footer { padding: 4px 14px 16px; font-size: 12px; }
    #ad-sim .surface-tag { font-size: 10px; padding: 2px 8px; }
  }

  #ad-sim .status-footer .sl-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 10px;
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
      <a href="#" class="header-link" aria-label="LinkedIn">
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
    
    <form id="signup-form" onsubmit="submitAdvertiser(event)">
      <div class="input-wrapper">
        <input type="text" id="company" required placeholder="Company Name" class="input">
        <input type="email" id="email" required placeholder="your@company.com" class="input">
        <button class="btn" type="submit" id="submit-btn">Join Advertiser Waitlist</button>
      </div>
    </form>
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

    <!-- "How ads appear" simulator: two surfaces inside one window -->
    <div class="card full-row" id="ad-sim">
      <div class="lbl">How Ads Appear in Claude Code</div>
      <p class="sim-sub">
        Ads appear on <b>two interfaces</b> &mdash; a <b>transient line</b> while Claude thinks,
        and a <b>persistent status bar</b> under your chat. Nothing ever interrupts the answer.
      </p>

      <div class="app-window">

        <div class="title-bar">
          <span class="title-dot red"></span>
          <span class="title-dot yellow"></span>
          <span class="title-dot green"></span>
          <span class="title-label">project-ads</span>
        </div>

        <div class="chat-panel" id="sim-panel">
          <div class="input-row"><span class="prompt">&gt;</span> how to setup payments in my app<span class="caret"></span></div>

          <!-- Surface 1: transient ad, only while thinking -->
          <div class="ad-row" id="sim-ad">
            <div>
              <span class="star">&#9733;</span>
              <span class="brandname">Stripe</span> &middot; powering payments for great products
              <span class="surface-tag">Thinking &middot; transient</span>
            </div>
            <div class="tip">&#9492; tip: secure, reliable payments with Stripe or Razorpay</div>
          </div>

          <div class="gen-status" id="sim-gen">
            <span class="gen-dot"></span> Generating response&hellip;
          </div>

          <div class="response-body" id="sim-response">Here&rsquo;s a quick way to set up payments in your app:
            <ol class="steps">
              <li class="r-line"><b>Choose a payment provider</b><ul><li><a class="link" href="#">Stripe</a> or <a class="link" href="#">Razorpay</a> are great options.</li></ul></li>
              <li class="r-line"><b>Sign up &amp; get API keys</b><ul><li>Create an account and grab your <code class="k">publishable</code> and <code class="k">secret</code> keys.</li></ul></li>
              <li class="r-line"><b>Integrate the SDK</b><ul><li>Use the official SDK for your platform (web, iOS, Android).</li></ul></li>
              <li class="r-line"><b>Build the payment flow</b><ul><li>Collect payment details securely through their UI.</li></ul></li>
              <li class="r-line"><b>Handle webhooks</b><ul><li>Set up endpoints to listen for payment events.</li></ul></li>
            </ol>
            <span class="r-line">Need code examples for <a class="link" href="#">Stripe</a> or <a class="link" href="#">Razorpay</a>?</span>
          </div>

          <div class="input-row followup-row" id="sim-followup"><span class="prompt">&gt;</span> <span id="sim-typed"></span><span class="caret"></span></div>
        </div>

        <!-- Surface 2: persistent status bar, never goes away -->
        <div class="status-footer">
          <div class="sl-row">
            <div class="sl-bar" title="cmd + click to open">
              <span class="brand-logo"></span>
              <a class="link brandname" href="https://stripe.com" target="_blank" rel="noopener">Stripe</a>
              <span>&middot; powering payments for great products</span>
            </div>
            <span class="surface-tag">Status bar &middot; persistent</span>
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
    <a href="mailto:kushalsinghnareda@gmail.com" class="btn btn-outline" style="border-radius: 12px; font-size: 14px; padding: 12px 28px;">Contact Advertisers Team</a>
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
// ── "How ads appear" simulator: transient ad + persistent status bar ──
(function() {
  var ad = document.getElementById('sim-ad');
  var gen = document.getElementById('sim-gen');
  var body = document.getElementById('sim-response');
  var followup = document.getElementById('sim-followup');
  var typed = document.getElementById('sim-typed');
  var panel = document.getElementById('sim-panel');
  if (!ad || !gen || !body || !followup || !typed || !panel) return;

  var lines = body.querySelectorAll('.r-line');
  var FOLLOWUP = 'I want to go ahead with Stripe';

  function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  function reset() {
    ad.classList.remove('reveal', 'fade', 'gone');
    gen.classList.remove('show');
    body.classList.remove('rendering');
    followup.classList.remove('show');
    typed.textContent = '';
    for (var i = 0; i < lines.length; i++) lines[i].classList.remove('shown');
  }

  async function typeText(text, speed) {
    for (var i = 0; i < text.length; i++) {
      typed.textContent = text.slice(0, i + 1);
      await sleep(speed);
    }
  }

  async function runLoop() {
    reset();
    while (true) {
      panel.classList.remove('clearing');
      await sleep(700);

      // surface 1: ad appears while Claude is thinking
      ad.classList.add('reveal');
      await sleep(600);
      gen.classList.add('show');
      await sleep(1400);

      // answer streams in — the transient ad steps aside
      body.classList.add('rendering');
      ad.classList.remove('reveal');   // drop the forwards-filled reveal so the fade can win
      ad.classList.add('fade');
      for (var i = 0; i < lines.length; i++) {
        lines[i].classList.add('shown');
        await sleep(260);
      }
      gen.classList.remove('show');
      ad.classList.add('gone');   // transient line is done: reclaim its space
      await sleep(500);

      // user replies — status bar ad has been there the whole time
      followup.classList.add('show');
      await sleep(300);
      await typeText(FOLLOWUP, 45);
      await sleep(3400);

      // fade the panel out, wipe state behind the fade, then start over
      panel.classList.add('clearing');
      await sleep(500);
      reset();
      await sleep(120);
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
async function submitAdvertiser(e) {
  e.preventDefault();
  var email = document.getElementById('email').value;
  var company = document.getElementById('company').value;
  var btn = document.getElementById('submit-btn');
  
  btn.disabled = true;
  btn.textContent = 'Joining Waitlist...';
  
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
      btn.disabled = false;
      btn.textContent = 'Join Advertiser Waitlist';
    }
  } catch (err) {
    alert('Network error. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Join Advertiser Waitlist';
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
