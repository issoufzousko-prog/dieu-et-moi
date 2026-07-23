import bibleData from '@/assets/bible/lsg.json';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';

export interface Verse {
  Text: string;
}

export interface Chapter {
  Verses: Verse[];
}

export interface Book {
  Text: string;
  Chapters: Chapter[];
}

export interface Testament {
  Books: Book[];
}

export interface BibleData {
  Abbreviation: string;
  Language: string;
  Testaments: Testament[];
}

const bible = bibleData as BibleData;

// Liste plate de tous les livres de la Bible
export const allBooks: Book[] = [];
bible.Testaments.forEach(t => {
  allBooks.push(...t.Books);
});

// Références de versets inspirants pour le "Verset du Jour" (VerseCard)
const INSSPIRING_VERSES = [
  { book: 'Jean', chapter: 3, verse: 16 },
  { book: 'Philippiens', chapter: 4, verse: 6 },
  { book: 'Philippiens', chapter: 4, verse: 13 },
  { book: 'Romains', chapter: 8, verse: 28 },
  { book: 'Psaumes', chapter: 23, verse: 1 },
  { book: 'Josué', chapter: 1, verse: 9 },
  { book: 'Proverbes', chapter: 3, verse: 5 },
  { book: 'Romains', chapter: 12, verse: 2 },
  { book: 'Ésaïe', chapter: 40, verse: 31 },
  { book: 'Matthieu', chapter: 6, verse: 33 },
  { book: 'Psaumes', chapter: 119, verse: 105 },
  { book: 'Romains', chapter: 15, verse: 13 },
  { book: 'Jean', chapter: 14, verse: 27 },
  { book: 'Ésaïe', chapter: 41, verse: 10 },
  { book: 'Proverbes', chapter: 3, verse: 6 },
  { book: 'Galates', chapter: 5, verse: 22 },
  { book: 'Jérémie', chapter: 29, verse: 11 },
  { book: 'Psaumes', chapter: 46, verse: 2 },
  { book: 'Matthieu', chapter: 11, verse: 28 },
  { book: 'Hébreux', chapter: 11, verse: 1 },
  { book: '1 Corinthiens', chapter: 13, verse: 13 },
  { book: '2 Timothée', chapter: 1, verse: 7 },
  { book: 'Éphésiens', chapter: 2, verse: 8 },
  { book: 'Romains', chapter: 8, verse: 31 },
  { book: '1 Jean', chapter: 4, verse: 19 },
  { book: 'Psaumes', chapter: 37, verse: 4 },
  { book: 'Psaumes', chapter: 121, verse: 2 },
  { book: 'Matthieu', chapter: 28, verse: 20 },
  { book: 'Proverbes', chapter: 16, verse: 3 },
  { book: '1 Pierre', chapter: 5, verse: 7 }
];

// Références de versets d'encouragement courts pour l'En-tête (HeroHeader)
const HEADER_VERSES = [
  { book: 'Psaumes', chapter: 119, verse: 105 },
  { book: 'Psaumes', chapter: 23, verse: 3 },
  { book: 'Psaumes', chapter: 121, verse: 8 },
  { book: 'Psaumes', chapter: 27, verse: 1 },
  { book: 'Psaumes', chapter: 46, verse: 1 },
  { book: 'Psaumes', chapter: 28, verse: 7 },
  { book: 'Proverbes', chapter: 18, verse: 10 },
  { book: 'Psaumes', chapter: 18, verse: 2 },
  { book: 'Ésaïe', chapter: 26, verse: 3 },
  { book: 'Psaumes', chapter: 34, verse: 8 },
  { book: 'Psaumes', chapter: 139, verse: 14 },
  { book: 'Jean', chapter: 8, verse: 12 },
  { book: 'Psaumes', chapter: 118, verse: 24 },
  { book: 'Psaumes', chapter: 16, verse: 11 }
];

/**
 * Retourne le jour de l'année (0 - 365) pour une date donnée
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Récupère un verset spécifique par son livre, chapitre et verset (1-based)
 */
export function getVerse(
  bookName: string,
  chapterNum: number,
  verseNum: number
): { text: string; reference: string } {
  // Recherche robuste du livre
  const book = allBooks.find(
    b => b.Text.toLowerCase().replace(/é|è/g, 'e') === bookName.toLowerCase().replace(/é|è/g, 'e')
  );
  if (!book) {
    throw new Error(`Livre introuvable dans la base de données : "${bookName}"`);
  }

  const chapter = book.Chapters[chapterNum - 1];
  if (!chapter) {
    throw new Error(`Chapitre introuvable dans le livre ${book.Text} : ${chapterNum}`);
  }

  const verse = chapter.Verses[verseNum - 1];
  if (!verse) {
    throw new Error(`Verset introuvable dans le chapitre ${book.Text} ${chapterNum} : ${verseNum}`);
  }

  return {
    text: verse.Text,
    reference: `${book.Text} ${chapterNum}:${verseNum}`
  };
}

