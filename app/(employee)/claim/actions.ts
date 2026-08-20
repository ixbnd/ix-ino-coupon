'use server'
import { db } from '@/lib/db/client'
import { claims } from '@/lib/db/schema'
import { requireDbSession } from '@/lib/auth/session'
import { resolveClaimState } from '@/lib/claim'
import { parseBillToCents, capCents } from '@/lib/money'
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

  // The car wash field only counts when its checkbox is ticked — otherwise a value left behind
  // by unticking the box would still be charged.
  const wantsCarWash = formData.get('carWash') === 'on'
  const carWashCents = wantsCarWash ? parseBillToCents(String(formData.get('carWashAmount') ?? '')) : 0
  if (carWashCents === null || carWashCents < 0 || carWashCents > MAX_BILL_CENTS) {
    return { error: 'Enter a car wash amount between $0.01 and $500.00.' }
  }
  if (wantsCarWash && carWashCents === 0) return { error: 'Enter the car wash amount, or untick the box.' }

  const totalCents = cents + carWashCents
  if (totalCents > MAX_BILL_CENTS) return { error: 'Bill and car wash together cannot exceed $500.00.' }

  try {
    await db.insert(claims).values({
      employeePk: auth.employee.id, claimDate: state.claimDate,
      billTotalCents: totalCents, carWashCents, capCents: capCents(),
    })
  } catch (e: unknown) {
    const code = (e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code
    if (code !== '23505') throw e // duplicate → fall through to receipt
  }
  revalidatePath('/claim')
  redirect(`/claim?t=${encodeURIComponent(String(formData.get('t')))}`)
}
