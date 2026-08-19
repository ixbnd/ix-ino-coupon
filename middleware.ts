import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth/token'

const PUBLIC = ['/login']

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) {
    const url = new URL('/login', req.url)
    url.searchParams.set('next', pathname + search)
    return NextResponse.redirect(url)
  }
  if (session.mcp && pathname !== '/change-password') return NextResponse.redirect(new URL('/change-password', req.url))
  return NextResponse.next()
}
export const config = { matcher: ['/((?!_next|favicon.ico|api/health).*)'] }
