import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureDbInitialized } from '@/lib/prisma'
import { sendEmail, buildSubmissionEmail } from '@/lib/email'
import { FormField } from '@/lib/form-renderer'

// POST /api/public/submit
// Called by form submission from any WordPress site
export async function POST(req: NextRequest) {
  try {
    await ensureDbInitialized()
    const body = await req.json()
    const { form_id, page_url, referrer, utm_source, utm_medium, utm_campaign, utm_keyword, ...formData } = body

    if (!form_id) {
      return NextResponse.json({ success: false, message: 'Missing form_id' }, { status: 400 })
    }

    const form = await prisma.form.findUnique({
      where: { id: parseInt(form_id), isActive: true },
    })

    if (!form) {
      return NextResponse.json({ success: false, message: 'Form not found' }, { status: 404 })
    }

    // Get IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    const userAgent = req.headers.get('user-agent') || ''

    // Save submission to database
    await prisma.formSubmission.create({
      data: {
        formId: parseInt(form_id),
        data: JSON.stringify(formData),
        ip,
        userAgent,
        pageUrl: page_url || null,
        referrer: referrer || null,
        utmSource: utm_source || null,
        utmMedium: utm_medium || null,
        utmCampaign: utm_campaign || null,
        utmKeyword: utm_keyword || null,
      },
    })

    // Build human-readable labels from field config
    const fields: FormField[] = JSON.parse(form.fields)
    const labeledData: Record<string, string> = {}
    fields.forEach(field => {
      if (formData[field.id] !== undefined) {
        labeledData[field.label] = formData[field.id]
      }
    })
    // Include any extra fields not in config
    Object.keys(formData).forEach(key => {
      if (!fields.find(f => f.id === key)) {
        labeledData[key] = formData[key]
      }
    })

    // Send email notification
    const emailHtml = buildSubmissionEmail(form.name, labeledData, {
      ip,
      pageUrl: page_url,
      referrer,
      utmSource: utm_source,
      utmKeyword: utm_keyword,
      userAgent,
    })

    await sendEmail({
      to: form.notifyEmail,
      subject: `[OpsHub] 新询盘 - ${form.name}`,
      html: emailHtml,
    })

    return NextResponse.json({
      success: true,
      message: form.successMessage,
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    console.error('Submit error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error, please try again.' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
