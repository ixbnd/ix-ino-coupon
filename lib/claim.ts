import { timingSafeEqual, createHash } from 'node:crypto'
import { isThursday, localYmd, nextThursdayYmd } from '@/lib/thursday'

export type ClaimState =
  | { kind: 'bad_token' }
  | { kind: 'not_thursday'; nextThursday: string }
  | { kind: 'open'; claimDate: string }

export function tokenMatches(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false
  const h = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(h(provided), h(expected))
}
export function resolveClaimState(token: string | undefined, now: Date, couponToken = process.env.COUPON_TOKEN): ClaimState {
  if (!tokenMatches(token, couponToken)) return { kind: 'bad_token' }
  if (!isThursday(now)) return { kind: 'not_thursday', nextThursday: nextThursdayYmd(now) }
  return { kind: 'open', claimDate: localYmd(now) }
}
