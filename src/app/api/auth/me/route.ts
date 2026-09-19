import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME, parseSessionPayload, getAdminUsername, getExpectedToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME)
    const token = sessionCookie?.value

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const payload = parseSessionPayload(token)
    if (payload) {
      return NextResponse.json({
        authenticated: true,
        user: payload
      })
    }

    // Check legacy token
    const legacyToken = await getExpectedToken()
    if (token === legacyToken) {
      return NextResponse.json({
        authenticated: true,
        user: {
          userId: 0,
          email: 'admin@opshub.com',
          name: 'Super Admin',
          role: 'super_admin',
          companyId: null
        }
      })
    }

    return NextResponse.json({ authenticated: false }, { status: 401 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
