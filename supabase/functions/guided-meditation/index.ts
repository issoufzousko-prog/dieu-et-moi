// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    // 3. Extract request body params
    const { answers } = await req.json();

    if (!answers || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: "Missing or invalid 'answers' field in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API Keys from Deno Environment
    const hfModel = Deno.env.get("GLM_MODEL") || "zai-org/GLM-5.2";

    // 4. Build prompt for GLM-5.2 to analyze the responses and return a structured meditation
    const userAnswersText = answers.map((a: any, i: number) => `Question ${i + 1}: ${a.question}\nRéponse: ${a.answer}`).join("\n\n");

    const systemPrompt = `Tu es Dieu et Moi, un compagnon spirituel chrétien. Ton rôle est d'analyser les préoccupations et réponses profondes de l'utilisateur, puis de lui proposer une étude et méditation biblique sur mesure.
Tu dois absolument répondre sous la forme d'un objet JSON strict avec la structure suivante :
{
  "book": "Nom exact du livre de la Bible en français (ex: Jean, Psaumes, Romains, Matthieu)",
  "chapter": numéro du chapitre (entier),
  "keyVerses": [liste des numéros des versets clés à surligner, ex: [1, 3, 4]],
  "meditation": "Un texte de méditation chaleureux, profond et réconfortant (en français) adressé directement à l'utilisateur pour lui expliquer comment ce chapitre et ces versets clés répondent à ses préoccupations intérieures."
}

Consignes strictes :
1. Choisis un chapitre de la Bible pertinent par rapport aux soucis ou émotions formulés par l'utilisateur.
2. Identifie entre 1 et 5 versets clés particulièrement percutants dans ce chapitre.
3. Rédige une méditation spirituelle de grande qualité, bienveillante, encourageante et christocentrée.
4. Reste STRICTEMENT dans le format JSON demandé. Ne mets aucune phrase d'introduction ni de conclusion en dehors du JSON. Ne mets pas de bloc de code markdown du type \`\`\`json. Renvoie uniquement l'objet JSON brut.`;

    console.log(`[guided-meditation] Appel HF Router avec rotation automatique...`);

    const hfCallResult = await callHFWithRotation({
      model: hfModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Voici les réponses de l'utilisateur sur son état intérieur actuel :\n\n${userAnswersText}` },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });
    console.log(`[guided-meditation] Token utilisé : ${hfCallResult.usedTokenId}`);

    const hfResult = hfCallResult.data;
    const replyContent = hfResult?.choices?.[0]?.message?.content || "";

    if (!replyContent) {
      throw new Error("GLM-5.2 Router returned an empty response.");
    }

    console.log("GLM-5.2 Response Content received:", replyContent.substring(0, 100) + "...");

    // Clean up response if the model returned it wrapped in markdown block
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
      throw new Error(`Failed to parse GLM-5.2 response as JSON: ${parseError.message}`);
    }

    // Verify minimum required fields
    if (!parsedResult.book || !parsedResult.chapter || !parsedResult.meditation) {
      throw new Error("Invalid response format: Missing required JSON fields (book, chapter, meditation).");
    }

    // 5. Generate TTS voice using Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice with fallback to gemini-3.1-flash-tts-preview
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "AIzaSyDOc5QzQjHX5M0Ora08jsAZVTprn58PE5s";
    const userName = user?.user_metadata?.given_name || user?.user_metadata?.name || user?.user_metadata?.full_name || '';

    // Construct speech text including user's name and meditation guidelines
    const ttsText = `${userName ? `${userName}, ` : ""}je t'invite à méditer sur le passage de ${parsedResult.book} au chapitre ${parsedResult.chapter}. Écoute ce que mon Esprit dit à ton cœur : ${parsedResult.meditation}`;

    let base64Audio = null;

    console.log(`Calling Edge-TTS for guided meditation audio generation...`);
    try {
      const EDGE_TTS_SPACE = "https://innoai-edge-tts-text-to-speech.hf.space";
      const FRENCH_VOICE   = "fr-FR-HenriNeural - fr-FR (Male)";

      // 1. Submit task
      const submitRes = await fetch(`${EDGE_TTS_SPACE}/gradio_api/call/tts_interface`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [ttsText, FRENCH_VOICE, 0, 0] }),
      });

      if (!submitRes.ok) {
        const errText = await submitRes.text();
        throw new Error(`Edge-TTS submit failed (${submitRes.status}): ${errText}`);
      }

      const { event_id } = await submitRes.json();
      if (!event_id) throw new Error("No event_id returned from Edge-TTS Space");

      // 2. Poll for completion
      let audioUrl: string | null = null;
      const maxAttempts = 30;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(r => setTimeout(r, attempt === 0 ? 2000 : 1000));

        const resultRes = await fetch(`${EDGE_TTS_SPACE}/gradio_api/call/tts_interface/${event_id}`);
        if (!resultRes.ok) continue;

        const sseText = await resultRes.text();
        if (sseText.includes("event: complete")) {
          const dataMatch = sseText.match(/^data:\s*(\[.*\])\s*$/m);
          if (dataMatch) {
            const parsed = JSON.parse(dataMatch[1]);
            const fileData = parsed[0];
            if (fileData && fileData.url) {
              audioUrl = fileData.url;
              break;
            }
          }
        } else if (sseText.includes("event: error")) {
          throw new Error("Edge-TTS Space returned error");
        }
      }

      if (!audioUrl) {
        throw new Error("Timeout waiting for Edge-TTS audio");
      }

      // 3. Download
      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) {
        throw new Error(`Failed to download audio: ${audioRes.status}`);
      }

      const arrayBuffer = await audioRes.arrayBuffer();
      const { encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
      base64Audio = encode(new Uint8Array(arrayBuffer));
      console.log("Audio generated successfully via Edge-TTS. Base64 length:", base64Audio.length);
    } catch (hfErr: any) {
      console.error("Error during Edge-TTS generation:", hfErr);
      throw hfErr;
    }

    return new Response(
      JSON.stringify({
        ...parsedResult,
        audio: base64Audio,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Guided-meditation edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
