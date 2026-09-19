import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/submissions/[id]/status
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const subId = parseInt(id, 10)
    if (isNaN(subId)) {
      return NextResponse.json({ success: false, message: 'Invalid submission ID' }, { status: 400 })
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
