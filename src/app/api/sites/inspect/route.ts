import { NextRequest, NextResponse } from 'next/server'
import { inspectWebsite, inspectAllWebsites } from '@/lib/monitor'

// POST /api/sites/inspect - Trigger site health inspection
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { websiteId, domain } = body

    if (websiteId && domain) {
      const result = await inspectWebsite(parseInt(websiteId, 10), domain)
      return NextResponse.json({ success: true, data: result })
    }

    // Inspect all sites
    const results = await inspectAllWebsites()
    return NextResponse.json({ success: true, count: results.length })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Inspection failed' }, { status: 500 })
  }
}
