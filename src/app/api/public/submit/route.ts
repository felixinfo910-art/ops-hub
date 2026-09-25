import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureDbInitialized } from '@/lib/prisma'
import { sendEmail, buildSubmissionEmail, SmtpConfig } from '@/lib/email'
import { FormField } from '@/lib/form-renderer'
import { dispatchWebhooks } from '@/lib/webhook'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// POST /api/public/submit
// Public submission endpoint for form submissions
export async function POST(req: NextRequest) {
  try {
    await ensureDbInitialized()
    const body = await req.json()
    const { form_id, site_key, page_url, referrer, utm_source, utm_medium, utm_campaign, utm_keyword, _hp_trap, ...formData } = body

    if (!form_id) {
      return NextResponse.json({ success: false, message: 'Missing form_id' }, { status: 400, headers: corsHeaders })
    }

    const form = await prisma.form.findUnique({
      where: { id: parseInt(form_id), isActive: true },
      include: {
        company: true,
        website: {
          include: { company: true }
        }
      }
    })

    if (!form) {
      return NextResponse.json({ success: false, message: 'Form not found or disabled' }, { status: 404, headers: corsHeaders })
    }

    // Resolve website entity
    let website = form.website
    if (!website && site_key) {
      website = await prisma.website.findUnique({
        where: { siteKey: site_key },
        include: { company: true }
      })
    }

    const companyId = form.companyId || website?.companyId || null
    const websiteId = form.websiteId || website?.id || null

    // Get Client IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    const userAgent = req.headers.get('user-agent') || ''

    // Anti-Spam Check 1: Silent Honeypot Trap
    let isSpam = false
    let spamReason: string | null = null

    if (_hp_trap && String(_hp_trap).trim() !== '') {
      isSpam = true
      spamReason = 'honeypot_trap'
    }

    // Anti-Spam Check 2: IP Blacklist Check
    if (!isSpam && website && website.blacklistedIps) {
      const blacklistedList = website.blacklistedIps.split(/[\n,，]/).map(i => i.trim()).filter(Boolean)
      if (blacklistedList.includes(ip)) {
        isSpam = true
        spamReason = 'ip_blacklisted'
      }
    }

    // Anti-Spam Check 3: Allowed Domains (CORS Origin Check)
    const reqOrigin = req.headers.get('origin') || req.headers.get('referer')
    if (!isSpam && website && website.allowedDomains && reqOrigin) {
      const allowedList = website.allowedDomains.split(/[\n,，]/).map(d => d.trim().toLowerCase()).filter(Boolean)
      const originHost = reqOrigin.replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
      const isAllowed = allowedList.some(allowed => {
        const allowedHost = allowed.replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
        return originHost === allowedHost || originHost.endsWith(`.${allowedHost}`)
      })
      if (!isAllowed) {
        isSpam = true
        spamReason = 'origin_disallowed'
      }
    }

    // Anti-Spam Check 4: IP Rate Limiting (Max 5 submissions / 60 seconds)
    if (!isSpam && ip !== 'unknown') {
      const sixtySecsAgo = new Date(Date.now() - 60 * 1000)
      const recentCount = await prisma.formSubmission.count({
        where: {
          ip,
          createdAt: { gte: sixtySecsAgo }
        }
      })
      if (recentCount >= 5) {
        isSpam = true
        spamReason = 'rate_limit'
      }
    }

    // Filter out honeypot trap from stored form data
    delete (formData as any)._hp_trap

    // Save submission to database
    const submission = await prisma.formSubmission.create({
      data: {
        formId: parseInt(form_id),
        companyId,
        websiteId,
        data: JSON.stringify(formData),
        ip,
        userAgent,
        pageUrl: page_url || null,
        referrer: referrer || null,
        utmSource: utm_source || null,
        utmMedium: utm_medium || null,
        utmCampaign: utm_campaign || null,
        utmKeyword: utm_keyword || null,
        isSpam,
        spamReason,
      },
    })

    // If Honeypot or Blacklist triggered, silently accept submission without sending notifications
    if (isSpam) {
      return NextResponse.json({
        success: true,
        message: form.successMessage,
      }, {
        headers: corsHeaders,
      })
    }

    // Build human-readable field labels
    const fields: FormField[] = JSON.parse(form.fields)
    const labeledData: Record<string, string> = {}
    fields.forEach(field => {
      if (formData[field.id] !== undefined) {
        labeledData[field.label] = formData[field.id]
      }
    })
    Object.keys(formData).forEach(key => {
      if (!fields.find(f => f.id === key)) {
        labeledData[key] = formData[key]
      }
    })

    // Resolve SMTP Inheritance
    let activeSmtpConfig: SmtpConfig | null = null
    if (website && website.customSmtpConfig) {
      try { activeSmtpConfig = JSON.parse(website.customSmtpConfig) } catch {}
    }
    if (!activeSmtpConfig && form.company && form.company.smtpConfig) {
      try { activeSmtpConfig = JSON.parse(form.company.smtpConfig) } catch {}
    }

    // 1. Send Internal Notification Email
    const targetEmail = form.notifyEmail || website?.notifyEmail || form.company?.defaultNotifyEmail
    if (targetEmail) {
      const emailHtml = buildSubmissionEmail(form.name, labeledData, {
        ip,
        pageUrl: page_url,
        referrer,
        utmSource: utm_source,
        utmKeyword: utm_keyword,
        userAgent,
        siteName: website?.name,
        companyName: form.company?.name || website?.company?.name
      })

      await sendEmail({
        to: targetEmail,
        subject: `[OpsHub] 新询盘 - ${website ? `[${website.name}] ` : ''}${form.name}`,
        html: emailHtml,
        smtpConfig: activeSmtpConfig
      })
    }

    // 2. Dispatch Webhooks (Feishu, DingTalk, Custom Endpoint)
    const companyWebhooks = form.company ? {
      feishu: form.company.feishuWebhook,
      dingtalk: form.company.dingtalkWebhook,
      custom: form.company.customWebhookUrl
    } : undefined

    const siteWebhooks = website ? {
      feishu: website.feishuWebhook,
      dingtalk: website.dingtalkWebhook,
      custom: website.customWebhookUrl
    } : undefined

    dispatchWebhooks(companyWebhooks, siteWebhooks, {
      event: 'submission.created',
      submissionId: submission.id,
      formName: form.name,
      companyName: form.company?.name || website?.company?.name,
      siteName: website?.name,
      siteDomain: website?.domain,
      data: labeledData,
      meta: {
        ip,
        pageUrl: page_url,
        utmSource: utm_source,
        utmKeyword: utm_keyword,
        createdAt: new Date().toLocaleString('zh-CN')
      }
    })

    // 3. Customer Auto-Responder Email (if enabled)
    if (form.autoReplyEnabled) {
      // Find customer email input - priority given to type === 'email' field
      let customerEmail = ''
      const emailField = fields.find(f => f.type === 'email')
      if (emailField && formData[emailField.id]) {
        customerEmail = String(formData[emailField.id]).trim()
      }
      if (!customerEmail) {
        const found = formData.your_email || formData.email || formData.Email || Object.values(formData).find(v => typeof v === 'string' && v.includes('@'))
        if (found && typeof found === 'string') customerEmail = found.trim()
      }

      if (customerEmail && customerEmail.includes('@')) {
        const autoSubject = form.autoReplySubject || `Thank you for contacting ${website?.name || 'us'}`
        let autoBody = form.autoReplyBody || `<p>Dear Customer,</p><p>Thank you for reaching out to us. We have received your message regarding <strong>${form.name}</strong> and will get back to you shortly.</p>`

        if (form.autoReplyCatalogUrl) {
          autoBody += `<p style="margin-top:16px;"><a href="${form.autoReplyCatalogUrl}" target="_blank" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">📥 Download Product Catalog</a></p>`
        }

        sendEmail({
          to: customerEmail,
          subject: autoSubject,
          html: autoBody,
          smtpConfig: activeSmtpConfig
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: form.successMessage,
    }, {
      headers: corsHeaders,
    })
  } catch (error) {
    console.error('Submit error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error, please try again.' },
      { status: 500, headers: corsHeaders }
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
