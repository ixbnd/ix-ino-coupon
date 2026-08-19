export * from './token'
export type { SessionPayload } from './token'

import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees } from '@/lib/db/schema'
import { SESSION_COOKIE, signSessionToken, verifySessionToken, type SessionPayload } from './token'

export async function setSessionCookie(p: SessionPayload) {
  ;(await cookies()).set(SESSION_COOKIE, await signSessionToken(p), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
  })
}
export async function clearSessionCookie() { (await cookies()).delete(SESSION_COOKIE) }
export async function getSession(): Promise<SessionPayload | null> {
  const t = (await cookies()).get(SESSION_COOKIE)?.value
  return t ? verifySessionToken(t) : null
}
export async function requireDbSession() {
  const session = await getSession()
  if (!session) return null
  const emp = await db.query.employees.findFirst({ where: eq(employees.id, session.pk) })
  if (!emp || !emp.active || emp.tokenVersion !== session.tv) return null
  return { session, employee: emp }
}
export async function requireAdmin() {
  const auth = await requireDbSession()
  if (!auth || auth.employee.role !== 'admin') notFound() // 404, not 403 — spec
  return auth
}
