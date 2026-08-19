import { and, eq, asc, gte, lte, sum, count, sql } from 'drizzle-orm'
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

// sum() reports null (not 0) when a left join finds no matching rows — normalize so the
// UI never has to guard against null/NaN when rendering totals.
function normalizeCents(v: number | null): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

export async function rangeSummary(fromYmd: string, toYmd: string) {
  const rows = await db.select({
    employee: employees,
    claimCount: count(claims.id),
    billCents: sum(claims.billTotalCents).mapWith(Number),
    coveredCents: sum(sql`LEAST(${claims.billTotalCents}, ${claims.capCents})`).mapWith(Number),
    excessCents: sum(sql`GREATEST(0, ${claims.billTotalCents} - ${claims.capCents})`).mapWith(Number),
  }).from(employees)
    .leftJoin(claims, and(eq(claims.employeePk, employees.id), eq(claims.voided, false),
      gte(claims.claimDate, fromYmd), lte(claims.claimDate, toYmd)))
    .where(eq(employees.active, true))
    .groupBy(employees.id).orderBy(asc(employees.employeeId))

  return rows.map((r) => ({
    ...r,
    billCents: normalizeCents(r.billCents),
    coveredCents: normalizeCents(r.coveredCents),
    excessCents: normalizeCents(r.excessCents),
  }))
}

// One grouped query for per-date subtotal strips (month view: per-Thursday; year view: bucketed
// by month in JS from these rows). Dates with only voided claims are simply absent.
export async function claimCountsByDate(fromYmd: string, toYmd: string) {
  return db.select({ claimDate: claims.claimDate, count: count(claims.id) })
    .from(claims)
    .where(and(eq(claims.voided, false), gte(claims.claimDate, fromYmd), lte(claims.claimDate, toYmd)))
    .groupBy(claims.claimDate)
}
