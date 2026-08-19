import { SignJWT, jwtVerify } from 'jose'

export type SessionPayload = { pk: number; role: 'employee' | 'admin'; tv: number; mcp: boolean }
export const SESSION_COOKIE = 'ino_session'
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET!)

export async function signSessionToken(p: SessionPayload): Promise<string> {
  return new SignJWT({ ...p }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(secret())
}
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return { pk: payload.pk as number, role: payload.role as SessionPayload['role'], tv: payload.tv as number, mcp: payload.mcp as boolean }
  } catch { return null }
}
