import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock S3Client before importing app modules. Command constructors capture
// their input so tests can dispatch on command type + key.
vi.mock('@aws-sdk/client-s3', () => {
  const send = vi.fn()
  const makeCmd = (type: string) =>
    vi.fn(function (this: { __type: string; input: unknown }, input: unknown) {
      this.__type = type
      this.input = input
    })
  return {
    S3Client: vi.fn(() => ({ send })),
    PutObjectCommand: makeCmd('Put'),
    GetObjectCommand: makeCmd('Get'),
    ListObjectsV2Command: makeCmd('List'),
    NoSuchKey: class NoSuchKey extends Error { name = 'NoSuchKey' },
    __send: send,
  }
})

// Required env vars before config loads
vi.stubEnv('ADMIN_TOKEN', 'test-admin-token')
vi.stubEnv('AD_TEXT', 'Ramp · save time on expenses')
vi.stubEnv('AD_URL', 'https://ramp.com')
vi.stubEnv('R2_ACCOUNT_ID', 'test-account')
vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key')
vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret')
vi.stubEnv('R2_BUCKET', 'test-bucket')

const { __send } = await import('@aws-sdk/client-s3') as any

// Import app after mocks
const { default: app } = await import('./app.js')
const { resetRateLimits } = await import('./ratelimit.js')

const TOKEN = '11111111-2222-4333-8444-555555555555'

function req(path: string, body: unknown, headers: Record<string, string> = {}) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const admin = { 'x-admin-token': 'test-admin-token' }

beforeEach(() => {
  vi.clearAllMocks()
  resetRateLimits()
})

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})

