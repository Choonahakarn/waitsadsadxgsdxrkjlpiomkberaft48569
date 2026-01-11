// Run migration using service role key
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase URL from environment or use default
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bwimmqwtmrprnrhdszts.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_mwHFA_T0uZjVcvjrIZv4Ig_yHqSQQGR';

if (!SUPABASE_URL) {
  console.error('❌ Missing VITE_SUPABASE_URL');
  process.exit(1);
}

// Create Supabase client with service role key (has admin access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Starting migration...');
    console.log('📍 Project:', SUPABASE_URL);
    
    // Read migration file
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20250120000000_add_post_id_to_artworks.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('\n📝 Migration SQL:');
    console.log('-'.repeat(60));
    console.log(migrationSQL);
    console.log('-'.repeat(60));
    
    // Supabase JS client doesn't support DDL directly
    // We need to use REST API or PostgREST
    // Let's try using the REST API directly
    
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`\n📌 Found ${statements.length} SQL statements`);
    
    // Use PostgREST to execute SQL via RPC (if available)
    // Or use direct HTTP request to Supabase REST API
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      console.log(`\n📌 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        // Try using RPC to execute SQL
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });
        
        if (error) {
          // RPC might not exist, try alternative method
          console.log('⚠️  RPC method not available, trying alternative...');
          
          // Use direct HTTP request to Supabase Management API
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({ sql_query: statement })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
        } else {
          console.log('✅ Statement executed successfully');
        }
      } catch (error) {
        console.error('❌ Error executing statement:', error.message);
        console.error('\n💡 Note: Direct SQL execution via client is not supported.');
        console.error('   Please run the SQL manually in Supabase Dashboard:');
        console.error(`   https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql`);
        throw error;
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Please run SQL manually in Supabase Dashboard:');
    console.error('   1. Go to: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql');
    console.error('   2. Copy SQL from: supabase/migrations/20250120000000_add_post_id_to_artworks.sql');
    console.error('   3. Paste and run');
    process.exit(1);
  }
}

runMigration();
