'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { exportSubmissionsToCSV } from '@/lib/csv'

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
  createdAt: string
  form: { id: number; name: string }
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchSubmissions = () => {
    setLoading(true)
    fetch('/api/submissions')
      .then(r => r.json())
      .then(res => {
        if (res.success) setSubmissions(res.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSubmissions()
  }, [])

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

  return (
    <>
      <div className="header">
        <div className="header-title">询盘记录</div>
        <div className="header-actions">
          {submissions.length > 0 && (
            <button
              className="btn btn-secondary"
              onClick={() => exportSubmissionsToCSV(submissions, 'all_inquiries')}
            >
              📥 导出 CSV
            </button>
          )}
        </div>
      </div>
      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">询盘记录</div>
            <div className="page-subtitle">所有表单的提交记录，共 {submissions.length} 条</div>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="loading-spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : submissions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-title">暂无询盘记录</div>
              <div className="empty-desc">创建表单并嵌入网站后，客户提交的询盘会显示在这里</div>
              <Link href="/forms/new" className="btn btn-primary">创建第一个表单</Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>来源表单</th>
                    <th>提交数据</th>
                    <th>来源渠道</th>
                    <th>IP / 地区</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(s => {
                    let data: Record<string, string> = {}
                    try {
                      data = JSON.parse(s.data)
                    } catch {}

                    const displayFields = Object.entries(data)
                      .filter(([k]) => !['form_id', 'page_url', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_keyword'].includes(k))

                    return (
                      <tr key={s.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-muted)', minWidth: 120 }}>
                          {new Date(s.createdAt).toLocaleString('zh-CN')}
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
                          {s.utmSource && <div>渠道: {s.utmSource}</div>}
                          {s.utmKeyword && <div>词: {s.utmKeyword}</div>}
                          {s.pageUrl && (
                            <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <a href={s.pageUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                                {s.pageUrl}
                              </a>
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          <div>{s.ip || '-'}</div>
                          {(s.city || s.country) && (
                            <div style={{ fontSize: 12 }}>{[s.city, s.country].filter(Boolean).join(' ')}</div>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={deletingId === s.id}
                            onClick={() => handleDelete(s.id)}
                          >
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
    </>
  )
}
