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

  // Route protection is handled by APIs and Client UI checking allowedMenus dynamically
  // But strictly enforce domain-level role isolation:
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const host = rawHost.toLowerCase()
  
  if (isValid && sessionCookie) {
    const payload = parseSessionPayload(sessionCookie.value)
    if (payload) {
      const isInternalOps = payload.companyId === null || payload.companyId === undefined
      
      if ((host.startsWith('ops.') || host.includes('ops.dtafac.com')) && !isInternalOps) {
         // Prevent client accounts from entering the ops domain
         return NextResponse.redirect(new URL('/api/auth/logout', request.url))
      }
      if ((host.startsWith('tools.') || host.includes('tools.dtafac.com')) && isInternalOps && payload.role !== 'super_admin') {
        // Normal internal staff shouldn't log into client portal either.
        return NextResponse.redirect(new URL('/api/auth/logout', request.url))
      }
    }
  }
  // Middleware only ensures the user is logged in
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
