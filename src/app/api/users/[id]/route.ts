import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { getAuthUserAndScope } from '@/lib/rbac'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await getAuthUserAndScope(request)
    if (!scope || (scope.role !== 'super_admin' && scope.role !== 'company_admin')) return NextResponse.json({ error: '权限不足' }, { status: 403 })

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
        allowedMenus: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        company: {
          select: { id: true, name: true }
        },
        sitePermissions: {
          select: {
            canCreate: true,
            canRead: true,
            canUpdate: true,
            canDelete: true,
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

    if (scope.role === 'company_admin' && (user.companyId !== scope.companyId || user.role === 'super_admin')) {
      return NextResponse.json({ error: '越权访问' }, { status: 403 })
    }

    return NextResponse.json({ success: true, user })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '获取用户详情失败' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await getAuthUserAndScope(request)
    if (!scope || (!scope.allowedMenus.includes('users') && scope.role !== 'super_admin' && scope.role !== 'company_admin')) return NextResponse.json({ error: '权限不足' }, { status: 403 })

    const { id } = await params
    const userId = parseInt(id, 10)
    const body = await request.json()
    let { name, role, companyId, siteIds, allowedMenus, isActive, password } = body

    const existingUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!existingUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    if (scope.allowedCompanyIds !== null && (existingUser.companyId !== scope.companyId || existingUser.role === 'super_admin')) {
      return NextResponse.json({ error: '越权操作' }, { status: 403 })
    }

    if (scope.allowedCompanyIds !== null) {
      companyId = scope.companyId
      if (role === 'super_admin') role = 'company_admin' // prevent escalation
    } else if (scope.role === 'super_admin') {
      companyId = companyId ? parseInt(companyId, 10) : null
    }

    // Protection for Default System Super Admin (admin@dtafac.com or opshub)
    const isPrimarySuperAdmin = existingUser.email.toLowerCase().includes('admin@') && existingUser.role === 'super_admin'

    if (isPrimarySuperAdmin) {
      if (isActive === false) return NextResponse.json({ error: '🔒 系统原生超级管理员受强制保护，无法禁用！' }, { status: 403 })
      if (role && role !== 'super_admin') return NextResponse.json({ error: '🔒 系统原生超级管理员角色不可更改或降级！' }, { status: 403 })
    }

    const data: any = {}
    if (name !== undefined) data.name = name ? name.trim() : null
    if (role !== undefined) data.role = isPrimarySuperAdmin ? 'super_admin' : role
    if (companyId !== undefined) data.companyId = isPrimarySuperAdmin ? null : companyId
    if (isActive !== undefined) data.isActive = isPrimarySuperAdmin ? true : Boolean(isActive)
    if (allowedMenus !== undefined) data.allowedMenus = Array.isArray(allowedMenus) ? JSON.stringify(allowedMenus) : "[]"

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
          data: siteIds.map((item: any) => {
            if (typeof item === 'object' && item !== null) {
              return {
                userId,
                websiteId: parseInt(item.websiteId, 10),
                canCreate: item.canCreate !== undefined ? Boolean(item.canCreate) : true,
                canRead: item.canRead !== undefined ? Boolean(item.canRead) : true,
                canUpdate: item.canUpdate !== undefined ? Boolean(item.canUpdate) : true,
                canDelete: item.canDelete !== undefined ? Boolean(item.canDelete) : false,
              }
            }
            return {
              userId,
              websiteId: parseInt(item, 10),
              canCreate: true,
              canRead: true,
              canUpdate: true,
              canDelete: false
            }
          })
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await getAuthUserAndScope(request)
    if (!scope || (!scope.allowedMenus.includes('users') && scope.role !== 'super_admin' && scope.role !== 'company_admin')) return NextResponse.json({ error: '权限不足' }, { status: 403 })

    const { id } = await params
    const userId = parseInt(id, 10)

    const existingUser = await prisma.user.findUnique({ where: { id: userId } })
    if (existingUser) {
      if (existingUser.email.toLowerCase().includes('admin@') && existingUser.role === 'super_admin') {
        return NextResponse.json({ error: '🔒 系统原生超级管理员受强制保护，严禁删除！' }, { status: 403 })
      }
      if (scope.role === 'company_admin' && (existingUser.companyId !== scope.companyId || existingUser.role === 'super_admin')) {
        return NextResponse.json({ error: '越权操作' }, { status: 403 })
      }
    }

    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '删除用户失败' }, { status: 500 })
  }
}
