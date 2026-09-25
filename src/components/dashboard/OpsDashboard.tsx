'use client'
import Link from 'next/link'
import {
  CompaniesIcon,
  SitesIcon,
  FormsIcon,
  UsersIcon,
  SubmissionsIcon,
  RefreshIcon
} from '@/components/common/Icons'

interface OpsDashboardProps {
  stats: {
    totalCompanies: number
    totalWebsites: number
    totalForms: number
    totalSubmissions: number
    validSubmissions: number
    spamSubmissions: number
    totalUsers: number
    websiteList: any[]
    utmSources: any[]
  }
}

export default function OpsDashboard({ stats }: OpsDashboardProps) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">OpsHub 全网多站运营与监控中台</div>
          <div className="page-subtitle">多公司/多独立站全姿态大盘：域名 & SSL 巡检、广告 UTM 归因、Anti-Spam 监控</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/sites" className="btn btn-secondary">
            <RefreshIcon size={14} /> 域名 & SSL 巡检
          </Link>
          <Link href="/forms/new" className="btn btn-primary">
            + 新建表单
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CompaniesIcon size={16} color="var(--text-muted)" /> 在管公司主体
          </div>
          <div className="stat-value">{stats.totalCompanies}</div>
          <div className="stat-desc">多租户安全隔离</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SitesIcon size={16} color="var(--text-muted)" /> 在管独立站
          </div>
          <div className="stat-value">{stats.totalWebsites}</div>
          <div className="stat-desc">探针健康监控</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SubmissionsIcon size={16} color="var(--text-muted)" /> 有效询盘转化
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.validSubmissions}</div>
          <div className="stat-desc">拦截垃圾 {stats.spamSubmissions} 条</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FormsIcon size={16} color="var(--text-muted)" /> 部署表单
          </div>
          <div className="stat-value">{stats.totalForms}</div>
          <div className="stat-desc">营销 Tag 自动注入</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UsersIcon size={16} color="var(--text-muted)" /> 权限管理账号
          </div>
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-desc">精细化权限勾选</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        {/* Attribution Channels */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">广告 UTM 渠道归因 Top 榜</div>
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
            <div className="card-title">独立站域名 & SSL 探针大盘</div>
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
                              <span className="badge badge-red">仅剩 {sslDays} 天</span>
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
