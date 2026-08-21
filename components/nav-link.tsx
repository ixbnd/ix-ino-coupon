'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * A section link that knows whether its section is the one being shown.
 *
 * `match: 'exact'` for a section whose path is a prefix of its siblings
 * (/admin would otherwise light up while you are on /admin/employees).
 */
export function NavLink({
  href,
  children,
  match = 'prefix',
  variant = 'inline',
}: {
  href: string
  children: React.ReactNode
  match?: 'exact' | 'prefix'
  variant?: 'inline' | 'tab'
}) {
  const pathname = usePathname()
  const active = match === 'exact' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  if (variant === 'tab') {
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`relative flex flex-1 items-center justify-center py-3 text-sm transition-colors ${
          active
            ? 'bg-brand-subtle font-semibold text-fg after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-brand-strong'
            : 'font-medium text-fg-muted hover:text-fg'
        }`}
      >
        {children}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative py-1 text-sm transition-colors ${
        active
          ? 'font-semibold text-fg after:absolute after:inset-x-0 after:-bottom-1 after:h-[3px] after:rounded-full after:bg-brand-strong'
          : 'font-medium text-fg-muted hover:text-fg'
      }`}
    >
      {children}
    </Link>
  )
}
