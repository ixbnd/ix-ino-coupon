import Link from 'next/link'

/**
 * Shared chrome for the week / month / year claim views.
 *
 * Mobile-first: on phones the scope switcher is a full-width segmented control
 * and the period stepper gets thumb-sized targets with the export as its own
 * full-width button. From `sm` up everything collapses onto one line.
 */

const SCOPES = [
  { key: 'week', label: 'Week', href: '/admin' },
  { key: 'month', label: 'Month', href: '/admin/month' },
  { key: 'year', label: 'Year', href: '/admin/year' },
] as const

export function ViewHeader({ active }: { active: 'week' | 'month' | 'year' }) {
  return (
    <div className="mb-4 sm:mb-6 sm:flex sm:items-center sm:justify-between">
      <h1 className="mb-3 text-xl font-semibold tracking-tight text-fg sm:mb-0">Claims</h1>

      <nav
        aria-label="Reporting period"
        className="grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1 text-sm font-medium sm:flex sm:gap-1 sm:bg-transparent sm:p-0"
      >
        {SCOPES.map((s) =>
          s.key === active ? (
            <span
              key={s.key}
              aria-current="page"
              className="flex min-h-9 items-center justify-center rounded-md bg-surface px-3 text-fg shadow-card sm:min-h-0 sm:bg-transparent sm:px-2 sm:shadow-none"
            >
              {s.label}
            </span>
          ) : (
            <Link
              key={s.key}
              href={s.href}
              className="flex min-h-9 items-center justify-center rounded-md px-3 text-fg-muted transition-colors hover:text-fg sm:min-h-0 sm:px-2"
            >
              {s.label}
            </Link>
          ),
        )}
      </nav>
    </div>
  )
}

const STEP =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface text-fg transition-colors hover:bg-surface-muted sm:h-9 sm:w-9'

export function PeriodBar({
  label,
  prevHref,
  nextHref,
  exportHref,
  prevLabel,
  nextLabel,
}: {
  label: string
  prevHref: string
  nextHref: string | null
  exportHref: string
  prevLabel: string
  nextLabel: string
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Link href={prevHref} aria-label={prevLabel} className={STEP}>
          ◀
        </Link>
        <span className="flex-1 text-center text-sm font-medium text-fg sm:flex-none sm:text-left">{label}</span>
        {nextHref ? (
          <Link href={nextHref} aria-label={nextLabel} className={STEP}>
            ▶
          </Link>
        ) : (
          /* Keep the slot so the label doesn't shift when the future step is hidden. */
          <span aria-hidden="true" className={`${STEP} pointer-events-none opacity-0`} />
        )}
      </div>

      <a
        href={exportHref}
        className="flex min-h-11 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-muted sm:min-h-9"
      >
        Export .xlsx
      </a>
    </div>
  )
}
