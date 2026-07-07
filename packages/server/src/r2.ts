import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { config } from './config.js'
import { withLock } from './locks.js'
import { log } from './logger.js'

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
})

export interface Campaign {
  id: string
  advertiser_name: string
  ad_text: string
  url: string
  budget_cents: number   // total budget in cents
  spent_cents: number    // running spend (eventual consistency at MVP scale)
  cpm_cents: number      // advertiser pays per 1000 impressions, in cents
  active: boolean
  starts_at: string      // ISO
  ends_at: string        // ISO
  created_at: string
}

export interface Impression {
  surface: string
  sdk_version: string
  ad_text: string
  url: string
  credits_delta: number
  timestamp: string
  tool: string
  publisher_token: string | null
}

// Profile fields captured at onboarding. name is required; the rest are
// optional and feed future ad targeting (role/country) + attribution.
export interface PublisherProfile {
  name: string
  role?: string        // job title / profession, e.g. "Frontend engineer"
  country?: string     // for geo-targeted ads
  heard_from?: string  // acquisition attribution
}

export interface Publisher extends PublisherProfile {
  email: string
  token: string
  registered_at: string
}

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function registerPublisher(email: string, profile: PublisherProfile): Promise<Publisher> {
  const hash = await sha256hex(email.toLowerCase().trim())
  const key = `publishers/${hash}.json`

  try {
    const res = await client.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }))
    const existing = JSON.parse(await res.Body!.transformToString()) as Publisher
    // Idempotent: keep the original token/registered_at, but backfill any
    // profile fields that are newly provided (e.g. an early publisher who
    // registered before we collected name/role re-runs setup).
    const merged: Publisher = {
      ...existing,
      name: existing.name || profile.name,
      role: existing.role ?? profile.role,
      country: existing.country ?? profile.country,
      heard_from: existing.heard_from ?? profile.heard_from,
    }
    if (JSON.stringify(merged) !== JSON.stringify(existing)) {
      await client.send(new PutObjectCommand({
        Bucket: config.r2.bucket, Key: key,
        Body: JSON.stringify(merged), ContentType: 'application/json',
      }))
    }
    return merged
  } catch (err: any) {
    const code = err?.Code ?? err?.code ?? err?.name
    if (code !== 'NoSuchKey') throw err
  }

  const publisher: Publisher = {
    email,
    token: crypto.randomUUID(),
    registered_at: new Date().toISOString(),
    name: profile.name,
    ...(profile.role ? { role: profile.role } : {}),
    ...(profile.country ? { country: profile.country } : {}),
    ...(profile.heard_from ? { heard_from: profile.heard_from } : {}),
  }

  await client.send(new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: key,
    Body: JSON.stringify(publisher),
    ContentType: 'application/json',
  }))

  return publisher
}

// Look up a publisher by their token (scans publishers/). Used by earnings +
// admin joins. Fine at MVP scale; revisit with an index if publisher count grows.
export async function getPublisherByToken(token: string): Promise<Publisher | null> {
  const publishers = await listPublishers()
  return publishers.find(p => p.token === token) ?? null
}

export async function listCampaigns(): Promise<Campaign[]> {
  const list = await client.send(new ListObjectsV2Command({
    Bucket: config.r2.bucket,
    Prefix: 'campaigns/',
  }))

  const keys = (list.Contents ?? [])
    .map(o => o.Key!)
    .filter(k => k.endsWith('.json'))

  if (keys.length === 0) return []

  const results = await Promise.allSettled(
    keys.map(async key => {
      const res = await client.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }))
      const body = await res.Body!.transformToString()
      return JSON.parse(body) as Campaign
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<Campaign> => r.status === 'fulfilled')
    .map(r => r.value)
}

export async function upsertCampaign(campaign: Campaign): Promise<void> {
  await client.send(new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: `campaigns/${campaign.id}.json`,
    Body: JSON.stringify(campaign),
    ContentType: 'application/json',
  }))
}

