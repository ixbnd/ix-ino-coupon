'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConfirmDialog } from './confirm-dialog'

/**
 * Change password + Log out, shown as a pair of real buttons rather than bare
 * text links. Logging out is confirmed — an accidental tap on a phone costs a
 * re-login, and on this app that means digging out a password you use weekly.
 *
 * The change-password link carries the current path so that screen can offer a
 * back button to wherever you came from.
 */
export function AccountControls({ onLogout }: { onLogout: () => Promise<void> }) {
  const pathname = usePathname()
  const back = pathname && pathname !== '/change-password' ? `?from=${encodeURIComponent(pathname)}` : ''

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href={`/change-password${back}`}
        className="flex min-h-9 items-center rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-fg transition-colors hover:bg-surface-muted"
      >
        <span className="sm:hidden">Password</span>
        <span className="hidden sm:inline">Change password</span>
      </Link>

      <ConfirmDialog
        title="Log out?"
        body="You'll need your Employee ID and password to get back in."
        confirmLabel="Log out"
        tone="danger"
        onConfirm={() => {
          void onLogout()
        }}
        trigger={(open) => (
          <button
            type="button"
            onClick={open}
            className="flex min-h-9 items-center rounded-lg border border-danger/40 bg-danger-subtle px-3 text-sm font-semibold text-danger transition-colors hover:border-danger"
          >
            Log out
          </button>
        )}
      />
    </div>
  )
}