describe('POST /v1/impression', () => {
  it('rejects missing surface', async () => {
    const res = await req('/v1/impression', { sdk_version: '0.1.0' })
    expect(res.status).toBe(400)
  })

  it('returns ad for spinner surface with 0.001 credits', async () => {
    __send.mockResolvedValue({})
    const res = await req('/v1/impression', {
      surface: 'claude-code-spinner',
      sdk_version: '0.1.0',
      publisher_token: TOKEN,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ad_text).toBe('Ramp · save time on expenses')
    expect(body.credits_delta).toBe(0.001)
  })

  it('returns 0.0002 credits for statusline surface', async () => {
    __send.mockResolvedValue({})
    const res = await req('/v1/impression', {
      surface: 'claude-code-statusline',
      sdk_version: '0.1.0',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.credits_delta).toBe(0.0002)
  })

  it('r2 write failure does not fail response', async () => {
    __send.mockRejectedValue(new Error('R2 down'))
    const res = await req('/v1/impression', {
      surface: 'claude-code-spinner',
      sdk_version: '0.1.0',
    })
    expect(res.status).toBe(200)
  })

  it('rejects non-UUID publisher_token (R2 key traversal guard)', async () => {
    const res = await req('/v1/impression', {
      surface: 'claude-code-spinner',
      publisher_token: '../campaigns/evil',
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid publisher_token')
  })

  it('rate limits a publisher token after 60 requests/min', async () => {
    __send.mockResolvedValue({})
    let last: Response | undefined
    for (let i = 0; i < 61; i++) {
      last = await req('/v1/impression', { surface: 'claude-code-spinner', publisher_token: TOKEN })
    }
    expect(last!.status).toBe(429)
  })
})

describe('POST /v1/publisher/register', () => {
  it('rejects invalid email', async () => {
    const res = await req('/v1/publisher/register', { email: 'notanemail' })
    expect(res.status).toBe(400)
  })

  it('rejects email without TLD', async () => {
    const res = await req('/v1/publisher/register', { email: 'a@b' })
    expect(res.status).toBe(400)
  })

  it('creates new publisher when key missing', async () => {
    const notFound = new Error('NoSuchKey')
    ;(notFound as any).Code = 'NoSuchKey'
    __send
      .mockRejectedValueOnce(notFound)  // GetObject → not found
      .mockResolvedValueOnce({})         // PutObject → ok

    const res = await req('/v1/publisher/register', { email: 'new@example.com' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.registered_at).toBeDefined()
  })

  it('returns existing token when already registered (idempotent)', async () => {
    const existing = { email: 'existing@example.com', token: 'existing-token-uuid', registered_at: '2026-01-01T00:00:00Z' }
    __send.mockResolvedValueOnce({
      Body: { transformToString: async () => JSON.stringify(existing) },
    })

    const res = await req('/v1/publisher/register', { email: 'existing@example.com' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBe('existing-token-uuid')
  })

  it('returns 500 on unexpected R2 error', async () => {
    const err = new Error('network failure')
    ;(err as any).Code = 'InternalError'
    __send.mockRejectedValue(err)

    const res = await req('/v1/publisher/register', { email: 'test@example.com' })
    expect(res.status).toBe(500)
  })

  it('rate limits registration per IP after 10/hour', async () => {
    __send.mockResolvedValue({ Body: { transformToString: async () => JSON.stringify({ email: 'a@b.co', token: TOKEN, registered_at: '' }) } })
    let last: Response | undefined
    for (let i = 0; i < 11; i++) {
      last = await req('/v1/publisher/register', { email: `user${i}@example.com` })
    }
    expect(last!.status).toBe(429)
  })
})

describe('POST /v1/admin/campaign', () => {
  const valid = {
    advertiser_name: 'Acme',
    ad_text: 'Acme rockets — fast delivery',
    url: 'https://acme.example',
    budget_cents: 10_000,
    cpm_cents: 500,
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2027-01-01T00:00:00Z',
  }

  it('rejects wrong admin token', async () => {
    const res = await req('/v1/admin/campaign', valid, { 'x-admin-token': 'wrong' })
    expect(res.status).toBe(401)
  })

  it('accepts a valid campaign', async () => {
    __send.mockResolvedValue({})
    const res = await req('/v1/admin/campaign', valid, admin)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.campaign.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('strips ANSI escape sequences from ad_text', async () => {
    __send.mockResolvedValue({})
    const res = await req('/v1/admin/campaign', { ...valid, ad_text: 'Buy\x1b[31m now\x1b[0m stuff' }, admin)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.campaign.ad_text).not.toContain('\x1b')
  })

  it('rejects non-http(s) url', async () => {
    const res = await req('/v1/admin/campaign', { ...valid, url: 'javascript:alert(1)' }, admin)
    expect(res.status).toBe(400)
  })

  it('rejects ends_at before starts_at', async () => {
    const res = await req('/v1/admin/campaign', { ...valid, starts_at: '2027-01-01T00:00:00Z', ends_at: '2026-01-01T00:00:00Z' }, admin)
    expect(res.status).toBe(400)
  })

  it('rejects non-positive budget', async () => {
    const res = await req('/v1/admin/campaign', { ...valid, budget_cents: 0 }, admin)
    expect(res.status).toBe(400)
  })

  it('rejects non-UUID campaign id', async () => {
    const res = await req('/v1/admin/campaign', { ...valid, id: '../publishers/x' }, admin)
    expect(res.status).toBe(400)
  })
})

describe('GET /v1/publisher/earnings', () => {
  it('rejects missing or malformed token', async () => {
    const res1 = await app.request('/v1/publisher/earnings')
    expect(res1.status).toBe(401)
    const res2 = await app.request('/v1/publisher/earnings', { headers: { authorization: 'Bearer not-a-uuid' } })
    expect(res2.status).toBe(401)
  })
})

describe('POST /v1/admin/payouts', () => {
  function mockPayoutState(opts: { ledgerCredits: number; payouts: Array<{ amount: number; reference: string }> }) {
    __send.mockImplementation(async (cmd: any) => {
      if (cmd.__type === 'Get' && cmd.input.Key.startsWith('ledgers/')) {
        return { Body: { transformToString: async () => JSON.stringify({ publisher_token: TOKEN, total_credits: opts.ledgerCredits, total_impressions: 1, daily: {}, updated_at: '' }) } }
      }
      if (cmd.__type === 'List') {
        return { Contents: opts.payouts.map((_, i) => ({ Key: `payouts/${TOKEN}/2026-01-0${i + 1}T00:00:00Z.json` })) }
      }
      if (cmd.__type === 'Get') {
        const i = parseInt(cmd.input.Key.match(/2026-01-0(\d)/)![1], 10) - 1
        return { Body: { transformToString: async () => JSON.stringify({ publisher_token: TOKEN, method: 'manual', paid_at: cmd.input.Key, ...opts.payouts[i] }) } }
      }
      return {}
    })
  }

  it('rejects amount exceeding unpaid balance', async () => {
    mockPayoutState({ ledgerCredits: 15, payouts: [{ amount: 10, reference: 'ref-a' }] })
    const res = await req('/v1/admin/payouts', { publisher_token: TOKEN, amount: 6, method: 'manual' }, admin)
    expect(res.status).toBe(400)
  })

  it('records a valid payout', async () => {
    mockPayoutState({ ledgerCredits: 15, payouts: [] })
    const res = await req('/v1/admin/payouts', { publisher_token: TOKEN, amount: 12, method: 'stripe', reference: 'po_123' }, admin)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payout.amount).toBe(12)
    expect(body.remaining_unpaid).toBeCloseTo(3)
  })

  it('is idempotent on duplicate reference', async () => {
    mockPayoutState({ ledgerCredits: 15, payouts: [{ amount: 12, reference: 'po_123' }] })
    const res = await req('/v1/admin/payouts', { publisher_token: TOKEN, amount: 12, method: 'stripe', reference: 'po_123' }, admin)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.idempotent).toBe(true)
    expect(body.payout.reference).toBe('po_123')
    // No new payout object written
    const puts = __send.mock.calls.filter(([cmd]: any[]) => cmd.__type === 'Put')
    expect(puts).toHaveLength(0)
  })

  it('rejects non-UUID publisher_token', async () => {
    const res = await req('/v1/admin/payouts', { publisher_token: 'nope', amount: 12, method: 'stripe' }, admin)
    expect(res.status).toBe(400)
  })
})
