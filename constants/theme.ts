/**
 * Dieu et Moi — MD3 Custom Theme
 * Theme Material Design 3 personnalise avec la palette ivoire/marine/or
 */

import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { Colors } from '@/constants/Colors';
import { Platform } from 'react-native';

const fontConfig = {
  displayLarge: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-condensed' }), fontSize: 28, lineHeight: 34 },
  displayMedium: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-condensed' }), fontSize: 24, lineHeight: 30 },
  displaySmall: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-condensed' }), fontSize: 20, lineHeight: 26 },
  headlineLarge: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }), fontSize: 18, lineHeight: 24 },
  headlineMedium: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }), fontSize: 16, lineHeight: 22 },
  headlineSmall: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }), fontSize: 14, lineHeight: 20 },
  titleLarge: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }), fontSize: 18, lineHeight: 24 },
  titleMedium: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }), fontSize: 14, lineHeight: 20 },
  titleSmall: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }), fontSize: 12, lineHeight: 18 },
  bodyLarge: { fontFamily: 'sans-serif', fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: 'sans-serif', fontSize: 14, lineHeight: 20 },
  bodySmall: { fontFamily: 'sans-serif', fontSize: 12, lineHeight: 18 },
  labelLarge: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }), fontSize: 14, lineHeight: 20 },
  labelMedium: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }), fontSize: 12, lineHeight: 16 },
  labelSmall: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }), fontSize: 10, lineHeight: 14 },
};

export const DieuEtMoiTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.navy,
    primaryContainer: Colors.beige,
    secondary: Colors.gold,
    secondaryContainer: 'rgba(212, 168, 90, 0.15)',
    tertiary: Colors.goldAlt,
    background: Colors.ivory,
    surface: Colors.white,
    surfaceVariant: Colors.beige,
    onPrimary: Colors.white,
    onPrimaryContainer: Colors.navy,
    onSecondary: Colors.white,
    onSecondaryContainer: Colors.navy,
    onBackground: Colors.navy,
    onSurface: Colors.navy,
    onSurfaceVariant: Colors.grayWarm,
    outline: 'rgba(212, 168, 90, 0.15)',
    elevation: {
      level0: 'transparent',
      level1: Colors.ivory,
      level2: Colors.ivoryEnd,
      level3: Colors.beige,
      level4: Colors.beige,
      level5: Colors.beige,
    },
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 16,
};

export type AppTheme = typeof DieuEtMoiTheme;
