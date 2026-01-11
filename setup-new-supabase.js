// Script to setup new Supabase project
// This will help you run all migrations and setup

console.log('='.repeat(60));
console.log('🚀 SETUP NEW SUPABASE PROJECT');
console.log('='.repeat(60));
console.log('');
console.log('📋 Step 1: Create .env.local file');
console.log('');
console.log('Create a file named .env.local in the root directory with:');
console.log('');
console.log('VITE_SUPABASE_URL=https://bwimmqwtmrprnrhdszts.supabase.co');
console.log('VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_IxLJbB46XkQ6CbhWoYurzQ_HYUAtr6o');
console.log('');
console.log('='.repeat(60));
console.log('📋 Step 2: Run Migrations');
console.log('='.repeat(60));
console.log('');
console.log('Go to: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql');
console.log('');
console.log('Run migrations in this order (copy each file content and run):');
console.log('');

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationsDir = join(__dirname, 'supabase', 'migrations');
const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

files.forEach((file, index) => {
  console.log(`${index + 1}. ${file}`);
});

console.log('');
console.log('='.repeat(60));
console.log('📋 Step 3: Setup Storage Buckets');
console.log('='.repeat(60));
console.log('');
console.log('Go to: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/storage/buckets');
console.log('');
console.log('Create these buckets:');
console.log('  1. artworks (public)');
console.log('  2. avatars (public)');
console.log('  3. posts (public)');
console.log('  4. verification-docs (private)');
console.log('  5. payment-slips (private)');
console.log('');
console.log('='.repeat(60));
console.log('✅ After completing all steps, restart your dev server!');
console.log('='.repeat(60));
