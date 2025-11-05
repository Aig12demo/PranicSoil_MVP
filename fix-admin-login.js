// Script to ensure admin user can login
// This checks and fixes all issues

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

  const adminEmail = 'rkaruturi@gmail.com';
  const adminPassword = 'Test123';
  const adminName = 'Ravi Karuturi';

  console.log('\n🔧 Fixing admin login for:', adminEmail, '\n');

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Step 1: Get admin user
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Error:', listError.message);
    process.exit(1);
  }

  const adminUser = users?.find(u => u.email === adminEmail);
  if (!adminUser) {
    console.error('❌ Admin user not found!');
    process.exit(1);
  }

  console.log('✓ Admin user found:', adminUser.id);
  console.log('✓ Email confirmed:', adminUser.email_confirmed_at ? 'Yes' : 'No');

  // Step 2: Ensure email is confirmed
  if (!adminUser.email_confirmed_at) {
    console.log('\n📧 Confirming email...');
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      adminUser.id,
      { email_confirm: true }
    );
    if (confirmError) {
      console.error('⚠️  Could not confirm email:', confirmError.message);
    } else {
      console.log('✓ Email confirmed');
    }
  }

  // Step 3: Set password
  console.log('\n🔐 Setting password...');
  const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
    adminUser.id,
    { password: adminPassword }
  );
  if (passwordError) {
    console.error('⚠️  Could not set password:', passwordError.message);
  } else {
    console.log('✓ Password set to:', adminPassword);
  }

  // Step 4: Check/create profile
  console.log('\n👤 Checking profile...');
  let { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', adminUser.id)
    .maybeSingle();

  if (profileError && profileError.code === 'PGRST116') {
    console.log('⚠️  Profiles table does not exist yet!');
    console.log('   Please run the database migrations first.');
    console.log('   Use: setup-database-no-hang.sql\n');
    process.exit(1);
  }

  if (!profile) {
    console.log('Creating profile...');
    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: adminUser.id,
        user_id: adminUser.id,
        email: adminEmail,
        role: 'admin',
        full_name: adminName,
        email_confirmed: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating profile:', insertError.message);
      if (insertError.code === 'PGRST116') {
        console.log('\n💡 The profiles table does not exist!');
        console.log('   Run the database migrations first.');
      }
      process.exit(1);
    }
    profile = newProfile;
    console.log('✓ Profile created');
  } else {
    console.log('✓ Profile exists');
    
    // Update if needed
    if (profile.role !== 'admin' || profile.user_id !== adminUser.id) {
      console.log('Updating profile...');
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          user_id: adminUser.id,
          role: 'admin',
          full_name: adminName,
          email_confirmed: true
        })
        .eq('id', adminUser.id);

      if (updateError) {
        console.error('❌ Error updating profile:', updateError.message);
      } else {
        console.log('✓ Profile updated to admin');
      }
    } else {
      console.log('✓ Profile role is correct');
    }
  }

  // Step 5: Test login
  console.log('\n🔐 Testing login...');
  const supabaseClient = createClient(supabaseUrl, envVars.VITE_SUPABASE_ANON_KEY);
  
  const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (loginError) {
    console.error('❌ Login failed:', loginError.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Password might be wrong - try resetting in Supabase Dashboard');
    console.log('   2. Email confirmation might be required');
    console.log('   3. Check Supabase Auth settings');
  } else {
    console.log('✅ Login successful!');
    console.log('\n✅ Admin user is ready!');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${profile.role}`);
    console.log('\n💡 You can now login in your app!\n');
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

