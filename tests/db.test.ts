import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db/client'
import { employees, claims } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

beforeEach(async () => {
  await db.execute(sql`TRUNCATE claims, employees RESTART IDENTITY CASCADE`)
})

describe('claims constraints', () => {
  it('rejects a second live claim on the same Thursday, allows re-claim after void', async () => {
    const [emp] = await db.insert(employees).values({
      employeeId: 'ABC-0001', name: 'Test', passwordHash: 'x',
    }).returning()
    const row = { employeePk: emp.id, claimDate: '2026-08-20', billTotalCents: 1850, capCents: 1500 }
    await db.insert(claims).values(row)
    await expect(db.insert(claims).values(row)).rejects.toMatchObject({ cause: { code: '23505' } })
    await db.update(claims).set({ voided: true }).where(sql`true`)
    await expect(db.insert(claims).values(row)).resolves.toBeDefined()
  })
  it('rejects malformed employee ids at the DB', async () => {
    await expect(db.insert(employees).values({
      employeeId: 'abc-1', name: 'Bad', passwordHash: 'x',
    })).rejects.toMatchObject({ cause: { code: '23514' } })
  })
})
