import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserAndScope } from '@/lib/rbac'

// DELETE /api/submissions/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getAuthUserAndScope(req)
    if (!scope || !scope.allowedMenus.includes('submissions')) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 })
    }

    const { id } = await params
    const submission = await prisma.formSubmission.findUnique({
      where: { id: parseInt(id) }
    })
    
    if (!submission) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    
    if (scope.allowedCompanyIds && submission.companyId && !scope.allowedCompanyIds.includes(submission.companyId)) {
      return NextResponse.json({ success: false, message: '越权操作' }, { status: 403 })
    }

    await prisma.formSubmission.delete({
      where: { id: parseInt(id) },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete submission:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete submission' }, { status: 500 })
  }
}
