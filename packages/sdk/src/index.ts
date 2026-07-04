import { increment } from './wallet.js'
import { render } from './display.js'

const AD_SERVER_URL = process.env['PROJECT_ADS_URL'] ?? 'https://project-ads.fly.dev/v1/impression'
const SDK_VERSION = '0.1.0'
const RATE_LIMIT_MS = 5000
const FETCH_TIMEOUT_MS = 2000

let lastShown = 0

export function _resetRateLimiter(): void {
  lastShown = 0
}

interface ShowAdOptions {
  surface: string
}

export interface ShowAdResult {
  shown: boolean
  creditsDelta: number
}

interface ImpressionResponse {
  ad_text: string
  url: string
  credits_delta: number
}

export async function showAd(opts: ShowAdOptions): Promise<ShowAdResult> {
  // Client-side rate limit: 1 impression per 5s per process
  const now = Date.now()
  if (now - lastShown < RATE_LIMIT_MS) {
    return { shown: false, creditsDelta: 0 }
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(AD_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surface: opts.surface, sdk_version: SDK_VERSION }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      return { shown: false, creditsDelta: 0 }
    }

    let data: ImpressionResponse
    try {
      data = (await res.json()) as ImpressionResponse
    } catch {
      return { shown: false, creditsDelta: 0 }
    }

    if (typeof data.ad_text !== 'string' || typeof data.url !== 'string') {
      return { shown: false, creditsDelta: 0 }
    }

    lastShown = now
    render({ adText: data.ad_text, url: data.url })
    increment(data.credits_delta ?? 0)

    return { shown: true, creditsDelta: data.credits_delta ?? 0 }
  } catch {
    // Timeout (AbortError), network error, or any other failure
    return { shown: false, creditsDelta: 0 }
  }
}
