'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  DashboardIcon,
  SubmissionsIcon,
  FormsIcon,
  SitesIcon,
  CompaniesIcon,
  UsersIcon,
  ExternalLinkIcon,
  ZapIcon,
  MoonIcon,
  SunIcon,
  LogOutIcon,
  PinIcon,
  UserIcon
} from '@/components/common/Icons'

const allNavItems = [
  { href: '/', icon: <DashboardIcon size={18} />, label: 'Dashboard', menuKey: 'dashboard' },
  { href: '/submissions', icon: <SubmissionsIcon size={18} />, label: '询盘记录', menuKey: 'submissions' },
  { href: '/companies', icon: <CompaniesIcon size={18} />, label: '公司管理', menuKey: 'companies' },
  { href: '/sites', icon: <SitesIcon size={18} />, label: '网站管理', menuKey: 'sites' },
  { href: '/forms', icon: <FormsIcon size={18} />, label: '表单管理', menuKey: 'forms' },
  { href: '/users', icon: <UsersIcon size={18} />, label: '账号权限', menuKey: 'users' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isToolsPortal, setIsToolsPortal] = useState(false)
  const [sidebarTheme, setSidebarTheme] = useState<'light' | 'dark'>('light')
  const [isPinned, setIsPinned] = useState(false)
  const [toolsUrl, setToolsUrl] = useState('https://tools.dtafac.com')

  useEffect(() => {
    // Read saved settings
    const savedTheme = localStorage.getItem('sidebar-theme')
    if (savedTheme === 'dark') {
      setSidebarTheme('dark')
    }
    const savedPinned = localStorage.getItem('sidebar-pinned')
    if (savedPinned === 'true') {
      setIsPinned(true)
    }
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase()
      if (host.startsWith('tools.') || host.includes('tools.dtafac.com')) {
        setIsToolsPortal(true)
      }
      if (host.includes('localhost')) {
        setToolsUrl('http://tools.localhost:3000')
      }
    }
  }, [])

  useEffect(() => {
    // Ensure Layout margin adjusts smoothly when pinned/unpinned
    document.documentElement.style.setProperty('--sidebar-current-w', isPinned ? '240px' : '72px')
  }, [isPinned])

  useEffect(() => {
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
    if (item.href === '/') return true
    if (!currentUser) return false
    if (currentUser?.allowedMenus && Array.isArray(currentUser.allowedMenus)) {
      return currentUser.allowedMenus.includes(item.menuKey)
    }
    if (isToolsPortal) {
      const allowedInTools = ['/', '/submissions', '/forms']
      if (!allowedInTools.includes(item.href)) return false
    }

    const defaultAllowedForRole: Record<string, string[]> = {
      super_admin: ['submissions', 'forms', 'sites', 'companies', 'users'],
      company_admin: ['submissions', 'forms', 'sites', 'users'],
      site_manager: ['submissions', 'forms', 'sites'],
      viewer: ['submissions'],
    }

    const roleMenus = defaultAllowedForRole[userRole] || ['submissions']
    return roleMenus.includes(item.menuKey)
  })

  const toggleTheme = () => {
    const newTheme = sidebarTheme === 'light' ? 'dark' : 'light'
    setSidebarTheme(newTheme)
    localStorage.setItem('sidebar-theme', newTheme)
  }

  const togglePin = () => {
    const newPinned = !isPinned
    setIsPinned(newPinned)
    localStorage.setItem('sidebar-pinned', newPinned.toString())
  }

  return (
    <aside className={`sidebar ${sidebarTheme === 'dark' ? 'dark-theme' : ''} ${isPinned ? 'pinned' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-icon">
            <ZapIcon size={20} color="var(--primary)" />
          </div>
          <div className="hide-on-collapsed">
            <div className="sidebar-logo-name">{isToolsPortal ? 'Client Portal' : 'OpsHub'}</div>
            <div className="sidebar-logo-version">v2.0 · {isToolsPortal ? '客户数据中心' : '独立站中台'}</div>
          </div>
        </div>
        <button 
          onClick={togglePin} 
          className="hide-on-collapsed"
          style={{ 
            background: 'transparent',
            border: 'none',
            color: isPinned ? 'var(--primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '14px',
            transition: 'color 0.2s, transform 0.2s',
            transform: isPinned ? 'rotate(45deg)' : 'rotate(0deg)'
          }}
          title={isPinned ? '取消固定' : '固定侧边栏'}
        >
          <PinIcon size={16} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-title hide-on-collapsed">管理菜单</div>
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
              <span className="icon" style={{ display: 'inline-flex', alignItems: 'center' }}>{item.icon}</span>
              <span className="hide-on-collapsed">{item.label}</span>
            </Link>
          )
        })}

        {!isToolsPortal && (
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
            <div className="sidebar-section-title hide-on-collapsed" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              外部门户
            </div>
            <a
              href={toolsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-link"
              style={{ color: '#059669' }}
              title="新窗口打开 Tools 客户门户"
            >
              <span className="icon" style={{ display: 'inline-flex', alignItems: 'center' }}><ExternalLinkIcon size={16} /></span>
              <span className="hide-on-collapsed" style={{ fontSize: 13, fontWeight: 500 }}>
                Tools 客户门户
              </span>
            </a>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        {currentUser && (
          <div className="hide-on-collapsed" style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserIcon size={14} color="var(--text-muted)" /> {currentUser.name || currentUser.email}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={toggleTheme}
            title={sidebarTheme === 'light' ? '切换黑夜模式' : '切换明亮模式'}
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            className="hide-on-collapsed"
          >
            {sidebarTheme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
          </button>
          
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
            <LogOutIcon size={16} /> <span className="hide-on-collapsed">退出</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
