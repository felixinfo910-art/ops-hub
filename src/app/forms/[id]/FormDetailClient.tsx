'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FormField } from '@/lib/form-renderer'
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
    createdAt: Date | string
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
  })

  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'submissions') {
      setSubmissionsLoading(true)
      fetch(`/api/forms/${initialForm.id}/submissions`)
        .then(r => r.json())
        .then(data => { if (data.success) setSubmissions(data.data) })
        .catch(err => console.error('Fetch submissions error:', err))
        .finally(() => setSubmissionsLoading(false))
    }
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
    : 'http://192.168.10.116:3000'

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
            { key: 'settings', label: '⚙️ 设置' },
            { key: 'fields', label: '◫ 字段' },
            { key: 'preview', label: '👁️ 实时效果预览' },
            { key: 'submissions', label: `📥 询盘 (${submissionCount})` },
            { key: 'embed', label: '🔗 嵌入代码' }
          ].map(tab => (
            <button key={tab.key} className={`tab-btn${activeTab === tab.key ? ' active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">基本设置</div></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">表单名称</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
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
            <div className="card">
              <div className="card-header"><div className="card-title">🎨 外观样式自定义 (Style Customizer)</div></div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Button Section */}
                  <div style={{ background: 'var(--bg-offset, #f8f9fa)', padding: 14, borderRadius: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: 'var(--primary)' }}>🔘 提交按钮设置</div>
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
                  <div style={{ background: 'var(--bg-offset, #f8f9fa)', padding: 14, borderRadius: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: 'var(--primary)' }}>📦 输入框设置</div>
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
                  <div style={{ background: 'var(--bg-offset, #f8f9fa)', padding: 14, borderRadius: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: 'var(--primary)' }}>🏷️ 字段标签设置</div>
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
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: 12 }}>全局字体 (Font Family)</label>
                        <select
                          className="form-input form-select"
                          value={form.styleConfig?.fontFamily || "'Outfit', 'Inter', -apple-system, sans-serif"}
                          onChange={e => setForm({
                            ...form,
                            styleConfig: { ...form.styleConfig, fontFamily: e.target.value }
                          })}
                        >
                          <option value="'Outfit', 'Inter', -apple-system, sans-serif">Outfit (现代圆润)</option>
                          <option value="'Inter', -apple-system, sans-serif">Inter (苹果/现代)</option>
                          <option value="'Roboto', sans-serif">Roboto (谷歌/经典)</option>
                          <option value="'Times New Roman', Times, serif">Times New Roman (衬线)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Custom CSS */}
                  <div className="form-group">
                    <label className="form-label">💻 自定义 CSS 代码 (Custom CSS)</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      style={{ fontFamily: 'monospace', fontSize: 13 }}
                      placeholder=".ops-submit { box-shadow: 0 10px 25px rgba(0,0,0,0.2) !important; }"
                      value={form.customCss || ''}
                      onChange={e => setForm({ ...form, customCss: e.target.value })}
                    />
                    <div className="form-hint">支持编写原生 CSS 属性覆盖表单样式</div>
                  </div>

                </div>
              </div>
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

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">👁️ 表单实时效果预览 (Live Preview)</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>与 WordPress 嵌入渲染完全一致</div>
            </div>
            <div className="card-body">
              <div style={{
                background: '#e6ede8',
                padding: 32,
                borderRadius: 16,
                maxWidth: 640,
                margin: '0 auto',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
              }}>
                <iframe
                  src={`/api/public/forms/${initialForm.id}/render?preview=1`}
                  style={{ width: '100%', height: 480, border: 'none', background: 'transparent' }}
                  title="Form Preview"
                />
              </div>
            </div>
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
                    <tr><th>时间</th><th>表单数据</th><th>来源</th><th>IP</th><th>操作</th></tr>
                  </thead>
                  <tbody>
                    {submissions.map(s => {
                      let data: Record<string, string> = {}
                      try { data = JSON.parse(s.data) } catch {}
                      return (
                        <tr key={s.id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-muted)' }}>
                            {new Date(s.createdAt).toLocaleString('zh-CN')}
                          </td>
                          <td>
                            {Object.entries(data).filter(([k]) => !k.startsWith('form_') && !k.startsWith('utm_') && !['page_url', 'referrer'].includes(k)).map(([k, v]) => (
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
