import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_GEMINI_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const profileId = formData.get("profile_id") as string;
    const farmId = formData.get("farm_id") as string | null;

    if (!file || !profileId) {
      return new Response(JSON.stringify({ error: "Missing file or profile_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Only JPEG, PNG, and WebP are supported." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File size exceeds 10MB limit" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload image to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const fileBuffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("soil-test-reports")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload image to storage", details: uploadError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("soil-test-reports")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Convert image to base64
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    // Call Google Gemini Vision API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract all data from this soil test report image. Return ONLY a valid JSON object with the following structure. If a value is not present in the image, use null.

{
  "client_name": "string or null",
  "client_location": "string or null",
  "grower_name": "string or null",
  "grower_location": "string or null",
  "report_date": "YYYY-MM-DD or null",
  "date_received": "YYYY-MM-DD or null",
  "field_id": "string or null",
  "sample_id": "string or null",
  "ph_soil": number or null,
  "ph_buffer": number or null,
  "phosphorus_op": number or null,
  "phosphorus_m3": number or null,
  "potassium": number or null,
  "calcium": number or null,
  "magnesium": number or null,
  "sulfur": number or null,
  "boron": number or null,
  "copper": number or null,
  "iron": number or null,
  "manganese": number or null,
  "zinc": number or null,
  "sodium": number or null,
  "soluble_salts": number or null,
  "organic_matter": number or null,
  "estimated_n_release": number or null,
  "nitrate_nitrogen": number or null,
  "cec": number or null,
  "sat_k_percent": number or null,
  "sat_k_meq": number or null,
  "sat_ca_percent": number or null,
  "sat_ca_meq": number or null,
  "sat_mg_percent": number or null,
  "sat_mg_meq": number or null,
  "sat_h_percent": number or null,
  "sat_h_meq": number or null,
  "sat_na_percent": number or null,
  "sat_na_meq": number or null,
  "k_mg_ratio": number or null,
  "ca_mg_ratio": number or null
}

Important: Extract base saturation percentages AND milliequivalents (meq) for K, Ca, Mg, H, and Na. Extract all ratios (K/Mg, Ca/Mg). Return ONLY the JSON object, no other text.`,
                },
                {
                  inlineData: {
                    mimeType: file.type,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to transcribe image", details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const geminiData = await geminiResponse.json();

    // Extract JSON from Gemini response
    let extractedData: any = {};
    try {
      const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || responseText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1]);
      } else {
        extractedData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      return new Response(
        JSON.stringify({
          error: "Failed to parse extracted data",
          raw_response: geminiData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Return extracted data for review
    return new Response(
      JSON.stringify({
        success: true,
        image_url: imageUrl,
        extracted_data: extractedData,
        raw_gemini_response: geminiData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in transcribe-soil-test:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

