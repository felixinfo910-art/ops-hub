import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id, 10)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
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
            websiteId: true,
            website: {
              select: { id: true, name: true, domain: true }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '获取用户详情失败' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id, 10)
    const body = await request.json()
    const { name, role, companyId, siteIds, isActive, password } = body

    const existingUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!existingUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // Protection for Default System Super Admin (admin@opshub.com)
    const isPrimarySuperAdmin = existingUser.email.toLowerCase() === 'admin@opshub.com'

    if (isPrimarySuperAdmin) {
      if (isActive === false) {
        return NextResponse.json({ error: '🔒 系统原生超级管理员受强制保护，无法禁用！' }, { status: 403 })
      }
      if (role && role !== 'super_admin') {
        return NextResponse.json({ error: '🔒 系统原生超级管理员角色不可更改或降级！' }, { status: 403 })
      }
    }

    const data: any = {}
    if (name !== undefined) data.name = name ? name.trim() : null
    if (role !== undefined) data.role = isPrimarySuperAdmin ? 'super_admin' : role
    if (companyId !== undefined) data.companyId = isPrimarySuperAdmin ? null : (companyId ? parseInt(companyId, 10) : null)
    if (isActive !== undefined) data.isActive = isPrimarySuperAdmin ? true : Boolean(isActive)

    if (password && password.trim().length >= 6) {
      data.passwordHash = await hashPassword(password.trim())
    }

    // Handle site permissions update
    if (Array.isArray(siteIds) && !isPrimarySuperAdmin) {
      await prisma.userWebsitePermission.deleteMany({
        where: { userId }
      })

      if (siteIds.length > 0) {
        await prisma.userWebsitePermission.createMany({
          data: siteIds.map((sid: number) => ({
            userId,
            websiteId: parseInt(sid as any, 10)
          }))
        })
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        isActive: true,
        createdAt: true
      }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '更新用户信息失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id, 10)

    const existingUser = await prisma.user.findUnique({ where: { id: userId } })
    if (existingUser && existingUser.email.toLowerCase() === 'admin@opshub.com') {
      return NextResponse.json({ error: '🔒 系统原生超级管理员受强制保护，严禁删除！' }, { status: 403 })
    }

    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '删除用户失败' }, { status: 500 })
  }
}
