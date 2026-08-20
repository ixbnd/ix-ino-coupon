import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin, clearSessionCookie } from '@/lib/auth/session'

async function logout() {
  'use server'
  await clearSessionCookie()
  redirect('/login')
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <nav className="flex gap-4">
            <Link
              href="/admin"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Claims
            </Link>
            <Link
              href="/admin/employees"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Employees
            </Link>
          </nav>
          <a href="/change-password" className="mr-4 text-sm text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
            Change password
          </a>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
