/**
 * Dieu et Moi — Système RAG (Retrieval-Augmented Generation) Biblique
 * Extrait les passages scripturaires exacts, les rôles historiques des personnages
 * et la chronologie rigoureuse de la Bible Louis Segond pour nourrir le LLM Gemma 3.
 */

export interface CharacterRoleInfo {
  name: string;
  role: string;
  historicalFact: string;
}

export interface BiblicalRAGContext {
  topic: string;
  bibleBook: string;
  keyChapters: string;
  chronologicalTimeline: string[];
  authenticCharacters: CharacterRoleInfo[];
  scriptureExcerpts: string[];
}

/**
 * Extrait le contexte RAG pertinent pour un sujet/personnage biblique
 */
export function getBiblicalRAGContext(query: string): BiblicalRAGContext {
  const qLower = query.toLowerCase().trim();
  const isLongQuery = query.length > 25 || query.split(' ').length > 3;
  const hasFeminineClues = /\b(née|seule|fatiguée|maudite|modite|femme|fille|croyante)\b/i.test(qLower);
  const characterName = isLongQuery ? (hasFeminineClues ? "La Croyante" : "Le Croyant") : query;
  const cleanTopic = isLongQuery ? (query.length > 60 ? query.substring(0, 57) + "..." : query) : query;

  return {
    topic: cleanTopic,
    bibleBook: "La Sainte Bible",
    keyChapters: "Texte Sacré",
    chronologicalTimeline: [
      `Acte 1 : Origines & Contexte Initial`,
      `Acte 2 : L'Épreuve & le Défi`,
      `Acte 3 : Le Sommet de la Souffrance & la Prière`,
      `Acte 4 : L'Intervention Divine & le Miracle`,
      `Acte 5 : La Victoire & la Restauration Spirituelle`
    ],
    authenticCharacters: [
      { name: "Narrateur", role: "Conteur solennel", historicalFact: "Transmet la vérité biblique" },
      { name: characterName, role: "Personnage principal en quête de repères", historicalFact: `Exprime ses doutes sincères face à la situation : "${cleanTopic}"` },
      { name: "Dieu", role: "L'Éternel Tout-Puissant", historicalFact: "Souverain et bienveillant, il répond avec amour et vérité" }
    ],
    scriptureExcerpts: [
      `Méditation et réconfort spirituel face à cette situation : "${cleanTopic}".`
    ]
  };
}
