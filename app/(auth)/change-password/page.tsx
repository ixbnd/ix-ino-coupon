import { ChangePasswordForm } from './change-password-form'
import { CenteredPage } from '@/components/ui'
import { requireDbSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

/** Only same-site paths may become a back link. */
function safeBack(from: string | undefined, fallback: string): string {
  if (!from) return fallback
  if (!from.startsWith('/') || from.startsWith('//') || from.includes('\\')) return fallback
  return from
}

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const [{ from }, auth] = await Promise.all([searchParams, requireDbSession()])
  if (!auth) redirect('/login?next=%2Fchange-password')

  // Someone still on a temporary password has nowhere to go back to — the whole
  // app is behind this screen until they set one.
  const forced = auth.employee.mustChangePassword
  const back = forced ? null : safeBack(from, auth.employee.role === 'admin' ? '/admin' : '/scan')

  return (
    <CenteredPage>
      <ChangePasswordForm back={back} forced={forced} />
    </CenteredPage>
  )
}
