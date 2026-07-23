/**
 * Dieu et Moi — Color Palette
 * Palette complete basee sur les manuscrits bibliques
 */

// === Couleurs principales ===
export const Colors = {
  // Fond dominant (70%)
  ivory: '#FFFDF9',
  ivoryEnd: '#F7F2EA',

  // Couleur principale
  navy: '#13294B',
  navyAlt: '#1B2D4F',

  // Accent dore
  gold: '#D4A85A',
  goldAlt: '#C89A52',

  // Cartes & degrades
  beige: '#F3E8D2',

  // Texte secondaire
  grayWarm: '#6F6F6F',
  grayWarmAlt: '#777777',

  // Blanc
  white: '#FFFFFF',
  black: '#000000',

  // System fallback mapping for template compatibility
  light: {
    text: '#13294B',
    background: '#FFFDF9',
    tint: '#13294B',
    tabIconDefault: '#6F6F6F',
    tabIconSelected: '#13294B',
  },
  dark: {
    text: '#FFFDF9',
    background: '#13294B',
    tint: '#D4A85A',
    tabIconDefault: '#777777',
    tabIconSelected: '#D4A85A',
  },
} as const;

// === Couleurs fonctionnelles secondaires ===
export const FeatureColors = {
  coach: '#223D73',
  meditation: '#D7AF62',
  lecture: '#264C8A',
  journal: '#8AA589',
  etude: '#13294B',
  exploration: '#6E9476',
  ministere: '#8B62B5',
  priere: '#C87557',
  communaute: '#C87557',
  favoris: '#4AA9C8',
  defis: '#F07835',
  ressources: '#5078D7',
} as const;

// === Ombres ===
export const Shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 35,
    elevation: 3,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  hover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 5,
  },
  fab: {
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 8,
  },
  nav: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
} as const;

// === Degrades ===
export const Gradients = {
  background: ['#FFFDF9', '#F7F2EA'],
  warm: ['#FFF9EF', '#F3E4C7'],
  card: ['#FFFFFF', '#FBF6EE'],
  heroMorning: ['rgba(255,253,249,0.1)', 'rgba(255,253,249,0.6)', 'rgba(255,253,249,0.92)'],
  heroNight: ['rgba(19,41,75,0.1)', 'rgba(19,41,75,0.55)', 'rgba(19,41,75,0.92)'],
  verseMorning: ['rgba(255,253,249,0.88)', 'rgba(243,232,210,0.75)'],
  verseNight: ['rgba(19,41,75,0.88)', 'rgba(27,45,79,0.80)'],
} as const;

export default Colors;
