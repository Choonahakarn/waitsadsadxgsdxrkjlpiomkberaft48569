// Combine all migrations into one file for easy execution
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationsDir = join(__dirname, 'supabase', 'migrations');
const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort()
  // Move 20250120000000 to the end (it adds column to existing table)
  .sort((a, b) => {
    if (a.startsWith('20250120')) return 1; // Move to end
    if (b.startsWith('20250120')) return -1;
    return a.localeCompare(b);
  });

console.log('📋 Combining migrations...');
console.log(`Found ${files.length} migration files\n`);

let combinedSQL = `-- ============================================
-- COMBINED MIGRATIONS FOR SUPABASE PROJECT
-- Project: bwimmqwtmrprnrhdszts
-- Total: ${files.length} migrations
-- ============================================\n\n`;

files.forEach((file, index) => {
  const filePath = join(migrationsDir, file);
  const content = readFileSync(filePath, 'utf-8');
  
  combinedSQL += `-- ============================================\n`;
  combinedSQL += `-- Migration ${index + 1}/${files.length}: ${file}\n`;
  combinedSQL += `-- ============================================\n\n`;
  combinedSQL += content;
  combinedSQL += `\n\n`;
  
  console.log(`${index + 1}. ${file}`);
});

// Write combined file
const outputPath = join(__dirname, 'ALL_MIGRATIONS.sql');
writeFileSync(outputPath, combinedSQL, 'utf-8');

console.log(`\n✅ Combined migrations saved to: ALL_MIGRATIONS.sql`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Go to: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql`);
console.log(`   2. Open ALL_MIGRATIONS.sql`);
console.log(`   3. Copy all content and paste in SQL Editor`);
console.log(`   4. Click Run`);
console.log(`\n⚠️  Note: If you get errors, run migrations one by one instead`);
