function require(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing env var: ${name}`)
  return val
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback
}

export const config = {
  adminToken: require('ADMIN_TOKEN'),
  publisherShare: parseFloat(optional('PUBLISHER_SHARE', '0.70')),
  defaultAd: {
    text: optional('AD_TEXT', ''),
    url: optional('AD_URL', ''),
  },
  r2: {
    accountId: require('R2_ACCOUNT_ID'),
    accessKeyId: require('R2_ACCESS_KEY_ID'),
    secretAccessKey: require('R2_SECRET_ACCESS_KEY'),
    bucket: require('R2_BUCKET'),
  },
  port: parseInt(optional('PORT', '3000'), 10),
}
