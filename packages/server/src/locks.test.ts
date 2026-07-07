import { describe, it, expect } from 'vitest'
import { withLock } from './locks.js'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

describe('withLock', () => {
  it('serializes tasks on the same key', async () => {
    const order: string[] = []
    await Promise.all([
      withLock('k', async () => { order.push('a-start'); await sleep(20); order.push('a-end') }),
      withLock('k', async () => { order.push('b-start'); await sleep(1); order.push('b-end') }),
    ])
    expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end'])
  })

  it('runs different keys concurrently', async () => {
    const order: string[] = []
    await Promise.all([
      withLock('k1', async () => { order.push('a-start'); await sleep(20); order.push('a-end') }),
      withLock('k2', async () => { order.push('b-start'); await sleep(1); order.push('b-end') }),
    ])
    expect(order).toEqual(['a-start', 'b-start', 'b-end', 'a-end'])
  })

  it('continues the chain after a failed task', async () => {
    const first = withLock('k', async () => { throw new Error('boom') })
    const second = withLock('k', async () => 'ok')
    await expect(first).rejects.toThrow('boom')
    await expect(second).resolves.toBe('ok')
  })

  it('returns the task result', async () => {
    await expect(withLock('k', async () => 42)).resolves.toBe(42)
  })
})
