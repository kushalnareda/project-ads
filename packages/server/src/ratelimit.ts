// Fixed-window in-memory rate limiter. Single-instance deploy (fly.toml pins
// one machine) makes local state authoritative — revisit if we scale out.

interface Window { count: number; resetAt: number }

const windows = new Map<string, Window>()

// Cap map size so an attacker rotating keys (spoofed IPs) can't exhaust memory.
const MAX_KEYS = 50_000

export interface RateLimit {
  limit: number      // max requests per window
  windowMs: number
}

// Returns true when the request is allowed.
export function allow(key: string, { limit, windowMs }: RateLimit, now = Date.now()): boolean {
  const w = windows.get(key)
  if (!w || now >= w.resetAt) {
    if (windows.size >= MAX_KEYS) sweep(now)
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (w.count >= limit) return false
  w.count += 1
  return true
}

function sweep(now: number): void {
  for (const [key, w] of windows) {
    if (now >= w.resetAt) windows.delete(key)
  }
  // Still full after sweeping expired windows — drop oldest entries wholesale
  // rather than refuse service.
  if (windows.size >= MAX_KEYS) windows.clear()
}

// Test hook.
export function resetRateLimits(): void {
  windows.clear()
}
