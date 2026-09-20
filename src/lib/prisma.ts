import { PrismaClient } from '@prisma/client'

// Ensure runtime DATABASE_URL fallback for Node.js API routes if missing in environment
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  dbInitialized: boolean | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function ensureDbInitialized() {
  if (globalForPrisma.dbInitialized) return
  try {
    // ---------- Company ----------
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Company" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "code" TEXT NOT NULL UNIQUE,
        "status" TEXT NOT NULL DEFAULT 'active',
        "smtpConfig" TEXT,
        "defaultNotifyEmail" TEXT,
        "feishuWebhook" TEXT,
        "dingtalkWebhook" TEXT,
        "customWebhookUrl" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ---------- Website ----------
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Website" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "companyId" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "domain" TEXT NOT NULL,
        "adminUrl" TEXT,
        "siteKey" TEXT NOT NULL UNIQUE,
        "status" TEXT NOT NULL DEFAULT 'active',
        "allowedDomains" TEXT,
        "customSmtpConfig" TEXT,
        "notifyEmail" TEXT,
        "feishuWebhook" TEXT,
        "dingtalkWebhook" TEXT,
        "customWebhookUrl" TEXT,
        "enableHoneypot" BOOLEAN NOT NULL DEFAULT 1,
        "blacklistedIps" TEXT,
        "sslExpiresAt" DATETIME,
        "domainExpiresAt" DATETIME,
        "lastHttpStatus" INTEGER,
        "lastResponseTimeMs" INTEGER,
        "lastCheckedAt" DATETIME,
        "ga4MeasurementId" TEXT,
        "fbPixelId" TEXT,
        "gtmContainerId" TEXT,
        "customHeaderScript" TEXT,
        "lastPingAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE
      );
    `)

    // ---------- User ----------
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "email" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "name" TEXT,
        "avatar" TEXT,
        "role" TEXT NOT NULL DEFAULT 'company_admin',
        "companyId" INTEGER,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "lastLoginAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE
      );
    `)

    // ---------- UserWebsitePermission ----------
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserWebsitePermission" (
        "userId" INTEGER NOT NULL,
        "websiteId" INTEGER NOT NULL,
        "canCreate" BOOLEAN NOT NULL DEFAULT 1,
        "canRead" BOOLEAN NOT NULL DEFAULT 1,
        "canUpdate" BOOLEAN NOT NULL DEFAULT 1,
        "canDelete" BOOLEAN NOT NULL DEFAULT 0,
        PRIMARY KEY ("userId", "websiteId"),
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("websiteId") REFERENCES "Website" ("id") ON DELETE CASCADE
      );
    `)

    // ---------- PermissionGroup ----------
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PermissionGroup" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "companyId" INTEGER,
        "allowedMenus" TEXT NOT NULL DEFAULT '[]',
        "defaultCrud" TEXT DEFAULT '{"canCreate":true,"canRead":true,"canUpdate":true,"canDelete":false}',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ---------- Form ----------
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Form" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "companyId" INTEGER,
        "websiteId" INTEGER,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "fields" TEXT NOT NULL,
        "notifyEmail" TEXT NOT NULL DEFAULT '',
        "styleTheme" TEXT NOT NULL DEFAULT 'default',
        "styleConfig" TEXT,
        "customCss" TEXT,
        "successMessage" TEXT NOT NULL DEFAULT 'Thank you! We will contact you soon.',
        "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT 0,
        "autoReplySubject" TEXT,
        "autoReplyBody" TEXT,
        "autoReplyCatalogUrl" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL,
        FOREIGN KEY ("websiteId") REFERENCES "Website" ("id") ON DELETE SET NULL
      );
    `)

    // ---------- FormSubmission ----------
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "FormSubmission" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "companyId" INTEGER,
        "websiteId" INTEGER,
        "formId" INTEGER NOT NULL,
        "data" TEXT NOT NULL,
        "ip" TEXT,
        "country" TEXT,
        "city" TEXT,
        "userAgent" TEXT,
        "pageUrl" TEXT,
        "referrer" TEXT,
        "utmSource" TEXT,
        "utmMedium" TEXT,
        "utmCampaign" TEXT,
        "utmKeyword" TEXT,
        "isSpam" BOOLEAN NOT NULL DEFAULT 0,
        "spamReason" TEXT,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("formId") REFERENCES "Form" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL,
        FOREIGN KEY ("websiteId") REFERENCES "Website" ("id") ON DELETE SET NULL
      );
    `)

    globalForPrisma.dbInitialized = true

    // --- Column patches for existing databases (safe: errors silently ignored) ---
    // Form patches
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Form" ADD COLUMN "companyId" INTEGER;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Form" ADD COLUMN "websiteId" INTEGER;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Form" ADD COLUMN "styleConfig" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Form" ADD COLUMN "customCss" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Form" ADD COLUMN "autoReplyEnabled" BOOLEAN DEFAULT 0;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Form" ADD COLUMN "autoReplySubject" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Form" ADD COLUMN "autoReplyBody" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Form" ADD COLUMN "autoReplyCatalogUrl" TEXT;`) } catch {}
    // FormSubmission patches
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "FormSubmission" ADD COLUMN "companyId" INTEGER;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "FormSubmission" ADD COLUMN "websiteId" INTEGER;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "FormSubmission" ADD COLUMN "isSpam" BOOLEAN DEFAULT 0;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "FormSubmission" ADD COLUMN "spamReason" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "FormSubmission" ADD COLUMN "status" TEXT DEFAULT 'pending';`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "FormSubmission" ADD COLUMN "notes" TEXT;`) } catch {}
    // Company patches
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN "feishuWebhook" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN "dingtalkWebhook" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN "customWebhookUrl" TEXT;`) } catch {}
    // Website patches
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "adminUrl" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "feishuWebhook" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "dingtalkWebhook" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "customWebhookUrl" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "enableHoneypot" BOOLEAN DEFAULT 1;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "blacklistedIps" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "sslExpiresAt" DATETIME;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "domainExpiresAt" DATETIME;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "lastHttpStatus" INTEGER;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "lastResponseTimeMs" INTEGER;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "lastCheckedAt" DATETIME;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "lastPingAt" DATETIME;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "ga4MeasurementId" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "fbPixelId" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "gtmContainerId" TEXT;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Website" ADD COLUMN "customHeaderScript" TEXT;`) } catch {}
    // User patches
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "allowedMenus" TEXT DEFAULT '[]';`) } catch {}
    // UserWebsitePermission patches
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "UserWebsitePermission" ADD COLUMN "canCreate" BOOLEAN DEFAULT 1;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "UserWebsitePermission" ADD COLUMN "canRead" BOOLEAN DEFAULT 1;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "UserWebsitePermission" ADD COLUMN "canUpdate" BOOLEAN DEFAULT 1;`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "UserWebsitePermission" ADD COLUMN "canDelete" BOOLEAN DEFAULT 0;`) } catch {}

    // --- Create Default Super Admin (if missing) to prevent 500/Lockout on new environments ---
    try {
      const userCount = await prisma.user.count()
      if (userCount === 0) {
        // Pre-computed hash logic to inject the default account without cyclic dependencies
        // This relies on auth.ts hashPassword('admin123456') logic
        const { hashPassword } = await import('./auth')
        const adminHash = await hashPassword('admin123456')
        await prisma.user.create({
          data: {
            email: 'admin@dtafac.com',
            passwordHash: adminHash,
            name: 'Super Admin',
            role: 'super_admin'
          }
        })
        console.log('✅ Created default super_admin account: admin@dtafac.com / admin123456')
      }
    } catch (createErr) {
      console.error('⚠️ Could not initialize default admin account:', createErr)
    }

  } catch (err) {
    console.error('Failed to auto-initialize SQLite database tables:', err)
  }
}