export async function incrementCampaignSpend(id: string, deltaCents: number): Promise<void> {
  const key = `campaigns/${id}.json`
  // Serialized per campaign: concurrent impressions would otherwise interleave
  // the get→put below and drop spend, letting campaigns run past budget.
  await withLock(key, async () => {
    try {
      const res = await client.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }))
      const body = await res.Body!.transformToString()
      const campaign = JSON.parse(body) as Campaign
      campaign.spent_cents = (campaign.spent_cents ?? 0) + deltaCents
      await client.send(new PutObjectCommand({
        Bucket: config.r2.bucket,
        Key: key,
        Body: JSON.stringify(campaign),
        ContentType: 'application/json',
      }))
    } catch (err) {
      log.error('r2.spend_update_failed', err, { campaign_id: id, delta_cents: deltaCents })
    }
  })
}

export interface Ledger {
  publisher_token: string
  total_credits: number
  total_impressions: number
  daily: Record<string, { credits: number; impressions: number }>
  updated_at: string
}

export async function getLedger(publisherToken: string): Promise<Ledger | null> {
  const key = `ledgers/${publisherToken}.json`
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }))
    const body = await res.Body!.transformToString()
    return JSON.parse(body) as Ledger
  } catch (err: any) {
    const code = err?.Code ?? err?.code ?? err?.name
    if (code === 'NoSuchKey') return null
    throw err
  }
}

export async function creditLedger(publisherToken: string, creditsDelta: number, timestamp: string): Promise<void> {
  const key = `ledgers/${publisherToken}.json`
  // Serialized per publisher: this is the money path — a lost get→put
  // interleave here silently underpays the publisher.
  await withLock(key, async () => {
    try {
      const existing = await getLedger(publisherToken)
      const ledger: Ledger = existing ?? {
        publisher_token: publisherToken,
        total_credits: 0,
        total_impressions: 0,
        daily: {},
        updated_at: timestamp,
      }

      const day = timestamp.slice(0, 10)
      const dayEntry = ledger.daily[day] ?? { credits: 0, impressions: 0 }
      dayEntry.credits += creditsDelta
      dayEntry.impressions += 1
      ledger.daily[day] = dayEntry
      ledger.total_credits += creditsDelta
      ledger.total_impressions += 1
      ledger.updated_at = timestamp

      await client.send(new PutObjectCommand({
        Bucket: config.r2.bucket,
        Key: key,
        Body: JSON.stringify(ledger),
        ContentType: 'application/json',
      }))
    } catch (err) {
      // Impression objects are the source of truth; a lost ledger update is
      // recoverable by replaying impressions/, so log loudly but don't throw.
      log.error('r2.ledger_credit_failed', err, { publisher_token: publisherToken, credits_delta: creditsDelta })
    }
  })
}

export interface Payout {
  publisher_token: string
  amount: number          // credits (== USD) paid out
  method: string          // 'stripe' | 'bank' | 'paypal' | 'manual' | ...
  reference: string       // external payment reference / note
  paid_at: string         // ISO
}

export async function listLedgers(): Promise<Ledger[]> {
  const list = await client.send(new ListObjectsV2Command({
    Bucket: config.r2.bucket,
    Prefix: 'ledgers/',
  }))

  const keys = (list.Contents ?? []).map(o => o.Key!).filter(k => k.endsWith('.json'))
  if (keys.length === 0) return []

  const results = await Promise.allSettled(
    keys.map(async key => {
      const res = await client.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }))
      return JSON.parse(await res.Body!.transformToString()) as Ledger
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<Ledger> => r.status === 'fulfilled')
    .map(r => r.value)
}

export async function listPublishers(): Promise<Publisher[]> {
  const list = await client.send(new ListObjectsV2Command({
    Bucket: config.r2.bucket,
    Prefix: 'publishers/',
  }))

  const keys = (list.Contents ?? []).map(o => o.Key!).filter(k => k.endsWith('.json'))
  if (keys.length === 0) return []

  const results = await Promise.allSettled(
    keys.map(async key => {
      const res = await client.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }))
      return JSON.parse(await res.Body!.transformToString()) as Publisher
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<Publisher> => r.status === 'fulfilled')
    .map(r => r.value)
}

export async function getPayouts(publisherToken: string): Promise<Payout[]> {
  const list = await client.send(new ListObjectsV2Command({
    Bucket: config.r2.bucket,
    Prefix: `payouts/${publisherToken}/`,
  }))

  const keys = (list.Contents ?? []).map(o => o.Key!).filter(k => k.endsWith('.json'))
  if (keys.length === 0) return []

  const results = await Promise.allSettled(
    keys.map(async key => {
      const res = await client.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }))
      return JSON.parse(await res.Body!.transformToString()) as Payout
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<Payout> => r.status === 'fulfilled')
    .map(r => r.value)
    .sort((a, b) => b.paid_at.localeCompare(a.paid_at))
}

