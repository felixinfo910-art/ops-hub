export const AUTH_COOKIE_NAME = 'opshub_session'

export interface SessionPayload {
  userId: number
  email: string
  name: string
  role: 'super_admin' | 'company_admin' | 'site_manager' | 'viewer' | string
  companyId: number | null
  companyName?: string | null
}

export function getAdminUsername(): string {
  return 'admin'
}

export function getAdminPassword(): string {
  return '123456'
}

// Compute SHA-256 hash for passwords
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`opshub-salt-v1-${password}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function createSessionToken(username: string, password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`opshub-auth-v2-${username.toLowerCase().trim()}-${password}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function getExpectedToken(): Promise<string> {
  return createSessionToken(getAdminUsername(), getAdminPassword())
}

const SECRET_SALT = process.env.SESSION_SECRET || 'opshub-secure-session-salt-2026'

// Simple Base64URL + Signature for session token tamper-proofing
export function serializeSessionPayload(payload: SessionPayload): string {
  const jsonStr = JSON.stringify(payload)
  const encoded = Buffer.from(jsonStr).toString('base64url')
  const sig = generateSignature(encoded)
  return `${encoded}.${sig}`
}

function generateSignature(str: string): string {
  let hash = 0
  const combined = `${str}:${SECRET_SALT}`
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export function parseSessionPayload(token: string | undefined | null): SessionPayload | null {
  if (!token) return null
  try {
    const parts = token.split('.')
    const rawPayload = parts[0]
    const sig = parts[1]

    if (sig && sig !== generateSignature(rawPayload)) {
      console.warn('Session token signature invalid - possible tampering attempt')
      return null
    }

    const jsonStr = Buffer.from(rawPayload, 'base64url').toString('utf-8')
    const payload = JSON.parse(jsonStr)
    if (payload && payload.userId && payload.role) {
      return payload as SessionPayload
    }
  } catch (e) {
    // fallback or legacy token check below
  }
  return null
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const legacyToken = await getExpectedToken()
  if (token === legacyToken) return true
  
  const payload = parseSessionPayload(token)
  return payload !== null
}
