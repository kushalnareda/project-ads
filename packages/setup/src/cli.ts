import { createInterface } from 'readline'
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SERVER   = process.env.PROJECT_ADS_URL_BASE ?? 'https://project-ads.fly.dev'
const HOME     = homedir()
const ADS_DIR  = join(HOME, '.project-ads')
const CONFIG   = join(ADS_DIR, 'config.json')
const HOOK     = join(ADS_DIR, 'hook.mjs')
const SL_HOOK  = join(HOME, '.claude', 'hooks', 'project-ads-statusline.mjs')
const SETTINGS = join(HOME, '.claude', 'settings.json')

const HOOK_SRC = join(__dirname, '..', 'hooks', 'hook.mjs')
const SL_SRC   = join(__dirname, '..', 'hooks', 'statusline.mjs')

async function main() {
  console.log('project-ads setup\n')

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

  wireSettings()
  console.log(`✓ ${SETTINGS}`)

  console.log('\nAll set. Earn credits on every Claude Code session.')
}

function wireSettings() {
  let settings: Record<string, unknown> = {}
  try {
    settings = JSON.parse(readFileSync(SETTINGS, 'utf8'))
  } catch {}

  if (!settings.hooks) settings.hooks = {}
  const hooks = settings.hooks as Record<string, unknown[]>

  // Remove legacy hook.js entries
  for (const event of Object.keys(hooks)) {
    hooks[event] = (hooks[event] as any[]).filter(
      (g) => !g.hooks?.some((h: any) => h.command?.includes('project-ads-hook.js')),
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
