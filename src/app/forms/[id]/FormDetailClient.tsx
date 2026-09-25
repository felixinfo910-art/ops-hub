'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { renderFormHTML, FormField } from '@/lib/form-renderer'
import { exportSubmissionsToCSV } from '@/lib/csv'

const FIELD_TYPES = [
  { value: 'text', label: '单行文本' },
  { value: 'email', label: '邮箱' },
  { value: 'tel', label: '电话/WhatsApp' },
  { value: 'textarea', label: '多行文本' },
  { value: 'select', label: '下拉选择' },
  { value: 'file', label: '文件上传' },
]

const THEMES = [
  { value: 'default', label: 'Default', color: '#2563eb', bg: '#f8f9fb' },
  { value: 'dark', label: 'Dark', color: '#6366f1', bg: '#0f172a' },
  { value: 'minimal', label: 'Minimal', color: '#18181b', bg: '#ffffff' },
]

interface FormDetailClientProps {
  initialForm: {
    id: number
    name: string
    description: string | null
    fields: string
    notifyEmail: string
    styleTheme: string
    successMessage: string
    isActive: boolean
    autoReplyEnabled?: boolean
    autoReplySubject?: string | null
    autoReplyBody?: string | null
    autoReplyCatalogUrl?: string | null
    createdAt: Date | string
    companyId: number | null
    websiteId: number | null
    company?: { id: number; name: string } | null
    website?: { id: number; name: string; domain: string } | null
    _count: { submissions: number }
  }
}

interface Submission {
  id: number
  data: string
  ip: string | null
  country: string | null
  pageUrl: string | null
  utmSource: string | null
  utmKeyword: string | null
  referrer: string | null
  isSpam?: boolean
  spamReason?: string | null
  createdAt: string
}

function FormDetailClientContent({ initialForm }: FormDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams?.get('tab') || 'settings')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submissionCount, setSubmissionCount] = useState(initialForm._count.submissions)

  const [fields, setFields] = useState<FormField[]>(() => {
    try {
      return JSON.parse(initialForm.fields || '[]')
    } catch {
      return []
    }
  })

  const [form, setForm] = useState({
    name: initialForm.name || '',
    description: initialForm.description || '',
    notifyEmail: initialForm.notifyEmail || '',
    styleTheme: initialForm.styleTheme || 'default',
    successMessage: initialForm.successMessage || '',
    isActive: initialForm.isActive ?? true,
    autoReplyEnabled: initialForm.autoReplyEnabled ?? false,
    autoReplySubject: initialForm.autoReplySubject || '',
    autoReplyBody: initialForm.autoReplyBody || '',
    autoReplyCatalogUrl: initialForm.autoReplyCatalogUrl || '',
    customCss: (initialForm as any).customCss || '',
    styleConfig: (() => {
      try {
        return typeof (initialForm as any).styleConfig === 'string'
          ? JSON.parse((initialForm as any).styleConfig)
          : ((initialForm as any).styleConfig || {})
      } catch {
        return {}
      }
    })(),
    companyId: initialForm.companyId ? initialForm.companyId.toString() : '',
    websiteId: initialForm.websiteId ? initialForm.websiteId.toString() : '',
  })

  const [companies, setCompanies] = useState<{id: number, name: string}[]>([])
  const [websites, setWebsites] = useState<{id: number, name: string, domain: string, companyId: number}[]>([])

  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile' | 'full'>('desktop')

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)

  useEffect(() => {
    // Fetch submissions if tab is active
    if (activeTab === 'submissions') {
      setSubmissionsLoading(true)
      fetch(`/api/forms/${initialForm.id}/submissions`)
        .then(r => r.json())
        .then(data => { if (data.success) setSubmissions(data.data) })
        .catch(err => console.error('Fetch submissions error:', err))
        .finally(() => setSubmissionsLoading(false))
    }

    // Fetch companies and sites for the dropdowns
    fetch('/api/companies')
      .then(res => res.json())
      .then(data => { if (data.success) setCompanies(data.companies) })
      .catch(() => {})

    fetch('/api/sites')
      .then(res => res.json())
      .then(data => { if (data.success) setWebsites(data.websites) })
      .catch(() => {})
  }, [activeTab, initialForm.id])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/forms/${initialForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          companyId: form.companyId ? parseInt(form.companyId, 10) : null,
          websiteId: form.websiteId ? parseInt(form.websiteId, 10) : null,
          fields,
          styleConfig: JSON.stringify(form.styleConfig),
        }),
      })
      const data = await res.json()
      if (data.success) setSuccess('保存成功！')
      else setError(data.message || '保存失败')
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`确定删除表单"${form.name}"？此操作会删除所有询盘记录，不可恢复！`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/forms/${initialForm.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) router.push('/forms')
      else setError(data.message || '删除失败')
    } catch {
      setError('删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSubmission = async (submissionId: number) => {
    if (!confirm('确定删除此条询盘记录？')) return
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setSubmissions(submissions.filter(s => s.id !== submissionId))
        setSubmissionCount(prev => Math.max(0, prev - 1))
      } else {
        alert(data.message || '删除询盘失败')
      }
    } catch {
      alert('删除询盘失败')
    }
  }

  const moveFieldUp = (index: number) => {
    if (index <= 0) return
    const updated = [...fields]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    setFields(updated)
    if (editingIndex === index) setEditingIndex(index - 1)
    else if (editingIndex === index - 1) setEditingIndex(index)
  }

  const moveFieldDown = (index: number) => {
    if (index >= fields.length - 1) return
    const updated = [...fields]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    setFields(updated)
    if (editingIndex === index) setEditingIndex(index + 1)
    else if (editingIndex === index + 1) setEditingIndex(index)
  }

  const addField = () => {
    const newField: FormField = { id: `field_${Date.now()}`, label: '新字段', type: 'text', placeholder: '', required: false, width: 'full' }
    setFields([...fields, newField])
    setEditingField({ ...newField })
    setEditingIndex(fields.length)
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
    if (editingIndex === index) { setEditingField(null); setEditingIndex(null) }
  }

  const saveFieldEdit = () => {
    if (editingField && editingIndex !== null) {
      const updated = [...fields]
      updated[editingIndex] = editingField
      setFields(updated)
      setEditingField(null)
      setEditingIndex(null)
    }
  }

  const appUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://ops.dtafac.com'

  const previewHtml = renderFormHTML(
    initialForm.id,
    form.name || 'Form Preview',
    fields,
    form.successMessage || 'Thank you for your submission!',
    (form.styleTheme as any) || 'default',
    '#',
    form.styleConfig,
    form.customCss,
    true,
    null
  )

  const fullDocHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
      background: transparent;
    }
  </style>
