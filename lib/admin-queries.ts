import { and, eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees, claims } from '@/lib/db/schema'

export async function weekRows(ymd: string) {
  return db.select({ employee: employees, claim: claims }).from(employees)
    .leftJoin(claims, and(eq(claims.employeePk, employees.id), eq(claims.claimDate, ymd), eq(claims.voided, false)))
    .where(eq(employees.active, true))
    .orderBy(asc(employees.employeeId))
}
export async function voidedRows(ymd: string) {
  return db.select({ employee: employees, claim: claims }).from(claims)
    .innerJoin(employees, eq(claims.employeePk, employees.id))
    .where(and(eq(claims.claimDate, ymd), eq(claims.voided, true)))
    .orderBy(asc(employees.employeeId))
}
