import Link from 'next/link'
import { weekRows, voidedRows } from '@/lib/admin-queries'
import { currentWeekThursday, addDaysYmd, formatYmdLong, localHm } from '@/lib/thursday'
import { coveredCents, excessCents, formatCents } from '@/lib/money'
import { isValidThursdayYmd } from '@/lib/admin-validation'
import { requireAdmin } from '@/lib/auth/session'
import { ScopeNav } from './ScopeNav'
import { AmendedTag } from './AmendedTag'
import { ClaimsTable } from './ClaimsTable'
import { stepLinkClass, thClass, tdClass } from './adminStyles'

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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">Claims</h1>
        <ScopeNav active="week" />
      </div>

      <div className="mb-4 flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-4">
          <Link href={`/admin?date=${prev}`} className={stepLinkClass}>
            ◀
          </Link>
          <span className="font-medium text-zinc-950 dark:text-zinc-50">{formatYmdLong(current)}</span>
          {canGoNext ? (
            <Link href={`/admin?date=${next}`} className={stepLinkClass}>
              ▶
            </Link>
          ) : null}
        </div>
        <a href={`/api/export?scope=week&date=${current}`} className={stepLinkClass}>
          Export .xlsx
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900">
        <ClaimsTable rows={rows} />
      </div>

      {voided.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Voided</h2>
          <div className="overflow-x-auto rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
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
                  <tr key={claim.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                    <td className={`${tdClass} font-mono text-zinc-500 line-through dark:text-zinc-400`}>{employee.employeeId}</td>
                    <td className={`${tdClass} text-zinc-500 line-through dark:text-zinc-400`}>
                      {employee.name}
                      {claim.amendedAt ? <AmendedTag /> : null}
                    </td>
                    <td className={`${tdClass} text-zinc-500 line-through dark:text-zinc-400`}>{localHm(claim.claimedAt)}</td>
                    <td className={`${tdClass} text-zinc-500 line-through dark:text-zinc-400`}>{formatCents(claim.billTotalCents)}</td>
                    <td className={`${tdClass} text-zinc-500 line-through dark:text-zinc-400`}>
                      {formatCents(coveredCents(claim.billTotalCents, claim.capCents))}
                    </td>
                    <td className={`${tdClass} text-zinc-500 line-through dark:text-zinc-400`}>
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
