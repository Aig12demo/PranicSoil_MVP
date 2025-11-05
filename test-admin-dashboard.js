// Test script to verify RLS policies are fixed
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
  const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  console.log('\n🧪 Testing Admin Dashboard - RLS Policies Check\n');
  console.log('='.repeat(60));

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('\n📋 Step 1: Admin Login');
  console.log('-'.repeat(60));
  const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
    email: 'rkaruturi@gmail.com',
    password: 'Test123'
  });

  if (loginError) {
    console.error('❌ Login failed:', loginError.message);
    process.exit(1);
  }
  console.log('✅ Login successful');

  console.log('\n📋 Step 2: Fetch Admin Profile');
  console.log('-'.repeat(60));
  const { data: adminProfile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', loginData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('❌ FAILED:', profileError.message);
    console.error('   Code:', profileError.code);
    
    if (profileError.code === '42P17') {
      console.log('\n⚠️  INFINITE RECURSION DETECTED');
      console.log('\n📝 ACTION REQUIRED:');
      console.log('   1. Go to: https://supabase.com/dashboard');
      console.log('   2. Select your project');
      console.log('   3. Click "SQL Editor" (left sidebar)');
      console.log('   4. Open file: fix-rls-policies.sql');
      console.log('   5. Copy ALL contents');
      console.log('   6. Paste into SQL Editor');
      console.log('   7. Click "Run" button');
      console.log('   8. Wait for success message');
      console.log('   9. Run this test again: node test-admin-dashboard.js\n');
    } else {
      console.log('\n💡 Error details:', profileError);
    }
    process.exit(1);
  }

  if (!adminProfile) {
    console.error('❌ Admin profile not found');
    process.exit(1);
  }

  console.log('✅ Profile fetched successfully');
  console.log(`   Name: ${adminProfile.full_name}`);
  console.log(`   Role: ${adminProfile.role}`);

  if (adminProfile.role !== 'admin') {
    console.error('❌ Profile role is not admin!');
    process.exit(1);
  }

  console.log('\n📋 Step 3: Fetch Customer List');
  console.log('-'.repeat(60));
  const { data: customers, error: customersError } = await supabaseClient
    .from('profiles')
    .select('*')
    .neq('role', 'admin')
    .order('created_at', { ascending: false });

  if (customersError) {
    console.error('❌ FAILED:', customersError.message);
    console.error('   Code:', customersError.code);
    process.exit(1);
  }

  console.log(`✅ Customer list fetched: ${customers?.length || 0} customers`);
  if (customers && customers.length > 0) {
    console.log('   Sample:');
    customers.slice(0, 3).forEach(c => {
      console.log(`   - ${c.full_name} (${c.role})`);
    });
  }

  console.log('\n📋 Step 4: Test Admin Access to Customer Profile');
  console.log('-'.repeat(60));
  if (customers && customers.length > 0) {
    const testCustomer = customers[0];
    const { data: customerProfile, error: customerError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', testCustomer.id)
      .maybeSingle();

    if (customerError) {
      console.error('❌ FAILED:', customerError.message);
      process.exit(1);
    }
    console.log(`✅ Can access customer: ${customerProfile.full_name}`);
  } else {
    console.log('⚠️  No customers to test (this is okay)');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS PASSED!');
  console.log('='.repeat(60));
  console.log('\n🎉 Admin dashboard is ready!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Open your app in browser');
  console.log('   2. Login as admin (rkaruturi@gmail.com / Test123)');
  console.log('   3. Click "Admin" tab');
  console.log('   4. Click on a customer name');
  console.log('   5. Test editing profile, agreements, todos, documents\n');

} catch (err) {
  console.error('❌ Test error:', err.message);
  process.exit(1);
}
