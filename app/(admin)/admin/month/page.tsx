import Link from 'next/link'
import { rangeSummary, claimCountsByDate } from '@/lib/admin-queries'
import { thursdaysInMonth, localYmd, lastDayOfMonthYmd } from '@/lib/thursday'
import { isValidMonth } from '@/lib/admin-validation'
import { requireAdmin } from '@/lib/auth/session'
import { ViewHeader, PeriodBar } from '../ViewChrome'
import { ExportBar } from '../ExportBar'
import { SummaryList } from '../SummaryList'
import { chipClass } from '../adminStyles'

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
  // Page segments render independently of the (admin) layout, so the layout's requireAdmin()
  // alone does not gate this route — see app/(admin)/admin/page.tsx for the same fix.
  await requireAdmin()
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
      <ViewHeader active="month" />

      <PeriodBar
        label={formatMonthLong(current)}
        prevHref={`/admin/month?month=${prev}`}
        nextHref={canGoNext ? `/admin/month?month=${next}` : null}
        prevLabel="Previous month"
        nextLabel="Next month"
      />

      {thursdays.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {thursdays.map((t) => (
            <Link key={t} href={`/admin?date=${t}`} className={chipClass}>
              {formatShortDay(t)}
              <span className="text-fg-subtle">{countByDate.get(t) ?? 0}</span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
        <SummaryList
          rows={summary}
          denominator={elapsed}
          totals={totals}
          countLabel={`Total ${totals.claims} claims`}
        />
      </div>

      <ExportBar href={`/api/export?scope=month&month=${current}`} periodLabel={formatMonthLong(current)} />
    </div>
  )
}
