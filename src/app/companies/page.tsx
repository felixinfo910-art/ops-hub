'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Company {
  id: number
  name: string
  code: string
  status: string
  defaultNotifyEmail?: string
  feishuWebhook?: string
  dingtalkWebhook?: string
  customWebhookUrl?: string
  createdAt: string
  _count?: {
    websites: number
    forms: number
    submissions: number
    users: number
  }
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [notifyEmail, setNotifyEmail] = useState('')
  const [feishuWebhook, setFeishuWebhook] = useState('')
  const [dingtalkWebhook, setDingtalkWebhook] = useState('')
  const [customWebhookUrl, setCustomWebhookUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/companies')
      const data = await res.json()
      if (data.success) {
        setCompanies(data.companies)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          defaultNotifyEmail: notifyEmail.trim() || undefined,
          feishuWebhook: feishuWebhook.trim() || undefined,
          dingtalkWebhook: dingtalkWebhook.trim() || undefined,
          customWebhookUrl: customWebhookUrl.trim() || undefined,
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        setName('')
        setCode('')
        setNotifyEmail('')
        setFeishuWebhook('')
        setDingtalkWebhook('')
        setCustomWebhookUrl('')
        fetchCompanies()
      } else {
        setError(data.error || '创建公司失败')
      }
    } catch (err: any) {
      setError(err.message || '网络请求错误')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">🏢 公司与项目管理</div>
          <div className="page-subtitle">管理多公司/租户主体、默认 SMTP 与全网 Webhook 实时通知</div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          ＋ 新建公司
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)' }}>加载公司列表中...</div>
        </div>
      ) : companies.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🏢</div>
            <div className="empty-title">暂无公司</div>
            <div className="empty-desc">点击右上角“新建公司”，开始管理您的多公司或多客户主体</div>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              ＋ 新增第一个公司
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>公司名称</th>
                  <th>代号</th>
                  <th>关联独立站</th>
                  <th>关联表单</th>
                  <th>累计询盘</th>
                  <th>Webhook 推送</th>
                  <th>状态</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                    </td>
                    <td>
                      <span className="code-block" style={{ fontSize: 12, padding: '2px 6px' }}>{c.code}</span>
                    </td>
                    <td>
                      <Link href={`/sites?companyId=${c.id}`}>
                        <span className="badge badge-blue">{c._count?.websites || 0} 个站点 ➔</span>
                      </Link>
                    </td>
                    <td>
                      <span className="badge badge-yellow">{c._count?.forms || 0} 个表单</span>
                    </td>
                    <td>
                      <span className="badge badge-green">{c._count?.submissions || 0} 条</span>
                    </td>
                    <td>
                      {c.feishuWebhook || c.dingtalkWebhook || c.customWebhookUrl ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {c.feishuWebhook && <span className="badge badge-blue">飞书</span>}
                          {c.dingtalkWebhook && <span className="badge badge-yellow">钉钉</span>}
                          {c.customWebhookUrl && <span className="badge badge-green">Custom</span>}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>未配置</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                        {c.status === 'active' ? '正常' : '已暂停'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(c.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div className="modal-title">🏢 新建公司 / 业务主体</div>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}

                <div className="form-group">
                  <label className="form-label">公司 / 客户名称 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="如：极客科技有限公司 / Acme Inc"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">公司唯一代号 (可选)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="如：acme_inc（若留空自动生成）"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">默认通知邮箱 (可选)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="service@company.com"
                    value={notifyEmail}
                    onChange={e => setNotifyEmail(e.target.value)}
                  />
                </div>

                <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 8, border: '1px solid var(--border)', marginTop: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--primary)' }}>
                    🔔 实时 Webhook 分发配置 (可选)
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>飞书机器人 Webhook URL</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                      value={feishuWebhook}
                      onChange={e => setFeishuWebhook(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>钉钉机器人 Webhook URL</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                      value={dingtalkWebhook}
                      onChange={e => setDingtalkWebhook(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>自定义 HTTP POST Endpoint</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://crm.company.com/api/webhooks/inquiry"
                      value={customWebhookUrl}
                      onChange={e => setCustomWebhookUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  取消
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? '提交中...' : '确认创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
