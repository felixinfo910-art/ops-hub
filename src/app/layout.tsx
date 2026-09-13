import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'OpsHub — 运营管理中台',
  description: '多网站表单与运营管理中台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="layout">
          <Sidebar />
          <main className="main">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
