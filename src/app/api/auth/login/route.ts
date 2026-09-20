import { NextResponse } from 'next/server'
import { prisma, ensureDbInitialized } from '@/lib/prisma'
import { AUTH_COOKIE_NAME, serializeSessionPayload, hashPassword, getAdminUsername, getAdminPassword, createSessionToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    await ensureDbInitialized()
    const body = await request.json()
    const { username, password } = body

    const inputUser = (username || '').trim().toLowerCase()

    // 1. Check database users
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: inputUser },
          { name: inputUser },
          ...(inputUser === 'admin' ? [{ email: 'admin@opshub.com' }] : [])
        ]
      },
      include: { company: true }
    })

    // Legacy default admin check or fallback auto-seed
    const expectedUsername = getAdminUsername()
    const expectedPassword = getAdminPassword()

    if (!user && (inputUser === expectedUsername || inputUser === 'admin@opshub.com') && password === expectedPassword) {
      // Seed default Super Admin user
      const hashed = await hashPassword(expectedPassword)
      user = await prisma.user.create({
        data: {
          email: 'admin@opshub.com',
          name: '超级管理员 (admin)',
          passwordHash: hashed,
          role: 'super_admin',
          isActive: true
        },
        include: { company: true }
      })
    }

    if (!user) {
      if ((inputUser === expectedUsername || inputUser === 'admin@opshub.com') && password === expectedPassword) {
        const token = await createSessionToken(expectedUsername, expectedPassword)
        const response = NextResponse.json({ success: true, user: { role: 'super_admin', name: '超级管理员 (admin)' } })
        response.cookies.set({
          name: AUTH_COOKIE_NAME,
          value: token,
          httpOnly: true,
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? '.dtafac.com' : undefined,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
        })
        return response
      }
      return NextResponse.json({ error: '账号或密码错误，请重试' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: '该账号已被禁用，请联系管理员' }, { status: 403 })
    }

    // Verify password hash
    const inputHash = await hashPassword(password)
    if (user.passwordHash !== inputHash && password !== expectedPassword) {
      return NextResponse.json({ error: '账号或密码错误，请重试' }, { status: 401 })
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Create session token
    const token = serializeSessionPayload({
      userId: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      role: user.role as any,
      companyId: user.companyId,
      companyName: user.company?.name || null
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId
      }
    })

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.dtafac.com' : undefined,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })

    return response
  } catch (err: any) {
    console.error('Login error:', err)
    return NextResponse.json({ error: err.message || '登录异常' }, { status: 500 })
  }
}
