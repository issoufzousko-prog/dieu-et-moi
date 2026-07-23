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
    const { storyId, history, selectedChoice } = await req.json();

    if (!storyId) {
      return new Response(JSON.stringify({ error: "Missing required 'storyId' field in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API Keys from Deno Environment
    const hfImageApiKey = Deno.env.get("HF_IMAGE_API_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";

    // 4. Build system prompt for Llama-3.3-70B-Instruct
    const systemPrompt = `Tu es le narrateur divin d'un jeu de rôle interactif historique et biblique en français appelé "Dieu et Moi". Ton rôle est de situer l'utilisateur dans le récit et de réagir avec réalisme à ses actions.

Histoires disponibles :
1. "red-sea" (La Traversée de la Mer Rouge) : L'utilisateur est un jeune Hébreu aux côtés de Moïse, piégé devant la mer alors que les armées de Pharaon approchent.
2. "david-goliath" (David contre Goliath) : L'utilisateur est un jeune soldat d'Israël assistant au défi lancé par le géant Goliath dans la vallée des Térébinthes.
3. "noah-ark" (L'Arche de Noé) : L'utilisateur est un serviteur aidant Noé et sa famille à faire monter les animaux dans l'Arche alors que les premières gouttes du Déluge commencent à tomber.
4. "daniel-lions" (Daniel dans la fosse aux lions) : L'utilisateur est un garde royal bienveillant assistant à l'épreuve de foi de Daniel au milieu des fauves à Babylone.

Tu dois répondre STRICTEMENT sous la forme d'un objet JSON brut avec la structure suivante :
{
  "narrative": "Texte descriptif court, prenant, immersif et théologiquement fidèle (2 à 4 phrases maximum en français), décrivant les bruits, l'atmosphère, le climat et les conséquences de l'action de l'utilisateur.",
  "choices": [
    "Option de choix 1 (action directe et dynamique, max 7 mots, ex: S'approcher de Moïse)",
    "Option de choix 2...",
    "Option de choix 3..."
  ],
  "imagePrompt": "Un prompt de génération d'image très précis, visuel et cinématique (rédigé en anglais, ex: 'cinematic digital painting of Moses parting the Red Sea, high waves, dark stormy sky, volumetric lighting, photorealistic') correspondant EXACTEMENT à la situation actuelle."
}

Consignes :
1. Reste toujours fidèle à la théologie chrétienne et aux Écritures bibliques.
2. Limite le texte de narration à environ 60-80 mots pour que ce soit rapide à lire et agréable à écouter.
3. Ne mets aucun bloc de code markdown (comme \`\`\`json). Renvoie uniquement l'objet JSON brut. Renseigne toujours exactement 3 choix.`;

    // Clean history helper to replace stringified JSON content with clean narrative text
    const cleanedHistory = (history || []).map((msg: any) => {
      if (msg.role === "assistant") {
        try {
          let cleanJson = msg.content;
          if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
          }
          const parsed = JSON.parse(cleanJson);
          return { role: "assistant", content: parsed.narrative };
        } catch (e) {
          return msg;
        }
      }
      return msg;
    });

    console.log(`Appel au modele Gemma 3 pour generer le recit historique reel...`);
    const messages = [
      { role: "system", content: systemPrompt },
      ...cleanedHistory,
    ];

    // Append the new turn
    messages.push({
      role: "user",
      content: `Histoire : ${storyId}. Action choisie : ${selectedChoice || "Début de la simulation"}`
    });

    console.log(`[simulate-history] Appel HF avec rotation automatique pour le récit...`);

    let hfResult: any = null;
    try {
      const hfCallResult = await callHFWithRotation({
        model: "google/gemma-3-12b-it",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      });
      hfResult = hfCallResult.data;
      console.log(`[simulate-history] Token utilisé : ${hfCallResult.usedTokenId}`);
    } catch (rotErr: any) {
      throw new Error(`Tous les tokens HF épuisés pour simulate-history: ${rotErr.message}`);
    }

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
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error("JSON Parse failed for response:", assistantMessage);
      throw new Error(`Le modèle a renvoyé un format invalide : ${assistantMessage}`);
    }

    // Verify minimum required fields
    if (!parsed.narrative || !parsed.choices || !parsed.imagePrompt) {
      throw new Error("Champs JSON obligatoires manquants dans la réponse du modèle.");
    }

    let imgErrorDetail = "";

    // Parallel execution of Image Generation and TTS Audio Generation
    const [base64Image, base64Audio] = await Promise.all([
      // Promise 1: Image generation using Stable Diffusion 3 Medium on Hugging Face Router
      (async () => {
        const imgController = new AbortController();
        const imgTimeoutId = setTimeout(() => imgController.abort(), 40000);
        const imageUrl = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-3-medium-diffusers";
        try {
          console.log(`Generating illustration via Stable Diffusion 3 Medium...`);
          const res = await fetch(imageUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${hfImageApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: parsed.imagePrompt }),
            signal: imgController.signal,
          });

          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = "";
            const len = bytes.byteLength;
            const chunk = 8192;
            for (let i = 0; i < len; i += chunk) {
              const slice = bytes.subarray(i, i + chunk);
              binary += String.fromCharCode.apply(null, slice);
            }
            console.log("Image generated successfully via Stable Diffusion 3 Medium.");
            return btoa(binary);
          } else {
            const errTxt = await res.text();
            if (res.status === 429 || errTxt.includes("quota") || errTxt.includes("Rate limit")) {
              throw { status: 429, message: "Quota de simulation epuise pour aujourd'hui. Veuillez reessayer dans 24h." };
            }
            throw new Error(`Status ${res.status}: ${errTxt}`);
          }
        } catch (sd3Err: any) {
          if (sd3Err.status === 429) {
            throw sd3Err;
          }
          console.log(`Stable Diffusion 3 Medium failed or timed out: ${sd3Err.message}. Retrying...`);
          imgErrorDetail += `SD-3 failed: ${sd3Err.message}. `;
          
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 30000);
          try {
            const res = await fetch(imageUrl, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${hfImageApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ inputs: parsed.imagePrompt }),
              signal: retryController.signal,
            });

            if (res.ok) {
              const buffer = await res.arrayBuffer();
              const bytes = new Uint8Array(buffer);
              let binary = "";
              const len = bytes.byteLength;
              const chunk = 8192;
              for (let i = 0; i < len; i += chunk) {
                const slice = bytes.subarray(i, i + chunk);
                binary += String.fromCharCode.apply(null, slice);
              }
              console.log("Image generated successfully on retry via Stable Diffusion 3 Medium.");
              return btoa(binary);
            } else {
              const errTxt = await res.text();
              if (res.status === 429 || errTxt.includes("quota") || errTxt.includes("Rate limit")) {
                throw { status: 429, message: "Quota de simulation epuise pour aujourd'hui. Veuillez reessayer dans 24h." };
              }
              throw new Error(`Status ${res.status}: ${errTxt}`);
            }
          } catch (retryErr: any) {
            if (retryErr.status === 429) {
              throw retryErr;
            }
            console.error("Image generation retry failed:", retryErr);
            imgErrorDetail += `Retry failed: ${retryErr.message}.`;
            return null;
          } finally {
            clearTimeout(retryTimeoutId);
          }
        } finally {
          clearTimeout(imgTimeoutId);
        }
      })(),

      // Promise 2: Edge-TTS Audio Generation
      (async () => {
        const ttsText = parsed.narrative;
        console.log(`Calling Edge-TTS for narrative audio generation...`);
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
          const base64Audio = encode(new Uint8Array(arrayBuffer));
          console.log("Audio generated successfully via Edge-TTS. Base64 length:", base64Audio.length);
          return base64Audio;
        } catch (hfErr: any) {
          console.error("Error calling Edge-TTS:", hfErr);
          throw hfErr;
        }
      })()
    ]);

    const finalNarrative = parsed.narrative;

    return new Response(
      JSON.stringify({
        narrative: finalNarrative,
        choices: parsed.choices,
        image: base64Image,
        audio: base64Audio,
        imageError: imgErrorDetail || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Simulate-history edge function error:", error);
    const isQuota = error.status === 429 || (error.message && (error.message.includes("429") || error.message.includes("quota") || error.message.includes("RESOURCE_EXHAUSTED")));
    const status = isQuota ? 429 : 500;
    const msg = isQuota ? "Quota de simulation epuise pour aujourd'hui. Veuillez reessayer dans 24h." : error.message;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
