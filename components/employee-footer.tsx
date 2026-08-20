import { redirect } from 'next/navigation'
import Link from 'next/link'
import { clearSessionCookie } from '@/lib/auth/session'
import { AccountControls } from './account-controls'

async function logout() {
  'use server'
  await clearSessionCookie()
  redirect('/login')
}

/**
 * The account strip under every employee screen: a link to the other employee
 * page, then Change password / Log out as real buttons. Staff share phones at
 * the counter, so logging out has to be reachable without hunting for it.
 */
export function EmployeeFooter({ link }: { link: { href: string; label: string } }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <Link
        href={link.href}
        className="font-medium text-primary text-sm underline decoration-brand-strong/50 underline-offset-4 hover:decoration-brand-strong"
      >
        {link.label}
      </Link>
      <AccountControls onLogout={logout} />
    </div>
  )
}
