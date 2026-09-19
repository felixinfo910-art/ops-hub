import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureDbInitialized } from '@/lib/prisma'
import { getAuthUserAndScope } from '@/lib/rbac'

// GET /api/forms - List forms filtered by company & website & user RBAC scope
export async function GET(req: NextRequest) {
  try {
    await ensureDbInitialized()
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const websiteId = searchParams.get('websiteId')
    const scope = await getAuthUserAndScope(req)

    const where: any = {}
    if (companyId) where.companyId = parseInt(companyId, 10)
    if (websiteId) where.websiteId = parseInt(websiteId, 10)

    if (scope) {
      if (scope.role === 'company_admin' && scope.companyId) {
        where.companyId = scope.companyId
      } else if (scope.allowedWebsiteIds !== null) {
        where.websiteId = { in: scope.allowedWebsiteIds }
      }
    }

    const forms = await prisma.form.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        website: { select: { id: true, name: true, domain: true } },
        _count: { select: { submissions: true } },
      },
    })
    return NextResponse.json({ success: true, data: forms })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch forms',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// POST /api/forms - Create a new form
export async function POST(req: NextRequest) {
  try {
    await ensureDbInitialized()
    const scope = await getAuthUserAndScope(req)
    if (scope && scope.role === 'viewer') {
      return NextResponse.json({ success: false, message: '只读权限账号无法创建表单' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      description,
      fields,
      notifyEmail,
      styleTheme,
      successMessage,
      companyId,
      websiteId,
      autoReplyEnabled,
      autoReplySubject,
      autoReplyBody,
      autoReplyCatalogUrl
    } = body

    if (!name || !fields) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    const parsedCompanyId = companyId && !isNaN(parseInt(companyId, 10)) ? parseInt(companyId, 10) : null
    const parsedWebsiteId = websiteId && !isNaN(parseInt(websiteId, 10)) ? parseInt(websiteId, 10) : null

    const form = await prisma.form.create({
      data: {
        name,
        companyId: parsedCompanyId,
        websiteId: parsedWebsiteId,
        description: description || null,
        fields: typeof fields === 'string' ? fields : JSON.stringify(fields),
        notifyEmail: notifyEmail || '',
        styleTheme: styleTheme || 'default',
        successMessage: successMessage || 'Thank you! We will contact you soon.',
        autoReplyEnabled: Boolean(autoReplyEnabled),
        autoReplySubject: autoReplySubject ? String(autoReplySubject).trim() : null,
        autoReplyBody: autoReplyBody ? String(autoReplyBody).trim() : null,
        autoReplyCatalogUrl: autoReplyCatalogUrl ? String(autoReplyCatalogUrl).trim() : null,
      },
    })

    return NextResponse.json({ success: true, data: form }, { status: 201 })
  } catch (error) {
    console.error('Failed to create form:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to create form',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
