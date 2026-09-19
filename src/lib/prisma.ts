import { PrismaClient } from '@prisma/client'

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
        PRIMARY KEY ("userId", "websiteId"),
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("websiteId") REFERENCES "Website" ("id") ON DELETE CASCADE
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

  } catch (err) {
    console.error('Failed to auto-initialize SQLite database tables:', err)
  }
}
