/**
 * Brique 2 : BiblicalSearchAgent (Agent Indexeur de Passages Bibliques)
 * Utilise un outil de recherche web (Jina Reader) + LLM pour identifier le personnage
 * et la liste exacte des chapitres/pages du début à la fin de son histoire.
 */

export interface BibleStoryIndex {
  character: string;
  book: string;
  startChapter: number;
  endChapter: number;
  chapters: number[];
}

const HF_API_KEY = process.env.EXPO_PUBLIC_HF_API_KEY || process.env.EXPO_PUBLIC_SIMULATOR_HF_KEY || '';
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_MODEL = 'google/gemma-3-12b-it';

const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

const INDEXER_SYSTEM_PROMPT = `Tu es un indexeur canonique neutre et précis de la Bible Louis Segond.
Ton unique rôle est d'analyser les résultats de recherche web et la requête pour identifier le personnage principal, le livre de la Bible exact en français, et la liste ordonnée des numéros de chapitres clés du commencement à la fin de son histoire.

Tu ne dois rédiger AUCUN résumé ni inventer de titre. Tu dois répondre STRICTEMENT sous forme de JSON brut respectant cette structure exacte :

{
  "character": "Nom du personnage",
  "book": "Nom exact du livre en français (ex: Genèse, Job, Ruth, 1 Samuel, Esther, etc.)",
  "startChapter": 37,
  "endChapter": 45,
  "chapters": [37, 39, 40, 41, 42, 43, 44, 45]
}`;

/**
 * Brique 2 : Point d'entrée de l'Agent de recherche et d'indexation
 */
export async function searchBiblicalPassages(searchQuery: string): Promise<BibleStoryIndex> {
  console.log(`[SearchAgent] 2. Agent de recherche dynamique en action pour : "${searchQuery}"...`);

  // 2. Essai via le backend Node.js dédié (avec le vrai Jina Reader & Playwright)
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/search-passages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchQuery })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.character && data.book && Array.isArray(data.chapters)) {
        console.log(`[SearchAgent] Indexation réussie via le backend dédié : ${data.character}`);
        return data as BibleStoryIndex;
      }
    }
  } catch (err: any) {
    console.warn('[SearchAgent] Backend non disponible, bascule sur le secours client direct :', err?.message);
  }

  // 3. Secours client direct (sans le backend)
  let searchMarkdown = "";
  try {
    const jinaUrl = `https://s.jina.ai/${encodeURIComponent(searchQuery)}`;
    const searchRes = await fetch(jinaUrl, {
      headers: { "Accept": "text/plain" },
    });
    if (searchRes.ok) {
      searchMarkdown = await searchRes.text();
    }
  } catch (err: any) {
    console.warn('[SearchAgent] Échec de la recherche web Jina secours :', err?.message);
  }

  if (searchMarkdown) {
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
            { role: 'system', content: INDEXER_SYSTEM_PROMPT },
            { role: 'user', content: `Résultats de recherche web :\n\n${searchMarkdown.substring(0, 5000)}\n\nRequête : "${searchQuery}"` },
          ],
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const resJson = await response.json();
        const rawText = resJson?.choices?.[0]?.message?.content?.trim();

        if (rawText) {
          function extractJson(text: string): string {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1 && end > start) {
              return text.substring(start, end + 1);
            }
            return text;
          }

          const parsed = JSON.parse(extractJson(rawText)) as BibleStoryIndex;
          if (parsed.character && parsed.book && Array.isArray(parsed.chapters)) {
            return parsed;
          }
        }
      }
    } catch (err: any) {
      console.warn('[SearchAgent] Échec de l\'indexation LLM secours :', err?.message);
    }
  }

  throw new Error("L'Agent de Recherche n'a pas pu identifier le récit biblique correspondant.");
}
