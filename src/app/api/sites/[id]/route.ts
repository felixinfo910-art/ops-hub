import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const siteId = parseInt(id, 10)
    if (isNaN(siteId)) {
      return NextResponse.json({ success: false, message: 'Invalid site ID' }, { status: 400 })
    }

    const body = await req.json()
    const {
      name,
      domain,
      adminUrl,
      allowedDomains,
      notifyEmail,
      feishuWebhook,
      dingtalkWebhook,
      customWebhookUrl,
      enableHoneypot,
      blacklistedIps,
      ga4MeasurementId,
      fbPixelId,
      gtmContainerId,
      customHeaderScript
    } = body

    const updated = await prisma.website.update({
      where: { id: siteId },
      data: {
        name: name ? name.trim() : undefined,
        domain: domain ? domain.trim() : undefined,
        adminUrl: adminUrl !== undefined ? (adminUrl ? adminUrl.trim() : null) : undefined,
        allowedDomains: allowedDomains !== undefined ? (allowedDomains ? allowedDomains.trim() : null) : undefined,
        notifyEmail: notifyEmail !== undefined ? (notifyEmail ? notifyEmail.trim() : null) : undefined,
        feishuWebhook: feishuWebhook !== undefined ? (feishuWebhook ? feishuWebhook.trim() : null) : undefined,
        dingtalkWebhook: dingtalkWebhook !== undefined ? (dingtalkWebhook ? dingtalkWebhook.trim() : null) : undefined,
        customWebhookUrl: customWebhookUrl !== undefined ? (customWebhookUrl ? customWebhookUrl.trim() : null) : undefined,
        enableHoneypot: enableHoneypot !== undefined ? enableHoneypot : undefined,
        blacklistedIps: blacklistedIps !== undefined ? (blacklistedIps ? blacklistedIps.trim() : null) : undefined,
        ga4MeasurementId: ga4MeasurementId !== undefined ? (ga4MeasurementId ? ga4MeasurementId.trim() : null) : undefined,
        fbPixelId: fbPixelId !== undefined ? (fbPixelId ? fbPixelId.trim() : null) : undefined,
        gtmContainerId: gtmContainerId !== undefined ? (gtmContainerId ? gtmContainerId.trim() : null) : undefined,
        customHeaderScript: customHeaderScript !== undefined ? (customHeaderScript ? customHeaderScript : null) : undefined,
      }
    })

    return NextResponse.json({ success: true, website: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const siteId = parseInt(id, 10)
    if (isNaN(siteId)) {
      return NextResponse.json({ success: false, message: 'Invalid site ID' }, { status: 400 })
    }

    await prisma.website.delete({ where: { id: siteId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Delete failed' }, { status: 500 })
  }
}
