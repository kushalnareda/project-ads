import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { config } from './config.js'

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

export interface Publisher {
  email: string
  token: string
  registered_at: string
}

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function registerPublisher(email: string): Promise<Publisher> {
  const hash = await sha256hex(email.toLowerCase().trim())
  const key = `publishers/${hash}.json`

  try {
    const res = await client.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }))
    const body = await res.Body!.transformToString()
    return JSON.parse(body) as Publisher
  } catch (err: any) {
    const code = err?.Code ?? err?.code ?? err?.name
    if (code !== 'NoSuchKey') throw err
  }

  const publisher: Publisher = {
    email,
    token: crypto.randomUUID(),
    registered_at: new Date().toISOString(),
  }

  await client.send(new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: key,
    Body: JSON.stringify(publisher),
    ContentType: 'application/json',
  }))

  return publisher
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
    console.error('[r2] incrementCampaignSpend failed:', err instanceof Error ? err.message : err)
  }
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
    console.error('[r2] creditLedger failed:', err instanceof Error ? err.message : err)
  }
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
    console.error('[r2] write failed:', err instanceof Error ? err.message : err)
  }
}
