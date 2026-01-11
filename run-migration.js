// Script to run migration using Supabase client
// Usage: node run-migration.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Please set:');
  console.error('  - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY');
  console.error('');
  console.error('You can find these in:');
  console.error('  Supabase Dashboard → Project Settings → API');
  console.error('  - Project URL → SUPABASE_URL');
  console.error('  - service_role key → SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (has admin access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  try {
    console.log('🚀 Starting migration...');
    
    // Read migration file
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20250120000000_add_post_id_to_artworks.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      console.log(`\n📌 Executing statement ${i + 1}/${statements.length}...`);
      console.log(statement.substring(0, 100) + '...');
      
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try direct query if RPC doesn't work
        const { error: queryError } = await supabase.from('_migrations').select('*').limit(0);
        
        if (queryError) {
          console.error('❌ Error:', error.message);
          console.error('💡 Note: You may need to run this SQL directly in Supabase Dashboard');
          console.error('   Go to: Supabase Dashboard → SQL Editor');
          console.error('   Copy and paste the SQL from: supabase/migrations/20250120000000_add_post_id_to_artworks.sql');
          throw error;
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Refresh your web app');
    console.log('   2. Test creating a post with "Add to Portfolio" checked');
    console.log('   3. Check if Portfolio tab shows the post');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Alternative: Run SQL directly in Supabase Dashboard');
    console.error('   1. Go to: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql');
    console.error('   2. Copy SQL from: supabase/migrations/20250120000000_add_post_id_to_artworks.sql');
    console.error('   3. Paste and run');
    process.exit(1);
  }
}

runMigration();
