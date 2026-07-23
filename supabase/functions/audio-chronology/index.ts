// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ChronologyModelfile } from "./ChronologyModelfile.ts";
import { callHFWithRotation } from "../_shared/hfRotator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bypass-auth",
};

const EPISODE_MAP: Record<string, { topic: string; details: string }> = {
  "creation": {
    topic: "La Création du monde (Genèse 1-2)",
    details: "La transition du chaos à la lumière, la beauté du cosmos et la création de l'Homme à l'image de Dieu."
  },
  "abraham-isaac": {
    topic: "Abraham et le sacrifice d'Isaac (Genèse 22)",
    details: "L'épreuve suprême de la foi d'Abraham sur le mont Morija et la provision divine."
  },
  "moses-exodus": {
    topic: "Moïse et la traversée de la mer Rouge (Exode 14)",
    details: "Le peuple d'Israël pris au piège entre l'armée de Pharaon et les eaux. La mer qui s'ouvre."
  },
  "david-goliath": {
    topic: "David terrasse le géant Goliath (1 Samuel 17)",
    details: "Un berger armé d'une fronde et de la foi face au géant philistin."
  },
  "daniel-lions": {
    topic: "Daniel dans la fosse aux lions (Daniel 6)",
    details: "La fidélité de Daniel dans la prière et la protection de l'ange divin."
  },
  "jesus-birth": {
    topic: "La Nativité et les Bergers (Luc 2)",
    details: "La naissance du Sauveur dans la crèche de Bethléem annoncée aux bergers."
  },
  "jesus-resurrection": {
    topic: "La Résurrection et Marie de Magdala (Jean 20)",
    details: "Le tombeau vide au matin de Pâques et la victoire sur la mort."
  },
  "pentecost": {
    topic: "La Pentecôte et l'Esprit Saint (Actes 2)",
    details: "La descente de l'Esprit Saint sur les disciples sous forme de langues de feu."
  }
};

const FAMOUS_CHARACTERS: Record<string, { name: string; book: string; startChapter: number; endChapter: number }> = {
  "joseph": { name: "Joseph", book: "Genèse", startChapter: 37, endChapter: 50 },
  "job": { name: "Job", book: "Job", startChapter: 1, endChapter: 42 },
  "ruth": { name: "Ruth", book: "Ruth", startChapter: 1, endChapter: 4 },
  "esther": { name: "Esther", book: "Esther", startChapter: 1, endChapter: 10 },
  "goliath": { name: "David", book: "1 Samuel", startChapter: 16, endChapter: 18 },
  "david": { name: "David", book: "1 Samuel", startChapter: 16, endChapter: 31 },
  "daniel": { name: "Daniel", book: "Daniel", startChapter: 1, endChapter: 6 },
  "elie": { name: "Élie", book: "1 Rois", startChapter: 17, endChapter: 19 },
  "elias": { name: "Élie", book: "1 Rois", startChapter: 17, endChapter: 19 },
  "abraham": { name: "Abraham", book: "Genèse", startChapter: 12, endChapter: 25 },
  "moise": { name: "Moïse", book: "Exode", startChapter: 2, endChapter: 14 },
  "salomon": { name: "Salomon", book: "1 Rois", startChapter: 3, endChapter: 11 },
  "jonas": { name: "Jonas", book: "Jonas", startChapter: 1, endChapter: 4 },
  "samson": { name: "Samson", book: "Juges", startChapter: 13, endChapter: 16 },
  "gedeon": { name: "Gédéon", book: "Juges", startChapter: 6, endChapter: 8 },
  "pierre": { name: "Pierre", book: "Actes", startChapter: 1, endChapter: 12 },
  "paul": { name: "Paul", book: "Actes", startChapter: 9, endChapter: 28 },
};

// Caching local Bible in global memory for subsequent hot invocations
let cachedBible: any = null;
async function getBibleData() {
  if (!cachedBible) {
    try {
      const path = new URL("./lsg.json", import.meta.url);
      const text = await Deno.readTextFile(path);
      cachedBible = JSON.parse(text);
      console.log("[audio-chronology] Bible lsg.json chargée et parsée avec succès !");
    } catch (err) {
      console.error("[audio-chronology] Échec du chargement de lsg.json :", err.message);
      throw err;
    }
  }
  return cachedBible;
}

function getAllBooks(bible: any) {
  const books: any[] = [];
  bible.Testaments.forEach((t: any) => {
    books.push(...t.Books);
  });
  return books;
}

