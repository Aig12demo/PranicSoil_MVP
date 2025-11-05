// Check what this UUID refers to
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
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

  const uuid = '4b27053f-54bd-4668-ae8e-6c7615ab4595';
  console.log(`\n🔍 Checking UUID: ${uuid}\n`);

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Check if it's a profile
  console.log('📋 Checking profiles table...');
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', uuid)
    .maybeSingle();

  if (profile) {
    console.log('✅ Found in profiles table:');
    console.log(`   ID: ${profile.id}`);
    console.log(`   User ID: ${profile.user_id}`);
    console.log(`   Name: ${profile.full_name}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Phone: ${profile.phone || 'N/A'}`);
    console.log(`   Created: ${profile.created_at}`);
  } else if (profileError) {
    console.log(`   ❌ Error: ${profileError.message}`);
  } else {
    console.log('   Not found in profiles table');
  }

  // Check if it's a user_id in profiles
  console.log('\nChecking if it is a user_id...');
  const { data: profileByUserId } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', uuid)
    .maybeSingle();

  if (profileByUserId) {
    console.log('✅ Found profile with this user_id:');
    console.log(`   Profile ID: ${profileByUserId.id}`);
    console.log(`   User ID: ${profileByUserId.user_id}`);
    console.log(`   Name: ${profileByUserId.full_name}`);
    console.log(`   Email: ${profileByUserId.email}`);
    console.log(`   Role: ${profileByUserId.role}`);
  } else {
    console.log('   Not found as user_id');
  }

  // Check auth users
  console.log('\n📋 Checking auth.users...');
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  if (!usersError) {
    const user = users?.find(u => u.id === uuid);
    if (user) {
      console.log('✅ Found in auth.users:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.created_at}`);
    } else {
      console.log('   Not found in auth.users');
    }
  } else {
    console.log(`   ❌ Error: ${usersError.message}`);
  }

  console.log('\n');

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

