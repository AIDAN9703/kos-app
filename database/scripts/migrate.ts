#!/usr/bin/env tsx
/**
 * Migration helper script
 * Allows migrating to dev, prod, or both databases
 * 
 * Usage:
 *   npm run db:migrate:dev      - Migrate to development database
 *   npm run db:migrate:prod      - Migrate to production database  
 *   npm run db:migrate:both      - Migrate to both databases
 * 
 * Note: No confirmation required - be careful with production!
 */

import { config } from 'dotenv';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

// Load environment variables
config({ path: '.env.local' });

const DEV_DATABASE_URL = process.env.DATABASE_URL;
const PROD_DATABASE_URL = process.env.PROD_DATABASE_URL;

if (!DEV_DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

if (!PROD_DATABASE_URL) {
  console.error('❌ PROD_DATABASE_URL not found in .env.local');
  console.log('💡 Add PROD_DATABASE_URL to your .env.local file');
  process.exit(1);
}

async function runMigration(databaseUrl: string, label: string) {
  console.log(`\n🔄 Migrating to ${label}...`);
  console.log(`   URL: ${databaseUrl.substring(0, 50)}...`);

  try {
    const sql = neon(databaseUrl);
    const db = drizzle(sql);

    await migrate(db, { migrationsFolder: './database/migrations' });

    console.log(`✅ Successfully migrated to ${label}`);
    return true;
  } catch (error) {
    console.error(`❌ Error migrating to ${label}:`, error);
    return false;
  }
}

async function main() {
  const target = process.argv[2] || 'dev';

  console.log('🚀 Starting database migration...\n');

  let success = true;

  switch (target) {
    case 'dev':
      success = await runMigration(DEV_DATABASE_URL!, 'Development');
      break;

    case 'prod':
      console.log('⚠️  WARNING: Migrating to PRODUCTION database!');
      success = await runMigration(PROD_DATABASE_URL!, 'Production');
      break;

    case 'both':
      console.log('⚠️  WARNING: Migrating to BOTH databases!');
      const devSuccess = await runMigration(DEV_DATABASE_URL!, 'Development');
      const prodSuccess = await runMigration(PROD_DATABASE_URL!, 'Production');
      success = devSuccess && prodSuccess;
      break;

    default:
      console.error(`❌ Unknown target: ${target}`);
      console.log('   Valid targets: dev, prod, both');
      process.exit(1);
  }

  if (success) {
    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Migration failed!');
    process.exit(1);
  }
}

main();
