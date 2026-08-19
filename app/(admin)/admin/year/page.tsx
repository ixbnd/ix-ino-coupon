import Link from 'next/link'
import { rangeSummary, claimCountsByDate } from '@/lib/admin-queries'
import { thursdaysInMonth, localYmd } from '@/lib/thursday'
import { formatCents } from '@/lib/money'
import { isValidYear } from '@/lib/admin-validation'
import { requireAdmin } from '@/lib/auth/session'
import { ScopeNav } from '../ScopeNav'
import { stepLinkClass, thClass, tdClass, chipClass } from '../adminStyles'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default async function AdminYearPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  // Page segments render independently of the (admin) layout, so the layout's requireAdmin()
  // alone does not gate this route — see app/(admin)/admin/page.tsx for the same fix.
  await requireAdmin()
  const { year } = await searchParams
  const now = new Date()
  const currentYear = localYmd(now).slice(0, 4)
  const current = isValidYear(year) ? year : currentYear
  const y = Number(current)

  const prev = String(y - 1)
  const next = String(y + 1)
  const canGoNext = next <= currentYear

  const firstDay = `${current}-01-01`
  const lastDay = `${current}-12-31`

  const today = localYmd(now)
  const allThursdays = Array.from({ length: 12 }, (_, i) => thursdaysInMonth(y, i + 1)).flat()
  const elapsed = allThursdays.filter((t) => t <= today).length

  const [summary, dateCounts] = await Promise.all([rangeSummary(firstDay, lastDay), claimCountsByDate(firstDay, lastDay)])

  const countsByMonth = new Array(12).fill(0)
  for (const { claimDate, count } of dateCounts) {
    const idx = Number(claimDate.slice(5, 7)) - 1
    countsByMonth[idx] += count
  }

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
        <ScopeNav active="year" />
      </div>

      <div className="mb-4 flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-4">
          <Link href={`/admin/year?year=${prev}`} className={stepLinkClass}>
            ◀
          </Link>
          <span className="font-medium text-zinc-950 dark:text-zinc-50">{current}</span>
          {canGoNext ? (
            <Link href={`/admin/year?year=${next}`} className={stepLinkClass}>
              ▶
            </Link>
          ) : null}
        </div>
        <a href={`/api/export?scope=year&year=${current}`} className={stepLinkClass}>
          Export .xlsx
        </a>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {MONTH_NAMES.map((label, i) => (
          <Link key={label} href={`/admin/month?month=${current}-${String(i + 1).padStart(2, '0')}`} className={chipClass}>
            {label}
            <span className="text-zinc-400 dark:text-zinc-500">{countsByMonth[i]}</span>
          </Link>
        ))}
      </div>

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
