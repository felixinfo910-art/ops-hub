import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserAndScope } from '@/lib/rbac'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getAuthUserAndScope(req)
    if (!scope || !scope.allowedMenus.includes('sites')) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 })
    }

    const { id } = await params
    const siteId = parseInt(id, 10)
    if (isNaN(siteId)) {
      return NextResponse.json({ success: false, message: 'Invalid site ID' }, { status: 400 })
    }

    const existing = await prisma.website.findUnique({ where: { id: siteId } })
    if (!existing) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    if (scope.allowedCompanyIds && !scope.allowedCompanyIds.includes(existing.companyId)) {
      return NextResponse.json({ success: false, message: '越权操作' }, { status: 403 })
    }

    const body = await req.json()
    const {
      companyId,
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

    const newCompanyId = companyId ? parseInt(companyId, 10) : undefined

    // If company assignment changed, sync associated forms & submissions companyId
    if (newCompanyId && newCompanyId !== existing.companyId) {
      await prisma.form.updateMany({ where: { websiteId: siteId }, data: { companyId: newCompanyId } })
      await prisma.formSubmission.updateMany({ where: { websiteId: siteId }, data: { companyId: newCompanyId } })
    }

    const updated = await prisma.website.update({
      where: { id: siteId },
      data: {
        ...(newCompanyId && { companyId: newCompanyId }),
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
    const scope = await getAuthUserAndScope(req)
    if (!scope || !scope.allowedMenus.includes('sites')) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 })
    }

    const { id } = await params
    const siteId = parseInt(id, 10)
    if (isNaN(siteId)) {
      return NextResponse.json({ success: false, message: 'Invalid site ID' }, { status: 400 })
    }

    const existing = await prisma.website.findUnique({ where: { id: siteId } })
    if (!existing) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    if (scope.allowedCompanyIds && !scope.allowedCompanyIds.includes(existing.companyId)) {
      return NextResponse.json({ success: false, message: '越权操作' }, { status: 403 })
    }

    // Safely unbind forms & submissions before deleting website to prevent foreign key errors
    await prisma.formSubmission.updateMany({ where: { websiteId: siteId }, data: { websiteId: null } })
    await prisma.form.updateMany({ where: { websiteId: siteId }, data: { websiteId: null } })
    await prisma.website.delete({ where: { id: siteId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Delete failed' }, { status: 500 })
  }
}
