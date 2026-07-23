import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Shadows } from '@/constants/Colors';
import GlowingCross from '@/components/GlowingCross';

const { width } = Dimensions.get('window');

// Data for interactive characters with authentic FreeBibleimages URLs
const CHARACTERS = [
  {
    id: 'char1',
    name: 'David le Roi',
    description: 'Sagesse et courage',
    image: 'https://media.freebibleimages.org/illustrations/FB_Samuel_David_Anointed/samuel-david-anointed/preview.jpg',
    leftIcon: 'music-clef-treble', // Harp-like representation
    rightIcon: 'shield-outline',
  },
  {
    id: 'char2',
    name: "Paul l'Apôtre",
    description: 'Évangélisez les nations',
    image: 'https://media.freebibleimages.org/illustrations/FB_Paul_Conversion/paul-conversion/preview.jpg',
    leftIcon: 'file-document-outline',
    rightIcon: 'book-open-outline',
  },
  {
    id: 'char3',
    name: 'Marie de Magdala',
    description: 'Témoignez de la foi',
    image: 'https://media.freebibleimages.org/illustrations/FB_WDV_Mary_Tomb/wdv-mary-tomb/preview.jpg',
    leftIcon: 'bottle-tonic-outline', // Jar of perfume representation
    rightIcon: 'star-outline',
  },
];

