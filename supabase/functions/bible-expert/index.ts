// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callHFWithRotation } from "../_shared/hfRotator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Gestion du CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Initialisation des clients Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Authentification de l'utilisateur avec son JWT
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

    // 3. Extraction du payload (historique des messages)
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Missing or invalid 'messages' field in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Récupération du modèle — clé gérée par le rotateur de tokens
    const modelName = Deno.env.get("BIBLE_EXPERT_MODEL") || "meta-llama/Llama-3.3-70B-Instruct";

    // 5. Injection du prompt système
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    const firstName = user.user_metadata?.first_name || user.user_metadata?.given_name || "";
    const nameToUse = firstName || fullName;
    const userContext = nameToUse
      ? ` L'utilisateur s'appelle ${nameToUse}. Salue-le/la chaleureusement par son prénom lors de sa première interaction ou de temps à autre de manière fraternelle.`
      : "";

    const systemPrompt = {
      role: "system",
      content: `Tu es un expert théologique et biblique chrétien baptiste bienveillant, sage et très érudit. Ton rôle est d'aider l'utilisateur à comprendre les Écritures, à approfondir sa foi, et à répondre à ses questions théologiques de manière claire, respectueuse et théologiquement rigoureuse. Cite toujours des chapitres et des versets précis de la Bible (version Louis Segond si possible) à l'appui de tes explications. Reste toujours fraternel, humble et spirituellement encourageant dans tes réponses.${userContext}`
    };

    const fullMessages = [
      systemPrompt,
      ...messages.filter(m => m.role !== 'system')
    ];

    // 6. Appel à Hugging Face avec rotation automatique
    console.log(`[bible-expert] Appel HF model ${modelName} (rotation automatique)...`);

    const hfCallResult = await callHFWithRotation({
      model: modelName,
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 800,
    });
    console.log(`[bible-expert] Token utilisé : ${hfCallResult.usedTokenId}`);

    const resultData = hfCallResult.data;
    const reply = resultData?.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in bible-expert function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
