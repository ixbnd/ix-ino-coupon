import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees, claims } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth/password'
import { signSessionToken, SESSION_COOKIE } from '@/lib/auth/token'
import { coveredCents, excessCents } from '@/lib/money'

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

const { submitClaim } = await import('@/app/(employee)/claim/actions')

const TOKEN = 'test-coupon-token'
const THU_NOON = new Date('2026-08-20T04:00:00Z') // Thu 12:00 Asia/Brunei

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-at-least-32-bytes-long!!'
  process.env.COUPON_TOKEN = TOKEN
  process.env.CLAIM_CAP_CENTS = '1500'
  // Only fake Date so real timer-based I/O (pg sockets, etc.) keeps working.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(THU_NOON)
})

afterAll(() => {
  vi.useRealTimers()
})

beforeEach(async () => {
  cookieStore.clear()
  await db.execute(sql`TRUNCATE claims, employees RESTART IDENTITY CASCADE`)
})

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

async function loginAs(employeeId: string) {
  const [emp] = await db.insert(employees).values({
    employeeId, name: 'Test', passwordHash: await hashPassword('x'), mustChangePassword: false,
  }).returning()
  cookieStore.set(SESSION_COOKIE, { value: await signSessionToken({ pk: emp.id, role: emp.role, tv: emp.tokenVersion, mcp: false }) })
  return emp
}

async function submitAndFollowRedirect(fields: Record<string, string>) {
  let caught: unknown
  try {
    await submitClaim(null, formData(fields))
  } catch (e) {
    caught = e
  }
  return (caught as { digest?: string } | undefined)?.digest
}

describe('submitClaim', () => {
  it('inserts a claim row and stamps it with the configured cap', async () => {
    const emp = await loginAs('CLM-0001')
    const digest = await submitAndFollowRedirect({ t: TOKEN, bill: '18.50' })
    expect(digest).toMatch(/^NEXT_REDIRECT;.*\/claim/)

    const rows = await db.select().from(claims).where(eq(claims.employeePk, emp.id))
    expect(rows).toHaveLength(1)
    expect(rows[0].capCents).toBe(1500)
    expect(rows[0]).toMatchObject({ billTotalCents: 1850, capCents: 1500, voided: false })
  })

  it('is idempotent: a second submit the same day leaves exactly one row', async () => {
    const emp = await loginAs('CLM-0002')
    await submitAndFollowRedirect({ t: TOKEN, bill: '18.50' })
    await submitAndFollowRedirect({ t: TOKEN, bill: '18.50' })

    const rows = await db.select().from(claims).where(eq(claims.employeePk, emp.id))
    expect(rows).toHaveLength(1)
  })

  it('allows a re-claim once the existing claim is voided', async () => {
    const emp = await loginAs('CLM-0003')
    await submitAndFollowRedirect({ t: TOKEN, bill: '18.50' })
    await db.update(claims).set({ voided: true }).where(eq(claims.employeePk, emp.id))
    await submitAndFollowRedirect({ t: TOKEN, bill: '22.00' })

    const rows = await db.select().from(claims).where(eq(claims.employeePk, emp.id))
    expect(rows).toHaveLength(2)
    expect(rows.filter((r) => !r.voided)).toHaveLength(1)
  })

  it('rejects a zero bill', async () => {
    await loginAs('CLM-0004')
    const result = await submitClaim(null, formData({ t: TOKEN, bill: '0' }))
    expect(result).toEqual({ error: 'Enter a bill total between $0.01 and $500.00.' })
  })

  it('rejects a bill above the $500.00 max', async () => {
    await loginAs('CLM-0005')
    const result = await submitClaim(null, formData({ t: TOKEN, bill: '500.01' }))
    expect(result).toEqual({ error: 'Enter a bill total between $0.01 and $500.00.' })
  })

  it('rejects a non-numeric bill', async () => {
    await loginAs('CLM-0006')
    const result = await submitClaim(null, formData({ t: TOKEN, bill: 'abc' }))
    expect(result).toEqual({ error: 'Enter a bill total between $0.01 and $500.00.' })
  })

  it('rejects a bad coupon token', async () => {
    await loginAs('CLM-0007')
    const result = await submitClaim(null, formData({ t: 'wrong-token', bill: '18.50' }))
    expect(result).toEqual({ error: 'Invalid coupon code' })
  })

  it('rejects a submission when the server clock is not Thursday, and inserts no row', async () => {
    const emp = await loginAs('CLM-0008')
    const WED_NOON = new Date('2026-08-19T04:00:00Z') // Wed 12:00 Asia/Brunei
    // Scoped to this test only: other tests in this file rely on the file-wide fake
    // "Thursday now" set in beforeAll, so restore it afterward rather than going real.
    vi.setSystemTime(WED_NOON)
    try {
      const result = await submitClaim(null, formData({ t: TOKEN, bill: '18.50' }))
      expect(result).toEqual({ error: 'Claims are only open on Thursdays.' })
      const rows = await db.select().from(claims).where(eq(claims.employeePk, emp.id))
      expect(rows).toHaveLength(0)
    } finally {
      vi.setSystemTime(THU_NOON)
    }
  })
})

describe('submitClaim with a car wash', () => {
  it('adds the car wash to the stored total and records the breakdown', async () => {
    const emp = await loginAs('CLW-0001')

    await submitAndFollowRedirect({ t: TOKEN, bill: '18.50', carWash: 'on', carWashAmount: '5.00' })

    const [row] = await db.select().from(claims).where(eq(claims.employeePk, emp.id))
    expect(row.billTotalCents).toBe(2350)
    expect(row.carWashCents).toBe(500)
    // The cap applies to the combined total, so a $23.50 visit still covers $15.
    expect(coveredCents(row.billTotalCents, row.capCents)).toBe(1500)
    expect(excessCents(row.billTotalCents, row.capCents)).toBe(850)
  })

  it('ignores a car wash amount when the box is not ticked', async () => {
    const emp = await loginAs('CLW-0002')

    await submitAndFollowRedirect({ t: TOKEN, bill: '12.00', carWashAmount: '5.00' })

    const [row] = await db.select().from(claims).where(eq(claims.employeePk, emp.id))
    expect(row.billTotalCents).toBe(1200)
    expect(row.carWashCents).toBe(0)
  })

  it('rejects a ticked box with no amount', async () => {
    await loginAs('CLW-0003')

    const result = await submitClaim(null, formData({ t: TOKEN, bill: '12.00', carWash: 'on', carWashAmount: '' }))

    expect(result?.error).toMatch(/car wash amount/i)
    expect(await db.select().from(claims)).toHaveLength(0)
  })

  it('rejects a combined total over the maximum', async () => {
    await loginAs('CLW-0004')

    const result = await submitClaim(null, formData({ t: TOKEN, bill: '400.00', carWash: 'on', carWashAmount: '150.00' }))

    expect(result?.error).toMatch(/together cannot exceed/i)
    expect(await db.select().from(claims)).toHaveLength(0)
  })

  it('stores zero car wash for a plain claim', async () => {
    const emp = await loginAs('CLW-0005')

    await submitAndFollowRedirect({ t: TOKEN, bill: '9.90' })

    const [row] = await db.select().from(claims).where(eq(claims.employeePk, emp.id))
    expect(row.carWashCents).toBe(0)
  })
})
