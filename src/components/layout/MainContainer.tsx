'use client'
import { usePathname } from 'next/navigation'
import Header from './Header'
import { Suspense } from 'react'

export default function MainContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  return (
    <main className={`main ${isLoginPage ? 'main-content-full' : ''}`}>
      {!isLoginPage && (
        <Suspense fallback={<div className="header"><div className="header-title">加载中...</div></div>}>
          <Header />
        </Suspense>
      )}
      {children}
    </main>
  )
}
