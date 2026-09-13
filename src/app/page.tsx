import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getStats() {
  const [totalForms, totalSubmissions, recentSubmissions] = await Promise.all([
    prisma.form.count(),
    prisma.formSubmission.count(),
    prisma.formSubmission.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { form: { select: { name: true } } },
    }),
  ])
  return { totalForms, totalSubmissions, recentSubmissions }
}

export default async function DashboardPage() {
  const { totalForms, totalSubmissions, recentSubmissions } = await getStats()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <>
      <div className="header">
        <div className="header-title">Dashboard</div>
        <div className="header-actions">
          <Link href="/forms/new" className="btn btn-primary">
            ＋ 创建表单
          </Link>
        </div>
      </div>
      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">欢迎回来 👋</div>
            <div className="page-subtitle">OpsHub 运营中台 — 表单与数据管理</div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">总表单数</div>
            <div className="stat-value">{totalForms}</div>
            <div className="stat-desc">已创建的表单</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">总询盘数</div>
            <div className="stat-value">{totalSubmissions}</div>
            <div className="stat-desc">累计收到的提交</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">服务状态</div>
            <div className="stat-value" style={{ fontSize: 22, color: 'var(--success)' }}>● 正常</div>
            <div className="stat-desc">API 服务运行中</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recent submissions */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">最新询盘</div>
              <Link href="/submissions" className="btn btn-secondary btn-sm">查看全部</Link>
            </div>
            <div>
              {recentSubmissions.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-icon">📭</div>
                  <div className="empty-title">暂无询盘</div>
                  <div className="empty-desc">创建表单并嵌入网站后，询盘将显示在这里</div>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>表单</th>
                      <th>时间</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubmissions.map(s => (
                      <tr key={s.id}>
                        <td><span className="badge badge-blue">{s.form.name}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                          {new Date(s.createdAt).toLocaleString('zh-CN')}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{s.ip || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Quick guide */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">快速使用指南</div>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { step: '1', title: '创建表单', desc: '在表单管理页创建表单，配置字段和通知邮箱，获取 Form ID' },
                  { step: '2', title: '安装WordPress插件', desc: '在 WordPress 安装 infility-global 插件，将 Server URL 改为你的服务器' },
                  { step: '3', title: '嵌入 Elementor', desc: '拖入 Infility Form 小部件，填入 Form ID，表单自动渲染' },
                  { step: '4', title: '接收询盘', desc: '客户提交后，邮件自动发送到你配置的邮箱，数据存入数据库' },
                ].map(item => (
                  <div key={item.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--primary-light)', color: 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0
                    }}>{item.step}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <hr className="divider" />
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>你的服务器地址：</div>
                <div className="code-block">{appUrl}</div>
                <div style={{ marginTop: 8 }}>
                  在 WordPress 插件设置中填入此地址
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
