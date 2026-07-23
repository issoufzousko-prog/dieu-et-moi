/**
 * Service de Synthèse Vocale Multi-Voix Hugging Face Spaces & Inference API
 * Permet à chaque personnage d'exprimer des émotions distinctes (Colère, Solennité, Supplication, Joie)
 * en modulant la vitesse (rate) et la hauteur (pitch) sur les voix d'Hugging Face Spaces & Inference API.
 */

const HF_API_KEY = process.env.EXPO_PUBLIC_HF_API_KEY || '';
const HF_MMS_TTS_URL = "https://api-inference.huggingface.co/models/facebook/mms-tts-fra";
const EDGE_TTS_SPACE = "https://innoai-edge-tts-text-to-speech.hf.space";

export interface VoiceEmotionOptions {
  speaker?: string;
  role?: 'narrator' | 'god' | 'character';
  gender?: 'female' | 'male';
  emotion?: 'neutral' | 'solemn' | 'intense' | 'sad' | 'joyful' | string;
}

export async function synthesizeEdgeTTSAudio(
  text: string, 
  options: VoiceEmotionOptions = {}
): Promise<string> {
  const cleanText = text.replace(/\[.*?\]/g, "").trim();
  if (!cleanText) {
    throw new Error("Texte vide pour la synthèse vocale");
  }

  const roleLower = (options.role || 'character').toLowerCase();
  const genderLower = (options.gender || '').toLowerCase();
  const emotionLower = (options.emotion || '').toLowerCase();

  const FEMALE_VOICES = [
    "fr-FR-DeniseNeural - fr-FR (Female)",
    "fr-FR-EloiseNeural - fr-FR (Female)",
    "fr-FR-BrigitteNeural - fr-FR (Female)",
    "fr-FR-YvetteNeural - fr-FR (Female)",
    "fr-FR-VivienneNeural - fr-FR (Female)",
    "fr-CA-SylvieNeural - fr-CA (Female)",
    "fr-CA-ThorneNeural - fr-CA (Female)",
    "fr-CH-ArianeNeural - fr-CH (Female)",
    "fr-BE-CharlineNeural - fr-BE (Female)"
  ];

  const MALE_VOICES = [
    "fr-FR-ClaudeNeural - fr-FR (Male)",
    "fr-FR-AlainNeural - fr-FR (Male)",
    "fr-CA-AntoineNeural - fr-CA (Male)",
    "fr-CA-JeanNeural - fr-CA (Male)",
    "fr-CH-FabriceNeural - fr-CH (Male)",
    "fr-BE-GerardNeural - fr-BE (Male)"
  ];

  function getUniqueVoice(name: string, gender: string): string {
    const cleanName = name.replace(/\[.*?\]/g, "").trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < cleanName.length; i++) {
      hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const pool = gender === 'female' ? FEMALE_VOICES : MALE_VOICES;
    return pool[Math.abs(hash) % pool.length];
  }

  let voice = "fr-FR-HenriNeural - fr-FR (Male)";
  let rate = 0;   // % de vitesse (-50 à +50)
  let pitch = 0;  // Hz de hauteur (-50 à +50)

  // 1. RÔLE DIVIN / VOIX CÉLESTE
  if (roleLower === 'god') {
    voice = "fr-FR-RemyMultilingualNeural - fr-FR (Male)";
    rate = -10;   // Élocution solennelle et posée
    pitch = -15;  // Voix très grave et majestueuse
  } 
  // 2. NARRATEUR
  else if (roleLower === 'narrator') {
    voice = "fr-FR-HenriNeural - fr-FR (Male)";
    rate = 0;
    pitch = 0;
  }
  // 3. PERSONNAGES FÉMININS (Dédié et unique par hash du nom)
  else if (genderLower === 'female' || genderLower === 'féminin') {
    voice = getUniqueVoice(options.speaker || "Femme", "female");
    rate = 0;
    pitch = 5;
  }
  // 4. PERSONNAGES MASCULINS / PAR DÉFAUT (Dédié et unique par hash du nom)
  else {
    voice = getUniqueVoice(options.speaker || "Homme", "male");
    rate = 0;
    pitch = 0;
  }

  // Modulations d'émotion génériques
  if (emotionLower.includes('intense') || emotionLower.includes('colère') || emotionLower.includes('tension')) {
    rate = 20;
    pitch = -10;
  } else if (emotionLower.includes('solennel') || emotionLower.includes('grave')) {
    rate = -10;
    pitch = -10;
  } else if (emotionLower.includes('triste') || emotionLower.includes('suppliant')) {
    rate = -10;
    pitch = 5;
  }

  // Tentative 1 : Hugging Face Space Gradio API
  try {
    const submitRes = await fetch(`${EDGE_TTS_SPACE}/gradio_api/call/tts_interface`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [cleanText, voice, rate, pitch] }),
    });

    if (submitRes.ok) {
      const { event_id } = await submitRes.json();
      if (event_id) {
        for (let attempt = 0; attempt < 25; attempt++) {
          await new Promise((r) => setTimeout(r, attempt === 0 ? 1000 : 500));
          const resultRes = await fetch(`${EDGE_TTS_SPACE}/gradio_api/call/tts_interface/${event_id}`);
          if (!resultRes.ok) continue;

          const sseText = await resultRes.text();
          if (sseText.includes("event: complete")) {
            const dataMatch = sseText.match(/^data:\s*(\[.*\])\s*$/m);
            if (dataMatch) {
              const parsed = JSON.parse(dataMatch[1]);
              const fileData = parsed[0];
              if (fileData && fileData.url) {
                return fileData.url;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[TTS] Gradio HF Space indisponible, bascule sur Hugging Face Inference API MMS-TTS:", err);
  }

  // Tentative 2 : Hugging Face Serverless Inference API (facebook/mms-tts-fra)
  try {
    const hfRes = await fetch(HF_MMS_TTS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: cleanText })
    });

    if (hfRes.ok) {
      const blob = await hfRes.blob();
      // Transcrire le Blob en URL Data URI ou URL temporaire
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn("[TTS] Hugging Face Inference API error:", err);
  }

  throw new Error("Impossible de générer le fichier audio via les services Hugging Face.");
}
