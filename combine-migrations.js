// Script to apply migrations via Supabase Dashboard SQL Editor
// This creates a single SQL file you can copy-paste into Supabase Dashboard

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationsDir = join(__dirname, 'supabase', 'migrations');
const outputFile = join(__dirname, 'all-migrations.sql');

// Read initial schema first
let combinedSQL = '-- ============================================\n';
combinedSQL += '-- INITIAL SCHEMA\n';
combinedSQL += '-- ============================================\n\n';
try {
  const initialSchema = readFileSync(join(migrationsDir, '00000000000000_initial_schema.sql'), 'utf-8');
  combinedSQL += initialSchema + '\n\n';
} catch (err) {
  console.log('⚠️  Initial schema not found, skipping...\n');
}

// Read all other migration files in order
const migrationFiles = readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .filter(file => !file.startsWith('00000000000000_initial_schema'))
  .sort();

console.log(`Found ${migrationFiles.length} migration files\n`);

migrationFiles.forEach((file, index) => {
  console.log(`Reading ${index + 1}/${migrationFiles.length}: ${file}`);
  const content = readFileSync(join(migrationsDir, file), 'utf-8');
  combinedSQL += `-- ============================================\n`;
  combinedSQL += `-- Migration: ${file}\n`;
  combinedSQL += `-- ============================================\n\n`;
  combinedSQL += content + '\n\n';
});

// Write combined file
writeFileSync(outputFile, combinedSQL, 'utf-8');

console.log(`\n✅ Combined migration file created: ${outputFile}`);
console.log('\n📋 Next steps:');
console.log('   1. Open: https://supabase.com/dashboard');
console.log('   2. Select your project');
console.log('   3. Click "SQL Editor"');
console.log(`   4. Copy the contents of: ${outputFile}`);
console.log('   5. Paste into SQL Editor and click "Run"\n');

