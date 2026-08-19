import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees, claims } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth/password'
import { signSessionToken, SESSION_COOKIE } from '@/lib/auth/token'
import { weekRows, voidedRows, rangeSummary } from '@/lib/admin-queries'

const { cookieStore } = vi.hoisted(() => ({ cookieStore: new Map<string, { value: string }>() }))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => cookieStore.get(name),
    set: (name: string, value: string) => {
      cookieStore.set(name, { value })
    },
    delete: (name: string) => {
      cookieStore.delete(name)
    },
  }),
}))

// revalidatePath() asserts a request-scoped Next.js render context that doesn't exist when
// calling the server action directly from a test; the action's own behavior isn't under test here.
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

const { amendClaim, voidClaim } = await import('@/app/(admin)/admin/claim-actions')

const YMD = '2026-08-20'

beforeEach(async () => {
  cookieStore.clear()
  await db.execute(sql`TRUNCATE claims, employees RESTART IDENTITY CASCADE`)
})

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

async function makeEmployee(employeeId: string, role: 'employee' | 'admin' = 'employee') {
  const [emp] = await db.insert(employees).values({
    employeeId, name: 'Test', role, passwordHash: await hashPassword('x'), mustChangePassword: false,
  }).returning()
  return emp
}

async function loginAs(emp: { id: number; role: 'employee' | 'admin'; tokenVersion: number }) {
  cookieStore.set(SESSION_COOKIE, {
    value: await signSessionToken({ pk: emp.id, role: emp.role, tv: emp.tokenVersion, mcp: false }),
  })
}

async function makeClaim(employeePk: number, overrides: Partial<typeof claims.$inferInsert> = {}) {
  const [claim] = await db.insert(claims).values({
    employeePk, claimDate: YMD, billTotalCents: 1000, capCents: 1500, ...overrides,
  }).returning()
  return claim
}

describe('amendClaim', () => {
  it('updates the bill amount and records amendedBy/amendedAt', async () => {
    const admin = await makeEmployee('CLM-0001', 'admin')
    const emp = await makeEmployee('CLM-0002')
    const claim = await makeClaim(emp.id)
    await loginAs(admin)

    const result = await amendClaim(claim.id, null, formData({ bill: '22.50' }))
    expect(result).toEqual({})

    const [row] = await db.select().from(claims).where(eq(claims.id, claim.id))
    expect(row.billTotalCents).toBe(2250)
    expect(row.amendedBy).toBe(admin.id)
    expect(row.amendedAt).toBeInstanceOf(Date)
  })

  it.each([
    ['0', 'zero'],
    ['500.01', 'over the $500.00 cap'],
    ['abc', 'non-numeric'],
  ])('rejects a bill of %s (%s) and changes nothing', async (input) => {
    const admin = await makeEmployee('CLM-0010', 'admin')
    const emp = await makeEmployee('CLM-0011')
    const claim = await makeClaim(emp.id)
    await loginAs(admin)

    const result = await amendClaim(claim.id, null, formData({ bill: input }))
    expect(result).toEqual({ error: 'Enter a valid bill total.' })

    const [row] = await db.select().from(claims).where(eq(claims.id, claim.id))
    expect(row.billTotalCents).toBe(1000)
    expect(row.amendedBy).toBeNull()
    expect(row.amendedAt).toBeNull()
  })

  it('throws a 404 (notFound) for an employee-role session and changes nothing', async () => {
    const emp = await makeEmployee('CLM-0020')
    const claim = await makeClaim(emp.id)
    await loginAs(emp)

    let caught: unknown
    try {
      await amendClaim(claim.id, null, formData({ bill: '22.50' }))
    } catch (err) {
      caught = err
    }
    expect((caught as { digest?: string }).digest).toBe('NEXT_HTTP_ERROR_FALLBACK;404')

    const [row] = await db.select().from(claims).where(eq(claims.id, claim.id))
    expect(row.billTotalCents).toBe(1000)
    expect(row.amendedBy).toBeNull()
  })

  it('refuses to amend an already-voided claim (second tab / stale POST / concurrent admin) and changes nothing', async () => {
    const admin = await makeEmployee('CLM-0025', 'admin')
    const emp = await makeEmployee('CLM-0026')
    const claim = await makeClaim(emp.id)
    await loginAs(admin)

    await voidClaim(claim.id)
    const result = await amendClaim(claim.id, null, formData({ bill: '22.50' }))
    expect(result).toEqual({ error: 'Claim not found or already voided.' })

    const [row] = await db.select().from(claims).where(eq(claims.id, claim.id))
    expect(row.billTotalCents).toBe(1000) // unchanged
    expect(row.amendedBy).toBeNull() // never amended
    expect(row.amendedAt).toBeNull()
    expect(row.voided).toBe(true) // still voided
  })
})

