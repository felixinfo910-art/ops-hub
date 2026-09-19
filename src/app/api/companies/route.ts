import { NextResponse } from 'next/server'
import { prisma, ensureDbInitialized } from '@/lib/prisma'
import { getAuthUserAndScope } from '@/lib/rbac'

export async function GET(request: Request) {
  try {
    await ensureDbInitialized()
    const scope = await getAuthUserAndScope(request)

    const where: any = {}
    if (scope && scope.allowedCompanyIds !== null) {
      where.id = { in: scope.allowedCompanyIds }
    }

    const companies = await prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            websites: true,
            forms: true,
            submissions: true,
            users: true
          }
        }
      }
    })
    return NextResponse.json({ success: true, companies })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '获取公司列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureDbInitialized()
    const scope = await getAuthUserAndScope(request)
    if (scope && scope.role !== 'super_admin' && scope.role !== 'company_admin') {
      return NextResponse.json({ error: '权限不足，无法创建公司' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, defaultNotifyEmail, smtpConfig, feishuWebhook, dingtalkWebhook, customWebhookUrl } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '公司名称不能为空' }, { status: 400 })
    }

    const companyCode = (code || `comp_${Date.now().toString(36)}`).trim().toLowerCase()

    const existing = await prisma.company.findUnique({
      where: { code: companyCode }
    })

    if (existing) {
      return NextResponse.json({ error: '公司代号已存在，请重试' }, { status: 400 })
    }

    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        code: companyCode,
        defaultNotifyEmail: defaultNotifyEmail ? defaultNotifyEmail.trim() : null,
        smtpConfig: smtpConfig ? JSON.stringify(smtpConfig) : null,
        feishuWebhook: feishuWebhook ? feishuWebhook.trim() : null,
        dingtalkWebhook: dingtalkWebhook ? dingtalkWebhook.trim() : null,
        customWebhookUrl: customWebhookUrl ? customWebhookUrl.trim() : null,
      }
    })

    return NextResponse.json({ success: true, company })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '创建公司失败' }, { status: 500 })
  }
}
