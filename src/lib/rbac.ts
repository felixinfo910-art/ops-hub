import { parseSessionPayload, AUTH_COOKIE_NAME } from './auth'
import { prisma, ensureDbInitialized } from './prisma'

export interface UserScope {
  userId: number
  role: 'super_admin' | 'company_admin' | 'site_manager' | 'viewer'
  rawRole: string
  companyId: number | null
  allowedCompanyIds: number[] | null // null means ALL allowed (super_admin)
  allowedWebsiteIds: number[] | null // null means ALL allowed
  allowedMenus: string[]
}

export const ALL_SYSTEM_MENUS = [
  { key: 'submissions', label: '📬 询盘记录', defaultFor: ['super_admin', 'company_admin', 'site_manager', 'viewer'] },
  { key: 'forms', label: '📝 表单管理', defaultFor: ['super_admin', 'company_admin', 'site_manager'] },
  { key: 'sites', label: '🌐 网站管理', defaultFor: ['super_admin', 'company_admin', 'site_manager'] },
  { key: 'companies', label: '🏢 公司管理', defaultFor: ['super_admin'] },
  { key: 'users', label: '👥 账号管理', defaultFor: ['super_admin', 'company_admin'] },
  { key: 'seo', label: '🔍 SEO工具', defaultFor: ['super_admin', 'company_admin', 'site_manager'] },
]

const SYSTEM_ROLE_NAME_MAP: Record<string, string> = {
  super_admin: '超级管理员',
  company_admin: '公司管理员',
  site_manager: '站点管理员',
  viewer: '数据观察员',
}

function resolveCustomOrRoleMenus(role: string, allowedMenusJson?: string | null): string[] {
  if (allowedMenusJson) {
    try {
      const parsed = JSON.parse(allowedMenusJson)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    } catch {}
  }
  return ALL_SYSTEM_MENUS
    .filter(m => m.defaultFor.includes(role as any))
    .map(m => m.key)
}

export async function computeUserMenusAsync(role: string, allowedMenusJson?: string | null): Promise<string[]> {
  // 1. Query the live PermissionGroup first for role-based permission sync
  const groupName = SYSTEM_ROLE_NAME_MAP[role] || role
  if (groupName) {
    try {
      const group: any = await (prisma as any).permissionGroup.findFirst({
        where: { name: groupName }
      })
      if (group && group.allowedMenus) {
        const parsed = JSON.parse(group.allowedMenus)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch {}
  }

  // 2. Fallback to user custom menu snapshot or role defaults
  return resolveCustomOrRoleMenus(role, allowedMenusJson)
}

export function computeUserMenus(role: string, allowedMenusJson?: string | null): string[] {
  return resolveCustomOrRoleMenus(role, allowedMenusJson)
}

export async function getAuthUserAndScope(req: Request): Promise<UserScope | null> {
  await ensureDbInitialized()

  const cookieHeader = req.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    })
  )

  const token = cookies[AUTH_COOKIE_NAME]
  const payload = parseSessionPayload(token)
  if (!payload) return null

  const { userId } = payload

  // Query DB user for LIVE role and allowedMenus
  const dbUser: any = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      companyId: true,
      isActive: true,
      allowedMenus: true,
      sitePermissions: {
        select: {
          websiteId: true,
          website: {
            select: { companyId: true }
          }
        }
      }
    }
  })

  // If the account record does not exist in the database or is disabled, reject session
  if (!dbUser || dbUser.isActive === false) {
    return null
  }

  const rawRole = dbUser.role || 'company_admin'
  let role: 'super_admin' | 'company_admin' | 'site_manager' | 'viewer' = 'viewer'

  if (rawRole === 'super_admin' || rawRole === '超级管理员') {
    role = 'super_admin'
  } else if (rawRole === 'company_admin' || rawRole === '公司管理员') {
    role = 'company_admin'
  } else if (rawRole === 'site_manager' || rawRole === '站点管理员') {
    role = 'site_manager'
  } else {
    role = 'viewer'
  }

  const companyId = dbUser ? dbUser.companyId : (payload.companyId ? Number(payload.companyId) : null)
  const allowedMenus = await computeUserMenusAsync(rawRole, dbUser?.allowedMenus)

  if (role === 'super_admin') {
    return {
      userId,
      role,
      rawRole,
      companyId: null,
      allowedCompanyIds: null,
      allowedWebsiteIds: null,
      allowedMenus,
    }
  }

  if (role === 'company_admin') {
    const compId = companyId ? Number(companyId) : null
    return {
      userId,
      role,
      rawRole,
      companyId: compId,
      allowedCompanyIds: compId !== null ? [compId] : [],
      allowedWebsiteIds: null, // all websites within company
      allowedMenus,
    }
  }

  if (!dbUser) {
    return {
      userId,
      role,
      rawRole,
      companyId: null,
      allowedCompanyIds: [],
      allowedWebsiteIds: [],
      allowedMenus,
    }
  }

  // If sitePermissions were explicitly assigned, restrict to those specific sites.
  // Otherwise, default to ALL websites under their assigned company!
  const hasExplicitSitePerms = Array.isArray(dbUser.sitePermissions) && dbUser.sitePermissions.length > 0
  const allowedWebsiteIds = hasExplicitSitePerms ? dbUser.sitePermissions.map((sp: any) => sp.websiteId) : null

  const compIdsSet = new Set<number>()
  if (companyId) {
    compIdsSet.add(companyId)
  }
  if (dbUser.sitePermissions) {
    dbUser.sitePermissions.forEach((sp: any) => {
      if (sp.website?.companyId) {
        compIdsSet.add(sp.website.companyId)
      }
    })
  }

  return {
    userId,
    role,
    rawRole,
    companyId: dbUser.companyId,
    allowedCompanyIds: Array.from(compIdsSet),
    allowedWebsiteIds,
    allowedMenus,
  }
}
