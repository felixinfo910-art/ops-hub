import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserAndScope } from '@/lib/rbac'

// GET /api/forms/[id]/submissions
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getAuthUserAndScope(req)
    if (!scope || !scope.allowedMenus.includes('submissions')) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 })
    }

    const { id } = await params
    const formId = parseInt(id)
    
    // Bounds checking
    const form = await prisma.form.findUnique({ where: { id: formId } })
    if (form && scope.allowedCompanyIds && form.companyId && !scope.allowedCompanyIds.includes(form.companyId)) {
      return NextResponse.json({ success: false, message: '越权操作' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where: { formId: parseInt(id) },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.formSubmission.count({ where: { formId: parseInt(id) } }),
    ])

    return NextResponse.json({
      success: true,
      data: submissions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch submissions' }, { status: 500 })
  }
}
