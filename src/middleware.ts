import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME, isValidSessionToken, parseSessionPayload } from './lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes to allow without auth
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next()
  }

  // Verify authentication cookie
  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)
  const isValid = await isValidSessionToken(sessionCookie?.value)

  if (!sessionCookie || !isValid) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Parse session payload for RBAC path protection
  const payload = parseSessionPayload(sessionCookie.value)
  if (payload) {
    // Only super_admin or company_admin can access /companies
    if (pathname.startsWith('/companies') && payload.role !== 'super_admin' && payload.role !== 'company_admin') {
      const homeUrl = new URL('/', request.url)
      return NextResponse.redirect(homeUrl)
    }

    // Only super_admin or company_admin can manage users at /users
    if (pathname.startsWith('/users') && payload.role !== 'super_admin' && payload.role !== 'company_admin') {
      const homeUrl = new URL('/', request.url)
      return NextResponse.redirect(homeUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
