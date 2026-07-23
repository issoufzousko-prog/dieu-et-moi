/**
 * Brique 1 : UserIntentAnalyzer (Analyse de l'intention & Embedding)
 * Reçoit la demande utilisateur, génère son embedding et extrait son profil émotionnel & théologique.
 */

export interface UserIntentProfile {
  rawPrompt: string;
  embedding: number[];
  analysis: {
    userStateSummary: string;
    primaryEmotion: string;
    secondaryEmotion: string;
    coreKeywords: string[];
    spiritualVirtueNeeded: string;
  };
  searchQueryForAgent: string;
}

const HF_API_KEY = process.env.EXPO_PUBLIC_HF_API_KEY || '';
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_MODEL = 'google/gemma-3-12b-it';

export const INTENT_ANALYZER_SYSTEM_PROMPT = `Tu es un expert en psychologie clinique, théologie et analyse sémantique des émotions humaines.
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

/**
 * Génère l'embedding vectoriel (1024D ou 384D) du prompt via HuggingFace Feature Extraction ou secours local
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-m3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        return Array.isArray(data[0]) ? data[0] : data;
      }
    }
  } catch (err) {
    console.warn('[IntentAnalyzer] Échec génération embedding HF, secours par défaut vectoriel :', err);
  }

  const dummyEmbedding: number[] = new Array(128).fill(0);
  for (let i = 0; i < text.length; i++) {
    dummyEmbedding[i % 128] += text.charCodeAt(i) / 255.0;
  }
  return dummyEmbedding;
}

const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dieu-et-moi-api.onrender.com';

/**
 * Brique 1 : Point d'entrée principal pour analyser la demande utilisateur
 */
export async function analyzeUserIntent(rawPrompt: string): Promise<UserIntentProfile> {
  console.log(`[IntentAnalyzer] 1. Analyse du fond pour : "${rawPrompt}"...`);

  // 1. Essai via le backend Node.js dédié
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/analyze-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawPrompt })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.analysis && data.embedding) {
        console.log('[IntentAnalyzer] Analyse d\'intention réussie via le backend dédié.');
        return data as UserIntentProfile;
      }
    }
  } catch (err: any) {
    console.warn('[IntentAnalyzer] Backend non disponible, bascule sur le secours client direct :', err?.message);
  }

  // 2. Bascule en secours client direct
  const embeddingPromise = generateEmbedding(rawPrompt);

  try {
    const response = await fetch(HF_ROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [
          { role: 'system', content: INTENT_ANALYZER_SYSTEM_PROMPT },
          { role: 'user', content: `Analyse cette situation utilisateur : "${rawPrompt}"` },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP HF Router: ${response.status}`);
    }

    const resJson = await response.json();
    const rawText = resJson?.choices?.[0]?.message?.content?.trim();
    
    if (!rawText) {
      throw new Error("Réponse LLM vide.");
    }

    function extractJson(text: string): string {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        return text.substring(start, end + 1);
      }
      return text;
    }

    const parsed = JSON.parse(extractJson(rawText));
    const searchQueryForAgent = parsed.searchQueryForAgent || parsed.query || `histoire complète personnage biblique Louis Segond : ${rawPrompt}`;

    const embedding = await embeddingPromise;

    return {
      rawPrompt,
      embedding,
      analysis: {
        userStateSummary: parsed.userStateSummary || "Analyse sémantique de la situation de foi",
        primaryEmotion: parsed.primaryEmotion || "Épreuve",
        secondaryEmotion: parsed.secondaryEmotion || "Foi",
        coreKeywords: parsed.coreKeywords || ["Épreuve", "Foi"],
        spiritualVirtueNeeded: parsed.spiritualVirtueNeeded || "Persévérance et Foi"
      },
      searchQueryForAgent
    };

  } catch (err: any) {
    console.error('[IntentAnalyzer] Échec complet de l\'analyse d\'intention :', err?.message);
    throw err;
  }
}
