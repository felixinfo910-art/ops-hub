import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME, parseSessionPayload } from '@/lib/auth'
import { getAuthUserAndScope } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const scope = await getAuthUserAndScope(request)
    if (scope) {
      const cookieStore = await cookies()
      const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME)
      const payload = parseSessionPayload(sessionCookie?.value)

      return NextResponse.json({
        authenticated: true,
        user: {
          userId: scope.userId,
          role: scope.role,
          rawRole: scope.rawRole,
          companyId: scope.companyId,
          allowedMenus: scope.allowedMenus,
          email: payload?.email || 'admin@opshub.com',
          name: payload?.name || payload?.email || '管理员'
        }
      })
    }

    return NextResponse.json({ authenticated: false })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
