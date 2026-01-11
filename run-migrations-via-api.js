// Run migrations via Supabase REST API using service role key
import fetch from 'node-fetch';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://bwimmqwtmrprnrhdszts.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_mwHFA_T0uZjVcvjrIZv4Ig_yHqSQQGR';

const migrationsDir = join(__dirname, 'supabase', 'migrations');
const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort()
  .sort((a, b) => {
    if (a.startsWith('20250120')) return 1;
    if (b.startsWith('20250120')) return -1;
    return a.localeCompare(b);
  });

async function runMigration(fileName) {
  const filePath = join(migrationsDir, fileName);
  const sql = readFileSync(filePath, 'utf-8');
  
  // Split into statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`\n📝 Running: ${fileName}`);
  console.log(`   Found ${statements.length} SQL statements`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;
    
    try {
      // Try using Supabase Management API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ sql: statement })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      console.log(`   ✅ Statement ${i + 1}/${statements.length} executed`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      throw error;
    }
  }
  
  console.log(`   ✅ ${fileName} completed`);
}

async function runAllMigrations() {
  console.log('🚀 Starting to run all migrations...');
  console.log(`📋 Total: ${files.length} migration files\n`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      await runMigration(file);
    } catch (error) {
      console.error(`\n❌ Failed to run ${file}`);
      console.error('💡 Please run migrations manually via Supabase Dashboard');
      console.error(`   Go to: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql`);
      process.exit(1);
    }
  }
  
  console.log('\n✅ All migrations completed successfully!');
}

runAllMigrations().catch(console.error);
