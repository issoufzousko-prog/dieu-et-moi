import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Shadows } from '@/constants/Colors';

const { width } = Dimensions.get('window');

// Data for Ministry Tools
const MINISTRY_TOOLS = [
  {
    id: 't1',
    title: 'Assistant\nPrédicateurs',
    description: 'Plan de sermon...',
    icon: 'podium',
    color: '#8B62B5',
    badge: '9/21',
  },
  {
    id: 't2',
    title: 'Générateur\nRessources',
    description: 'Contenu pour...',
    icon: 'bookshelf',
    color: '#5078D7',
    badge: '23',
  },
  {
    id: 't3',
    title: 'Étude\nProphéties',
    description: 'Interpréter les...',
    icon: 'key-chain',
    color: '#D4A85A',
    badge: '22',
  },
  {
    id: 't4',
    title: 'Module\nApocalypse',
    description: 'Révélations...',
    icon: 'book-open-blank-variant',
    color: '#C87557',
    badge: '15',
  },
];

// Data for Ministry Guides
const GUIDES = [
  {
    id: 'g1',
    title: 'Guide\nPrédication',
    subtitle: "Techniques\nd'homilétique",
    icon: 'microphone',
    bgColor: '#EBF1FA',
    iconColor: '#3B68AD',
  },
  {
    id: 'g2',
    title: 'Guide\ndu pasteur',
    subtitle: 'Soins pastoraux\n& leadership',
    icon: 'church',
    bgColor: '#FBF5EB',
    iconColor: '#D4A85A',
  },
  {
    id: 'g3',
    title: 'Guide\nRessources',
    subtitle: 'Outils de partage\nde la foi',
    icon: 'treasure-chest',
    bgColor: '#EDF5EE',
    iconColor: '#6E9476',
  },
  {
    id: 'g4',
    title: 'Guide\nApocalypse',
    subtitle: 'Tableaux\nprophétiques',
    icon: 'image-filter-hdr',
    bgColor: '#F7EFF5',
    iconColor: '#8B62B5',
  },
];

