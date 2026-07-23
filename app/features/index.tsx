/**
 * Dieu et Moi — Features Index Page
 * Page regroupant TOUTES les fonctionnalités de l'application
 * avec barre de recherche, filtres par catégorie et micro-animations M3.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  FadeInLeft,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, FeatureColors, Shadows } from '@/constants/Colors';
import FluentIcon, { FluentIconName } from '@/components/fluent-icons/FluentIcon';
import { ALL_FEATURES, FeatureItem, getGradientColors } from '@/constants/Features';

// M3 Motion Presets
const M3_SPRING = { damping: 20, stiffness: 180, mass: 0.8 };
const M3_STANDARD = { duration: 300, easing: Easing.bezier(0.2, 0, 0, 1) };

const featuresHeaderIcon = require('@/assets/images/features-header-icon.svg');

const CATEGORIES = [
  { id: 'tout', label: 'Tout' },
  { id: 'ia', label: 'IA & Assistance' },
  { id: 'etude', label: 'Étude & Analyse' },
  { id: 'exploration', label: 'Exploration' },
  { id: 'vie', label: 'Vie spirituelle' },
  { id: 'ressources', label: 'Ressources' },
];

const SECTION_CONFIG: { id: string; title: string }[] = [
  { id: 'ia', title: 'IA & ASSISTANCE' },
  { id: 'etude', title: 'ÉTUDE & ANALYSE' },
  { id: 'exploration', title: 'EXPLORATION' },
  { id: 'vie', title: 'VIE SPIRITUELLE' },
  { id: 'ressources', title: 'RESSOURCES' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Bouton Interactif M3 ───
function M3Pressable({
  onPress,
  children,
  style,
  activeOpacity = 0.85,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
  activeOpacity?: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.96, M3_SPRING);
        opacity.value = withTiming(activeOpacity, M3_STANDARD);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, M3_SPRING);
        opacity.value = withTiming(1, M3_STANDARD);
      }}
      onPress={onPress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ─── Carte de Fonctionnalité M3 ───
function FeatureCard({ item, index }: { item: FeatureItem; index: number }) {
  const router = useRouter();

  const handlePress = () => {
    if (item.title === 'Assistant biblique') {
      router.push('/features/assistant-biblique' as any);
    } else if (item.title === 'Générateur de prières') {
      router.push('/features/prayer-generator' as any);
    } else if (item.title === 'Méditation guidée') {
      router.push('/features/guided-meditation' as any);
    } else if (item.title === 'Simulateur historique') {
      router.push('/features/historical-simulator' as any);
    } else if (item.title === 'Coach biblique') {
      router.push('/features/bible-coach' as any);
    } else if (item.title === 'Assistant Prédicateurs') {
      router.push('/features/preacher-assistant' as any);
    } else if (item.id === '5' || item.title.includes('Graphe')) {
      router.push('/features/social-graph' as any);
    } else if (item.title.includes('interprétations') || item.title.includes('Analyseur')) {
      router.push('/features/interpretation-analyzer' as any);
    } else if (item.title.includes('traductions') || item.title.includes('Comparaison')) {
      router.push('/features/translation-comparison' as any);
    } else if (item.title.includes('raisonnement') || item.title.includes('Moteur')) {
      router.push('/features/reasoning-engine' as any);
    } else if (item.title.includes('généalogique') || item.title.includes('Arbre')) {
      router.push('/features/genealogy-tree' as any);
    } else if (item.title === 'Carte interactive') {
      router.push('/features/biblical-map' as any);
    } else if (item.id === '17' || item.title.includes('Contes') || item.title.includes('Chronologie') || item.title.includes('chronologie') || item.title.includes('Récits Audio')) {
      router.push('/features/audio-chronology' as any);
    } else if (item.title === 'Étude') {
      router.push('/bible' as any);
    } else if (item.title === 'Lecture audio') {
      router.push('/bible?audio=true' as any);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60).springify().damping(18)}>
      <M3Pressable onPress={handlePress} style={styles.featureCard}>
        {item.badge && (
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{item.badge}</Text>
          </View>
        )}

        <View style={styles.iconShadowWrapper}>
          <LinearGradient
            colors={getGradientColors(item.color)}
            start={{ x: 0.15, y: 0.15 }}
            end={{ x: 0.85, y: 0.85 }}
            style={styles.iconContainer}
          >
            {item.imageSource ? (
              <Image
                source={item.imageSource}
                style={{
                  width: item.imageSize || 22,
                  height: item.imageSize || 22,
                }}
                contentFit="contain"
                tintColor={item.tintWhite !== false ? Colors.white : undefined}
              />
            ) : item.fluentIcon ? (
              <FluentIcon
                name={item.fluentIcon}
                size={20}
                color={Colors.white}
              />
            ) : item.materialIcon ? (
              <MaterialCommunityIcons
                name={item.materialIcon as any}
                size={20}
                color={Colors.white}
              />
            ) : null}
          </LinearGradient>
        </View>

        <Text style={styles.featureCardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.featureCardDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.featureCardArrow}>
          <FluentIcon name="chevronRight" size={12} color={Colors.grayWarm} />
        </View>
      </M3Pressable>
    </Animated.View>
  );
}

// ─── Section M3 ───
function SectionView({ title, items }: { title: string; items: FeatureItem[] }) {
  if (items.length === 0) return null;
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionScroll}
      >
        {items.map((item, index) => (
          <FeatureCard key={item.id} item={item} index={index} />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

// ─── Écran Principal M3 ───
export default function FeaturesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('tout');

  const filteredFeatures = useMemo(() => {
    let features = ALL_FEATURES;

    if (activeCategory !== 'tout') {
      features = features.filter(f => f.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      features = features.filter(
        f =>
          f.title.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q)
      );
    }

    return features;
  }, [activeCategory, searchQuery]);

  const sections = useMemo(() => {
    return SECTION_CONFIG.map(sec => ({
      ...sec,
      items: filteredFeatures.filter(f => f.category === sec.id),
    })).filter(sec => sec.items.length > 0);
  }, [filteredFeatures]);

  return (
    <LinearGradient colors={['#FFFDF9', '#F7F2EA']} style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInUp.duration(450)} style={[styles.topHeader, { paddingTop: insets.top + 8 }]}>
        <M3Pressable style={styles.headerBackBtn} onPress={() => router.back()}>
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <FluentIcon name="chevronRight" size={20} color={Colors.navy} />
          </View>
        </M3Pressable>
        <Text style={styles.topHeaderTitle}>Fonctionnalités</Text>
        <M3Pressable style={styles.headerActionBtn}>
          <FluentIcon name="bookmark" size={20} color={Colors.navy} />
        </M3Pressable>
      </Animated.View>

      {/* Titre de page */}
      <View style={styles.pageTitleRow}>
        <Animated.Text entering={FadeInLeft.duration(400).delay(100)} style={styles.pageTitle}>
          Fonctionnalités
        </Animated.Text>
        <Animated.View entering={ZoomIn.duration(450).delay(200)}>
          <Image
            source={featuresHeaderIcon}
            style={styles.pageTitleIcon}
            contentFit="contain"
          />
        </Animated.View>
      </View>

      {/* Saisie Recherche */}
      <Animated.View entering={FadeInDown.duration(400).delay(250)} style={styles.searchContainer}>
        <FluentIcon name="search" size={18} color={Colors.grayWarm} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une fonctionnalité..."
          placeholderTextColor={Colors.grayWarm}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </Animated.View>

      {/* Catégories animées */}
      <Animated.View entering={FadeInDown.duration(400).delay(350)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          style={styles.filtersScroll}
        >
          {CATEGORIES.map((cat, i) => (
            <M3Pressable
              key={cat.id}
              style={[
                styles.filterChip,
                activeCategory === cat.id && styles.filterChipActive,
              ]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeCategory === cat.id && styles.filterChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </M3Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Sections avec ScrollView */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {sections.map(sec => (
          <SectionView key={sec.id} title={sec.title} items={sec.items} />
        ))}

        {/* CTA Bas */}
        <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.bottomCTA}>
          <View style={styles.bottomCTAContent}>
            <Text style={styles.bottomCTATitle}>
              Une plateforme complète pour approfondir votre foi
            </Text>
            <Text style={styles.bottomCTADesc}>
              Explorez, apprenez, priez et grandissez chaque jour avec Dieu
            </Text>
          </View>
          <View style={styles.bottomCTAIconCircle}>
            <FluentIcon name="sparkle" size={28} color={Colors.gold} />
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

// Le helper FadeInLeft est maintenant importé directement de 'react-native-reanimated'

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.navy,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.navy,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  pageTitleIcon: {
    width: 48,
    height: 48,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 24,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    ...Shadows.card,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: Colors.navy,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  filtersScroll: {
    maxHeight: 48,
    marginBottom: 16,
  },
  filtersContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    ...Shadows.card,
  },
  filterChipActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  filterChipText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#718096',
    letterSpacing: 1.2,
  },
  sectionScroll: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 16,
  },
  featureCard: {
    width: 152,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.02)',
    ...Shadows.card,
    position: 'relative',
  },
  cardBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
  },
  cardBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  iconShadowWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.02)',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  featureCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.navy,
    marginBottom: 4,
    lineHeight: 20,
  },
  featureCardDesc: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 16,
    marginBottom: 12,
  },
  featureCardArrow: {
    alignSelf: 'flex-start',
  },
  bottomCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3EFE6',
    borderRadius: 24,
    marginHorizontal: 24,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.02)',
  },
  bottomCTAContent: {
    flex: 1,
    marginRight: 16,
  },
  bottomCTATitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.navy,
    marginBottom: 6,
    lineHeight: 20,
  },
  bottomCTADesc: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 16,
  },
  bottomCTAIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
});