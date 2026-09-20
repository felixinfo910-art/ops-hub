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

    if (!scope) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const where: any = {}
    
    // Strict RBAC Data Override Layer
    if (scope.role === 'super_admin') {
      if (companyId) where.companyId = parseInt(companyId, 10)
      if (websiteId) where.websiteId = parseInt(websiteId, 10)
    } else if (scope.allowedWebsiteIds === null) {
      if (scope.companyId) where.companyId = scope.companyId
      if (websiteId) where.websiteId = parseInt(websiteId, 10)
    } else {
      const allowed = scope.allowedWebsiteIds || []
      where.websiteId = { in: allowed }

      if (websiteId) {
        const reqId = parseInt(websiteId, 10)
        if (allowed.includes(reqId)) {
          where.websiteId = reqId
        } else {
          return NextResponse.json({ success: false, message: 'Forbidden: Cannot access this data' }, { status: 403 })
        }
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
