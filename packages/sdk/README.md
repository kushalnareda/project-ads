# @muscat/agent-ads

Programmatic ad SDK for AI agent wait states. Show one sponsored line when your tool hits a rate limit or long run — developer earns credits, you earn revenue.

## Install

```sh
npm install @muscat/agent-ads
```

## Usage

```typescript
import { showAd } from '@muscat/agent-ads'

// Call once per wait state (rate limit, long run, spinner)
const result = await showAd({ surface: 'rate-limit' })
// result: { shown: boolean, creditsDelta: number }
```

`showAd()` never rejects. On timeout or network failure it resolves to `{ shown: false, creditsDelta: 0 }`.

## What it does

- Fetches a sponsored message from `api.muscat-ads.com`
- Prints `[ad] <text> → <url>` to stderr (TTY only)
- Increments a local credit counter at `~/.muscat-ads/wallet.json`
- Returns in ≤ 500ms (hard timeout)

## Limits

- 1 impression per 5 seconds per process
- Credits are a local display counter at MVP — not yet redeemable
- Requires Node.js 18+
