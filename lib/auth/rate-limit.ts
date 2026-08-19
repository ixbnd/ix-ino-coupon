const WINDOW_MS = 15 * 60_000
const MAX = 10
const attempts = new Map<string, number[]>()

export function checkRateLimit(key: string, now = Date.now()): boolean {
  const arr = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (arr.length >= MAX) {
    attempts.set(key, arr)
    return false
  }
  arr.push(now)
  attempts.set(key, arr)
  return true
}
