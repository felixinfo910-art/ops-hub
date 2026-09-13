import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/forms/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const form = await prisma.form.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { submissions: true } } },
    })
    if (!form) return NextResponse.json({ success: false, message: 'Form not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: form })
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch form' }, { status: 500 })
  }
}

// PUT /api/forms/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, description, fields, notifyEmail, styleTheme, styleConfig, customCss, successMessage, isActive } = body

    const form = await prisma.form.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(fields !== undefined && { fields: typeof fields === 'string' ? fields : JSON.stringify(fields) }),
        ...(notifyEmail !== undefined && { notifyEmail }),
        ...(styleTheme !== undefined && { styleTheme }),
        ...(styleConfig !== undefined && { styleConfig: typeof styleConfig === 'string' ? styleConfig : JSON.stringify(styleConfig) }),
        ...(customCss !== undefined && { customCss }),
        ...(successMessage !== undefined && { successMessage }),
        ...(isActive !== undefined && { isActive }),
      },
    })
    return NextResponse.json({ success: true, data: form })
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to update form' }, { status: 500 })
  }
}

// DELETE /api/forms/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.formSubmission.deleteMany({ where: { formId: parseInt(id) } })
    await prisma.form.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to delete form' }, { status: 500 })
  }
}
