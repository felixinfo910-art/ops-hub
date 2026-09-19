import { parseSessionPayload, AUTH_COOKIE_NAME } from './auth'
import { prisma } from './prisma'

export interface UserScope {
  userId: number
  role: 'super_admin' | 'company_admin' | 'site_manager' | 'viewer'
  companyId: number | null
  allowedCompanyIds: number[] | null // null means ALL allowed (super_admin)
  allowedWebsiteIds: number[] | null // null means ALL allowed (super_admin or company_admin for company)
}

export async function getAuthUserAndScope(req: Request): Promise<UserScope | null> {
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

  const { userId, role, companyId } = payload

  if (role === 'super_admin') {
    return {
      userId,
      role,
      companyId: null,
      allowedCompanyIds: null,
      allowedWebsiteIds: null,
    }
  }

  if (role === 'company_admin') {
    const compId = companyId ? Number(companyId) : null
    return {
      userId,
      role,
      companyId: compId,
      allowedCompanyIds: compId !== null ? [compId] : [],
      allowedWebsiteIds: null, // all websites within company
    }
  }

  // site_manager or viewer: query specific allowed site IDs from UserWebsitePermission
  const userWithPerms = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      companyId: true,
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

  if (!userWithPerms) {
    return {
      userId,
      role,
      companyId: null,
      allowedCompanyIds: [],
      allowedWebsiteIds: [],
    }
  }

  const allowedWebsiteIds = userWithPerms.sitePermissions.map(sp => sp.websiteId)
  const compIdsSet = new Set<number>()
  
  // For site_manager / viewer, ONLY include company IDs of their assigned websites!
  userWithPerms.sitePermissions.forEach(sp => {
    if (sp.website?.companyId) {
      compIdsSet.add(sp.website.companyId)
    }
  })

  return {
    userId,
    role,
    companyId: userWithPerms.companyId,
    allowedCompanyIds: Array.from(compIdsSet),
    allowedWebsiteIds,
  }
}
