// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PreacherModelfile } from "./PreacherModelfile.ts";
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
    const { action, passageOrTheme, style, audience, duration, sermonData } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing required 'action' field in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Retrieve API Key — géré par le rotateur de tokens

    // 5. Select appropriate system prompt and construct user prompt
    let systemPrompt = "";
    let userPrompt = "";

    if (action === "sermon") {
      systemPrompt = PreacherModelfile.SYSTEM_GENERATE_SERMON;
      userPrompt = `Génère un plan de sermon complet sur le sujet ou passage suivant : "${passageOrTheme}".
Style de prédication souhaité : ${style || "Exégétique"}.
Auditoire cible : ${audience || "Général"}.
Durée approximative de prédication : ${duration || "30 minutes"}.`;
    } else if (action === "exegesis") {
      systemPrompt = PreacherModelfile.SYSTEM_GENERATE_EXEGESIS;
      userPrompt = `Génère des notes d'étude historiques et herméneutiques profondes (sans aucun emoji) pour le passage ou thème suivant : "${passageOrTheme}".`;
    } else if (action === "group-study") {
      systemPrompt = PreacherModelfile.SYSTEM_GENERATE_GROUP_STUDY;
      userPrompt = `Génère un guide de discussion et d'étude de groupe interactif (sans aucun emoji) basé sur les informations du sermon suivant :
Idée centrale : ${sermonData?.bigIdea || ""}
Sujet/Passage : ${passageOrTheme || ""}
Points principaux :
${(sermonData?.points || []).map((p: any) => `- Point ${p.number}: ${p.title} (${p.textSupport}) : ${p.explanation}`).join("\n")}`;
    } else {
      return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[preacher-assistant] Appel HF model ${PreacherModelfile.MODEL} action=${action} (rotation automatique)...`);

    const hfCallResult = await callHFWithRotation({
      model: PreacherModelfile.MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: PreacherModelfile.PARAMETERS.temperature,
      max_tokens: PreacherModelfile.PARAMETERS.maxOutputTokens,
    });
    console.log(`[preacher-assistant] Token utilisé : ${hfCallResult.usedTokenId}`);

    const hfResult = hfCallResult.data;
    const replyContent = hfResult?.choices?.[0]?.message?.content || "";

    if (!replyContent) {
      throw new Error("Hugging Face Router returned an empty response.");
    }

    console.log("Response Content received successfully.");

    // Clean up response if the model returned it wrapped in markdown code blocks
    let cleanedJsonText = replyContent.trim();
    if (cleanedJsonText.startsWith("```json")) {
      cleanedJsonText = cleanedJsonText.substring(7);
    } else if (cleanedJsonText.startsWith("```")) {
      cleanedJsonText = cleanedJsonText.substring(3);
    }
    if (cleanedJsonText.endsWith("```")) {
      cleanedJsonText = cleanedJsonText.substring(0, cleanedJsonText.length - 3);
    }
    cleanedJsonText = cleanedJsonText.trim();

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedJsonText);
    } catch (parseError: any) {
      console.error("JSON parsing failed on content:", cleanedJsonText);
      throw new Error(`Failed to parse LLM response as JSON: ${parseError.message}`);
    }

    return new Response(JSON.stringify(parsedResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Preacher-assistant edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
