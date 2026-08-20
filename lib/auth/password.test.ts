import { describe, it, expect } from 'vitest'
import { EMPLOYEE_ID_RE, generateTempPassword, hashPassword, verifyPassword } from './password'

describe('employee id', () => {
  it('accepts XX-0000 and XXX-0000 shapes only', () => {
    expect(EMPLOYEE_ID_RE.test('ABC-0000')).toBe(true)
    expect(EMPLOYEE_ID_RE.test('AB-0000')).toBe(true)
    expect(EMPLOYEE_ID_RE.test('XYZ-9999')).toBe(true)
    for (const bad of ['abc-0000', 'A-0000', 'ABCD-0000', 'ABC-000', 'ABC-00000', 'ABC0000', 'ABC-00a0', ' ABC-0000']) {
      expect(EMPLOYEE_ID_RE.test(bad)).toBe(false)
    }
  })
})
describe('temp password', () => {
  it('is XXXX-XXXX from unambiguous charset', () => {
    for (let i = 0; i < 50; i++) {
      const p = generateTempPassword()
      expect(p).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)
      expect(p).not.toMatch(/[0O1IL]/)
    }
  })
})
describe('argon2', () => {
  it('hashes and verifies', async () => {
    const h = await hashPassword('s3cret-pw')
    expect(h).toMatch(/^\$argon2id\$/)
    expect(await verifyPassword(h, 's3cret-pw')).toBe(true)
    expect(await verifyPassword(h, 'wrong')).toBe(false)
  })
})
