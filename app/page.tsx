import { redirect } from 'next/navigation'
import { requireDbSession } from '@/lib/auth/session'

// The bare "/" route must never render content of its own — it only exists to bounce to the
// right place for whoever's logged in (or to /login if no one is). Reachable directly and via
// login's next=/ fallback (see app/(auth)/login/actions.ts).
export default async function RootPage() {
  const auth = await requireDbSession()
  if (!auth) redirect('/login')
  redirect(auth.employee.role === 'admin' ? '/admin' : '/scan')
}
