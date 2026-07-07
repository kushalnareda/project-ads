import { describe, it, expect, vi } from 'vitest'

// In-memory R2: get/put against a Map, with a small put delay so unserialized
// read-modify-write cycles would interleave and lose updates.
vi.mock('@aws-sdk/client-s3', () => {
  const store = new Map<string, string>()
  const send = vi.fn(async (cmd: any) => {
    if (cmd.__type === 'Get') {
      if (!store.has(cmd.input.Key)) {
        const err = new Error('NoSuchKey') as Error & { Code: string }
        err.Code = 'NoSuchKey'
        throw err
      }
      return { Body: { transformToString: async () => store.get(cmd.input.Key) } }
    }
    if (cmd.__type === 'Put') {
      await new Promise(r => setTimeout(r, 5))
      store.set(cmd.input.Key, cmd.input.Body)
      return {}
    }
    return {}
  })
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
    __store: store,
  }
})

vi.stubEnv('ADMIN_TOKEN', 'test-admin-token')
vi.stubEnv('R2_ACCOUNT_ID', 'test-account')
vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key')
vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret')
vi.stubEnv('R2_BUCKET', 'test-bucket')

const { __store } = await import('@aws-sdk/client-s3') as any
const { creditLedger, incrementCampaignSpend } = await import('./r2.js')

describe('creditLedger under concurrency', () => {
  it('does not lose credits when impressions land concurrently', async () => {
    const token = crypto.randomUUID()
    await Promise.all([
      creditLedger(token, 0.001, '2026-07-07T00:00:00Z'),
      creditLedger(token, 0.002, '2026-07-07T00:00:01Z'),
      creditLedger(token, 0.003, '2026-07-08T00:00:00Z'),
    ])
    const ledger = JSON.parse(__store.get(`ledgers/${token}.json`))
    expect(ledger.total_credits).toBeCloseTo(0.006)
    expect(ledger.total_impressions).toBe(3)
    expect(ledger.daily['2026-07-07'].impressions).toBe(2)
    expect(ledger.daily['2026-07-08'].impressions).toBe(1)
  })
})

describe('incrementCampaignSpend under concurrency', () => {
  it('does not lose spend when impressions land concurrently', async () => {
    const id = crypto.randomUUID()
    __store.set(`campaigns/${id}.json`, JSON.stringify({ id, spent_cents: 0 }))
    await Promise.all([
      incrementCampaignSpend(id, 1),
      incrementCampaignSpend(id, 2),
      incrementCampaignSpend(id, 3),
    ])
    const campaign = JSON.parse(__store.get(`campaigns/${id}.json`))
    expect(campaign.spent_cents).toBe(6)
  })
})