export default function MinistereScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Ministère</Text>
          <Text style={styles.headerSubtitle}>Outils pour servir & édifier</Text>
        </View>
        <Pressable style={styles.headerRoundBtn}>
          <MaterialCommunityIcons name="account-outline" size={22} color={Colors.navy} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.grayWarm} style={styles.searchIcon} />
          <TextInput
            placeholder="Rechercher dans la Bible, thèmes, sujets..."
            placeholderTextColor={Colors.grayWarm}
            style={styles.searchInput}
          />
          <Pressable style={styles.searchActionBtn}>
            <MaterialCommunityIcons name="microphone-outline" size={20} color={Colors.navy} />
          </Pressable>
          <View style={styles.searchDivider} />
          <Pressable style={styles.searchActionBtn}>
            <MaterialCommunityIcons name="tune-variant" size={20} color={Colors.navy} />
          </Pressable>
        </View>

        {/* Section: Préparation de Sermon Assistée */}
        <View style={styles.sermonCard}>
          <View style={styles.sermonIconCol}>
            <View style={styles.podiumIllustration}>
              <MaterialCommunityIcons name="podium" size={45} color={Colors.navy} />
              <View style={styles.micLine} />
            </View>
          </View>
          <View style={styles.sermonTextCol}>
            <Text style={styles.sermonTitle}>Préparation de Sermon Assistée</Text>
            <Text style={styles.sermonDesc}>
              Générez un plan et des points clés pour votre prochain sermon sur Romains 8.
            </Text>
            <Pressable style={styles.sermonButton}>
              <Text style={styles.sermonButtonText}>Commencer</Text>
            </Pressable>
          </View>
        </View>

        {/* Section: Outils du Ministère */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Outils du Ministère</Text>
          <Pressable style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>Voir tout</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.grayWarm} />
          </Pressable>
        </View>

        {/* Ministry Tools Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
          snapToInterval={132}
          decelerationRate="fast"
        >
          {MINISTRY_TOOLS.map((tool) => (
            <Pressable key={tool.id} style={styles.toolCard}>
              <View style={styles.toolBadge}>
                <Text style={styles.toolBadgeText}>{tool.badge}</Text>
              </View>
              <View style={[styles.toolIconWrapper, { backgroundColor: tool.color + '12' }]}>
                <MaterialCommunityIcons name={tool.icon as any} size={24} color={tool.color} />
              </View>
              <Text style={styles.toolCardTitle} numberOfLines={2}>{tool.title}</Text>
              <Text style={styles.toolCardDesc} numberOfLines={1}>{tool.description}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Special Banner Card - L'Apocalypse */}
        <View style={styles.apocalypseCard}>
          <Image
            source="https://media.freebibleimages.org/illustrations/FB_HC_Acts_Apostles/hc-acts-apostles/preview.jpg"
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={['rgba(19,41,75,0.4)', 'rgba(19,41,75,0.88)']}
            style={StyleSheet.absoluteFill}
          />
          <Pressable style={styles.bookmarkFloatBtn}>
            <MaterialCommunityIcons name="bookmark-outline" size={20} color={Colors.white} />
          </Pressable>
          
          <View style={styles.apocalypseContent}>
            <View style={styles.badgeRow}>
              <View style={styles.goldBadge}>
                <MaterialCommunityIcons name="crown" size={14} color="#13294B" />
                <Text style={styles.goldBadgeText}>MODULE SPECIAL</Text>
              </View>
            </View>
            <Text style={styles.apocalypseTitle}>Module Spécial : L'Apocalypse</Text>
            <Text style={styles.apocalypseDesc}>
              Une étude approfondie et interactive du livre de la Révélation. Visualisations et analyses prophétiques.
            </Text>
            <Pressable style={styles.apocalypseButton}>
              <Text style={styles.apocalypseButtonText}>Démarrer l'étude</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Section: Guides du Ministère */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Guides du Ministère</Text>
          <Pressable style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>Voir tout</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.grayWarm} />
          </Pressable>
        </View>

        {/* Guides Horizontal List */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
          snapToInterval={142}
          decelerationRate="fast"
        >
          {GUIDES.map((guide) => (
            <Pressable key={guide.id} style={styles.guideCard}>
              <View style={[styles.guideIconWrapper, { backgroundColor: guide.bgColor }]}>
                <MaterialCommunityIcons name={guide.icon as any} size={22} color={guide.iconColor} />
              </View>
              <Text style={styles.guideTitle} numberOfLines={2}>{guide.title}</Text>
              <Text style={styles.guideSubtitle} numberOfLines={2}>{guide.subtitle}</Text>
            </Pressable>
          ))}
        </ScrollView>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ivory,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: Colors.ivory,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.navy,
  },
  headerSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.grayWarm,
  },
  headerRoundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(19, 41, 75, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(19, 41, 75, 0.08)',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(243, 232, 210, 0.6)',
    ...Shadows.soft,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.navy,
    height: '100%',
    padding: 0,
  },
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(111, 111, 111, 0.15)',
    marginHorizontal: 8,
  },
  searchActionBtn: {
    padding: 4,
  },
  sermonCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 232, 210, 0.4)',
    ...Shadows.soft,
    marginBottom: 26,
  },
  sermonIconCol: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumIllustration: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#FFF9EF',
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 90, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  micLine: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 6,
    height: 12,
    backgroundColor: Colors.gold,
    borderRadius: 3,
    transform: [{ rotate: '30deg' }],
  },
  sermonTextCol: {
    flex: 2,
    paddingLeft: 8,
    justifyContent: 'center',
  },
  sermonTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.navy,
    marginBottom: 4,
  },
  sermonDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.grayWarm,
    lineHeight: 15,
    marginBottom: 12,
  },
  sermonButton: {
    backgroundColor: '#C29853',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignSelf: 'flex-start',
    ...Shadows.card,
  },
  sermonButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.white,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.navy,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.grayWarm,
  },
  carouselContainer: {
    paddingLeft: 24,
    paddingRight: 12,
    gap: 12,
    paddingBottom: 26,
  },
  toolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    width: 120,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(243, 232, 210, 0.4)',
    position: 'relative',
    ...Shadows.card,
  },
  toolBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(19, 41, 75, 0.07)',
    borderRadius: 10,
    minWidth: 26,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  toolBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: Colors.navy,
  },
  toolIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  toolCardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.navy,
    lineHeight: 14,
  },
  toolCardDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    color: Colors.grayWarm,
    marginTop: 2,
  },
  apocalypseCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    height: 190,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 26,
    ...Shadows.soft,
  },
  bookmarkFloatBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(19,41,75,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  apocalypseContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE27A',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  goldBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: '#13294B',
  },
  apocalypseTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.white,
    marginBottom: 4,
  },
  apocalypseDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 15,
    marginBottom: 14,
  },
  apocalypseButton: {
    backgroundColor: '#C29853',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignSelf: 'flex-start',
    ...Shadows.card,
  },
  apocalypseButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.white,
  },
  guideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    width: 130,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(243, 232, 210, 0.4)',
    ...Shadows.card,
  },
  guideIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  guideTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.navy,
    lineHeight: 14,
  },
  guideSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    color: Colors.grayWarm,
    marginTop: 4,
    lineHeight: 11,
  },
});