function extractScriptureRange(bible: any, bookName: string, start: number, end: number): string {
  const books = getAllBooks(bible);
  const book = books.find(
    (b: any) => b.Text.toLowerCase().replace(/é|è/g, 'e') === bookName.toLowerCase().replace(/é|è/g, 'e')
  );
  if (!book) return "";

  let text = "";
  const sIdx = Math.max(1, start);
  const eIdx = Math.min(book.Chapters.length, end);

  for (let ch = sIdx; ch <= eIdx; ch++) {
    const chapter = book.Chapters[ch - 1];
    if (chapter) {
      text += `\n[${book.Text} Chapitre ${ch}]\n`;
      text += chapter.Verses.map((v: any, i: number) => `${i + 1}. ${v.Text}`).join(' ');
      text += "\n";
    }
    // Limit to prevent context window bloat (max 16000 characters of scriptures)
    if (text.length > 16000) {
      text = text.substring(0, 16000) + "\n... [Extrait de texte tronqué pour limite de taille]";
      break;
    }
  }
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate Auth
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

    const { episodeId, characterOrTopic, lifeSituation, virtue, durationMinutes, narrationMode, voiceName, skipTTS } = await req.json();

    let topic = "";
    let details = "";

    if (episodeId && EPISODE_MAP[episodeId]) {
      topic = EPISODE_MAP[episodeId].topic;
      details = EPISODE_MAP[episodeId].details;
    } else if (characterOrTopic) {
      topic = `Récit biblique pour : ${characterOrTopic}`;
      details = `Sujet/Personnage : ${characterOrTopic}. ${lifeSituation ? `Situation : ${lifeSituation}.` : ''} ${virtue ? `Vertu : ${virtue}.` : ''} ${durationMinutes ? `Durée : ${durationMinutes} min.` : ''} Mode : ${narrationMode || 'dramatic'}.`;
    } else {
      return new Response(JSON.stringify({ error: "Fournir au moins un episodeId valide ou un characterOrTopic" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hfApiKey = Deno.env.get("EXPO_PUBLIC_HF_API_KEY") || Deno.env.get("EXPO_PUBLIC_SIMULATOR_HF_KEY") || "";
    const hfModel = ChronologyModelfile.MODEL;

    const candidateModels = [
      ChronologyModelfile.MODEL, // "google/gemma-2-27b-it"
      "google/gemma-3-12b-it",
      "Qwen/Qwen2.5-72B-Instruct",
      "google/gemma-3-4b-it"
    ];

    let queryText = characterOrTopic || lifeSituation || "";
    let extractedScriptures = "";
    let bookNameSelected = "";
    let characterNameSelected = "";

    if (episodeId && EPISODE_MAP[episodeId]) {
      queryText = EPISODE_MAP[episodeId].topic;
    }

    // ÉTAPE 1 : Identification du personnage
    const queryLower = queryText.toLowerCase().replace(/é|è|ê/g, 'e');
    let matchedCharacter = null;

    for (const key of Object.keys(FAMOUS_CHARACTERS)) {
      if (queryLower.includes(key)) {
        matchedCharacter = FAMOUS_CHARACTERS[key];
        break;
      }
    }

    let rangeResult: any = null;

    if (matchedCharacter) {
      console.log(`[audio-chronology] Personnage biblique identifié instantanément : ${matchedCharacter.name} (${matchedCharacter.book} chapitres ${matchedCharacter.startChapter}-${matchedCharacter.endChapter})`);
      rangeResult = {
        character: matchedCharacter.name,
        book: matchedCharacter.book,
        startChapter: matchedCharacter.startChapter,
        endChapter: matchedCharacter.endChapter
      };
    } else {
      // Sinon, recherche Web Jina AI avec un timeout de 8 secondes
      let searchMarkdown = "";
      try {
        const searchQuery = `histoire complète personnage biblique Louis Segond : quel personnage, quel livre de la Bible en français, et quel chapitre exact de début et de fin décrivent son histoire complète pour illustrer : ${queryText}`;
        console.log(`[audio-chronology] 1. Recherche web via Jina AI pour : "${searchQuery}"...`);
        
        const searchRes = await fetch(`https://s.jina.ai/${encodeURIComponent(searchQuery)}`, {
          headers: { "Accept": "text/plain" },
          signal: AbortSignal.timeout(8000)
        });
        if (searchRes.ok) {
          searchMarkdown = await searchRes.text();
          console.log(`[audio-chronology] Recherche Jina AI réussie (${searchMarkdown.length} octets).`);
        }
      } catch (e) {
        console.warn("[audio-chronology] Échec Jina AI search :", e.message);
      }

      // ÉTAPE 2 : Analyse LLM pour extraire les chapitres exacts de début et de fin
      if (searchMarkdown) {
        const selectorPrompt = `Tu es un indexeur exégète biblique. Analyse les résultats de recherche web fournis pour identifier le personnage principal, le nom exact du livre de la Bible Louis Segond en français, le chapitre du début de son histoire et le chapitre de la fin de son histoire.
Tu dois répondre UNIQUEMENT par un objet JSON brut valide (sans balises markdown) contenant :
{
  "character": "Nom du personnage",
  "book": "Nom exact du livre en français (ex: Genèse, Job, Ruth, 1 Samuel, Esther, etc.)",
  "startChapter": 1,
  "endChapter": 15
}`;

        for (const modelCandidate of candidateModels) {
          try {
            console.log(`[audio-chronology] 2. Sélection de la plage avec rotation automatique (essai: ${modelCandidate})...`);
            let selectorData: any = null;
            try {
              const selectorResult = await callHFWithRotation({
                model: modelCandidate,
                messages: [
                  { role: "system", content: selectorPrompt },
                  { role: "user", content: `Voici les résultats de recherche :\n\n${searchMarkdown.substring(0, 5000)}` },
                ],
                temperature: 0.1,
                max_tokens: 512,
              });
              selectorData = selectorResult.data;
              console.log(`[audio-chronology] Sélecteur OK avec token ${selectorResult.usedTokenId}`);
            } catch (rotErr: any) {
              console.warn(`[audio-chronology] Sélecteur - tous les tokens épuisés: ${rotErr.message}`);
            }

            if (selectorData) {
              const rawSelectorText = selectorData?.choices?.[0]?.message?.content?.trim();
              
              function extractJson(text: string): string {
                const start = text.indexOf('{');
                const end = text.lastIndexOf('}');
                if (start !== -1 && end !== -1 && end > start) {
                  return text.substring(start, end + 1);
                }
                return text;
              }

              const cleanJson = extractJson(rawSelectorText);
              rangeResult = JSON.parse(cleanJson);
              console.log(`[audio-chronology] Plage de chapitres sélectionnée :`, rangeResult);
              break;
            }
          } catch (err) {
            console.warn(`[audio-chronology] Échec du sélecteur sur ${modelCandidate}:`, err.message);
          }
        }
      }
    }

    // ÉTAPE 3 : Extraction locale des écritures depuis le lsg.json
    if (rangeResult && rangeResult.book && rangeResult.startChapter && rangeResult.endChapter) {
      try {
        const bible = await getBibleData();
        extractedScriptures = extractScriptureRange(
          bible, 
          rangeResult.book, 
          rangeResult.startChapter, 
          rangeResult.endChapter
        );
        bookNameSelected = rangeResult.book;
        characterNameSelected = rangeResult.character;
        console.log(`[audio-chronology] 3. EXTRACTION SCRIPTURAIRE RÉUSSIE : ${rangeResult.book} chapitres ${rangeResult.startChapter} à ${rangeResult.endChapter} (${extractedScriptures.length} caractères de versets réels).`);
      } catch (err) {
        console.warn("[audio-chronology] Échec extraction locale :", err.message);
      }
    }

    // Secours par défaut sur mot-clé si aucun passage n'a été extrait
    if (!extractedScriptures) {
      try {
        const bible = await getBibleData();
        const books = getAllBooks(bible);
        const matchingBook = books.find(
          (b: any) => queryText.toLowerCase().includes(b.Text.toLowerCase())
        );
        if (matchingBook) {
          extractedScriptures = extractScriptureRange(bible, matchingBook.Text, 1, 5);
          bookNameSelected = matchingBook.Text;
        }
      } catch (err) {
        console.warn("[audio-chronology] Échec recherche secours :", err.message);
      }
    }

    // Construction du prompt final pour le conteur d'histoire
    let userContent = `Génère la grande fresque théâtrale en 5 Actes pour l'épisode : "${queryText}".\n`;
    if (characterNameSelected) {
      userContent += `Personnage principal ciblé : ${characterNameSelected}\n`;
    }
    if (bookNameSelected) {
      userContent += `Livre de référence : ${bookNameSelected}\n`;
    }
    if (extractedScriptures) {
      userContent += `\nVoici les EXTRAITS RÉELS DE LA BIBLE (versets canoniques de ${bookNameSelected}) à utiliser impérativement comme référence absolue. Tu dois reformuler ces chapitres de manière immersive, vivante et théâtrale page après page, COMME SI L'HISTOIRE VENANT DE TON IMAGINATION, mais en restant 100% fidèle aux faits décrits (interdiction absolue d'inventer des faits contraires à ces textes) :\n${extractedScriptures}`;
    }

    const messages = [
      { role: "system", content: ChronologyModelfile.SYSTEM },
      { role: "user", content: userContent }
    ];

    // ÉTAPE 4 : Inférence de la fiction audio finale avec rotation automatique
    let hfResult: any = null;
    let lastErrorDetail = "";

    for (const modelCandidate of candidateModels) {
      try {
        console.log(`[audio-chronology] 4. Inférence finale (rotation automatique, modèle préféré: ${modelCandidate})...`);
        const hfCallResult = await callHFWithRotation({
          model: modelCandidate,
          messages: messages,
          temperature: 0.7,
          max_tokens: 4096,
        });
        if (hfCallResult.data?.choices?.[0]?.message?.content) {
          hfResult = hfCallResult.data;
          console.log(`[audio-chronology] Succès avec token ${hfCallResult.usedTokenId} et modèle ${modelCandidate}`);
          break;
        }
      } catch (e: any) {
        lastErrorDetail = e.message;
        console.warn(`[audio-chronology] Erreur rotateur pour ${modelCandidate}:`, e.message);
      }
    }

    if (!hfResult) {
      throw new Error(`Tous les modèles d'inférence HF Router ont échoué. Détail : ${lastErrorDetail}`);
    }

    const rawJsonText = hfResult?.choices?.[0]?.message?.content?.trim();

    if (!rawJsonText) {
      throw new Error("Hugging Face LLM did not return text content.");
    }

    function extractJson(text: string): string {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        return text.substring(start, end + 1);
      }
      return text;
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(extractJson(rawJsonText));
    } catch (parseError) {
      console.error("Raw HuggingFace text:", rawJsonText);
      throw new Error(`Failed to parse HuggingFace LLM output as JSON: ${parseError.message}`);
    }

    const formattedMetadata = {
      title: parsedJson.title || `Récit de ${characterOrTopic || topic}`,
      subtitle: parsedJson.subtitle || parsedJson.context || `Découverte spirituelle et enseignements`,
      era: parsedJson.era || 'Écritures Bibliques',
      references: parsedJson.references || (parsedJson.reference ? [parsedJson.reference] : [`Passages sur ${characterOrTopic || topic}`]),
      virtue: parsedJson.virtue || virtue || 'Foi',
      durationMinutes: durationMinutes || 15,
      ambience: parsedJson.ambience || 'desert',
      ambienceLabel: parsedJson.ambienceLabel || 'Ambiance sonore immersive',
      lifeSituations: lifeSituation ? [lifeSituation] : ['Quête de foi et de sagesse'],
      aiReasoning: parsedJson.aiReasoning || parsedJson.context || `Récit inspirant basé sur les Écritures.`,
      historicalContext: parsedJson.historicalContext || parsedJson.context || `Contexte historique et spirituel de l'époque biblique.`,
      interpretations: parsedJson.interpretations || [
        { tradition: 'Évangélique', insight: `Foi et obéissance à la parole divine.` },
        { tradition: 'Catholique', insight: `Méditation sur la grâce agissante.` },
        { tradition: 'Orthodoxe', insight: `Vision contemplative de l'alliance divine.` }
      ],
      practicalLessons: parsedJson.practicalLessons || parsedJson.moralLessons || ['Rechercher la présence de Dieu', 'Garder la foi en toutes circonstances'],
      prayer: parsedJson.prayer || 'Seigneur, fortifie ma foi et guide mes pas. Amen.',
      narrationModes: parsedJson.narrationModes || {
        faithful: (parsedJson.script || []).map((s: any) => ({ speaker: s.speaker || 'Narrateur', role: 'narrator', text: s.text, gender: s.gender || 'male', emotion: s.emotion || 'neutral' })),
        kids: (parsedJson.script || []).map((s: any) => ({ speaker: s.speaker || 'Conteur', role: 'narrator', text: s.text, gender: s.gender || 'male', emotion: s.emotion || 'neutral' })),
        dramatic: (parsedJson.script || []).map((s: any) => ({
          speaker: s.speaker || 'Narrateur',
          role: (s.speaker || '').toLowerCase().includes('dieu') ? 'god' : (s.speaker || '').toLowerCase().includes('narrateur') ? 'narrator' : 'character',
          text: s.text,
          gender: s.gender || 'male',
          emotion: s.emotion || 'neutral'
        }))
      }
    };

    return new Response(
      JSON.stringify({
        metadata: formattedMetadata,
        audio: "",
        ttsSource: "Edge-TTS-HF-Space",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err: any) {
    console.error("[audio-chronology] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
