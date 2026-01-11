// Simple script to show SQL that needs to be run
// This is easier than trying to execute via client

console.log('='.repeat(60));
console.log('📋 MIGRATION SQL - Copy and run in Supabase Dashboard');
console.log('='.repeat(60));
console.log('');
console.log('📍 Go to: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql');
console.log('');
console.log('📝 Copy the SQL below and paste in SQL Editor:');
console.log('');
console.log('-'.repeat(60));
console.log('');

const migrationSQL = `-- Add post_id column to artworks table to link with community_posts
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.community_posts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artworks_post_id ON public.artworks(post_id);

-- Add comment for documentation
COMMENT ON COLUMN public.artworks.post_id IS 'Links artwork to community post when added to portfolio';`;

console.log(migrationSQL);

console.log('');
console.log('-'.repeat(60));
console.log('');
console.log('✅ After running, refresh your web app and test!');
console.log('');
