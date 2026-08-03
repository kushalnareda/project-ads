# project-ads

**The ad network built for AI coding tools.**

Ads appear in the Claude Code status line while AI generates output — the highest-attention moment in a developer's day. Zero banner blindness. Full attention.

[![publishers](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fproject-ads.fly.dev%2Fv1%2Fstats&query=%24.publishers&label=publishers&color=3fb950)](https://project-ads.fly.dev/stats)
[![impressions served](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fproject-ads.fly.dev%2Fv1%2Fstats&query=%24.impressions&label=impressions%20served&color=3fb950)](https://project-ads.fly.dev/stats)
[![live network stats](https://img.shields.io/badge/live%20network%20stats-project--ads.fly.dev%2Fstats-3fb950)](https://project-ads.fly.dev/stats)

---

## For advertisers

Reach developers at the exact second they're waiting for AI output.

- **Audience:** engineers actively using AI coding tools
- **Format:** single sponsored line — no banners, no popups, no noise
- **Pricing:** CPM-based, 30-day campaigns starting at $200
- **Placement:** Claude Code status line and spinner (Codex + OpenCode coming)

To advertise: email [kushalsinghnareda@gmail.com](mailto:kushalsinghnareda@gmail.com)

---

## For publishers (developers)

Earn credits on every Claude Code session.

```bash
npx @project-ads/setup
```

One command. Registers your account, wires hooks into Claude Code, starts earning immediately.

**Earnings:** 70% of CPM revenue, credited per impression to `~/.project-ads/wallet.json`.

**Privacy:** no prompts, completions, or code ever leave your machine. Only the surface name is sent to log the impression.

---

## SDK (for AI tool builders)

Integrate project-ads into your own AI tool:

```bash
npm install @project-ads/agent-ads
```

```ts
import { showAd } from '@project-ads/agent-ads'

// Call during AI wait states — never rejects, graceful fallback
await showAd({ surface: 'claude-code-spinner' })
```

The SDK handles rate limiting, timeout, and wallet incrementing automatically.

Rate limiting is layered: the SDK enforces a 5-second minimum between ads **per process** (parallel CI agents each get their own window), and the server additionally enforces 60 impressions/minute per publisher token, so a fleet of parallel agents can't over-count impressions.

---

## Packages

| Package | Description |
|---|---|
| `@project-ads/agent-ads` | SDK — call `showAd()` from any AI tool |
| `@project-ads/setup` | Publisher onboarding CLI |
| `packages/server` | Ad server (Hono + Cloudflare R2, Fly.io) |

---

© 2026 project-ads. All rights reserved.
