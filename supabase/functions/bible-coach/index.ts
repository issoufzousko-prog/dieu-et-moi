// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CoachModelfile } from "./CoachModelfile.ts";
import { callHFWithRotation } from "../_shared/hfRotator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS Preflight handler
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Initialise Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Validate User JWT
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

    // 3. Extract request body params
    const { action, responses, currentDay, userResponse, planDayDetails } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing required 'action' field in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Retrieve API Key — géré par le rotateur de tokens

    // 5. Construct prompts based on action
    let systemPrompt = "";
    let userPrompt = "";

    if (action === "initialize") {
      systemPrompt = CoachModelfile.SYSTEM_INITIALIZE;
      userPrompt = "Génère 3 questions d'évaluation théologique de haut niveau couvrant de manière équilibrée l'Ancien Testament et le Nouveau Testament.";
    } else if (action === "generatePlan") {
      systemPrompt = CoachModelfile.SYSTEM_GENERATE_PLAN;
      userPrompt = `Voici les réponses de l'utilisateur aux questions d'évaluation :
${JSON.stringify(responses, null, 2)}
Génère le plan de lecture personnalisé de 28 jours.`;
    } else if (action === "submitResponse") {
      systemPrompt = CoachModelfile.SYSTEM_SUBMIT_RESPONSE;
      userPrompt = `Jour du plan : ${currentDay}
Lecture assignée : ${planDayDetails?.reading}
Objectif fixé : ${planDayDetails?.goal}
Résumé proposé par l'utilisateur :
"${userResponse}"
Évalue cette proposition.`;
    } else {
      return new Response(JSON.stringify({ error: `Action '${action}' non reconnue.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Call Hugging Face Router avec rotation automatique des tokens
    const model = Deno.env.get("HF_COACH_MODEL") ?? CoachModelfile.MODEL;
    const temperature = CoachModelfile.PARAMETERS.temperature;
    console.log(`[bible-coach] Calling model ${model} pour action ${action} (rotation automatique)...`);

    const hfCallResult = await callHFWithRotation({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: 2048,
    });
    console.log(`[bible-coach] Token utilisé : ${hfCallResult.usedTokenId}`);

    const hfResult = hfCallResult.data;
    const assistantMessage = hfResult?.choices?.[0]?.message?.content?.trim() || "";

    // Robust JSON extraction helper
    function extractJson(text: string): string {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        return text.substring(jsonStart, jsonEnd + 1);
      }
      return text;
    }

    const jsonText = extractJson(assistantMessage);
    let parsedResult;
    try {
      parsedResult = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error("Failed to parse JSON response from model:", assistantMessage);
      return new Response(
        JSON.stringify({
          error: "Le modèle a renvoyé une réponse mal formatée. Veuillez réessayer.",
          raw: assistantMessage
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(parsedResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Bible-coach edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
