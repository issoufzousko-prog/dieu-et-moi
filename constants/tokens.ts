export const Mui3Tokens = {
  palette: {
    primary: { main: '#13294B', light: '#1B2D4F', dark: '#0F172A' },
    secondary: { main: '#D4A85A', light: '#F3E8D2', dark: '#C89A52' },
    background: { default: '#FFFDF9', paper: '#FFFFFF', darkPaper: '#0F172A' },
    text: { primary: '#13294B', secondary: '#6F6F6F', inverse: '#FFFFFF' },
    accent: { indigo: '#818CF8', emerald: '#10B981', rose: '#EF5350' },
  },
  shape: {
    borderRadius: 16,
    cardRadius: 20,
    buttonRadius: 24,
  },
  shadows: {
    soft: '0px 4px 20px rgba(0, 0, 0, 0.04)',
    card: '0px 8px 32px rgba(0, 0, 0, 0.06)',
    modal: '0px 16px 48px rgba(0, 0, 0, 0.12)',
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    titleLarge: { fontSize: 20, fontWeight: 700 },
    bodyMedium: { fontSize: 14, fontWeight: 400 },
    labelSmall: { fontSize: 11, fontWeight: 600, letterSpacing: 0.8 },
  },
} as const;

export default Mui3Tokens;
