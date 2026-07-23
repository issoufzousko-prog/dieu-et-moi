/**
 * MasterPipeline : Chef d'Orchestre du Pipeline en 4 Briques
 * 1. Analyse d'intention & Embedding (intentAnalyzer.ts)
 * 2. Agent de recherche d'indexation web (searchAgent.ts)
 * 3. Extracteur & Scorer vectoriel de pages (scriptureExtractor.ts)
 * 4. Reformulateur itératif page par page (pageByPageStoryEngine.ts)
 */

import { analyzeUserIntent, UserIntentProfile } from './intentAnalyzer';
import { searchBiblicalPassages, BibleStoryIndex } from './searchAgent';
import { extractScripturePages, ScripturePageBatch } from './scriptureExtractor';
import { generateFullScriptureStory } from './pageByPageStoryEngine';
import { BiblicalStory } from '../audioStoryData';

export async function runMasterBiblicalPipeline(userPrompt: string): Promise<BiblicalStory> {
  console.log(`[MasterPipeline] === DÉBUT DU PIPELINE EN 4 BRIQUES POUR : "${userPrompt}" ===`);

  // Brique 1 : Compréhension du fond & Embedding
  const intentProfile: UserIntentProfile = await analyzeUserIntent(userPrompt);
  console.log(`[MasterPipeline] Brique 1 terminée : Émotion = "${intentProfile.analysis.primaryEmotion}"`);

  // Brique 2 : Agent de Recherche & Indexation Canonique
  const storyIndex: BibleStoryIndex = await searchBiblicalPassages(intentProfile.searchQueryForAgent);
  console.log(`[MasterPipeline] Brique 2 terminée : Personnage = "${storyIndex.character}" (${storyIndex.book} ${storyIndex.startChapter}-${storyIndex.endChapter})`);

  // Brique 3 : Extraction & Scoring Vectoriel des Pages
  const pageBatch: ScripturePageBatch = await extractScripturePages(storyIndex, intentProfile.embedding);
  console.log(`[MasterPipeline] Brique 3 terminée : ${pageBatch.totalPages} pages extraites depuis lsg.json`);

  // Brique 4 : Génération itérative page par page & Assemblage
  const finalStory: BiblicalStory = await generateFullScriptureStory(pageBatch, intentProfile);
  console.log(`[MasterPipeline] === PIPELINE TERMINÉ AVEC SUCCÈS : ${finalStory.narrationModes.dramatic.length} répliques générées ===`);

  return finalStory;
}
