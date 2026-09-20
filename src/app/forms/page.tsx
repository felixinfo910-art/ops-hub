import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; websiteId?: string }>
}) {
  const params = await searchParams
  const companyId = params.companyId ? parseInt(params.companyId, 10) : undefined
  const websiteId = params.websiteId ? parseInt(params.websiteId, 10) : undefined

  let forms: any[] = []
  try {
    const { getAuthUserAndScope } = await import('@/lib/rbac')
    const { headers } = await import('next/headers')
    // We mock a Request object to recycle getAuthUserAndScope
    const reqHeaders = await headers()
    
    // Convert ReadonlyHeaders back into a regular string map for the fake request inside next.js RSC
    const h = new Headers()
    reqHeaders.forEach((val, key) => h.set(key, val))
    const fakeReq = { headers: h } as unknown as Request
    const scope = await getAuthUserAndScope(fakeReq)

    const hostname = reqHeaders.get('host') || ''
    const isToolsPortal = hostname.includes('tools.') || hostname.includes('toold.')

    if (!scope) {
      throw new Error('Unauthorized')
    }

    const where: any = {}
    
    if (scope.role === 'super_admin') {
      if (companyId) where.companyId = companyId
      if (websiteId) where.websiteId = websiteId
    } else if (scope.allowedWebsiteIds === null) {
      if (scope.companyId) where.companyId = scope.companyId
      if (websiteId) where.websiteId = websiteId
    } else {
      const allowed = scope.allowedWebsiteIds || []
      where.websiteId = { in: allowed }
      if (websiteId && allowed.includes(websiteId)) {
        where.websiteId = websiteId
      } else if (websiteId) {
        throw new Error('Forbidden')
      }
    }

    forms = await prisma.form.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { name: true } },
        website: { select: { name: true, domain: true } },
        _count: { select: { submissions: true } }
      },
    })
  } catch (err) {
    console.error('Database query error on forms page:', err)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">◫ 表单管理</div>
          <div className="page-subtitle">创建和管理询盘表单，挂载到对应独立站与公司</div>
        </div>
        <Link href="/forms/new" className="btn btn-primary">＋ 新建表单</Link>
      </div>

      <div className="card">
        {forms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◫</div>
            <div className="empty-title">暂无表单</div>
            <div className="empty-desc">创建第一个表单，获取 Form ID 并绑定独立站</div>
            <Link href="/forms/new" className="btn btn-primary">＋ 创建第一个表单</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>表单名称</th>
                  <th>归属公司</th>
                  <th>归属独立站</th>
                  <th>通知邮箱</th>
                  <th>样式主题</th>
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
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{form.name}</div>
                      {form.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {form.description}
                        </div>
                      )}
                    </td>
                    <td>
                      {form.company ? (
                        <span className="badge badge-blue">{form.company.name}</span>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>全局通用</span>
                      )}
                    </td>
                    <td>
                      {form.website ? (
                        <span className="badge badge-yellow">{form.website.name}</span>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>全站通用</span>
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
                      <div style={{ display: 'flex', gap: 6 }}>
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
  )
}
