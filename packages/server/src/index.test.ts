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
const { default: app, resetCampaignCache } = await import('./app.js')
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
  resetCampaignCache()
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

  it('rotates between campaigns tied at the top CPM', async () => {
    const mk = (id: string, text: string) => ({
      id, advertiser_name: id, ad_text: text, url: 'https://' + id + '.example',
      budget_cents: 10_000, spent_cents: 0, cpm_cents: 500, active: true,
      starts_at: '2020-01-01T00:00:00Z', ends_at: '2030-01-01T00:00:00Z', created_at: '',
    })
    const campaigns = [mk('aaaaaaaa-0000-4000-8000-000000000001', 'site one'), mk('aaaaaaaa-0000-4000-8000-000000000002', 'site two'), mk('aaaaaaaa-0000-4000-8000-000000000003', 'site three')]
    __send.mockImplementation(async (cmd: any) => {
      if (cmd.__type === 'List') return { Contents: campaigns.map(c => ({ Key: `campaigns/${c.id}.json` })) }
      if (cmd.__type === 'Get' && cmd.input.Key.startsWith('campaigns/')) {
        const c = campaigns.find(x => cmd.input.Key.includes(x.id))!
        return { Body: { transformToString: async () => JSON.stringify(c) } }
      }
      return {}
    })
    // Fresh module state has a 60s campaign cache; served ads over many
    // requests should cover all three tied campaigns.
    const seen = new Set<string>()
    for (let i = 0; i < 50 && seen.size < 3; i++) {
      const res = await req('/v1/impression', { surface: 'claude-code-spinner' })
      if (res.status === 429) { resetRateLimits(); continue }
      const body = await res.json()
      seen.add(body.ad_text)
    }
    expect(seen.size).toBe(3)
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

describe('GET /admin', () => {
  it('serves the admin console HTML', async () => {
    const res = await app.request('/admin')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('admin console')
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

// ---------- Advertiser portal ----------

const ADV_TOKEN = 'aaaaaaaa-1111-4111-8111-111111111111'
const ADV_TOKEN_B = 'bbbbbbbb-2222-4222-8222-222222222222'

const ADVERTISER_A = { email: 'a@acme.com', company_name: 'Acme', token: ADV_TOKEN, registered_at: '2026-07-01T00:00:00Z' }
const ADVERTISER_B = { email: 'b@bcorp.com', company_name: 'BCorp', token: ADV_TOKEN_B, registered_at: '2026-07-01T00:00:00Z' }

const CAMP_A_ID = 'cccccccc-0000-4000-8000-000000000001'
const CAMP_B_ID = 'cccccccc-0000-4000-8000-000000000002'

function mkCampaign(over: Record<string, unknown> = {}) {
  return {
    id: CAMP_A_ID, advertiser_name: 'Acme', ad_text: 'Acme ad', url: 'https://acme.example',
    budget_cents: 10_000, spent_cents: 0, cpm_cents: 500,
    active: true, status: 'active', advertiser_token: ADV_TOKEN, daily: {},
    starts_at: '2020-01-01T00:00:00Z', ends_at: '2030-01-01T00:00:00Z', created_at: '',
    ...over,
  }
}

// Dispatch mock: advertisers/ and campaigns/ prefixes both answered
function mockPortal(campaigns: Record<string, unknown>[], advertisers = [ADVERTISER_A, ADVERTISER_B]) {
  __send.mockImplementation(async (cmd: any) => {
    if (cmd.__type === 'List' && cmd.input.Prefix === 'advertisers/') {
      return { Contents: advertisers.map((_, i) => ({ Key: `advertisers/${i}.json` })) }
    }
    if (cmd.__type === 'List' && cmd.input.Prefix === 'campaigns/') {
      return { Contents: campaigns.map(c => ({ Key: `campaigns/${(c as any).id}.json` })) }
    }
    if (cmd.__type === 'Get' && cmd.input.Key.startsWith('advertisers/')) {
      const i = parseInt(cmd.input.Key.match(/(\d+)\.json/)![1], 10)
      return { Body: { transformToString: async () => JSON.stringify(advertisers[i]) } }
    }
    if (cmd.__type === 'Get' && cmd.input.Key.startsWith('campaigns/')) {
      const found = campaigns.find(c => cmd.input.Key.includes((c as any).id))
      if (!found) { const e: any = new Error('NoSuchKey'); e.Code = 'NoSuchKey'; throw e }
      return { Body: { transformToString: async () => JSON.stringify(found) } }
    }
    return {}
  })
}

function putCalls() {
  return __send.mock.calls.filter(([cmd]: any[]) => cmd.__type === 'Put').map(([cmd]: any[]) => ({ key: cmd.input.Key, body: JSON.parse(cmd.input.Body) }))
}

describe('serving: status gate', () => {
  it('REGRESSION: legacy campaign (active:true, no status field) still serves', async () => {
    const legacy = mkCampaign({ status: undefined, daily: undefined, advertiser_token: undefined })
    delete (legacy as any).status; delete (legacy as any).daily; delete (legacy as any).advertiser_token
    mockPortal([legacy])
    const res = await req('/v1/impression', { surface: 'claude-code-spinner' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ad_text).toBe('Acme ad')
  })

  it('SAFETY: pending campaign never serves — falls back to default ad', async () => {
    mockPortal([mkCampaign({ status: 'pending', active: false, budget_cents: 0 })])
    const res = await req('/v1/impression', { surface: 'claude-code-spinner' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ad_text).toBe('Ramp · save time on expenses')  // env default, not the pending ad
  })

  it('rejected and paused campaigns never serve', async () => {
    mockPortal([mkCampaign({ status: 'rejected', active: false }), mkCampaign({ id: CAMP_B_ID, status: 'paused', active: false })])
    const res = await req('/v1/impression', { surface: 'claude-code-spinner' })
    const body = await res.json()
    expect(body.ad_text).toBe('Ramp · save time on expenses')
  })
})

describe('POST /v1/advertiser/register', () => {
  it('registers a new advertiser and returns token', async () => {
    const notFound: any = new Error('NoSuchKey'); notFound.Code = 'NoSuchKey'
    __send.mockRejectedValueOnce(notFound).mockResolvedValueOnce({})
    const res = await req('/v1/advertiser/register', { email: 'new@corp.com', company_name: 'NewCorp' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('known email returns ok WITHOUT token (anti-hijack)', async () => {
    __send.mockResolvedValueOnce({ Body: { transformToString: async () => JSON.stringify(ADVERTISER_A) } })
    const res = await req('/v1/advertiser/register', { email: 'a@acme.com', company_name: 'Acme' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.token).toBeUndefined()
  })

  it('rejects invalid email and missing company', async () => {
    expect((await req('/v1/advertiser/register', { email: 'nope', company_name: 'X' })).status).toBe(400)
    expect((await req('/v1/advertiser/register', { email: 'a@b.co', company_name: '' })).status).toBe(400)
  })
})

describe('GET /v1/advertiser/campaigns', () => {
  it('rejects missing/malformed/unknown tokens', async () => {
    mockPortal([])
    expect((await app.request('/v1/advertiser/campaigns')).status).toBe(401)
    expect((await app.request('/v1/advertiser/campaigns', { headers: { authorization: 'Bearer not-a-uuid' } })).status).toBe(401)
    expect((await app.request('/v1/advertiser/campaigns', { headers: { authorization: 'Bearer 99999999-9999-4999-8999-999999999999' } })).status).toBe(401)
  })

  it('TENANCY: returns only own campaigns, with true impression counts and capped spend', async () => {
    mockPortal([
      mkCampaign({ daily: { '2026-07-09': { impressions: 40, spent_cents: 20 }, '2026-07-10': { impressions: 60, spent_cents: 30 } }, spent_cents: 12_000 }),
      mkCampaign({ id: CAMP_B_ID, advertiser_token: ADV_TOKEN_B, ad_text: 'B ad' }),
    ])
    const res = await app.request('/v1/advertiser/campaigns', { headers: { authorization: `Bearer ${ADV_TOKEN}` } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.campaigns).toHaveLength(1)
    expect(body.campaigns[0].id).toBe(CAMP_A_ID)
    expect(body.campaigns[0].impressions_delivered).toBe(100)
    expect(body.campaigns[0].spent_cents).toBe(10_000)  // capped at budget
  })
})

describe('POST /v1/advertiser/campaign', () => {
  const valid = { ad_text: 'Try Acme', url: 'https://acme.example', cpm_cents: 500, requested_budget_cents: 5000, starts_at: '2026-01-01T00:00:00Z', ends_at: '2027-01-01T00:00:00Z' }

  it('creates a pending campaign with zero funded budget and forced ownership', async () => {
    mockPortal([])
    const res = await req('/v1/advertiser/campaign', valid, { authorization: `Bearer ${ADV_TOKEN}` })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.campaign.status).toBe('pending')
    const put = putCalls().find(p => p.key.startsWith('campaigns/'))!
    expect(put.body.status).toBe('pending')
    expect(put.body.active).toBe(false)
    expect(put.body.budget_cents).toBe(0)
    expect(put.body.requested_budget_cents).toBe(5000)
    expect(put.body.advertiser_token).toBe(ADV_TOKEN)
  })

  it('strips ANSI from ad_text and rejects bad urls/budgets', async () => {
    mockPortal([])
    const res = await req('/v1/advertiser/campaign', { ...valid, ad_text: 'Buy\x1b[31m now' }, { authorization: `Bearer ${ADV_TOKEN}` })
    expect(res.status).toBe(200)
    const put = putCalls().find(p => p.key.startsWith('campaigns/'))!
    expect(put.body.ad_text).not.toContain('\x1b')

    expect((await req('/v1/advertiser/campaign', { ...valid, url: 'javascript:alert(1)' }, { authorization: `Bearer ${ADV_TOKEN}` })).status).toBe(400)
    expect((await req('/v1/advertiser/campaign', { ...valid, requested_budget_cents: 0 }, { authorization: `Bearer ${ADV_TOKEN}` })).status).toBe(400)
  })
})

describe('pause / resume', () => {
  it('advertiser can pause own active campaign (and cache busts)', async () => {
    mockPortal([mkCampaign()])
    const res = await req(`/v1/advertiser/campaign/${CAMP_A_ID}/pause`, {}, { authorization: `Bearer ${ADV_TOKEN}` })
    expect(res.status).toBe(200)
    const put = putCalls().find(p => p.key === `campaigns/${CAMP_A_ID}.json`)!
    expect(put.body.status).toBe('paused')
    expect(put.body.active).toBe(false)
  })

  it("TENANCY: pausing another advertiser's campaign → 404", async () => {
    mockPortal([mkCampaign({ advertiser_token: ADV_TOKEN_B })])
    const res = await req(`/v1/advertiser/campaign/${CAMP_A_ID}/pause`, {}, { authorization: `Bearer ${ADV_TOKEN}` })
    expect(res.status).toBe(404)
  })

  it('pausing a pending campaign → 409', async () => {
    mockPortal([mkCampaign({ status: 'pending', active: false })])
    const res = await req(`/v1/advertiser/campaign/${CAMP_A_ID}/pause`, {}, { authorization: `Bearer ${ADV_TOKEN}` })
    expect(res.status).toBe(409)
  })
})

describe('POST /v1/admin/campaign/:id/review', () => {
  it('approve sets active + funded budget + optional cpm override', async () => {
    mockPortal([mkCampaign({ status: 'pending', active: false, budget_cents: 0, requested_budget_cents: 5000 })])
    const res = await req(`/v1/admin/campaign/${CAMP_A_ID}/review`, { action: 'approve', budget_cents: 4000, cpm_cents: 600 }, admin)
    expect(res.status).toBe(200)
    const put = putCalls().find(p => p.key === `campaigns/${CAMP_A_ID}.json`)!
    expect(put.body.status).toBe('active')
    expect(put.body.active).toBe(true)
    expect(put.body.budget_cents).toBe(4000)
    expect(put.body.cpm_cents).toBe(600)
  })

  it('approve without budget falls back to requested_budget_cents', async () => {
    mockPortal([mkCampaign({ status: 'pending', active: false, budget_cents: 0, requested_budget_cents: 7000 })])
    const res = await req(`/v1/admin/campaign/${CAMP_A_ID}/review`, { action: 'approve' }, admin)
    expect(res.status).toBe(200)
    const put = putCalls().find(p => p.key === `campaigns/${CAMP_A_ID}.json`)!
    expect(put.body.budget_cents).toBe(7000)
  })

  it('reject sets rejected + reason; non-pending → 409; bad auth → 401', async () => {
    mockPortal([mkCampaign({ status: 'pending', active: false })])
    const res = await req(`/v1/admin/campaign/${CAMP_A_ID}/review`, { action: 'reject', rejection_reason: 'link broken' }, admin)
    expect(res.status).toBe(200)
    const put = putCalls().find(p => p.key === `campaigns/${CAMP_A_ID}.json`)!
    expect(put.body.status).toBe('rejected')
    expect(put.body.rejection_reason).toBe('link broken')

    mockPortal([mkCampaign({ status: 'active' })])
    expect((await req(`/v1/admin/campaign/${CAMP_A_ID}/review`, { action: 'approve', budget_cents: 100 }, admin)).status).toBe(409)
    expect((await req(`/v1/admin/campaign/${CAMP_A_ID}/review`, { action: 'approve' }, { 'x-admin-token': 'wrong' })).status).toBe(401)
  })
})

describe('GET /advertiser', () => {
  it('serves the advertiser portal HTML', async () => {
    const res = await app.request('/advertiser')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('advertiser portal')
  })
})
