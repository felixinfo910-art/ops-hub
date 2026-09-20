'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const allNavItems = [
  { href: '/', icon: '⊞', label: 'Dashboard', menuKey: 'dashboard' },
  { href: '/submissions', icon: '📥', label: '询盘记录', menuKey: 'submissions' },
  { href: '/forms', icon: '◫', label: '表单管理', menuKey: 'forms' },
  { href: '/sites', icon: '🌐', label: '网站管理', menuKey: 'sites' },
  { href: '/companies', icon: '🏢', label: '公司管理', menuKey: 'companies' },
  { href: '/users', icon: '👥', label: '账号权限', menuKey: 'users' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isToolsPortal, setIsToolsPortal] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.hostname.includes('tools.') || window.location.hostname.includes('toold.'))) {
      setIsToolsPortal(true)
    }

    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setCurrentUser(data.user)
        } else if (pathname !== '/login') {
          router.push('/login')
        }
      })
      .catch(() => {
        if (pathname !== '/login') {
          router.push('/login')
        }
      })
  }, [pathname])

  if (pathname === '/login') {
    return null
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const userRole = currentUser?.role || 'super_admin'

  const visibleNavItems = allNavItems.filter(item => {
    // 1. Always allow Dashboard
    if (item.href === '/') return true

    // 2. If currentUser structure hasn't loaded yet, default to hiding all restricted menus to prevent flickering
    if (!currentUser) return false

    // 3. Dynamic allowedMenus check against user's actual DB permissions
    if (currentUser?.allowedMenus && Array.isArray(currentUser.allowedMenus)) {
      return currentUser.allowedMenus.includes(item.menuKey)
    }

    // 3. On Client Portal (tools.dtafac.com / toold.dtafac.com), hide internal ops management items for fallback users
    if (isToolsPortal) {
      const allowedInTools = ['/', '/submissions', '/forms']
      if (!allowedInTools.includes(item.href)) return false
    }


    // 4. Fallback role menu matrix
    const defaultAllowedForRole: Record<string, string[]> = {
      super_admin: ['submissions', 'forms', 'sites', 'companies', 'users'],
      company_admin: ['submissions', 'forms', 'sites', 'users'],
      site_manager: ['submissions', 'forms', 'sites'],
      viewer: ['submissions'], // Viewer ONLY gets inquiry submissions!
    }

    const roleMenus = defaultAllowedForRole[userRole] || ['submissions']
    return roleMenus.includes(item.menuKey)
  })

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-icon">⚡</div>
          <div>
            <div className="sidebar-logo-name">{isToolsPortal ? 'Client Portal' : 'OpsHub'}</div>
            <div className="sidebar-logo-version">v2.0 · {isToolsPortal ? '客户数据中心' : '独立站中台'}</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-title">管理菜单</div>
        {visibleNavItems.map(item => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        {currentUser && (
          <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              👤 {currentUser.name || currentUser.email}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-blue" style={{ fontSize: 10, padding: '1px 5px' }}>
                {currentUser.rawRole === 'super_admin' || currentUser.role === 'super_admin' ? '超级管理员'
                  : currentUser.rawRole === 'company_admin' || currentUser.role === 'company_admin' ? '公司管理员'
                  : currentUser.rawRole === 'site_manager' || currentUser.role === 'site_manager' ? '站点管理员'
                  : currentUser.rawRole === 'viewer' || currentUser.role === 'viewer' ? '数据观察员'
                  : (currentUser.rawRole || currentUser.role)}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <span>🚪</span> 退出登录
        </button>
      </div>
    </aside>
  )
}
