import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, createSessionToken, getAdminUsername, getAdminPassword } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    const expectedUsername = getAdminUsername()
    const expectedPassword = getAdminPassword()

    const inputUser = (username || '').trim().toLowerCase()
    const expUser = expectedUsername.trim().toLowerCase()

    if (inputUser !== expUser || password !== expectedPassword) {
      return NextResponse.json({ error: '账号或密码错误，请重试' }, { status: 401 })
    }

    const token = await createSessionToken(expectedUsername, expectedPassword)

    const response = NextResponse.json({ success: true })
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '登录异常' }, { status: 500 })
  }
}
