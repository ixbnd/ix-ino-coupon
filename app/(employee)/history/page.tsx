import { redirect } from 'next/navigation'
import { requireDbSession } from '@/lib/auth/session'
import { ownClaimHistory } from '@/lib/admin-queries'
import { coveredCents, excessCents, formatCents } from '@/lib/money'
import { formatYmdLong, localHm } from '@/lib/thursday'
import { Card, CenteredPage, EmptyState, TextLink } from '@/components/ui'
import { Wordmark } from '@/components/wordmark'

export default async function HistoryPage() {
  const auth = await requireDbSession()
  if (!auth) redirect('/login?next=%2Fhistory')

  // Session pk only — never a request parameter.
  const rows = await ownClaimHistory(auth.employee.id)

  const totalCovered = rows.reduce((n, r) => n + coveredCents(r.billTotalCents, r.capCents), 0)
  const totalExcess = rows.reduce((n, r) => n + excessCents(r.billTotalCents, r.capCents), 0)

  return (
    <CenteredPage>
      <div className="mb-6 flex justify-center">
        <Wordmark size="sm" />
      </div>

      <Card className="p-0 sm:p-0">
        <div className="border-b border-border px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight text-fg">My claim history</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {auth.employee.name} · {auth.employee.employeeId}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No claims yet">
              Scan the poster at the counter on a Thursday and your claims will show up here.
            </EmptyState>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const covered = coveredCents(r.billTotalCents, r.capCents)
                const excess = excessCents(r.billTotalCents, r.capCents)
                return (
                  <li key={r.id} className="flex items-baseline justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-fg">{formatYmdLong(r.claimDate)}</p>
                      <p className="mt-0.5 text-sm text-fg-muted">
                        <span className="tnum">{localHm(r.claimedAt)}</span> · bill{' '}
                        <span className="tnum">{formatCents(r.billTotalCents)}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum font-semibold text-fg">{formatCents(covered)}</p>
                      <p className="mt-0.5 text-sm text-fg-muted">
                        {excess > 0 ? <>you paid <span className="tnum">{formatCents(excess)}</span></> : 'fully covered'}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <dl className="flex justify-between gap-4 border-t border-border bg-surface-muted px-6 py-4 text-sm">
              <div>
                <dt className="text-fg-muted">Covered for you</dt>
                <dd className="tnum mt-0.5 text-base font-semibold text-fg">{formatCents(totalCovered)}</dd>
              </div>
              <div className="text-right">
                <dt className="text-fg-muted">You paid</dt>
                <dd className="tnum mt-0.5 text-base font-semibold text-fg">{formatCents(totalExcess)}</dd>
              </div>
            </dl>
          </>
        )}
      </Card>

      <p className="mt-6 text-center text-sm">
        <TextLink href="/scan">Back to scanner</TextLink>
      </p>
    </CenteredPage>
  )
}
