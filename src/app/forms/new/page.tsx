'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FormField } from '@/lib/form-renderer'

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

const DEFAULT_FIELDS: FormField[] = [
  { id: 'your_name', label: 'Your Name', type: 'text', placeholder: 'Your full name', required: true, width: 'full' },
  { id: 'your_phone', label: 'Your Phone/WhatsApp', type: 'tel', placeholder: '+1 234 567 8900', required: true, width: 'half' },
  { id: 'your_email', label: 'Your Email', type: 'email', placeholder: 'email@example.com', required: true, width: 'half' },
  { id: 'message', label: 'Message', type: 'textarea', placeholder: 'Tell us about your inquiry...', required: false, width: 'full' },
]

export default function NewFormPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS)
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    notifyEmail: 'dtafilter@sina.com',
    styleTheme: 'default',
    successMessage: 'Thank you! We will contact you soon. 感谢您的询盘，我们将尽快与您联系。',
  })

  const handleSave = async () => {
    if (!form.name || !form.notifyEmail || fields.length === 0) {
      setError('请填写表单名称、通知邮箱，并至少添加一个字段')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fields }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(`/forms/${data.data.id}`)
      } else {
        setError(data.message || '创建失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSaving(false)
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
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: '新字段',
      type: 'text',
      placeholder: '',
      required: false,
      width: 'full',
    }
    setFields([...fields, newField])
    setEditingField({ ...newField })
    setEditingIndex(fields.length)
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingField(null)
      setEditingIndex(null)
    }
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

  return (
    <>
      <div className="header">
        <div className="header-title">新建表单</div>
        <div className="header-actions">
          <Link href="/forms" className="btn btn-secondary">取消</Link>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '💾 保存表单'}
          </button>
        </div>
      </div>
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
          {/* Left: Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Basic info */}
            <div className="card">
              <div className="card-header"><div className="card-title">基本信息</div></div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="form-group col-span-2">
                    <label className="form-label">表单名称 *</label>
                    <input className="form-input" placeholder="如：联系表单-网站A" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">描述（可选）</label>
                    <input className="form-input" placeholder="表单的用途说明" value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">通知邮箱 *</label>
                    <input className="form-input" type="email" placeholder="收到询盘时发送到此邮箱" value={form.notifyEmail}
                      onChange={e => setForm({ ...form, notifyEmail: e.target.value })} />
                    <div className="form-hint">客户提交表单后，询盘邮件会发送到此地址</div>
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">提交成功提示语</label>
                    <input className="form-input" value={form.successMessage}
                      onChange={e => setForm({ ...form, successMessage: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">表单字段</div>
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
                  {fields.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      点击"添加字段"开始配置表单
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Theme */}
            <div className="card">
              <div className="card-header"><div className="card-title">样式主题</div></div>
              <div className="card-body">
                <div className="theme-grid">
                  {THEMES.map(theme => (
                    <div
                      key={theme.value}
                      className={`theme-option${form.styleTheme === theme.value ? ' selected' : ''}`}
                      onClick={() => setForm({ ...form, styleTheme: theme.value })}
                    >
                      <div className="theme-preview" style={{
                        background: theme.bg,
                        border: `1px solid ${theme.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <div style={{ width: 40, height: 6, background: theme.color, borderRadius: 3 }} />
                      </div>
                      <div className="theme-name">{theme.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Field Editor Modal */}
            {editingField && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">编辑字段</div>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditingField(null); setEditingIndex(null) }}>✕</button>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">字段标签</label>
                    <input className="form-input" value={editingField.label}
                      onChange={e => setEditingField({ ...editingField, label: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">字段ID（英文）</label>
                    <input className="form-input" value={editingField.id}
                      onChange={e => setEditingField({ ...editingField, id: e.target.value.replace(/\s/g, '_') })} />
                    <div className="form-hint">提交数据时的字段名，建议用英文下划线</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">类型</label>
                    <select className="form-input form-select" value={editingField.type}
                      onChange={e => setEditingField({ ...editingField, type: e.target.value as FormField['type'] })}>
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
                    <label className="form-label">占位符文字</label>
                    <input className="form-input" value={editingField.placeholder || ''}
                      onChange={e => setEditingField({ ...editingField, placeholder: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">宽度</label>
                    <select className="form-input form-select" value={editingField.width || 'full'}
                      onChange={e => setEditingField({ ...editingField, width: e.target.value as 'full' | 'half' })}>
                      <option value="full">全宽</option>
                      <option value="half">半宽</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={editingField.required}
                        onChange={e => setEditingField({ ...editingField, required: e.target.checked })} />
                      <span className="form-label" style={{ margin: 0 }}>必填字段</span>
                    </label>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveFieldEdit}>
                    保存字段
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
