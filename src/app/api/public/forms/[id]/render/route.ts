import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { renderFormHTML, FormField } from '@/lib/form-renderer'

// GET /api/public/forms/[id]/render
// This is called by WordPress to get form HTML
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const form = await prisma.form.findUnique({
      where: { id: parseInt(id), isActive: true },
    })

    if (!form) {
      return new NextResponse('<p style="color:red;">Form not found or inactive.</p>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 404,
      })
    }

    const fields: FormField[] = JSON.parse(form.fields)
    const host = req.headers.get('host') || '192.168.10.116:3000'
    const protocol = req.headers.get('x-forwarded-proto') || 'http'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
    const submitEndpoint = `${appUrl}/api/public/submit`

    const html = renderFormHTML(
      form.id,
      form.name,
      fields,
      form.successMessage,
      form.styleTheme as 'default' | 'dark' | 'minimal',
      submitEndpoint
    )

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*', // Allow WordPress sites to fetch
        'Cache-Control': 'public, max-age=3600', // Cache 1 hour
      },
    })
  } catch {
    return new NextResponse('<p style="color:red;">Server error.</p>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 500,
    })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}
