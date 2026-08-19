import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth/password'
import { verifySessionToken } from '@/lib/auth/token'

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
