import Link from 'next/link'
import { weekRows, voidedRows } from '@/lib/admin-queries'
import { currentWeekThursday, addDaysYmd, weekdayOfYmd, formatYmdLong, localHm } from '@/lib/thursday'
import { coveredCents, excessCents, formatCents } from '@/lib/money'

function isValidThursdayYmd(date: string | undefined): date is string {
  return !!date && /^\d{4}-\d{2}-\d{2}$/.test(date) && weekdayOfYmd(date) === 4
}

const navLinkClass = 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50'
const activeNavLinkClass = 'text-zinc-950 dark:text-zinc-50'
const thClass = 'px-4 py-2 font-medium'
const tdClass = 'px-4 py-3'

function AmendedTag() {
  return (
    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 no-underline dark:bg-amber-900/40 dark:text-amber-300">
      amended
    </span>
  )
}

export default async function AdminClaimsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams
  const now = new Date()
  const defaultDate = currentWeekThursday(now)
  const current = isValidThursdayYmd(date) ? date : defaultDate

  const prev = addDaysYmd(current, -7)
  const next = addDaysYmd(current, 7)
  const canGoNext = next <= currentWeekThursday(now)

  const [rows, voided] = await Promise.all([weekRows(current), voidedRows(current)])

  const claimedRows = rows.filter((r) => r.claim !== null)
  const totalCovered = claimedRows.reduce((sum, r) => sum + coveredCents(r.claim!.billTotalCents, r.claim!.capCents), 0)
  const totalExcess = claimedRows.reduce((sum, r) => sum + excessCents(r.claim!.billTotalCents, r.claim!.capCents), 0)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">Claims</h1>
        <nav className="flex gap-3 text-sm font-medium">
          <span className={activeNavLinkClass}>Week</span>
          <Link href="/admin/month" className={navLinkClass}>Month</Link>
          <Link href="/admin/year" className={navLinkClass}>Year</Link>
        </nav>
      </div>

      <div className="mb-4 flex items-center gap-4 text-sm">
        <Link
          href={`/admin?date=${prev}`}
          className="font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          ◀
        </Link>
        <span className="font-medium text-zinc-950 dark:text-zinc-50">{formatYmdLong(current)}</span>
        {canGoNext ? (
          <Link
            href={`/admin?date=${next}`}
            className="font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
          >
            ▶
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              <th className={thClass}>Employee ID</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Claimed</th>
              <th className={thClass}>Time</th>
              <th className={thClass}>Bill</th>
              <th className={thClass}>Covered</th>
              <th className={thClass}>Excess</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ employee, claim }) => (
              <tr key={employee.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className={`${tdClass} font-mono text-zinc-950 dark:text-zinc-50`}>{employee.employeeId}</td>
                <td className={`${tdClass} text-zinc-950 dark:text-zinc-50`}>{employee.name}</td>
                <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>
                  {claim ? '✓' : '—'}
                  {claim?.amendedAt ? <AmendedTag /> : null}
                </td>
                <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>{claim ? localHm(claim.claimedAt) : '—'}</td>
                <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>{claim ? formatCents(claim.billTotalCents) : '—'}</td>
                <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>
                  {claim ? formatCents(coveredCents(claim.billTotalCents, claim.capCents)) : '—'}
                </td>
                <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>
                  {claim ? formatCents(excessCents(claim.billTotalCents, claim.capCents)) : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
                  No active employees.
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="border-t border-black/10 text-sm font-semibold text-zinc-950 dark:border-white/10 dark:text-zinc-50">
              <td className={tdClass} colSpan={3}>
                Claimed {claimedRows.length} / {rows.length}
              </td>
              <td className={tdClass} />
              <td className={tdClass} />
              <td className={tdClass}>{formatCents(totalCovered)}</td>
              <td className={tdClass}>{formatCents(totalExcess)}</td>
            </tr>
          </tfoot>
        </table>
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
