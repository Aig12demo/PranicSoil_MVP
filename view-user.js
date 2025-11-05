// Script to view profiles and farms tables for a specific user
// Usage: node view-user.js [email_or_name]
// Example: node view-user.js saahi
// Example: node view-user.js saahi@example.com

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
  const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  // Use service role key if available (for admin access), otherwise use anon key
  const supabase = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : createClient(supabaseUrl, supabaseAnonKey);

  const searchTerm = process.argv[2];

  async function viewAllProfiles() {
    console.log('\n📋 All Profiles:\n');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.hint) console.error(`   Hint: ${error.hint}`);
      return;
    }

    if (!data || data.length === 0) {
      console.log('   No profiles found');
      return;
    }

    console.log(`   Found ${data.length} profile(s):\n`);
    data.forEach((profile, idx) => {
      console.log(`   ${idx + 1}. ${profile.full_name} (${profile.email})`);
      console.log(`      Role: ${profile.role}`);
      console.log(`      ID: ${profile.id}`);
      console.log(`      Created: ${profile.created_at || 'N/A'}\n`);
    });
  }

  async function viewUserProfile(emailOrName) {
    console.log(`\n🔍 Searching for user: "${emailOrName}"\n`);

    // Try to find by email first, then by name
    let { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.%${emailOrName}%,full_name.ilike.%${emailOrName}%`)
      .limit(10);

    if (profileError) {
      console.error(`❌ Error searching profiles: ${profileError.message}`);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log(`   No profile found matching "${emailOrName}"`);
      console.log('\n💡 Tip: Try searching by email or full name');
      return;
    }

    for (const profile of profiles) {
      console.log('═'.repeat(60));
      console.log(`\n👤 PROFILE:`);
      console.log('─'.repeat(60));
      console.log(`   ID:          ${profile.id}`);
      console.log(`   User ID:     ${profile.user_id || 'N/A'}`);
      console.log(`   Email:       ${profile.email}`);
      console.log(`   Full Name:   ${profile.full_name}`);
      console.log(`   Role:        ${profile.role}`);
      console.log(`   Phone:       ${profile.phone || 'N/A'}`);
      console.log(`   Email Confirmed: ${profile.email_confirmed ? 'Yes' : 'No'}`);
      console.log(`   Notifications:  ${profile.notifications_enabled !== false ? 'Enabled' : 'Disabled'}`);
      console.log(`   Created:     ${profile.created_at || 'N/A'}`);
      console.log(`   Updated:     ${profile.updated_at || 'N/A'}`);

      // Get farm data for this profile
      console.log('\n🏡 FARM:');
      console.log('─'.repeat(60));
      
      const { data: farm, error: farmError } = await supabase
        .from('farms')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (farmError) {
        console.log(`   ⚠️  Error fetching farm: ${farmError.message}`);
      } else if (!farm) {
        console.log(`   No farm record found for this profile`);
        if (profile.role === 'admin') {
          console.log(`   (Admin users don't have farm records)`);
        }
      } else {
        console.log(`   Farm Type:        ${farm.farm_type || 'N/A'}`);
        console.log(`   Property Size:    ${farm.property_size || 'N/A'}`);
        console.log(`   Current Challenges: ${farm.current_challenges || 'N/A'}`);
        
        if (farm.farm_type === 'gardener') {
          console.log(`   Garden Type:      ${farm.garden_type || 'N/A'}`);
          console.log(`   Growing Zone:     ${farm.growing_zone || 'N/A'}`);
          console.log(`   Soil Type:        ${farm.soil_type || 'N/A'}`);
          console.log(`   Sunlight:         ${farm.sunlight_exposure || 'N/A'}`);
        }
        
        if (farm.farm_type === 'farmer') {
          console.log(`   Crop Types:       ${Array.isArray(farm.crop_types) ? farm.crop_types.join(', ') : farm.crop_types || 'N/A'}`);
          console.log(`   Certifications:   ${Array.isArray(farm.certifications) ? farm.certifications.join(', ') : farm.certifications || 'N/A'}`);
          console.log(`   Equipment:        ${farm.equipment || 'N/A'}`);
          console.log(`   Farming Practices: ${farm.farming_practices || 'N/A'}`);
        }
        
        if (farm.farm_type === 'rancher') {
          console.log(`   Livestock Types:  ${Array.isArray(farm.livestock_types) ? farm.livestock_types.join(', ') : farm.livestock_types || 'N/A'}`);
          console.log(`   Herd Size:        ${farm.herd_size || 'N/A'}`);
          console.log(`   Grazing Mgmt:     ${farm.grazing_management || 'N/A'}`);
          console.log(`   Water Resources:  ${farm.water_resources || 'N/A'}`);
        }
        
        console.log(`   Created:          ${farm.created_at || 'N/A'}`);
        console.log(`   Updated:          ${farm.updated_at || 'N/A'}`);
      }

      console.log('\n');
    }
  }

  if (searchTerm) {
    await viewUserProfile(searchTerm);
  } else {
    await viewAllProfiles();
    console.log('\n💡 Usage: node view-user.js <email_or_name>');
    console.log('   Example: node view-user.js saahi');
    console.log('   Example: node view-user.js saahi@example.com\n');
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

