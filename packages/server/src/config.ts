function require(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing env var: ${name}`)
  return val
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback
}

export const config = {
  ad: {
    text: require('AD_TEXT'),
    url: require('AD_URL'),
    credits: {
      spinner: parseFloat(optional('CREDITS_SPINNER', '0.001')),
      statusLine: parseFloat(optional('CREDITS_STATUSLINE', '0.0002')),
      default: parseFloat(optional('CREDITS_DELTA', '0.001')),
    },
  },
  r2: {
    accountId: require('R2_ACCOUNT_ID'),
    accessKeyId: require('R2_ACCESS_KEY_ID'),
    secretAccessKey: require('R2_SECRET_ACCESS_KEY'),
    bucket: require('R2_BUCKET'),
  },
  port: parseInt(optional('PORT', '3000'), 10),
}
