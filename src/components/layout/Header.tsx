'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

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

interface CurrentUser {
  userId: number
  email: string
  name: string
  role: 'super_admin' | 'company_admin' | 'site_manager' | 'viewer'
  companyId: number | null
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [websites, setWebsites] = useState<Website[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')

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
      .catch(() => {})

    fetch('/api/companies')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.companies)) {
          setCompanies(data.companies)
        }
      })
      .catch(() => {})

    fetch('/api/sites')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.websites)) {
          setWebsites(data.websites)
        }
      })
      .catch(() => {})
  }, [pathname])

  // Sync state from URL search params
  useEffect(() => {
    const cid = searchParams.get('companyId') || ''
    const sid = searchParams.get('websiteId') || ''
    setSelectedCompanyId(cid)
    setSelectedSiteId(sid)
  }, [searchParams])

  if (pathname === '/login') {
    return null
  }

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedCompanyId(val)
    setSelectedSiteId('')

    const params = new URLSearchParams(searchParams.toString())
    if (val) {
      params.set('companyId', val)
    } else {
      params.delete('companyId')
    }
    params.delete('websiteId')

    const query = params.toString() ? `?${params.toString()}` : ''
    router.push(`${pathname}${query}`)
  }

  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedSiteId(val)

    const params = new URLSearchParams(searchParams.toString())
    if (val) {
      params.set('websiteId', val)
    } else {
      params.delete('websiteId')
    }

    const query = params.toString() ? `?${params.toString()}` : ''
    router.push(`${pathname}${query}`)
  }

  // Filter sites based on selected company
  const filteredWebsites = selectedCompanyId
    ? websites.filter(w => w.companyId === parseInt(selectedCompanyId, 10))
    : websites

  // Determine current page header title
  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard 控制台'
    if (pathname.startsWith('/companies')) return '公司管理'
    if (pathname.startsWith('/sites')) return '独立站管理'
    if (pathname.startsWith('/forms')) return '表单管理'
    if (pathname.startsWith('/submissions')) return '询盘记录'
    if (pathname.startsWith('/users')) return '账号与角色权限'
    return '管理中台'
  }

  const isSuperAdmin = currentUser?.role === 'super_admin'
  const isSingleCompany = companies.length === 1

  return (
    <header className="header">
      <div className="header-title">{getPageTitle()}</div>

      {/* Dual Selector: Company & Site */}
      <div className="header-actions" style={{ gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text-subtle)', fontWeight: 500 }}>🏢 公司:</span>
          <select
            className="form-input form-select"
            value={selectedCompanyId}
            onChange={handleCompanyChange}
            style={{ width: 160, padding: '5px 10px', fontSize: 13, height: 32 }}
          >
            {isSuperAdmin ? (
              <option value="">全部公司 ({companies.length})</option>
            ) : isSingleCompany ? (
              // If only 1 company allowed, no "All Companies" option to avoid confusion
              null
            ) : (
              <option value="">全部授权公司 ({companies.length})</option>
            )}
            {companies.map(c => (
              <option key={c.id} value={c.id.toString()}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text-subtle)', fontWeight: 500 }}>🌐 站点:</span>
          <select
            className="form-input form-select"
            value={selectedSiteId}
            onChange={handleSiteChange}
            style={{ width: 170, padding: '5px 10px', fontSize: 13, height: 32 }}
          >
            <option value="">{isSuperAdmin ? '全部站点' : '全部授权站点'}</option>
            {filteredWebsites.map(w => (
              <option key={w.id} value={w.id.toString()}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>
    </header>
  )
}
