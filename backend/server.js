import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { chromium } from "playwright";
import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";

dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_API_KEY = process.env.HF_API_KEY || process.env.EXPO_PUBLIC_HF_API_KEY || process.env.HF_TOKEN || "";

// --- BRIQUE 1 : ANALYSE D'INTENTION & EMBEDDING ---

const INTENT_ANALYZER_SYSTEM_PROMPT = `Tu es un expert en psychologie clinique, théologie et analyse sémantique des émotions humaines.
Ta seule mission est d'analyser le message de l'utilisateur pour extraire son état émotionnel profond, identifier ses mots-clés d'épreuve et formuler la requête de recherche parfaite pour trouver le héros biblique dont l'histoire correspond exactement à son vécu.

Tu dois répondre STRICTEMENT sous forme de JSON brut (sans balises markdown, sans texte d'introduction) respectant cette structure exacte :

{
  "userStateSummary": "Résumé concis de la situation psychologique et spirituelle du croyant",
  "primaryEmotion": "Émotion ou épreuve principale",
  "secondaryEmotion": "Émotion secondaire associée",
  "coreKeywords": ["Mot-clé 1", "Mot-clé 2", "Mot-clé 3", "Mot-clé 4"],
  "spiritualVirtueNeeded": "Vertu spirituelle ou clé de délivrance recherchée",
  "searchQueryForAgent": "histoire complète personnage biblique Louis Segond trahi ou éprouvé du commencement à la fin"
}`;

app.post("/api/analyze-intent", async (req, res) => {
  const { rawPrompt } = req.body;
  if (!rawPrompt) {
    return res.status(400).json({ error: "rawPrompt est requis" });
  }

  console.log(`[API: analyze-intent] Analyse pour : "${rawPrompt}"`);

  try {
    // 1. Appel du LLM pour extraire l'intention
    const llm = new ChatOpenAI({
      temperature: 0.1,
      openAIApiKey: HF_API_KEY,
      configuration: { baseURL: "https://router.huggingface.co/v1" },
      modelName: "google/gemma-3-12b-it"
    });

    const response = await llm.invoke([
      { role: "system", content: INTENT_ANALYZER_SYSTEM_PROMPT },
      { role: "user", content: `Analyse cette situation : "${rawPrompt}"` }
    ]);

    let parsedAnalysis = {};
    const rawText = response.text || response.content;

    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      parsedAnalysis = JSON.parse(rawText.substring(start, end + 1));
    } else {
      parsedAnalysis = JSON.parse(rawText);
    }

    // 2. Génération de l'embedding (via Hugging Face API)
    let embedding = [];
    const embRes = await fetch("https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-m3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({ inputs: rawPrompt }),
    });
    if (embRes.ok) {
      const embData = await embRes.json();
      if (Array.isArray(embData)) {
        embedding = Array.isArray(embData[0]) ? embData[0] : embData;
      }
    }

    const searchQueryForAgent = parsedAnalysis.searchQueryForAgent || parsedAnalysis.query || `histoire complète personnage biblique Louis Segond : ${rawPrompt}`;

    res.json({
      rawPrompt,
      embedding,
      analysis: {
        userStateSummary: parsedAnalysis.userStateSummary,
        primaryEmotion: parsedAnalysis.primaryEmotion,
        secondaryEmotion: parsedAnalysis.secondaryEmotion,
        coreKeywords: parsedAnalysis.coreKeywords,
        spiritualVirtueNeeded: parsedAnalysis.spiritualVirtueNeeded
      },
      searchQueryForAgent
    });

  } catch (error) {
    console.error("Erreur dans analyze-intent :", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- BRIQUE 2 : L'AGENT DE RECHERCHE AVEC TOOLS ---

// Outil 1 : Jina Reader Search Tool
const webSearchTool = new DynamicStructuredTool({
  name: "web_search",
  description: "Recherche sur le web des informations historiques, théologiques et exégétiques sur un personnage biblique.",
  schema: z.object({
    query: z.string().describe("La requête de recherche exégétique précise"),
  }),
  async func({ query }) {
    console.log(`[Tool: web_search] Recherche Jina AI pour : "${query}"`);
    try {
      const res = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
        headers: { "Accept": "text/plain" }
      });
      if (res.ok) {
        const text = await res.text();
        return text.substring(0, 10000); // Limite raisonnable
      }
    } catch (e) {
      console.error("Échec Jina search :", e.message);
    }
    return "Aucun résultat trouvé sur le web.";
  }
});

