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
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/admin" className="shrink-0">
            <Wordmark size="sm" />
          </Link>

          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/admin" className="text-fg-muted transition-colors hover:text-fg">
              Claims
            </Link>
            <Link href="/admin/employees" className="text-fg-muted transition-colors hover:text-fg">
              Employees
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="hidden text-fg-subtle sm:inline">{employee.name}</span>
            <a href="/change-password" className="text-fg-muted transition-colors hover:text-fg">
              Change password
            </a>
            <form action={logout}>
              <button type="submit" className="font-medium text-fg-muted transition-colors hover:text-fg">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
