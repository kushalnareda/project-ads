import { createInterface } from 'readline'
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir, platform } from 'os'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SERVER   = process.env.ADLINE_URL_BASE ?? 'https://adline.fly.dev'
const HOME     = homedir()
const ADS_DIR  = join(HOME, '.adline')
const CONFIG   = join(ADS_DIR, 'config.json')
const HOOK     = join(ADS_DIR, 'hook.mjs')
const TOKEN_SERVER = join(ADS_DIR, 'token-server.mjs')
const SL_HOOK  = join(HOME, '.claude', 'hooks', 'adline-statusline.mjs')
const SETTINGS = join(HOME, '.claude', 'settings.json')

const HOOK_SRC         = join(__dirname, '..', 'hooks', 'hook.mjs')
const SL_SRC           = join(__dirname, '..', 'hooks', 'statusline.mjs')
const TOKEN_SERVER_SRC = join(__dirname, '..', 'hooks', 'token-server.mjs')

async function main() {
  console.log('Adline setup\n')

  const email = await prompt('Email: ')
  if (!email.includes('@')) {
    console.error('Invalid email.')
    process.exit(1)
  }

  process.stdout.write('Registering... ')
  const res = await fetch(`${SERVER}/v1/publisher/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  if (!res.ok) {
    console.error(`failed (${res.status}: ${await res.text()})`)
    process.exit(1)
  }

  const { token } = (await res.json()) as { token: string }
  console.log('done')

  mkdirSync(ADS_DIR, { recursive: true })
  writeFileSync(CONFIG, JSON.stringify({ publisher_token: token, email }, null, 2) + '\n')
  console.log(`✓ ${CONFIG}`)

  copyFileSync(HOOK_SRC, HOOK)
  console.log(`✓ ${HOOK}`)

  mkdirSync(join(HOME, '.claude', 'hooks'), { recursive: true })
  copyFileSync(SL_SRC, SL_HOOK)
  console.log(`✓ ${SL_HOOK}`)

  copyFileSync(TOKEN_SERVER_SRC, TOKEN_SERVER)
  console.log(`✓ ${TOKEN_SERVER}`)

  wireSettings()
  console.log(`✓ ${SETTINGS}`)

  installTokenServer()

  console.log('\nAll set. Earn credits on every Claude Code session.')
  console.log(`\nYour dashboard: ${SERVER}/dashboard?token=${token}`)
}

function installTokenServer() {
  if (platform() !== 'darwin') {
    // LaunchAgent only on macOS; other platforms need manual startup
    console.log('ℹ  Token server: run `node ~/.adline/token-server.mjs` to enable dashboard auto-login')
    return
  }

  const nodePath = process.execPath
  const launchAgentsDir = join(HOME, 'Library', 'LaunchAgents')
  const plistPath = join(launchAgentsDir, 'com.adline.token-server.plist')

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.adline.token-server</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${TOKEN_SERVER}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardErrorPath</key>
  <string>${ADS_DIR}/token-server.log</string>
  <key>StandardOutPath</key>
  <string>${ADS_DIR}/token-server.log</string>
</dict>
</plist>
`

  mkdirSync(launchAgentsDir, { recursive: true })
  writeFileSync(plistPath, plist)

  try {
    // Unload first in case already running (ignore error if not loaded)
    try { execSync(`launchctl unload "${plistPath}" 2>/dev/null`, { stdio: 'ignore' }) } catch {}
    execSync(`launchctl load "${plistPath}"`)
    console.log('✓ token server started (auto-login enabled for dashboard)')
  } catch (err) {
    console.log(`ℹ  token server plist written but launchctl failed — run manually: node ${TOKEN_SERVER}`)
  }
}

function wireSettings() {
  let settings: Record<string, unknown> = {}
  try {
    settings = JSON.parse(readFileSync(SETTINGS, 'utf8'))
  } catch {}

  if (!settings.hooks) settings.hooks = {}
  const hooks = settings.hooks as Record<string, unknown[]>

  // Remove any legacy pre-rename entries: the original `project-ads-hook.js`,
  // the `~/.project-ads/*` hooks, and the old `project-ads-statusline.mjs`.
  // Matching the old brand string covers all of them so a re-run migrates clean.
  for (const event of Object.keys(hooks)) {
    hooks[event] = (hooks[event] as any[]).filter(
      (g) => !g.hooks?.some((h: any) => h.command?.includes('project-ads')),
    )
  }

  addHookIfMissing(hooks, 'UserPromptSubmit', `node "${HOOK}"`, 5)
  addHookIfMissing(hooks, 'Stop', `node "${SL_HOOK}"`, 5)

  writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n')
}

function addHookIfMissing(
  hooks: Record<string, unknown[]>,
  event: string,
  command: string,
  timeout: number,
) {
  if (!hooks[event]) hooks[event] = []
  const entries = hooks[event] as any[]
  const exists = entries.some((g) => g.hooks?.some((h: any) => h.command === command))
  if (!exists) {
    entries.push({ hooks: [{ type: 'command', command, timeout }] })
  }
}

function prompt(q: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(q, (ans) => {
      rl.close()
      resolve(ans.trim())
    })
  })
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
