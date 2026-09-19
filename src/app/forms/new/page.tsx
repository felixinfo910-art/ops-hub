'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FormField } from '@/lib/form-renderer'

interface Company {
  id: number
  name: string
}

interface Website {
  id: number
  name: string
  domain: string
  companyId: number
}

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

// Multi-Language i18n Presets
const I18N_PRESETS: Record<string, { label: string; fields: FormField[]; successMsg: string }> = {
  en: {
    label: '🇬🇧 英语 (English)',
    successMsg: 'Thank you for your inquiry! We will get back to you shortly.',
    fields: [
      { id: 'your_name', label: 'Your Name', type: 'text', placeholder: 'John Doe', required: true, width: 'full' },
      { id: 'your_phone', label: 'Phone / WhatsApp', type: 'tel', placeholder: '+1 234 567 8900', required: true, width: 'half' },
      { id: 'your_email', label: 'Email Address', type: 'email', placeholder: 'email@example.com', required: true, width: 'half' },
      { id: 'subject', label: 'Inquiry Subject', type: 'text', placeholder: 'Product details / Quotation', required: false, width: 'full' },
      { id: 'message', label: 'Message / Requirements', type: 'textarea', placeholder: 'Tell us about your requirements...', required: false, width: 'full' },
    ]
  },
  de: {
    label: '🇩🇪 德语 (Deutsch)',
    successMsg: 'Vielen Dank für Ihre Anfrage! Wir werden uns umgehend bei Ihnen melden.',
    fields: [
      { id: 'your_name', label: 'Ihr Name', type: 'text', placeholder: 'Max Mustermann', required: true, width: 'full' },
      { id: 'your_phone', label: 'Telefon / WhatsApp', type: 'tel', placeholder: '+49 123 456 7890', required: true, width: 'half' },
      { id: 'your_email', label: 'E-Mail-Adresse', type: 'email', placeholder: 'kontakt@beispiel.de', required: true, width: 'half' },
      { id: 'subject', label: 'Betreff', type: 'text', placeholder: 'Produktanfrage / Angebot', required: false, width: 'full' },
      { id: 'message', label: 'Ihre Nachricht', type: 'textarea', placeholder: 'Beschreiben Sie Ihre Anforderungen...', required: false, width: 'full' },
    ]
  },
  fr: {
    label: '🇫🇷 法语 (Français)',
    successMsg: 'Merci pour votre demande! Nous vous contacterons sous peu.',
    fields: [
      { id: 'your_name', label: 'Votre Nom', type: 'text', placeholder: 'Jean Dupont', required: true, width: 'full' },
      { id: 'your_phone', label: 'Téléphone / WhatsApp', type: 'tel', placeholder: '+33 1 23 45 67 89', required: true, width: 'half' },
      { id: 'your_email', label: 'Adresse E-mail', type: 'email', placeholder: 'contact@exemple.fr', required: true, width: 'half' },
      { id: 'subject', label: 'Sujet de la demande', type: 'text', placeholder: 'Devis / Information produit', required: false, width: 'full' },
      { id: 'message', label: 'Votre Message', type: 'textarea', placeholder: 'Détaillez votre besoin...', required: false, width: 'full' },
    ]
  },
  es: {
    label: '🇪🇸 西班牙语 (Español)',
    successMsg: '¡Gracias por su consulta! Nos pondremos en contacto con usted en breve.',
    fields: [
      { id: 'your_name', label: 'Su Nombre', type: 'text', placeholder: 'Carlos García', required: true, width: 'full' },
      { id: 'your_phone', label: 'Teléfono / WhatsApp', type: 'tel', placeholder: '+34 600 000 000', required: true, width: 'half' },
      { id: 'your_email', label: 'Correo Electrónico', type: 'email', placeholder: 'contacto@ejemplo.es', required: true, width: 'half' },
      { id: 'subject', label: 'Asunto de la consulta', type: 'text', placeholder: 'Presupuesto / Información', required: false, width: 'full' },
      { id: 'message', label: 'Su Mensaje', type: 'textarea', placeholder: 'Describa sus necesidades...', required: false, width: 'full' },
    ]
  },
  ja: {
    label: '🇯🇵 日语 (日本語)',
    successMsg: 'お問い合わせありがとうございます。担当者より迅速にご連絡いたします。',
    fields: [
      { id: 'your_name', label: 'お名前', type: 'text', placeholder: '山田 太郎', required: true, width: 'full' },
      { id: 'your_phone', label: 'お電話番号 / WhatsApp', type: 'tel', placeholder: '090-1234-5678', required: true, width: 'half' },
      { id: 'your_email', label: 'メールアドレス', type: 'email', placeholder: 'info@example.jp', required: true, width: 'half' },
      { id: 'subject', label: '件名', type: 'text', placeholder: 'お見積もり・製品のお問い合わせ', required: false, width: 'full' },
      { id: 'message', label: 'お問い合わせ内容', type: 'textarea', placeholder: '詳細内容をご記入ください...', required: false, width: 'full' },
    ]
  }
}

