import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock S3Client before importing app modules
vi.mock('@aws-sdk/client-s3', () => {
  const send = vi.fn()
  return {
    S3Client: vi.fn(() => ({ send })),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    NoSuchKey: class NoSuchKey extends Error { name = 'NoSuchKey' },
    __send: send,
  }
})

// Required env vars before config loads
vi.stubEnv('AD_TEXT', 'Ramp · save time on expenses')
vi.stubEnv('AD_URL', 'https://ramp.com')
vi.stubEnv('R2_ACCOUNT_ID', 'test-account')
vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key')
vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret')
vi.stubEnv('R2_BUCKET', 'test-bucket')

const { __send } = await import('@aws-sdk/client-s3') as any

// Import app after mocks
const { default: app } = await import('./app.js')

function req(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

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
      publisher_token: 'tok-123',
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
})

describe('POST /v1/publisher/register', () => {
  it('rejects invalid email', async () => {
    const res = await req('/v1/publisher/register', { email: 'notanemail' })
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
})
