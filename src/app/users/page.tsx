'use client'
import { useEffect, useState } from 'react'

interface Company {
  id: number
  name: string
}

interface Website {
  id: number
  name: string
  domain: string
  companyId: number
  company?: Company
}

interface WebsitePermission {
  website: {
    id: number
    name: string
    domain: string
    companyId: number
    company?: Company
  }
}

interface User {
  id: number
  email: string
  name?: string
  role: 'super_admin' | 'company_admin' | 'site_manager' | 'viewer'
  companyId?: number
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  company?: Company
  sitePermissions?: WebsitePermission[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [allWebsites, setAllWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'super_admin' | 'company_admin' | 'site_manager' | 'viewer'>('company_admin')
  const [companyId, setCompanyId] = useState('')
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/users')
      const data = await res.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompaniesAndSites = async () => {
    try {
      const [compRes, siteRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/sites')
      ])
      const compData = await compRes.json()
      const siteData = await siteRes.json()

      if (compData.success) {
        setCompanies(compData.companies)
        if (compData.companies.length > 0 && !companyId) {
          setCompanyId(compData.companies[0].id.toString())
        }
      }
      if (siteData.success) {
        setAllWebsites(siteData.websites)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchCompaniesAndSites()
  }, [])

  const openCreateModal = () => {
    setEditingUser(null)
    setEmail('')
    setPassword('')
    setName('')
    setRole('company_admin')
    setSelectedSiteIds([])
    setError('')
    setShowModal(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setEmail(user.email)
    setPassword('')
    setName(user.name || '')
    setRole(user.role)
    setCompanyId(user.companyId ? user.companyId.toString() : (companies[0]?.id.toString() || ''))
    setSelectedSiteIds(user.sitePermissions ? user.sitePermissions.map(sp => sp.website.id) : [])
    setError('')
    setShowModal(true)
  }

  const handleSiteCheckboxChange = (siteId: number) => {
    setSelectedSiteIds(prev =>
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const payload: any = {
        name: name.trim() || undefined,
        role,
        companyId: role === 'super_admin' ? undefined : (companyId ? parseInt(companyId, 10) : undefined),
        siteIds: (role === 'site_manager' || role === 'viewer') ? selectedSiteIds : []
      }

      let res
      if (editingUser) {
        if (password.trim()) payload.password = password.trim()
        res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        if (!email.trim() || !password) {
          setError('邮箱和初始密码不能为空')
          setSubmitting(false)
          return
        }
        payload.email = email.trim()
        payload.password = password
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        fetchUsers()
      } else {
        setError(data.error || '保存失败')
      }
    } catch (err: any) {
      setError(err.message || '网络请求错误')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleUserActive = async (user: User) => {
    if (user.email.toLowerCase() === 'admin@opshub.com') {
      alert('🔒 系统原生超级管理员受强制保护，严禁禁用！')
      return
    }
    const actionText = user.isActive ? '冻结' : '恢复'
    if (!confirm(`确定要${actionText}账号 [${user.email}] 吗？`)) return

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive })
      })
      const data = await res.json()
      if (data.success) {
        fetchUsers()
      } else {
        alert(data.error || `${actionText}失败`)
      }
    } catch {
      alert(`${actionText}异常`)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTargetUser || !newPassword || newPassword.length < 6) return

    try {
      const res = await fetch(`/api/users/${resetTargetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword.trim() })
      })
      const data = await res.json()
      if (data.success) {
        alert(`账号 [${resetTargetUser.email}] 密码重置成功！`)
        setShowResetModal(false)
        setNewPassword('')
      } else {
        alert(data.error || '密码重置失败')
      }
    } catch {
      alert('重置密码异常')
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (user.email.toLowerCase() === 'admin@opshub.com') {
      alert('🔒 系统原生超级管理员受强制保护，严禁删除！')
      return
    }
    if (!confirm(`警告：确定永久删除账号 [${user.email}] 吗？此操作不可撤销！`)) return
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchUsers()
      } else {
        alert(data.error || '删除失败')
      }
    } catch {
      alert('删除失败')
    }
  }

  const getRoleBadge = (roleStr: string, isProtected: boolean = false) => {
    if (isProtected) {
      return <span className="badge badge-red">🔒 原生超级管理员 (受保护)</span>
    }
    switch (roleStr) {
      case 'super_admin':
        return <span className="badge badge-red">超级管理员</span>
      case 'company_admin':
        return <span className="badge badge-blue">公司管理员</span>
      case 'site_manager':
        return <span className="badge badge-yellow">站点管理员</span>
      case 'viewer':
        return <span className="badge badge-green">数据观察员</span>
      default:
        return <span className="badge">{roleStr}</span>
    }
  }

  // Group all websites by company for multi-company checklist
  const websitesByCompany = companies.map(company => ({
    company,
    sites: allWebsites.filter(w => w.companyId === company.id)
  })).filter(group => group.sites.length > 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">👥 账号与角色权限管理</div>
          <div className="page-subtitle">开通员工账号，跨公司勾选指派独立站（支持跨公司多选与可视化授权）</div>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          ＋ 开通新账号
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)' }}>加载账号列表中...</div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>用户 / 姓名</th>
                  <th>登录邮箱</th>
                  <th>角色身份</th>
                  <th>主归属公司</th>
                  <th>已勾选授权独立站 (已授明细)</th>
                  <th>账号状态</th>
                  <th>最后登录</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isProtected = u.email.toLowerCase() === 'admin@opshub.com'
                  return (
                    <tr key={u.id} style={isProtected ? { background: 'rgba(239, 68, 68, 0.03)' } : undefined}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {isProtected ? '🔒 ' : ''}{u.name || '未设置'}
                        </div>
                      </td>
                      <td>
                        <code style={{ fontSize: 13, color: 'var(--primary)' }}>{u.email}</code>
                      </td>
                      <td>{getRoleBadge(u.role, isProtected)}</td>
                      <td>
                        {u.role === 'super_admin' ? (
                          <span style={{ color: 'var(--text-subtle)', fontSize: 13 }}>全平台</span>
                        ) : (
                          <span className="badge badge-blue">{u.company?.name || '通用公司'}</span>
                        )}
                      </td>
                      <td>
                        {u.role === 'super_admin' || u.role === 'company_admin' ? (
                          <span style={{ color: 'var(--text-subtle)', fontSize: 13 }}>全权接入（本公司全站）</span>
                        ) : u.sitePermissions && u.sitePermissions.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {u.sitePermissions.map(p => (
                              <span key={p.website.id} className="badge badge-yellow" style={{ fontSize: 11 }}>
                                [{p.website.company?.name || '站点'}] {p.website.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--danger)', fontSize: 12 }}>未勾选授权独立站</span>
                        )}
                      </td>
                      <td>
                        {isProtected ? (
                          <span className="badge badge-green">🔒 永久正常</span>
                        ) : (
                          <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                            {u.isActive ? '正常' : '已冻结'}
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('zh-CN') : '未登录过'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEditModal(u)} className="btn btn-secondary btn-sm">
                            编辑/授权
                          </button>
                          <button
                            onClick={() => toggleUserActive(u)}
                            disabled={isProtected}
                            title={isProtected ? '🔒 原生超级管理员受保护，无法禁用' : ''}
                            className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-secondary'}`}
                            style={isProtected ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                          >
                            {u.isActive ? '冻结' : '恢复'}
                          </button>
                          <button
                            onClick={() => { setResetTargetUser(u); setNewPassword(''); setShowResetModal(true); }}
                            className="btn btn-secondary btn-sm"
                          >
                            改密
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isProtected}
                            title={isProtected ? '🔒 原生超级管理员受保护，无法删除' : ''}
                            className="btn btn-danger btn-sm"
                            style={isProtected ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                          >
                            🗑️
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

      {/* Create / Edit User Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingUser ? `✏️ 编辑用户与指派授权 [${editingUser.email}]` : '👥 开通新用户账号'}
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && <div className="alert alert-error">{error}</div>}

                {editingUser?.email.toLowerCase() === 'admin@opshub.com' && (
                  <div className="alert alert-info">
                    🔒 当前正在修改原生超级管理员信息。该账号的角色与状态已强制锁定，严禁降级或禁用！
                  </div>
                )}

                {!editingUser && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">登录邮箱 *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="user@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{editingUser ? '重置新密码 (不改请留空)' : '初始密码 *'}</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="至少 6 位字符"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required={!editingUser}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">真实姓名 / 称呼</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="如：张经理 / Alex"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">选择角色身份 *</label>
                  <select
                    className="form-input form-select"
                    value={role}
                    disabled={editingUser?.email.toLowerCase() === 'admin@opshub.com'}
                    onChange={e => setRole(e.target.value as any)}
                  >
                    <option value="company_admin">公司管理员 (拥有本公司所有独立站的管理与账号权)</option>
                    <option value="site_manager">站点管理员 (打勾跨公司指派 1~N 个独立站管辖权)</option>
                    <option value="viewer">数据观察员 (打勾指派独立站，只读查看与跟进询盘)</option>
                    <option value="super_admin">超级管理员 (全平台最高控制全权)</option>
                  </select>
                </div>

                {role !== 'super_admin' && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">主归属公司 *</label>
                    <select
                      className="form-input form-select"
                      value={companyId}
                      onChange={e => setCompanyId(e.target.value)}
                    >
                      {companies.map(c => (
                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Multi-Company Granular Site Access Checkboxes */}
                {(role === 'site_manager' || role === 'viewer') && (
                  <div className="form-group" style={{ background: 'var(--bg-offset, #f8f9fa)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
                        🌐 跨公司打勾指派独立站权限：
                      </label>
                      <span className="badge badge-blue">
                        已选择 {selectedSiteIds.length} 个站点
                      </span>
                    </div>

                    {allWebsites.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
                        暂无独立站，请先在【网站管理】中注册独立站！
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {websitesByCompany.map(group => (
                          <div key={group.company.id} style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>🏢 {group.company.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({group.sites.length} 个站点)</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {group.sites.map(site => (
                                <label key={site.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedSiteIds.includes(site.id)}
                                    onChange={() => handleSiteCheckboxChange(site.id)}
                                    style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                                  />
                                  <span style={{ fontWeight: 500 }}>{site.name}</span>
                                  <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>({site.domain})</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  取消
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? '保存中...' : '确认保存授权'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showResetModal && resetTargetUser && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title">🔑 修改账号密码</div>
              <button onClick={() => setShowResetModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <div style={{ marginBottom: 14, fontSize: 14 }}>
                  正在为 <strong style={{ color: 'var(--primary)' }}>{resetTargetUser.email}</strong> 设置新密码：
                </div>
                <div className="form-group">
                  <label className="form-label">新密码 *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="输入新密码 (至少6位)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowResetModal(false)} className="btn btn-secondary">
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  确认修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
