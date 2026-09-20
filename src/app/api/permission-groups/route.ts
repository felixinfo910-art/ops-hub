import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureDbInitialized } from '@/lib/prisma'
import { getAuthUserAndScope } from '@/lib/rbac'

const SYSTEM_ROLES = [
  {
    name: '超级管理员',
    description: '系统内置角色：全平台最高控制全权',
    allowedMenus: JSON.stringify(['submissions', 'forms', 'sites', 'companies', 'users', 'seo'])
  },
  {
    name: '公司管理员',
    description: '系统内置角色：拥有本公司所有独立站管理与账号权',
    allowedMenus: JSON.stringify(['submissions', 'forms', 'sites', 'users', 'seo'])
  },
  {
    name: '站点管理员',
    description: '系统内置角色：跨公司指派 1~N 个独立站管辖权',
    allowedMenus: JSON.stringify(['submissions', 'forms', 'sites', 'seo'])
  },
  {
    name: '数据观察员',
    description: '系统内置角色：仅开放【询盘记录】菜单，只读跟进询盘',
    allowedMenus: JSON.stringify(['submissions'])
  }
]

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const scope = await getAuthUserAndScope(request)
    if (!scope) return NextResponse.json({ error: '未登录' }, { status: 401 })

    // Ensure system built-in roles exist in database
    for (const sr of SYSTEM_ROLES) {
      const exists = await (prisma as any).permissionGroup.findFirst({
        where: { name: sr.name }
      })
      if (!exists) {
        await (prisma as any).permissionGroup.create({ data: sr })
      }
    }

    const where: any = {}
    if (scope.role === 'company_admin' && scope.companyId) {
      where.OR = [
        { companyId: scope.companyId },
        { companyId: null }
      ]
    }

    const groups = await (prisma as any).permissionGroup.findMany({
      where,
      orderBy: { id: 'asc' }
    })

    return NextResponse.json({ success: true, groups })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '获取角色列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const scope = await getAuthUserAndScope(request)
    if (!scope || (scope.role !== 'super_admin' && scope.role !== 'company_admin')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, allowedMenus, defaultCrud, companyId } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '角色名称不能为空' }, { status: 400 })
    }

    const targetCompanyId = scope.role === 'company_admin'
      ? scope.companyId
      : (companyId ? parseInt(companyId, 10) : null)

    const group = await (prisma as any).permissionGroup.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        companyId: targetCompanyId,
        allowedMenus: Array.isArray(allowedMenus) ? JSON.stringify(allowedMenus) : '[]',
        defaultCrud: typeof defaultCrud === 'object' ? JSON.stringify(defaultCrud) : defaultCrud
      }
    })

    return NextResponse.json({ success: true, group })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '创建角色组失败' }, { status: 500 })
  }
}
