// Regression test for the C1 finding: app/(admin)/layout.tsx's requireAdmin() alone does NOT
// gate the admin page segments — Next renders page segments independently of layouts, so an
// employee-role session hitting an admin route directly got a 404 status whose RSC flight
// payload still contained the fully rendered page (roster, claims, etc). Each page now also
// calls requireAdmin() itself; this test renders the page components directly (they're just
// async functions) with a mocked employee-role session and asserts the 404 throw happens BEFORE
// any DB read that would return roster/claims data.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth/password'
import { signSessionToken, SESSION_COOKIE } from '@/lib/auth/token'

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

// Partial mock: keep the real implementations (so requireAdmin's own DB read still works and
// nothing else in the module breaks) but wrap the roster/summary-reading exports in vi.fn() so
// call counts can be asserted.
vi.mock('@/lib/admin-queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin-queries')>()
  return {
    ...actual,
    weekRows: vi.fn(actual.weekRows),
    voidedRows: vi.fn(actual.voidedRows),
    rangeSummary: vi.fn(actual.rangeSummary),
  }
})

const { weekRows, voidedRows, rangeSummary } = await import('@/lib/admin-queries')
const AdminClaimsPage = (await import('@/app/(admin)/admin/page')).default
const AdminEmployeesPage = (await import('@/app/(admin)/admin/employees/page')).default
const AdminMonthPage = (await import('@/app/(admin)/admin/month/page')).default
const AdminYearPage = (await import('@/app/(admin)/admin/year/page')).default

beforeEach(async () => {
  cookieStore.clear()
  vi.clearAllMocks()
  await db.execute(sql`TRUNCATE claims, employees RESTART IDENTITY CASCADE`)
})

async function makeEmployee(employeeId: string, role: 'employee' | 'admin' = 'employee') {
  const [emp] = await db.insert(employees).values({
    employeeId, name: 'Test', role, passwordHash: await hashPassword('x'), mustChangePassword: false,
  }).returning()
  return emp
}

async function loginAsEmployee() {
  const emp = await makeEmployee(`GAT-${Math.floor(Math.random() * 9000 + 1000)}`, 'employee')
  cookieStore.set(SESSION_COOKIE, {
    value: await signSessionToken({ pk: emp.id, role: emp.role, tv: emp.tokenVersion, mcp: false }),
  })
}

async function expectNotFoundThrow(render: () => Promise<unknown>) {
  let caught: unknown
  try {
    await render()
  } catch (err) {
    caught = err
  }
  expect(caught).toBeDefined()
  expect((caught as { digest?: string }).digest).toBe('NEXT_HTTP_ERROR_FALLBACK;404')
}

describe('admin page segments gate on requireAdmin, independent of the (admin) layout', () => {
  it('AdminClaimsPage (week view) 404s an employee-role session before reading any claims data', async () => {
    await loginAsEmployee()
    await expectNotFoundThrow(() => AdminClaimsPage({ searchParams: Promise.resolve({}) }))
    expect(weekRows).not.toHaveBeenCalled()
    expect(voidedRows).not.toHaveBeenCalled()
  })

  it('EmployeesPage (roster) 404s an employee-role session before reading the roster', async () => {
    await loginAsEmployee()
    const findManySpy = vi.spyOn(db.query.employees, 'findMany')
    await expectNotFoundThrow(() => AdminEmployeesPage({ searchParams: Promise.resolve({}) }))
    expect(findManySpy).not.toHaveBeenCalled()
    findManySpy.mockRestore()
  })

  it('AdminMonthPage 404s an employee-role session before reading any summary data', async () => {
    await loginAsEmployee()
    await expectNotFoundThrow(() => AdminMonthPage({ searchParams: Promise.resolve({}) }))
    expect(rangeSummary).not.toHaveBeenCalled()
  })

  it('AdminYearPage 404s an employee-role session before reading any summary data', async () => {
    await loginAsEmployee()
    await expectNotFoundThrow(() => AdminYearPage({ searchParams: Promise.resolve({}) }))
    expect(rangeSummary).not.toHaveBeenCalled()
  })

  it('all four pages also 404 when there is no session at all', async () => {
    await expectNotFoundThrow(() => AdminClaimsPage({ searchParams: Promise.resolve({}) }))
    await expectNotFoundThrow(() => AdminEmployeesPage({ searchParams: Promise.resolve({}) }))
    await expectNotFoundThrow(() => AdminMonthPage({ searchParams: Promise.resolve({}) }))
    await expectNotFoundThrow(() => AdminYearPage({ searchParams: Promise.resolve({}) }))
    expect(weekRows).not.toHaveBeenCalled()
    expect(voidedRows).not.toHaveBeenCalled()
    expect(rangeSummary).not.toHaveBeenCalled()
  })
})
