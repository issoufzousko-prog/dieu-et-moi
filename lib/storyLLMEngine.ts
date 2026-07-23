/**
 * Moteur D'Inférence de Récits Bibliques (Supabase Edge Function Agent & Gemma 2 27B)
 * Gère l'appel à la fonction d'inférence sécurisée et le RAG décentralisé en secours.
 */

import { BiblicalStory } from './audioStoryData';
import { getChapter, allBooks } from './bible';
import { supabase } from './supabase';
import { StoryModelfile } from './StoryModelfile';

const HF_API_KEY = process.env.EXPO_PUBLIC_HF_API_KEY || process.env.EXPO_PUBLIC_SIMULATOR_HF_KEY || '';
const HF_MODEL = 'google/gemma-3-12b-it';
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';

interface BiblicalSelectorResult {
  character: string;
  book: string;
  chapters: number[];
}

/**
 * Sélecteur biblique local (utilisé uniquement en cas de secours complet hors-ligne)
 */
async function selectBiblicalReferenceOffline(query: string): Promise<BiblicalSelectorResult | null> {
  const systemPrompt = `Tu es un indexeur de récits bibliques. Détermine le personnage et les chapitres correspondants à : "${query}". Réponds uniquement par JSON brut : { "character": "...", "book": "...", "chapters": [1, 2] }`;
  try {
    const response = await fetch(HF_ROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }],
        temperature: 0.1,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content?.trim();
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(rawText.substring(start, end + 1)) as BiblicalSelectorResult;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Fonction de secours direct en cas de panne de Supabase
 */
async function generateStoryDirectFallback(params: {
  characterOrTopic: string;
  narrationMode?: 'faithful' | 'kids' | 'dramatic';
  lifeSituation?: string;
}): Promise<BiblicalStory> {
  console.log('[StoryLLMEngine] Mode secours local activé...');
  const searchQuery = params.characterOrTopic || params.lifeSituation || '';
  const selector = await selectBiblicalReferenceOffline(searchQuery);
  
  let extractedScriptures = "";
  if (selector && selector.book && selector.chapters) {
    const bookName = selector.book;
    const matchingBook = allBooks.find(
      b => b.Text.toLowerCase().replace(/é|è/g, 'e') === bookName.toLowerCase().replace(/é|è/g, 'e')
    );
    if (matchingBook) {
      for (const chNum of selector.chapters) {
        try {
          const chapterData = getChapter(matchingBook.Text, chNum);
          extractedScriptures += `\n[EXTRAIT DE ${matchingBook.Text} CHAPITRE ${chNum}]\n${chapterData.text.substring(0, 2000)}\n`;
        } catch (e) {
          // Ignorer
        }
      }
    }
  }

  const systemPrompt = StoryModelfile.buildSystemPrompt(params.characterOrTopic, params.lifeSituation);
  let userContent = `Génère le récit complet en 5 Actes pour : "${params.characterOrTopic}".\n`;
  if (extractedScriptures) {
    userContent += `\nVoici les EXTRAITS RÉELS DE LA BIBLE :\n${extractedScriptures}`;
  }

  const response = await fetch(HF_ROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HF_API_KEY}`,
    },
    body: JSON.stringify({
      model: StoryModelfile.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: StoryModelfile.PARAMETERS.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erreur du service de secours LLM (${response.status})`);
  }

  const resultData = await response.json();
  const rawText = resultData?.choices?.[0]?.message?.content?.trim();
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(rawText.substring(start, end + 1)) as BiblicalStory;
  }
  throw new Error("Format JSON invalide en mode secours.");
}

import { runMasterBiblicalPipeline } from './services/masterPipeline';

/**
 * Point d'entrée principal : Exécute le Master Pipeline en 4 Briques
 */
export async function generateStoryWithGemini(params: {
  characterOrTopic: string;
  narrationMode?: 'faithful' | 'kids' | 'dramatic';
  lifeSituation?: string;
  durationMinutes?: number;
  virtue?: string;
}): Promise<BiblicalStory> {
  const searchQuery = params.characterOrTopic || params.lifeSituation || '';
  
  try {
    console.log(`[StoryLLMEngine] Lancement du Master Pipeline en 4 Briques pour "${searchQuery}"...`);
    const story = await runMasterBiblicalPipeline(searchQuery);
    return story;
  } catch (err: any) {
    console.warn('[StoryLLMEngine] Master Pipeline direct en mode secours client :', err?.message);
    return generateStoryDirectFallback(params);
  }
}
