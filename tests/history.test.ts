import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { db } from '@/lib/db/client'
import { employees, claims } from '@/lib/db/schema'
import { ownClaimHistory } from '@/lib/admin-queries'
import { sql } from 'drizzle-orm'

beforeAll(() => { process.env.APP_TIMEZONE = 'Asia/Brunei' })
beforeEach(async () => {
  await db.execute(sql`TRUNCATE claims, employees RESTART IDENTITY CASCADE`)
})

async function mkEmployee(employeeId: string) {
  const [row] = await db.insert(employees).values({ employeeId, name: `N ${employeeId}`, passwordHash: 'x' }).returning()
  return row
}

describe('ownClaimHistory', () => {
  it('returns only the caller\'s own non-voided claims, newest first', async () => {
    const me = await mkEmployee('HIS-0001')
    const other = await mkEmployee('HIS-0002')
    await db.insert(claims).values([
      { employeePk: me.id, claimDate: '2026-08-06', billTotalCents: 1200, capCents: 1500 },
      { employeePk: me.id, claimDate: '2026-08-20', billTotalCents: 1850, capCents: 1500 },
      { employeePk: me.id, claimDate: '2026-08-13', billTotalCents: 900, capCents: 1500, voided: true },
      { employeePk: other.id, claimDate: '2026-08-20', billTotalCents: 9999, capCents: 1500 },
    ])

    const rows = await ownClaimHistory(me.id)

    expect(rows.map((r) => r.claimDate)).toEqual(['2026-08-20', '2026-08-06'])
    // The other employee's claim must never appear, by pk or by amount.
    expect(rows.some((r) => r.billTotalCents === 9999)).toBe(false)
  })

  it('is empty for an employee with no claims, and never leaks another employee\'s rows', async () => {
    const me = await mkEmployee('HIS-0003')
    const other = await mkEmployee('HIS-0004')
    await db.insert(claims).values({ employeePk: other.id, claimDate: '2026-08-20', billTotalCents: 1500, capCents: 1500 })

    expect(await ownClaimHistory(me.id)).toEqual([])
  })

  it('caps how many rows it returns', async () => {
    const me = await mkEmployee('HIS-0005')
    const rows = Array.from({ length: 30 }, (_, i) => ({
      employeePk: me.id,
      claimDate: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      billTotalCents: 1000 + i,
      capCents: 1500,
    }))
    await db.insert(claims).values(rows)
    expect((await ownClaimHistory(me.id, 5)).length).toBe(5)
  })
})
