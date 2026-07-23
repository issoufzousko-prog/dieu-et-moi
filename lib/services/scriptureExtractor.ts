/**
 * Brique 3 : ScripturePageExtractor (Extracteur & Scorer Vectoriel avec Découpage par Tranches de Versets)
 * Découpe chaque chapitre en tranches de 10 à 12 versets pour garantir une densité narrative maximale sans omission.
 */

import { getChapter, allBooks } from '../bible';
import { BibleStoryIndex } from './searchAgent';

export interface VerseWithEmbedding {
  number: number;
  text: string;
  similarityScore: number;
  isCoreVerse: boolean;
}

export interface VerseChunk {
  chunkIndex: number;
  startVerse: number;
  endVerse: number;
  title: string;
  totalVerses: number;
  averageRelevance: number;
  verses: VerseWithEmbedding[];
  rawText: string;
}

export interface ScripturePage {
  pageIndex: number;
  book: string;
  chapterNumber: number;
  title: string;
  chunks: VerseChunk[];
}

export interface ScripturePageBatch {
  character: string;
  book: string;
  totalPages: number;
  totalChunksCount: number;
  pages: ScripturePage[];
}

const CHUNK_SIZE = 12; // Taille maximale d'une tranche de versets

/**
 * Calcul de similarité cosinus entre deux vecteurs d'embeddings
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0.5;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0.5;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getQuickTextVector(text: string, size: number): number[] {
  const vec = new Array(size).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % size] += text.charCodeAt(i) / 255.0;
  }
  return vec;
}

/**
 * Brique 3 : Extraction et découpage en tranches de versets (10-12 versets par chunk)
 */
export async function extractScripturePages(
  index: BibleStoryIndex,
  userEmbedding?: number[]
): Promise<ScripturePageBatch> {
  console.log(`[ScriptureExtractor] 3. Extraction par tranches de versets pour ${index.character} (${index.book} - ${index.chapters.length} chapitres)...`);

  const matchingBook = allBooks.find(
    b => b.Text.toLowerCase().replace(/é|è/g, 'e') === index.book.toLowerCase().replace(/é|è/g, 'e')
  );

  if (!matchingBook) {
    throw new Error(`Livre introuvable dans la base de données locale : "${index.book}"`);
  }

  const pages: ScripturePage[] = [];
  let globalChunksCount = 0;

  for (let idx = 0; idx < index.chapters.length; idx++) {
    const chNum = index.chapters[idx];
    try {
      const chapterData = getChapter(matchingBook.Text, chNum);
      const allVerses: VerseWithEmbedding[] = [];

      // 1. Scoring vectoriel de chaque verset
      chapterData.verses.forEach((v) => {
        let score = 0.5;
        if (userEmbedding && userEmbedding.length > 0) {
          const verseVec = getQuickTextVector(v.text, userEmbedding.length);
          score = Math.max(0.1, Math.min(0.99, cosineSimilarity(userEmbedding, verseVec)));
        }

        allVerses.push({
          number: v.number,
          text: v.text,
          similarityScore: parseFloat(score.toFixed(3)),
          isCoreVerse: score > 0.65
        });
      });

      // 2. Découpage du chapitre en tranches de 10-12 versets maximum
      const chunks: VerseChunk[] = [];
      for (let i = 0; i < allVerses.length; i += CHUNK_SIZE) {
        const chunkVerses = allVerses.slice(i, i + CHUNK_SIZE);
        const startV = chunkVerses[0].number;
        const endV = chunkVerses[chunkVerses.length - 1].number;
        const avgScore = chunkVerses.reduce((acc, curr) => acc + curr.similarityScore, 0) / chunkVerses.length;
        const rawFormattedText = chunkVerses.map(v => `${v.number}. ${v.text}`).join(' ');

        globalChunksCount++;
        chunks.push({
          chunkIndex: chunks.length + 1,
          startVerse: startV,
          endVerse: endV,
          title: `${matchingBook.Text} ${chNum}:${startV}-${endV}`,
          totalVerses: chunkVerses.length,
          averageRelevance: parseFloat(avgScore.toFixed(3)),
          verses: chunkVerses,
          rawText: rawFormattedText
        });
      }

      pages.push({
        pageIndex: idx + 1,
        book: matchingBook.Text,
        chapterNumber: chNum,
        title: `${matchingBook.Text} - Chapitre ${chNum}`,
        chunks
      });

    } catch (err: any) {
      console.warn(`[ScriptureExtractor] Erreur extraction chapitre ${chNum} de ${matchingBook.Text} :`, err?.message);
    }
  }

  if (pages.length === 0) {
    throw new Error(`Aucune page biblique n'a pu être extraite pour ${index.character} dans ${index.book}.`);
  }

  console.log(`[ScriptureExtractor] 3. Extraction terminée avec succès : ${pages.length} chapitres découpés en ${globalChunksCount} tranches de versets.`);

  return {
    character: index.character,
    book: matchingBook.Text,
    totalPages: pages.length,
    totalChunksCount: globalChunksCount,
    pages
  };
}
