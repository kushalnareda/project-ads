// Per-key async serialization for R2 read-modify-write cycles.
// R2 has no transactions; without this, concurrent impressions for the same
// publisher (or campaign) interleave get→put and drop credits/spend.
// Correct for a single server instance — fly.toml pins min/max to one machine.
const chains = new Map<string, Promise<unknown>>()

export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve()
  // Run fn regardless of whether the previous task failed.
  const next = prev.then(fn, fn)
  const tail = next.catch(() => {})
  chains.set(key, tail)
  // Drop the map entry once this task settles if nothing chained after it.
  void tail.then(() => {
    if (chains.get(key) === tail) chains.delete(key)
  })
  return next
}
