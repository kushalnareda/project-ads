import { describe, it, expect, beforeEach } from 'vitest'
import { allow, resetRateLimits } from './ratelimit.js'

const LIMIT = { limit: 3, windowMs: 1000 }

beforeEach(() => resetRateLimits())

describe('allow', () => {
  it('allows up to the limit then blocks', () => {
    expect(allow('k', LIMIT, 0)).toBe(true)
    expect(allow('k', LIMIT, 1)).toBe(true)
    expect(allow('k', LIMIT, 2)).toBe(true)
    expect(allow('k', LIMIT, 3)).toBe(false)
  })

  it('resets after the window elapses', () => {
    for (let i = 0; i < 3; i++) allow('k', LIMIT, 0)
    expect(allow('k', LIMIT, 500)).toBe(false)
    expect(allow('k', LIMIT, 1000)).toBe(true)
  })

  it('tracks keys independently', () => {
    for (let i = 0; i < 3; i++) allow('a', LIMIT, 0)
    expect(allow('a', LIMIT, 0)).toBe(false)
    expect(allow('b', LIMIT, 0)).toBe(true)
  })
})
