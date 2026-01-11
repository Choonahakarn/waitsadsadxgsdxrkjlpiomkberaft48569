// Run migration directly using Supabase Management API
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://bwimmqwtmrprnrhdszts.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_mwHFA_T0uZjVcvjrIZv4Ig_yHqSQQGR';

const migrationSQL = `-- Add post_id column to artworks table to link with community_posts
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.community_posts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artworks_post_id ON public.artworks(post_id);

-- Add comment for documentation
COMMENT ON COLUMN public.artworks.post_id IS 'Links artwork to community post when added to portfolio';`;

async function runMigration() {
  try {
    console.log('🚀 Starting migration...');
    console.log('📍 Project:', SUPABASE_URL);
    console.log('\n📝 SQL to execute:');
    console.log('-'.repeat(60));
    console.log(migrationSQL);
    console.log('-'.repeat(60));
    
    // Supabase doesn't have a direct API for DDL statements
    // We need to use the Management API or SQL Editor API
    // Let's try using the REST API with pg_rest extension if available
    
    // Split SQL into statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`\n📌 Found ${statements.length} SQL statements`);
    
    // Try using Supabase Management API (if available)
    // Or use PostgREST with a custom function
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      console.log(`\n📌 Executing statement ${i + 1}/${statements.length}...`);
      console.log(statement.substring(0, 80) + '...');
      
      try {
        // Try using Supabase REST API with exec_sql function (if exists)
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
        
        const data = await response.json();
        console.log('✅ Statement executed successfully');
        
      } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n💡 Direct SQL execution via API is not available.');
        console.error('   Please run the SQL manually in Supabase Dashboard:');
        console.error(`   https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql`);
        throw error;
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Refresh your web app');
    console.log('   2. Test creating a post with "Add to Portfolio" checked');
    console.log('   3. Check if Portfolio tab shows the post');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Please run SQL manually in Supabase Dashboard:');
    console.error('   1. Go to: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql');
    console.error('   2. Copy and paste the SQL above');
    console.error('   3. Click Run');
    process.exit(1);
  }
}

runMigration();
