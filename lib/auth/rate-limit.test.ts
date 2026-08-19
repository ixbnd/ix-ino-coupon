import { describe, it, expect } from 'vitest'
import { checkRateLimit } from './rate-limit'

describe('rate limit', () => {
  it('allows 10 then blocks, per key, within window', () => {
    const now = 1_000_000
    for (let i = 0; i < 10; i++) expect(checkRateLimit('ABC-0001', now)).toBe(true)
    expect(checkRateLimit('ABC-0001', now)).toBe(false)
    expect(checkRateLimit('ABC-0002', now)).toBe(true)              // other key unaffected
    expect(checkRateLimit('ABC-0001', now + 16 * 60_000)).toBe(true) // window expired
  })
})
