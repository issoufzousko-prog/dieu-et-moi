/**
 * Dieu et Moi — Données de la Chronologie Biblique & Catalogue des 60 Personnages
 * Tous les scripts de récits sont désormais générés DYNAMISQUEMENT par le LLM Gemma 3 (Hugging Face Router) 
 * avec des dialogues épiques, profonds et multi-scènes. Aucun texte de secours n'est codé en dur.
 */

export interface CharacterDialogue {
  speaker: string;
  role: 'narrator' | 'god' | 'character';
  text: string;
  gender?: 'female' | 'male';
  emotion?: string;
}

export interface BiblicalStory {
  id: string;
  title: string;
  subtitle: string;
  era: string;
  references: string[];
  virtue: string;
  durationMinutes: number;
  ambience: 'desert' | 'sea' | 'temple' | 'battle' | 'palace' | 'peaceful';
  ambienceLabel: string;
  lifeSituations: string[];
  aiReasoning: string;
  historicalContext: string;
  interpretations: { tradition: 'Évangélique' | 'Catholique' | 'Orthodoxe'; insight: string }[];
  practicalLessons: string[];
  prayer: string;
  narrationModes: {
    faithful: CharacterDialogue[];
    kids: CharacterDialogue[];
    dramatic: CharacterDialogue[];
  };
}

export interface CharacterCategory {
  id: string;
  title: string;
  characters: string[];
}

export const BIBLICAL_CHARACTERS_CATALOG: CharacterCategory[] = [
  {
    id: 'creation',
    title: 'Création et Origines',
    characters: ['Dieu / Yahvé', 'Adam', 'Ève', 'Caïn', 'Abel', 'Seth', 'Noé', 'Sem', 'Cham', 'Japhet'],
  },
  {
    id: 'patriarchs',
    title: 'Les Patriarches',
    characters: ['Abraham', 'Sarah', 'Lot', 'Agar', 'Isaac', 'Rebecca', 'Jacob / Israël', 'Léa', 'Rachel', 'Joseph', 'Juda', 'Tamar'],
  },
  {
    id: 'exodus',
    title: 'L\'Exode et le Désert',
    characters: ['Moïse', 'Aaron', 'Myriam', 'Pharaon', 'Josué', 'Caleb'],
  },
  {
    id: 'judges_kings',
    title: 'Les Juges et les Rois',
    characters: ['Gédéon', 'Samson', 'Samuel', 'Saül', 'David', 'Jonathan', 'Goliath', 'Salomon', 'Bethsabée', 'Absalom', 'Roboam', 'Jéroboam'],
  },
  {
    id: 'juda_israel_kings',
    title: 'Les Rois de Juda et d\'Israël',
    characters: ['Ézéchias', 'Josias', 'Nebucadnetsar'],
  },
  {
    id: 'prophets',
    title: 'Les Prophètes Majeurs',
    characters: ['Élie', 'Élisée', 'Isaïe', 'Jérémie', 'Ézéchiel', 'Daniel'],
  },
  {
    id: 'exile',
    title: 'Exil et Retour',
    characters: ['Esther', 'Mardochée', 'Esdras', 'Néhémie'],
  },
  {
    id: 'others',
    title: 'Autres Personnages Clés',
    characters: ['Job', 'Ruth', 'Boaz', 'Naomie', 'Jonas', 'Balaam', 'Melchisédek'],
  },
];

export const BIBLICAL_STORIES: BiblicalStory[] = [];