export default function AtlasScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Illustrative Landscape Header with GlowingCross */}
      <View style={styles.headerIllustrationContainer}>
        {/* Background gradient for morning/golden hour */}
        <LinearGradient
          colors={['#E5C07B', '#F3E2C2', Colors.ivory]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Dynamic Hills Layout in SVG/CSS */}
        <View style={styles.hillsContainer}>
          {/* Back Hills */}
          <View style={[styles.hill, styles.hillBack]} />
          {/* Middle Hills */}
          <View style={[styles.hill, styles.hillMiddle]} />
          {/* Front Hills/City style shadow */}
          <View style={[styles.hill, styles.hillFront]} />
        </View>

        {/* Glowing cross from components */}
        <View style={styles.crossWrapper}>
          <GlowingCross />
        </View>

        {/* Header Text Overlay */}
        <View style={styles.headerOverlayTextContainer}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>Atlas</Text>
              <Text style={styles.headerSubtitle}>Explorez le monde biblique</Text>
            </View>
            <View style={styles.headerRightActions}>
              <Pressable style={styles.headerRoundBtn}>
                <MaterialCommunityIcons name="account-outline" size={22} color={Colors.white} />
              </Pressable>
              <Pressable style={styles.headerRoundBtn}>
                <MaterialCommunityIcons name="magnify" size={22} color={Colors.white} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Section: Explorez l'espace */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explorez l'espace</Text>
        </View>

        {/* Interactive Map Card (Badge 16) */}
        <View style={styles.mapCard}>
          <Image
            source="https://media.freebibleimages.org/illustrations/FB_Solomon_Temple/solomon-temple/preview.jpg"
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.65)', 'rgba(255, 253, 249, 0.95)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.mapCardContent}>
            <View style={styles.mapTextCol}>
              <Text style={styles.mapCardTitle}>
                Carte interactive <Text style={styles.citeText}>[cite: 16]</Text>
              </Text>
              <Text style={styles.mapCardDesc}>
                Lieux du ministère, sites historiques
              </Text>
              <Pressable style={styles.mapButton}>
                <Text style={styles.mapButtonText}>Ouvrir la carte</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Section: Explorez le temps */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explorez le temps</Text>
        </View>

        {/* Timeline & Family Tree Cards */}
        <View style={styles.rowGrid}>
          {/* Timeline Card (Badge 17) */}
          <Pressable style={styles.halfCard}>
            <View style={styles.halfCardTextContainer}>
              <Text style={styles.halfCardTitle}>
                Chronologie complète <Text style={styles.citeTextSmall}>[cite: 17]</Text>
              </Text>
              <Text style={styles.halfCardDesc}>
                Des origines à la fin des temps
              </Text>
            </View>
            <View style={styles.previewImageWrapper}>
              <Image
                source="https://media.freebibleimages.org/illustrations/FB_BJ_Kings_Prophets/bj-kings-prophets/preview.jpg"
                style={styles.previewImage}
                contentFit="cover"
              />
              {/* Timeline Line Overlay */}
              <View style={styles.timelineGraphicOverlay} />
            </View>
          </Pressable>

          {/* Family Tree Card (Badge 18) */}
          <Pressable style={styles.halfCard}>
            <View style={styles.halfCardTextContainer}>
              <Text style={styles.halfCardTitle}>
                Arbre généalogique <Text style={styles.citeTextSmall}>[cite: 18]</Text>
              </Text>
              <Text style={styles.halfCardDesc}>
                Tracez les lignées sacrées
              </Text>
            </View>
            <View style={styles.previewImageWrapper}>
              <Image
                source="https://media.freebibleimages.org/illustrations/FB_RG_Heroes_Men/rg-heroes-men/preview.jpg"
                style={styles.previewImage}
                contentFit="cover"
              />
              {/* Tree graphic overlay */}
              <View style={styles.treeGraphicOverlay} />
            </View>
          </Pressable>
        </View>

        {/* Section: Personnages & Événements */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personnages & Événements</Text>
        </View>

        {/* Characters Horizontal List (Badge 2 & 7) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
          snapToInterval={152}
          decelerationRate="fast"
        >
          {CHARACTERS.map((char) => (
            <Pressable key={char.id} style={styles.characterCard}>
              <View style={styles.characterImageWrapper}>
                <Image
                  source={char.image}
                  style={styles.characterImage}
                  contentFit="cover"
                  transition={200}
                />
                
                {/* Floating top-left icon */}
                <View style={styles.charFloatIconLeft}>
                  <MaterialCommunityIcons name={char.leftIcon as any} size={15} color={Colors.navy} />
                </View>

                {/* Floating top-right settings/action icon */}
                <View style={styles.charFloatIconRight}>
                  <MaterialCommunityIcons name={char.rightIcon as any} size={13} color={Colors.navy} />
                </View>

                {/* Floating bottom-right chat bubble */}
                <View style={styles.charChatBubble}>
                  <MaterialCommunityIcons name="chat-processing-outline" size={16} color={Colors.navy} />
                </View>
              </View>

              <View style={styles.characterDetails}>
                <Text style={styles.charName} numberOfLines={1}>{char.name}</Text>
                <Text style={styles.charDesc} numberOfLines={1}>{char.description}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Section: Voyages de l'esprit */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Voyages de l'esprit</Text>
        </View>

        {/* History Simulation & Relation Graph Cards (Badge 3 & 5) */}
        <View style={styles.rowGrid}>
          {/* Simulations (3) */}
          <Pressable style={styles.spiritCard}>
            <Image
              source="https://media.freebibleimages.org/illustrations/FB_Paul_Shipwrecked/paul-shipwrecked/preview.jpg"
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
            <LinearGradient
              colors={['rgba(19,41,75,0.4)', 'rgba(19,41,75,0.85)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.spiritBadge}>
              <Text style={styles.spiritBadgeText}>3</Text>
            </View>
            <View style={styles.spiritCardContent}>
              <Text style={styles.spiritCardTitle}>Simulations historiques</Text>
              <Text style={styles.spiritCardSub}>Revivez les miracles</Text>
            </View>
          </Pressable>

          {/* Graph (5) */}
          <Pressable style={styles.spiritCard}>
            <Image
              source="https://media.freebibleimages.org/illustrations/FB_David_Jonathan/david-jonathan/preview.jpg"
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
            <LinearGradient
              colors={['rgba(19,41,75,0.45)', 'rgba(19,41,75,0.9)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.spiritBadge}>
              <Text style={styles.spiritBadgeText}>5</Text>
            </View>
            <View style={styles.spiritCardContent}>
              <Text style={styles.spiritCardTitle}>Graphe des relations</Text>
              <Text style={styles.spiritCardSub}>Connectez les coeurs</Text>
            </View>
          </Pressable>
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
  headerIllustrationContainer: {
    height: 250,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  hillsContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  hill: {
    position: 'absolute',
    borderRadius: 500,
    backgroundColor: '#FFFDF9',
  },
  hillBack: {
    width: width * 1.5,
    height: 300,
    left: -width * 0.25,
    top: 90,
    backgroundColor: '#E6D2A8',
    opacity: 0.6,
  },
  hillMiddle: {
    width: width * 1.6,
    height: 300,
    left: -width * 0.4,
    top: 115,
    backgroundColor: '#DDC28F',
    opacity: 0.7,
  },
  hillFront: {
    width: width * 1.7,
    height: 300,
    left: -width * 0.3,
    top: 145,
    backgroundColor: '#CFB078',
    opacity: 0.8,
  },
  crossWrapper: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    zIndex: 2,
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  headerOverlayTextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia-Bold' : 'serif',
    fontWeight: '800',
    fontSize: 32,
    color: Colors.navy,
  },
  headerSubtitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#9C783C',
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerRoundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(19, 41, 75, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  scrollContent: {
    paddingBottom: 110,
    paddingTop: 12,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 14,
    marginTop: 18,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.navy,
  },
  mapCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    height: 165,
    overflow: 'hidden',
    ...Shadows.soft,
    borderWidth: 1,
    borderColor: 'rgba(243, 232, 210, 0.5)',
  },
  mapCardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  mapTextCol: {
    width: '65%',
  },
  mapCardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.navy,
    marginBottom: 4,
  },
  citeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#D4A85A',
  },
  citeTextSmall: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#D4A85A',
  },
  mapCardDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.grayWarm,
    lineHeight: 16,
    marginBottom: 16,
  },
  mapButton: {
    backgroundColor: '#C29853',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignSelf: 'flex-start',
    ...Shadows.card,
  },
  mapButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.white,
  },
  rowGrid: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  halfCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    height: 130,
    borderWidth: 1,
    borderColor: 'rgba(243, 232, 210, 0.4)',
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...Shadows.card,
  },
  halfCardTextContainer: {
    zIndex: 2,
  },
  halfCardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.navy,
    lineHeight: 15,
  },
  halfCardDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.grayWarm,
    marginTop: 3,
    lineHeight: 13,
  },
  previewImageWrapper: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    opacity: 0.18,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  timelineGraphicOverlay: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: Colors.navy,
    borderRadius: 35,
    opacity: 0.1,
  },
  treeGraphicOverlay: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: 35,
    opacity: 0.1,
  },
  carouselContainer: {
    paddingLeft: 24,
    paddingRight: 12,
    gap: 12,
    paddingBottom: 12,
  },
  characterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: 140,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(243, 232, 210, 0.4)',
    ...Shadows.card,
  },
  characterImageWrapper: {
    height: 120,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
  charFloatIconLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  charFloatIconRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  charChatBubble: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE27A',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  characterDetails: {
    marginTop: 8,
    alignItems: 'center',
  },
  charName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.navy,
  },
  charDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.grayWarm,
    marginTop: 1,
  },
  spiritCard: {
    flex: 1,
    borderRadius: 22,
    height: 110,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.card,
  },
  spiritBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(19, 41, 75, 0.75)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    zIndex: 3,
  },
  spiritBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#FFE27A',
  },
  spiritCardContent: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    zIndex: 2,
  },
  spiritCardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.white,
  },
  spiritCardSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
});
