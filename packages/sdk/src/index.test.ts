import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { showAd, _resetRateLimiter } from './index.js'

beforeEach(() => {
  _resetRateLimiter()
  vi.stubGlobal('fetch', undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mockFetch(response: { ok: boolean; json?: () => Promise<unknown> } | 'timeout' | 'network-error') {
  if (response === 'timeout') {
    vi.stubGlobal('fetch', () => new Promise((_, reject) => {
      setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 600)
    }))
    return
  }
  if (response === 'network-error') {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('fetch failed')))
    return
  }
  vi.stubGlobal('fetch', () => Promise.resolve(response))
}

describe('showAd()', () => {
  it('happy path: 200 + valid JSON → shown=true + creditsDelta', async () => {
    mockFetch({
      ok: true,
      json: async () => ({ ad_text: 'Ramp · expenses', url: 'https://ramp.com', credits_delta: 0.001 }),
    })
    const result = await showAd({ surface: 'rate-limit' })
    expect(result.shown).toBe(true)
    expect(result.creditsDelta).toBe(0.001)
  })

  it('non-200 → {shown:false, creditsDelta:0}', async () => {
    mockFetch({ ok: false })
    expect(await showAd({ surface: 'rate-limit' })).toEqual({ shown: false, creditsDelta: 0 })
  })

  it('malformed JSON → {shown:false, creditsDelta:0}', async () => {
    mockFetch({ ok: true, json: async () => { throw new SyntaxError('bad json') } })
    expect(await showAd({ surface: 'rate-limit' })).toEqual({ shown: false, creditsDelta: 0 })
  })

  it('network error → {shown:false, creditsDelta:0}', async () => {
    mockFetch('network-error')
    expect(await showAd({ surface: 'rate-limit' })).toEqual({ shown: false, creditsDelta: 0 })
  })

  it('timeout >500ms → {shown:false, creditsDelta:0}', async () => {
    mockFetch('timeout')
    expect(await showAd({ surface: 'rate-limit' })).toEqual({ shown: false, creditsDelta: 0 })
  }, 2000)

  it('rate limit: second call within 5s → {shown:false, creditsDelta:0}', async () => {
    mockFetch({ ok: true, json: async () => ({ ad_text: 'Ad', url: 'https://example.com', credits_delta: 0.001 }) })
    const first = await showAd({ surface: 'rate-limit' })
    expect(first.shown).toBe(true)
    const second = await showAd({ surface: 'rate-limit' })
    expect(second).toEqual({ shown: false, creditsDelta: 0 })
  })

  it('missing ad_text in response → {shown:false, creditsDelta:0}', async () => {
    mockFetch({ ok: true, json: async () => ({ url: 'https://example.com', credits_delta: 0.001 }) })
    expect(await showAd({ surface: 'rate-limit' })).toEqual({ shown: false, creditsDelta: 0 })
  })
})

describe('non-TTY display', () => {
  it('non-TTY: still returns shown=true + credits (display skipped silently)', async () => {
    const orig = process.stderr.isTTY
    Object.defineProperty(process.stderr, 'isTTY', { value: false, configurable: true })
    mockFetch({ ok: true, json: async () => ({ ad_text: 'Ad', url: 'https://example.com', credits_delta: 0.001 }) })
    const result = await showAd({ surface: 'rate-limit' })
    expect(result.shown).toBe(true)
    expect(result.creditsDelta).toBe(0.001)
    Object.defineProperty(process.stderr, 'isTTY', { value: orig, configurable: true })
  })
})
