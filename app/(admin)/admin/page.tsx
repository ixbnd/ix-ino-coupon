import { weekRows, voidedRows } from '@/lib/admin-queries'
import { currentWeekThursday, addDaysYmd, formatYmdLong, localHm } from '@/lib/thursday'
import { coveredCents, excessCents, formatCents } from '@/lib/money'
import { isValidThursdayYmd } from '@/lib/admin-validation'
import { requireAdmin } from '@/lib/auth/session'
import { ViewHeader, PeriodBar } from './ViewChrome'
import { AmendedTag } from './AmendedTag'
import { ClaimsTable } from './ClaimsTable'
import { thClass, tdClass } from './adminStyles'

export default async function AdminClaimsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  // Next renders page segments independently of layouts, so the layout's requireAdmin() alone
  // does not gate this page — an employee can hit this route directly and get a fully rendered
  // RSC payload underneath the 404 shell. Gate the page itself too.
  await requireAdmin()
  const { date } = await searchParams
  const now = new Date()
  const defaultDate = currentWeekThursday(now)
  const current = isValidThursdayYmd(date) ? date : defaultDate

  const prev = addDaysYmd(current, -7)
  const next = addDaysYmd(current, 7)
  const canGoNext = next <= currentWeekThursday(now)

  const [weekRowsResult, voided] = await Promise.all([weekRows(current), voidedRows(current)])

  // ClaimsTable/ClaimDrawer are client components, so precompute display strings server-side
  // (where APP_TIMEZONE is actually set) rather than passing Dates for client-side formatting.
  const rows = weekRowsResult.map(({ employee, claim }) => ({
    employee,
    claim: claim
      ? {
          id: claim.id,
          billTotalCents: claim.billTotalCents,
          capCents: claim.capCents,
          timeHm: localHm(claim.claimedAt),
          thursdayLabel: formatYmdLong(claim.claimDate),
          amended: claim.amendedAt !== null,
          amendedLabel: claim.amendedAt ? `${localHm(claim.amendedAt)} by admin #${claim.amendedBy}` : null,
        }
      : null,
  }))

  return (
    <div>
      <ViewHeader active="week" />

      <PeriodBar
        label={formatYmdLong(current)}
        prevHref={`/admin?date=${prev}`}
        nextHref={canGoNext ? `/admin?date=${next}` : null}
        exportHref={`/api/export?scope=week&date=${current}`}
        prevLabel="Previous Thursday"
        nextLabel="Next Thursday"
      />

      <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
        <ClaimsTable rows={rows} />
      </div>

      {voided.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-fg">Voided</h2>
          <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  <th className={thClass}>Employee ID</th>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Time</th>
                  <th className={thClass}>Bill</th>
                  <th className={thClass}>Covered</th>
                  <th className={thClass}>Excess</th>
                </tr>
              </thead>
              <tbody>
                {voided.map(({ employee, claim }) => (
                  <tr key={claim.id} className="border-b border-border/70 last:border-0">
                    <td className={`${tdClass} font-mono text-fg-subtle line-through`}>{employee.employeeId}</td>
                    <td className={`${tdClass} text-fg-subtle line-through`}>
                      {employee.name}
                      {claim.amendedAt ? <AmendedTag /> : null}
                    </td>
                    <td className={`${tdClass} text-fg-subtle line-through`}>{localHm(claim.claimedAt)}</td>
                    <td className={`${tdClass} text-fg-subtle line-through`}>{formatCents(claim.billTotalCents)}</td>
                    <td className={`${tdClass} text-fg-subtle line-through`}>
                      {formatCents(coveredCents(claim.billTotalCents, claim.capCents))}
                    </td>
                    <td className={`${tdClass} text-fg-subtle line-through`}>
                      {formatCents(excessCents(claim.billTotalCents, claim.capCents))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
