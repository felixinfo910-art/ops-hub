import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureDbInitialized } from '@/lib/prisma'
import { getAuthUserAndScope } from '@/lib/rbac'

// PUT /api/companies/[id] - Update company
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDbInitialized()
    const scope = await getAuthUserAndScope(req)
    if (!scope || (!scope.allowedMenus.includes('companies') && scope.role !== 'super_admin')) {
      return NextResponse.json({ success: false, message: '权限不足，无权修改公司设置' }, { status: 403 })
    }

    const { id } = await params
    const companyId = parseInt(id, 10)
    if (isNaN(companyId)) {
      return NextResponse.json({ success: false, message: 'Invalid company ID' }, { status: 400 })
    }

    if (scope.allowedCompanyIds && !scope.allowedCompanyIds.includes(companyId)) {
      return NextResponse.json({ success: false, message: '越权操作：无权修改非本授权公司' }, { status: 403 })
    }

    const body = await req.json()
    const { name, status, defaultNotifyEmail, smtpConfig, feishuWebhook, dingtalkWebhook, customWebhookUrl } = body

    const existing = await prisma.company.findUnique({ where: { id: companyId } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 })
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(name && { name: name.trim() }),
        ...(status && { status }),
        ...(defaultNotifyEmail !== undefined && { defaultNotifyEmail: defaultNotifyEmail ? defaultNotifyEmail.trim() : null }),
        ...(smtpConfig !== undefined && { smtpConfig: smtpConfig ? JSON.stringify(smtpConfig) : null }),
        ...(feishuWebhook !== undefined && { feishuWebhook: feishuWebhook ? feishuWebhook.trim() : null }),
        ...(dingtalkWebhook !== undefined && { dingtalkWebhook: dingtalkWebhook ? dingtalkWebhook.trim() : null }),
        ...(customWebhookUrl !== undefined && { customWebhookUrl: customWebhookUrl ? customWebhookUrl.trim() : null }),
      }
    })

    return NextResponse.json({ success: true, company })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Update company failed' }, { status: 500 })
  }
}

// DELETE /api/companies/[id] - Delete company safely
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDbInitialized()
    const scope = await getAuthUserAndScope(req)
    if (!scope || (!scope.allowedMenus.includes('companies') && scope.role !== 'super_admin')) {
      return NextResponse.json({ success: false, message: '权限不足，仅超级管理员可删除公司' }, { status: 403 })
    }

    const { id } = await params
    const companyId = parseInt(id, 10)
    if (isNaN(companyId)) {
      return NextResponse.json({ success: false, message: 'Invalid company ID' }, { status: 400 })
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: { websites: true, users: true, forms: true }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 })
    }

    // Safety guard: Check if company has active websites, forms or users
    if ((company._count?.websites || 0) > 0 || (company._count?.users || 0) > 0) {
      return NextResponse.json({
        success: false,
        message: `无法删除：该公司名下仍有 ${company._count?.websites || 0} 个站点和 ${company._count?.users || 0} 个关联账号，请先迁移或清空关联资源`
      }, { status: 400 })
    }

    // Unlink forms and submissions before deleting company
    await prisma.formSubmission.updateMany({ where: { companyId }, data: { companyId: null } })
    await prisma.form.updateMany({ where: { companyId }, data: { companyId: null } })
    await prisma.company.delete({ where: { id: companyId } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Delete company failed' }, { status: 500 })
  }
}
