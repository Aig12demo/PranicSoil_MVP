// Simple script to view Supabase database tables and data
// Usage: node view-db.js [table_name] [limit]

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Load environment variables from .env file
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
  const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables in .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const tableName = process.argv[2];
  const limit = parseInt(process.argv[3]) || 10;

  async function listTables() {
    console.log('\n📊 Checking Available Tables:\n');
    
    const tables = [
      'profiles',
      'farms',
      'service_agreements',
      'invoices',
      'shared_todos',
      'chat_history',
      'documents',
      'voice_conversation_logs'
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`  ✓ ${table.padEnd(30)} (${count || 0} rows)`);
        } else {
          console.log(`  ✗ ${table.padEnd(30)} (Error: ${error.message})`);
        }
      } catch (err) {
        console.log(`  ✗ ${table.padEnd(30)} (Not accessible)`);
      }
    }
    
    console.log('\n💡 Usage: node view-db.js <table_name> [limit]');
    console.log('   Example: node view-db.js profiles 20\n');
  }

  async function viewTable(table, limit) {
    console.log(`\n📋 Viewing table: ${table} (limit: ${limit})\n`);
    
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(limit);

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.hint) console.error(`   Hint: ${error.hint}`);
      if (error.code) console.error(`   Code: ${error.code}`);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`   No data found in ${table}`);
      if (count !== null && count !== undefined) {
        console.log(`   Total rows in table: ${count}`);
      }
      return;
    }

    console.log(`   Showing ${data.length} of ${count || data.length} total rows\n`);
    console.log(JSON.stringify(data, null, 2));
  }

  if (tableName) {
    await viewTable(tableName, limit);
  } else {
    await listTables();
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error('\nMake sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

