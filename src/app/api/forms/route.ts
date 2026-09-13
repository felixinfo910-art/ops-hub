import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/forms - List all forms
export async function GET() {
  try {
    const forms = await prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { submissions: true } },
      },
    })
    return NextResponse.json({ success: true, data: forms })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch forms' }, { status: 500 })
  }
}

// POST /api/forms - Create a new form
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, fields, notifyEmail, styleTheme, successMessage } = body

    if (!name || !fields || !notifyEmail) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    const form = await prisma.form.create({
      data: {
        name,
        description: description || null,
        fields: JSON.stringify(fields),
        notifyEmail,
        styleTheme: styleTheme || 'default',
        successMessage: successMessage || 'Thank you! We will contact you soon.',
      },
    })

    return NextResponse.json({ success: true, data: form }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to create form' }, { status: 500 })
  }
}
