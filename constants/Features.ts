import { FeatureColors } from './Colors';
import { FluentIconName } from '@/components/fluent-icons/FluentIcon';

// ─── SVG Icons ───────────────────────────────────────────
const coachIcon = require('@/assets/images/coach-icon.svg');
const jumeauIcon = require('@/assets/images/jumeau-icon.svg');
const simulationIcon = require('@/assets/images/simulation-icon.svg');
const interpretationsIcon = require('@/assets/images/interpretations-icon-v2.svg');
const traductionsIcon = require('@/assets/images/traductions-icon-v2.svg');
const languesIcon = require('@/assets/images/langues-icon-v2.svg');
const genealogieIcon = require('@/assets/images/genealogie-icon.svg');
const priereIcon = require('@/assets/images/priere-icon.svg');
const meditationIcon = require('@/assets/images/meditation-icon.svg');
const assistantIcon = require('@/assets/images/fonctionnalite-icon.svg');
const ministereIcon = require('@/assets/images/ministere-icon.svg');
const apocalypseIcon = require('@/assets/images/apocalypse-guide-icon.svg');
const predicateurIcon = require('@/assets/images/predicateur-icon.svg');
const detectionThemesIcon = require('@/assets/images/detection-themes-icon.svg');

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  badge?: string;
  fluentIcon?: FluentIconName;
  materialIcon?: string;
  imageSource?: any;
  imageSize?: number;
  tintWhite?: boolean;
  color: string;
  bgColor?: string;
  category: string;
}

export function getGradientColors(color: string): [string, string] {
  switch (color.toLowerCase()) {
    case '#223d73': // coach
      return ['#2b4880', '#101f3b'];
    case '#d7af62': // meditation
      return ['#ebc98d', '#a88139'];
    case '#264c8a': // lecture
      return ['#3b68ad', '#152f5c'];
    case '#8aa589': // journal
      return ['#a0baa0', '#638063'];
    case '#c87557': // priere / simulation / apocalypse
      return ['#e09173', '#9c4c30'];
    case '#13294b': // navy
      return ['#2c4974', '#0d1c36'];
    case '#6e9476': // exploration
      return ['#8bb393', '#4f7357'];
    case '#8b62b5': // ministere
      return ['#ab82d4', '#663f8c'];
    case '#d4a85a': // gold
      return ['#ebc073', '#a37932'];
    case '#4aa9c8': // favoris / relations
      return ['#6cc1dc', '#2d7c98'];
    case '#5078d7': // ressources
      return ['#7294e8', '#3455a8'];
    case '#3b68ad': // guide predication
      return ['#5b84c7', '#254a85'];
    default:
      return [color, color];
  }
}