/**
 * Récupère le verset du jour dynamiquement basé sur la date du jour (rotatif)
 */
export function getVerseOfDay(date: Date = new Date()) {
  const index = getDayOfYear(date) % INSSPIRING_VERSES.length;
  const ref = INSSPIRING_VERSES[index];
  return getVerse(ref.book, ref.chapter, ref.verse);
}

/**
 * Récupère le verset d'en-tête dynamiquement basé sur la date du jour (rotatif)
 */
export function getHeaderVerse(date: Date = new Date()) {
  const index = getDayOfYear(date) % HEADER_VERSES.length;
  const ref = HEADER_VERSES[index];
  return getVerse(ref.book, ref.chapter, ref.verse);
}

export async function fetchVerseOfDay(date: Date = new Date()): Promise<{ text: string; reference: string }> {
  const dateString = date.toDateString();
  const cacheKeyDate = '@dieu_et_moi_verse_of_day_date';
  const cacheKeyData = '@dieu_et_moi_verse_of_day_data';

  try {
    const cachedDate = await cache.getItem(cacheKeyDate);
    const cachedData = await cache.getItem(cacheKeyData);

    if (cachedDate === dateString && cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (err) {
    console.warn('Error reading daily verse cache:', err);
  }

  const dayOfYear = getDayOfYear(date);
  const targetId = (dayOfYear % 30) + 1; // rotation sur 30 jours
  
  const { data, error } = await supabase
    .from('daily_verses')
    .select('book, chapter, verse, text, reference')
    .eq('id', targetId)
    .single();
    
  if (error || !data) {
    throw new Error(error?.message || 'Aucune donnée retournée par Supabase');
  }
  
  const result = {
    text: data.text,
    reference: data.reference
  };

  try {
    await cache.setItem(cacheKeyDate, dateString);
    await cache.setItem(cacheKeyData, JSON.stringify(result));
  } catch (err) {
    console.warn('Error writing daily verse cache:', err);
  }

  return result;
}

/**
 * Récupère le verset d'en-tête depuis Supabase
 */
export async function fetchHeaderVerse(date: Date = new Date()): Promise<{ text: string; reference: string }> {
  const dateString = date.toDateString();
  const cacheKeyDate = '@dieu_et_moi_header_verse_date';
  const cacheKeyData = '@dieu_et_moi_header_verse_data';

  try {
    const cachedDate = await cache.getItem(cacheKeyDate);
    const cachedData = await cache.getItem(cacheKeyData);

    if (cachedDate === dateString && cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (err) {
    console.warn('Error reading header verse cache:', err);
  }

  const dayOfYear = getDayOfYear(date);
  const targetId = ((dayOfYear + 5) % 30) + 1; // décalé de 5 pour varier
  
  const { data, error } = await supabase
    .from('daily_verses')
    .select('book, chapter, verse, text, reference')
    .eq('id', targetId)
    .single();
    
  if (error || !data) {
    throw new Error(error?.message || 'Aucune donnée retournée par Supabase');
  }
  
  const result = {
    text: data.text,
    reference: data.reference
  };

  try {
    await cache.setItem(cacheKeyDate, dateString);
    await cache.setItem(cacheKeyData, JSON.stringify(result));
  } catch (err) {
    console.warn('Error writing header verse cache:', err);
  }

  return result;
}

/**
 * Récupère le texte complet d'un chapitre et ses versets individuels (1-based index)
 */
export function getChapter(
  bookName: string,
  chapterNum: number
): { text: string; verses: { number: number; text: string }[] } {
  // Recherche du livre (insensible à la casse et aux accents)
  const book = allBooks.find(
    b => b.Text.toLowerCase().replace(/é|è/g, 'e') === bookName.toLowerCase().replace(/é|è/g, 'e')
  );
  if (!book) {
    throw new Error(`Livre introuvable dans la base de données : "${bookName}"`);
  }

  const chapter = book.Chapters[chapterNum - 1];
  if (!chapter) {
    throw new Error(`Chapitre introuvable dans le livre ${book.Text} : ${chapterNum}`);
  }

  return {
    text: chapter.Verses.map((v, i) => `${i + 1}. ${v.Text}`).join(' '),
    verses: chapter.Verses.map((v, i) => ({ number: i + 1, text: v.Text }))
  };
}
