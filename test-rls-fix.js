// Script to fix RLS policies and ensure admin can access profile
// This bypasses RLS temporarily to fix the policies

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
    process.exit(1);
  }

  console.log('\n🔧 Fixing RLS policies...\n');

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Read SQL file
  const sqlFile = readFileSync(join(__dirname, 'fix-rls-policies.sql'), 'utf-8');
  
  console.log('⚠️  Cannot execute SQL directly via API.');
  console.log('   Please run fix-rls-policies.sql in Supabase Dashboard.\n');
  
  console.log('📋 Quick Fix Steps:');
  console.log('   1. Go to: https://supabase.com/dashboard → Your Project');
  console.log('   2. Click "SQL Editor"');
  console.log('   3. Open file: fix-rls-policies.sql');
  console.log('   4. Copy ALL contents');
  console.log('   5. Paste into SQL Editor');
  console.log('   6. Click "Run"\n');

  // Test if we can access profile with anon key after login
  console.log('🔐 Testing profile access with anon key...\n');
  
  const supabaseClient = createClient(supabaseUrl, envVars.VITE_SUPABASE_ANON_KEY);
  
  // Try to login first
  const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
    email: 'rkaruturi@gmail.com',
    password: 'Test123'
  });

  if (loginError) {
    console.error('❌ Login failed:', loginError.message);
    process.exit(1);
  }

  console.log('✓ Login successful');

  // Now try to fetch profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', loginData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('❌ Profile fetch failed:', profileError.message);
    console.error('   Code:', profileError.code);
    console.error('   Details:', profileError.details);
    console.error('   Hint:', profileError.hint);
    console.log('\n💡 This confirms RLS policies need to be fixed!');
    console.log('   Run fix-rls-policies.sql in Supabase Dashboard.\n');
  } else if (profile) {
    console.log('✅ Profile accessible!');
    console.log(`   Role: ${profile.role}`);
    console.log(`   Name: ${profile.full_name}\n`);
  } else {
    console.log('⚠️  Profile not found');
    console.log('   This might be an RLS issue.\n');
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

