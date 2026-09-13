'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { href: '/', icon: '⊞', label: 'Dashboard' },
  { href: '/forms', icon: '◫', label: '表单管理' },
  { href: '/submissions', icon: '📥', label: '询盘记录' },
]

const comingSoon = [
  { icon: '🌐', label: '网站管理' },
  { icon: '👥', label: '团队权限' },
  { icon: '📊', label: '数据分析' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

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

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-icon">⚡</div>
          <div>
            <div className="sidebar-logo-name">OpsHub</div>
            <div className="sidebar-logo-version">v1.0.0 · 运营中台</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-title">主菜单</div>
        {navItems.map(item => {
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

        <div className="sidebar-section-title" style={{ marginTop: 16 }}>即将上线</div>
        {comingSoon.map(item => (
          <div key={item.label} className="sidebar-link" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
            <span className="icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">OpsHub · 独立站运营中台</div>
        <button
          onClick={handleLogout}
          style={{
            marginTop: '12px',
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
