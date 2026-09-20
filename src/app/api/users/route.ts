import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, getAdminUsername, getAdminPassword } from '@/lib/auth'
import { getAuthUserAndScope } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const scope = await getAuthUserAndScope(request)

    if (!scope || (!scope.allowedMenus.includes('users') && scope.role !== 'super_admin' && scope.role !== 'company_admin')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

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
    
    // RBAC Overrides
    if (scope.role === 'super_admin') {
      if (companyId) {
        where.companyId = parseInt(companyId, 10)
      }
    } else if (scope.role === 'company_admin' || scope.companyId) {
      where.companyId = scope.companyId
      // A company admin or custom role shouldn't see system super admins
      where.role = { not: 'super_admin' }
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

export async function POST(request: NextRequest) {
  try {
    const scope = await getAuthUserAndScope(request)
    if (!scope || (!scope.allowedMenus.includes('users') && scope.role !== 'super_admin' && scope.role !== 'company_admin')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const body = await request.json()
    let { email, password, name, role, companyId, siteIds, allowedMenus } = body

    if (!email || !email.trim()) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: '密码长度至少为 6 位' }, { status: 400 })
    }

    // RBAC Security Overrides
    if (scope.allowedCompanyIds !== null) {
      // Bounded User (company_admin or custom role) can only create users under their own company
      companyId = scope.companyId
      // Ensure they don't elevate privileges
      if (role === 'super_admin') {
        role = scope.rawRole // Fallback to their own role, or company_admin
      }
    } else {
      // Super admin provides companyId manually. We parse it:
      companyId = companyId ? parseInt(companyId, 10) : null
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
        companyId: companyId as number | null,
        allowedMenus: Array.isArray(allowedMenus) ? JSON.stringify(allowedMenus) : "[]",
        sitePermissions: Array.isArray(siteIds) && siteIds.length > 0 ? {
          create: siteIds.map((item: any) => {
            if (typeof item === 'object' && item !== null) {
              return {
                websiteId: parseInt(item.websiteId, 10),
                canCreate: item.canCreate !== undefined ? Boolean(item.canCreate) : true,
                canRead: item.canRead !== undefined ? Boolean(item.canRead) : true,
                canUpdate: item.canUpdate !== undefined ? Boolean(item.canUpdate) : true,
                canDelete: item.canDelete !== undefined ? Boolean(item.canDelete) : false,
              }
            }
            return {
              websiteId: parseInt(item, 10),
              canCreate: true,
              canRead: true,
              canUpdate: true,
              canDelete: false
            }
          })
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
