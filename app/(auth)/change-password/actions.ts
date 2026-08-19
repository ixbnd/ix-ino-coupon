'use server'
import { redirect } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth/password'
import { getSession, setSessionCookie } from '@/lib/auth/session'

export async function changePassword(_prev: { error?: string } | null, formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/login')
  const pw = String(formData.get('password') ?? '')
  if (pw.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (pw !== String(formData.get('confirm') ?? '')) return { error: 'Passwords do not match.' }
  const [emp] = await db.update(employees)
    .set({ passwordHash: await hashPassword(pw), mustChangePassword: false, tokenVersion: sql`${employees.tokenVersion} + 1` })
    .where(eq(employees.id, session.pk)).returning()
  await setSessionCookie({ pk: emp.id, role: emp.role, tv: emp.tokenVersion, mcp: false })
  redirect(emp.role === 'admin' ? '/admin' : '/scan')
}
