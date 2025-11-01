import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Checking for existing admin user in auth...');
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    
    const adminEmail = 'rskaruturi@gmail.com';
    let adminAuthUser = existingUsers?.users?.find(u => u.email === adminEmail);

    if (adminAuthUser) {
      console.log('Admin auth user exists, checking profile link...');

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', adminEmail)
        .maybeSingle();

      if (profile && profile.user_id !== adminAuthUser.id) {
        console.log('Linking existing profile to auth user...');
        await supabaseAdmin
          .from('profiles')
          .update({ user_id: adminAuthUser.id, role: 'admin', email_confirmed: true })
          .eq('email', adminEmail);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Admin user exists and is linked. You can now login with ${adminEmail}`,
          userId: adminAuthUser.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Creating new admin auth user...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: 'Test123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Ravi Karuturi',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    console.log('Admin auth user created:', authData.user.id);

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', adminEmail)
      .maybeSingle();

    if (existingProfile) {
      console.log('Linking existing profile to new auth user...');
      await supabaseAdmin
        .from('profiles')
        .update({
          user_id: authData.user.id,
          role: 'admin',
          full_name: 'Ravi Karuturi',
          email_confirmed: true
        })
        .eq('email', adminEmail);
    } else {
      console.log('Creating new profile...');
      await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          user_id: authData.user.id,
          email: adminEmail,
          role: 'admin',
          full_name: 'Ravi Karuturi',
          email_confirmed: true
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Admin user created successfully. You can now login with ${adminEmail} and password Test123`,
        userId: authData.user.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating admin user:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});