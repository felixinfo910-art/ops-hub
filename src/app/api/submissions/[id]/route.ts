import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE /api/submissions/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.formSubmission.delete({
      where: { id: parseInt(id) },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete submission:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete submission' }, { status: 500 })
  }
}
