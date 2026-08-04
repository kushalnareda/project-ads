import { describe, it, expect, afterEach, vi } from 'vitest'

// config.ts reads process.env once at module load, so each case needs the
// module registry reset before re-importing.
async function loadConfig(env: Record<string, string | undefined>) {
  const saved = { ...process.env }
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  vi.resetModules()
  try {
    return await import('./config.js')
  } finally {
    process.env = saved
  }
}

// Every var config.ts marks required.
const REQUIRED = {
  ADMIN_TOKEN: 'real-admin-token',
  R2_ACCOUNT_ID: 'acct',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET: 'bucket',
}

const NONE = Object.fromEntries(Object.keys(REQUIRED).map(k => [k, undefined]))

afterEach(() => {
  vi.resetModules()
})

describe('config required env vars', () => {
  it('uses real values when present', async () => {
    const { config } = await loadConfig({ ...REQUIRED, NODE_ENV: 'production' })
    expect(config.adminToken).toBe('real-admin-token')
  })

  // The regression this guards: a missing platform variable must never be
  // read as "this is a dev box" and hand out a guessable ADMIN_TOKEN. An
  // unauthenticated caller who guesses it can push arbitrary ad_text and
  // URLs into every publisher's terminal.
  it('throws rather than mocking when a required var is missing outside test', async () => {
    await expect(
      loadConfig({ ...NONE, NODE_ENV: 'production', ALLOW_MOCK_SECRETS: undefined }),
    ).rejects.toThrow(/ADMIN_TOKEN/)
  })

  it('still throws when FLY_APP_NAME is absent (not a dev signal)', async () => {
    await expect(
      loadConfig({
        ...NONE,
        NODE_ENV: 'production',
        FLY_APP_NAME: undefined,
        ALLOW_MOCK_SECRETS: undefined,
      }),
    ).rejects.toThrow(/ADMIN_TOKEN/)
  })

  it('mocks only when explicitly opted in', async () => {
    const { config } = await loadConfig({
      ...NONE,
      NODE_ENV: 'production',
      ALLOW_MOCK_SECRETS: '1',
    })
    expect(config.adminToken).toBe('mock_admin_token')
  })

  it('mocks under NODE_ENV=test so the suite boots without secrets', async () => {
    const { config } = await loadConfig({ ...NONE, NODE_ENV: 'test' })
    expect(config.adminToken).toBe('mock_admin_token')
  })
})