export async function recordPayout(payout: Payout): Promise<void> {
  // Timestamp in key keeps receipts append-only and naturally ordered
  const key = `payouts/${payout.publisher_token}/${payout.paid_at}.json`
  await client.send(new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: key,
    Body: JSON.stringify(payout),
    ContentType: 'application/json',
  }))
}

// A publisher-initiated cash-out. Created 'pending'; admin resolves to
// 'paid' (which also records a Payout receipt) or 'rejected'.
export interface PayoutRequest {
  publisher_token: string
  amount: number          // credits (== USD) snapshot at request time
  method: string          // 'paypal' | 'bank' | 'wise' | 'other'
  destination: string     // paypal email / bank detail / etc.
  status: 'pending' | 'paid' | 'rejected'
  requested_at: string    // ISO — also the object key
  resolved_at?: string
  reference?: string      // external payment reference once paid
}

export async function createPayoutRequest(req: PayoutRequest): Promise<void> {
  const key = `payout_requests/${req.publisher_token}/${req.requested_at}.json`
  await client.send(new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: key,
    Body: JSON.stringify(req),
    ContentType: 'application/json',
  }))
}

export async function getPayoutRequests(publisherToken: string): Promise<PayoutRequest[]> {
  const list = await client.send(new ListObjectsV2Command({
    Bucket: config.r2.bucket,
    Prefix: `payout_requests/${publisherToken}/`,
  }))
  const keys = (list.Contents ?? []).map(o => o.Key!).filter(k => k.endsWith('.json'))
  if (keys.length === 0) return []
  const results = await Promise.allSettled(
    keys.map(async key => {
      const res = await client.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }))
      return JSON.parse(await res.Body!.transformToString()) as PayoutRequest
    })
  )
  return results
    .filter((r): r is PromiseFulfilledResult<PayoutRequest> => r.status === 'fulfilled')
    .map(r => r.value)
    .sort((a, b) => b.requested_at.localeCompare(a.requested_at))
}

export async function listPayoutRequests(): Promise<PayoutRequest[]> {
  const list = await client.send(new ListObjectsV2Command({
    Bucket: config.r2.bucket,
    Prefix: 'payout_requests/',
  }))
  const keys = (list.Contents ?? []).map(o => o.Key!).filter(k => k.endsWith('.json'))
  if (keys.length === 0) return []
  const results = await Promise.allSettled(
    keys.map(async key => {
      const res = await client.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }))
      return JSON.parse(await res.Body!.transformToString()) as PayoutRequest
    })
  )
  return results
    .filter((r): r is PromiseFulfilledResult<PayoutRequest> => r.status === 'fulfilled')
    .map(r => r.value)
}

export async function updatePayoutRequestStatus(
  publisherToken: string,
  requestedAt: string,
  status: 'paid' | 'rejected',
  reference?: string,
): Promise<PayoutRequest | null> {
  const key = `payout_requests/${publisherToken}/${requestedAt}.json`
  // Serialized per request object so a double resolve can't race.
  return withLock(key, async () => {
    let req: PayoutRequest
    try {
      const res = await client.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }))
      req = JSON.parse(await res.Body!.transformToString()) as PayoutRequest
    } catch {
      return null
    }
    req.status = status
    req.resolved_at = new Date().toISOString()
    if (reference) req.reference = reference
    await client.send(new PutObjectCommand({
      Bucket: config.r2.bucket, Key: key,
      Body: JSON.stringify(req), ContentType: 'application/json',
    }))
    return req
  })
}

export async function logImpression(impression: Impression): Promise<void> {
  const d = new Date(impression.timestamp)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const uuid = crypto.randomUUID()
  const key = `impressions/${year}/${month}/${uuid}.json`

  try {
    await client.send(new PutObjectCommand({
      Bucket: config.r2.bucket,
      Key: key,
      Body: JSON.stringify(impression),
      ContentType: 'application/json',
    }))
  } catch (err) {
    // Log server-side but don't fail the impression response
    log.error('r2.impression_write_failed', err, { campaign_id: (impression as { campaign_id?: string }).campaign_id, surface: impression.surface })
  }
}
