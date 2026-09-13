export const AUTH_COOKIE_NAME = 'opshub_session'

export function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME || 'admin'
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || '123456'
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

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const expectedToken = await getExpectedToken()
  return token === expectedToken
}