// Outil 2 : Playwright Web Scraper Tool
const scrapeWebPageTool = new DynamicStructuredTool({
  name: "scrape_web_page",
  description: "Scrape et extrait le texte brut en Markdown d'une URL de page web spécifique pour récupérer des précisions bibliques.",
  schema: z.object({
    url: z.string().describe("L'URL complète de la page à scraper"),
  }),
  async func({ url }) {
    console.log(`[Tool: scrape_web_page] Navigation Playwright vers : ${url}`);
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 8000 });
      const text = await page.evaluate(() => document.body.innerText);
      return text.substring(0, 8000);
    } catch (e) {
      console.error(`Échec du scraping de ${url} :`, e.message);
      return `Impossible de scraper la page : ${e.message}`;
    } finally {
      if (browser) await browser.close();
    }
  }
});

const INDEXER_SYSTEM_PROMPT = `Tu es un indexeur exégète de la Bible Louis Segond.
Ton rôle est d'identifier le personnage biblique principal, le livre de la Bible en français, et la liste EXACTE ET CONTINUE de TOUS les chapitres décrivant son histoire complète du début à la fin sans sauter aucun chapitre.

Tu dois répondre UNIQUEMENT par un objet JSON brut valide (sans markdown) contenant :
{
  "character": "Nom du personnage",
  "book": "Nom du livre exact en français (ex: Genèse, Job, Ruth, 1 Samuel, Esther)",
  "startChapter": 1,
  "endChapter": 10,
  "chapters": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
}`;

