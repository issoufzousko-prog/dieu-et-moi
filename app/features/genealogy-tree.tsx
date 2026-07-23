/**
 * Dieu et Moi — Arbre Généalogique Biblique
 * Exploration des grandes lignées bibliques et profils personnages
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Shadows } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { GENEALOGY_DATA } from '@/lib/genealogyData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GREEN = '#6E9476';
const GREEN_LIGHT = '#E6F0E8';
const GREEN_DARK = '#4F7357';
const GOLD = '#D4A85A';
const GOLD_LIGHT = '#F5EFE0';

const M3_SPRING = { damping: 20, stiffness: 180, mass: 0.8 };
const M3_STANDARD = { duration: 300, easing: Easing.bezier(0.2, 0, 0, 1) };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Types ───────────────────────────────────────────────────────────────────
interface GenealogyPerson {
  id: string;
  name: string;
  hebrewName: string;
  lifespan: string;
  ageAtFirstSon?: number | null;
  role: string;
  reference: string;
  isMessianicLine: boolean;
  keyFact: string;
  parentIds?: string[];
  spouseNames?: string[];
  childIds?: string[];
}

interface Generation {
  generationNumber: number;
  people: GenealogyPerson[];
}

interface LineageData {
  lineageName: string;
  reference: string;
  totalGenerations: number;
  context: string;
  generations: Generation[];
}

interface SearchPerson {
  id: string;
  name: string;
  hebrewName: string;
  lifespan: string;
  approximatePeriod: string;
  tribe?: string;
  role: string;
  reference: string;
  isMessianicLine: boolean;
  keyFact: string;
}

interface SearchResult {
  person: SearchPerson;
  father?: { name: string; reference: string };
  mother?: { name: string; reference: string };
  spouses: { name: string; reference: string }[];
  siblings: { name: string; relation: string; reference: string }[];
  children: { name: string; reference: string; isMessianicLine: boolean }[];
  ancestors: { name: string; generation: number; reference: string }[];
  messianicLineNote: string | null;
  spiritualSignificance: string;
}

// ─── Composants ───────────────────────────────────────────────────────────────
function M3Pressable({
  onPress, children, style, disabled,
}: {
  onPress?: () => void; children: React.ReactNode; style?: any; disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <AnimatedPressable
      onPressIn={() => { if (!disabled) { scale.value = withSpring(0.96, M3_SPRING); opacity.value = withTiming(0.85, M3_STANDARD); } }}
      onPressOut={() => { scale.value = withSpring(1, M3_SPRING); opacity.value = withTiming(1, M3_STANDARD); }}
      onPress={disabled ? undefined : onPress}
      style={[style, aStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionLabelText}>{text}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ─── Lignées prédéfinies ──────────────────────────────────────────────────────
const PREDEFINED_LINEAGES = [
  { id: 'adam-noah', label: 'Adam → Noé', ref: 'Genèse 5', desc: 'Les 10 patriarches antédiluviens' },
  { id: 'noah-abraham', label: 'Noé → Abraham', ref: 'Genèse 11', desc: 'La reconstruction après le déluge' },
  { id: 'abraham-david', label: 'Abraham → David', ref: '1 Chroniques 1-2', desc: 'La lignée vers la royauté' },
  { id: 'david-jesus', label: 'David → Jésus', ref: 'Matthieu 1', desc: 'La lignée royale messianique' },
  { id: 'jacob-12-tribes', label: '12 fils de Jacob', ref: 'Genèse 29-35', desc: 'Les origines des 12 tribus' },
];

// ─── Onglets ──────────────────────────────────────────────────────────────────
const TABS = ['Lignées', 'Recherche'] as const;
type Tab = typeof TABS[number];

type ViewState = 'selection' | 'loading' | 'lineage' | 'profile';

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function GenealogyTreeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<Tab>('Lignées');
  const [viewState, setViewState] = useState<ViewState>('selection');
  const [loadingFor, setLoadingFor] = useState<string>('');

  const [lineageData, setLineageData] = useState<LineageData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<GenealogyPerson | null>(null);
  const [expandedGen, setExpandedGen] = useState<number | null>(0);

  const loadLineage = async (lineageItem: typeof PREDEFINED_LINEAGES[0]) => {
    setLoadingFor(lineageItem.label);
    setViewState('loading');
    setLineageData(null);
    setExpandedGen(0);
    try {
      const data = GENEALOGY_DATA[lineageItem.id];
      if (!data) throw new Error('Données non trouvées');
      
      // Petit délai pour un rendu fluide
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLineageData(data);
      setViewState('lineage');
    } catch (err: any) {
      console.error('[Genealogy] lineage error:', err);
      setViewState('selection');
    }
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoadingFor(searchQuery.trim());
    setViewState('loading');
    setSearchResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('genealogy-tree', {
        body: { action: 'search', personName: searchQuery.trim() },
      });
      if (error || !data) throw new Error(error?.message || 'Réponse vide');
      setSearchResult(data);
      setViewState('profile');
    } catch (err: any) {
      console.error('[Genealogy] search error:', err);
      setViewState('selection');
    }
  };

  const goBack = () => {
    if (viewState === 'lineage' || viewState === 'profile') {
      setViewState('selection');
      setLineageData(null);
      setSearchResult(null);
      setSelectedPerson(null);
    } else {
      router.back();
    }
  };

  // ─── Header ────────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <Animated.View entering={FadeInUp.duration(400)} style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <LinearGradient colors={['#8BB393', GREEN_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        <M3Pressable onPress={goBack} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.white} />
        </M3Pressable>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="family-tree" size={17} color="rgba(255,255,255,0.85)" />
          <Text style={styles.headerTitle}>Arbre généalogique</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {viewState === 'selection' && (
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <Pressable key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Animated.View>
  );

  // ─── Sélection lignées ─────────────────────────────────────────────────────
  const renderLineageSelection = () => (
    <ScrollView contentContainerStyle={styles.selContent} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <Text style={styles.selTitle}>Lignées bibliques</Text>
        <Text style={styles.selSubtitle}>
          Sélectionnez une grande lignée généalogique pour l'explorer génération par génération, depuis les patriarches jusqu'à Jésus.
        </Text>

        {PREDEFINED_LINEAGES.map((item, idx) => (
          <M3Pressable key={item.id} onPress={() => loadLineage(item)} style={styles.lineageCard}>
            <LinearGradient
              colors={[GREEN_LIGHT, '#F0F7F1']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.lineageCardInner}
            >
              <View style={styles.lineageIconBox}>
                <MaterialCommunityIcons name="family-tree" size={22} color={GREEN_DARK} />
              </View>
              <View style={styles.lineageInfo}>
                <Text style={styles.lineageLabel}>{item.label}</Text>
                <Text style={styles.lineageRef}>{item.ref}</Text>
                <Text style={styles.lineageDesc}>{item.desc}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={GREEN} />
            </LinearGradient>
          </M3Pressable>
        ))}

        <View style={styles.goldNotice}>
          <MaterialCommunityIcons name="star-four-points" size={14} color={GOLD} />
          <Text style={styles.goldNoticeText}>Les personnages dans la lignée messianique directe sont signalés par un indicateur doré.</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );

  // ─── Recherche ─────────────────────────────────────────────────────────────
  const renderSearch = () => (
    <ScrollView contentContainerStyle={styles.selContent} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <Text style={styles.selTitle}>Recherche personnage</Text>
        <Text style={styles.selSubtitle}>
          Entrez le nom d'un personnage biblique pour obtenir son profil généalogique complet : ancêtres, descendants, épouses et signification spirituelle.
        </Text>

        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Ex: Ruth, Booz, Déborah, Jéthro, Rahab..."
          placeholderTextColor={Colors.grayWarm}
          onSubmitEditing={runSearch}
          returnKeyType="search"
        />

        <View style={styles.quickSearchRow}>
          {['Abraham', 'David', 'Ruth', 'Marie', 'Jacob', 'Rahab'].map(n => (
            <Pressable key={n} onPress={() => { setSearchQuery(n); }} style={styles.quickChip}>
              <Text style={styles.quickChipText}>{n}</Text>
            </Pressable>
          ))}
        </View>

        <M3Pressable
          onPress={runSearch}
          disabled={!searchQuery.trim()}
          style={[styles.searchBtn, !searchQuery.trim() && { opacity: 0.4 }]}
        >
          <LinearGradient colors={['#8BB393', GREEN_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.searchBtnInner}>
            <MaterialCommunityIcons name="magnify" size={18} color={Colors.white} />
            <Text style={styles.searchBtnText}>Rechercher le profil</Text>
          </LinearGradient>
        </M3Pressable>
      </Animated.View>
    </ScrollView>
  );

  // ─── Chargement ────────────────────────────────────────────────────────────
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.loadingCard}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingTitle}>Construction de l'arbre</Text>
        <Text style={styles.loadingSubtitle}>
          Recherche dans les Ecritures et reconstitution des liens familiaux bibliques...
        </Text>
        <View style={styles.loadingLabelBox}>
          <Text style={styles.loadingLabelText}>{loadingFor}</Text>
        </View>
      </Animated.View>
    </View>
  );

  // ─── Vue lignée (arbre visuel) ─────────────────────────────────────────────
  const renderLineage = () => {
    if (!lineageData) return null;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.treeContent}>
        <Animated.View entering={FadeInDown.duration(350)}>
          {/* Context */}
          <View style={styles.contextCard}>
            <Text style={styles.contextTitle}>{lineageData.lineageName}</Text>
            <Text style={styles.contextRef}>{lineageData.reference} · {lineageData.totalGenerations} générations</Text>
            <Text style={styles.contextText}>{lineageData.context}</Text>
          </View>

          <SectionLabel text="GENERATIONS" />

          {lineageData.generations?.map((gen) => {
            const isExpanded = expandedGen === gen.generationNumber - 1;
            return (
              <View key={gen.generationNumber} style={styles.genBlock}>
                {/* Generation header */}
                <Pressable
                  onPress={() => setExpandedGen(isExpanded ? null : gen.generationNumber - 1)}
                  style={styles.genHeader}
                >
                  <View style={styles.genNumberBadge}>
                    <Text style={styles.genNumberText}>{gen.generationNumber}</Text>
                  </View>
                  <Text style={styles.genHeaderLabel}>
                    {gen.people.map(p => p.name).join(' · ')}
                  </Text>
                  {gen.people.some(p => p.isMessianicLine) && (
                    <MaterialCommunityIcons name="star-four-points" size={14} color={GOLD} />
                  )}
                  <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.grayWarm} />
                </Pressable>

                {/* Connector line */}
                {gen.generationNumber < (lineageData.totalGenerations || 0) && (
                  <View style={styles.connectorLine} />
                )}

                {/* Expanded persons */}
                {isExpanded && (
                  <Animated.View entering={FadeIn.duration(250)} style={styles.genPersonsRow}>
                    {gen.people.map((person) => (
                      <View
                        key={person.id}
                        style={[
                          styles.personCard,
                          person.isMessianicLine && styles.personCardGold,
                        ]}
                      >
                        {person.isMessianicLine && (
                          <View style={styles.messianicBadge}>
                            <MaterialCommunityIcons name="star-four-points" size={10} color={GOLD} />
                            <Text style={styles.messianicBadgeText}>Lignée messianique</Text>
                          </View>
                        )}

                        <Text style={styles.personName}>{person.name}</Text>
                        {person.hebrewName ? (
                          <Text style={styles.personHebrew}>{person.hebrewName}</Text>
                        ) : null}

                        <View style={styles.personMetaRow}>
                          <MaterialCommunityIcons name="book-open-variant" size={11} color={Colors.grayWarm} />
                          <Text style={styles.personRef}>{person.reference}</Text>
                        </View>

                        {person.lifespan ? (
                          <View style={styles.personLifeRow}>
                            <MaterialCommunityIcons name="timer-sand" size={11} color={GREEN} />
                            <Text style={styles.personLife}>{person.lifespan}</Text>
                          </View>
                        ) : null}

                        <Text style={styles.personRole}>{person.role}</Text>

                        {person.keyFact ? (
                          <View style={styles.keyFactBox}>
                            <Text style={styles.keyFactText}>{person.keyFact}</Text>
                          </View>
                        ) : null}

                        {person.spouseNames && person.spouseNames.length > 0 && (
                          <Text style={styles.personSpouses}>
                            Epouse(s) : {person.spouseNames.join(', ')}
                          </Text>
                        )}
                      </View>
                    ))}
                  </Animated.View>
                )}
              </View>
            );
          })}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ─── Vue profil personnage ─────────────────────────────────────────────────
  const renderProfile = () => {
    if (!searchResult) return null;
    const { person, father, mother, spouses, siblings, children, ancestors, messianicLineNote, spiritualSignificance } = searchResult;

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.treeContent}>
        <Animated.View entering={FadeInDown.duration(350)}>
          {/* Hero card */}
          <View style={[styles.profileHero, person.isMessianicLine && styles.profileHeroGold]}>
            {person.isMessianicLine && (
              <View style={styles.messianicBadge}>
                <MaterialCommunityIcons name="star-four-points" size={12} color={GOLD} />
                <Text style={styles.messianicBadgeText}>Lignée messianique</Text>
              </View>
            )}
            <Text style={styles.profileName}>{person.name}</Text>
            {person.hebrewName ? <Text style={styles.profileHebrew}>{person.hebrewName}</Text> : null}
            <Text style={styles.profileRole}>{person.role}</Text>

            <View style={styles.profileMetaRow}>
              {person.lifespan ? (
                <View style={styles.profileMetaChip}>
                  <MaterialCommunityIcons name="timer-sand" size={11} color={GREEN_DARK} />
                  <Text style={styles.profileMetaText}>{person.lifespan}</Text>
                </View>
              ) : null}
              {person.approximatePeriod ? (
                <View style={styles.profileMetaChip}>
                  <MaterialCommunityIcons name="calendar-range" size={11} color={GREEN_DARK} />
                  <Text style={styles.profileMetaText}>{person.approximatePeriod}</Text>
                </View>
              ) : null}
              {person.tribe ? (
                <View style={styles.profileMetaChip}>
                  <MaterialCommunityIcons name="account-group" size={11} color={GREEN_DARK} />
                  <Text style={styles.profileMetaText}>{person.tribe}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.profileRef}>{person.reference}</Text>
            {person.keyFact ? <Text style={styles.profileKeyFact}>{person.keyFact}</Text> : null}
          </View>

          {/* Family Grid */}
          <SectionLabel text="LIENS FAMILIAUX" />
          <View style={styles.familyGrid}>
            {/* Parents */}
            {(father || mother) && (
              <View style={styles.familySection}>
                <Text style={styles.familySectionTitle}>Parents</Text>
                {father && (
                  <View style={styles.familyItem}>
                    <MaterialCommunityIcons name="human-male" size={14} color={GREEN} />
                    <Text style={styles.familyItemName}>{father.name}</Text>
                    <Text style={styles.familyItemRef}>{father.reference}</Text>
                  </View>
                )}
                {mother && (
                  <View style={styles.familyItem}>
                    <MaterialCommunityIcons name="human-female" size={14} color={GREEN} />
                    <Text style={styles.familyItemName}>{mother.name}</Text>
                    <Text style={styles.familyItemRef}>{mother.reference}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Spouses */}
            {spouses && spouses.length > 0 && (
              <View style={styles.familySection}>
                <Text style={styles.familySectionTitle}>Épouse(s) / Époux</Text>
                {spouses.map((s, i) => (
                  <View key={i} style={styles.familyItem}>
                    <MaterialCommunityIcons name="ring" size={14} color={GOLD} />
                    <Text style={styles.familyItemName}>{s.name}</Text>
                    <Text style={styles.familyItemRef}>{s.reference}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Children */}
            {children && children.length > 0 && (
              <View style={styles.familySection}>
                <Text style={styles.familySectionTitle}>Descendants directs</Text>
                {children.map((c, i) => (
                  <View key={i} style={[styles.familyItem, c.isMessianicLine && styles.familyItemGold]}>
                    {c.isMessianicLine && <MaterialCommunityIcons name="star-four-points" size={12} color={GOLD} />}
                    {!c.isMessianicLine && <MaterialCommunityIcons name="account" size={14} color={GREEN} />}
                    <Text style={styles.familyItemName}>{c.name}</Text>
                    <Text style={styles.familyItemRef}>{c.reference}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Siblings */}
            {siblings && siblings.length > 0 && (
              <View style={styles.familySection}>
                <Text style={styles.familySectionTitle}>Frères et soeurs</Text>
                {siblings.map((s, i) => (
                  <View key={i} style={styles.familyItem}>
                    <MaterialCommunityIcons name="account-multiple" size={14} color={GREEN} />
                    <Text style={styles.familyItemName}>{s.name}</Text>
                    <Text style={styles.familyItemRef}>{s.reference}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Ancestors chain */}
          {ancestors && ancestors.length > 0 && (
            <>
              <SectionLabel text="CHAINE D'ANCETRES" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ancestorChain}>
                {[...ancestors].reverse().map((a, i) => (
                  <View key={i} style={styles.ancestorChainItem}>
                    <View style={styles.ancestorDot} />
                    {i < ancestors.length - 1 && <View style={styles.ancestorLine} />}
                    <Text style={styles.ancestorName}>{a.name}</Text>
                    <Text style={styles.ancestorRef}>{a.reference}</Text>
                  </View>
                ))}
                <View style={styles.ancestorChainItem}>
                  <View style={[styles.ancestorDot, styles.ancestorDotSelf]} />
                  <Text style={[styles.ancestorName, { color: GREEN_DARK, fontWeight: '800' }]}>{person.name}</Text>
                </View>
              </ScrollView>
            </>
          )}

          {/* Messianic note */}
          {messianicLineNote && (
            <>
              <SectionLabel text="LIGNEE MESSIANIQUE" />
              <View style={styles.messianicCard}>
                <MaterialCommunityIcons name="star-four-points" size={16} color={GOLD} />
                <Text style={styles.messianicCardText}>{messianicLineNote}</Text>
              </View>
            </>
          )}

          {/* Spiritual significance */}
          <SectionLabel text="SIGNIFICATION SPIRITUELLE" />
          <View style={styles.signifCard}>
            <Text style={styles.signifText}>{spiritualSignificance}</Text>
          </View>
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ─── Root ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      {renderHeader()}
      <View style={styles.body}>
        {viewState === 'loading' && renderLoading()}
        {viewState === 'selection' && activeTab === 'Lignées' && renderLineageSelection()}
        {viewState === 'selection' && activeTab === 'Recherche' && renderSearch()}
        {viewState === 'lineage' && renderLineage()}
        {viewState === 'profile' && renderProfile()}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ivory },

  header: { zIndex: 10, ...(Platform.OS !== 'web' ? Shadows.hover : {}) },
  headerGradient: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Colors.white, letterSpacing: 0.2 },

  tabBar: {
    flexDirection: 'row', backgroundColor: GREEN_DARK,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.white },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  tabTextActive: { color: Colors.white, fontWeight: '700' },

  body: { flex: 1 },

  // Selection
  selContent: { padding: 20, paddingBottom: 60 },
  selTitle: { fontSize: 21, fontWeight: '800', color: Colors.navy, marginBottom: 8 },
  selSubtitle: { fontSize: 14, color: Colors.grayWarm, lineHeight: 21, marginBottom: 24 },

  lineageCard: { marginBottom: 12, borderRadius: 14, overflow: 'hidden', ...(Platform.OS !== 'web' ? Shadows.card : {}) },
  lineageCardInner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  lineageIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  lineageInfo: { flex: 1 },
  lineageLabel: { fontSize: 15, fontWeight: '800', color: Colors.navy },
  lineageRef: { fontSize: 11, fontWeight: '700', color: GREEN_DARK, marginTop: 2 },
  lineageDesc: { fontSize: 12, color: Colors.grayWarm, marginTop: 2 },

  goldNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8,
    backgroundColor: GOLD_LIGHT, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: GOLD + '40',
  },
  goldNoticeText: { flex: 1, fontSize: 12, color: Colors.navy, lineHeight: 18 },

  // Search
  searchInput: {
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#C8DEC9', padding: 14,
    fontSize: 15, color: Colors.navy,
    marginBottom: 14, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  quickSearchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  quickChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: GREEN_LIGHT, borderWidth: 1, borderColor: GREEN + '80',
  },
  quickChipText: { fontSize: 12, color: GREEN_DARK, fontWeight: '600' },
  searchBtn: { borderRadius: 14, overflow: 'hidden', ...(Platform.OS !== 'web' ? Shadows.hover : {}) },
  searchBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  searchBtnText: { fontSize: 15, fontWeight: '800', color: Colors.white },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 32,
    alignItems: 'center', width: '100%', maxWidth: 360, gap: 16,
    ...(Platform.OS !== 'web' ? Shadows.hover : {}),
  },
  loadingTitle: { fontSize: 17, fontWeight: '800', color: Colors.navy },
  loadingSubtitle: { fontSize: 14, color: Colors.grayWarm, textAlign: 'center', lineHeight: 20 },
  loadingLabelBox: { backgroundColor: GREEN_LIGHT, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  loadingLabelText: { fontSize: 13, fontWeight: '700', color: GREEN_DARK, textAlign: 'center' },

  // Tree / Lineage
  treeContent: { padding: 16, paddingBottom: 60 },
  contextCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 8, borderLeftWidth: 4, borderLeftColor: GREEN,
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  contextTitle: { fontSize: 17, fontWeight: '800', color: Colors.navy, marginBottom: 4 },
  contextRef: { fontSize: 11, fontWeight: '700', color: GREEN_DARK, marginBottom: 8 },
  contextText: { fontSize: 13, color: Colors.navy, lineHeight: 20 },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#C8DEC9' },
  sectionLabelText: { fontSize: 10, fontWeight: '800', color: GREEN, letterSpacing: 1.5 },

  genBlock: { marginBottom: 4, position: 'relative' },
  genHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: 10, padding: 12,
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  genNumberBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  genNumberText: { fontSize: 13, fontWeight: '800', color: Colors.white },
  genHeaderLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.navy },

  connectorLine: { width: 2, height: 12, backgroundColor: GREEN, marginLeft: 19 },

  genPersonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 6, paddingLeft: 4 },
  personCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    minWidth: Math.min(SCREEN_WIDTH * 0.44, 200), flex: 1,
    borderWidth: 1, borderColor: '#E0EEE0',
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  personCardGold: { borderColor: GOLD + '50', borderTopWidth: 3, borderTopColor: GOLD },
  messianicBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  messianicBadgeText: { fontSize: 9, fontWeight: '800', color: GOLD, letterSpacing: 0.5, textTransform: 'uppercase' },
  personName: { fontSize: 15, fontWeight: '800', color: Colors.navy },
  personHebrew: { fontSize: 14, fontStyle: 'italic', color: Colors.grayWarm, marginBottom: 6 },
  personMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  personRef: { fontSize: 11, color: GREEN_DARK, fontWeight: '600' },
  personLifeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  personLife: { fontSize: 11, color: GREEN },
  personRole: { fontSize: 12, color: Colors.grayWarm, lineHeight: 16, marginBottom: 6 },
  keyFactBox: { backgroundColor: GREEN_LIGHT, borderRadius: 6, padding: 8, marginTop: 4 },
  keyFactText: { fontSize: 11, color: GREEN_DARK, lineHeight: 16 },
  personSpouses: { fontSize: 11, color: Colors.grayWarm, marginTop: 6, fontStyle: 'italic' },

  // Profile
  profileHero: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 20,
    marginBottom: 8, borderLeftWidth: 4, borderLeftColor: GREEN,
    ...(Platform.OS !== 'web' ? Shadows.hover : {}),
  },
  profileHeroGold: { borderLeftColor: GOLD, borderTopWidth: 2, borderTopColor: GOLD + '60' },
  profileName: { fontSize: 24, fontWeight: '800', color: Colors.navy, marginBottom: 4 },
  profileHebrew: { fontSize: 18, fontStyle: 'italic', color: Colors.grayWarm, marginBottom: 8 },
  profileRole: { fontSize: 14, color: GREEN_DARK, fontWeight: '700', marginBottom: 12 },
  profileMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  profileMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GREEN_LIGHT, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  profileMetaText: { fontSize: 11, color: GREEN_DARK, fontWeight: '600' },
  profileRef: { fontSize: 12, fontWeight: '700', color: GREEN, marginBottom: 8 },
  profileKeyFact: { fontSize: 13, color: Colors.navy, lineHeight: 20, fontStyle: 'italic' },

  familyGrid: { gap: 12 },
  familySection: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  familySectionTitle: { fontSize: 11, fontWeight: '800', color: GREEN, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  familyItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  familyItemGold: { backgroundColor: GOLD_LIGHT, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  familyItemName: { fontSize: 14, fontWeight: '700', color: Colors.navy, flex: 1 },
  familyItemRef: { fontSize: 11, color: Colors.grayWarm },

  ancestorChain: { paddingVertical: 8, paddingHorizontal: 4, gap: 0 },
  ancestorChainItem: { alignItems: 'center', minWidth: 80, position: 'relative' },
  ancestorDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN, marginBottom: 4 },
  ancestorDotSelf: { backgroundColor: GREEN_DARK, width: 16, height: 16, borderRadius: 8 },
  ancestorLine: { position: 'absolute', right: -20, top: 4, width: 28, height: 2, backgroundColor: '#C8DEC9' },
  ancestorName: { fontSize: 11, fontWeight: '700', color: Colors.navy, textAlign: 'center' },
  ancestorRef: { fontSize: 9, color: Colors.grayWarm, textAlign: 'center', marginTop: 2 },

  messianicCard: {
    backgroundColor: GOLD_LIGHT, borderRadius: 12, padding: 14, flexDirection: 'row',
    alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: GOLD + '40',
  },
  messianicCardText: { flex: 1, fontSize: 13, color: Colors.navy, lineHeight: 20 },

  signifCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, ...(Platform.OS !== 'web' ? Shadows.card : {}) },
  signifText: { fontSize: 14, color: Colors.navy, lineHeight: 22 },
});
