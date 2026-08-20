import { redirect } from 'next/navigation'
import Link from 'next/link'
import { clearSessionCookie } from '@/lib/auth/session'
import { AccountControls } from './account-controls'
import { Wordmark } from './wordmark'

async function logout() {
  'use server'
  await clearSessionCookie()
  redirect('/login')
}

/**
 * Top bar for every employee screen: wordmark on the left, Change password and
 * Log out on the right — the same position they sit in on the admin side, so
 * account actions live in one place across the app rather than moving to the
 * bottom of the page depending which role you signed in as.
 */
export function EmployeeHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-sm items-center justify-between gap-3 px-4 py-3">
        <Wordmark size="sm" />
        <AccountControls onLogout={logout} />
      </div>
    </header>
  )
}

/** The contextual link under the card — the other employee page. */
export function EmployeeFooterLink({ href, label }: { href: string; label: string }) {
  return (
    <p className="mt-6 text-center">
      <Link
        href={href}
        className="text-sm font-medium text-primary underline decoration-brand-strong/50 underline-offset-4 hover:decoration-brand-strong"
      >
        {label}
      </Link>
    </p>
  )
}
