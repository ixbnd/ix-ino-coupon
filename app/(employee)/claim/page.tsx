import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { requireDbSession } from '@/lib/auth/session'
import { resolveClaimState } from '@/lib/claim'
import { db } from '@/lib/db/client'
import { claims } from '@/lib/db/schema'
import { coveredCents, excessCents, formatCents, capCents } from '@/lib/money'
import { formatYmdLong, localHm } from '@/lib/thursday'
import { BillForm } from './BillForm'
import { Card, CenteredPage, TextLink } from '@/components/ui'
import { Wordmark } from '@/components/wordmark'

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <CenteredPage>
      <div className="mb-6 flex justify-center">
        <Wordmark size="sm" />
      </div>
      <Card>{children}</Card>
      <p className="mt-6 text-center text-sm">
        <TextLink href="/history">My claim history</TextLink>
      </p>
    </CenteredPage>
  )
}

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams
  const auth = await requireDbSession()
  if (!auth) redirect(`/login?next=${encodeURIComponent(`/claim${t ? `?t=${t}` : ''}`)}`)

  const state = resolveClaimState(t, new Date())

  if (state.kind === 'bad_token') {
    return (
      <Screen>
        <div className="text-center">
          <p className="text-lg font-semibold text-fg">Invalid coupon code</p>
          <p className="mt-2 text-sm text-fg-muted">
            Scan the poster at the counter to claim. If you just scanned it, ask an admin to check the code.
          </p>
        </div>
      </Screen>
    )
  }

  if (state.kind === 'not_thursday') {
    return (
      <Screen>
        <div className="text-center">
          <p className="text-sm font-medium tracking-wide text-fg-muted uppercase">Not today</p>
          <p className="mt-3 text-lg font-semibold text-fg">Coupons are Thursdays only</p>
          <p className="mt-4 rounded-lg bg-surface-sunken px-4 py-3 text-sm text-fg">
            Next one: <span className="font-semibold">{formatYmdLong(state.nextThursday)}</span>
          </p>
        </div>
      </Screen>
    )
  }

  const cap = capCents()

  const existing = await db.query.claims.findFirst({
    where: and(eq(claims.employeePk, auth.employee.id), eq(claims.claimDate, state.claimDate), eq(claims.voided, false)),
  })

  if (existing) {
    const covered = coveredCents(existing.billTotalCents, existing.capCents)
    const excess = excessCents(existing.billTotalCents, existing.capCents)
    return (
      <Screen>
        <div className="mb-5 flex items-center gap-3 border-b border-border pb-5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 13 4 4L19 7" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-fg">Claimed</p>
            <p className="text-sm text-fg-muted">
              {formatYmdLong(existing.claimDate)} at {localHm(existing.claimedAt)}
            </p>
          </div>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between">
            <dt className="text-fg-muted">Bill total</dt>
            <dd className="tnum text-fg">{formatCents(existing.billTotalCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-fg-muted">Covered</dt>
            <dd className="tnum text-fg">{formatCents(covered)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <dt className="font-medium text-fg">You paid</dt>
            <dd className="tnum font-semibold text-fg">{formatCents(excess)}</dd>
          </div>
        </dl>
      </Screen>
    )
  }

  return (
    <Screen>
      <BillForm t={t ?? ''} capCents={cap} />
    </Screen>
  )
}
