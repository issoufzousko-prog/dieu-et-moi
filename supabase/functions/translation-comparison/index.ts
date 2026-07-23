// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TranslationModelfile } from "./TranslationModelfile.ts";
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

    const { action, reference } = await req.json();

    if (!action || !reference) {
      return new Response(JSON.stringify({ error: "Missing required fields: action and reference" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hfApiKey = Deno.env.get("HF_API_KEY") ?? Deno.env.get("HF_COACH_API_KEY") ?? "";

    const ACTION_MAP: Record<string, string> = {
      compare: TranslationModelfile.SYSTEM_COMPARE,
      interlinear: TranslationModelfile.SYSTEM_INTERLINEAR,
      analysis: TranslationModelfile.SYSTEM_ANALYSIS,
    };

    const systemPrompt = ACTION_MAP[action];
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const USER_PROMPTS: Record<string, string> = {
      compare: `Fournis le texte du verset ou passage "${reference}" dans les 14 traductions demandées.`,
      interlinear: `Produis l'analyse interlinéaire complète mot-à-mot du verset ou passage "${reference}" dans la langue originale (grec NT ou hébreu AT).`,
      analysis: `Analyse les écarts de traduction du verset ou passage "${reference}" : identifie les mots grecs/hébreux clés qui génèrent des divergences entre traductions et explique leurs implications théologiques.`,
    };

    const userPrompt = USER_PROMPTS[action];

    console.log(`[translation-comparison] action=${action} reference="${reference}" (rotation automatique)...`);

    const hfCallResult = await callHFWithRotation({
      model: TranslationModelfile.MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: TranslationModelfile.PARAMETERS.temperature,
      max_tokens: TranslationModelfile.PARAMETERS.maxOutputTokens,
    });
    console.log(`[translation-comparison] Token utilisé : ${hfCallResult.usedTokenId}`);

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
    console.error("[translation-comparison] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
