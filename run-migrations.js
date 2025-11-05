// Script to run all database migrations
// This script reads all migration files and executes them in order

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Load environment variables
  const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  const supabaseUrl = envVars.VITE_SUPABASE_URL;
  const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    console.error('   Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\n📦 Running database migrations...\n');

  // Read initial schema
  const initialSchemaPath = join(__dirname, 'supabase', 'migrations', '00000000000000_initial_schema.sql');
  let initialSchema = '';
  try {
    initialSchema = readFileSync(initialSchemaPath, 'utf-8');
    console.log('✓ Found initial schema migration\n');
  } catch (err) {
    console.log('⚠️  Initial schema not found, will create tables if needed\n');
  }

  // Read all migration files
  const migrationsDir = join(__dirname, 'supabase', 'migrations');
  const migrationFiles = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .filter(file => !file.startsWith('00000000000000_initial_schema')) // Skip initial schema if it exists
    .sort();

  if (initialSchema) {
    console.log('Running initial schema...');
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: initialSchema });
      if (error) {
        // Try direct query
        const { error: queryError } = await supabase.from('_').select('*').limit(0);
        // If that fails, we'll need to use SQL editor
        console.log('⚠️  Cannot execute SQL directly. Please run migrations via Supabase Dashboard.');
        console.log('   Go to: https://supabase.com/dashboard -> Your Project -> SQL Editor');
        console.log('   Copy and paste the contents of: supabase/migrations/00000000000000_initial_schema.sql');
        process.exit(1);
      }
      console.log('✓ Initial schema applied\n');
    } catch (err) {
      console.log('⚠️  Cannot execute SQL via API. Please use Supabase Dashboard SQL Editor.');
      console.log('   1. Go to https://supabase.com/dashboard');
      console.log('   2. Select your project');
      console.log('   3. Click "SQL Editor" in the sidebar');
      console.log('   4. Copy and paste the migration SQL files');
      console.log('\n   Start with: supabase/migrations/00000000000000_initial_schema.sql');
      console.log(`   Then run ${migrationFiles.length} additional migrations in order.\n`);
      process.exit(1);
    }
  }

  console.log(`Found ${migrationFiles.length} migration files to run`);
  console.log('\n⚠️  IMPORTANT: Cannot execute migrations directly via API.');
  console.log('   Please run migrations using one of these methods:\n');
  console.log('   Method 1: Supabase Dashboard (Recommended)');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Click "SQL Editor" in the sidebar');
  console.log('   4. Run migrations in this order:');
  console.log(`      - supabase/migrations/00000000000000_initial_schema.sql (if exists)`);
  migrationFiles.forEach((file, idx) => {
    console.log(`      ${idx + 1}. supabase/migrations/${file}`);
  });
  console.log('\n   Method 2: Supabase CLI');
  console.log('   1. Install Supabase CLI: https://supabase.com/docs/guides/cli');
  console.log('   2. Run: supabase db push');
  console.log('\n');

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

