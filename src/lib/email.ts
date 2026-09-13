import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.sina.com',
  port: Number(process.env.EMAIL_PORT) || 465,
  secure: true, // SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    await transporter.sendMail({
      from: `"OpsHub Forms" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    })
    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

export function buildSubmissionEmail(
  formName: string,
  formData: Record<string, string>,
  meta: {
    ip?: string
    country?: string
    city?: string
    pageUrl?: string
    utmSource?: string
    utmKeyword?: string
    referrer?: string
    userAgent?: string
  }
): string {
  const fieldsHtml = Object.entries(formData)
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding:10px 16px;font-weight:600;color:#374151;background:#f9fafb;width:160px;border-bottom:1px solid #e5e7eb;">${key}</td>
        <td style="padding:10px 16px;color:#111827;border-bottom:1px solid #e5e7eb;">${value || '-'}</td>
      </tr>`
    )
    .join('')

  const metaRows = [
    meta.pageUrl && `<tr><td style="padding:6px 16px;color:#6b7280;font-size:13px;">来源页面</td><td style="padding:6px 16px;font-size:13px;"><a href="${meta.pageUrl}">${meta.pageUrl}</a></td></tr>`,
    meta.referrer && `<tr><td style="padding:6px 16px;color:#6b7280;font-size:13px;">来源网站</td><td style="padding:6px 16px;font-size:13px;">${meta.referrer}</td></tr>`,
    meta.utmSource && `<tr><td style="padding:6px 16px;color:#6b7280;font-size:13px;">来源渠道</td><td style="padding:6px 16px;font-size:13px;">${meta.utmSource}</td></tr>`,
    meta.utmKeyword && `<tr><td style="padding:6px 16px;color:#6b7280;font-size:13px;">关键词</td><td style="padding:6px 16px;font-size:13px;">${meta.utmKeyword}</td></tr>`,
    meta.country && `<tr><td style="padding:6px 16px;color:#6b7280;font-size:13px;">地区</td><td style="padding:6px 16px;font-size:13px;">${meta.city || ''} ${meta.country}</td></tr>`,
    meta.ip && `<tr><td style="padding:6px 16px;color:#6b7280;font-size:13px;">IP</td><td style="padding:6px 16px;font-size:13px;">${meta.ip}</td></tr>`,
  ]
    .filter(Boolean)
    .join('')

  return `
  <div style="font-family:Inter,-apple-system,sans-serif;max-width:640px;margin:0 auto;background:#fff;">
    <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600;">📋 新询盘通知</h1>
      <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">表单：${formName}</p>
    </div>
    <div style="padding:24px 32px;">
      <h2 style="font-size:15px;color:#374151;margin:0 0 12px;">表单信息</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        ${fieldsHtml}
      </table>
      ${metaRows ? `
      <h2 style="font-size:15px;color:#374151;margin:24px 0 12px;">用户数据</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${metaRows}
      </table>` : ''}
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">由 OpsHub 自动发送 · ${new Date().toLocaleString('zh-CN')}</p>
    </div>
  </div>`
}
