'use client'
import { useEffect, useState } from 'react'
import OpsDashboard from '@/components/dashboard/OpsDashboard'
import ToolsDashboard from '@/components/dashboard/ToolsDashboard'

export default function DashboardPage() {
  const [isToolsPortal, setIsToolsPortal] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    // Detect portal domain
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase()
      if (host.startsWith('tools.') || host.includes('tools.dtafac.com')) {
        setIsToolsPortal(true)
      }
    }

    // Fetch stats for Ops Dashboard
    fetch('/api/sites')
      .then(r => r.json())
      .then(async (sitesRes) => {
        const [compRes, formsRes, subRes] = await Promise.all([
          fetch('/api/companies').then(r => r.json()).catch(() => ({ companies: [] })),
          fetch('/api/forms').then(r => r.json()).catch(() => ({ forms: [] })),
          fetch('/api/submissions?limit=1000').then(r => r.json()).catch(() => ({ data: [] })),
        ])

        const websites = sitesRes.websites || []
        const companies = compRes.companies || []
        const forms = formsRes.data || formsRes.forms || []
        const submissions = subRes.data || []

        const validSubmissions = submissions.filter((s: any) => !s.isSpam)
        const spamSubmissions = submissions.filter((s: any) => s.isSpam)

        // Compute UTM sources aggregation
        const utmCounts: Record<string, number> = {}
        validSubmissions.forEach((s: any) => {
          const key = s.utmSource || 'Direct (直接访问)'
          utmCounts[key] = (utmCounts[key] || 0) + 1
        })
        const utmSources = Object.entries(utmCounts)
          .map(([utmSource, count]) => ({ utmSource, _count: { utmSource: count } }))
          .sort((a, b) => b._count.utmSource - a._count.utmSource)
          .slice(0, 5)

        setStats({
          totalCompanies: companies.length,
          totalWebsites: websites.length,
          totalForms: forms.length,
          totalSubmissions: submissions.length,
          validSubmissions: validSubmissions.length,
          spamSubmissions: spamSubmissions.length,
          totalUsers: 1,
          websiteList: websites.slice(0, 5),
          utmSources,
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (isToolsPortal) {
    return <ToolsDashboard />
  }

  if (loading || !stats) {
    return (
      <div className="page" style={{ padding: 60, textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-muted)' }}>正在载入运营中台数据...</div>
      </div>
    )
  }

  return <OpsDashboard stats={stats} />
}
