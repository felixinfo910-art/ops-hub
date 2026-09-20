import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserAndScope } from '@/lib/rbac'

// PUT /api/submissions/[id]/status
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getAuthUserAndScope(req)
    if (!scope || !scope.allowedMenus.includes('submissions')) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 })
    }

    const { id } = await params
    const subId = parseInt(id, 10)
    if (isNaN(subId)) {
      return NextResponse.json({ success: false, message: 'Invalid submission ID' }, { status: 400 })
    }

    const submission = await prisma.formSubmission.findUnique({
      where: { id: subId }
    })
    
    if (!submission) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    
    if (scope.allowedCompanyIds && submission.companyId && !scope.allowedCompanyIds.includes(submission.companyId)) {
      return NextResponse.json({ success: false, message: '越权操作' }, { status: 403 })
    }

    const body = await req.json()
    const { status, notes } = body

    const updated = await prisma.formSubmission.update({
      where: { id: subId },
      data: {
        status: status || undefined,
        notes: notes !== undefined ? notes : undefined
      }
    })

    return NextResponse.json({ success: true, submission: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Status update failed' }, { status: 500 })
  }
}
