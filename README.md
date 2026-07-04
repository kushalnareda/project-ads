# project-ads

**Open-source ad network for AI coding tools. Developers earn while they wait.**

Ads appear in the Claude Code status line while AI generates output — the highest-attention moment in a developer's day. Publishers earn 70% of ad revenue. Everything runs through official Claude Code hooks, no bundle patching.

---

## How it works

1. Developer installs via `npx @project-ads/setup`
2. Two hooks wire into Claude Code: one on prompt submit, one on the status line
3. Each hook fetches a sponsored message from the ad server and increments a local wallet
4. Earnings accumulate in `~/.project-ads/wallet.json`

**Privacy:** no prompts, completions, or code ever leave your machine. Only the surface name (`claude-code-spinner`, `claude-code-statusline`) is sent to the ad server.

---

## Publisher setup

```bash
npx @project-ads/setup
```

One command. Registers your email, wires hooks into `~/.claude/settings.json`, starts earning on the next Claude Code session.

**Earnings:** 70% of CPM, paid per impression. Statusline impressions earn 5-min idle-gated credits; prompt-submit impressions earn on every qualifying prompt.

---

## SDK (for AI tool builders)

If you're building an AI coding tool and want to show sponsored messages during wait states:

```bash
npm install @project-ads/agent-ads
```

```ts
import { showAd } from '@project-ads/agent-ads'

// Call during AI wait states — never rejects, graceful fallback
await showAd({ surface: 'claude-code-spinner' })
```

The SDK handles rate limiting (5s per process), timeout (2s), and wallet incrementing automatically.

---

## Advertiser

Reach developers at peak attention — the exact second they're waiting for AI output.

- **Format:** single sponsored line, no banners, no popups
- **Pricing:** CPM-based, publisher gets 70%
- **Targeting:** Claude Code, Codex (coming), OpenCode (coming)

To create a campaign: email [kushalsinghnareda@gmail.com](mailto:kushalsinghnareda@gmail.com) or open an issue.

---

## vs kickbacks.ai

| | project-ads | kickbacks.ai |
|---|---|---|
| Integration | Official Claude Code hooks API | Patches Anthropic's VS Code bundle |
| Source | MIT open source | Proprietary (source-available) |
| Publisher share | **70%** | 50% |
| Privacy | Provable in source | Trust-based |
| Supply-chain risk | None | CSP weakened, unsigned auto-updates |

---

## Packages

| Package | Description |
|---|---|
| `@project-ads/agent-ads` | SDK — call `showAd()` from any AI tool |
| `@project-ads/setup` | Publisher onboarding CLI |
| `packages/server` | Ad server (Hono + Cloudflare R2, deployed on Fly.io) |

---

## Self-hosting

The ad server is a standard Hono app. Deploy anywhere Node 20+ runs.

```bash
# Required env vars
ADMIN_TOKEN=your-secret
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=project-ads

# Optional
AD_TEXT="Fallback ad text"   # shown when no R2 campaigns active
AD_URL="https://example.com"
PUBLISHER_SHARE=0.70
PORT=3000
```

---

## License

MIT — see [LICENSE](./LICENSE).
