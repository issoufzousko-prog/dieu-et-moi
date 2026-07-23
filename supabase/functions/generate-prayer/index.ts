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
    // 'messages' will be an array of chat turns for live assistant, or a single prompt for prayer generator
    const { messages, systemPrompt, voiceName } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Missing or invalid 'messages' field in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API Keys from Deno Environment
    const hfModel = Deno.env.get("HF_MODEL") || "google/gemma-4-31B-it";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "AIzaSyCzTLGLObo3le64NO2NfrJPwDEehH6GNPs";
    const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-3.1-flash-tts-preview";
    const selectedVoice = voiceName || "Aoede";

    // 4. STEP 1: Generate Prayer text avec rotation automatique de tokens
    console.log(`[generate-prayer] Traitement messages pour model ${hfModel} (rotation automatique)...`);

    const chatMessages = [];
    if (systemPrompt) {
      chatMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      const role = msg.role === 'model' ? 'assistant' : msg.role;
      let textContent = "";

      if (msg.parts && Array.isArray(msg.parts)) {
        for (const part of msg.parts) {
          if (part.text) {
            textContent += part.text + "\n";
          } else if (part.inlineData && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType || "";
            if (mimeType.startsWith('audio/')) {
              console.log("Audio input detected, transcribing via Gemini...");
              try {
                const transRes = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      contents: [{
                        role: "user", parts: [
                          { inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data } },
                          { text: "Transcribe this audio exactly. Output ONLY the transcription and nothing else." }
                        ]
                      }],
                    }),
                  }
                );
                if (transRes.ok) {
                  const transData = await transRes.json();
                  const transText = transData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                  console.log("Transcription result:", transText);
                  textContent += transText + "\n";
                }
              } catch (transErr) {
                console.error("Transcription failed:", transErr);
              }
            }
          }
        }
      } else if (typeof msg.content === 'string') {
        textContent = msg.content;
      }

      chatMessages.push({ role, content: textContent.trim() });
    }

    const hfCallResult = await callHFWithRotation({
      model: hfModel,
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 1024,
    });
    console.log(`[generate-prayer] Token utilisé : ${hfCallResult.usedTokenId}`);

    if (!hfCallResult.data) {
      throw new Error("Hugging Face Router returned an empty response.");
    }

    const hfResult = hfCallResult.data;
    const generatedText = hfResult?.choices?.[0]?.message?.content || "";
    if (!generatedText) {
      throw new Error("Hugging Face Router returned an empty response content.");
    }
    console.log("LLM generated text successfully:", generatedText.substring(0, 60) + "...");

    // 5. STEP 2: Convert the generated text to Speech using Edge-TTS
    const ttsText = `Lis la prière suivante à haute voix avec ferveur, sans ajouter aucun autre mot d'introduction : "${generatedText}"`;
    let base64Audio = null;

    console.log(`Calling Edge-TTS for prayer audio generation...`);
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

    console.log("Audio generated successfully. Base64 length:", base64Audio?.length || 0);

    return new Response(
      JSON.stringify({
        text: generatedText,
        audio: base64Audio,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Generate-prayer edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
