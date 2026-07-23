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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Client avec rôle de service pour gérer de façon sécurisée le rate limiting
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

    // 3. Extraction du payload de la requête
    const { period, visits, verseText, verseRef } = await req.json();

    if (!period || !verseText) {
      return new Response(JSON.stringify({ error: "Missing required fields (period, verseText)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Rate Limiting robuste (5 appels max par jour par utilisateur)
    const today = new Date().toISOString().split("T")[0];

    // Récupérer le compteur actuel
    const { data: callData } = await supabaseAdmin
      .from("user_ai_calls")
      .select("call_count")
      .eq("user_id", user.id)
      .eq("call_date", today)
      .maybeSingle();

    const currentCalls = callData?.call_count ?? 0;

    if (currentCalls >= 5) {
      return new Response(
        JSON.stringify({ error: "Limite quotidienne de bénédictions IA atteinte (5 par jour)." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Incrémenter ou créer l'enregistrement de l'appel
    await supabaseAdmin
      .from("user_ai_calls")
      .upsert(
        { user_id: user.id, call_date: today, call_count: currentCalls + 1 },
        { onConflict: "user_id,call_date" }
      );

    // 5. Appel sécurisé à Hugging Face avec rotation automatique
    const hfModel = Deno.env.get("HF_MODEL") || "google/gemma-3-4b-it";

    const hfCallResult = await callHFWithRotation({
      model: hfModel,
      messages: [
        {
          role: "system",
          content: "Tu es l'assistant spirituel de l'application chrétienne \"Dieu et Moi\". Génère une bénédiction ou parole spirituelle chrétienne unique, courte et inspirante (maximum 8 à 10 mots) pour l'utilisateur, qui s'affichera comme grand titre d'accueil.\nLe ton doit être fraternel, poétique, profond, adapté à la période de la journée, au nombre de visites, et SURTOUT directement inspiré par la thématique ou le message du verset du jour.\nNe mentionne JAMAIS le nom de l'utilisateur.\nNe retourne AUCUNE introduction, remarque, explication ou guillemet. Retourne uniquement la bénédiction brute."
        },
        {
          role: "user",
          content: `Période : ${period}\nNombre de visites aujourd'hui : ${visits}\n\nVerset du jour : "${verseText}" (${verseRef})`
        }
      ],
      temperature: 0.7,
      max_tokens: 30,
    });
    console.log(`[ai-proxy] Token utilisé : ${hfCallResult.usedTokenId}`);

    const resultData = hfCallResult.data;
    let aiTitle = resultData?.choices?.[0]?.message?.content?.trim() || "";

    if (aiTitle) {
      aiTitle = aiTitle.replace(/^["'«\s]+|["'»\s]+$/g, "").trim();
    }

    return new Response(JSON.stringify({ heroTitle: aiTitle }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
