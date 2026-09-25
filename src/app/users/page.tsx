'use client'

import { useState, useEffect } from 'react'

interface Company {
  id: number
  name: string
  code: string
}

interface Website {
  id: number
  name: string
  domain: string
  companyId: number
}

interface WebsitePermission {
  websiteId: number
  canCreate?: boolean
  canRead?: boolean
  canUpdate?: boolean
  canDelete?: boolean
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
  allowedMenus?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  company?: Company
  sitePermissions?: WebsitePermission[]
}

interface PermissionGroup {
  id: number
  name: string
  description?: string
  companyId?: number
  allowedMenus: string
  defaultCrud?: string
  createdAt: string
}

const AVAILABLE_MENUS = [
  { key: 'submissions', label: '询盘记录', desc: '查看询盘数据与跟进处理状态' },
  { key: 'companies', label: '公司管理', desc: '管理企业租户主体信息' },
  { key: 'sites', label: '网站管理', desc: '绑定独立站与探针关联' },
  { key: 'forms', label: '表单管理', desc: '新建与配置表单规则及样式' },
  { key: 'users', label: '账号权限', desc: '分配用户账号与菜单权限' },
  { key: 'seo', label: 'SEO工具', desc: '关键词挖掘与 SERP 分析' },
]

const SYSTEM_ROLE_KEYS: Record<string, 'super_admin' | 'company_admin' | 'site_manager' | 'viewer'> = {
  '超级管理员': 'super_admin',
  '公司管理员': 'company_admin',
  '站点管理员': 'site_manager',
  '数据观察员': 'viewer'
}

