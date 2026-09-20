import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserAndScope } from '@/lib/rbac'

// GET /api/forms/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getAuthUserAndScope(req)
    if (!scope || !scope.allowedMenus.includes('forms')) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 })
    }

    const { id } = await params
    const form = await prisma.form.findUnique({
      where: { id: parseInt(id) },
      include: {
        company: { select: { id: true, name: true } },
        website: { select: { id: true, name: true, domain: true } },
        _count: { select: { submissions: true } }
      },
    })
    if (!form) return NextResponse.json({ success: false, message: 'Form not found' }, { status: 404 })
    
    if (scope.allowedCompanyIds && form.companyId && !scope.allowedCompanyIds.includes(form.companyId)) {
      return NextResponse.json({ success: false, message: '越权操作' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: form })
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch form' }, { status: 500 })
  }
}

// PUT /api/forms/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getAuthUserAndScope(req)
    if (!scope || !scope.allowedMenus.includes('forms')) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.form.findUnique({ where: { id: parseInt(id) } })
    if (!existing) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })

    if (scope.allowedCompanyIds && existing.companyId && !scope.allowedCompanyIds.includes(existing.companyId)) {
      return NextResponse.json({ success: false, message: '越权操作' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      description,
      fields,
      notifyEmail,
      styleTheme,
      styleConfig,
      customCss,
      successMessage,
      isActive,
      companyId,
      websiteId,
      autoReplyEnabled,
      autoReplySubject,
      autoReplyBody,
      autoReplyCatalogUrl
    } = body

    const form = await prisma.form.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(fields !== undefined && { fields: typeof fields === 'string' ? fields : JSON.stringify(fields) }),
        ...(notifyEmail !== undefined && { notifyEmail }),
        ...(styleTheme !== undefined && { styleTheme }),
        ...(styleConfig !== undefined && { styleConfig: typeof styleConfig === 'string' ? styleConfig : JSON.stringify(styleConfig) }),
        ...(customCss !== undefined && { customCss }),
        ...(successMessage !== undefined && { successMessage }),
        ...(isActive !== undefined && { isActive }),
        ...(companyId !== undefined && { companyId: companyId ? parseInt(companyId, 10) : null }),
        ...(websiteId !== undefined && { websiteId: websiteId ? parseInt(websiteId, 10) : null }),
        ...(autoReplyEnabled !== undefined && { autoReplyEnabled: Boolean(autoReplyEnabled) }),
        ...(autoReplySubject !== undefined && { autoReplySubject }),
        ...(autoReplyBody !== undefined && { autoReplyBody }),
        ...(autoReplyCatalogUrl !== undefined && { autoReplyCatalogUrl }),
      },
    })
    return NextResponse.json({ success: true, data: form })
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to update form' }, { status: 500 })
  }
}

// DELETE /api/forms/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getAuthUserAndScope(req)
    if (!scope || !scope.allowedMenus.includes('forms')) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.form.findUnique({ where: { id: parseInt(id) } })
    if (!existing) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })

    if (scope.allowedCompanyIds && existing.companyId && !scope.allowedCompanyIds.includes(existing.companyId)) {
      return NextResponse.json({ success: false, message: '越权操作' }, { status: 403 })
    }

    await prisma.formSubmission.deleteMany({ where: { formId: parseInt(id) } })
    await prisma.form.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to delete form' }, { status: 500 })
  }
}
