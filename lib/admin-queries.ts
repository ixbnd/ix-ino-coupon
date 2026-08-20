import { and, eq, asc, desc, gte, lte, sum, count, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees, claims } from '@/lib/db/schema'

// Only the columns the admin UI (and the xlsx export, which reuses these queries) actually
// renders — employees also carries passwordHash/tokenVersion, and a `select: employees` would
// pull the full row into the query result, which app/(admin)/admin/page.tsx then passes into a
// 'use client' component. Client component props get serialized into the page's HTML/RSC flight
// payload, so a full-row select there means password hashes ship to the browser. Keep this
// selection narrow everywhere an employee row flows toward a client component.
const employeeCols = { id: employees.id, employeeId: employees.employeeId, name: employees.name }

export async function weekRows(ymd: string) {
  // Active employees, one row each, left-joined to their (non-voided) claim for the date.
  const active = await db.select({ employee: employeeCols, claim: claims }).from(employees)
    .leftJoin(claims, and(eq(claims.employeePk, employees.id), eq(claims.claimDate, ymd), eq(claims.voided, false)))
    .where(eq(employees.active, true))
    .orderBy(asc(employees.employeeId))

  // Deactivating an employee must not retroactively erase a claim they filed while active from
  // that Thursday's view — so also pull in any inactive employee who has a live claim that date.
  const inactiveWithClaim = await db.select({ employee: employeeCols, claim: claims }).from(employees)
    .innerJoin(claims, and(eq(claims.employeePk, employees.id), eq(claims.claimDate, ymd), eq(claims.voided, false)))
    .where(eq(employees.active, false))
    .orderBy(asc(employees.employeeId))

  return [...active, ...inactiveWithClaim].sort((a, b) => a.employee.employeeId.localeCompare(b.employee.employeeId))
}
export async function voidedRows(ymd: string) {
  return db.select({ employee: employeeCols, claim: claims }).from(claims)
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
    employee: { ...employeeCols, active: employees.active },
    claimCount: count(claims.id),
    billCents: sum(claims.billTotalCents).mapWith(Number),
    coveredCents: sum(sql`LEAST(${claims.billTotalCents}, ${claims.capCents})`).mapWith(Number),
    excessCents: sum(sql`GREATEST(0, ${claims.billTotalCents} - ${claims.capCents})`).mapWith(Number),
  }).from(employees)
    .leftJoin(claims, and(eq(claims.employeePk, employees.id), eq(claims.voided, false),
      gte(claims.claimDate, fromYmd), lte(claims.claimDate, toYmd)))
    .groupBy(employees.id).orderBy(asc(employees.employeeId))

  // Deactivating an employee mid-range must not retroactively drop their claims from month/year
  // summaries and exports — keep any row that is either still active or has at least one
  // non-voided claim in range; a since-deactivated employee with zero claims in range stays hidden.
  return rows
    .filter((r) => r.employee.active || r.claimCount > 0)
    .map((r) => ({
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

/**
 * An employee's own claim history, newest first.
 *
 * Scoped by employeePk, which callers must take from the session — never from a
 * request parameter. There is no admin variant here on purpose: this query is
 * the employee-facing one, and the only pk it should ever see is its caller's.
 */
export async function ownClaimHistory(employeePk: number, limit = 26) {
  return db
    .select({
      id: claims.id,
      claimDate: claims.claimDate,
      claimedAt: claims.claimedAt,
      billTotalCents: claims.billTotalCents,
      capCents: claims.capCents,
    })
    .from(claims)
    .where(and(eq(claims.employeePk, employeePk), eq(claims.voided, false)))
    .orderBy(desc(claims.claimDate))
    .limit(limit)
}
