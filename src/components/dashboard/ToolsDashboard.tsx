'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  SubmissionsIcon,
  FormsIcon,
  SitesIcon,
  ArrowRightIcon,
  DownloadIcon,
  CheckIcon
} from '@/components/common/Icons'

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  pending: { label: '待跟进', badge: 'badge-yellow' },
  contacted: { label: '已联系', badge: 'badge-blue' },
  qualified: { label: '有效意向', badge: 'badge-green' },
  closed: { label: '已成交', badge: 'badge-purple' },
  junk: { label: '放弃/无效', badge: 'badge-red' },
}

export default function ToolsDashboard() {
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [websites, setWebsites] = useState<any[]>([])
  const [formsCount, setFormsCount] = useState<number>(0)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [resSub, resSites, resForms] = await Promise.all([
        fetch('/api/submissions?limit=50').then(r => r.json()),
        fetch('/api/sites').then(r => r.json()),
        fetch('/api/forms').then(r => r.json()),
      ])

      if (resSub.success) setSubmissions(resSub.data || [])
      if (resSites.success) setWebsites(resSites.websites || [])
      if (resForms.success) setFormsCount((resForms.data || resForms.forms || []).length)
    } catch (err) {
      console.error('Tools dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/submissions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      if (data.success) {
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const validSubmissions = submissions.filter(s => !s.isSpam)
  const pendingCount = validSubmissions.filter(s => s.status === 'pending' || !s.status).length
  const closedCount = validSubmissions.filter(s => s.status === 'closed' || s.status === 'qualified').length
  const recentValid = validSubmissions.slice(0, 6)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Tools 客户获客与询盘看板</div>
          <div className="page-subtitle">实时掌控独立站询盘跟进进度、转化效率与表单运行状态</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/submissions" className="btn btn-primary">
            <SubmissionsIcon size={14} /> 询盘跟进中心
          </Link>
          <Link href="/forms" className="btn btn-secondary">
            <FormsIcon size={14} /> 查看我的表单
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)' }}>正在载入获客数据中心...</div>
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            <div className="stat-card">
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SubmissionsIcon size={16} color="var(--primary)" /> 累计获客询盘
              </div>
              <div className="stat-value">{validSubmissions.length}</div>
              <div className="stat-desc">已自动排除垃圾流量</div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid var(--warning, #f59e0b)' }}>
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                ⏳ 待跟进询盘
              </div>
              <div className="stat-value" style={{ color: pendingCount > 0 ? '#d97706' : 'var(--text)' }}>
                {pendingCount}
              </div>
              <div className="stat-desc">{pendingCount > 0 ? '建议尽快联系跟进' : '暂无待跟进'}</div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid var(--success, #10b981)' }}>
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                🎯 高价值 / 成交转化
              </div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{closedCount}</div>
              <div className="stat-desc">有效意向与成功成交</div>
            </div>

            <div className="stat-card">
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FormsIcon size={16} color="var(--text-muted)" /> 在运行表单
              </div>
              <div className="stat-value">{formsCount}</div>
              <div className="stat-desc">在线全天候收集询盘</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginTop: 20 }}>
            {/* Recent Submissions Feed */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">最新到账询盘与即时跟进</div>
                <Link href="/submissions" className="btn btn-secondary btn-sm">
                  查看全部 <ArrowRightIcon size={12} />
                </Link>
              </div>

              {recentValid.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}>
                  <div className="empty-title">暂无最新询盘</div>
                  <div className="empty-desc">当有客户在您的独立站提交表单时，此版块将实时更新</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
                  {recentValid.map(s => {
                    let parsedData: any = {}
                    try {
                      parsedData = typeof s.data === 'string' ? JSON.parse(s.data) : s.data
                    } catch {}

                    const previewText = Object.entries(parsedData)
                      .slice(0, 3)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join('  |  ')

                    const statusKey = s.status || 'pending'
                    const statusConfig = STATUS_LABELS[statusKey] || STATUS_LABELS.pending

                    return (
                      <div
                        key={s.id}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: 14,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`badge ${statusConfig.badge}`}>{statusConfig.label}</span>
                            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                              {s.form?.name || '线上表单'}
                            </span>
                            {s.website?.domain && (
                              <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>({s.website.domain})</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {new Date(s.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        <div style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg)', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                          {previewText || s.data}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                          <div>
                            {s.country && <span>📍 {s.country} </span>}
                            {s.utmSource && <span className="badge badge-blue" style={{ fontSize: 10 }}>UTM: {s.utmSource}</span>}
                          </div>

                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 11 }}>更新状态:</span>
                            <select
                              className="form-input form-select"
                              style={{ padding: '2px 6px', fontSize: 11, width: 'auto' }}
                              value={statusKey}
                              onChange={e => handleUpdateStatus(s.id, e.target.value)}
                            >
                              <option value="pending">待跟进</option>
                              <option value="contacted">已联系</option>
                              <option value="qualified">有效意向</option>
                              <option value="closed">已成交</option>
                              <option value="junk">放弃</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* My Websites Performance List */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">我的独立站概览</div>
                <span className="badge badge-blue">{websites.length} 个站点</span>
              </div>
              <div className="card-body">
                {websites.length === 0 ? (
                  <div className="empty-state" style={{ padding: 20 }}>
                    <div className="empty-title">暂无绑定站点</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {websites.map(w => (
                      <div
                        key={w.id}
                        style={{
                          padding: 12,
                          background: 'var(--bg)',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{w.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.domain}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="badge badge-green" style={{ fontSize: 11 }}>
                            {w._count?.submissions || 0} 条询盘
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
