'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginClient() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isToolsPortal, setIsToolsPortal] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectFrom = searchParams.get('from') || '/'

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.hostname.includes('tools.') || window.location.hostname.includes('toold.'))) {
      setIsToolsPortal(true)
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('请输入账号邮箱和密码')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '登录失败，请检查账号和密码')
        setLoading(false)
        return
      }

      router.push(redirectFrom)
      router.refresh()
    } catch (err: any) {
      setError('网络异常，请稍后再试')
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '420px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(0, 0, 0, 0.08)',
      borderRadius: '16px',
      padding: '36px 32px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          margin: '0 auto 14px',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
        }}>⚡</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
          {isToolsPortal ? '客户数据中心门户' : 'OpsHub 运营管理中台'}
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          {isToolsPortal ? '客户专属账号登录' : '团队统一身份认证中心'}
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#dc2626',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '13px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
            账号 / 邮箱
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={isToolsPortal ? '请输入您的客户邮箱账号' : '请输入管理员或员工邮箱'}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s',
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
            登录密码
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入登录密码"
            style={{
              width: '100%',
              padding: '12px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#475569' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            transition: 'all 0.2s'
          }}
        >
          {loading ? '正在登录验证...' : (isToolsPortal ? '登录客户门户' : '登录管理中台')}
        </button>
      </form>

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
          {isToolsPortal ? (
            '🔒 请使用企业分配的客户账号密码登录访问'
          ) : (
            <>
              默认超级管理员账号: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#3b82f6' }}>admin@opshub.com</code>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
