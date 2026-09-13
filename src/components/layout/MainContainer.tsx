'use client'
import { usePathname } from 'next/navigation'

export default function MainContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  return (
    <main className={`main ${isLoginPage ? 'main-content-full' : ''}`}>
      {children}
    </main>
  )
}