</head>
<body>
  ${previewHtml}
</body>
</html>`

  return (
    <>
      <div className="header">
        <div className="header-title">
          <Link href="/forms" style={{ color: 'var(--text-muted)', marginRight: 8 }}>表单管理</Link>
          / {form.name}
          <span style={{ fontFamily: 'monospace', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 4, fontSize: 12, marginLeft: 10 }}>
            #{initialForm.id}
          </span>
        </div>
        <div className="header-actions">
          <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? '删除中...' : '删除'}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '💾 保存'}
          </button>
        </div>
      </div>
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="tabs">
          {[
            { key: 'settings', label: '⚙️ 基本设置' },
            { key: 'appearance', label: '🎨 外观与实时预览' },
            { key: 'fields', label: '◫ 字段' },
            { key: 'autoreply', label: '✉️ 客户自动回执邮件' },
            { key: 'submissions', label: `📥 询盘 (${submissionCount})` },
            { key: 'embed', label: '🔗 嵌入代码' }
          ].map(tab => (
            <button
              key={tab.key}
              className={`tab-btn${activeTab === tab.key || (tab.key === 'appearance' && activeTab === 'preview') ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="card" style={{ maxWidth: 720 }}>
            <div className="card-header"><div className="card-title">⚙️ 基本设置</div></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">表单名称</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              
              <div className="form-group">
                <label className="form-label">归属公司 (可选)</label>
                <select
                  className="form-input form-select"
                  value={form.companyId}
                  onChange={e => {
                    setForm({ ...form, companyId: e.target.value, websiteId: '' })
                  }}
                >
                  <option value="">全部/通用公司</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id.toString()}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">归属独立站 (可选)</label>
                <select
                  className="form-input form-select"
                  value={form.websiteId}
                  onChange={e => setForm({ ...form, websiteId: e.target.value })}
                >
                  <option value="">全站/通用站点</option>
                  {(form.companyId ? websites.filter(w => w.companyId === parseInt(form.companyId, 10)) : websites).map(w => (
                    <option key={w.id} value={w.id.toString()}>{w.name} ({w.domain})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">描述</label>
                <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">通知邮箱</label>
                <input className="form-input" type="email" value={form.notifyEmail} onChange={e => setForm({ ...form, notifyEmail: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">提交成功提示语</label>
                <input className="form-input" value={form.successMessage} onChange={e => setForm({ ...form, successMessage: e.target.value })} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  <span className="form-label" style={{ margin: 0 }}>表单启用</span>
                </label>
              </div>
              <div className="form-group" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <label className="form-label">提交成功跳转链接 (Redirect URL)</label>
                <input 
                  className="form-input" 
                  placeholder="例如: https://example.com/thank-you" 
                  value={form.styleConfig?.redirectUrl || ''} 
                  onChange={e => setForm({
                    ...form,
                    styleConfig: { ...form.styleConfig, redirectUrl: e.target.value }
                  })} 
                />
                <div className="form-hint">如果设置，用户提交表单成功后将自动跳转到此页面</div>
              </div>
            </div>
          </div>
        )}

        {/* Appearance & Live Preview Tab */}
        {(activeTab === 'appearance' || activeTab === 'preview') && (
          <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 20, alignItems: 'stretch' }}>
            {/* Left: Style Customizer */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="card-header">
                <div className="card-title">外观样式自定义</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                
                {/* Preset Themes */}
                <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text)' }}>一键预设主题</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ background: '#00563b', color: '#fff', border: 'none' }}
                      onClick={() => setForm({
                        ...form,
                        styleConfig: { ...form.styleConfig, btnBg: '#00563b', labelColor: '#111827', inputRadius: '9999px', btnRadius: '9999px' }
                      })}
                    >
                      深绿 Forest
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ background: '#2563eb', color: '#fff', border: 'none' }}
                      onClick={() => setForm({
                        ...form,
                        styleConfig: { ...form.styleConfig, btnBg: '#2563eb', labelColor: '#1e293b', inputRadius: '12px', btnRadius: '12px' }
                      })}
                    >
                      科技蓝 Tech
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ background: '#18181b', color: '#fff', border: 'none' }}
                      onClick={() => setForm({
                        ...form,
                        styleConfig: { ...form.styleConfig, btnBg: '#18181b', labelColor: '#27272a', inputRadius: '8px', btnRadius: '8px' }
                      })}
                    >
                      极简黑 Minimal
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ background: '#7c3aed', color: '#fff', border: 'none' }}
                      onClick={() => setForm({
                        ...form,
                        styleConfig: { ...form.styleConfig, btnBg: '#7c3aed', labelColor: '#1e1b4b', inputRadius: '12px', btnRadius: '12px' }
                      })}
                    >
                      雅紫 Purple
                    </button>
                  </div>
                </div>

                {/* Button Section */}
                <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>提交按钮设置</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>按钮文案</label>
                      <input
                        className="form-input"
                        value={form.styleConfig?.btnTextLabel ?? 'Submit'}
                        onChange={e => setForm({
                          ...form,
                          styleConfig: { ...form.styleConfig, btnTextLabel: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>按钮背景色</label>
                      <input
                        type="color"
                        style={{ width: '100%', height: 38, border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        value={form.styleConfig?.btnBg || '#00563b'}
                        onChange={e => setForm({
                          ...form,
                          styleConfig: { ...form.styleConfig, btnBg: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>按钮字号</label>
                      <select
                        className="form-input form-select"
                        value={form.styleConfig?.btnFontSize || '15px'}
                        onChange={e => setForm({
                          ...form,
                          styleConfig: { ...form.styleConfig, btnFontSize: e.target.value }
                        })}
                      >
                        <option value="13px">13px 小</option>
                        <option value="14px">14px 标准</option>
                        <option value="15px">15px 推荐</option>
                        <option value="16px">16px 中大</option>
                        <option value="18px">18px 特大</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>按钮圆角形状</label>
                      <select
                        className="form-input form-select"
                        value={form.styleConfig?.btnRadius || '9999px'}
                        onChange={e => setForm({
                          ...form,
                          styleConfig: { ...form.styleConfig, btnRadius: e.target.value }
                        })}
                      >
                        <option value="9999px">全胶囊圆角 (Pill)</option>
                        <option value="12px">12px 圆角</option>
                        <option value="6px">6px 微圆角</option>
                        <option value="0px">直角 (0px)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Input Fields Section */}
                <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>输入框设置</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>输入框字号</label>
                      <select
                        className="form-input form-select"
                        value={form.styleConfig?.inputFontSize || '14px'}
                        onChange={e => setForm({
                          ...form,
                          styleConfig: { ...form.styleConfig, inputFontSize: e.target.value }
                        })}
                      >
                        <option value="12px">12px 小</option>
                        <option value="13px">13px 较小</option>
                        <option value="14px">14px 标准</option>
                        <option value="15px">15px 推荐</option>
                        <option value="16px">16px 大</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>输入框圆角</label>
                      <select
                        className="form-input form-select"
                        value={form.styleConfig?.inputRadius || '9999px'}
                        onChange={e => setForm({
                          ...form,
                          styleConfig: { ...form.styleConfig, inputRadius: e.target.value }
                        })}
                      >
                        <option value="9999px">全胶囊圆角 (Pill)</option>
                        <option value="12px">12px 圆角</option>
                        <option value="8px">8px 微圆角</option>
                        <option value="0px">直角 (0px)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Label Typography Section */}
                <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>字段标签设置</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>标签颜色</label>
                      <input
                        type="color"
                        style={{ width: '100%', height: 38, border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        value={form.styleConfig?.labelColor || '#111827'}
                        onChange={e => setForm({
                          ...form,
                          styleConfig: { ...form.styleConfig, labelColor: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>标签字号</label>
                      <select
                        className="form-input form-select"
                        value={form.styleConfig?.labelFontSize || '14px'}
                        onChange={e => setForm({
                          ...form,
                          styleConfig: { ...form.styleConfig, labelFontSize: e.target.value }
                        })}
                      >
                        <option value="12px">12px 小</option>
                        <option value="13px">13px 较小</option>
                        <option value="14px">14px 标准</option>
                        <option value="15px">15px 中大</option>
                        <option value="16px">16px 特大</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>标签字重</label>
                      <select
                        className="form-input form-select"
                        value={form.styleConfig?.labelFontWeight || '500'}
                        onChange={e => setForm({
                          ...form,
                          styleConfig: { ...form.styleConfig, labelFontWeight: e.target.value }
                        })}
                      >
                        <option value="400">400 正常</option>
                        <option value="500">500 中等</option>
                        <option value="600">600 加粗</option>
                        <option value="700">700 粗体</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Custom CSS */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">自定义 CSS 代码</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.4 }}
                    placeholder=".ops-submit { box-shadow: 0 10px 25px rgba(0,0,0,0.2) !important; }"
                    value={form.customCss || ''}
                    onChange={e => setForm({ ...form, customCss: e.target.value })}
                  />
                </div>

              </div>
            </div>

            {/* Right: Real-time Live Preview */}
            <div className="card" style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 680 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>👁️ 实时效果预览</span>
                  <span style={{ fontSize: 11, background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>
                    ⚡ 实时渲染中
                  </span>
                </div>
                {/* Device Selector */}
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-offset, #f1f5f9)', padding: 3, borderRadius: 8 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${previewDevice === 'desktop' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setPreviewDevice('desktop')}
                  >
                    💻 桌面 (580px)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${previewDevice === 'mobile' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setPreviewDevice('mobile')}
                  >
                    📱 移动端 (375px)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${previewDevice === 'full' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setPreviewDevice('full')}
                  >
                    🖥️ 全宽 (100%)
                  </button>
                </div>
              </div>

              <div className="card-body" style={{
                background: 'var(--bg-offset, #f8f9fa)',
                padding: 24,
                borderRadius: '0 0 12px 12px',
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'stretch',
                overflowX: 'auto'
              }}>
                <div style={{
                  width: previewDevice === 'mobile' ? 375 : previewDevice === 'desktop' ? 580 : '100%',
                  maxWidth: '100%',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: '#ffffff',
                  borderRadius: 16,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: 'stretch',
                  boxSizing: 'border-box'
                }}>
                  <iframe
                    srcDoc={fullDocHtml}
                    style={{ width: '100%', height: '100%', flex: 1, minHeight: 560, border: 'none', background: 'transparent' }}
                    title="Realtime Form Preview"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auto Reply Tab */}
        {activeTab === 'autoreply' && (
          <div className="card" style={{ maxWidth: 800 }}>
            <div className="card-header">
              <div className="card-title">✉️ 客户自动确认回执邮件 (Auto-Responder Email)</div>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.autoReplyEnabled}
                    onChange={e => setForm({ ...form, autoReplyEnabled: e.target.checked })}
                  />
                  <span className="form-label" style={{ margin: 0, fontWeight: 600 }}>开启客户自动回执邮件</span>
                </label>
                <div className="form-hint">当买家在表单填入邮箱提交后，系统将使用对应独立站/公司的 SMTP 自动向买家发送致谢回执与 Product Catalog</div>
              </div>

              {form.autoReplyEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div className="form-group">
                    <label className="form-label">回执邮件主题 (Subject) *</label>
                    <input
                      className="form-input"
                      placeholder="Thank you for contacting us - Catalog Download Inside"
                      value={form.autoReplySubject}
                      onChange={e => setForm({ ...form, autoReplySubject: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">随附 Product Catalog / PDF 链接 (可选)</label>
                    <input
                      className="form-input"
                      placeholder="https://site-us.com/downloads/catalog-2026.pdf"
                      value={form.autoReplyCatalogUrl}
                      onChange={e => setForm({ ...form, autoReplyCatalogUrl: e.target.value })}
                    />
                    <div className="form-hint">用户可在回执邮件中一键点击下载该产品手册</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">回执邮件正文 (HTML / Plaintext)</label>
                    <textarea
                      className="form-input"
                      rows={8}
                      placeholder="<p>Dear Valued Customer,</p><p>Thank you for reaching out! We have received your inquiry and our sales engineer will get back to you within 24 hours.</p>"
                      value={form.autoReplyBody}
                      onChange={e => setForm({ ...form, autoReplyBody: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fields Tab */}
        {activeTab === 'fields' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">字段列表</div>
                <button className="btn btn-secondary btn-sm" onClick={addField}>＋ 添加字段</button>
              </div>
              <div className="card-body">
                <div className="field-list">
                  {fields.map((field, index) => (
                    <div key={field.id} className="field-item">
                      <div className="field-item-drag">⠿</div>
                      <div className="field-item-info">
                        <div className="field-item-label">{field.label} {field.required && <span style={{ color: 'var(--danger)', fontSize: 12 }}>*</span>}</div>
                        <div className="field-item-meta">
                          {FIELD_TYPES.find(t => t.value === field.type)?.label} · {field.width === 'half' ? '半宽' : '全宽'}
                          {field.type === 'select' && field.options && field.options.length > 0 && ` · ${field.options.length} 个选项`}
                        </div>
                      </div>
                      <div className="field-item-actions">
                        <button className="btn btn-secondary btn-sm" title="上移" disabled={index === 0} onClick={() => moveFieldUp(index)}>↑</button>
                        <button className="btn btn-secondary btn-sm" title="下移" disabled={index === fields.length - 1} onClick={() => moveFieldDown(index)}>↓</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingField({ ...field }); setEditingIndex(index) }}>编辑</button>
                        <button className="btn btn-danger btn-sm" onClick={() => removeField(index)}>删除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {editingField && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">编辑字段</div>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditingField(null); setEditingIndex(null) }}>✕</button>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">字段标签</label>
                    <input className="form-input" value={editingField.label} onChange={e => setEditingField({ ...editingField, label: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">字段ID（英文）</label>
                    <input className="form-input" value={editingField.id} onChange={e => setEditingField({ ...editingField, id: e.target.value.replace(/\s/g, '_') })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">类型</label>
                    <select className="form-input form-select" value={editingField.type} onChange={e => setEditingField({ ...editingField, type: e.target.value as FormField['type'] })}>
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  {editingField.type === 'select' && (
                    <div className="form-group">
                      <label className="form-label">下拉选项（逗号或换行分隔）</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="选项A, 选项B, 选项C"
                        value={editingField.options ? editingField.options.join(', ') : ''}
                        onChange={e => {
                          const opts = e.target.value
                            .split(/[\n,，]/)
                            .map(s => s.trim())
                            .filter(Boolean)
                          setEditingField({ ...editingField, options: opts })
                        }}
                      />
                      <div className="form-hint">用户可在表单下拉菜单中选择这些选项</div>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">占位符</label>
                    <input className="form-input" value={editingField.placeholder || ''} onChange={e => setEditingField({ ...editingField, placeholder: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">宽度</label>
                    <select className="form-input form-select" value={editingField.width || 'full'} onChange={e => setEditingField({ ...editingField, width: e.target.value as 'full' | 'half' })}>
                      <option value="full">全宽</option>
                      <option value="half">半宽</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={editingField.required} onChange={e => setEditingField({ ...editingField, required: e.target.checked })} />
                      <span className="form-label" style={{ margin: 0 }}>必填</span>
                    </label>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveFieldEdit}>保存字段</button>
                </div>
              </div>
            )}
          </div>
        )}


        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">询盘记录 ({submissionCount})</div>
              {submissions.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => exportSubmissionsToCSV(submissions.map(s => ({ ...s, form: { name: form.name } })), `form_${initialForm.id}_inquiries`)}
                >
                  📥 导出 CSV
                </button>
              )}
            </div>
            {submissionsLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>
            ) : submissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <div className="empty-title">暂无询盘</div>
                <div className="empty-desc">将表单嵌入网站后，客户提交的询盘会显示在这里</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>状态</th><th>时间</th><th>表单数据</th><th>来源</th><th>IP</th><th>操作</th></tr>
                  </thead>
                  <tbody>
                    {submissions.map(s => {
                      let data: Record<string, string> = {}
                      try { data = JSON.parse(s.data) } catch {}
                      return (
                        <tr key={s.id}>
                          <td>
                            {s.isSpam ? (
                              <span className="badge badge-red" title={s.spamReason || 'Spam'}>
                                🚫 垃圾 [{s.spamReason}]
                              </span>
                            ) : (
                              <span className="badge badge-green">有效询盘</span>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-muted)' }}>
                            {new Date(s.createdAt).toLocaleString('zh-CN')}
                          </td>
                          <td>
                            {Object.entries(data).filter(([k]) => !k.startsWith('form_') && !k.startsWith('utm_') && !['page_url', 'referrer', '_hp_trap'].includes(k)).map(([k, v]) => (
                              <div key={k} style={{ fontSize: 13, marginBottom: 2 }}>
                                <span style={{ color: 'var(--text-muted)' }}>{k}:</span> {String(v)}
                              </div>
                            ))}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {s.utmSource && <div>来源: {s.utmSource}</div>}
                            {s.utmKeyword && <div>词: {s.utmKeyword}</div>}
                            {s.referrer && <div style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.referrer}</div>}
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.ip || '-'}</td>
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              title="删除此询盘"
                              onClick={() => handleDeleteSubmission(s.id)}
                            >
                              删除
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
        )}

        {/* Embed Tab */}
        {activeTab === 'embed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">WordPress 嵌入方式</div></div>
              <div className="card-body">
                <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
                  使用 infility-global 插件（已修改 server 地址），在 Elementor 中拖入 Infility Form 小部件，填入以下 Form ID：
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--primary)', fontFamily: 'monospace' }}>#{initialForm.id}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>在 Elementor 小部件的 Form ID 输入框中填入此数字</div>
                </div>
                <hr className="divider" />
                <p style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: 14 }}>或使用 WordPress 短码：</p>
                <div className="code-block">{`[infility_form id="${initialForm.id}"]`}</div>
                <hr className="divider" />
                <p style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: 14 }}>表单渲染 API 地址（供 WordPress 插件调用）：</p>
                <div className="code-block">{`${appUrl}/api/public/forms/${initialForm.id}/render`}</div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">WordPress 插件配置</div></div>
              <div className="card-body">
                <p style={{ color: 'var(--text-muted)', marginBottom: 12, fontSize: 14 }}>在 WordPress 后台 → Public Settings → Infility Form，将服务器地址改为：</p>
                <div className="code-block">{appUrl}</div>
                <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: 13 }}>
                  💡 修改完成后，所有使用 Infility Form 小部件的表单都会从你的 OpsHub 服务器获取
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function FormDetailClient(props: FormDetailClientProps) {
  return (
    <Suspense fallback={null}>
      <FormDetailClientContent {...props} />
    </Suspense>
  )
}