app.post("/api/search-passages", async (req, res) => {
  const { searchQuery } = req.body;
  if (!searchQuery) {
    return res.status(400).json({ error: "searchQuery est requis" });
  }

  console.log(`[API: search-passages] Agent invoqué pour : "${searchQuery}"`);

  try {
    // 1. Exécution de l'outil de recherche (Jina)
    const searchData = await webSearchTool.func({ query: searchQuery });

    // 2. Exécution du LLM avec les données de recherche pour extraire l'indexation canonique
    const llm = new ChatOpenAI({
      temperature: 0.1,
      openAIApiKey: HF_API_KEY,
      configuration: { baseURL: "https://router.huggingface.co/v1" },
      modelName: "google/gemma-3-12b-it"
    });

    const response = await llm.invoke([
      { role: "system", content: INDEXER_SYSTEM_PROMPT },
      { role: "user", content: `Voici les recherches exégétiques du web :\n\n${searchData.substring(0, 6000)}\n\nRequête : "${searchQuery}"` }
    ]);

    const rawText = response.text || response.content;
    let indexResult = {};

    try {
      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        indexResult = JSON.parse(rawText.substring(start, end + 1));
      } else {
        indexResult = JSON.parse(rawText);
      }

      if (!indexResult.character || !indexResult.book || !Array.isArray(indexResult.chapters)) {
        throw new Error("Résultat d'indexation incomplet");
      }
    } catch (e) {
      console.warn("Échec de parsing JSON index, texte brut :", rawText);
      return res.status(500).json({ error: "L'Agent n'a pas pu structurer l'indexation des chapitres." });
    }

    res.json(indexResult);

  } catch (error) {
    console.error("Erreur dans search-passages :", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- BRIQUE 4 : REFORMULATION THÉÂTRALE PAGE PAR PAGE ---
const PAGE_SCENE_SYSTEM_PROMPT = `Tu es un dramaturge et exégète théâtral de la Bible Louis Segond.
Ta mission est de reformuler une TRANCHE DE VERSETS (10 à 12 versets) en une scène théâtrale vivante et captivante.

RÈGLES D'OR DE DENSITÉ PAR TRANCHE DE VERSETS :
1. QUOTA STRICT PAR TRANCHE : Rédige IMPÉRATIVEMENT entre 5 et 8 répliques de dialogues complètes, denses et vivantes pour cette tranche unique de versets.
2. Personnages authentiques uniquement : Fais parler UNIQUEMENT les personnages nommés et présents dans les versets de cette tranche spécifique.
3. Identité fixe des répliques ("speaker") : Utilise des noms de personnages stricts, uniques et canoniques (ex: "Joseph", "Jacob", "Juda", "Potiphar", "Femme de Potiphar", "Pharaon", "Narrateur [Voix Grave]", "Dieu [Majestueux]"). N'utilise JAMAIS de noms flous ou oscillants comme "Un homme", "Un frère".
4. Format JSON brut sans markdown :

{
  "actTitle": "Titre évocateur de cette sous-scène",
  "summary": "Résumé d'une phrase des événements de ces versets",
  "dialogues": [
    {
      "speaker": "Nom Canonique du Personnage",
      "role": "narrator" | "god" | "character",
      "gender": "male" | "female",
      "emotion": "solemn" | "intense" | "sad" | "joyful" | "neutral",
      "text": "..."
    }
  ]
}`;

app.post("/api/generate-page-scene", async (req, res) => {
  const { chunkTitle, characterName, rawText, previousSummary } = req.body;
  if (!rawText) {
    return res.status(400).json({ error: "rawText est requis" });
  }

  console.log(`[API: generate-page-scene] Reformulation de la tranche : "${chunkTitle}" (${characterName})`);

  try {
    const llm = new ChatOpenAI({
      temperature: 0.7,
      maxTokens: 4096,
      openAIApiKey: HF_API_KEY,
      configuration: { baseURL: "https://router.huggingface.co/v1" },
      modelName: "google/gemma-3-12b-it"
    });

    const userContent = `Reformule la tranche de versets suivante (${chunkTitle}) en 5 à 8 répliques théâtrales vivantes :
Personnage principal : ${characterName}
${previousSummary ? `Scène précédente : ${previousSummary}\n` : ''}

Voici les versets authentiques de cette tranche à reformuler avec imagination et fidélité :
${rawText}`;

    const response = await llm.invoke([
      { role: "system", content: PAGE_SCENE_SYSTEM_PROMPT },
      { role: "user", content: userContent }
    ]);

    const resultText = response.text || response.content;
    let parsedScene = {};

    function extractJson(text) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        return text.substring(start, end + 1);
      }
      return text;
    }

    parsedScene = JSON.parse(extractJson(resultText));
    res.json(parsedScene);

  } catch (error) {
    console.error("Erreur dans generate-page-scene :", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- MOTEUR DE ROTATION MULTI-TOKEN HF (15 tokens) ---
const HF_TOKENS = [
  { id: "HF_API_KEY", key: process.env.HF_API_KEY || process.env.EXPO_PUBLIC_HF_API_KEY || process.env.HF_TOKEN || "" },
  { id: "HF_TOKEN_01", key: process.env.HF_TOKEN_01 || "" },
  { id: "HF_TOKEN_02", key: process.env.HF_TOKEN_02 || "" },
  { id: "HF_TOKEN_03", key: process.env.HF_TOKEN_03 || "" },
  { id: "HF_TOKEN_04", key: process.env.HF_TOKEN_04 || "" },
  { id: "HF_TOKEN_05", key: process.env.HF_TOKEN_05 || "" },
  { id: "HF_TOKEN_06", key: process.env.HF_TOKEN_06 || "" },
  { id: "HF_TOKEN_07", key: process.env.HF_TOKEN_07 || "" },
  { id: "HF_TOKEN_08", key: process.env.HF_TOKEN_08 || "" },
  { id: "HF_TOKEN_09", key: process.env.HF_TOKEN_09 || "" },
  { id: "HF_TOKEN_10", key: process.env.HF_TOKEN_10 || "" },
  { id: "HF_TOKEN_11", key: process.env.HF_TOKEN_11 || "" },
  { id: "HF_TOKEN_12", key: process.env.HF_TOKEN_12 || "" },
  { id: "HF_TOKEN_13", key: process.env.HF_TOKEN_13 || "" },
  { id: "HF_TOKEN_14", key: process.env.HF_TOKEN_14 || "" },
  { id: "HF_TOKEN_15", key: process.env.HF_TOKEN_15 || "" },
].filter(t => t.key !== "");

const QUOTA_CODES = new Set([402, 429, 503]);

async function invokeHFWithRotation(systemPrompt, userMsg, model = "google/gemma-3-27b-it") {
  let lastError = null;
  for (const token of HF_TOKENS) {
    try {
      console.log(`[HF Rotator Backend] Essai ${token.id}...`);
      const resp = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token.key}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMsg }
          ],
          temperature: 0.2,
          max_tokens: 2048
        })
      });
      const body = await resp.text();
      if (resp.ok) {
        const data = JSON.parse(body);
        const text = data?.choices?.[0]?.message?.content || "";
        console.log(`[HF Rotator Backend] Succes avec ${token.id}`);
        return text;
      }
      const lower = body.toLowerCase();
      if (QUOTA_CODES.has(resp.status) || lower.includes("quota") || lower.includes("rate limit") || lower.includes("depleted")) {
        console.warn(`[HF Rotator Backend] Quota epuise sur ${token.id} (${resp.status}), bascule...`);
        lastError = new Error(`${token.id}: HTTP ${resp.status}`);
        continue;
      }
      console.warn(`[HF Rotator Backend] Erreur non-quota sur ${token.id} (${resp.status}), bascule...`);
      lastError = new Error(`HF erreur non-quota (${resp.status}): ${body.substring(0, 200)}`);
      continue;
    } catch (e) {
      lastError = e;
      console.warn(`[HF Rotator Backend] Erreur reseau/parsing ${token.id}: ${e.message}`);
    }
  }
  throw lastError || new Error("Tous les tokens HF configurés sont epuises.");
}

