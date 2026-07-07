import { describe, it, expect } from 'vitest'
import { isUuid, sanitizeAdText, isValidAdUrl, isValidEmail, isIsoDate, AD_TEXT_MAX } from './validate.js'

describe('isUuid', () => {
  it('accepts server-issued UUIDs', () => {
    expect(isUuid(crypto.randomUUID())).toBe(true)
  })
  it('rejects traversal attempts and junk', () => {
    for (const bad of ['../campaigns/x', '', 'tok-123', null, undefined, 42, 'a'.repeat(36)]) {
      expect(isUuid(bad)).toBe(false)
    }
  })
})

describe('sanitizeAdText', () => {
  it('strips ANSI escapes and control chars', () => {
    expect(sanitizeAdText('Buy\x1b[31m now\x00!\r\n')).toBe('Buy [31m now !')
  })
  it('collapses whitespace and trims', () => {
    expect(sanitizeAdText('  hello   world  ')).toBe('hello world')
  })
  it('caps length', () => {
    expect(sanitizeAdText('x'.repeat(500))).toHaveLength(AD_TEXT_MAX)
  })
})

describe('isValidAdUrl', () => {
  it('accepts http(s)', () => {
    expect(isValidAdUrl('https://ramp.com')).toBe(true)
    expect(isValidAdUrl('http://example.com/path?q=1')).toBe(true)
  })
  it('rejects other schemes and garbage', () => {
    for (const bad of ['javascript:alert(1)', 'file:///etc/passwd', 'not a url', '', 'ftp://x.com']) {
      expect(isValidAdUrl(bad)).toBe(false)
    }
  })
})

describe('isValidEmail', () => {
  it('accepts normal emails', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
  })
  it('rejects malformed emails', () => {
    for (const bad of ['a@b', 'notanemail', 'a b@c.co', '@x.co', 'a@.co']) {
      expect(isValidEmail(bad)).toBe(false)
    }
  })
})

describe('isIsoDate', () => {
  it('accepts ISO dates', () => {
    expect(isIsoDate('2026-01-01T00:00:00Z')).toBe(true)
  })
  it('rejects non-dates', () => {
    expect(isIsoDate('not a date')).toBe(false)
    expect(isIsoDate(42)).toBe(false)
  })
})
