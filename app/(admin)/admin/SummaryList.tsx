import { formatCents } from '@/lib/money'

export type SummaryRow = {
  employee: { id: number; employeeId: string; name: string }
  claimCount: number
  billCents: number
  coveredCents: number
  excessCents: number
}

/**
 * The month / year per-employee summary, rendered as cards on phones and as a
 * table from `sm` up. Six columns do not fit a 390px screen — the money ends up
 * off the right edge, which is the part that matters.
 *
 * `denominator` is the number of Thursdays elapsed in the period (month view);
 * pass null to show a bare count (year view).
 */
export function SummaryList({
  rows,
  denominator,
  totals,
  countLabel,
}: {
  rows: SummaryRow[]
  denominator: number | null
  totals: { claims: number; bill: number; covered: number; excess: number }
  countLabel: string
}) {
  const count = (n: number) => (denominator === null ? `${n}` : `${n} / ${denominator}`)

  return (
    <>
      {/* ---- phones ---- */}
      <ul className="divide-y divide-border sm:hidden">
        {rows.map((r) => (
          <li key={r.employee.id} className="px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{r.employee.name}</p>
                <p className="mt-0.5 font-mono text-xs text-fg-muted">{r.employee.employeeId}</p>
              </div>
              <p className="tnum shrink-0 text-sm text-fg-muted">
                {count(r.claimCount)} {r.claimCount === 1 ? 'coupon' : 'coupons'}
              </p>
            </div>

            {r.claimCount > 0 ? (
              <dl className="mt-2.5 grid grid-cols-3 gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs">
                <div>
                  <dt className="text-fg-muted">Bill</dt>
                  <dd className="tnum mt-0.5 font-medium text-fg">{formatCents(r.billCents)}</dd>
                </div>
                <div>
                  <dt className="text-fg-muted">Covered</dt>
                  <dd className="tnum mt-0.5 font-medium text-fg">{formatCents(r.coveredCents)}</dd>
                </div>
                <div>
                  <dt className="text-fg-muted">Excess</dt>
                  <dd className="tnum mt-0.5 font-medium text-fg">
                    {r.excessCents > 0 ? formatCents(r.excessCents) : <span className="text-fg-subtle">—</span>}
                  </dd>
                </div>
              </dl>
            ) : null}
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-fg-muted">No active employees.</li>
        ) : null}
      </ul>

      {rows.length > 0 ? (
        <dl className="grid grid-cols-3 gap-2 border-t-2 border-border-strong bg-surface-muted px-4 py-3 text-sm sm:hidden">
          <div>
            <dt className="text-fg-muted">Bill</dt>
            <dd className="tnum mt-0.5 font-semibold text-fg">{formatCents(totals.bill)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Covered</dt>
            <dd className="tnum mt-0.5 font-semibold text-fg">{formatCents(totals.covered)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Excess</dt>
            <dd className="tnum mt-0.5 font-semibold text-fg">{formatCents(totals.excess)}</dd>
          </div>
        </dl>
      ) : null}

      {/* ---- sm and up ---- */}
      <table className="hidden w-full text-left text-sm sm:table">
        <thead>
          <tr className="border-b border-border text-xs font-semibold tracking-wide text-fg-muted uppercase">
            <th className="sticky top-0 z-10 bg-surface-muted px-4 py-2.5">Employee ID</th>
            <th className="sticky top-0 z-10 bg-surface-muted px-4 py-2.5">Name</th>
            <th className="sticky top-0 z-10 bg-surface-muted px-4 py-2.5">Coupons claimed</th>
            <th className="sticky top-0 z-10 bg-surface-muted px-4 py-2.5">Total Bill</th>
            <th className="sticky top-0 z-10 bg-surface-muted px-4 py-2.5">Total Covered</th>
            <th className="sticky top-0 z-10 bg-surface-muted px-4 py-2.5">Total Excess</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.employee.id} className="border-b border-border/70 last:border-0">
              <td className="px-4 py-3 font-mono text-fg">{r.employee.employeeId}</td>
              <td className="px-4 py-3 text-fg">{r.employee.name}</td>
              <td className="tnum px-4 py-3 text-fg">{count(r.claimCount)}</td>
              <td className="tnum px-4 py-3 text-fg">{formatCents(r.billCents)}</td>
              <td className="tnum px-4 py-3 text-fg">{formatCents(r.coveredCents)}</td>
              <td className="tnum px-4 py-3 text-fg">
                {r.excessCents > 0 ? formatCents(r.excessCents) : <span className="text-fg-subtle">—</span>}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-fg-muted">
                No active employees.
              </td>
            </tr>
          ) : null}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border-strong bg-surface-muted text-sm font-semibold text-fg">
            <td className="px-4 py-3" colSpan={3}>
              {countLabel}
            </td>
            <td className="tnum px-4 py-3">{formatCents(totals.bill)}</td>
            <td className="tnum px-4 py-3">{formatCents(totals.covered)}</td>
            <td className="tnum px-4 py-3">{formatCents(totals.excess)}</td>
          </tr>
        </tfoot>
      </table>
    </>
  )
}
