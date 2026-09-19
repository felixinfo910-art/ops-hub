import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserAndScope } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100')
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

    const submissions = await prisma.formSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        form: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        website: { select: { id: true, name: true, domain: true } }
      },
    })

    return NextResponse.json({ success: true, data: submissions })
  } catch (error) {
    console.error('Failed to fetch submissions:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch submissions' }, { status: 500 })
  }
}