// --- COUCHE 2A : RESOLUTION GEOSPATIALE WIKIDATA SPARQL ---
async function fetchWikidataEntity(placeName) {
  const cleanName = placeName.replace(/^(le|la|les|l'|du|de|des)\s+/i, "").trim();
  console.log(`[Wikidata SPARQL] Resolution pour: "${cleanName}"...`);

  const sparqlQuery = `
    SELECT ?item ?itemLabel ?coord ?image WHERE {
      ?item rdfs:label "${cleanName}"@fr .
      OPTIONAL { ?item wdt:P625 ?coord . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
    } LIMIT 1
  `;

  try {
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparqlQuery)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "DieuEtMoi/1.0 (contact@dieuetmoi.app)",
        "Accept": "application/sparql-results+json"
      }
    });
    if (res.ok) {
      const data = await res.json();
      const binding = data?.results?.bindings?.[0];
      if (binding) {
        let coordinates = null;
        if (binding.coord?.value) {
          // Format WKT: Point(35.1806 32.2764)
          const match = binding.coord.value.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
          if (match) {
            coordinates = [parseFloat(match[1]), parseFloat(match[2])];
          }
        }
        const imageUrl = binding.image?.value || null;
        console.log(`[Wikidata SPARQL] Entite trouvee pour "${cleanName}": Coordonnees=${coordinates}, Image=${imageUrl}`);
        return { coordinates, imageUrl, label: binding.itemLabel?.value || cleanName };
      }
    }
  } catch (e) {
    console.warn(`[Wikidata SPARQL] Echec recherche pour "${placeName}": ${e.message}`);
  }
  return null;
}

