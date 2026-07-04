import { S3Client, PutObjectCommand, GetObjectCommand, NoSuchKey } from '@aws-sdk/client-s3'
import { config } from './config.js'

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
})

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
