// Script to create admin user in Supabase
// Usage: node create-admin.js

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
  const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables in .env file');
    console.error('   Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  if (!supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    console.error('\n   To get your service role key:');
    console.error('   1. Go to https://supabase.com/dashboard');
    console.error('   2. Select your project');
    console.error('   3. Go to Settings → API');
    console.error('   4. Copy the "service_role" key (keep it secret!)');
    console.error('   5. Add it to your .env file as: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    console.error('\n   Or pass it as an environment variable:');
    console.error('   $env:SUPABASE_SERVICE_ROLE_KEY="your_key"; node create-admin.js');
    process.exit(1);
  }

  // Admin user details
  const adminEmail = 'rkaruturi@gmail.com';
  const adminPassword = 'Test123';
  const adminName = 'Ravi Karuturi';

  console.log(`\n🔧 Creating admin user...`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Name: ${adminName}\n`);

  // Create Supabase client with service role key (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Check if admin user already exists
  console.log('Checking for existing admin user...');
  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing users:', listError.message);
    process.exit(1);
  }

  let adminAuthUser = existingUsers?.users?.find(u => u.email === adminEmail);

  if (adminAuthUser) {
    console.log(`✓ Admin auth user already exists (ID: ${adminAuthUser.id})`);
    
    // Check and update profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', adminEmail)
      .maybeSingle();

    if (profile) {
      if (profile.role !== 'admin' || profile.user_id !== adminAuthUser.id) {
        console.log('Updating profile to admin role...');
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            user_id: adminAuthUser.id,
            role: 'admin',
            full_name: adminName,
            email_confirmed: true
          })
          .eq('email', adminEmail);

        if (updateError) {
          console.error('❌ Error updating profile:', updateError.message);
          process.exit(1);
        }
        console.log('✓ Profile updated to admin role');
      } else {
        console.log('✓ Profile already set as admin');
      }
    } else {
      console.log('Creating admin profile...');
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: adminAuthUser.id,
          user_id: adminAuthUser.id,
          email: adminEmail,
          role: 'admin',
          full_name: adminName,
          email_confirmed: true
        });

      if (insertError) {
        console.error('❌ Error creating profile:', insertError.message);
        process.exit(1);
      }
      console.log('✓ Admin profile created');
    }

    // Update password if needed
    console.log('\nUpdating password...');
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      adminAuthUser.id,
      { password: adminPassword }
    );

    if (passwordError) {
      console.error('⚠️  Warning: Could not update password:', passwordError.message);
      console.log('   Password may already be set correctly');
    } else {
      console.log('✓ Password updated');
    }

    console.log(`\n✅ Admin user is ready!`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   User ID: ${adminAuthUser.id}\n`);

  } else {
    // Create new admin user
    console.log('Creating new admin auth user...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError.message);
      process.exit(1);
    }

    console.log(`✓ Admin auth user created (ID: ${authData.user.id})`);

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', adminEmail)
      .maybeSingle();

    if (existingProfile) {
      console.log('Linking existing profile to new auth user...');
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          user_id: authData.user.id,
          role: 'admin',
          full_name: adminName,
          email_confirmed: true
        })
        .eq('email', adminEmail);

      if (updateError) {
        console.error('❌ Error updating profile:', updateError.message);
        process.exit(1);
      }
      console.log('✓ Profile linked and updated to admin role');
    } else {
      console.log('Creating admin profile...');
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          user_id: authData.user.id,
          email: adminEmail,
          role: 'admin',
          full_name: adminName,
          email_confirmed: true
        });

      if (insertError) {
        console.error('❌ Error creating profile:', insertError.message);
        process.exit(1);
      }
      console.log('✓ Admin profile created');
    }

    console.log(`\n✅ Admin user created successfully!`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`\n   You can now login with these credentials.\n`);
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error('\nMake sure you have a .env file with:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - VITE_SUPABASE_ANON_KEY');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (required for admin creation)');
  process.exit(1);
}

