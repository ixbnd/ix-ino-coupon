'use server'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/client'
import { employees } from '@/lib/db/schema'
import { EMPLOYEE_ID_RE, generateTempPassword, hashPassword } from '@/lib/auth/password'
import { requireAdmin } from '@/lib/auth/session'

export async function createEmployee(_p: unknown, formData: FormData) {
  await requireAdmin()
  const employeeId = String(formData.get('employeeId') ?? '').trim().toUpperCase()
  const name = String(formData.get('name') ?? '').trim()
  if (!EMPLOYEE_ID_RE.test(employeeId)) return { error: 'Employee ID must look like ABC-0000.' }
  if (!name) return { error: 'Name is required.' }
  const temp = generateTempPassword()
  try {
    await db.insert(employees).values({ employeeId, name, passwordHash: await hashPassword(temp) })
  } catch (e: unknown) {
    const code = (e as { cause?: { code?: string } }).cause?.code
    if (code === '23505') return { error: `${employeeId} already exists.` }
    throw e
  }
  revalidatePath('/admin/employees')
  return { tempPassword: temp, employeeId } // shown ONCE in the modal success state
}
export async function resetPassword(employeePk: number) {
  const { employee: admin } = await requireAdmin()
  const temp = generateTempPassword()
  await db.update(employees).set({
    passwordHash: await hashPassword(temp), mustChangePassword: true,
    tokenVersion: sql`${employees.tokenVersion} + 1`,
  }).where(eq(employees.id, employeePk))
  revalidatePath('/admin/employees')
  return { tempPassword: temp }
}
export async function setEmployeeActive(employeePk: number, active: boolean) {
  await requireAdmin()
  await db.update(employees).set({ active }).where(eq(employees.id, employeePk))
  revalidatePath('/admin/employees')
}
