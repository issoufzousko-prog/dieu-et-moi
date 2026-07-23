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
import { useRouter } from 'expo-router';
import { Colors, Shadows } from '@/constants/Colors';

const { width } = Dimensions.get('window');

const interpretationsIcon = require('@/assets/images/interpretations-icon-v2.svg');
const traductionsIcon = require('@/assets/images/traductions-icon-v2.svg');
const languesIcon = require('@/assets/images/langues-icon-v2.svg');
const detectionThemesIcon = require('@/assets/images/detection-themes-icon.svg');

// Data for Study Tools
const STUDY_TOOLS = [
  {
    id: '4',
    title: 'Analyseur des\ninterprétations',
    icon: 'file-search-outline',
    imageSource: interpretationsIcon,
    imageSize: 34,
    color: '#D4A85A',
    badge: '4',
  },
  {
    id: '8',
    title: 'Détection\ndes thèmes',
    icon: 'leaf',
    imageSource: detectionThemesIcon,
    imageSize: 32,
    color: '#6E9476',
    badge: '8',
  },
  {
    id: '10',
    title: 'Comparaison\ndes traductions',
    icon: 'book-open-page-variant-outline',
    imageSource: traductionsIcon,
    imageSize: 34,
    color: '#D4A85A',
    badge: '10',
  },
  {
    id: '14',
    title: 'Étude des langues\nbibliques',
    icon: 'translate',
    imageSource: languesIcon,
    imageSize: 38,
    color: '#D4A85A',
    badge: '14',
  },
  {
    id: '11',
    title: 'Moteur de\nraisonnement',
    icon: 'brain',
    color: '#8B62B5',
    badge: '11',
  },
  {
    id: '5',
    title: 'Graphe des\nrelations',
    icon: 'graphql',
    color: '#4AA9C8',
    badge: '5',
  },
];

// Data for Recent Studies using authentic FreeBibleimages preview URLs
const RECENT_STUDIES = [
  {
    id: 'r1',
    title: 'Jean 3:16',
    category: "Analyse d'interprétations",
    image: 'https://media.freebibleimages.org/illustrations/FB_TIS_Jesus_Crucifixion/tis-jesus-crucifixion/preview.jpg',
  },
  {
    id: 'r2',
    title: 'Les 7 alliances de la Bible',
    category: 'Détection des thèmes',
    image: 'https://media.freebibleimages.org/illustrations/FB_Moody_David_Saul/moody-david-saul/preview.jpg',
  },
  {
    id: 'r3',
    title: 'Hébreu biblique',
    category: 'Étude des langues',
    image: 'https://media.freebibleimages.org/illustrations/FB_GNPI_OT_2/gnpi-ot-2/preview.jpg',
  },
  {
    id: 'r4',
    title: 'Raisonnement : Foi et œuvres',
    category: 'Moteur de raisonnement',
    image: 'https://media.freebibleimages.org/illustrations/FB_RP_Faith_Hebrews_11_D/rp-faith-hebrews-11-d/preview.jpg',
  },
];