export default function UsersPage() {
  const [envTab, setEnvTab] = useState<'tools' | 'ops'>('tools')
  const [secTab, setSecTab] = useState<'users' | 'roles'>('users')

  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [allWebsites, setAllWebsites] = useState<Website[]>([])
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([])
  const [loading, setLoading] = useState(true)

  // Create/Edit User modal state
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [selectedRoleOption, setSelectedRoleOption] = useState<string>('company_admin')
  const [userCamp, setUserCamp] = useState<'internal' | 'client'>('client')
  const [companyId, setCompanyId] = useState('')
  const [companySearchFilter, setCompanySearchFilter] = useState('')
  const [sitePerms, setSitePerms] = useState<Record<number, { canCreate: boolean, canRead: boolean, canUpdate: boolean, canDelete: boolean }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Create/Edit Permission Group modal state
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupMenus, setGroupMenus] = useState<string[]>(['submissions'])
  const [groupCamp, setGroupCamp] = useState<'internal' | 'client'>('client')
  const [groupSubmitting, setGroupSubmitting] = useState(false)

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

  const fetchPermissionGroups = async () => {
    try {
      const res = await fetch('/api/permission-groups')
      const data = await res.json()
      if (data.success) {
        setPermissionGroups(data.groups)
      }
    } catch (err) {
      console.error(err)
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
    fetchPermissionGroups()
  }, [])

  const openCreateModal = () => {
    setEditingUser(null)
    setEmail('')
    setPassword('')
    setName('')
    setUserCamp(envTab === 'ops' ? 'internal' : 'client')
    setSelectedRoleOption(envTab === 'ops' ? 'super_admin' : 'company_admin')
    setSitePerms({})
    setError('')
    setShowModal(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setEmail(user.email)
    setPassword('')
    setName(user.name || '')
    setUserCamp(user.companyId === null ? 'internal' : 'client')
    setCompanyId(user.companyId ? user.companyId.toString() : (companies[0]?.id.toString() || ''))

    let initialOption = user.role as string

    const customGroup = permissionGroups.find(g => g.name === user.role)
    if (customGroup) {
      const systemNames: Record<string, string> = {
        '超级管理员': 'super_admin',
        '公司管理员': 'company_admin',
        '站点管理员': 'site_manager',
        '数据观察员': 'viewer'
      }
      if (systemNames[customGroup.name]) {
        initialOption = systemNames[customGroup.name]
      } else {
        initialOption = `group_${customGroup.id}`
      }
    } else if (user.allowedMenus) {
      try {
        const uMenus = JSON.parse(user.allowedMenus)
        if (Array.isArray(uMenus)) {
          const uStr = JSON.stringify([...uMenus].sort())
          const groupMatch = permissionGroups.find(g => {
            try {
              const gMenus = JSON.parse(g.allowedMenus)
              return Array.isArray(gMenus) && JSON.stringify([...gMenus].sort()) === uStr
            } catch {
              return false
            }
          })
          if (groupMatch) {
            const systemNames: Record<string, string> = {
              '超级管理员': 'super_admin',
              '公司管理员': 'company_admin',
              '站点管理员': 'site_manager',
              '数据观察员': 'viewer'
            }
            if (systemNames[groupMatch.name]) {
              initialOption = systemNames[groupMatch.name]
            } else {
              initialOption = `group_${groupMatch.id}`
            }
          }
        }
      } catch {}
    }
    setSelectedRoleOption(initialOption)

    const initialPerms: Record<number, { canCreate: boolean, canRead: boolean, canUpdate: boolean, canDelete: boolean }> = {}
    if (user.sitePermissions) {
      user.sitePermissions.forEach(sp => {
        initialPerms[sp.website.id] = {
          canCreate: sp.canCreate !== false,
          canRead: sp.canRead !== false,
          canUpdate: sp.canUpdate !== false,
          canDelete: Boolean(sp.canDelete)
        }
      })
    }
    setSitePerms(initialPerms)
    setError('')
    setShowModal(true)
  }

  const toggleSiteSelected = (siteId: number) => {
    setSitePerms(prev => {
      const next = { ...prev }
      if (next[siteId]) {
        delete next[siteId]
      } else {
        next[siteId] = { canCreate: true, canRead: true, canUpdate: true, canDelete: false }
      }
      return next
    })
  }

  const toggleSiteCrud = (siteId: number, field: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete') => {
    setSitePerms(prev => {
      const current = prev[siteId] || { canCreate: true, canRead: true, canUpdate: true, canDelete: false }
      return {
        ...prev,
        [siteId]: {
          ...current,
          [field]: !current[field]
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!editingUser) {
      if (!email || !email.trim()) {
        setError('请输入登录邮箱')
        return
      }
      if (!password || password.length < 6) {
        setError('初始密码不能少于 6 位')
        return
      }
    }

    try {
      setSubmitting(true)
      const siteIdsPayload = Object.entries(sitePerms).map(([siteIdStr, perms]) => ({
        websiteId: parseInt(siteIdStr, 10),
        canCreate: perms.canCreate,
        canRead: perms.canRead,
        canUpdate: perms.canUpdate,
        canDelete: perms.canDelete
      }))

      let effectiveRole: string = 'company_admin'
      let effectiveMenus: string[] = []

      if (selectedRoleOption.startsWith('group_')) {
        const groupId = parseInt(selectedRoleOption.replace('group_', ''), 10)
        const group = permissionGroups.find(g => g.id === groupId)
        if (group) {
          effectiveRole = group.name
          if (group.allowedMenus) {
            try {
              effectiveMenus = JSON.parse(group.allowedMenus)
            } catch {}
          }
        }
      } else {
        effectiveRole = selectedRoleOption
        const systemRoleName = selectedRoleOption === 'super_admin' ? '超级管理员'
          : selectedRoleOption === 'company_admin' ? '公司管理员'
          : selectedRoleOption === 'site_manager' ? '站点管理员' : '数据观察员'

        const group = permissionGroups.find(g => g.name === systemRoleName)
        if (group && group.allowedMenus) {
          try {
            effectiveMenus = JSON.parse(group.allowedMenus)
          } catch {}
        }
      }

      const targetCompanyId = userCamp === 'internal' ? null : (companyId ? parseInt(companyId, 10) : (companies[0]?.id || null))

      const payload: any = {
        name: name.trim() || undefined,
        role: effectiveRole,
        companyId: targetCompanyId,
        siteIds: siteIdsPayload,
        allowedMenus: effectiveMenus
      }

      if (!editingUser) {
        payload.email = email.trim().toLowerCase()
        payload.password = password
      } else if (password && password.trim().length >= 6) {
        payload.password = password.trim()
      }

      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

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
      alert('系统原生超级管理员受保护，无法禁用')
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
        alert(`账号 [${resetTargetUser.email}] 密码重置成功`)
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
      alert('系统原生超级管理员受保护，无法删除')
      return
    }
    if (!confirm(`确定永久删除账号 [${user.email}] 吗？`)) return
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

  const openCreateGroupModal = () => {
    setEditingGroup(null)
    setGroupName('')
    setGroupDesc('')
    setGroupCamp(envTab === 'ops' ? 'internal' : 'client')
    setGroupMenus(['submissions', 'forms'])
    setShowGroupModal(true)
  }

  const openEditGroupModal = (group: PermissionGroup) => {
    setEditingGroup(group)
    setGroupName(group.name)
    setGroupDesc(group.description || '')
    try {
      const parsed = JSON.parse(group.allowedMenus)
      if (Array.isArray(parsed)) {
        setGroupCamp(parsed.includes('__INTERNAL__') ? 'internal' : 'client')
        setGroupMenus(parsed.filter(m => m !== '__INTERNAL__'))
      } else {
        setGroupCamp('client')
        setGroupMenus(['submissions'])
      }
    } catch {
      setGroupCamp('client')
      setGroupMenus(['submissions'])
    }
    setShowGroupModal(true)
  }

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName || !groupName.trim()) return

    try {
      setGroupSubmitting(true)
      const url = editingGroup ? `/api/permission-groups/${editingGroup.id}` : '/api/permission-groups'
      const method = editingGroup ? 'PUT' : 'POST'
      
      const finalMenus = [...groupMenus.filter(m => m !== '__INTERNAL__')]
      if (groupCamp === 'internal') {
        finalMenus.push('__INTERNAL__')
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim() || undefined,
          allowedMenus: finalMenus
        })
      })

      const data = await res.json()
      if (data.success) {
        setShowGroupModal(false)
        fetchPermissionGroups()
        fetchUsers()
      } else {
        alert(data.error || '保存角色失败')
      }
    } catch (err: any) {
      alert(err.message || '网络错误')
    } finally {
      setGroupSubmitting(false)
    }
  }

  const handleDeleteGroup = async (group: PermissionGroup) => {
    if (!confirm(`确定删除角色组 [${group.name}] 吗？`)) return
    try {
      const res = await fetch(`/api/permission-groups/${group.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchPermissionGroups()
      } else {
        alert(data.error || '删除失败')
      }
    } catch {
      alert('网络异常')
    }
  }

  const getRoleBadge = (roleStr: string, isProtected: boolean = false) => {
    if (isProtected) {
      return <span className="badge badge-red">超级管理员 (系统)</span>
    }
    switch (roleStr) {
      case 'super_admin':
      case '超级管理员':
        return <span className="badge badge-red">超级管理员</span>
      case 'company_admin':
      case '公司管理员':
        return <span className="badge badge-blue">公司管理员</span>
      case 'site_manager':
      case '站点管理员':
        return <span className="badge badge-yellow">站点管理员</span>
      case 'viewer':
      case '数据观察员':
        return <span className="badge badge-green">数据观察员</span>
      default:
        return <span className="badge badge-purple">{roleStr}</span>
    }
  }

  const websitesByCompany = companies.map(company => ({
    company,
    sites: allWebsites.filter(w => w.companyId === company.id)
  })).filter(group => group.sites.length > 0)

  const builtInGroups = permissionGroups.filter(g =>
    ['超级管理员', '公司管理员', '站点管理员', '数据观察员'].includes(g.name)
  )
  const customGroups = permissionGroups.filter(g =>
    !['超级管理员', '公司管理员', '站点管理员', '数据观察员'].includes(g.name)
  )

  const filteredUsers = users.filter(u => envTab === 'ops' ? u.companyId === null : u.companyId !== null)

  const filteredBuiltIn = builtInGroups.filter(bg => envTab === 'ops' ? bg.name === '超级管理员' : bg.name !== '超级管理员')
  const filteredCustom = customGroups.filter(g => {
    let parsedMenus: string[] = []
    try { parsedMenus = JSON.parse(g.allowedMenus) } catch {}
    const isInternal = parsedMenus.includes('__INTERNAL__')
    return envTab === 'ops' ? isInternal : !isInternal
  })

  return (
    <div className="page" style={{ paddingTop: 8 }}>
      {/* Clean Dual Level Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        {/* Environment Selector Pills */}
        <div style={{ background: 'var(--bg-offset, #f1f5f9)', padding: 4, borderRadius: 10, display: 'inline-flex', gap: 4 }}>
          <button
            onClick={() => setEnvTab('tools')}
            style={{
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              background: envTab === 'tools' ? '#ffffff' : 'transparent',
              color: envTab === 'tools' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)',
              boxShadow: envTab === 'tools' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Tools 客户门户
          </button>
          <button
            onClick={() => setEnvTab('ops')}
            style={{
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              background: envTab === 'ops' ? '#ffffff' : 'transparent',
              color: envTab === 'ops' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)',
              boxShadow: envTab === 'ops' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Ops 运营后台
          </button>
        </div>

        {/* Sub-tab Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'inline-flex', background: '#f8fafc', padding: 3, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <button
              onClick={() => setSecTab('users')}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 6,
                border: 'none',
                background: secTab === 'users' ? '#ffffff' : 'transparent',
                color: secTab === 'users' ? '#0f172a' : '#64748b',
                boxShadow: secTab === 'users' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer'
              }}
            >
              账号列表 ({filteredUsers.length})
            </button>
            <button
              onClick={() => setSecTab('roles')}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 6,
                border: 'none',
                background: secTab === 'roles' ? '#ffffff' : 'transparent',
                color: secTab === 'roles' ? '#0f172a' : '#64748b',
                boxShadow: secTab === 'roles' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer'
              }}
            >
              角色与权限 ({filteredBuiltIn.length + filteredCustom.length})
            </button>
          </div>

          {secTab === 'users' ? (
            <button onClick={openCreateModal} className="btn btn-primary btn-sm">
              新建账号
            </button>
          ) : (
            <button onClick={openCreateGroupModal} className="btn btn-primary btn-sm">
              新建角色
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)' }}>加载中...</div>
        </div>
      ) : secTab === 'users' ? (
        /* Accounts View */
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>账号信息</th>
                  <th>角色身份</th>
                  <th>归属实体</th>
                  <th>已授权基站</th>
                  <th>账号状态</th>
                  <th>活跃时间</th>
                  <th style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-subtle)' }}>
                      此列表暂未创建账号
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const isPrimaryAdmin = u.email.toLowerCase().includes('admin@') && u.role === 'super_admin'
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="avatar-initials">
                              {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                                {u.name || '-'}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{getRoleBadge(u.role, isPrimaryAdmin)}</td>
                        <td>
                          {u.companyId === null ? (
                            <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>平台级</span>
                          ) : (
                            <span style={{ fontWeight: 500, color: 'var(--text)' }}>{u.company?.name || `未分配`}</span>
                          )}
                        </td>
                        <td>
                          {u.role === 'super_admin' || u.role === 'company_admin' ? (
                            <span className="badge badge-purple" style={{ fontSize: 11, fontWeight: 500 }}>
                              {u.role === 'super_admin' ? '全站权限' : '全部所属站点'}
                            </span>
                          ) : !u.sitePermissions || u.sitePermissions.length === 0 ? (
                            <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>无权限</span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 360 }}>
                              {u.sitePermissions.map(sp => (
                                <span
                                  key={sp.website.id}
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    background: 'var(--bg)',
                                    border: '1px solid var(--border)',
                                    padding: '3px 8px',
                                    borderRadius: 'var(--radius-pill)'
                                  }}
                                >
                                  {sp.website.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          {u.isActive ? (
                            <span className="badge badge-green">正常</span>
                          ) : (
                            <span className="badge badge-red">已冻结</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '未登录'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button onClick={() => openEditModal(u)} className="btn btn-secondary btn-sm">编辑</button>
                            <button onClick={() => { setResetTargetUser(u); setNewPassword(''); setShowResetModal(true); }} className="btn btn-secondary btn-sm">密码</button>
                            {!isPrimaryAdmin && (
                              <>
                                <button onClick={() => toggleUserActive(u)} className={`btn btn-sm ${u.isActive ? 'btn-secondary' : 'btn-primary'}`}>{u.isActive ? '冻结' : '解冻'}</button>
                                <button onClick={() => handleDeleteUser(u)} className="btn btn-danger btn-sm">删除</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Roles & Permissions View */
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>角色名称</th>
                  <th>属性类型</th>
                  <th>职责说明</th>
                  <th>已开放菜单权限</th>
                  <th style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {/* Built-in Roles */}
                {filteredBuiltIn.map(g => {
                  let parsedMenus: string[] = []
                  try { parsedMenus = JSON.parse(g.allowedMenus) } catch {}
                  return (
                    <tr key={g.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{g.name}</div>
                      </td>
                      <td><span className="badge badge-purple" style={{ fontSize: 11 }}>系统内置</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{g.description || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {parsedMenus.map(mKey => {
                            const menuObj = AVAILABLE_MENUS.find(m => m.key === mKey)
                            if (!menuObj) return null
                            return (
                              <span key={mKey} className="badge badge-blue" style={{ fontSize: 11 }}>
                                {menuObj.label}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => openEditGroupModal(g)} className="btn btn-secondary btn-sm">编辑权限</button>
                      </td>
                    </tr>
                  )
                })}

                {/* Custom Roles */}
                {filteredCustom.map(g => {
                  let parsedMenus: string[] = []
                  try { parsedMenus = JSON.parse(g.allowedMenus) } catch {}
                  return (
                    <tr key={g.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{g.name}</div>
                      </td>
                      <td><span className="badge badge-blue" style={{ fontSize: 11 }}>自定义扩展</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{g.description || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {parsedMenus.filter(m => m !== '__INTERNAL__').map(mKey => {
                            const menuObj = AVAILABLE_MENUS.find(m => m.key === mKey)
                            if (!menuObj) return null
                            return (
                              <span key={mKey} className="badge badge-blue" style={{ fontSize: 11 }}>
                                {menuObj.label}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button onClick={() => openEditGroupModal(g)} className="btn btn-secondary btn-sm">编辑</button>
                          <button onClick={() => handleDeleteGroup(g)} className="btn btn-danger btn-sm">删除</button>
                        </div>
                      </td>
                    </tr>
                  )}
                )}

                {filteredBuiltIn.length === 0 && filteredCustom.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-subtle)' }}>
                      暂无相关角色
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingUser ? `编辑用户账号 [${editingUser.email}]` : '新建用户账号'}
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && <div className="alert alert-error">{error}</div>}

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
                  <label className="form-label">{editingUser ? '重置新密码 (不改留空)' : '初始密码 *'}</label>
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
                  <label className="form-label">姓名 / 称呼</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="如：张经理"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>关联角色身份 *</label>
                  <select
                    className="form-input form-select"
                    value={selectedRoleOption}
                    disabled={editingUser?.email.toLowerCase() === 'admin@opshub.com'}
                    onChange={e => setSelectedRoleOption(e.target.value)}
                  >
                    <optgroup label="系统内置角色">
                      {builtInGroups.filter(bg => userCamp === 'internal' ? bg.name === '超级管理员' : bg.name !== '超级管理员').map(bg => {
                        const rKey = SYSTEM_ROLE_KEYS[bg.name] || 'company_admin'
                        return (
                          <option key={bg.id} value={rKey}>
                            {bg.name} ({bg.description})
                          </option>
                        )
                      })}
                    </optgroup>

                    {customGroups.length > 0 && (
                      <optgroup label="自定义扩展角色组">
                        {customGroups.map(g => (
                          <option key={g.id} value={`group_${g.id}`}>
                            {g.name} {g.description ? `(${g.description})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {userCamp === 'client' && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>主归属公司 *</label>
                      {companies.length > 5 && (
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>共 {companies.length} 家公司</span>
                      )}
                    </div>
                    {companies.length > 5 && (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="🔍 搜索公司名称或代号..."
                        value={companySearchFilter}
                        onChange={e => setCompanySearchFilter(e.target.value)}
                        style={{ marginBottom: 6, fontSize: 12, padding: '6px 10px' }}
                      />
                    )}
                    <select
                      className="form-input form-select"
                      value={companyId}
                      onChange={e => setCompanyId(e.target.value)}
                    >
                      {companies
                        .filter(c => {
                          if (!companySearchFilter.trim()) return true
                          const q = companySearchFilter.toLowerCase()
                          return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
                        })
                        .map(c => (
                          <option key={c.id} value={c.id.toString()}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {(selectedRoleOption === 'site_manager' || selectedRoleOption === 'viewer' || selectedRoleOption.startsWith('group_')) && (
                  <div className="form-group" style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                        独立站及 CRUD 操作权限：
                      </label>
                      <span className="badge badge-blue">
                        已选 {Object.keys(sitePerms).length} 个站点
                      </span>
                    </div>

                    {allWebsites.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
                        暂无独立站，请先在【网站管理】中创建！
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {websitesByCompany.map(group => (
                          <div key={group.company.id} style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>
                              {group.company.name} ({group.sites.length} 个站点)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {group.sites.map(site => {
                                const isSelected = Boolean(sitePerms[site.id])
                                const perm = sitePerms[site.id] || { canCreate: true, canRead: true, canUpdate: true, canDelete: false }
                                return (
                                  <div key={site.id} style={{ background: isSelected ? '#f0f9ff' : '#f9fafb', padding: '6px 10px', borderRadius: 6, border: isSelected ? '1px solid #bae6fd' : '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleSiteSelected(site.id)}
                                          style={{ width: 15, height: 15 }}
                                        />
                                        <span>{site.name}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>({site.domain})</span>
                                      </label>

                                      {isSelected && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, background: '#fff', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>权限:</span>
                                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={perm.canCreate} onChange={() => toggleSiteCrud(site.id, 'canCreate')} />
                                            <span>增</span>
                                          </label>
                                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={perm.canRead} onChange={() => toggleSiteCrud(site.id, 'canRead')} />
                                            <span>查</span>
                                          </label>
                                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={perm.canUpdate} onChange={() => toggleSiteCrud(site.id, 'canUpdate')} />
                                            <span>改</span>
                                          </label>
                                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={perm.canDelete} onChange={() => toggleSiteCrud(site.id, 'canDelete')} />
                                            <span>删</span>
                                          </label>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
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
                  {submitting ? '保存中...' : '确认保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Group Create/Edit Modal */}
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingGroup ? `编辑角色权限 [${editingGroup.name}]` : '新建角色组'}
              </div>
              <button type="button" onClick={() => setShowGroupModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleSaveGroup}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">角色名称 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="如：外包客服专员 / SEO审计员"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    required
                    disabled={['超级管理员', '公司管理员', '站点管理员', '数据观察员'].includes(editingGroup?.name || '')}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">职责说明</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="如：负责跟进询盘与表单"
                    value={groupDesc}
                    onChange={e => setGroupDesc(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: 8 }}>
                    配置开放的侧边栏菜单权限：
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {AVAILABLE_MENUS
                      .filter(menu => groupCamp === 'internal' ? true : !['companies', 'users'].includes(menu.key))
                      .map(menu => {
                        const isChecked = groupMenus.includes(menu.key)
                        return (
                          <label key={menu.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', padding: '6px 8px', background: isChecked ? '#fff' : 'transparent', borderRadius: 6, border: isChecked ? '1px solid #3b82f6' : '1px solid #e2e8f0' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setGroupMenus(prev =>
                                  prev.includes(menu.key) ? prev.filter(k => k !== menu.key) : [...prev, menu.key]
                                )
                              }}
                              style={{ marginTop: 2, width: 15, height: 15 }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{menu.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{menu.desc}</div>
                            </div>
                          </label>
                        )
                      })}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowGroupModal(false)} className="btn btn-secondary">
                  取消
                </button>
                <button type="submit" disabled={groupSubmitting} className="btn btn-primary">
                  {groupSubmitting ? '保存中...' : '确认保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showResetModal && resetTargetUser && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">重置用户密码</div>
              <button onClick={() => setShowResetModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  正在为账号 <code style={{ fontWeight: 600, color: 'var(--primary)' }}>{resetTargetUser.email}</code> 设置新密码：
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">新密码 *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="请输入至少 6 位新密码"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowResetModal(false)} className="btn btn-secondary">
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  确认更新密码
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
