import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/forms/[id]/submissions
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
