import Link from 'next/link'
import { navLinkClass, activeNavLinkClass } from './adminStyles'

const SCOPES = [
  { key: 'week', label: 'Week', href: '/admin' },
  { key: 'month', label: 'Month', href: '/admin/month' },
  { key: 'year', label: 'Year', href: '/admin/year' },
] as const

export function ScopeNav({ active }: { active: 'week' | 'month' | 'year' }) {
  return (
    <nav className="flex gap-3 text-sm font-medium">
      {SCOPES.map((s) =>
        s.key === active ? (
          <span key={s.key} className={activeNavLinkClass}>
            {s.label}
          </span>
        ) : (
          <Link key={s.key} href={s.href} className={navLinkClass}>
            {s.label}
          </Link>
        ),
      )}
    </nav>
  )
}
