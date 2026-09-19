import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserAndScope } from '@/lib/rbac'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const scope = await getAuthUserAndScope(request)

    const where: any = {}

    if (companyId) {
      where.companyId = parseInt(companyId, 10)
    }

    if (scope) {
      if (scope.role === 'company_admin' && scope.companyId) {
        where.companyId = scope.companyId
      } else if (scope.allowedWebsiteIds !== null) {
        where.id = { in: scope.allowedWebsiteIds }
      }
    }

    const websites = await prisma.website.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: { id: true, name: true, code: true }
        },
        _count: {
          select: {
            forms: true,
            submissions: true
          }
        }
      }
    })
    return NextResponse.json({ success: true, websites })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '获取站点列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getAuthUserAndScope(request)
    if (scope && scope.role !== 'super_admin' && scope.role !== 'company_admin') {
      return NextResponse.json({ error: '权限不足，仅超级管理员与公司管理员可注册新站点' }, { status: 403 })
    }

    const body = await request.json()
    const {
      companyId,
      name,
      domain,
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

    if (!companyId) {
      return NextResponse.json({ error: '请选择归属公司' }, { status: 400 })
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: '站点名称不能为空' }, { status: 400 })
    }
    if (!domain || !domain.trim()) {
      return NextResponse.json({ error: '主域名不能为空' }, { status: 400 })
    }

    // Check if companyId matches scope for company_admin
    if (scope && scope.role === 'company_admin' && scope.companyId && parseInt(companyId, 10) !== scope.companyId) {
      return NextResponse.json({ error: '无权在非本公司下创建站点' }, { status: 403 })
    }

    const siteKey = `site_live_${Math.random().toString(36).substring(2, 8)}${Date.now().toString(36).substring(4)}`

    const website = await prisma.website.create({
      data: {
        companyId: parseInt(companyId, 10),
        name: name.trim(),
        domain: domain.trim(),
        siteKey,
        allowedDomains: allowedDomains ? allowedDomains.trim() : null,
        notifyEmail: notifyEmail ? notifyEmail.trim() : null,
        feishuWebhook: feishuWebhook ? feishuWebhook.trim() : null,
        dingtalkWebhook: dingtalkWebhook ? dingtalkWebhook.trim() : null,
        customWebhookUrl: customWebhookUrl ? customWebhookUrl.trim() : null,
        enableHoneypot: enableHoneypot !== false,
        blacklistedIps: blacklistedIps ? blacklistedIps.trim() : null,
        ga4MeasurementId: ga4MeasurementId ? ga4MeasurementId.trim() : null,
        fbPixelId: fbPixelId ? fbPixelId.trim() : null,
        gtmContainerId: gtmContainerId ? gtmContainerId.trim() : null,
        customHeaderScript: customHeaderScript ? customHeaderScript : null,
      },
      include: {
        company: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({ success: true, website })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '创建站点失败' }, { status: 500 })
  }
}
