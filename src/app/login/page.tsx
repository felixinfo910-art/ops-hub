import { Suspense } from 'react'
import LoginClient from './LoginClient'

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%)',
      padding: '20px',
    }}>
      <Suspense fallback={<div style={{ color: '#94a3b8' }}>加载中...</div>}>
        <LoginClient />
      </Suspense>
    </div>
  )
}
