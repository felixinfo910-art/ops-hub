import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type RecentSubmission = {
  id: number
  createdAt: Date
  ip: string | null
  utmSource: string | null
  status: string
  isSpam: boolean
  form: {
    name: string
  }
}

type WebsiteStatusSummary = {
  id: number
  name: string
  domain: string
  lastHttpStatus: number | null
  lastResponseTimeMs: number | null
  sslExpiresAt: Date | null
}

async function getStats() {
  try {
    const [
      totalCompanies,
      totalWebsites,
      totalForms,
      totalSubmissions,
      validSubmissions,
      spamSubmissions,
      totalUsers,
      recentSubmissions,
      websiteList,
      utmSources,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.website.count(),
      prisma.form.count(),
      prisma.formSubmission.count(),
      prisma.formSubmission.count({ where: { isSpam: false } }),
      prisma.formSubmission.count({ where: { isSpam: true } }),
      prisma.user.count(),
      prisma.formSubmission.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { form: { select: { name: true } } },
      }),
      prisma.website.findMany({
        select: {
          id: true,
          name: true,
          domain: true,
          lastHttpStatus: true,
          lastResponseTimeMs: true,
          sslExpiresAt: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.formSubmission.groupBy({
        by: ['utmSource'],
        where: { isSpam: false },
        _count: { utmSource: true },
        orderBy: { _count: { utmSource: 'desc' } },
        take: 5,
      }),
    ])

    return {
      totalCompanies,
      totalWebsites,
      totalForms,
      totalSubmissions,
      validSubmissions,
      spamSubmissions,
      totalUsers,
      recentSubmissions,
      websiteList,
      utmSources,
    }
  } catch (err) {
    console.error('Database query error on dashboard:', err)
    return {
      totalCompanies: 0,
      totalWebsites: 0,
      totalForms: 0,
      totalSubmissions: 0,
      validSubmissions: 0,
      spamSubmissions: 0,
      totalUsers: 0,
      recentSubmissions: [],
      websiteList: [],
      utmSources: [],
    }
  }
}

export default async function DashboardPage() {
  const stats = await getStats()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title"> OpsHub 多站运营与广告归因中台 👋</div>
          <div className="page-subtitle">多公司/多独立站全姿态大盘：域名 & SSL 巡检、广告 UTM 归因、Anti-Spam 监控</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/sites" className="btn btn-secondary">
            ⚡ 域名 & SSL 巡检
          </Link>
          <Link href="/forms/new" className="btn btn-primary">
            ＋ 新建表单
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-label">🏢 公司/项目数</div>
          <div className="stat-value">{stats.totalCompanies}</div>
          <div className="stat-desc">多租户主体隔离</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🌐 在管独立站</div>
          <div className="stat-value">{stats.totalWebsites}</div>
          <div className="stat-desc">探针实时监控</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">✅ 有效询盘转化</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.validSubmissions}</div>
          <div className="stat-desc">拦截垃圾 {stats.spamSubmissions} 条</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">◫ 活跃表单</div>
          <div className="stat-value">{stats.totalForms}</div>
          <div className="stat-desc">营销 Tag 自动注入</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">👥 团队权限账号</div>
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-desc">站点打勾精细化指派</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Attribution Channels */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📈 广告 UTM 渠道归因 Top 榜</div>
            <Link href="/submissions" className="btn btn-secondary btn-sm">询盘明细</Link>
          </div>
          <div className="card-body">
            {stats.utmSources.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>
                <div className="empty-title">暂无渠道归因数据</div>
                <div className="empty-desc">带有 utm_source 的广告流量提交后将自动分析归因</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.utmSources.map((item, idx) => {
                  const sourceName = item.utmSource || 'Direct (直接访问)'
                  const percent = stats.validSubmissions > 0
                    ? Math.round((item._count.utmSource / stats.validSubmissions) * 100)
                    : 0
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                          #{idx + 1} {sourceName}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {item._count.utmSource} 条 ({percent}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 8, background: 'var(--bg-offset, #f1f5f9)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.max(5, percent)}%`,
                          height: '100%',
                          background: idx === 0 ? 'var(--primary)' : 'var(--info, #3b82f6)',
                          borderRadius: 4
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Website SSL & Health Status */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🛡️ 独立站域名 & SSL 探针大盘</div>
            <Link href="/sites" className="btn btn-secondary btn-sm">全网巡检</Link>
          </div>
          <div>
            {stats.websiteList.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>
                <div className="empty-title">暂无独立站</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>站点名称</th>
                    <th>HTTP Uptime</th>
                    <th>SSL 证书到期</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.websiteList.map(w => {
                    const diffMs = w.sslExpiresAt ? new Date(w.sslExpiresAt).getTime() - Date.now() : null
                    const sslDays = diffMs ? Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))) : null

                    return (
                      <tr key={w.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{w.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.domain}</div>
                        </td>
                        <td>
                          {w.lastHttpStatus === 200 ? (
                            <span className="badge badge-green">200 OK ({w.lastResponseTimeMs || 0}ms)</span>
                          ) : w.lastHttpStatus ? (
                            <span className="badge badge-red">HTTP {w.lastHttpStatus}</span>
                          ) : (
                            <span className="badge badge-yellow">未巡检</span>
                          )}
                        </td>
                        <td>
                          {sslDays !== null ? (
                            sslDays > 30 ? (
                              <span className="badge badge-green">剩余 {sslDays} 天</span>
                            ) : (
                              <span className="badge badge-red">⚠️ 仅剩 {sslDays} 天</span>
                            )
                          ) : (
                            <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>未知</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