export default function AcademieScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <MaterialCommunityIcons name="earth" size={24} color={Colors.navy} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Étude</Text>
            <Text style={styles.headerSubtitle}>Approfondissez la Parole</Text>
          </View>
        </View>

        <Pressable onPress={() => router.push('/features/bible-coach')} style={styles.planButton}>
          <MaterialCommunityIcons name="calendar-month-outline" size={16} color={Colors.navy} />
          <View style={styles.planButtonTexts}>
            <Text style={styles.planButtonTitle}>Plan de lecture</Text>
            <Text style={styles.planButtonSub}>28 jours</Text>
          </View>
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

        {/* Daily Verse / Quote Card */}
        <View style={styles.quoteCard}>
          <Image
            source="https://media.freebibleimages.org/illustrations/FB_PM_Books_Poetic/pm-books-poetic/preview.jpg"
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={['rgba(19,41,75,0.78)', 'rgba(19,41,75,0.92)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.quoteContent}>
            <MaterialCommunityIcons name="format-quote-open" size={32} color={Colors.gold} style={styles.quoteIcon} />
            <Text style={styles.quoteText}>
              "Ta parole est une lampe à mes pieds, et une lumière sur mon sentier."
            </Text>
            <Text style={styles.quoteRef}>Psaumes 119:105</Text>
          </View>
        </View>

        {/* Section: Outils d'étude */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Outils d'étude</Text>
          <Pressable style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>Voir tout</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.grayWarm} />
          </Pressable>
        </View>

        {/* Grid of Tools */}
        <View style={styles.toolsGrid}>
          {STUDY_TOOLS.map((tool) => (
            <Pressable key={tool.id} style={styles.toolCard}>
              <View style={styles.toolLeftCol}>
                <View style={[styles.toolIconWrapper, { backgroundColor: tool.color + '15' }]}>
                  {tool.imageSource ? (
                    <Image
                      source={tool.imageSource}
                      style={{
                        width: tool.imageSize || 22,
                        height: tool.imageSize || 22,
                      }}
                      contentFit="contain"
                      tintColor={tool.color}
                    />
                  ) : (
                    <MaterialCommunityIcons name={tool.icon as any} size={22} color={tool.color} />
                  )}
                </View>
                <View style={styles.toolBadge}>
                  <Text style={styles.toolBadgeText}>{tool.badge}</Text>
                </View>
              </View>
              <View style={styles.toolRightCol}>
                <Text style={styles.toolCardTitle} numberOfLines={2}>
                  {tool.title}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Section: Récents */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Récents</Text>
          <Pressable style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>Voir tout</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.grayWarm} />
          </Pressable>
        </View>

        {/* Recent Studies Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
          snapToInterval={180}
          decelerationRate="fast"
        >
          {RECENT_STUDIES.map((study) => (
            <Pressable key={study.id} style={styles.recentCard}>
              <View style={styles.recentTextContainer}>
                <Text style={styles.recentTitle} numberOfLines={1}>{study.title}</Text>
                <Text style={styles.recentCategory} numberOfLines={1}>{study.category}</Text>
              </View>
              <View style={styles.recentImageWrapper}>
                <Image
                  source={study.image}
                  style={styles.recentImage}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Bottom Banner */}
        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={['#FFFFFF', '#FBF6EE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          />
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextCol}>
              <Text style={styles.bannerTitle}>
                Approfondissez votre compréhension
              </Text>
              <Text style={styles.bannerDesc}>
                Utilisez nos outils avancés pour découvrir de nouvelles perspectives bibliques.
              </Text>
              <Pressable style={styles.bannerButton}>
                <Text style={styles.bannerButtonText}>Explorer les outils</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.white} />
              </Pressable>
            </View>
            <View style={styles.bannerIllustrationCol}>
              {/* Custom stylized Roman column background element */}
              <View style={styles.columnBase}>
                <View style={styles.columnCapital} />
                <View style={styles.columnShaft}>
                  <View style={styles.columnFlute} />
                  <View style={styles.columnFlute} />
                  <View style={styles.columnFlute} />
                </View>
                <View style={styles.columnPedestal} />
              </View>
            </View>
          </View>
        </View>

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(19, 41, 75, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(19, 41, 75, 0.08)',
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
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3E8D2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 90, 0.25)',
  },
  planButtonTexts: {
    justifyContent: 'center',
  },
  planButtonTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.navy,
  },
  planButtonSub: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.navy,
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
  quoteCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    height: 140,
    overflow: 'hidden',
    marginBottom: 28,
    ...Shadows.soft,
  },
  quoteContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  quoteIcon: {
    marginBottom: 4,
    opacity: 0.8,
  },
  quoteText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.white,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  quoteRef: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.gold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
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
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 28,
  },
  toolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '45%',
    flexGrow: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 232, 210, 0.4)',
    ...Shadows.card,
  },
  toolLeftCol: {
    alignItems: 'center',
    marginRight: 10,
  },
  toolIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: 'rgba(19, 41, 75, 0.08)',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  toolBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: Colors.navy,
  },
  toolRightCol: {
    flex: 1,
    justifyContent: 'center',
  },
  toolCardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.navy,
    lineHeight: 14,
  },
  carouselContainer: {
    paddingLeft: 24,
    paddingRight: 12,
    gap: 12,
    paddingBottom: 28,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    width: 160,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(243, 232, 210, 0.4)',
    ...Shadows.card,
  },
  recentTextContainer: {
    marginBottom: 10,
    height: 38,
    justifyContent: 'center',
  },
  recentTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.navy,
  },
  recentCategory: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.grayWarm,
    marginTop: 2,
  },
  recentImageWrapper: {
    height: 90,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  recentImage: {
    width: '100%',
    height: '100%',
  },
  bannerContainer: {
    marginHorizontal: 24,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 90, 0.2)',
    ...Shadows.soft,
  },
  bannerGradient: {
    ...StyleSheet.absoluteFill,
  },
  bannerContent: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  bannerTextCol: {
    flex: 1.3,
    zIndex: 2,
  },
  bannerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.navy,
    marginBottom: 6,
    lineHeight: 20,
  },
  bannerDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.grayWarm,
    lineHeight: 15,
    marginBottom: 14,
  },
  bannerButton: {
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.white,
  },
  bannerIllustrationCol: {
    flex: 0.7,
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 120,
  },
  columnBase: {
    width: 45,
    height: 110,
    opacity: 0.15,
    alignItems: 'center',
  },
  columnCapital: {
    width: 40,
    height: 12,
    backgroundColor: Colors.navy,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  columnShaft: {
    width: 28,
    height: 80,
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 2,
  },
  columnFlute: {
    width: 4,
    height: '100%',
    backgroundColor: Colors.white,
    opacity: 0.3,
  },
  columnPedestal: {
    width: 46,
    height: 14,
    backgroundColor: Colors.navy,
    borderRadius: 2,
  },
});
