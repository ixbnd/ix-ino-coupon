import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin, clearSessionCookie } from '@/lib/auth/session'
import { Wordmark } from '@/components/wordmark'

async function logout() {
  'use server'
  await clearSessionCookie()
  redirect('/login')
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { employee } = await requireAdmin()

  return (
    <div className="flex flex-1 flex-col bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-4">
          {/* Phones get two tidy rows — identity/account, then the section tabs
              as a full-width bar. From sm up it collapses to a single line. */}
          <div className="flex items-center justify-between gap-4 py-3 sm:justify-start sm:gap-6">
            <Link href="/admin" className="shrink-0">
              <Wordmark size="sm" />
            </Link>

            <nav className="hidden gap-4 text-sm font-medium sm:flex">
              <Link href="/admin" className="text-fg-muted transition-colors hover:text-fg">
                Claims
              </Link>
              <Link href="/admin/employees" className="text-fg-muted transition-colors hover:text-fg">
                Employees
              </Link>
            </nav>

            <div className="flex items-center gap-3 text-sm sm:ml-auto sm:gap-4">
              <span className="hidden text-fg-subtle lg:inline">{employee.name}</span>
              <a
                href="/change-password"
                className="text-fg-muted transition-colors hover:text-fg"
                title="Change password"
              >
                <span className="sm:hidden">Password</span>
                <span className="hidden sm:inline">Change password</span>
              </a>
              <form action={logout}>
                <button type="submit" className="font-medium text-fg-muted transition-colors hover:text-fg">
                  Log out
                </button>
              </form>
            </div>
          </div>

          <nav className="-mx-4 flex border-t border-border text-sm font-medium sm:hidden">
            <Link
              href="/admin"
              className="flex flex-1 items-center justify-center py-3 text-fg-muted transition-colors hover:text-fg"
            >
              Claims
            </Link>
            <Link
              href="/admin/employees"
              className="flex flex-1 items-center justify-center border-l border-border py-3 text-fg-muted transition-colors hover:text-fg"
            >
              Employees
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-8">{children}</main>
    </div>
  )
}
