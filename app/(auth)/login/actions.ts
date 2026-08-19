'use server'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees } from '@/lib/db/schema'
import { verifyPassword, EMPLOYEE_ID_RE } from '@/lib/auth/password'
import { setSessionCookie } from '@/lib/auth/session'
import { checkRateLimit } from '@/lib/auth/rate-limit'

const GENERIC = 'Invalid ID or password'

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const employeeId = String(formData.get('employeeId') ?? '').trim().toUpperCase()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '')
  if (!EMPLOYEE_ID_RE.test(employeeId)) return { error: GENERIC }
  if (!checkRateLimit(employeeId)) return { error: 'Too many attempts. Try again in 15 minutes.' }
  const emp = await db.query.employees.findFirst({ where: eq(employees.employeeId, employeeId) })
  if (!emp || !emp.active || !(await verifyPassword(emp.passwordHash, password))) return { error: GENERIC }
  await setSessionCookie({ pk: emp.id, role: emp.role, tv: emp.tokenVersion, mcp: emp.mustChangePassword })
  if (emp.mustChangePassword) redirect('/change-password')
  // next='/' means "no real destination was requested" (e.g. login reached via the bare root
  // path) — fall through to the role default instead of bouncing back through "/" itself.
  const hasDestination = next.startsWith('/') && !next.startsWith('//') && next !== '/'
  redirect(hasDestination ? next : emp.role === 'admin' ? '/admin' : '/scan')
}
