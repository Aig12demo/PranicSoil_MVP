import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID") || "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userProfile: any = null;
    let contextType = "public";

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
        contextType = "authenticated";

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (profile) {
          userProfile = profile;

          if (profile.role === "gardener") {
            const { data: roleProfile } = await supabase
              .from("gardener_profiles")
              .select("*")
              .eq("profile_id", profile.id)
              .maybeSingle();
            userProfile.roleDetails = roleProfile;
          } else if (profile.role === "farmer") {
            const { data: roleProfile } = await supabase
              .from("farmer_profiles")
              .select("*")
              .eq("profile_id", profile.id)
              .maybeSingle();
            userProfile.roleDetails = roleProfile;
          } else if (profile.role === "rancher") {
            const { data: roleProfile } = await supabase
              .from("rancher_profiles")
              .select("*")
              .eq("profile_id", profile.id)
              .maybeSingle();
            userProfile.roleDetails = roleProfile;
          }
        }
      }
    }

    const { action } = await req.json();

    if (action === "get-signed-url") {
      const sessionId = crypto.randomUUID();

      let conversationContext = "";
      if (contextType === "public") {
        conversationContext = `You are a friendly agricultural consultant for Pranic Soil. Introduce our services to help gardeners, farmers, and ranchers improve soil health and grow thriving microbiomes. Encourage visitors to sign up based on their role: gardener (home gardens, urban farming), farmer (commercial crop production), or rancher (livestock and grazing management). Be welcoming, informative, and helpful. Keep responses concise and conversational.`;
      } else if (userProfile) {
        const roleDetails = userProfile.roleDetails || {};
        conversationContext = `You are an AI agricultural advisor for Pranic Soil, speaking with ${userProfile.full_name}, a ${userProfile.role}. `;
        
        if (userProfile.role === "gardener") {
          conversationContext += `Garden details: ${roleDetails.property_size || "N/A"} property, ${roleDetails.garden_type || "N/A"} garden type, zone ${roleDetails.growing_zone || "N/A"}, ${roleDetails.soil_type || "N/A"} soil. Current challenges: ${roleDetails.current_challenges || "None mentioned"}. `;
        } else if (userProfile.role === "farmer") {
          conversationContext += `Farm details: ${roleDetails.farm_size || "N/A"} farm, growing ${roleDetails.crop_types?.join(", ") || "various crops"}, ${roleDetails.farming_practices || "N/A"} practices. Current challenges: ${roleDetails.current_challenges || "None mentioned"}. `;
        } else if (userProfile.role === "rancher") {
          conversationContext += `Ranch details: ${roleDetails.ranch_size || "N/A"} ranch, ${roleDetails.livestock_types?.join(", ") || "livestock"}, herd size: ${roleDetails.herd_size || "N/A"}, ${roleDetails.grazing_management || "N/A"} grazing management. Current challenges: ${roleDetails.current_challenges || "None mentioned"}. `;
        }
        
        conversationContext += `Provide personalized advice based on their specific situation. Be helpful, knowledgeable, and supportive. Keep responses concise and actionable.`;
      }

      const elevenLabsResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY!,
          },
        }
      );

      if (!elevenLabsResponse.ok) {
        const errorText = await elevenLabsResponse.text();
        throw new Error(`ElevenLabs API error: ${errorText}`);
      }

      const { signed_url } = await elevenLabsResponse.json();

      if (userId && userProfile) {
        await supabase.from("voice_conversations").insert({
          profile_id: userProfile.id,
          session_id: sessionId,
          context_type: contextType,
          user_role: userProfile.role,
          metadata: {
            conversation_context: conversationContext,
          },
        });
      }

      return new Response(
        JSON.stringify({
          signed_url,
          session_id: sessionId,
          context_type: contextType,
          conversation_context: conversationContext,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action === "end-conversation") {
      const { session_id, duration_seconds } = await req.json();

      if (session_id) {
        await supabase
          .from("voice_conversations")
          .update({
            ended_at: new Date().toISOString(),
            duration_seconds,
          })
          .eq("session_id", session_id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in elevenlabs-agent function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});