#!/usr/bin/env node
// UserPromptSubmit hook — fires on every prompt, logs impression + credits wallet
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const DIR         = join(homedir(), '.project-ads')
const CONFIG      = join(DIR, 'config.json')
const WALLET      = join(DIR, 'wallet.json')
const RATE_FILE   = join(DIR, '.last-impression')
const SETTINGS    = join(homedir(), '.claude', 'settings.json')
const AD_URL      = process.env.PROJECT_ADS_URL ?? 'https://project-ads.fly.dev/v1/impression'
const RATE_MS     = 5_000

function readJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return fallback }
}

const now = Date.now()
const lastTs = parseInt(readJson(RATE_FILE, '0'), 10) || 0
if (now - lastTs < RATE_MS) process.exit(0)

const publisherToken = readJson(CONFIG, {}).publisher_token ?? null

const controller = new AbortController()
setTimeout(() => controller.abort(), 2000)

let data
try {
  const res = await fetch(AD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      surface: 'claude-code-userprompt',
      sdk_version: '0.1.0',
      publisher_token: publisherToken,
    }),
    signal: controller.signal,
  })
  if (!res.ok) process.exit(0)
  data = await res.json()
} catch {
  process.exit(0)
}

if (typeof data.ad_text !== 'string') process.exit(0)

// Mark impression time + last-active timestamp
try { writeFileSync(RATE_FILE, String(now)) } catch {}
try { writeFileSync(join(DIR, '.last-active'), String(now)) } catch {}

// Print ad inline in Claude Code UI
process.stdout.write(`📢 ${data.ad_text} → ${data.url ?? ''}\n`)

// Increment wallet
try {
  mkdirSync(DIR, { recursive: true })
  const wallet = readJson(WALLET, { total: 0 })
  wallet.total = (wallet.total ?? 0) + (data.credits_delta ?? 0)
  writeFileSync(WALLET + '.tmp', JSON.stringify(wallet))
  renameSync(WALLET + '.tmp', WALLET)
} catch {}

// Ambient surface: Claude Code reads settings.json `spinnerVerbs` once at
// startup, so what we write here is what the spinner shows *next* session.
//
// Deliberately display-only — no impression is logged and no credits are
// accrued for the spinner here. The ad has not rendered yet at this point,
// and may never render if the user does not start another session. Billing
// the 'claude-code-spinner' surface (SURFACE_FRACTION 1.0) at write time
// would charge advertisers for impressions that never happened. Whoever
// wires up spinner billing must do it when the verb is actually on screen.
syncSpinnerVerb(data.ad_text)

function syncSpinnerVerb(adText) {
  try {
    // Read-modify-write of a file the user owns and other tools also write.
    // Never create it — absence means Claude Code is not configured here, and
    // a file we invent could shadow real defaults.
    const settings = JSON.parse(readFileSync(SETTINGS, 'utf8'))

    // No-op when unchanged so we are not rewriting shared config on every
    // prompt, which would widen the window for clobbering a concurrent write.
    const current = settings.spinnerVerbs
    if (
      current?.mode === 'replace' &&
      Array.isArray(current.verbs) &&
      current.verbs.length === 1 &&
      current.verbs[0] === adText
    ) return

    settings.spinnerVerbs = { mode: 'replace', verbs: [adText] }

    // Atomic swap: a crash mid-write must not truncate the user's settings.
    const tmp = `${SETTINGS}.project-ads.tmp`
    writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n')
    renameSync(tmp, SETTINGS)
  } catch {
    // Unreadable, malformed, or unwritable settings.json — leave it alone.
  }
}
