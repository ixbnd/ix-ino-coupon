import { describe, it, expect } from 'vitest'
import { localYmd, isThursday, nextThursdayYmd, currentWeekThursday, thursdaysInMonth, formatYmdLong, localHm, daysUntil, waitLabel } from './thursday'
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
  it('finds the Thursday of the current Mon-Sun week', () => {
    expect(currentWeekThursday(new Date('2026-08-19T04:00:00Z'), TZ)).toBe('2026-08-20') // Wed 19 Aug
    expect(currentWeekThursday(new Date('2026-08-20T04:00:00Z'), TZ)).toBe('2026-08-20') // Thu 20 Aug
    expect(currentWeekThursday(new Date('2026-08-21T04:00:00Z'), TZ)).toBe('2026-08-20') // Fri 21 Aug
    expect(currentWeekThursday(new Date('2026-08-23T04:00:00Z'), TZ)).toBe('2026-08-20') // Sun 23 Aug
    expect(currentWeekThursday(new Date('2026-08-24T04:00:00Z'), TZ)).toBe('2026-08-27') // Mon 24 Aug
  })
  it('lists all Thursdays of a month', () => {
    expect(thursdaysInMonth(2026, 8)).toEqual(['2026-08-06', '2026-08-13', '2026-08-20', '2026-08-27'])
  })
  it('formats', () => {
    expect(formatYmdLong('2026-08-20')).toBe('Thu, 20 Aug 2026')
    expect(localHm(new Date('2026-08-20T04:14:00Z'), TZ)).toBe('12:14 pm')
    expect(localHm(new Date('2026-08-20T06:14:00Z'), TZ)).toBe('2:14 pm')
    expect(localHm(new Date('2026-08-20T01:05:00Z'), TZ)).toBe('9:05 am')
    // Midnight and noon are the two the 12-hour clock gets wrong most often.
    expect(localHm(new Date('2026-08-19T16:00:00Z'), TZ)).toBe('12:00 am')
    expect(localHm(new Date('2026-08-20T04:00:00Z'), TZ)).toBe('12:00 pm')
  })
})

describe('daysUntil / waitLabel', () => {
  it('counts whole days in local time', () => {
    // Fri 21 Aug 2026, 09:00 Brunei -> next Thursday is 27 Aug, six days out.
    expect(daysUntil('2026-08-27', new Date('2026-08-21T01:00:00Z'), TZ)).toBe(6)
    // Late evening on the same local day still reads as six, not five.
    expect(daysUntil('2026-08-27', new Date('2026-08-21T15:30:00Z'), TZ)).toBe(6)
    expect(daysUntil('2026-08-27', new Date('2026-08-26T01:00:00Z'), TZ)).toBe(1)
  })

  it('describes the wait in words', () => {
    expect(waitLabel(0)).toBe('today')
    expect(waitLabel(1)).toBe('tomorrow')
    expect(waitLabel(6)).toBe('in 6 days')
  })
})
