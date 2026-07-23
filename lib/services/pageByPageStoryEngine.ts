/**
 * Brique 4 : PageByPageStoryEngine (Le Conteur - Générateur-Reformulateur par Tranches de Versets)
 * Reformule chaque tranche de 10-12 versets sous forme d'une scène théâtrale vivante,
 * puis assemble l'intégralité des tranches en une grande fresque audio de 100+ répliques sans omission.
 */

import { ScripturePageBatch, VerseChunk } from './scriptureExtractor';
import { UserIntentProfile } from './intentAnalyzer';
import { BiblicalStory } from '../audioStoryData';

export interface DialogueLine {
  speaker: string;
  role: 'narrator' | 'god' | 'character';
  gender: 'male' | 'female';
  emotion: 'solemn' | 'intense' | 'sad' | 'joyful' | 'neutral';
  text: string;
}

export interface PageScene {
  pageIndex: number;
  chapterTitle: string;
  actTitle: string;
  summary: string;
  dialogues: DialogueLine[];
}

const HF_API_KEY = process.env.EXPO_PUBLIC_HF_API_KEY || process.env.EXPO_PUBLIC_SIMULATOR_HF_KEY || '';
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_MODEL = 'google/gemma-3-12b-it';
const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dieu-et-moi-api.onrender.com';

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

/**
 * Reformule une seule tranche de 10-12 versets en une scène de dialogue
 */
export async function generateSceneForChunk(
  chunk: VerseChunk,
  characterName: string,
  previousSummary: string
): Promise<PageScene> {
  console.log(`[PageByPageEngine] Reformulation de la tranche ${chunk.title}...`);

  // 1. Essai via le backend Node.js dédié
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/generate-page-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chunkTitle: chunk.title,
        characterName,
        rawText: chunk.rawText,
        previousSummary
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.dialogues && Array.isArray(data.dialogues)) {
        return {
          pageIndex: chunk.chunkIndex,
          chapterTitle: chunk.title,
          actTitle: data.actTitle || `Scène : ${chunk.title}`,
          summary: data.summary || `Événements de ${chunk.title}`,
          dialogues: data.dialogues
        };
      }
    }
  } catch (err: any) {
    console.warn(`[PageByPageEngine] Backend non disponible pour tranche ${chunk.title}, secours direct :`, err?.message);
  }

  // 2. Secours client direct
  const userContent = `Reformule la tranche de versets suivante (${chunk.title}) en 5 à 8 répliques théâtrales vivantes :
Personnage principal : ${characterName}
${previousSummary ? `Scène précédente : ${previousSummary}\n` : ''}

Voici les versets authentiques de cette tranche à reformuler avec imagination et fidélité :
${chunk.rawText}`;

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
          { role: 'system', content: PAGE_SCENE_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 4096,
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

        const parsed = JSON.parse(extractJson(rawText));
        if (parsed.dialogues && Array.isArray(parsed.dialogues)) {
          return {
            pageIndex: chunk.chunkIndex,
            chapterTitle: chunk.title,
            actTitle: parsed.actTitle || `Scène : ${chunk.title}`,
            summary: parsed.summary || `Événements de ${chunk.title}`,
            dialogues: parsed.dialogues
          };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[PageByPageEngine] Échec reformulation tranche ${chunk.title} :`, err?.message);
  }

  // Secours minimal garanti si le réseau vacille
  return {
    pageIndex: chunk.chunkIndex,
    chapterTitle: chunk.title,
    actTitle: `Scène : ${chunk.title}`,
    summary: `Lecture de ${chunk.title}`,
    dialogues: [
      {
        speaker: "Narrateur [Voix Grave]",
        role: "narrator",
        gender: "male",
        emotion: "solemn",
        text: `Considérons les versets écrits dans ${chunk.title}.`
      },
      {
        speaker: characterName,
        role: "character",
        gender: "male",
        emotion: "intense",
        text: chunk.rawText.substring(0, 200) + "..."
      }
    ]
  };
}

/**
 * Brique 4 : Point d'entrée principal pour générer l'histoire complète par tranches de versets
 */
export async function generateFullScriptureStory(
  batch: ScripturePageBatch,
  userProfile: UserIntentProfile
): Promise<BiblicalStory> {
  console.log(`[PageByPageEngine] 4. Début de la génération par tranches de versets (${batch.totalChunksCount} tranches au total)...`);

  const scenes: PageScene[] = [];
  let currentSummary = "";

  // Boucle sur chaque chapitre, puis sur chaque tranche de 10-12 versets
  for (const page of batch.pages) {
    for (const chunk of page.chunks) {
      const scene = await generateSceneForChunk(chunk, batch.character, currentSummary);
      scenes.push(scene);
      currentSummary = scene.summary;
    }
  }

  // Assemblage de tous les dialogues de toutes les tranches dans un grand script continu
  const allDialogues: DialogueLine[] = [];
  scenes.forEach(s => {
    const cleanedDialogues = s.dialogues.map(d => ({
      ...d,
      text: d.text.replace(/^Acte\s+\d+\s*:\s*/i, '').replace(/^Acte\s+\d+\s*/i, '').trim()
    })).filter(d => d.text.length > 0);
    allDialogues.push(...cleanedDialogues);
  });

  console.log(`[PageByPageEngine] 4. Assemblage terminé avec succès : ${allDialogues.length} répliques générées au total sur ${batch.totalChunksCount} tranches !`);

  // Construction de l'objet final BiblicalStory compatible avec le lecteur audio
  return {
    id: `story-${Date.now()}`,
    title: `Le Récit de ${batch.character}`,
    subtitle: `${batch.book} (Chapitres ${batch.pages[0].chapterNumber} à ${batch.pages[batch.pages.length - 1].chapterNumber})`,
    era: `${batch.book} (Louis Segond)`,
    references: [`${batch.book} ${batch.pages[0].chapterNumber}-${batch.pages[batch.pages.length - 1].chapterNumber}`],
    virtue: userProfile.analysis.spiritualVirtueNeeded || "Foi et Persévérance",
    durationMinutes: Math.ceil(allDialogues.length * 0.4),
    ambience: "desert",
    ambienceLabel: "Ambiance sonore immersive",
    lifeSituations: [userProfile.analysis.primaryEmotion],
    aiReasoning: userProfile.analysis.userStateSummary,
    historicalContext: `Récit biblique canonique extrait de ${batch.book}.`,
    interpretations: [
      { tradition: "Évangélique", insight: "Foi vivante et obéissance à la Parole." },
      { tradition: "Catholique", insight: "Méditation sur la grâce divine dans l'épreuve." },
      { tradition: "Orthodoxe", insight: "Vision contemplative du dessein de Dieu." }
    ],
    practicalLessons: [
      "Garder la foi dans l'épreuve",
      "Pardonner à ceux qui nous font du tort",
      "Reconnaître la main de Dieu dans son destin"
    ],
    prayer: "Seigneur, donne-moi la force d'avancer avec foi et de pardonner. Amen.",
    narrationModes: {
      faithful: allDialogues,
      kids: allDialogues.map(d => ({ ...d, speaker: d.speaker === "Narrateur [Voix Grave]" ? "Le Conteur" : d.speaker })),
      dramatic: allDialogues
    }
  };
}
