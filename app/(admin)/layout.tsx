import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin, clearSessionCookie } from '@/lib/auth/session'
import { Wordmark } from '@/components/wordmark'
import { NavLink } from '@/components/nav-link'
import { AccountControls } from '@/components/account-controls'

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

            <nav className="hidden gap-5 sm:flex">
              <NavLink href="/admin" match="exact">
                Claims
              </NavLink>
              <NavLink href="/admin/employees">Employees</NavLink>
            </nav>

            <div className="flex items-center gap-3 sm:ml-auto sm:gap-4">
              <span className="hidden text-sm text-fg-subtle lg:inline">{employee.name}</span>
              <AccountControls onLogout={logout} />
            </div>
          </div>

          <nav className="-mx-4 flex border-t border-border sm:hidden">
            <NavLink href="/admin" match="exact" variant="tab">
              Claims
            </NavLink>
            <span aria-hidden="true" className="w-px bg-border" />
            <NavLink href="/admin/employees" variant="tab">
              Employees
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-8">
        {children}
      </main>
    </div>
  )
}
