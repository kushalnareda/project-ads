// Input validation and sanitization at the trust boundary.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Publisher tokens and campaign ids are server-issued UUIDs and get embedded
// in R2 object keys (ledgers/<token>.json, campaigns/<id>.json, ...).
// Rejecting anything else closes key-namespace traversal.
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export const isPublisherToken = isUuid

export const AD_TEXT_MAX = 160

// Ad text is rendered into publishers' terminals — strip ANSI/control chars so
// a campaign can never inject escape sequences, and cap length so it can't
// wreck the spinner/statusline layout.
export function sanitizeAdText(text: string): string {
  return text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, AD_TEXT_MAX)
}

export function isValidAdUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value)
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

// Single-line free text (names, company names): strip control chars, collapse
// whitespace, cap length. Returns '' when nothing printable remains.
export function sanitizeLine(text: unknown, max = 100): string {
  if (typeof text !== 'string') return ''
  return text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}
