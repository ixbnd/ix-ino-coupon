import Link from 'next/link'
import { rangeSummary, claimCountsByDate } from '@/lib/admin-queries'
import { thursdaysInMonth, localYmd, lastDayOfMonthYmd } from '@/lib/thursday'
import { formatCents } from '@/lib/money'
import { isValidMonth } from '@/lib/admin-validation'
import { ScopeNav } from '../ScopeNav'
import { stepLinkClass, thClass, tdClass, chipClass } from '../adminStyles'

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
function formatMonthLong(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y, m - 1, 1)))
}
function formatShortDay(ymd: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${ymd}T00:00:00Z`))
}

export default async function AdminMonthPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams
  const now = new Date()
  const currentMonth = localYmd(now).slice(0, 7)
  const current = isValidMonth(month) ? month : currentMonth

  const [year, m] = current.split('-').map(Number)
  const firstDay = `${current}-01`
  const lastDay = lastDayOfMonthYmd(year, m)

  const prev = shiftMonth(current, -1)
  const next = shiftMonth(current, 1)
  const canGoNext = next <= currentMonth

  const today = localYmd(now)
  const thursdays = thursdaysInMonth(year, m)
  const elapsed = thursdays.filter((t) => t <= today).length

  const [summary, dateCounts] = await Promise.all([rangeSummary(firstDay, lastDay), claimCountsByDate(firstDay, lastDay)])
  const countByDate = new Map(dateCounts.map((d) => [d.claimDate, d.count]))

  const totals = summary.reduce(
    (acc, r) => ({
      claims: acc.claims + r.claimCount,
      bill: acc.bill + r.billCents,
      covered: acc.covered + r.coveredCents,
      excess: acc.excess + r.excessCents,
    }),
    { claims: 0, bill: 0, covered: 0, excess: 0 },
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">Claims</h1>
        <ScopeNav active="month" />
      </div>

      <div className="mb-4 flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-4">
          <Link href={`/admin/month?month=${prev}`} className={stepLinkClass}>
            ◀
          </Link>
          <span className="font-medium text-zinc-950 dark:text-zinc-50">{formatMonthLong(current)}</span>
          {canGoNext ? (
            <Link href={`/admin/month?month=${next}`} className={stepLinkClass}>
              ▶
            </Link>
          ) : null}
        </div>
        <a href={`/api/export?scope=month&month=${current}`} className={stepLinkClass}>
          Export .xlsx
        </a>
      </div>

      {thursdays.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {thursdays.map((t) => (
            <Link key={t} href={`/admin?date=${t}`} className={chipClass}>
              {formatShortDay(t)}
              <span className="text-zinc-400 dark:text-zinc-500">{countByDate.get(t) ?? 0}</span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              <th className={thClass}>Employee ID</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Thursdays claimed</th>
              <th className={thClass}>Bill</th>
              <th className={thClass}>Covered</th>
              <th className={thClass}>Excess</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((r) => (
              <tr key={r.employee.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className={`${tdClass} font-mono text-zinc-950 dark:text-zinc-50`}>{r.employee.employeeId}</td>
                <td className={`${tdClass} text-zinc-950 dark:text-zinc-50`}>{r.employee.name}</td>
                <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>
                  {r.claimCount} / {elapsed}
                </td>
                <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>{formatCents(r.billCents)}</td>
                <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>{formatCents(r.coveredCents)}</td>
                <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>{formatCents(r.excessCents)}</td>
              </tr>
            ))}
            {summary.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
                  No active employees.
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="border-t border-black/10 text-sm font-semibold text-zinc-950 dark:border-white/10 dark:text-zinc-50">
              <td className={tdClass} colSpan={3}>
                Total {totals.claims} claims
              </td>
              <td className={tdClass}>{formatCents(totals.bill)}</td>
              <td className={tdClass}>{formatCents(totals.covered)}</td>
              <td className={tdClass}>{formatCents(totals.excess)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
