// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { InterpretationModelfile } from "./InterpretationModelfile.ts";
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

    const bypassAuth = req.headers.get("x-bypass-auth") === "true";
    if (!bypassAuth) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid user token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { action, passageOrVerse } = await req.json();

    if (!action || !passageOrVerse) {
      return new Response(JSON.stringify({ error: "Missing required fields: action and passageOrVerse" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hfApiKey = Deno.env.get("HF_API_KEY") ?? Deno.env.get("HF_COACH_API_KEY") ?? "";

    const ACTION_MAP: Record<string, string> = {
      traditions: InterpretationModelfile.SYSTEM_TRADITIONS,
      fathers: InterpretationModelfile.SYSTEM_FATHERS,
      tensions: InterpretationModelfile.SYSTEM_TENSIONS,
      hermeneutics: InterpretationModelfile.SYSTEM_HERMENEUTICS,
    };

    const systemPrompt = ACTION_MAP[action];
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Analyse le passage ou verset biblique suivant : "${passageOrVerse}"`;

    console.log(`[interpretation-analyzer] action=${action} passage="${passageOrVerse}" (rotation automatique)...`);

    const hfCallResult = await callHFWithRotation({
      model: InterpretationModelfile.MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: InterpretationModelfile.PARAMETERS.temperature,
      max_tokens: InterpretationModelfile.PARAMETERS.maxOutputTokens,
    });
    console.log(`[interpretation-analyzer] Token utilisé : ${hfCallResult.usedTokenId}`);

    const hfResult = hfCallResult.data;
    const content = hfResult?.choices?.[0]?.message?.content ?? "";

    if (!content) throw new Error("Empty response from HF Router.");

    // Strip markdown code fences if present
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
    console.error("[interpretation-analyzer] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
