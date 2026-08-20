import { hash, verify } from '@node-rs/argon2'
import { randomInt } from 'node:crypto'

export const EMPLOYEE_ID_RE = /^[A-Z]{2,3}-[0-9]{4}$/

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
export function generateTempPassword(): string {
  const block = () => Array.from({ length: 4 }, () => CHARSET[randomInt(CHARSET.length)]).join('')
  return `${block()}-${block()}`
}
export function hashPassword(pw: string): Promise<string> {
  return hash(pw)
}
export async function verifyPassword(hashed: string, pw: string): Promise<boolean> {
  try { return await verify(hashed, pw) } catch { return false }
}
