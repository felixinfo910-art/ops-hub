import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/submissions - Get all submissions with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const submissions = await prisma.formSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { form: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ success: true, data: submissions })
  } catch (error) {
    console.error('Failed to fetch submissions:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch submissions' }, { status: 500 })
  }
}