export default function NewFormPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [websites, setWebsites] = useState<Website[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [companyId, setCompanyId] = useState('')
  const [websiteId, setWebsiteId] = useState('')
  const [fields, setFields] = useState<FormField[]>(I18N_PRESETS.en.fields)
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    notifyEmail: 'service@company.com',
    styleTheme: 'default',
    successMessage: I18N_PRESETS.en.successMsg,
  })

  useEffect(() => {
    fetch('/api/companies')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCompanies(data.companies)
      })
      .catch(() => {})

    fetch('/api/sites')
      .then(res => res.json())
      .then(data => {
        if (data.success) setWebsites(data.websites)
      })
      .catch(() => {})
  }, [])

  const applyI18nPreset = (langKey: string) => {
    const preset = I18N_PRESETS[langKey]
    if (preset) {
      setFields(preset.fields)
      setForm(prev => ({ ...prev, successMessage: preset.successMsg }))
    }
  }

  const handleSave = async () => {
    if (!form.name || fields.length === 0) {
      setError('请填写表单名称，并至少包含一个字段')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          companyId: companyId ? parseInt(companyId, 10) : undefined,
          websiteId: websiteId ? parseInt(websiteId, 10) : undefined,
          fields
        }),
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

  const filteredWebsites = companyId
    ? websites.filter(w => w.companyId === parseInt(companyId, 10))
    : websites

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">◫ 新建询盘表单</div>
          <div className="page-subtitle">设计表单字段、多语言预设及多租户归属绑定</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/forms" className="btn btn-secondary">取消</Link>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '💾 保存表单'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Left: Basic Info & Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Basic Info */}
          <div className="card">
            <div className="card-header"><div className="card-title">基本信息与归属</div></div>
            <div className="card-body">
              <div className="form-grid">
                <div className="form-group col-span-2">
                  <label className="form-label">表单名称 *</label>
                  <input className="form-input" placeholder="如：北美官网 - 首页 Contact Us 表单" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">归属公司 (可选)</label>
                  <select
                    className="form-input form-select"
                    value={companyId}
                    onChange={e => {
                      setCompanyId(e.target.value)
                      setWebsiteId('')
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
                    value={websiteId}
                    onChange={e => setWebsiteId(e.target.value)}
                  >
                    <option value="">全站/通用站点</option>
                    {filteredWebsites.map(w => (
                      <option key={w.id} value={w.id.toString()}>{w.name} ({w.domain})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group col-span-2">
                  <label className="form-label">接收询盘通知邮箱</label>
                  <input className="form-input" type="email" placeholder="service@company.com (留空则继承站点/公司默认邮箱)" value={form.notifyEmail}
                    onChange={e => setForm({ ...form, notifyEmail: e.target.value })} />
                  <div className="form-hint">留空时将按【独立站 ➔ 公司 ➔ 系统】顺位自动继承通知邮箱</div>
                </div>

                <div className="form-group col-span-2">
                  <label className="form-label">提交成功提示语</label>
                  <input className="form-input" value={form.successMessage}
                    onChange={e => setForm({ ...form, successMessage: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          {/* i18n Presets & Field Builder */}
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div className="card-title">表单字段集</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontWeight: 500 }}>🌐 一键套用多语言预设：</span>
                <select
                  className="form-input form-select"
                  style={{ width: 170, padding: '4px 8px', fontSize: 12, height: 30 }}
                  onChange={e => applyI18nPreset(e.target.value)}
                  defaultValue="en"
                >
                  {Object.entries(I18N_PRESETS).map(([k, p]) => (
                    <option key={k} value={k}>{p.label}</option>
                  ))}
                </select>
                <button className="btn btn-secondary btn-sm" onClick={addField}>＋ 添加自定义字段</button>
              </div>
            </div>
            <div className="card-body">
              <div className="field-list">
                {fields.map((field, index) => (
                  <div key={field.id} className="field-item">
                    <div className="field-item-drag">⠿</div>
                    <div className="field-item-info">
                      <div className="field-item-label">{field.label} {field.required && <span style={{ color: 'var(--danger)', fontSize: 12 }}>*</span>}</div>
                      <div className="field-item-meta">
                        ID: <code style={{ color: 'var(--primary)', fontSize: 11 }}>{field.id}</code> · {FIELD_TYPES.find(t => t.value === field.type)?.label} · {field.width === 'half' ? '半宽' : '全宽'}
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
                    点击"添加字段"或选择上方“多语言预设”开始配置表单
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Style & Editor */}
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

          {/* Field Editor Drawer */}
          {editingField && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">编辑字段属性</div>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditingField(null); setEditingIndex(null) }}>✕</button>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">字段标签 (Label)</label>
                  <input className="form-input" value={editingField.label}
                    onChange={e => setEditingField({ ...editingField, label: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">字段 ID (Key)</label>
                  <input className="form-input" value={editingField.id}
                    onChange={e => setEditingField({ ...editingField, id: e.target.value.replace(/\s/g, '_') })} />
                  <div className="form-hint">英文字符，用作数据库与 CSV 导出列名</div>
                </div>
                <div className="form-group">
                  <label className="form-label">输入控件类型</label>
                  <select className="form-input form-select" value={editingField.type}
                    onChange={e => setEditingField({ ...editingField, type: e.target.value as FormField['type'] })}>
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                {editingField.type === 'select' && (
                  <div className="form-group">
                    <label className="form-label">下拉选项 (逗号分隔)</label>
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
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">占位符 (Placeholder)</label>
                  <input className="form-input" value={editingField.placeholder || ''}
                    onChange={e => setEditingField({ ...editingField, placeholder: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">布局宽度</label>
                  <select className="form-input form-select" value={editingField.width || 'full'}
                    onChange={e => setEditingField({ ...editingField, width: e.target.value as 'full' | 'half' })}>
                    <option value="full">全宽 (100%)</option>
                    <option value="half">半宽 (50%)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={editingField.required}
                      onChange={e => setEditingField({ ...editingField, required: e.target.checked })} />
                    <span className="form-label" style={{ margin: 0 }}>必填项 (Required)</span>
                  </label>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveFieldEdit}>
                  确认保存修改
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
