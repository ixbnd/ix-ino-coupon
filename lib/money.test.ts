import { describe, it, expect } from 'vitest'
import { coveredCents, excessCents, parseBillToCents, formatCents } from './money'

describe('money', () => {
  it('covers min(bill, cap)', () => {
    expect(coveredCents(1850, 1500)).toBe(1500)
    expect(coveredCents(1200, 1500)).toBe(1200)
    expect(coveredCents(1500, 1500)).toBe(1500)
  })
  it('excess is overage only', () => {
    expect(excessCents(1850, 1500)).toBe(350)
    expect(excessCents(1500, 1500)).toBe(0)
    expect(excessCents(900, 1500)).toBe(0)
  })
  it('parses dollar strings to cents', () => {
    expect(parseBillToCents('18.50')).toBe(1850)
    expect(parseBillToCents('18.5')).toBe(1850)
    expect(parseBillToCents('18')).toBe(1800)
    expect(parseBillToCents(' 18.50 ')).toBe(1850)
  })
  it('rejects junk', () => {
    for (const bad of ['', 'abc', '-5', '18.555', '1,800', '18.50.1']) {
      expect(parseBillToCents(bad)).toBeNull()
    }
  })
  it('formats cents', () => {
    expect(formatCents(1850)).toBe('$18.50')
    expect(formatCents(0)).toBe('$0.00')
  })
})
