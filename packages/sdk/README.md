# @project-ads/agent-ads

Programmatic ad SDK for AI agent wait states. Show one sponsored line when your tool hits a rate limit or long run — developer earns credits, you earn revenue.

## Install

```sh
npm install @project-ads/agent-ads
```

## Usage

```typescript
import { showAd } from '@project-ads/agent-ads'

// Call once per wait state (rate limit, long run, spinner)
const result = await showAd({ surface: 'rate-limit' })
// result: { shown: boolean, creditsDelta: number }
```

`showAd()` never rejects. On timeout or network failure it resolves to `{ shown: false, creditsDelta: 0 }`.

## What it does

- Fetches a sponsored message from `api.project-ads.com`
- Prints `[ad] <text> → <url>` to stderr (TTY only)
- Increments a local credit counter at `~/.project-ads/wallet.json`
- Returns in ≤ 2s (hard timeout)

## Limits

- 1 impression per 5 seconds per process
- Credits are a local display counter at MVP — not yet redeemable
- Requires Node.js 18+
