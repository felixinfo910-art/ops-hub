import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureDbInitialized } from '@/lib/prisma'
import { getAuthUserAndScope } from '@/lib/rbac'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized()
    const scope = await getAuthUserAndScope(request)
    if (!scope || (scope.role !== 'super_admin' && scope.role !== 'company_admin')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const { id } = await params
    const groupId = parseInt(id, 10)
    const body = await request.json()
    const { name, description, allowedMenus, defaultCrud } = body

    const existing = await (prisma as any).permissionGroup.findUnique({ where: { id: groupId } })
    if (!existing) return NextResponse.json({ error: '权限组不存在' }, { status: 404 })

    if (scope.role === 'company_admin' && existing.companyId && existing.companyId !== scope.companyId) {
      return NextResponse.json({ error: '越权修改' }, { status: 403 })
    }

    const updated = await (prisma as any).permissionGroup.update({
      where: { id: groupId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        description: description !== undefined ? description.trim() : undefined,
        allowedMenus: Array.isArray(allowedMenus) ? JSON.stringify(allowedMenus) : undefined,
        defaultCrud: typeof defaultCrud === 'object' ? JSON.stringify(defaultCrud) : undefined
      }
    })

    return NextResponse.json({ success: true, group: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '更新权限组失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized()
    const scope = await getAuthUserAndScope(request)
    if (!scope || (scope.role !== 'super_admin' && scope.role !== 'company_admin')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const { id } = await params
    const groupId = parseInt(id, 10)

    const existing = await (prisma as any).permissionGroup.findUnique({ where: { id: groupId } })
    if (!existing) return NextResponse.json({ error: '权限组不存在' }, { status: 404 })

    if (scope.role === 'company_admin' && existing.companyId && existing.companyId !== scope.companyId) {
      return NextResponse.json({ error: '越权删除' }, { status: 403 })
    }

    await (prisma as any).permissionGroup.delete({ where: { id: groupId } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '删除权限组失败' }, { status: 500 })
  }
}
