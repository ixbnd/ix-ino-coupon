import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees } from '@/lib/db/schema'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { signSessionToken, SESSION_COOKIE } from '@/lib/auth/token'
import { requireDbSession, requireAdmin } from '@/lib/auth/session'

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

const { createEmployee, resetPassword, setEmployeeActive } = await import(
  '@/app/(admin)/admin/employees/actions'
)

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

describe('requireAdmin gate', () => {
  it('lets an admin session through', async () => {
    const admin = await makeEmployee('ADM-0001', 'admin')
    await loginAs(admin)
    const auth = await requireAdmin()
    expect(auth.employee.id).toBe(admin.id)
  })

  it('throws a 404 (notFound) for an employee-role session', async () => {
    const emp = await makeEmployee('ADM-0002', 'employee')
    await loginAs(emp)
    let caught: unknown
    try {
      await requireAdmin()
    } catch (err) {
      caught = err
    }
    expect(caught).toBeDefined()
    expect((caught as { digest?: string }).digest).toBe('NEXT_HTTP_ERROR_FALLBACK;404')
  })

  it('throws a 404 (notFound) when there is no session at all', async () => {
    let caught: unknown
    try {
      await requireAdmin()
    } catch (err) {
      caught = err
    }
    expect((caught as { digest?: string }).digest).toBe('NEXT_HTTP_ERROR_FALLBACK;404')
  })
})

describe('createEmployee', () => {
  it('happy path: inserts a row with mustChangePassword=true and a verifiable XXXX-XXXX temp password', async () => {
    const admin = await makeEmployee('ADM-0010', 'admin')
    await loginAs(admin)

    const result = await createEmployee(null, formData({ employeeId: 'ADM-0011', name: 'New Hire' }))
    expect(result).toBeDefined()
    const { tempPassword, employeeId, error } = result as { tempPassword?: string; employeeId?: string; error?: string }
    expect(error).toBeUndefined()
    expect(employeeId).toBe('ADM-0011')
    expect(tempPassword).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)

    const [row] = await db.select().from(employees).where(eq(employees.employeeId, 'ADM-0011'))
    expect(row).toBeDefined()
    expect(row.mustChangePassword).toBe(true)
    expect(row.name).toBe('New Hire')
    expect(await verifyPassword(row.passwordHash, tempPassword!)).toBe(true)
  })

  it('duplicate employee ID returns an error and inserts no second row', async () => {
    const admin = await makeEmployee('ADM-0020', 'admin')
    await loginAs(admin)
    await createEmployee(null, formData({ employeeId: 'ADM-0021', name: 'First' }))

    const result = await createEmployee(null, formData({ employeeId: 'ADM-0021', name: 'Second' }))
    expect(result).toEqual({ error: 'ADM-0021 already exists.' })

    const rows = await db.select().from(employees).where(eq(employees.employeeId, 'ADM-0021'))
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('First')
  })

  it('rejects when called with an employee-role session, and creates no row', async () => {
    const emp = await makeEmployee('ADM-0030', 'employee')
    await loginAs(emp)

    let caught: unknown
    try {
      await createEmployee(null, formData({ employeeId: 'ADM-0031', name: 'Should Not Exist' }))
    } catch (err) {
      caught = err
    }
    expect((caught as { digest?: string }).digest).toBe('NEXT_HTTP_ERROR_FALLBACK;404')

    const rows = await db.select().from(employees).where(eq(employees.employeeId, 'ADM-0031'))
    expect(rows).toHaveLength(0)
  })
})

describe('resetPassword', () => {
  it('bumps tokenVersion and issues a new hashed temp password; the stale session is rejected by requireDbSession', async () => {
    const admin = await makeEmployee('ADM-0040', 'admin')
    const target = await makeEmployee('ADM-0041', 'employee')
    const staleTv = target.tokenVersion

    await loginAs(admin)
    const { tempPassword } = await resetPassword(target.id)
    expect(tempPassword).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)

    const [row] = await db.select().from(employees).where(eq(employees.id, target.id))
    expect(row.tokenVersion).toBe(staleTv + 1)
    expect(row.mustChangePassword).toBe(true)
    expect(await verifyPassword(row.passwordHash, tempPassword)).toBe(true)

    // A session signed at the pre-reset token_version must now be rejected.
    cookieStore.set(SESSION_COOKIE, {
      value: await signSessionToken({ pk: target.id, role: target.role, tv: staleTv, mcp: false }),
    })
    const stale = await requireDbSession()
    expect(stale).toBeNull()
  })

  it('rejects when called with an employee-role session', async () => {
    const emp = await makeEmployee('ADM-0050', 'employee')
    const target = await makeEmployee('ADM-0051', 'employee')
    await loginAs(emp)

    let caught: unknown
    try {
      await resetPassword(target.id)
    } catch (err) {
      caught = err
    }
    expect((caught as { digest?: string }).digest).toBe('NEXT_HTTP_ERROR_FALLBACK;404')
  })
})

describe('setEmployeeActive', () => {
  it('deactivates and reactivates an employee row', async () => {
    const admin = await makeEmployee('ADM-0060', 'admin')
    const target = await makeEmployee('ADM-0061', 'employee')
    await loginAs(admin)

    await setEmployeeActive(target.id, false)
    let [row] = await db.select().from(employees).where(eq(employees.id, target.id))
    expect(row.active).toBe(false)

    await setEmployeeActive(target.id, true)
    ;[row] = await db.select().from(employees).where(eq(employees.id, target.id))
    expect(row.active).toBe(true)
  })
})
