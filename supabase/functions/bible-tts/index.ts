// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Space HF Edge-TTS (gratuit, illimité, voix Microsoft Neural)
const EDGE_TTS_SPACE = "https://innoai-edge-tts-text-to-speech.hf.space";
const FRENCH_VOICE   = "fr-FR-HenriNeural - fr-FR (Male)"; // Voix masculine naturelle en français

/**
 * Appelle l'API Gradio du Space Edge-TTS et retourne les bytes audio MP3.
 * Flow : POST /gradio_api/call/tts_interface => event_id
 *        GET  /gradio_api/call/tts_interface/{event_id} => SSE avec URL du fichier
 *        GET  URL du fichier => bytes MP3
 */
async function synthesize(text: string): Promise<Uint8Array> {
  // 1. Soumettre la tâche
  const submitRes = await fetch(`${EDGE_TTS_SPACE}/gradio_api/call/tts_interface`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [text, FRENCH_VOICE, 0, 0]
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Edge-TTS submit failed (${submitRes.status}): ${errText}`);
  }

  const { event_id } = await submitRes.json();
  if (!event_id) throw new Error("No event_id returned from Edge-TTS Space");

  console.log(`Edge-TTS event_id: ${event_id}`);

  // 2. Récupérer le résultat (SSE — on poll le stream)
  let audioUrl: string | null = null;
  const maxAttempts = 30;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, attempt === 0 ? 2000 : 1000));

    const resultRes = await fetch(`${EDGE_TTS_SPACE}/gradio_api/call/tts_interface/${event_id}`);
    if (!resultRes.ok) {
      console.warn(`Poll attempt ${attempt + 1}: HTTP ${resultRes.status}`);
      continue;
    }

    const sseText = await resultRes.text();
    console.log(`Poll ${attempt + 1} response (truncated):`, sseText.substring(0, 200));

    if (sseText.includes("event: complete")) {
      // Extraire l'URL depuis le JSON SSE
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
      throw new Error(`Edge-TTS Space returned error for event ${event_id}`);
    }
    // Si "event: heartbeat" ou "generating", on continue à attendre
  }

  if (!audioUrl) {
    throw new Error(`Edge-TTS: Timeout waiting for audio (event ${event_id})`);
  }

  console.log(`Downloading audio from: ${audioUrl}`);

  // 3. Télécharger le fichier MP3
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) {
    throw new Error(`Failed to download audio (${audioRes.status})`);
  }

  const arrayBuffer = await audioRes.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ error: "Missing required 'text' field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Synthesizing text (${text.length} chars) via Edge-TTS...`);

    const audioBytes = await synthesize(text.trim());
    const base64Audio = encode(audioBytes);

    console.log(`Audio ready. Base64 length: ${base64Audio.length}`);

    return new Response(JSON.stringify({ audio: base64Audio, format: "mp3" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Bible-tts error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
