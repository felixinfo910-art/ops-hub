'use client'

import { useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginClient() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectFrom = searchParams.get('from') || '/'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('请输入账号和密码')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '登录失败，请重试')
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
      background: 'rgba(30, 41, 59, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '36px 32px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
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
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
        }}>⚡</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>OpsHub 运营管理中台</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>超级管理员登录</p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
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
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
            管理员账号
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入管理员账号"
            style={{
              width: '100%',
              padding: '12px 14px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s',
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
            登录密码
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            style={{
              width: '100%',
              padding: '12px 14px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9',
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
          {loading ? '正在验证...' : '立即登录中台'}
        </button>
      </form>

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
          管理员账号: <code style={{ background: '#0f172a', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8' }}>admin</code> &nbsp;|&nbsp; 密码: <code style={{ background: '#0f172a', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8' }}>123456</code>
        </p>
      </div>
    </div>
  )
}
