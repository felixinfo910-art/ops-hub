import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import MainContainer from '@/components/layout/MainContainer'

export const metadata: Metadata = {
  title: 'OpsHub — 运营管理中台',
  description: '多网站表单与运营管理中台',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </head>
      <body>
        <div className="layout">
          <Sidebar />
          <MainContainer>
            {children}
          </MainContainer>
        </div>
      </body>
    </html>
  )
}
