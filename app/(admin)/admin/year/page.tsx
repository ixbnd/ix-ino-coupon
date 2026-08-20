import Link from 'next/link'
import { rangeSummary, claimCountsByDate } from '@/lib/admin-queries'
import { thursdaysInMonth, localYmd } from '@/lib/thursday'
import { isValidYear } from '@/lib/admin-validation'
import { requireAdmin } from '@/lib/auth/session'
import { ViewHeader, PeriodBar } from '../ViewChrome'
import { SummaryList } from '../SummaryList'
import { chipClass } from '../adminStyles'

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
      <ViewHeader active="year" />

      <PeriodBar
        label={String(current)}
        prevHref={`/admin/year?year=${prev}`}
        nextHref={canGoNext ? `/admin/year?year=${next}` : null}
        exportHref={`/api/export?scope=year&year=${current}`}
        prevLabel="Previous year"
        nextLabel="Next year"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {MONTH_NAMES.map((label, i) => (
          <Link key={label} href={`/admin/month?month=${current}-${String(i + 1).padStart(2, '0')}`} className={chipClass}>
            {label}
            <span className="text-fg-subtle">{countsByMonth[i]}</span>
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
        <SummaryList
          rows={summary}
          denominator={elapsed}
          totals={totals}
          countLabel={`Total ${totals.claims} claims`}
        />
      </div>
    </div>
  )
}
