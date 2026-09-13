import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FormsPage() {
  const forms = await prisma.form.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { submissions: true } } },
  })

  return (
    <>
      <div className="header">
        <div className="header-title">表单管理</div>
        <div className="header-actions">
          <Link href="/forms/new" className="btn btn-primary">＋ 新建表单</Link>
        </div>
      </div>
      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">表单管理</div>
            <div className="page-subtitle">创建和管理你的询盘表单，每个表单有唯一 ID</div>
          </div>
        </div>

        <div className="card">
          {forms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◫</div>
              <div className="empty-title">还没有表单</div>
              <div className="empty-desc">创建第一个表单，获取 Form ID，然后嵌入到你的 WordPress 网站</div>
              <Link href="/forms/new" className="btn btn-primary">＋ 创建第一个表单</Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>表单名称</th>
                    <th>通知邮箱</th>
                    <th>样式</th>
                    <th>询盘数</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map(form => (
                    <tr key={form.id}>
                      <td>
                        <span style={{
                          fontFamily: 'monospace',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: 13,
                        }}>#{form.id}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{form.name}</div>
                        {form.description && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {form.description}
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{form.notifyEmail}</td>
                      <td>
                        <span className={`badge badge-${form.styleTheme === 'dark' ? 'yellow' : form.styleTheme === 'minimal' ? 'blue' : 'green'}`}>
                          {form.styleTheme}
                        </span>
                      </td>
                      <td>
                        <Link href={`/forms/${form.id}?tab=submissions`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                          {form._count.submissions}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${form.isActive ? 'badge-green' : 'badge-red'}`}>
                          {form.isActive ? '启用' : '停用'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {new Date(form.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link href={`/forms/${form.id}`} className="btn btn-secondary btn-sm">编辑</Link>
                          <Link href={`/forms/${form.id}?tab=submissions`} className="btn btn-secondary btn-sm">询盘</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
