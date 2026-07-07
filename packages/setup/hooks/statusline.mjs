#!/usr/bin/env node
// StatusLine hook — idle-gated impressions, own cache, reads frame from animator daemon
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const DIR         = join(homedir(), '.adline')
const FRAME       = join(DIR, 'frame.json')
const CACHE       = join(DIR, 'statusline-cache.json')
const LAST_ACTIVE = join(DIR, '.last-active')
const LAST_IMP    = join(DIR, '.last-statusline-impression')
const WALLET      = join(DIR, 'wallet.json')
const CONFIG      = join(DIR, 'config.json')
const AD_URL      = process.env.ADLINE_URL ?? 'https://adline.fly.dev/v1/impression'
const CACHE_TTL   = 30_000
const IDLE_MS     = 5 * 60 * 1000   // 5 min idle before logging impression
const IMP_GATE_MS = 5 * 60 * 1000   // min gap between statusline impressions

function readJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return fallback }
}

function readTs(path) {
  try { return parseInt(readFileSync(path, 'utf8'), 10) || 0 } catch { return 0 }
}

// Always render current animation frame first (fast path)
try {
  const { output } = readJson(FRAME, {})
  if (output) process.stdout.write(output)
  else throw new Error('no frame')
} catch {
  process.stdout.write('📢 Ramp · save time on expenses')
}

// Idle gate: only log impression if idle > 5 min
const now        = Date.now()
const lastActive = readTs(LAST_ACTIVE)
const idleMs     = lastActive ? now - lastActive : Infinity
if (idleMs < IDLE_MS) process.exit(0)

// Impression rate gate: max one statusline impression per 5 min
const lastImp = readTs(LAST_IMP)
if (now - lastImp < IMP_GATE_MS) process.exit(0)

// Check own cache
const cached = readJson(CACHE, null)
const isFresh = cached && (now - (cached.ts ?? 0)) < CACHE_TTL

if (isFresh) {
  // Already have fresh ad — just log impression with cached data
  logImpression(cached.ad_text, cached.url, cached.credits_delta)
} else {
  // Fetch fresh ad + log
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 2000)
  try {
    const publisherToken = readJson(CONFIG, {}).publisher_token ?? null
    const res = await fetch(AD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surface: 'claude-code-statusline',
        sdk_version: '0.1.0',
        publisher_token: publisherToken,
      }),
      signal: controller.signal,
    })
    if (!res.ok) process.exit(0)
    const data = await res.json()
    if (typeof data.ad_text !== 'string') process.exit(0)
    // Save own cache
    try {
      mkdirSync(DIR, { recursive: true })
      writeFileSync(CACHE, JSON.stringify({ ...data, ts: now }))
    } catch {}
    logImpression(data.ad_text, data.url, data.credits_delta)
  } catch {
    process.exit(0)
  }
}

function logImpression(ad_text, url, credits_delta) {
  // Mark impression time
  try { writeFileSync(LAST_IMP, String(now)) } catch {}

  // Increment wallet
  try {
    const wallet = readJson(WALLET, { total: 0 })
    wallet.total = (wallet.total ?? 0) + (credits_delta ?? 0)
    writeFileSync(WALLET + '.tmp', JSON.stringify(wallet))
    renameSync(WALLET + '.tmp', WALLET)
  } catch {}
}
