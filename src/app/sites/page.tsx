'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface Company {
  id: number
  name: string
}

interface Website {
  id: number
  companyId: number
  name: string
  domain: string
  siteKey: string
  status: string
  allowedDomains?: string
  notifyEmail?: string
  enableHoneypot: boolean
  blacklistedIps?: string
  feishuWebhook?: string
  dingtalkWebhook?: string
  customWebhookUrl?: string
  sslExpiresAt?: string | null
  lastHttpStatus?: number | null
  lastResponseTimeMs?: number | null
  lastCheckedAt?: string | null
  ga4MeasurementId?: string | null
  fbPixelId?: string | null
  gtmContainerId?: string | null
  customHeaderScript?: string | null
  createdAt: string
  company: Company
  _count?: {
    forms: number
    submissions: number
  }
}

function SitesContent() {
  const searchParams = useSearchParams()
  const companyIdFilter = searchParams.get('companyId')

  const [websites, setWebsites] = useState<Website[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSite, setEditingSite] = useState<Website | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [inspectingId, setInspectingId] = useState<number | 'all' | null>(null)

  // Form state
  const [companyId, setCompanyId] = useState('')
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [allowedDomains, setAllowedDomains] = useState('')
  const [notifyEmail, setNotifyEmail] = useState('')
  const [enableHoneypot, setEnableHoneypot] = useState(true)
  const [blacklistedIps, setBlacklistedIps] = useState('')
  const [feishuWebhook, setFeishuWebhook] = useState('')
  const [dingtalkWebhook, setDingtalkWebhook] = useState('')
  const [customWebhookUrl, setCustomWebhookUrl] = useState('')
  const [ga4MeasurementId, setGa4MeasurementId] = useState('')
  const [fbPixelId, setFbPixelId] = useState('')
  const [gtmContainerId, setGtmContainerId] = useState('')
  const [customHeaderScript, setCustomHeaderScript] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchWebsites = async () => {
    try {
      setLoading(true)
      const url = companyIdFilter ? `/api/sites?companyId=${companyIdFilter}` : '/api/sites'
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setWebsites(data.websites)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies')
      const data = await res.json()
      if (data.success) {
        setCompanies(data.companies)
        if (data.companies.length > 0 && !companyId) {
          setCompanyId(companyIdFilter || data.companies[0].id.toString())
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchWebsites()
    fetchCompanies()
  }, [companyIdFilter])

  const openCreateModal = () => {
    setEditingSite(null)
    setName('')
    setDomain('')
    setAllowedDomains('')
    setNotifyEmail('')
    setEnableHoneypot(true)
    setBlacklistedIps('')
    setFeishuWebhook('')
    setDingtalkWebhook('')
    setCustomWebhookUrl('')
    setGa4MeasurementId('')
    setFbPixelId('')
    setGtmContainerId('')
    setCustomHeaderScript('')
    setShowModal(true)
  }

  const openEditModal = (w: Website) => {
    setEditingSite(w)
    setCompanyId(w.companyId.toString())
    setName(w.name)
    setDomain(w.domain)
    setAllowedDomains(w.allowedDomains || '')
    setNotifyEmail(w.notifyEmail || '')
    setEnableHoneypot(w.enableHoneypot !== false)
    setBlacklistedIps(w.blacklistedIps || '')
    setFeishuWebhook(w.feishuWebhook || '')
    setDingtalkWebhook(w.dingtalkWebhook || '')
    setCustomWebhookUrl(w.customWebhookUrl || '')
    setGa4MeasurementId(w.ga4MeasurementId || '')
    setFbPixelId(w.fbPixelId || '')
    setGtmContainerId(w.gtmContainerId || '')
    setCustomHeaderScript(w.customHeaderScript || '')
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !domain.trim() || !companyId) return

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        companyId: parseInt(companyId, 10),
        name: name.trim(),
        domain: domain.trim(),
        allowedDomains: allowedDomains.trim() || undefined,
        notifyEmail: notifyEmail.trim() || undefined,
        enableHoneypot,
        blacklistedIps: blacklistedIps.trim() || undefined,
        feishuWebhook: feishuWebhook.trim() || undefined,
        dingtalkWebhook: dingtalkWebhook.trim() || undefined,
        customWebhookUrl: customWebhookUrl.trim() || undefined,
        ga4MeasurementId: ga4MeasurementId.trim() || undefined,
        fbPixelId: fbPixelId.trim() || undefined,
        gtmContainerId: gtmContainerId.trim() || undefined,
        customHeaderScript: customHeaderScript.trim() || undefined,
      }

      const url = editingSite ? `/api/sites/${editingSite.id}` : '/api/sites'
      const method = editingSite ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        fetchWebsites()
      } else {
        setError(data.error || data.message || '保存独立站失败')
      }
    } catch (err: any) {
      setError(err.message || '网络请求错误')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInspect = async (siteId?: number, siteDomain?: string) => {
    setInspectingId(siteId || 'all')
    try {
      const body = siteId && siteDomain ? { websiteId: siteId, domain: siteDomain } : {}
      const res = await fetch('/api/sites/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.success) {
        fetchWebsites()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setInspectingId(null)
    }
  }

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const calculateSslDays = (sslExpiresAt?: string | null) => {
    if (!sslExpiresAt) return null
    const diffMs = new Date(sslExpiresAt).getTime() - Date.now()
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">🌐 独立站域名 / SSL 巡检 & 营销 Tag 注入</div>
          <div className="page-subtitle">探针健康监控、域名 SSL 到期倒计时、GA4 / FB Pixel Tag 极速注入</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleInspect()}
            className="btn btn-secondary"
            disabled={inspectingId === 'all'}
          >
            {inspectingId === 'all' ? '⚡ 正在全网探针巡检...' : '⚡ 一键全网巡检'}
          </button>
          <button onClick={openCreateModal} className="btn btn-primary">
            ＋ 注册新独立站
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)' }}>加载独立站列表中...</div>
        </div>
      ) : websites.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🌐</div>
            <div className="empty-title">暂无独立站</div>
            <div className="empty-desc">注册您的第一个 WordPress 或独立站，获取站点识别 Site Key</div>
            <button onClick={openCreateModal} className="btn btn-primary">
              ＋ 注册新独立站
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>站点名称</th>
                  <th>归属公司</th>
                  <th>域名 & 可达性 Uptime</th>
                  <th>SSL 证书监控</th>
                  <th>营销 Tag 注入</th>
                  <th>识别密钥 (Site Key)</th>
                  <th>询盘与表单</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {websites.map(w => {
                  const sslDays = calculateSslDays(w.sslExpiresAt)
                  return (
                    <tr key={w.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{w.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: #{w.id}</div>
                      </td>
                      <td>
                        <span className="badge badge-blue">{w.company?.name || '通用'}</span>
                      </td>
                      <td>
                        <div style={{ marginBottom: 4 }}>
                          <a href={w.domain.startsWith('http') ? w.domain : `https://${w.domain}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                            {w.domain} 🔗
                          </a>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {w.lastHttpStatus === 200 ? (
                            <span className="badge badge-green">200 OK ({w.lastResponseTimeMs || 0}ms)</span>
                          ) : w.lastHttpStatus ? (
                            <span className="badge badge-red">HTTP {w.lastHttpStatus}</span>
                          ) : (
                            <span className="badge badge-yellow">未巡检</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {sslDays !== null ? (
                          sslDays > 30 ? (
                            <span className="badge badge-green">SSL 剩余 {sslDays} 天</span>
                          ) : (
                            <span className="badge badge-red">⚠️ SSL 剩余 {sslDays} 天到期</span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>未知</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {w.ga4MeasurementId && <span className="badge badge-blue" style={{ fontSize: 10 }}>GA4: {w.ga4MeasurementId}</span>}
                          {w.fbPixelId && <span className="badge badge-yellow" style={{ fontSize: 10 }}>Pixel: {w.fbPixelId}</span>}
                          {w.gtmContainerId && <span className="badge badge-green" style={{ fontSize: 10 }}>GTM: {w.gtmContainerId}</span>}
                          {!w.ga4MeasurementId && !w.fbPixelId && !w.gtmContainerId && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>未配置</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <code className="code-block" style={{ fontSize: 11, padding: '2px 6px' }}>
                            {w.siteKey}
                          </code>
                          <button
                            onClick={() => copyToClipboard(w.siteKey)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 6px', fontSize: 11 }}
                          >
                            {copiedKey === w.siteKey ? '已复制 ✓' : '复制'}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          表单: <strong style={{ color: 'var(--primary)' }}>{w._count?.forms || 0}</strong> / 询盘: <strong style={{ color: 'var(--success)' }}>{w._count?.submissions || 0}</strong>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={inspectingId === w.id}
                            onClick={() => handleInspect(w.id, w.domain)}
                          >
                            {inspectingId === w.id ? '巡检中...' : '🔍 巡检'}
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditModal(w)}
                          >
                            编辑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Website Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title">{editingSite ? `🌐 编辑独立站配置 (${editingSite.name})` : '🌐 注册新独立站'}</div>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && <div className="alert alert-error">{error}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">归属公司 *</label>
                    <select
                      className="form-input form-select"
                      value={companyId}
                      onChange={e => setCompanyId(e.target.value)}
                      required
                    >
                      {companies.map(c => (
                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">站点名称 *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="如：北美官网 / 欧洲独立站"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">主域名 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://site-us.com"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    required
                  />
                </div>

                {/* Marketing Tag Injection Section */}
                <div style={{ background: 'var(--bg-offset, #f8f9fa)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: 'var(--primary)' }}>
                    📊 营销 Tag 代码集中注入 (SDK Automation)
                  </div>
                  <div className="form-hint" style={{ marginBottom: 10 }}>控制台配置后，该独立站加载表单时自动载入转化跟踪 Tag，免去独立站修改代码</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Google Analytics 4 ID</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="G-XXXXXXXXXX"
                        value={ga4MeasurementId}
                        onChange={e => setGa4MeasurementId(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Facebook Pixel ID</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="123456789012345"
                        value={fbPixelId}
                        onChange={e => setFbPixelId(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Google Tag Manager ID</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="GTM-XXXXXXX"
                        value={gtmContainerId}
                        onChange={e => setGtmContainerId(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>自定义 Header JS/HTML 注入代码</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                      placeholder="<!-- Custom Tracking Script -->"
                      value={customHeaderScript}
                      onChange={e => setCustomHeaderScript(e.target.value)}
                    />
                  </div>
                </div>

                {/* Security Section */}
                <div style={{ background: 'var(--bg-offset, #f8f9fa)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--primary)' }}>
                    🛡️ 安全抗刷策略配置
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={enableHoneypot}
                        onChange={e => setEnableHoneypot(e.target.checked)}
                      />
                      <span>开启静默蜜罐 Trap (自动拦截爬虫与 Bot 自动填表)</span>
                    </label>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>IP 黑名单 (逗号或换行分隔)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="1.2.3.4, 5.6.7.8"
                      value={blacklistedIps}
                      onChange={e => setBlacklistedIps(e.target.value)}
                    />
                  </div>
                </div>

                {/* Webhook Section */}
                <div style={{ background: 'var(--bg-offset, #f8f9fa)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--primary)' }}>
                    🔔 站点专属 Webhook 实时分发 (覆盖公司默认)
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>飞书机器人 Webhook</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                      value={feishuWebhook}
                      onChange={e => setFeishuWebhook(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>钉钉机器人 Webhook</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                      value={dingtalkWebhook}
                      onChange={e => setDingtalkWebhook(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  取消
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? '保存中...' : editingSite ? '保存更改' : '生成 Key 并注册'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SitesPage() {
  return (
    <Suspense fallback={
      <div className="page">
        <div className="loading-spinner" style={{ margin: '40px auto' }} />
      </div>
    }>
      <SitesContent />
    </Suspense>
  )
}
