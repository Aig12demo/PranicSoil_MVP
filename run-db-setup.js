// Script to automatically execute database setup
// This will run all SQL commands via Supabase API

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    console.error('   Required for running SQL commands');
    process.exit(1);
  }

  console.log('\n🚀 Starting database setup...\n');

  // Read SQL file
  const sqlFile = readFileSync(join(__dirname, 'setup-database-simple.sql'), 'utf-8');
  
  // Split SQL into individual statements
  // Remove comments and empty lines
  const statements = sqlFile
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))
    .filter(s => !s.match(/^\s*$/));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  // Note: Supabase JS client doesn't have a direct SQL execution method
  // We need to use the REST API or RPC function
  // For now, let's try using postgrest-js or direct REST calls

  console.log('⚠️  Direct SQL execution via API is not available.');
  console.log('   Supabase requires SQL to be run via:');
  console.log('   1. SQL Editor in Dashboard (recommended)');
  console.log('   2. Supabase CLI');
  console.log('   3. RPC functions\n');

  console.log('📋 Instead, I\'ll verify the database setup...\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Check if tables exist
  const tables = ['profiles', 'farms', 'service_agreements', 'invoices', 'shared_todos'];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: Table does NOT exist`);
      } else {
        console.log(`✓ ${table}: Table exists`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Table does NOT exist`);
    }
  }

  console.log('\n💡 To set up the database:');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Click "SQL Editor"');
  console.log('   4. Copy contents of: setup-database-simple.sql');
  console.log('   5. Paste and run\n');

  // Alternative: Try to execute via REST API
  console.log('🔄 Attempting alternative method...\n');
  
  try {
    // Try to execute SQL via REST API using postgrest
    // This is a workaround - Supabase doesn't officially support this
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql: sqlFile })
    });

    if (response.ok) {
      console.log('✅ SQL executed via REST API!\n');
    } else {
      throw new Error('RPC function not available');
    }
  } catch (err) {
    console.log('⚠️  Cannot execute SQL directly via API.');
    console.log('   Please use Supabase Dashboard SQL Editor.\n');
    
    // Show the SQL file location
    console.log(`📄 SQL file location:`);
    console.log(`   ${join(__dirname, 'setup-database-simple.sql')}\n`);
    
    // Try to open it
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync(`notepad "${join(__dirname, 'setup-database-simple.sql')}"`);
      console.log('✅ Opened SQL file in Notepad\n');
    } catch (openErr) {
      console.log('⚠️  Could not open file automatically\n');
    }
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

