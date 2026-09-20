import { NextRequest, NextResponse } from 'next/server'
import { inspectWebsite, inspectAllWebsites } from '@/lib/monitor'
import { getAuthUserAndScope } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

// POST /api/sites/inspect - Trigger site health inspection
export async function POST(req: NextRequest) {
  try {
    const scope = await getAuthUserAndScope(req)
    if (!scope || !scope.allowedMenus.includes('sites')) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { websiteId, domain } = body

    if (websiteId && domain) {
      const site = await prisma.website.findUnique({ where: { id: parseInt(websiteId, 10) } })
      if (!site) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
      if (scope.allowedCompanyIds && !scope.allowedCompanyIds.includes(site.companyId)) {
        return NextResponse.json({ success: false, message: '越权操作' }, { status: 403 })
      }
      const result = await inspectWebsite(parseInt(websiteId, 10), domain)
      return NextResponse.json({ success: true, data: result })
    }

    // Inspect all sites - limit by company if restricted
    if (scope.allowedCompanyIds) {
      return NextResponse.json({ success: false, message: '全网巡检需要超级管理员权限' }, { status: 403 })
    }



    // Inspect all sites
    const results = await inspectAllWebsites()
    return NextResponse.json({ success: true, count: results.length })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Inspection failed' }, { status: 500 })
  }
}
