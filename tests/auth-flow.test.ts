import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth/password'
import { verifySessionToken, signSessionToken, SESSION_COOKIE } from '@/lib/auth/token'
import { requireDbSession } from '@/lib/auth/session'

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

const { login } = await import('@/app/(auth)/login/actions')
const { changePassword } = await import('@/app/(auth)/change-password/actions')

beforeEach(async () => {
  cookieStore.clear()
  await db.execute(sql`TRUNCATE claims, employees RESTART IDENTITY CASCADE`)
})

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe('login action', () => {
  it('returns generic error on wrong password', async () => {
    await db.insert(employees).values({
      employeeId: 'ABC-0001',
      name: 'Test User',
      passwordHash: await hashPassword('correct-pw'),
      mustChangePassword: false,
    })
    const result = await login(null, formData({ employeeId: 'ABC-0001', password: 'wrong-pw' }))
    expect(result).toEqual({ error: 'Invalid ID or password' })
  })

  it('redirects to /change-password on correct password when mustChangePassword is true', async () => {
    await db.insert(employees).values({
      employeeId: 'ABC-0002',
      name: 'Needs Change',
      passwordHash: await hashPassword('correct-pw'),
      mustChangePassword: true,
    })
    let caught: unknown
    try {
      await login(null, formData({ employeeId: 'ABC-0002', password: 'correct-pw' }))
    } catch (err) {
      caught = err
    }
    expect(caught).toBeDefined()
    expect((caught as { digest?: string }).digest).toMatch(/^NEXT_REDIRECT;.*change-password/)
  })

  it('returns generic error when employee is inactive', async () => {
    await db.insert(employees).values({
      employeeId: 'ABC-0003',
      name: 'Inactive',
      passwordHash: await hashPassword('correct-pw'),
      mustChangePassword: false,
      active: false,
    })
    const result = await login(null, formData({ employeeId: 'ABC-0003', password: 'correct-pw' }))
    expect(result).toEqual({ error: 'Invalid ID or password' })
  })

  it('ignores a protocol-relative next and falls back to the role default (/scan)', async () => {
    await db.insert(employees).values({
      employeeId: 'ABC-0004',
      name: 'Protocol Relative',
      role: 'employee',
      passwordHash: await hashPassword('correct-pw'),
      mustChangePassword: false,
    })
    let caught: unknown
    try {
      await login(null, formData({ employeeId: 'ABC-0004', password: 'correct-pw', next: '//evil.com' }))
    } catch (err) {
      caught = err
    }
    const digest = (caught as { digest?: string }).digest ?? ''
    expect(digest.split(';')[2]).toBe('/scan')
  })

  it('ignores an absolute next URL and falls back to the role default (/admin)', async () => {
    await db.insert(employees).values({
      employeeId: 'ABC-0005',
      name: 'Absolute URL',
      role: 'admin',
      passwordHash: await hashPassword('correct-pw'),
      mustChangePassword: false,
    })
    let caught: unknown
    try {
      await login(null, formData({ employeeId: 'ABC-0005', password: 'correct-pw', next: 'https://evil.com' }))
    } catch (err) {
      caught = err
    }
    const digest = (caught as { digest?: string }).digest ?? ''
    expect(digest.split(';')[2]).toBe('/admin')
  })

  // Browsers resolve a leading '/\\' as protocol-relative — new URL('/\\evil.com', origin).href
  // is 'https://evil.com/' — so a next value starting with '/' but containing a backslash must be
  // rejected the same as an explicit '//evil.com'.
  it('ignores a backslash-variant next and falls back to the role default (/scan)', async () => {
    await db.insert(employees).values({
      employeeId: 'ABC-0008',
      name: 'Backslash Variant',
      role: 'employee',
      passwordHash: await hashPassword('correct-pw'),
      mustChangePassword: false,
    })
    let caught: unknown
    try {
      await login(null, formData({ employeeId: 'ABC-0008', password: 'correct-pw', next: '/\\evil.com' }))
    } catch (err) {
      caught = err
    }
    const digest = (caught as { digest?: string }).digest ?? ''
    expect(digest.split(';')[2]).toBe('/scan')
  })

  it('rate-limits login attempts per employee ID after 10 failures', async () => {
    await db.insert(employees).values({
      employeeId: 'RLT-0001',
      name: 'Rate Limited',
      passwordHash: await hashPassword('correct-pw'),
      mustChangePassword: false,
    })
    const results: Array<{ error?: string } | undefined> = []
    for (let i = 0; i < 11; i++) {
      results.push(await login(null, formData({ employeeId: 'RLT-0001', password: 'wrong-pw' })))
    }
    for (let i = 0; i < 10; i++) {
      expect(results[i]).toEqual({ error: 'Invalid ID or password' })
    }
    expect(results[10]).toEqual({ error: 'Too many attempts. Try again in 15 minutes.' })
  })

  it('happy path: employee role redirects to /scan and sets a valid session cookie', async () => {
    const [emp] = await db.insert(employees).values({
      employeeId: 'ABC-0006',
      name: 'Happy Employee',
      role: 'employee',
      passwordHash: await hashPassword('correct-pw'),
      mustChangePassword: false,
    }).returning()
    let caught: unknown
    try {
      await login(null, formData({ employeeId: 'ABC-0006', password: 'correct-pw' }))
    } catch (err) {
      caught = err
    }
    const digest = (caught as { digest?: string }).digest ?? ''
    expect(digest.split(';')[2]).toBe('/scan')

    const cookie = cookieStore.get('ino_session')
    expect(cookie).toBeDefined()
    const payload = await verifySessionToken(cookie!.value)
    expect(payload).toEqual({ pk: emp.id, role: 'employee', tv: emp.tokenVersion, mcp: false })
  })

  it('happy path: admin role redirects to /admin and sets a valid session cookie', async () => {
    const [emp] = await db.insert(employees).values({
      employeeId: 'ABC-0007',
      name: 'Happy Admin',
      role: 'admin',
      passwordHash: await hashPassword('correct-pw'),
      mustChangePassword: false,
    }).returning()
    let caught: unknown
    try {
      await login(null, formData({ employeeId: 'ABC-0007', password: 'correct-pw' }))
    } catch (err) {
      caught = err
    }
    const digest = (caught as { digest?: string }).digest ?? ''
    expect(digest.split(';')[2]).toBe('/admin')

    const cookie = cookieStore.get('ino_session')
    expect(cookie).toBeDefined()
    const payload = await verifySessionToken(cookie!.value)
    expect(payload).toEqual({ pk: emp.id, role: 'admin', tv: emp.tokenVersion, mcp: false })
  })
})

