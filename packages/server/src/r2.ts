import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
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
