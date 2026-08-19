'use server'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/client'
import { claims } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/auth/session'
import { parseBillToCents } from '@/lib/money'

const MAX_BILL_CENTS = 50_000

export async function amendClaim(claimId: number, _p: unknown, formData: FormData) {
  const { employee: admin } = await requireAdmin()
  const cents = parseBillToCents(String(formData.get('bill') ?? ''))
  if (cents === null || cents <= 0 || cents > MAX_BILL_CENTS) return { error: 'Enter a valid bill total.' }
  // Guard against a second tab / stale form POST / concurrent admin amending or voiding the same
  // claim: the voided=false check lives in the WHERE clause (atomic with the write, not a
  // check-then-update race) — same discipline as the claims table's unique index.
  const [row] = await db.update(claims).set({ billTotalCents: cents, amendedBy: admin.id, amendedAt: new Date() })
    .where(and(eq(claims.id, claimId), eq(claims.voided, false)))
    .returning()
  if (!row) return { error: 'Claim not found or already voided.' }
  revalidatePath('/admin')
  return {}
}

export async function voidClaim(claimId: number) {
  const { employee: admin } = await requireAdmin()
  const [row] = await db.update(claims).set({ voided: true, voidedBy: admin.id, voidedAt: new Date() })
    .where(and(eq(claims.id, claimId), eq(claims.voided, false)))
    .returning()
  if (!row) return { error: 'Claim already voided.' }
  revalidatePath('/admin')
  return {}
}
