import { describe, it, expect } from 'vitest'
import { resolveClaimState, tokenMatches } from './claim'

const TOKEN = 'super-secret-coupon-token'
const WED_2359 = new Date('2026-08-19T15:59:59Z') // Wed 23:59 Asia/Brunei
const THU_0000 = new Date('2026-08-19T16:00:00Z') // Thu 00:00 Asia/Brunei

describe('tokenMatches', () => {
  it('matches identical tokens', () => {
    expect(tokenMatches(TOKEN, TOKEN)).toBe(true)
  })
  it('rejects a near-miss token', () => {
    expect(tokenMatches(`${TOKEN}x`, TOKEN)).toBe(false)
  })
  it('rejects when either side is missing', () => {
    expect(tokenMatches(undefined, TOKEN)).toBe(false)
    expect(tokenMatches(TOKEN, undefined)).toBe(false)
    expect(tokenMatches(undefined, undefined)).toBe(false)
  })
})

describe('resolveClaimState (APP_TIMEZONE unset -> default Asia/Brunei)', () => {
  it('bad token: missing token -> bad_token', () => {
    expect(resolveClaimState(undefined, THU_0000, TOKEN)).toEqual({ kind: 'bad_token' })
  })
  it('bad token: wrong token -> bad_token', () => {
    expect(resolveClaimState('wrong-token', THU_0000, TOKEN)).toEqual({ kind: 'bad_token' })
  })
  it('bad token: near-miss token -> bad_token', () => {
    expect(resolveClaimState(`${TOKEN}x`, THU_0000, TOKEN)).toEqual({ kind: 'bad_token' })
  })
  it('token check wins over day check: wrong token on a Thursday is still bad_token', () => {
    expect(resolveClaimState('wrong-token', THU_0000, TOKEN)).toEqual({ kind: 'bad_token' })
  })
  it('correct token, Wed 23:59 -> not_thursday with next Thursday', () => {
    expect(resolveClaimState(TOKEN, WED_2359, TOKEN)).toEqual({ kind: 'not_thursday', nextThursday: '2026-08-20' })
  })
  it('correct token, Thu 00:00 -> open with today\'s claim date', () => {
    expect(resolveClaimState(TOKEN, THU_0000, TOKEN)).toEqual({ kind: 'open', claimDate: '2026-08-20' })
  })
})
