import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.dtafac.com' : undefined,
    maxAge: 0,
  })
  return response
}
