import { describe, it, expect, beforeEach } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees, claims } from '@/lib/db/schema'
import { weekRows, voidedRows } from '@/lib/admin-queries'

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
