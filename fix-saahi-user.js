// Script to check if trigger exists and manually create profile/farm for saahi
// This will help debug why the automatic creation didn't happen

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
    console.error('   Required for admin operations');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('\n🔍 Checking user "saahi" in auth.users...\n');

  // Get all users and find saahi
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error(`❌ Error listing users: ${listError.message}`);
    process.exit(1);
  }

  // Find user by email or name
  const saahiUser = users?.find(u => 
    u.email?.toLowerCase().includes('saahi') || 
    u.user_metadata?.full_name?.toLowerCase().includes('saahi')
  );

  if (!saahiUser) {
    console.log('❌ User "saahi" not found in auth.users');
    console.log('\nAvailable users:');
    users?.forEach(u => {
      console.log(`   - ${u.email} (${u.user_metadata?.full_name || 'N/A'})`);
    });
    process.exit(1);
  }

  console.log(`✓ Found user:`);
  console.log(`   Email: ${saahiUser.email}`);
  console.log(`   ID: ${saahiUser.id}`);
  console.log(`   Name: ${saahiUser.user_metadata?.full_name || 'N/A'}`);
  console.log(`   Role: ${saahiUser.user_metadata?.role || 'N/A'}`);
  console.log(`   Email Confirmed: ${saahiUser.email_confirmed_at ? 'Yes' : 'No'}\n`);

  // Check if profile exists
  console.log('Checking profiles table...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', saahiUser.id)
    .maybeSingle();

  if (profileError) {
    console.error(`❌ Error checking profile: ${profileError.message}`);
    console.log(`\n⚠️  This might mean the profiles table doesn't exist yet.`);
    console.log(`   Run the migrations first!`);
    process.exit(1);
  }

  if (profile) {
    console.log(`✓ Profile exists:`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Name: ${profile.full_name}\n`);
  } else {
    console.log(`❌ Profile does NOT exist`);
    console.log(`\n🔧 Creating profile manually...\n`);

    const newProfile = {
      id: saahiUser.id,
      user_id: saahiUser.id,
      email: saahiUser.email,
      role: saahiUser.user_metadata?.role || 'farmer',
      full_name: saahiUser.user_metadata?.full_name || 'Saahi',
      phone: saahiUser.user_metadata?.phone || null,
      email_confirmed: saahiUser.email_confirmed_at ? true : false
    };

    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (createError) {
      console.error(`❌ Error creating profile: ${createError.message}`);
      if (createError.hint) console.error(`   Hint: ${createError.hint}`);
      console.log(`\n⚠️  This might mean:`);
      console.log(`   1. The profiles table doesn't exist (run migrations!)`);
      console.log(`   2. There's a constraint violation`);
      process.exit(1);
    }

    console.log(`✓ Profile created successfully!`);
    console.log(`   ID: ${createdProfile.id}`);
    console.log(`   Email: ${createdProfile.email}`);
    console.log(`   Role: ${createdProfile.role}\n`);
  }

  // Check if farm exists
  console.log('Checking farms table...');
  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .select('*')
    .eq('profile_id', saahiUser.id)
    .maybeSingle();

  if (farmError) {
    console.error(`❌ Error checking farm: ${farmError.message}`);
    process.exit(1);
  }

  if (farm) {
    console.log(`✓ Farm exists:`);
    console.log(`   Farm Type: ${farm.farm_type}`);
    console.log(`   Profile ID: ${farm.profile_id}\n`);
  } else {
    const userRole = profile?.role || saahiUser.user_metadata?.role || 'farmer';
    
    if (userRole === 'admin') {
      console.log(`ℹ️  Admin users don't have farm records (this is expected)`);
    } else {
      console.log(`❌ Farm does NOT exist`);
      console.log(`\n🔧 Creating farm manually...\n`);

      const farmData = {
        profile_id: saahiUser.id,
        farm_type: userRole,
        property_size: saahiUser.user_metadata?.property_size || 
                       saahiUser.user_metadata?.farm_size || 
                       saahiUser.user_metadata?.ranch_size || null,
        current_challenges: saahiUser.user_metadata?.current_challenges || null,
        garden_type: saahiUser.user_metadata?.garden_type || null,
        growing_zone: saahiUser.user_metadata?.growing_zone || null,
        soil_type: saahiUser.user_metadata?.soil_type || null,
        sunlight_exposure: saahiUser.user_metadata?.sunlight_exposure || null,
        crop_types: saahiUser.user_metadata?.crop_types ? 
          (Array.isArray(saahiUser.user_metadata.crop_types) 
            ? saahiUser.user_metadata.crop_types 
            : String(saahiUser.user_metadata.crop_types).split(',').map(s => s.trim())) 
          : null,
        certifications: saahiUser.user_metadata?.certifications ? 
          (Array.isArray(saahiUser.user_metadata.certifications) 
            ? saahiUser.user_metadata.certifications 
            : String(saahiUser.user_metadata.certifications).split(',').map(s => s.trim())) 
          : null,
        equipment: saahiUser.user_metadata?.equipment || null,
        farming_practices: saahiUser.user_metadata?.farming_practices || null,
        livestock_types: saahiUser.user_metadata?.livestock_types ? 
          (Array.isArray(saahiUser.user_metadata.livestock_types) 
            ? saahiUser.user_metadata.livestock_types 
            : String(saahiUser.user_metadata.livestock_types).split(',').map(s => s.trim())) 
          : null,
        herd_size: saahiUser.user_metadata?.herd_size || null,
        grazing_management: saahiUser.user_metadata?.grazing_management || null,
        water_resources: saahiUser.user_metadata?.water_resources || null
      };

      const { data: createdFarm, error: createFarmError } = await supabase
        .from('farms')
        .insert(farmData)
        .select()
        .single();

      if (createFarmError) {
        console.error(`❌ Error creating farm: ${createFarmError.message}`);
        if (createFarmError.hint) console.error(`   Hint: ${createFarmError.hint}`);
        console.log(`\n⚠️  This might mean the farms table doesn't exist (run migrations!)`);
        process.exit(1);
      }

      console.log(`✓ Farm created successfully!`);
      console.log(`   Farm Type: ${createdFarm.farm_type}`);
      console.log(`   Profile ID: ${createdFarm.profile_id}\n`);
    }
  }

  console.log('✅ Done! User "saahi" should now have profile and farm records.\n');
  console.log('💡 Why this happened:');
  console.log('   The database trigger that automatically creates profiles/farms');
  console.log('   either doesn\'t exist or failed to execute.');
  console.log('   Make sure all migrations have been run!\n');

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

