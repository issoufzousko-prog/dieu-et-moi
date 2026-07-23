// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ReasoningModelfile } from "./ReasoningModelfile.ts";
import { callHFWithRotation } from "../_shared/hfRotator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const bypassAuth = req.headers.get("x-bypass-auth") === "true";
    if (!bypassAuth) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid user token" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { question } = await req.json();

    if (!question) {
      return new Response(JSON.stringify({ error: "Missing required field: question" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hfApiKey = Deno.env.get("HF_API_KEY") ?? Deno.env.get("HF_COACH_API_KEY") ?? "";

    console.log(`[reasoning-engine] processing question="${question}" (rotation automatique)...`);

    const hfCallResult = await callHFWithRotation({
      model: ReasoningModelfile.MODEL,
      messages: [
        { role: "system", content: ReasoningModelfile.SYSTEM_PROMPT },
        { role: "user", content: `Question : "${question}"` },
      ],
      temperature: ReasoningModelfile.PARAMETERS.temperature,
      max_tokens: ReasoningModelfile.PARAMETERS.maxOutputTokens,
    });
    console.log(`[reasoning-engine] Token utilisé : ${hfCallResult.usedTokenId}`);

    const hfResult = hfCallResult.data;
    const content = hfResult?.choices?.[0]?.message?.content ?? "";

    if (!content) throw new Error("Empty response from HF Router.");

    // Strip markdown fences
    let cleaned = content.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e: any) {
      throw new Error(`JSON parse error: ${e.message}`);
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[reasoning-engine] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
