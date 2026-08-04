// Placeholder secrets are opt-in only. Inferring "this is not production"
// from a missing platform variable is unsafe: ADMIN_TOKEN goes through here,
// so any deploy that does not happen to set FLY_APP_NAME (Docker, another
// host, a new Fly app before secrets land) would silently come up with a
// guessable admin token instead of refusing to boot. Fail closed by default.
function require(name: string): string {
  const val = process.env[name]
  if (val) return val

  if (process.env.NODE_ENV === 'test' || process.env.ALLOW_MOCK_SECRETS === '1') {
    return `mock_${name.toLowerCase()}`
  }
  throw new Error(
    `Missing env var: ${name} (set it, or ALLOW_MOCK_SECRETS=1 for local development)`,
  )
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
