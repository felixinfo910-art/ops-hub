const { execSync } = require('child_process');

// Fallback to local SQLite file if DATABASE_URL is not set in environment
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

console.log('[Build Script] Using DATABASE_URL:', process.env.DATABASE_URL);

try {
  console.log('[Build Script] Running prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit', env: process.env });

  console.log('[Build Script] Running prisma db push...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: process.env });

  console.log('[Build Script] Running next build...');
  execSync('npx next build', { stdio: 'inherit', env: process.env });
} catch (error) {
  console.error('[Build Script] Build failed:', error);
  process.exit(1);
}
