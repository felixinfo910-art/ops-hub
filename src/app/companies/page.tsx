'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, ArrowRightIcon, CloseIcon, EditIcon, TrashIcon } from '@/components/common/Icons'

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
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('active')
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

  const openCreateModal = () => {
    setEditingCompany(null)
    setName('')
    setCode('')
    setStatus('active')
    setNotifyEmail('')
    setFeishuWebhook('')
    setDingtalkWebhook('')
    setCustomWebhookUrl('')
    setError('')
    setShowModal(true)
  }

  const openEditModal = (c: Company) => {
    setEditingCompany(c)
    setName(c.name)
    setCode(c.code)
    setStatus(c.status || 'active')
    setNotifyEmail(c.defaultNotifyEmail || '')
    setFeishuWebhook(c.feishuWebhook || '')
    setDingtalkWebhook(c.dingtalkWebhook || '')
    setCustomWebhookUrl(c.customWebhookUrl || '')
    setError('')
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    setError('')
    try {
      const url = editingCompany ? `/api/companies/${editingCompany.id}` : '/api/companies'
      const method = editingCompany ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          status,
          defaultNotifyEmail: notifyEmail.trim() || undefined,
          feishuWebhook: feishuWebhook.trim() || undefined,
          dingtalkWebhook: dingtalkWebhook.trim() || undefined,
          customWebhookUrl: customWebhookUrl.trim() || undefined,
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        fetchCompanies()
      } else {
        setError(data.error || data.message || '保存公司信息失败')
      }
    } catch (err: any) {
      setError(err.message || '网络请求错误')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (c: Company) => {
    if (!confirm(`确定要注销/删除公司【${c.name}】吗？`)) return
    try {
      const res = await fetch(`/api/companies/${c.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchCompanies()
      } else {
        alert(data.message || '删除公司失败')
      }
    } catch (err: any) {
      alert(err.message || '网络错误')
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={openCreateModal} className="btn btn-primary btn-sm">
          <PlusIcon size={14} /> 新建公司
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
            <div className="empty-title">暂无公司</div>
            <div className="empty-desc">点击右上角“新建公司”，开始管理您的多公司或多客户主体</div>
            <button onClick={openCreateModal} className="btn btn-primary">
              <PlusIcon size={16} /> 新增第一个公司
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
                  <th style={{ textAlign: 'right' }}>操作</th>
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
                        <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {c._count?.websites || 0} 个站点 <ArrowRightIcon size={12} />
                        </span>
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
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(c)}
                          style={{ padding: '4px 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <EditIcon size={12} /> 编辑
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(c)}
                          style={{ padding: '4px 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <TrashIcon size={12} /> 删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Company Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div className="modal-title">{editingCompany ? `编辑公司 — ${editingCompany.name}` : '新建公司 / 业务主体'}</div>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm" style={{ padding: 6 }}>
                <CloseIcon size={14} />
              </button>
            </div>
            <form onSubmit={handleSave}>
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
                    disabled={!!editingCompany}
                    onChange={e => setCode(e.target.value)}
                  />
                </div>

                {editingCompany && (
                  <div className="form-group">
                    <label className="form-label">账号状态</label>
                    <select
                      className="form-input form-select"
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                    >
                      <option value="active">正常运行 (Active)</option>
                      <option value="disabled">暂停合作 / 禁用 (Disabled)</option>
                    </select>
                  </div>
                )}

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
                    实时 Webhook 分发配置 (可选)
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
                    <label className="form-label" style={{ fontSize: 12 }}>自定义 HTTP POST Webhook URL</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://api.yourdomain.com/webhooks/inquiries"
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
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '保存中...' : '💾 保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
