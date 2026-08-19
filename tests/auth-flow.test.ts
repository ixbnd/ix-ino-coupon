import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth/password'

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
})
