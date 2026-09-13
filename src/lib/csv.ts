interface ExportSubmission {
  id: number
  createdAt: string
  data: string
  ip: string | null
  country?: string | null
  city?: string | null
  pageUrl?: string | null
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmKeyword?: string | null
  form?: { name: string }
}

export function exportSubmissionsToCSV(submissions: ExportSubmission[], filenamePrefix = 'inquiries') {
  if (submissions.length === 0) return

  // Collect all unique keys from submission data
  const dataKeysSet = new Set<string>()
  const parsedDataList = submissions.map(s => {
    try {
      const parsed = JSON.parse(s.data)
      Object.keys(parsed).forEach(k => {
        if (!k.startsWith('form_') && !['page_url', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_keyword'].includes(k)) {
          dataKeysSet.add(k)
        }
      })
      return parsed
    } catch {
      return {}
    }
  })

  const dataKeys = Array.from(dataKeysSet)

  // CSV Headers
  const headers = [
    'ID',
    '提交时间',
    '表单名称',
    ...dataKeys,
    'UTM 渠道',
    'UTM 媒介',
    'UTM 系列',
    '关键词',
    '来源页面',
    '来源网站',
    'IP',
    '地区',
  ]

  const escapeCSV = (val: string | null | undefined) => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const rows = submissions.map((s, idx) => {
    const dataObj = parsedDataList[idx]
    const dataValues = dataKeys.map(k => escapeCSV(dataObj[k] || ''))

    return [
      s.id,
      escapeCSV(new Date(s.createdAt).toLocaleString('zh-CN')),
      escapeCSV(s.form?.name || ''),
      ...dataValues,
      escapeCSV(s.utmSource),
      escapeCSV(s.utmMedium),
      escapeCSV(s.utmCampaign),
      escapeCSV(s.utmKeyword),
      escapeCSV(s.pageUrl),
      escapeCSV(s.referrer),
      escapeCSV(s.ip),
      escapeCSV([s.city, s.country].filter(Boolean).join(' ')),
    ].join(',')
  })

  const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  const dateStr = new Date().toISOString().split('T')[0]
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
