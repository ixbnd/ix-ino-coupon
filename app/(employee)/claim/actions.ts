'use server'
import { db } from '@/lib/db/client'
import { claims } from '@/lib/db/schema'
import { requireDbSession } from '@/lib/auth/session'
import { resolveClaimState } from '@/lib/claim'
import { parseBillToCents } from '@/lib/money'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const MAX_BILL_CENTS = 50_000
export async function submitClaim(_prev: { error?: string } | null, formData: FormData) {
  const auth = await requireDbSession()
  if (!auth) redirect('/login')
  const state = resolveClaimState(String(formData.get('t') ?? ''), new Date()) // re-resolve at submit time
  if (state.kind !== 'open') return { error: state.kind === 'bad_token' ? 'Invalid coupon code' : 'Claims are only open on Thursdays.' }
  const cents = parseBillToCents(String(formData.get('bill') ?? ''))
  if (cents === null || cents <= 0 || cents > MAX_BILL_CENTS) return { error: 'Enter a bill total between $0.01 and $500.00.' }
  try {
    await db.insert(claims).values({
      employeePk: auth.employee.id, claimDate: state.claimDate,
      billTotalCents: cents, capCents: Number(process.env.CLAIM_CAP_CENTS ?? 1500),
    })
  } catch (e: unknown) {
    const code = (e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code
    if (code !== '23505') throw e // duplicate → fall through to receipt
  }
  revalidatePath('/claim')
  redirect(`/claim?t=${encodeURIComponent(String(formData.get('t')))}`)
}
