import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, getAdminUsername, getAdminPassword } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    const count = await prisma.user.count()
    if (count === 0) {
      // Auto seed default super admin
      const hashed = await hashPassword(getAdminPassword())
      await prisma.user.create({
        data: {
          email: 'admin@opshub.com',
          name: '超级管理员 (admin)',
          passwordHash: hashed,
          role: 'super_admin',
          isActive: true
        }
      })
    }

    const where: any = {}
    if (companyId) {
      where.companyId = parseInt(companyId, 10)
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        companyId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        company: {
          select: { id: true, name: true }
        },
        sitePermissions: {
          select: {
            website: {
              select: { id: true, name: true, domain: true }
            }
          }
        }
      }
    })
    return NextResponse.json({ success: true, users })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '获取用户列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, role, companyId, siteIds } = body

    if (!email || !email.trim()) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: '密码长度至少为 6 位' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    })
    if (existing) {
      return NextResponse.json({ error: '该邮箱已被占用' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        name: name ? name.trim() : null,
        role: role || 'company_admin',
        companyId: companyId ? parseInt(companyId, 10) : null,
        sitePermissions: Array.isArray(siteIds) && siteIds.length > 0 ? {
          create: siteIds.map((sid: number) => ({
            websiteId: parseInt(sid as any, 10)
          }))
        } : undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        createdAt: true
      }
    })

    return NextResponse.json({ success: true, user })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '创建用户失败' }, { status: 500 })
  }
}
