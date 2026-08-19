import { describe, it, expect, beforeEach } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees, claims } from '@/lib/db/schema'
import { weekRows, voidedRows, rangeSummary, claimCountsByDate } from '@/lib/admin-queries'
import { coveredCents, excessCents } from '@/lib/money'

const YMD = '2026-08-20'

beforeEach(async () => {
  await db.execute(sql`TRUNCATE claims, employees RESTART IDENTITY CASCADE`)
})

async function makeEmployee(employeeId: string, active = true) {
  const [emp] = await db.insert(employees).values({
    employeeId, name: `Test ${employeeId}`, passwordHash: 'x', active,
  }).returning()
  return emp
}

describe('weekRows / voidedRows', () => {
  it('returns active employees ID-ordered with claim status; voided claims surface separately', async () => {
    const claimed = await makeEmployee('WKQ-0001')
    const voidedEmp = await makeEmployee('WKQ-0002')
    const unclaimed = await makeEmployee('WKQ-0003')
    await makeEmployee('WKQ-0004', false) // inactive — excluded from weekRows

    await db.insert(claims).values({
      employeePk: claimed.id, claimDate: YMD, billTotalCents: 1000, capCents: 1500,
    })
    await db.insert(claims).values({
      employeePk: voidedEmp.id, claimDate: YMD, billTotalCents: 2000, capCents: 1500, voided: true,
    })

    const rows = await weekRows(YMD)
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.employee.employeeId)).toEqual(['WKQ-0001', 'WKQ-0002', 'WKQ-0003'])
    expect(rows.filter((r) => r.claim !== null)).toHaveLength(1)
    expect(rows.find((r) => r.employee.id === claimed.id)?.claim?.billTotalCents).toBe(1000)
    expect(rows.find((r) => r.employee.id === voidedEmp.id)?.claim).toBeNull()
    expect(rows.find((r) => r.employee.id === unclaimed.id)?.claim).toBeNull()

    const voided = await voidedRows(YMD)
    expect(voided).toHaveLength(1)
    expect(voided[0].employee.employeeId).toBe('WKQ-0002')
    expect(voided[0].claim.billTotalCents).toBe(2000)
  })
})

describe('rangeSummary', () => {
  it('aggregates bill/covered/excess across a date range, excludes voided claims, and keeps zero-claim employees', async () => {
    const capped = await makeEmployee('MTH-0001') // one over-cap claim
    const under = await makeEmployee('MTH-0002') // two under-cap claims, two Thursdays
    const voidedEmp = await makeEmployee('MTH-0003') // sole claim is voided
    const noClaims = await makeEmployee('MTH-0004') // active, no claims at all
    await makeEmployee('MTH-0005', false) // inactive — excluded from rangeSummary entirely

    const thu1 = '2026-08-06'
    const thu2 = '2026-08-13'

    await db.insert(claims).values({ employeePk: capped.id, claimDate: thu1, billTotalCents: 3000, capCents: 1500 })
    await db.insert(claims).values({ employeePk: under.id, claimDate: thu1, billTotalCents: 1000, capCents: 1500 })
    await db.insert(claims).values({ employeePk: under.id, claimDate: thu2, billTotalCents: 1200, capCents: 1500 })
    await db.insert(claims).values({
      employeePk: voidedEmp.id, claimDate: thu1, billTotalCents: 5000, capCents: 1500, voided: true,
    })

    const rows = await rangeSummary('2026-08-01', '2026-08-31')
    expect(rows).toHaveLength(4)
    expect(rows.map((r) => r.employee.employeeId)).toEqual(['MTH-0001', 'MTH-0002', 'MTH-0003', 'MTH-0004'])

    const cappedRow = rows.find((r) => r.employee.id === capped.id)!
    expect(cappedRow.claimCount).toBe(1)
    expect(cappedRow.billCents).toBe(3000)
    expect(cappedRow.coveredCents).toBe(coveredCents(3000, 1500))
    expect(cappedRow.excessCents).toBe(excessCents(3000, 1500))

    const underRow = rows.find((r) => r.employee.id === under.id)!
    expect(underRow.claimCount).toBe(2)
    expect(underRow.billCents).toBe(1000 + 1200)
    expect(underRow.coveredCents).toBe(coveredCents(1000, 1500) + coveredCents(1200, 1500))
    expect(underRow.excessCents).toBe(excessCents(1000, 1500) + excessCents(1200, 1500))

    const voidedRow = rows.find((r) => r.employee.id === voidedEmp.id)!
    expect(voidedRow.claimCount).toBe(0)
    expect(voidedRow.billCents).toBe(0)
    expect(voidedRow.coveredCents).toBe(0)
    expect(voidedRow.excessCents).toBe(0)

    const zeroRow = rows.find((r) => r.employee.id === noClaims.id)!
    expect(zeroRow.claimCount).toBe(0)
    expect(zeroRow.billCents).toBe(0)
    expect(zeroRow.coveredCents).toBe(0)
    expect(zeroRow.excessCents).toBe(0)
  })
})

describe('claimCountsByDate', () => {
  it('groups active claim counts by claimDate within range, excluding voided claims and dates outside range', async () => {
    const a = await makeEmployee('MTH-0010')
    const b = await makeEmployee('MTH-0011')
    await db.insert(claims).values({ employeePk: a.id, claimDate: '2026-08-06', billTotalCents: 1000, capCents: 1500 })
    await db.insert(claims).values({ employeePk: b.id, claimDate: '2026-08-06', billTotalCents: 1000, capCents: 1500 })
    await db.insert(claims).values({
      employeePk: a.id, claimDate: '2026-08-13', billTotalCents: 1000, capCents: 1500, voided: true,
    })
    await db.insert(claims).values({ employeePk: b.id, claimDate: '2026-09-03', billTotalCents: 1000, capCents: 1500 })

    const counts = await claimCountsByDate('2026-08-01', '2026-08-31')
    const byDate = Object.fromEntries(counts.map((c) => [c.claimDate, c.count]))
    expect(byDate['2026-08-06']).toBe(2)
    expect(byDate['2026-08-13']).toBeUndefined() // voided-only date has no row
    expect(byDate['2026-09-03']).toBeUndefined() // outside the range
  })
})
