'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { exportSubmissionsToCSV } from '@/lib/csv'
import { DownloadIcon, TrashIcon } from '@/components/common/Icons'

interface SubmissionItem {
  id: number
  data: string
  ip: string | null
  country: string | null
  city: string | null
  pageUrl: string | null
  referrer: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmKeyword: string | null
  isSpam: boolean
  spamReason: string | null
  status: string
  notes?: string | null
  createdAt: string
  form: { id: number; name: string }
  company?: { id: number; name: string }
  website?: { id: number; name: string; domain: string }
}

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  pending: { label: '待跟进', badge: 'badge-yellow' },
  contacted: { label: '已联系', badge: 'badge-blue' },
  qualified: { label: '有效意向', badge: 'badge-green' },
  closed: { label: '已成交', badge: 'badge-purple' },
  junk: { label: '无效/放弃', badge: 'badge-red' },
}

function SubmissionsContent() {
  const searchParams = useSearchParams()
  const companyIdFilter = searchParams.get('companyId')
  const initialWebsiteId = searchParams.get('websiteId')

  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [websites, setWebsites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // 【查逻辑】 Query & Filter States
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>(initialWebsiteId || 'all')
  const [spamFilter, setSpamFilter] = useState<'all' | 'valid' | 'spam'>('valid')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Load sites for the filter dropdown
  useEffect(() => {
    fetch('/api/sites')
      .then(r => r.json())
      .then(res => {
        if (res.success) setWebsites(res.websites || [])
      })
      .catch(console.error)
  }, [])

  const fetchSubmissions = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (companyIdFilter) params.set('companyId', companyIdFilter)
    if (selectedWebsiteId && selectedWebsiteId !== 'all') params.set('websiteId', selectedWebsiteId)

    const query = params.toString() ? `?${params.toString()}` : ''
    fetch(`/api/submissions${query}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setSubmissions(res.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSubmissions()
  }, [companyIdFilter, selectedWebsiteId])

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/submissions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      if (data.success) {
        setSubmissions(submissions.map(s => s.id === id ? { ...s, status: newStatus } : s))
      }
    } catch {
      alert('更新状态失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此条询盘记录？此操作无法撤销。')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setSubmissions(submissions.filter(s => s.id !== id))
      } else {
        alert(data.message || '删除失败')
      }
    } catch {
      alert('网络错误，删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  // Filtered submissions based on search, spam, and status
  const filteredSubmissions = submissions.filter(s => {
    if (spamFilter === 'valid' && s.isSpam) return false
    if (spamFilter === 'spam' && !s.isSpam) return false
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const inData = s.data.toLowerCase().includes(q)
      const inEmail = (s.ip || '').toLowerCase().includes(q) || (s.country || '').toLowerCase().includes(q)
      const inForm = (s.form?.name || '').toLowerCase().includes(q)
      const inSite = (s.website?.name || s.website?.domain || '').toLowerCase().includes(q)
      if (!inData && !inEmail && !inForm && !inSite) return false
    }
    return true
  })

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {filteredSubmissions.length > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => exportSubmissionsToCSV(filteredSubmissions, 'inquiries_export')}
          >
            <DownloadIcon size={14} /> 导出结果 CSV ({filteredSubmissions.length})
          </button>
        )}
      </div>

      {/* 【查逻辑】 独立多维度查询工具栏 */}
      <div className="card" style={{ padding: 16, marginBottom: 20, background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Row 1: Spam Tab + Search Input */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn btn-sm ${spamFilter === 'valid' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSpamFilter('valid')}
              >
                有效询盘 ({submissions.filter(s => !s.isSpam).length})
              </button>
              <button
                className={`btn btn-sm ${spamFilter === 'spam' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSpamFilter('spam')}
              >
                垃圾拦截 ({submissions.filter(s => s.isSpam).length})
              </button>
              <button
                className={`btn btn-sm ${spamFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSpamFilter('all')}
              >
                全部记录 ({submissions.length})
              </button>
            </div>

            <input
              type="text"
              className="form-input"
              placeholder="🔍 搜索提交内容、邮箱、国家或来源表单..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ maxWidth: 300, padding: '6px 12px', fontSize: 13 }}
            />
          </div>

          {/* Row 2: Website Filter + Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>按站点筛选:</span>
              <select
                className="form-input form-select"
                style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
                value={selectedWebsiteId}
                onChange={e => setSelectedWebsiteId(e.target.value)}
              >
                <option value="all">全部独立站 ({websites.length} 个)</option>
                {websites.map(w => (
                  <option key={w.id} value={w.id.toString()}>
                    {w.name} ({w.domain})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>跟进状态:</span>
              <select
                className="form-input form-select"
                style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">全部跟进状态</option>
                <option value="pending">待跟进</option>
                <option value="contacted">已联系</option>
                <option value="qualified">有效意向</option>
                <option value="closed">已成交</option>
                <option value="junk">无效/放弃</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-muted)' }}>加载询盘记录中...</div>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-title">暂无匹配的询盘记录</div>
            <div className="empty-desc">尝试切换顶部的类型或状态筛选</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>安全防护</th>
                  <th>跟进状态 (CRM)</th>
                  <th>时间</th>
                  <th>归属公司/站点</th>
                  <th>来源表单</th>
                  <th>提交数据</th>
                  <th>UTM 广告归因</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(s => {
                  let data: Record<string, string> = {}
                  try {
                    data = JSON.parse(s.data)
                  } catch {}

                  const displayFields = Object.entries(data)
                    .filter(([k]) => !['form_id', 'page_url', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_keyword', '_hp_trap'].includes(k))

                  const statusObj = STATUS_LABELS[s.status || 'pending'] || STATUS_LABELS.pending

                  return (
                    <tr key={s.id}>
                      <td>
                        {s.isSpam ? (
                          <span className="badge badge-red" title={s.spamReason || 'Spam'}>
                            垃圾 [{s.spamReason}]
                          </span>
                        ) : (
                          <span className="badge badge-green">有效询盘</span>
                        )}
                      </td>
                      <td>
                        <select
                          className={`form-input form-select ${statusObj.badge}`}
                          style={{ border: 'none', fontWeight: 600, fontSize: 12, padding: '4px 8px', width: 'auto', cursor: 'pointer' }}
                          value={s.status || 'pending'}
                          onChange={e => handleUpdateStatus(s.id, e.target.value)}
                        >
                          <option value="pending">待跟进</option>
                          <option value="contacted">已联系</option>
                          <option value="qualified">有效意向</option>
                          <option value="closed">已成交</option>
                          <option value="junk">无效/放弃</option>
                        </select>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(s.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td>
                        {s.company && (
                          <div style={{ marginBottom: 4 }}>
                            <span className="badge badge-blue">{s.company.name}</span>
                          </div>
                        )}
                        {s.website ? (
                          <span className="badge badge-yellow">{s.website.name}</span>
                        ) : (
                          <span style={{ color: 'var(--text-subtle)', fontSize: 11 }}>通用站点</span>
                        )}
                      </td>
                      <td>
                        <Link href={`/forms/${s.form.id}?tab=submissions`}>
                          <span className="badge badge-blue">#{s.form.id} {s.form.name}</span>
                        </Link>
                      </td>
                      <td>
                        {displayFields.map(([k, v]) => (
                          <div key={k} style={{ fontSize: 13, marginBottom: 2 }}>
                            <span style={{ color: 'var(--text-muted)' }}>{k}:</span>{' '}
                            <span style={{ fontWeight: 500 }}>{String(v)}</span>
                          </div>
                        ))}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {s.utmSource ? (
                          <div><strong style={{ color: 'var(--primary)' }}>渠道:</strong> {s.utmSource}</div>
                        ) : (
                          <div style={{ color: 'var(--text-subtle)' }}>直接访问 (Direct)</div>
                        )}
                        {s.utmKeyword && <div><strong style={{ color: 'var(--success)' }}>关键词:</strong> {s.utmKeyword}</div>}
                        {s.pageUrl && (
                          <div style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <a href={s.pageUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                              {s.pageUrl}
                            </a>
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={deletingId === s.id}
                          onClick={() => handleDelete(s.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <TrashIcon size={12} />
                          {deletingId === s.id ? '删除中...' : '删除'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SubmissionsPage() {
  return (
    <Suspense fallback={
      <div className="page">
        <div className="loading-spinner" style={{ margin: '40px auto' }} />
      </div>
    }>
      <SubmissionsContent />
    </Suspense>
  )
}