// --- COUCHE 2B : GEOCODAGE REEL AVEC VIEWBOX DYNAMIQUE (OPENSTREETMAP NOMINATIM) ---
async function fetchNominatimBounded(placeName, spatialDomain = "Levant") {
  const cleanName = placeName.replace(/^(le|la|les|l'|du|de|des)\s+/i, "").trim();
  console.log(`[Nominatim Bounded] Géocodage restreint pour: "${cleanName}" (Domaine: ${spatialDomain})...`);

  // Restricteurs géographiques dynamiques sans données codées en dur
  let viewboxParam = "";
  if (spatialDomain === "Levant" || spatialDomain === "Middle East" || spatialDomain === "Palestine") {
    viewboxParam = "&viewbox=32.0,35.5,36.5,28.0&bounded=1";
  } else if (spatialDomain === "Egypt" || spatialDomain === "Sinai") {
    viewboxParam = "&viewbox=24.0,32.0,37.0,22.0&bounded=1";
  } else if (spatialDomain === "Mesopotamia") {
    viewboxParam = "&viewbox=40.0,38.0,49.0,30.0&bounded=1";
  }

  try {
    const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanName)}&format=json&polygon_geojson=1&limit=1&accept-language=fr,en${viewboxParam}`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "DieuEtMoi/1.0 (contact@dieuetmoi.app)" }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        console.log(`[Nominatim Bounded] Coordonnées réelles trouvées pour "${cleanName}": [${lon}, ${lat}] (${item.display_name})`);
        return {
          coordinates: [lon, lat],
          displayName: item.display_name,
          geojson: item.geojson || null
        };
      }
    }
  } catch (e) {
    console.warn(`[Nominatim Bounded] Échec géocodage pour "${placeName}": ${e.message}`);
  }
  return null;
}

// --- INSPECTEUR VISUEL MULTIMODAL GEMMA 3 27B VISION ---
async function verifyImageWithVision(placeName, candidateImageUrl) {
  if (!candidateImageUrl) return false;
  console.log(`[Gemma-3-27B Vision] Inspection visuelle en temps réel pour: "${placeName}" (${candidateImageUrl.substring(0, 80)}...)...`);

  const systemPrompt = "Tu es un inspecteur de vérification visuelle d'images pour une carte cartographique. Ton rôle est de regarder l'image et d'indiquer si elle montre bien le lieu cherche ou ses monuments/paysages, ou s'il s'agit d'une erreur d'indexation (ex: legume, nourriture, objet hors sujet). Reponds en JSON brut: {\"valid\": true, \"reason\": \"...\"} ou {\"valid\": false, \"reason\": \"...\"}.";

  const userMsg = [
    {
      type: "text",
      text: `Lieu cherche : "${placeName}". Est-ce que cette image montre bien ce lieu, ses ruines, ses monuments, ses cartes ou son paysage ? Si c'est un legume, une plante, de la nourriture ou un objet hors sujet, reponds valid=false.`
    },
    {
      type: "image_url",
      image_url: { url: candidateImageUrl }
    }
  ];

  try {
    const resultText = await invokeHFWithRotation(systemPrompt, userMsg, "google/gemma-3-27b-it");
    function extractJson(text) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) return text.substring(start, end + 1);
      return text;
    }
    const parsed = JSON.parse(extractJson(resultText));
    console.log(`[Gemma-3-27B Vision] Décision visuelle pour "${placeName}": valid=${parsed.valid} (Raison: ${parsed.reason || 'N/A'})`);
    return parsed.valid === true;
  } catch (e) {
    console.warn(`[Gemma-3-27B Vision] Avertissement inspection visuelle: ${e.message}`);
    return true;
  }
}

