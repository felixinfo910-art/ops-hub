import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureDbInitialized } from '@/lib/prisma'
import { renderFormHTML, FormField } from '@/lib/form-renderer'

// GET /api/public/forms/[id]/render
// Render public form HTML with marketing tag injections
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDbInitialized()
    const { id } = await params
    const formId = parseInt(id, 10)
    if (isNaN(formId)) {
      return new NextResponse('<p style="color:red;">Invalid form ID.</p>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 400,
      })
    }

    const form = await prisma.form.findUnique({
      where: { id: formId, isActive: true },
      include: {
        website: true
      }
    })

    if (!form) {
      return new NextResponse('<p style="color:red;">Form not found or inactive.</p>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 404,
      })
    }

    const fields: FormField[] = JSON.parse(form.fields)
    const host = req.headers.get('host') || 'ops.dtafac.com'
    const protocol = req.headers.get('x-forwarded-proto') || 'https'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
    const submitEndpoint = `${appUrl}/api/public/submit`

    const isPreview = req.nextUrl.searchParams.get('preview') === '1'
    const tracking = form.website ? {
      ga4MeasurementId: form.website.ga4MeasurementId,
      fbPixelId: form.website.fbPixelId,
      gtmContainerId: form.website.gtmContainerId,
      customHeaderScript: form.website.customHeaderScript
    } : null

    const html = renderFormHTML(
      form.id,
      form.name,
      fields,
      form.successMessage,
      form.styleTheme as 'default' | 'dark' | 'minimal',
      submitEndpoint,
      form.styleConfig,
      form.customCss,
      isPreview,
      tracking
    )

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    console.error('Error rendering public form:', err)
    return new NextResponse('<p style="color:red;">Form render error.</p>', {
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