describe('changePassword action', () => {
  it('rejects a password shorter than 8 characters', async () => {
    const [emp] = await db.insert(employees).values({
      employeeId: 'CPW-0001',
      name: 'Needs Change',
      passwordHash: await hashPassword('temp-pw'),
      mustChangePassword: true,
    }).returning()
    cookieStore.set(SESSION_COOKIE, { value: await signSessionToken({ pk: emp.id, role: emp.role, tv: emp.tokenVersion, mcp: true }) })

    const result = await changePassword(null, formData({ password: 'short1', confirm: 'short1' }))
    expect(result).toEqual({ error: 'Password must be at least 8 characters.' })
  })

  it('rejects when the confirmation does not match', async () => {
    const [emp] = await db.insert(employees).values({
      employeeId: 'CPW-0002',
      name: 'Needs Change',
      passwordHash: await hashPassword('temp-pw'),
      mustChangePassword: true,
    }).returning()
    cookieStore.set(SESSION_COOKIE, { value: await signSessionToken({ pk: emp.id, role: emp.role, tv: emp.tokenVersion, mcp: true }) })

    const result = await changePassword(null, formData({ password: 'longenough1', confirm: 'different1' }))
    expect(result).toEqual({ error: 'Passwords do not match.' })
  })

  it('happy path: bumps token_version, clears mustChangePassword, and redirects an employee to /scan with a fresh cookie', async () => {
    const [emp] = await db.insert(employees).values({
      employeeId: 'CPW-0003',
      name: 'Needs Change',
      role: 'employee',
      passwordHash: await hashPassword('temp-pw'),
      mustChangePassword: true,
    }).returning()
    const oldTv = emp.tokenVersion
    cookieStore.set(SESSION_COOKIE, { value: await signSessionToken({ pk: emp.id, role: emp.role, tv: oldTv, mcp: true }) })

    let caught: unknown
    try {
      await changePassword(null, formData({ password: 'new-password-1', confirm: 'new-password-1' }))
    } catch (err) {
      caught = err
    }
    const digest = (caught as { digest?: string }).digest ?? ''
    expect(digest.split(';')[2]).toBe('/scan')

    const [updated] = await db.select().from(employees).where(eq(employees.id, emp.id))
    expect(updated.mustChangePassword).toBe(false)
    expect(updated.tokenVersion).toBe(oldTv + 1)

    const cookie = cookieStore.get(SESSION_COOKIE)
    expect(cookie).toBeDefined()
    const payload = await verifySessionToken(cookie!.value)
    expect(payload).toEqual({ pk: emp.id, role: 'employee', tv: oldTv + 1, mcp: false })
  })

  it('happy path: redirects an admin to /admin', async () => {
    const [emp] = await db.insert(employees).values({
      employeeId: 'CPW-0004',
      name: 'Needs Change',
      role: 'admin',
      passwordHash: await hashPassword('temp-pw'),
      mustChangePassword: true,
    }).returning()
    cookieStore.set(SESSION_COOKIE, { value: await signSessionToken({ pk: emp.id, role: emp.role, tv: emp.tokenVersion, mcp: true }) })

    let caught: unknown
    try {
      await changePassword(null, formData({ password: 'new-password-1', confirm: 'new-password-1' }))
    } catch (err) {
      caught = err
    }
    const digest = (caught as { digest?: string }).digest ?? ''
    expect(digest.split(';')[2]).toBe('/admin')
  })

  it('invalidates sessions signed with the pre-change token_version', async () => {
    const [emp] = await db.insert(employees).values({
      employeeId: 'CPW-0005',
      name: 'Needs Change',
      role: 'employee',
      passwordHash: await hashPassword('temp-pw'),
      mustChangePassword: true,
    }).returning()
    const oldTv = emp.tokenVersion
    cookieStore.set(SESSION_COOKIE, { value: await signSessionToken({ pk: emp.id, role: emp.role, tv: oldTv, mcp: true }) })

    try {
      await changePassword(null, formData({ password: 'new-password-1', confirm: 'new-password-1' }))
    } catch {
      // expected redirect
    }

    // A session token still carrying the pre-change token_version must be rejected.
    cookieStore.set(SESSION_COOKIE, { value: await signSessionToken({ pk: emp.id, role: emp.role, tv: oldTv, mcp: true }) })
    const stale = await requireDbSession()
    expect(stale).toBeNull()

    // The fresh cookie set by the action itself must still be valid.
    cookieStore.set(SESSION_COOKIE, { value: await signSessionToken({ pk: emp.id, role: emp.role, tv: oldTv + 1, mcp: false }) })
    const fresh = await requireDbSession()
    expect(fresh?.session.tv).toBe(oldTv + 1)
  })

  it('rejects a revoked (stale token_version) session cookie and leaves the password unchanged', async () => {
    const [emp] = await db.insert(employees).values({
      employeeId: 'CPW-0006',
      name: 'Revoked Session',
      role: 'employee',
      passwordHash: await hashPassword('temp-pw'),
      mustChangePassword: true,
    }).returning()
    // Sign a cookie at the current tv, then bump the DB row's tv underneath it (simulating an
    // admin-triggered password reset / revocation) so the cookie is now stale.
    cookieStore.set(SESSION_COOKIE, { value: await signSessionToken({ pk: emp.id, role: emp.role, tv: emp.tokenVersion, mcp: true }) })
    await db.update(employees).set({ tokenVersion: sql`${employees.tokenVersion} + 1` }).where(eq(employees.id, emp.id))

    let caught: unknown
    try {
      await changePassword(null, formData({ password: 'new-password-1', confirm: 'new-password-1' }))
    } catch (err) {
      caught = err
    }
    const digest = (caught as { digest?: string }).digest ?? ''
    expect(digest).toMatch(/^NEXT_REDIRECT;.*\/login/)

    const [row] = await db.select().from(employees).where(eq(employees.id, emp.id))
    expect(row.passwordHash).toBe(emp.passwordHash)
  })
})
