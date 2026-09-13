export const AUTH_COOKIE_NAME = 'opshub_session'

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'admin123456'
}

export async function createSessionToken(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`opshub-auth-salt-v1-${password}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const expectedToken = await createSessionToken(getAdminPassword())
  return token === expectedToken
}
