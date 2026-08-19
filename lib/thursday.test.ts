import { describe, it, expect } from 'vitest'
import { localYmd, isThursday, nextThursdayYmd, thursdaysInMonth, formatYmdLong, localHm } from './thursday'
const TZ = 'Asia/Brunei'

describe('thursday', () => {
  it('resolves local date across midnight UTC+8', () => {
    expect(localYmd(new Date('2026-08-19T16:00:00Z'), TZ)).toBe('2026-08-20') // Thu 00:00 local
    expect(localYmd(new Date('2026-08-19T15:59:59Z'), TZ)).toBe('2026-08-19') // Wed 23:59 local
  })
  it('knows Thursday boundaries in local time', () => {
    expect(isThursday(new Date('2026-08-19T15:59:59Z'), TZ)).toBe(false) // Wed 23:59
    expect(isThursday(new Date('2026-08-19T16:00:00Z'), TZ)).toBe(true)  // Thu 00:00
    expect(isThursday(new Date('2026-08-20T15:59:59Z'), TZ)).toBe(true)  // Thu 23:59
    expect(isThursday(new Date('2026-08-20T16:00:00Z'), TZ)).toBe(false) // Fri 00:00
  })
  it('finds next Thursday strictly after today', () => {
    expect(nextThursdayYmd(new Date('2026-08-19T04:00:00Z'), TZ)).toBe('2026-08-20') // from Wed
    expect(nextThursdayYmd(new Date('2026-08-20T04:00:00Z'), TZ)).toBe('2026-08-27') // from Thu
  })
  it('lists all Thursdays of a month', () => {
    expect(thursdaysInMonth(2026, 8)).toEqual(['2026-08-06', '2026-08-13', '2026-08-20', '2026-08-27'])
  })
  it('formats', () => {
    expect(formatYmdLong('2026-08-20')).toBe('Thu, 20 Aug 2026')
    expect(localHm(new Date('2026-08-20T04:14:00Z'), TZ)).toBe('12:14')
  })
})
