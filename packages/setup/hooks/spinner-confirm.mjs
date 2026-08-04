#!/usr/bin/env node
// SessionStart hook — bills the ambient (spinner) ad, once it is on screen.
//
// The spinner is the one surface that cannot bill when the ad is fetched.
// Claude Code reads `spinnerVerbs` from settings.json a single time, at
// startup, so an ad staged by hook.mjs during session N does not appear until
// session N+1 — and never appears if the user never opens another session.
//
// By the time this hook runs, Claude Code has already loaded settings.json,
// so whatever verb is in that file is what this session will display. That is
// the first moment the impression is real, so that is when we bill it.
import { readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const DIR         = join(homedir(), '.project-ads')
const CONFIG      = join(DIR, 'config.json')
const WALLET      = join(DIR, 'wallet.json')
const PENDING     = join(DIR, 'spinner-pending.json')
const RATE_FILE   = join(DIR, '.last-spinner-confirm')
const SETTINGS    = join(homedir(), '.claude', 'settings.json')
const CONFIRM_URL = process.env.PROJECT_ADS_CONFIRM_URL
  ?? 'https://project-ads.fly.dev/v1/impression/confirm'
// One session start is one display opportunity. The gate only exists to stop
// rapid session churn (crash loops, scripted runs) inflating an advertiser's
// bill; it is not the primary control.
const RATE_MS     = 60_000

function readJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return fallback }
}

const pending = readJson(PENDING, null)
if (!pending?.campaign_id || typeof pending.ad_text !== 'string') process.exit(0)

// What is actually on screen this session? If settings.json no longer holds
// the ad we staged — the user edited it, another tool rewrote it, or a newer
// ad was staged after Claude Code had already read the file — then the
// campaign we recorded is not the one being displayed, and billing it would
// be a false impression.
const settings = readJson(SETTINGS, null)
const verbs = settings?.spinnerVerbs?.verbs
if (!Array.isArray(verbs) || verbs.length !== 1 || verbs[0] !== pending.ad_text) process.exit(0)

const now = Date.now()
const lastTs = parseInt(readJson(RATE_FILE, '0'), 10) || 0
if (now - lastTs < RATE_MS) process.exit(0)

const controller = new AbortController()
setTimeout(() => controller.abort(), 2000)

let data
try {
  const res = await fetch(CONFIRM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaign_id: pending.campaign_id,
      surface: 'claude-code-spinner',
      sdk_version: '0.1.0',
      publisher_token: readJson(CONFIG, {}).publisher_token ?? null,
    }),
    signal: controller.signal,
  })
  // 204 means the server declined to bill — the campaign was paused, went
  // over budget, or ended. It will keep declining for this campaign, so drop
  // the record instead of retrying every session.
  if (res.status === 204) {
    try { unlinkSync(PENDING) } catch {}
    process.exit(0)
  }
  if (!res.ok) process.exit(0)
  data = await res.json()
} catch {
  // Offline or server down. Leave the record in place and try next session.
  process.exit(0)
}

// Only gate after a bill actually landed, so a failed confirm does not burn
// this session's opportunity.
try { writeFileSync(RATE_FILE, String(now)) } catch {}

try {
  mkdirSync(DIR, { recursive: true })
  const wallet = readJson(WALLET, { total: 0 })
  wallet.total = (wallet.total ?? 0) + (data.credits_delta ?? 0)
  writeFileSync(WALLET + '.tmp', JSON.stringify(wallet))
  renameSync(WALLET + '.tmp', WALLET)
} catch {}

// This hook prints nothing: SessionStart output is injected into the model's
// context, and the spinner ad is already visible to the user in the UI.