export const ALL_FEATURES: FeatureItem[] = [
  // ── IA & ASSISTANCE ──
  {
    id: '1',
    title: 'Assistant biblique',
    description: "Posez vos questions à l'IA biblique",
    badge: '1',
    fluentIcon: 'chat',
    color: '#13294B',
    bgColor: '#E8EDF4',
    category: 'ia',
  },
  {
    id: '2',
    title: 'Jumeaux numérique',
    description: 'Discutez avec Moïse, David...',
    badge: '2',
    imageSource: jumeauIcon,
    imageSize: 28,
    color: '#6E9476',
    bgColor: '#E6F0E8',
    category: 'ia',
  },
  {
    id: '3',
    title: 'Simulateur historique',
    description: 'Revivez les grands récits bibliques',
    badge: '3',
    imageSource: simulationIcon,
    imageSize: 28,
    color: '#C87557',
    bgColor: '#F5E8E3',
    category: 'ia',
  },
  {
    id: '6',
    title: 'Coach biblique',
    description: 'Un guide IA pour votre foi',
    badge: '6',
    imageSource: coachIcon,
    imageSize: 42,
    tintWhite: false,
    color: FeatureColors.coach,
    bgColor: '#E3EAF8',
    category: 'ia',
  },
  {
    id: '9',
    title: 'Assistant Prédicateurs',
    description: 'Plan de sermon assisté par IA',
    badge: '9',
    materialIcon: 'podium',
    color: '#8B62B5',
    bgColor: '#EDE4F5',
    category: 'ia',
  },

  // ── ÉTUDE & ANALYSE ──
  {
    id: '4',
    title: 'Analyseur des\ninterprétations',
    description: 'Explorez différents regards',
    badge: '4',
    imageSource: interpretationsIcon,
    imageSize: 34,
    color: '#D4A85A',
    bgColor: '#F5EFE0',
    category: 'etude',
  },
  {
    id: '5',
    title: 'Graphe des\nrelations',
    description: 'Visualisez les liens bibliques',
    badge: '5',
    materialIcon: 'graphql',
    color: '#4AA9C8',
    bgColor: '#E0EFF5',
    category: 'etude',
  },
  {
    id: '8',
    title: 'Détection\ndes thèmes',
    description: 'Analysez les thématiques clés',
    badge: '8',
    imageSource: detectionThemesIcon,
    imageSize: 32,
    color: '#6E9476',
    bgColor: '#E6F0E8',
    category: 'etude',
  },
  {
    id: '10',
    title: 'Comparaison\ndes traductions',
    description: 'Comparez les traductions',
    badge: '10',
    imageSource: traductionsIcon,
    imageSize: 34,
    color: '#D4A85A',
    bgColor: '#F5EFE0',
    category: 'etude',
  },
  {
    id: '11',
    title: 'Moteur de\nraisonnement',
    description: 'Résolvez des questions de foi',
    badge: '11',
    materialIcon: 'brain',
    color: '#8B62B5',
    bgColor: '#EDE4F5',
    category: 'etude',
  },
  {
    id: '14',
    title: 'Étude des langues\nbibliques',
    description: 'Hébreu, grec, araméen',
    badge: '14',
    imageSource: languesIcon,
    imageSize: 38,
    color: '#D4A85A',
    bgColor: '#F5EFE0',
    category: 'etude',
  },
  {
    id: '20',
    title: 'Lecture audio',
    description: 'Écoutez la Parole partout',
    badge: '20',
    fluentIcon: 'headset',
    color: FeatureColors.lecture,
    bgColor: '#E0E8F5',
    category: 'etude',
  },

  // ── EXPLORATION ──
  {
    id: '16',
    title: 'Carte interactive',
    description: 'Lieux du ministère, sites historiques',
    badge: '16',
    fluentIcon: 'map',
    color: '#13294B',
    bgColor: '#E8EDF4',
    category: 'exploration',
  },
  {
    id: '17',
    title: 'Contes de la Bible',
    description: 'Fictions audio & récits bibliques',
    badge: '17',
    materialIcon: 'timeline-clock-outline',
    color: '#5078D7',
    bgColor: '#E3EAF8',
    category: 'exploration',
  },
  {
    id: '18',
    title: 'Arbre généalogique',
    description: 'Tracez les lignées sacrées',
    badge: '18',
    imageSource: genealogieIcon,
    imageSize: 28,
    color: '#6E9476',
    bgColor: '#E6F0E8',
    category: 'exploration',
  },
  {
    id: '7',
    title: 'Reconstitution visuelle',
    description: 'Reconstituez les lieux bibliques',
    badge: '7',
    imageSource: simulationIcon,
    imageSize: 28,
    color: '#C87557',
    bgColor: '#F5E8E3',
    category: 'exploration',
  },

  // ── VIE SPIRITUELLE ──
  {
    id: '19',
    title: 'Journal spirituel',
    description: 'Écrivez, réfléchissez, grandissez',
    badge: '19',
    fluentIcon: 'noteEdit',
    color: FeatureColors.journal,
    bgColor: '#E6F0E8',
    category: 'vie',
  },
  {
    id: '13',
    title: 'Méditation guidée',
    description: "Apaisez l'âme, renouvelez l'esprit",
    badge: '13',
    imageSource: meditationIcon,
    imageSize: 32,
    tintWhite: false,
    color: FeatureColors.meditation,
    bgColor: '#F5EFE0',
    category: 'vie',
  },
  {
    id: '12',
    title: 'Générateur de prières',
    description: 'Des intentions adaptées pour vous',
    badge: '12',
    imageSource: priereIcon,
    imageSize: 38,
    color: FeatureColors.priere,
    bgColor: '#F5E8E3',
    category: 'vie',
  },

  // ── RESSOURCES ──
  {
    id: '15',
    title: 'Module Apocalypse',
    description: 'Étude approfondie de la Révélation',
    badge: '15',
    materialIcon: 'book-open-blank-variant',
    color: '#C87557',
    bgColor: '#F5E8E3',
    category: 'ressources',
  },
  {
    id: '21',
    title: 'Guide Prédication',
    description: "Techniques d'homilétique",
    badge: '21',
    materialIcon: 'microphone',
    color: '#3B68AD',
    bgColor: '#EBF1FA',
    category: 'ressources',
  },
  {
    id: '22',
    title: 'Étude Prophéties',
    description: 'Interpréter les prophéties',
    badge: '22',
    materialIcon: 'key-chain',
    color: '#D4A85A',
    bgColor: '#F5EFE0',
    category: 'ressources',
  },
  {
    id: '23',
    title: 'Générateur Ressources',
    description: 'Contenu pour édifier',
    badge: '23',
    materialIcon: 'bookshelf',
    color: '#5078D7',
    bgColor: '#E3EAF8',
    category: 'ressources',
  },
  {
    id: '24',
    title: 'Guide du pasteur',
    description: 'Soins pastoraux & leadership',
    badge: '24',
    materialIcon: 'church',
    color: '#D4A85A',
    bgColor: '#FBF5EB',
    category: 'ressources',
  },
  {
    id: '25',
    title: 'Guide Ressources',
    description: 'Outils de partage de la foi',
    badge: '25',
    materialIcon: 'treasure-chest',
    color: '#6E9476',
    bgColor: '#EDF5EE',
    category: 'ressources',
  },
  {
    id: '26',
    title: 'Guide Apocalypse',
    description: 'Tableaux prophétiques',
    badge: '26',
    materialIcon: 'image-filter-hdr',
    color: '#8B62B5',
    bgColor: '#F7EFF5',
    category: 'ressources',
  },
];
