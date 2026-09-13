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
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Form" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "fields" TEXT NOT NULL,
          "notifyEmail" TEXT NOT NULL,
          "styleTheme" TEXT NOT NULL DEFAULT 'default',
          "successMessage" TEXT NOT NULL DEFAULT 'Thank you! We will contact you soon.',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "FormSubmission" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("formId") REFERENCES "Form" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `)
    globalForPrisma.dbInitialized = true
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Form" ADD COLUMN "styleConfig" TEXT;`)
    } catch {}
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Form" ADD COLUMN "customCss" TEXT;`)
    } catch {}
  } catch (err) {
    console.error('Failed to auto-initialize SQLite database tables:', err)
  }
}
