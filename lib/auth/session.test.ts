import { describe, it, expect, beforeAll } from 'vitest'
import { signSessionToken, verifySessionToken } from './session'

beforeAll(() => { process.env.SESSION_SECRET = 'test-secret-at-least-32-bytes-long!!' })

describe('session tokens', () => {
  it('round-trips the payload', async () => {
    const t = await signSessionToken({ pk: 7, role: 'admin', tv: 3, mcp: false })
    expect(await verifySessionToken(t)).toMatchObject({ pk: 7, role: 'admin', tv: 3, mcp: false })
  })
  it('rejects tampering and garbage', async () => {
    const t = await signSessionToken({ pk: 7, role: 'employee', tv: 0, mcp: true })
    expect(await verifySessionToken(t.slice(0, -2) + 'xx')).toBeNull()
    expect(await verifySessionToken('not-a-jwt')).toBeNull()
  })
})
