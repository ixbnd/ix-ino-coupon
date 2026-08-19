import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { requireDbSession } from '@/lib/auth/session'
import { resolveClaimState } from '@/lib/claim'
import { db } from '@/lib/db/client'
import { claims } from '@/lib/db/schema'
import { coveredCents, excessCents, formatCents } from '@/lib/money'
import { formatYmdLong, localHm } from '@/lib/thursday'
import { BillForm } from './BillForm'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        {children}
      </div>
    </div>
  )
}

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const auth = await requireDbSession()
  if (!auth) redirect('/login?next=/claim')

  const { t } = await searchParams
  const state = resolveClaimState(t, new Date())

  if (state.kind === 'bad_token') {
    return (
      <Card>
        <p className="text-zinc-950 dark:text-zinc-50">Invalid coupon code.</p>
      </Card>
    )
  }

  if (state.kind === 'not_thursday') {
    return (
      <Card>
        <p className="text-zinc-950 dark:text-zinc-50">
          Coupon valid on Thursdays only. Next: {formatYmdLong(state.nextThursday)}
        </p>
      </Card>
    )
  }

  const capCents = Number(process.env.CLAIM_CAP_CENTS ?? 1500)

  const existing = await db.query.claims.findFirst({
    where: and(eq(claims.employeePk, auth.employee.id), eq(claims.claimDate, state.claimDate), eq(claims.voided, false)),
  })

  if (existing) {
    const covered = coveredCents(existing.billTotalCents, existing.capCents)
    const excess = excessCents(existing.billTotalCents, existing.capCents)
    return (
      <Card>
        <p className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">✓ Claimed at {localHm(existing.claimedAt)}</p>
        <dl className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          <div className="flex justify-between">
            <dt>Bill total</dt>
            <dd>{formatCents(existing.billTotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Covered</dt>
            <dd>{formatCents(covered)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>You pay</dt>
            <dd>{formatCents(excess)}</dd>
          </div>
        </dl>
      </Card>
    )
  }

  return (
    <Card>
      <BillForm t={t ?? ''} capCents={capCents} />
    </Card>
  )
}