// --- COUCHE 2C : RECHERCHE D'IMAGE REELLE EN TEMPS REEL (WIKIPEDIA + WIKIMEDIA COMMONS + VISION VALIDATION) ---
async function fetchLiveImageFromWeb(placeName) {
  const cleanName = placeName.replace(/^(le|la|les|l'|du|de|des)\s+/i, "").trim();
  console.log(`[Live Web Image] Recherche d'image réelle en temps réel sur le Web pour: "${cleanName}"...`);

  // 1. Wikipédia FR
  try {
    const frUrl = `https://fr.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanName)}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=1000&format=json&origin=*`;
    const resFr = await fetch(frUrl, { headers: { "User-Agent": "DieuEtMoi/1.0 (contact@dieuetmoi.app)" } });
    if (resFr.ok) {
      const data = await resFr.json();
      const pages = data?.query?.pages;
      if (pages) {
        for (const p of Object.values(pages)) {
          if (p?.thumbnail?.source) {
            const candidateUrl = p.thumbnail.source;
            const isValid = await verifyImageWithVision(cleanName, candidateUrl);
            if (isValid) {
              console.log(`[Live Web Image] Image Wikipedia FR validee visuellement pour "${cleanName}": ${candidateUrl}`);
              return candidateUrl;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn(`[Live Web Image] Échec recherche Wikipedia FR: ${e.message}`);
  }

  // 2. Wikipédia EN
  try {
    const enUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanName)}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=1000&format=json&origin=*`;
    const resEn = await fetch(enUrl, { headers: { "User-Agent": "DieuEtMoi/1.0 (contact@dieuetmoi.app)" } });
    if (resEn.ok) {
      const data = await resEn.json();
      const pages = data?.query?.pages;
      if (pages) {
        for (const p of Object.values(pages)) {
          if (p?.thumbnail?.source) {
            const candidateUrl = p.thumbnail.source;
            const isValid = await verifyImageWithVision(cleanName, candidateUrl);
            if (isValid) {
              console.log(`[Live Web Image] Image Wikipedia EN validee visuellement pour "${cleanName}": ${candidateUrl}`);
              return candidateUrl;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn(`[Live Web Image] Échec recherche Wikipedia EN: ${e.message}`);
  }

  // 3. Wikimedia Commons
  try {
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanName)}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json&origin=*`;
    const resCommons = await fetch(commonsUrl, { headers: { "User-Agent": "DieuEtMoi/1.0 (contact@dieuetmoi.app)" } });
    if (resCommons.ok) {
      const data = await resCommons.json();
      const pages = data?.query?.pages;
      if (pages) {
        for (const p of Object.values(pages)) {
          const imgUrl = p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url;
          if (imgUrl) {
            const isValid = await verifyImageWithVision(cleanName, imgUrl);
            if (isValid) {
              console.log(`[Live Web Image] Image Wikimedia Commons validee visuellement pour "${cleanName}": ${imgUrl}`);
              return imgUrl;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn(`[Live Web Image] Échec Wikimedia Commons: ${e.message}`);
  }

  return null;
}

// --- COUCHE 1 : CONTRAT SYSTEM PROMPT DE COMPREHENSION SEMANTIQUE ---
const GEO_AGENT_SYSTEM_PROMPT = `Tu es GeoAgent, l'Agent d'analyse sémantique cartographique de l'application "Dieu et Moi".
Ta mission : comprendre l'instruction de l'utilisateur et émettre une réponse sémantique et spirituelle structurée en JSON.

CONTRAT JSON EXIGÉ :
{
  "speechResponse": "Explication vivante, historique et spirituelle en français...",
  "entities": [
    {
      "name": "Nom du lieu (ex: Samarie, Jérusalem, Palmyre)",
      "searchName": "Nom de recherche universel en anglais/français",
      "subtitle": "Description concise de la nature du lieu",
      "spatialDomain": "Levant" | "Egypt" | "Mesopotamia" | "Asia_Minor" | "Global"
    }
  ]
}`;

// --- ENDPOINT PIPELINE GIS DÉTERMINISTE 3 COUCHES ---
app.post("/api/geo-agent", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "prompt est requis" });
  }

  console.log(`[GeoAgent Pipeline] Commande reçue : "${prompt}"`);

  try {
    // 1. Recherche web sémantique
    let searchContext = "";
    try {
      searchContext = await webSearchTool.func({
        query: `histoire et théologie biblique ${prompt}`
      });
    } catch (e) {
      console.warn("[GeoAgent Pipeline] Recherche web ignorée :", e.message);
    }

    const userMsg = `Instruction utilisateur : "${prompt}".
Contexte historique : ${searchContext.substring(0, 3000)}`;

    // 2. Couche 1 : Parsing sémantique par le LLM (sans génération de coordonnées)
    const resultText = await invokeHFWithRotation(GEO_AGENT_SYSTEM_PROMPT, userMsg, "google/gemma-3-27b-it");

    function extractJson(text) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) return text.substring(start, end + 1);
      return text;
    }

    let parsedSemantic;
    try {
      parsedSemantic = JSON.parse(extractJson(resultText));
    } catch (e) {
      console.error("[GeoAgent Pipeline] Échec parsing sémantique LLM:", resultText.substring(0, 300));
      throw new Error("Le LLM n'a pas retourné une structure sémantique valide.");
    }

    const actions = [];
    let mainCoordinates = null;

    // 3. Couche 2 & 3 : Résolution déterministe GIS et construction des marqueurs MapLibre
    if (parsedSemantic.entities && Array.isArray(parsedSemantic.entities)) {
      for (let index = 0; index < parsedSemantic.entities.length; index++) {
        const entity = parsedSemantic.entities[index];
        const placeName = entity.name || entity.searchName;
        const searchName = entity.searchName || entity.name;
        const domain = entity.spatialDomain || "Levant";

        let coordinates = null;
        let imageUrl = null;
        let geojson = null;

        // A. Résolution Wikidata SPARQL (Gazetteer Officiel)
        const wikidataRes = await fetchWikidataEntity(searchName);
        if (wikidataRes) {
          coordinates = wikidataRes.coordinates;
          imageUrl = wikidataRes.imageUrl;
        }

        // B. Résolution Nominatim avec Viewbox Restreint (si Wikidata n'a pas renvoyé de coordonnées)
        if (!coordinates) {
          const nominatimRes = await fetchNominatimBounded(searchName, domain);
          if (nominatimRes) {
            coordinates = nominatimRes.coordinates;
            geojson = nominatimRes.geojson;
          }
        }

        // C. Résolution d'image Web en direct (si Wikidata n'a pas d'image P18)
        if (!imageUrl) {
          imageUrl = await fetchLiveImageFromWeb(searchName);
        }

        // D. Validation stricte des coordonnées WGS84 [Longitude, Latitude]
        if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
          const [lon, lat] = coordinates;
          if (Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90) {
            if (!mainCoordinates) mainCoordinates = [lon, lat];

            const markerId = `loc-${index + 1}`;
            const popupImageHtml = imageUrl ? `<img class='m3-card-img' src='${imageUrl}' />` : '';

            actions.push({
              type: "addMarker",
              id: markerId,
              name: placeName,
              subtitle: entity.subtitle || "Lieu historique",
              coordinates: [lon, lat],
              color: "#D4AF37",
              imageUrl: imageUrl || undefined,
              popupHtml: `<div class='m3-shape-card'><div class='m3-card-header'><div><h3 class='m3-card-title'>${placeName}</h3><p class='m3-card-subtitle'>${entity.subtitle || 'Lieu historique'}</p></div><span class='m3-logo'>M3</span></div>${popupImageHtml}</div>`
            });

            if (geojson && (geojson.type === "Polygon" || geojson.type === "MultiPolygon")) {
              actions.push({
                type: "addZone",
                id: `zone-${markerId}`,
                name: placeName,
                geometry: geojson,
                color: "#D4AF37"
              });
            }
          }
        }
      }
    }

    // Centrer la caméra MapLibre sur les coordonnées résolues
    if (mainCoordinates) {
      actions.unshift({
        type: "flyTo",
        center: mainCoordinates,
        zoom: 9.5,
        pitch: 30
      });
    }

    const finalResponse = {
      speechResponse: parsedSemantic.speechResponse || "Exploration cartographique effectuée.",
      actions
    };

    console.log(`[GeoAgent Pipeline] Réponse validée avec ${actions.length} actions géospatiales.`);
    res.json(finalResponse);

  } catch (error) {
    console.error("[GeoAgent Pipeline] Erreur :", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- STOCKAGE EN MÉMOIRE TEMPS RÉEL DES POSITIONS GPS TRACCAR TRANSMISES PAR LES TÉLÉPHONES RÉELS ---
const liveTraccarPositions = new Map();

// --- API ENDPOINT : GRAPHE SOCIAL UTILISATEURS REELS SUPABASE ---
app.get("/api/social/graph-users", async (req, res) => {
  console.log("[API Social Graph] Interrogation de la table public.user_profiles dans Supabase...");

  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://czvhcdouuitzeqtvbnvs.supabase.co";
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_8RrC_qnaEuB2oBhQ6k3Dvg_YszYYPZS";

    const spRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=*`, {
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (spRes.ok) {
      const usersData = await spRes.json();
      if (Array.isArray(usersData)) {
        console.log(`[API Social Graph] ${usersData.length} utilisateurs réels récupérés de Supabase.`);

        // Injection directe de la position GPS temps réel émise par Traccar pour chaque utilisateur connecté
        const usersWithLiveGps = usersData.map(u => {
          const liveCoords = liveTraccarPositions.get(u.id);
          return {
            ...u,
            coords: liveCoords || (u.location && Array.isArray(u.location.coordinates) ? u.location.coordinates : null)
          };
        });

        return res.json({ users: usersWithLiveGps });
      }
    }

    res.json({ users: [] });
  } catch (error) {
    console.error("[API Social Graph] Erreur Supabase:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- API ENDPOINT : INGESTION PROTOCOLE TRACCAR / OSMAND (PORT 5055 / HTTP) ---
app.all(["/api/traccar/location", "/api/traccar/osmand"], async (req, res) => {
  const query = { ...req.query, ...req.body };
  const userId = query.id || query.deviceid || query.userId;
  const lat = parseFloat(query.lat || query.latitude);
  const lon = parseFloat(query.lon || query.longitude || query.lng);

  if (!userId || isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: "Paramètres Traccar invalides (id, lat, lon requis)" });
  }

  // Stockage instantané de la vraie position GPS transmise par le smartphone / navigateur de l'utilisateur
  liveTraccarPositions.set(userId, [lon, lat]);
  console.log(`[Traccar Protocol Ingestion] Position GPS réelle enregistrée pour User ${userId}: [${lon}, ${lat}]`);

  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://czvhcdouuitzeqtvbnvs.supabase.co";
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_8RrC_qnaEuB2oBhQ6k3Dvg_YszYYPZS";

    // Mise à jour spatiale PostGIS dans Supabase
    fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        location: `POINT(${lon} ${lat})`
      })
    }).catch(err => console.warn('[Traccar Protocol Ingestion] Warning PATCH Supabase:', err.message));

    res.status(200).send("OK");
  } catch (error) {
    console.error("[Traccar Protocol Ingestion] Erreur mise à jour:", error.message);
    res.status(500).json({ error: error.message });
  }
});


// === RESEAU SOCIAL : CONNEXIONS ===

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://czvhcdouuitzeqtvbnvs.supabase.co";
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_8RrC_qnaEuB2oBhQ6k3Dvg_YszYYPZS";

const supabaseHeaders = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`
};

// POST /api/social/connect — Envoie une demande de connexion
app.post("/api/social/connect", async (req, res) => {
  const { requesterId, targetId } = req.body;
  if (!requesterId || !targetId) {
    return res.status(400).json({ error: "requesterId et targetId sont requis" });
  }
  if (requesterId === targetId) {
    return res.status(400).json({ error: "Impossible de se connecter a soi-meme" });
  }
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/social_connections`, {
      method: "POST",
      headers: { ...supabaseHeaders, "Prefer": "return=representation" },
      body: JSON.stringify({ requester_id: requesterId, target_id: targetId, status: "pending" })
    });
    if (response.ok) {
      const data = await response.json();
      console.log(`[Social] Demande de connexion: ${requesterId} -> ${targetId}`);
      return res.json({ success: true, connection: data[0] });
    }
    const err = await response.text();
    // Connexion deja existante (contrainte UNIQUE)
    if (err.includes("duplicate") || err.includes("unique")) {
      return res.json({ success: true, already_exists: true });
    }
    res.status(response.status).json({ error: err });
  } catch (error) {
    console.error("[Social] Erreur connect:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/social/connections?userId= — Retourne les connexions acceptees
app.get("/api/social/connections", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId requis" });
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/social_connections?or=(requester_id.eq.${userId},target_id.eq.${userId})&status=eq.accepted`,
      { headers: supabaseHeaders }
    );
    const data = await r.json();
    return res.json({ connections: Array.isArray(data) ? data : [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/social/pending?userId= — Demandes en attente recues
app.get("/api/social/pending", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId requis" });
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/social_connections?target_id=eq.${userId}&status=eq.pending`,
      { headers: supabaseHeaders }
    );
    const data = await r.json();
    return res.json({ pending: Array.isArray(data) ? data : [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/social/connect/:id — Accepte ou rejette une demande
app.patch("/api/social/connect/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "accepted" | "rejected"
  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status doit etre accepted ou rejected" });
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/social_connections?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...supabaseHeaders, "Prefer": "return=representation" },
      body: JSON.stringify({ status })
    });
    const data = await r.json();
    return res.json({ success: true, connection: data[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === LIVEKIT : GENERATION DE TOKEN JWT ===
// GET /api/livekit/token?room=&userId=&userName=
app.get("/api/livekit/token", async (req, res) => {
  const { room, userId, userName } = req.query;
  if (!room || !userId) {
    return res.status(400).json({ error: "room et userId sont requis" });
  }

  const LIVEKIT_API_KEY    = process.env.LIVEKIT_API_KEY    || "devkey";
  const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "devsecret";

  try {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: userId,
      name: userName || userId,
      ttl: "4h"
    });
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();
    console.log(`[LiveKit] Token genere pour ${userId} dans room ${room}`);
    res.json({ token, room, livekit_url: process.env.LIVEKIT_URL || "ws://localhost:7880" });
  } catch (error) {
    console.error("[LiveKit] Erreur token:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Le backend Dieu et Moi tourne sur http://localhost:${PORT}`);
});

