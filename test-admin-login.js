// Script to test admin login
// This will verify if the admin credentials work

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
  const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const adminEmail = 'rkaruturi@gmail.com';
  const adminPassword = 'Test123';

  console.log('\n🔐 Testing admin login...\n');
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}\n`);

  // Attempt login
  const { data, error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (error) {
    console.error('❌ Login failed!');
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('email')) {
      console.log('\n💡 Possible solutions:');
      console.log('   1. Email might need to be confirmed');
      console.log('   2. Check if email is correct: rkaruturi@gmail.com');
      console.log('   3. Try resetting password in Supabase Dashboard');
    } else if (error.message.includes('password') || error.message.includes('Invalid')) {
      console.log('\n💡 Possible solutions:');
      console.log('   1. Password might be wrong');
      console.log('   2. Run: node create-admin.js (to reset password to Test123)');
      console.log('   3. Try resetting password in Supabase Dashboard');
    } else if (error.message.includes('confirm')) {
      console.log('\n💡 Email confirmation required!');
      console.log('   Options:');
      console.log('   1. Check your email for confirmation link');
      console.log('   2. Disable email confirmation in Supabase Dashboard');
      console.log('     (Settings → Authentication → Email Auth → Confirm email: OFF)');
    }
    
    process.exit(1);
  }

  if (data.user) {
    console.log('✅ Login successful!');
    console.log(`\nUser ID: ${data.user.id}`);
    console.log(`Email: ${data.user.email}`);
    console.log(`Email Confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
    
    // Check profile
    console.log('\n📋 Checking profile access...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError.message);
      console.error('   Code:', profileError.code);
      
      if (profileError.code === '42P17') {
        console.log('\n⚠️  INFINITE RECURSION DETECTED in RLS policies!');
        console.log('\n📝 ACTION REQUIRED:');
        console.log('   1. Go to: https://supabase.com/dashboard');
        console.log('   2. Select your project');
        console.log('   3. Click "SQL Editor" (left sidebar)');
        console.log('   4. Open file: fix-rls-policies.sql');
        console.log('   5. Copy ALL contents');
        console.log('   6. Paste into SQL Editor');
        console.log('   7. Click "Run" button');
        console.log('   8. Wait for success message');
        console.log('   9. Run this test again: node test-admin-login.js\n');
      } else {
        console.log('\n💡 RLS policies may need to be fixed.');
        console.log('   Run fix-rls-policies.sql in Supabase Dashboard\n');
      }
    } else if (profile) {
      console.log(`✅ Profile found:`);
      console.log(`   Role: ${profile.role}`);
      console.log(`   Name: ${profile.full_name}`);
      console.log(`   Email Confirmed (profile): ${profile.email_confirmed ? 'Yes' : 'No'}`);
      
      if (profile.role === 'admin') {
        console.log('\n🎉 Admin access confirmed!');
        console.log('✅ Ready to use admin dashboard!');
      } else {
        console.log('\n⚠️  Warning: Profile role is not "admin"');
        console.log('   Run: node create-admin.js to fix this');
      }
    } else {
      console.log('\n⚠️  Warning: No profile found');
      console.log('   The profile might exist but RLS is blocking access.');
      console.log('   OR run: node create-admin.js to create profile');
    }

    console.log('\n✅ You should be able to login with these credentials in your app!\n');
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

