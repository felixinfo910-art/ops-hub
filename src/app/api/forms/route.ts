import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureDbInitialized } from '@/lib/prisma'

// GET /api/forms - List all forms
export async function GET() {
  try {
    await ensureDbInitialized()
    const forms = await prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { submissions: true } },
      },
    })
    return NextResponse.json({ success: true, data: forms })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch forms',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// POST /api/forms - Create a new form
export async function POST(req: NextRequest) {
  try {
    await ensureDbInitialized()
    const body = await req.json()
    const { name, description, fields, notifyEmail, styleTheme, successMessage } = body

    if (!name || !fields || !notifyEmail) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    const form = await prisma.form.create({
      data: {
        name,
        description: description || null,
        fields: typeof fields === 'string' ? fields : JSON.stringify(fields),
        notifyEmail,
        styleTheme: styleTheme || 'default',
        successMessage: successMessage || 'Thank you! We will contact you soon.',
      },
    })

    return NextResponse.json({ success: true, data: form }, { status: 201 })
  } catch (error) {
    console.error('Failed to create form:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to create form',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
