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
  { key: 'submissions', label: '📬 询盘记录', desc: '查看询盘数据与跟进处理状态' },
  { key: 'forms', label: '📝 表单管理', desc: '新建与配置表单规则及样式' },
  { key: 'sites', label: '🌐 网站管理', desc: '绑定独立站、查看 WP 后台与探针' },
  { key: 'companies', label: '🏢 公司管理', desc: '管理企业租户主体' },
  { key: 'users', label: '👥 账号权限', desc: '开通与分配用户账号与菜单' },
  { key: 'seo', label: '🔍 SEO工具', desc: '关键词挖掘与 SERP 竞争分析' },
]

const SYSTEM_ROLE_KEYS: Record<string, 'super_admin' | 'company_admin' | 'site_manager' | 'viewer'> = {
  '超级管理员': 'super_admin',
  '公司管理员': 'company_admin',
  '站点管理员': 'site_manager',
  '数据观察员': 'viewer'
}

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'permission_groups'>('users')

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
  const [companyId, setCompanyId] = useState('')
  const [sitePerms, setSitePerms] = useState<Record<number, { canCreate: boolean, canRead: boolean, canUpdate: boolean, canDelete: boolean }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Create/Edit Permission Group modal state
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupMenus, setGroupMenus] = useState<string[]>(['submissions'])
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
    setSelectedRoleOption('company_admin')
    setSitePerms({})
    setError('')
    setShowModal(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setEmail(user.email)
    setPassword('')
    setName(user.name || '')
    setCompanyId(user.companyId ? user.companyId.toString() : (companies[0]?.id.toString() || ''))

    let initialOption = user.role as string

    // Match custom role by name directly if user.role is custom (e.g. "测试角色")
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

      // Resolve role key and allowed menus from selected role option
      let effectiveRole: string = 'company_admin'
      let effectiveMenus: string[] = []

      if (selectedRoleOption.startsWith('group_')) {
        const groupId = parseInt(selectedRoleOption.replace('group_', ''), 10)
        const group = permissionGroups.find(g => g.id === groupId)
        if (group) {
          effectiveRole = group.name // Preserve custom group name! e.g. "测试角色"
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

      const targetCompanyId = (effectiveRole === 'super_admin' || effectiveRole === '超级管理员') ? null : (companyId ? parseInt(companyId, 10) : (companies[0]?.id || null))

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

  // Permission Group modal handlers
  const openCreateGroupModal = () => {
    setEditingGroup(null)
    setGroupName('')
    setGroupDesc('')
    setGroupMenus(['submissions', 'forms'])
    setShowGroupModal(true)
  }

  const openEditGroupModal = (group: PermissionGroup) => {
    setEditingGroup(group)
    setGroupName(group.name)
    setGroupDesc(group.description || '')
    try {
      const parsed = JSON.parse(group.allowedMenus)
      setGroupMenus(Array.isArray(parsed) ? parsed : ['submissions'])
    } catch {
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

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim() || undefined,
          allowedMenus: groupMenus
        })
      })

      const data = await res.json()
      if (data.success) {
        setShowGroupModal(false)
        fetchPermissionGroups()
        fetchUsers() // Refresh users as their scope permissions might be updated
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
      return <span className="badge badge-red">🔒 原生超级管理员 (受保护)</span>
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
        return <span className="badge badge-purple">🛡️ {roleStr}</span>
    }
  }

  // Group all websites by company for multi-company checklist
  const websitesByCompany = companies.map(company => ({
    company,
    sites: allWebsites.filter(w => w.companyId === company.id)
  })).filter(group => group.sites.length > 0)

  // Categorize permission groups
  const builtInGroups = permissionGroups.filter(g =>
    ['超级管理员', '公司管理员', '站点管理员', '数据观察员'].includes(g.name)
  )
  const customGroups = permissionGroups.filter(g =>
    !['超级管理员', '公司管理员', '站点管理员', '数据观察员'].includes(g.name)
  )

  const currentRoleObj = selectedRoleOption.startsWith('group_')
    ? permissionGroups.find(g => g.id === parseInt(selectedRoleOption.replace('group_', ''), 10))
    : permissionGroups.find(g => g.name === (
        selectedRoleOption === 'super_admin' ? '超级管理员'
        : selectedRoleOption === 'company_admin' ? '公司管理员'
        : selectedRoleOption === 'site_manager' ? '站点管理员' : '数据观察员'
      ))

  let currentRoleMenus: string[] = []
  if (currentRoleObj?.allowedMenus) {
    try {
      currentRoleMenus = JSON.parse(currentRoleObj.allowedMenus)
    } catch {}
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">👥 账号与角色权限管理</div>
          <div className="page-subtitle">分配员工角色身份、跨公司独立站授权、以及统一配置角色组菜单权限</div>
        </div>
        <div>
          {activeTab === 'users' ? (
            <button onClick={openCreateModal} className="btn btn-primary">
              ＋ 开通新账号
            </button>
          ) : (
            <button onClick={openCreateGroupModal} className="btn btn-primary">
              ＋ 新建自定义角色组
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'users' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          👥 账号管理 ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('permission_groups')}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'permission_groups' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            color: activeTab === 'permission_groups' ? 'var(--primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🛡️ 角色组与权限管理 ({permissionGroups.length})
        </button>
      </div>

      {activeTab === 'users' ? (
        loading ? (
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
                    <th>归属公司</th>
                    <th>已授权独立站</th>
                    <th>账号状态</th>
                    <th>最近登录</th>
                    <th style={{ textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-subtle)' }}>
                        暂无账号数据
                      </td>
                    </tr>
                  ) : (
                    users.map(u => {
                      const isPrimaryAdmin = u.email.toLowerCase().includes('admin@') && u.role === 'super_admin'
                      return (
                        <tr key={u.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                              👤 {u.name || '未填真实姓名'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>ID: {u.id}</div>
                          </td>
                          <td>
                            <code style={{ fontSize: 13 }}>{u.email}</code>
                          </td>
                          <td>{getRoleBadge(u.role, isPrimaryAdmin)}</td>
                          <td>
                            {u.role === 'super_admin' ? (
                              <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>- 全平台 -</span>
                            ) : (
                              <span style={{ fontWeight: 500 }}>🏢 {u.company?.name || `公司#${u.companyId}`}</span>
                            )}
                          </td>
                          <td>
                            {u.role === 'super_admin' || u.role === 'company_admin' ? (
                              <span className="badge badge-blue" style={{ fontSize: 11 }}>
                                {u.role === 'super_admin' ? '🌐 全站无限制控制权' : '🏢 自动拥有本公司所有独立站权限'}
                              </span>
                            ) : !u.sitePermissions || u.sitePermissions.length === 0 ? (
                              <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>未授权任何站点</span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 360 }}>
                                {u.sitePermissions.map(sp => (
                                  <span
                                    key={sp.website.id}
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 500,
                                      color: '#334155',
                                      background: '#f1f5f9',
                                      border: '1px solid #e2e8f0',
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                  >
                                    <span>🌐 {sp.website.name}</span>
                                    {sp.website.company?.name && (
                                      <span style={{ fontSize: 11, color: '#94a3b8' }}>({sp.website.company.name})</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            {u.isActive ? (
                              <span className="badge badge-green">🟢 正常</span>
                            ) : (
                              <span className="badge badge-red">🔴 已冻结</span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '未登录'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                              <button
                                onClick={() => openEditModal(u)}
                                className="btn btn-secondary btn-sm"
                                title="编辑角色"
                              >
                                ✏️ 编辑角色
                              </button>
                              <button
                                onClick={() => {
                                  setResetTargetUser(u)
                                  setNewPassword('')
                                  setShowResetModal(true)
                                }}
                                className="btn btn-secondary btn-sm"
                                title="重置密码"
                              >
                                🔑 密码
                              </button>

                              {!isPrimaryAdmin && (
                                <>
                                  <button
                                    onClick={() => toggleUserActive(u)}
                                    className={`btn btn-sm ${u.isActive ? 'btn-secondary' : 'btn-primary'}`}
                                  >
                                    {u.isActive ? '冻结' : '解冻'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="btn btn-danger btn-sm"
                                  >
                                    🗑️
                                  </button>
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
        )
      ) : (
        /* Tab 2: All Permission Groups & System Roles */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Section 1: System Built-in Roles */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--primary)' }}>🔒 系统内置角色 (共 4 个)</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>基础内置角色体系，可随时点击【✏️ 编辑菜单权限】自定义修改其菜单开放规则。</div>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>角色名称</th>
                    <th>属性标识</th>
                    <th>职责说明</th>
                    <th>已开放系统侧边栏菜单</th>
                    <th style={{ textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {builtInGroups.map(g => {
                    let parsedMenus: string[] = []
                    try {
                      parsedMenus = JSON.parse(g.allowedMenus)
                    } catch {}

                    return (
                      <tr key={g.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                            🔒 {g.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>ID: {g.id}</div>
                        </td>
                        <td>
                          <span className="badge badge-purple" style={{ fontSize: 11 }}>系统内置角色</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                          {g.description || '- 无备注 -'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {parsedMenus.map(mKey => {
                              const menuObj = AVAILABLE_MENUS.find(m => m.key === mKey)
                              return (
                                <span key={mKey} className="badge badge-blue" style={{ fontSize: 11 }}>
                                  {menuObj?.label || mKey}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => openEditGroupModal(g)} className="btn btn-primary btn-sm">
                            ✏️ 编辑菜单权限
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Custom Created Roles */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--primary)' }}>🛡️ 自定义扩展角色组 ({customGroups.length} 个)</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>管理员自主创建的角色名称与权限套件，可灵活指派给特定员工。</div>
              </div>
              <button onClick={openCreateGroupModal} className="btn btn-secondary btn-sm">
                ＋ 新建自定义角色
              </button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>角色名称</th>
                    <th>属性标识</th>
                    <th>职责说明</th>
                    <th>已开放系统侧边栏菜单</th>
                    <th style={{ textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {customGroups.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-subtle)' }}>
                        暂无自定义扩展角色，点击右上角【＋ 新建自定义角色】即可创建！
                      </td>
                    </tr>
                  ) : (
                    customGroups.map(g => {
                      let parsedMenus: string[] = []
                      try {
                        parsedMenus = JSON.parse(g.allowedMenus)
                      } catch {}

                      return (
                        <tr key={g.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                              🛡️ {g.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>ID: {g.id}</div>
                          </td>
                          <td>
                            <span className="badge badge-blue" style={{ fontSize: 11 }}>自定义扩展角色</span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                            {g.description || '- 无备注 -'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {parsedMenus.map(mKey => {
                                const menuObj = AVAILABLE_MENUS.find(m => m.key === mKey)
                                return (
                                  <span key={mKey} className="badge badge-blue" style={{ fontSize: 11 }}>
                                    {menuObj?.label || mKey}
                                  </span>
                                )
                              })}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                              <button onClick={() => openEditGroupModal(g)} className="btn btn-secondary btn-sm">
                                ✏️ 编辑
                              </button>
                              <button onClick={() => handleDeleteGroup(g)} className="btn btn-danger btn-sm">
                                🗑️ 删除
                              </button>
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
        </div>
      )}

      {/* User Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingUser ? `✏️ 编辑用户角色与授权 [${editingUser.email}]` : '👥 开通新用户账号'}
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

                {/* Role / Permission Group Selector */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>选择关联角色身份 *</label>
                  <select
                    className="form-input form-select"
                    value={selectedRoleOption}
                    disabled={editingUser?.email.toLowerCase() === 'admin@opshub.com'}
                    onChange={e => setSelectedRoleOption(e.target.value)}
                  >
                    <optgroup label="🔒 系统内置角色">
                      {builtInGroups.map(bg => {
                        const rKey = SYSTEM_ROLE_KEYS[bg.name] || 'company_admin'
                        return (
                          <option key={bg.id} value={rKey}>
                            🔒 {bg.name} ({bg.description})
                          </option>
                        )
                      })}
                    </optgroup>

                    {customGroups.length > 0 && (
                      <optgroup label="🛡️ 自定义扩展角色组">
                        {customGroups.map(g => (
                          <option key={g.id} value={`group_${g.id}`}>
                            🛡️ {g.name} {g.description ? `(${g.description})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Display Current Role Menu Summary */}
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                    📋 当前选择【{currentRoleObj?.name || '公司管理员'}】将赋予的系统菜单：
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {currentRoleMenus.length === 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>无开放菜单</span>
                    ) : (
                      currentRoleMenus.map(mKey => {
                        const menuObj = AVAILABLE_MENUS.find(m => m.key === mKey)
                        return (
                          <span key={mKey} className="badge badge-blue" style={{ fontSize: 11 }}>
                            {menuObj?.label || mKey}
                          </span>
                        )
                      })
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 8 }}>
                    💡 若需修改此角色的菜单权限，请前往【🛡️ 角色组与权限管理】Tab 中直接编辑。
                  </div>
                </div>

                {selectedRoleOption !== 'super_admin' && (
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
                {(selectedRoleOption === 'site_manager' || selectedRoleOption === 'viewer' || selectedRoleOption.startsWith('group_')) && (
                  <div className="form-group" style={{ background: 'var(--bg-offset, #f8f9fa)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
                        🌐 跨公司打勾指派独立站及 CRUD 操作权限：
                      </label>
                      <span className="badge badge-blue">
                        已选择 {Object.keys(sitePerms).length} 个站点
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {group.sites.map(site => {
                                const isSelected = Boolean(sitePerms[site.id])
                                const perm = sitePerms[site.id] || { canCreate: true, canRead: true, canUpdate: true, canDelete: false }
                                return (
                                  <div key={site.id} style={{ background: isSelected ? 'rgba(59, 130, 246, 0.04)' : '#f9fafb', padding: '8px 12px', borderRadius: 8, border: isSelected ? '1px solid #bfdbfe' : '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleSiteSelected(site.id)}
                                          style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                                        />
                                        <span>{site.name}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>({site.domain})</span>
                                      </label>

                                      {isSelected && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, background: '#fff', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>权限:</span>
                                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, cursor: 'pointer', color: perm.canCreate ? '#10b981' : '#94a3b8', fontWeight: perm.canCreate ? 600 : 400 }}>
                                            <input
                                              type="checkbox"
                                              checked={perm.canCreate}
                                              onChange={() => toggleSiteCrud(site.id, 'canCreate')}
                                            />
                                            <span>增</span>
                                          </label>
                                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, cursor: 'pointer', color: perm.canRead ? '#3b82f6' : '#94a3b8', fontWeight: perm.canRead ? 600 : 400 }}>
                                            <input
                                              type="checkbox"
                                              checked={perm.canRead}
                                              onChange={() => toggleSiteCrud(site.id, 'canRead')}
                                            />
                                            <span>查</span>
                                          </label>
                                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, cursor: 'pointer', color: perm.canUpdate ? '#f59e0b' : '#94a3b8', fontWeight: perm.canUpdate ? 600 : 400 }}>
                                            <input
                                              type="checkbox"
                                              checked={perm.canUpdate}
                                              onChange={() => toggleSiteCrud(site.id, 'canUpdate')}
                                            />
                                            <span>改</span>
                                          </label>
                                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, cursor: 'pointer', color: perm.canDelete ? '#ef4444' : '#94a3b8', fontWeight: perm.canDelete ? 600 : 400 }}>
                                            <input
                                              type="checkbox"
                                              checked={perm.canDelete}
                                              onChange={() => toggleSiteCrud(site.id, 'canDelete')}
                                            />
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
                  {submitting ? '保存中...' : '确认保存授权'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Group Create/Edit Modal */}
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingGroup ? `✏️ 编辑角色菜单权限 [${editingGroup.name}]` : '🛡️ 新建自定义角色组'}
              </div>
              <button onClick={() => setShowGroupModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleSaveGroup}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">角色名称 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="如：测试角色 / 外包客服专员 / SEO审计员"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    required
                    disabled={['超级管理员', '公司管理员', '站点管理员', '数据观察员'].includes(editingGroup?.name || '')}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">职责 / 权限说明</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="如：只负责跟进询盘与编辑表单"
                    value={groupDesc}
                    onChange={e => setGroupDesc(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: 10 }}>
                    勾选配置该角色开放的系统侧边栏菜单：
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {AVAILABLE_MENUS.map(menu => {
                      const isChecked = groupMenus.includes(menu.key)
                      return (
                        <label key={menu.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', padding: '8px 10px', background: isChecked ? '#fff' : 'transparent', borderRadius: 6, border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setGroupMenus(prev =>
                                prev.includes(menu.key) ? prev.filter(k => k !== menu.key) : [...prev, menu.key]
                              )
                            }}
                            style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--primary)' }}
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
                  {groupSubmitting ? '保存中...' : '确认保存角色'}
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
              <div className="modal-title">🔑 重置用户密码</div>
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