describe('voidClaim', () => {
  it('marks the claim voided, records voidedBy/voidedAt, and frees the unique employee+date slot', async () => {
    const admin = await makeEmployee('CLM-0030', 'admin')
    const emp = await makeEmployee('CLM-0031')
    const claim = await makeClaim(emp.id)
    await loginAs(admin)

    await voidClaim(claim.id)

    const [row] = await db.select().from(claims).where(eq(claims.id, claim.id))
    expect(row.voided).toBe(true)
    expect(row.voidedBy).toBe(admin.id)
    expect(row.voidedAt).toBeInstanceOf(Date)

    // excluded from weekRows and rangeSummary...
    const wk = await weekRows(YMD)
    expect(wk.find((r) => r.employee.id === emp.id)?.claim).toBeNull()

    const summary = await rangeSummary(YMD, YMD)
    expect(summary.find((r) => r.employee.id === emp.id)?.claimCount).toBe(0)

    // ...but present in voidedRows
    const vd = await voidedRows(YMD)
    expect(vd.find((r) => r.employee.id === emp.id)?.claim.id).toBe(claim.id)

    // the unique (employeePk, claimDate) slot is freed for a live re-claim
    await expect(
      db.insert(claims).values({ employeePk: emp.id, claimDate: YMD, billTotalCents: 500, capCents: 1500 }),
    ).resolves.toBeDefined()
  })

  it('throws a 404 (notFound) for an employee-role session and changes nothing', async () => {
    const emp = await makeEmployee('CLM-0040')
    const claim = await makeClaim(emp.id)
    await loginAs(emp)

    let caught: unknown
    try {
      await voidClaim(claim.id)
    } catch (err) {
      caught = err
    }
    expect((caught as { digest?: string }).digest).toBe('NEXT_HTTP_ERROR_FALLBACK;404')

    const [row] = await db.select().from(claims).where(eq(claims.id, claim.id))
    expect(row.voided).toBe(false)
    expect(row.voidedBy).toBeNull()
  })

  it('refuses a second void and keeps the FIRST admin\'s voidedBy/voidedAt', async () => {
    const firstAdmin = await makeEmployee('CLM-0050', 'admin')
    const secondAdmin = await makeEmployee('CLM-0051', 'admin')
    const emp = await makeEmployee('CLM-0052')
    const claim = await makeClaim(emp.id)

    await loginAs(firstAdmin)
    const first = await voidClaim(claim.id)
    expect(first).toEqual({})

    const [afterFirst] = await db.select().from(claims).where(eq(claims.id, claim.id))
    expect(afterFirst.voidedBy).toBe(firstAdmin.id)
    const firstVoidedAt = afterFirst.voidedAt

    await loginAs(secondAdmin)
    const second = await voidClaim(claim.id)
    expect(second).toEqual({ error: 'Claim already voided.' })

    const [afterSecond] = await db.select().from(claims).where(eq(claims.id, claim.id))
    expect(afterSecond.voidedBy).toBe(firstAdmin.id) // not overwritten by the second admin
    expect(afterSecond.voidedAt).toEqual(firstVoidedAt) // timestamp untouched
  })
})
