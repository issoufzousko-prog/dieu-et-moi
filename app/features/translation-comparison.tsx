/**
 * Dieu et Moi — Comparaison des traductions et Grec original
 * Analyse comparée de 14 versions (Français, Anglais, Grec, Latin)
 * avec texte interlinéaire original et analyse grammaticale
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
  TouchableOpacity,
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

const BLUE_TEAL = '#4AA9C8';
const TEAL_LIGHT = '#E6EFF5';
const TEAL_DARK = '#2D7C98';

const M3_SPRING = { damping: 20, stiffness: 180, mass: 0.8 };
const M3_STANDARD = { duration: 300, easing: Easing.bezier(0.2, 0, 0, 1) };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Types ───────────────────────────────────────────────────────────────────

interface Translation {
  code: string;
  name: string;
  year: number;
  language: string;
  languageLabel: string;
  tradition: string;
  approach: string;
  literalScore: number;
  text: string;
  transliteration: string | null;
}

interface CompareData {
  reference: string;
  normalizedReference: string;
  testament: string;
  translations: Translation[];
}

interface InterlinearWord {
  position: number;
  original: string;
  transliteration: string;
  strongs: string;
  lemma: string;
  grammarType: string;
  parsing: string;
  parsingExpanded: string;
  meaning: string;
  semanticNote: string;
  crossReferences: string[];
}

interface InterlinearData {
  reference: string;
  language: string;
  fullOriginalText: string;
  fullTransliteration: string;
  words: InterlinearWord[];
  textualNotes: string;
}

interface KeyDifference {
  greekOrHebrewWord: string;
  transliteration: string;
  strongs: string;
  translations: Record<string, string>;
  explanation: string;
  doctrinalImplication: string;
}

interface SpectrumItem {
  code: string;
  label: string;
  position: number;
  note: string;
}

interface AnalysisData {
  reference: string;
  keyDifferences: KeyDifference[];
  literalVsDynamicSpectrum: SpectrumItem[];
  translatorPhilosophyNote: string;
}

// ─── Composants réutilisables ─────────────────────────────────────────────────

function M3Pressable({
  onPress, children, style, disabled, activeOpacity = 0.85,
}: {
  onPress?: () => void; children: React.ReactNode; style?: any; disabled?: boolean; activeOpacity?: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <AnimatedPressable
      onPressIn={() => { if (!disabled) { scale.value = withSpring(0.96, M3_SPRING); opacity.value = withTiming(activeOpacity, M3_STANDARD); } }}
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

function SubLoadingView({ text }: { text: string }) {
  return (
    <View style={styles.subLoading}>
      <ActivityIndicator size="small" color={BLUE_TEAL} />
      <Text style={styles.subLoadingText}>{text}</Text>
    </View>
  );
}

// ─── Onglets ──────────────────────────────────────────────────────────────────
const TABS = ['Comparaison', 'Grec / Hébreu', 'Analyse Écarts'] as const;
type Tab = typeof TABS[number];

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
      {TABS.map((t) => (
        <Pressable key={t} onPress={() => onChange(t)} style={[styles.tab, active === t && styles.tabActive]}>
          <Text style={[styles.tabText, active === t && styles.tabTextActive]}>{t}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Écran Principal ──────────────────────────────────────────────────────────
type Phase = 'form' | 'loading' | 'result';
type LangFilter = 'all' | 'fr' | 'en' | 'el' | 'la';

export default function TranslationComparisonScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [reference, setReference] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [activeTab, setActiveTab] = useState<Tab>('Comparaison');
  const [langFilter, setLangFilter] = useState<LangFilter>('all');

  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [interlinearData, setInterlinearData] = useState<InterlinearData | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  const [loadingInterlinear, setLoadingInterlinear] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Expansions
  const [expandedWord, setExpandedWord] = useState<number | null>(null);
  const [expandedDiff, setExpandedDiff] = useState<number | null>(null);

  const runComparison = async () => {
    if (!reference.trim()) return;
    setPhase('loading');
    setCompareData(null);
    setInterlinearData(null);
    setAnalysisData(null);
    setExpandedWord(null);
    setExpandedDiff(null);

    try {
      const { data, error } = await supabase.functions.invoke('translation-comparison', {
        body: { action: 'compare', reference: reference.trim() },
      });
      if (error || !data) throw new Error(error?.message || 'Réponse vide');
      setCompareData(data);
      setPhase('result');
      setActiveTab('Comparaison');

      // Background fetches
      fetchBackground('interlinear', setInterlinearData, setLoadingInterlinear);
      fetchBackground('analysis', setAnalysisData, setLoadingAnalysis);
    } catch (err: any) {
      console.error('[TranslationComparison] Error:', err);
      setPhase('form');
    }
  };

  const fetchBackground = async (
    action: string,
    setter: (d: any) => void,
    setLoading: (b: boolean) => void,
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('translation-comparison', {
        body: { action, reference: reference.trim() },
      });
      if (!error && data) setter(data);
    } catch (err) {
      console.error(`[TranslationComparison] ${action} background error:`, err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render Form ───────────────────────────────────────────────────────────
  const renderForm = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <Text style={styles.formTitle}>Comparaison des traductions</Text>
        <Text style={styles.formSubtitle}>
          Entrez un passage biblique pour comparer 14 versions majeures et étudier les racines grecques ou hébraïques d'origine.
        </Text>

        <Text style={styles.fieldLabel}>Référence biblique</Text>
        <TextInput
          style={styles.textInput}
          value={reference}
          onChangeText={setReference}
          placeholder="Ex: Jean 3:16, Genèse 1:1, Psaumes 23:1..."
          placeholderTextColor={Colors.grayWarm}
        />

        <View style={styles.examplesRow}>
          {['Jean 1:1', 'Romains 8:28', 'Matthieu 16:18', 'Genèse 1:1'].map(ex => (
            <Pressable key={ex} onPress={() => setReference(ex)} style={styles.exampleChip}>
              <Text style={styles.exampleChipText}>{ex}</Text>
            </Pressable>
          ))}
        </View>

        <M3Pressable
          onPress={runComparison}
          disabled={!reference.trim()}
          style={[styles.analyzeBtn, !reference.trim() && { opacity: 0.4 }]}
        >
          <LinearGradient colors={['#7BC8E0', TEAL_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.analyzeBtnGradient}>
            <MaterialCommunityIcons name="translate" size={20} color={Colors.white} />
            <Text style={styles.analyzeBtnText}>Lancer la comparaison</Text>
          </LinearGradient>
        </M3Pressable>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Langues & versions comparées</Text>
          {[
            '6 versions françaises (LSG, NEG, Segond 21, TOB, Semeur, Parole de Vie)',
            '4 versions anglaises (KJV, ESV, NIV, NLT)',
            '3 versions grecques sources (Textus Receptus, Nestle-Aland, Septante)',
            'Latin (Vulgate de Jérôme)',
            'Grec interlinéaire avec translittération et numéros Strong',
          ].map((item, i) => (
            <View key={i} style={styles.infoRow}>
              <View style={styles.infoDot} />
              <Text style={styles.infoText}>{item}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );

  // ─── Render Loading ────────────────────────────────────────────────────────
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.loadingCard}>
        <ActivityIndicator size="large" color={BLUE_TEAL} />
        <Text style={styles.loadingTitle}>Extraction & Alignement</Text>
        <Text style={styles.loadingSubtitle}>
          Récupération des manuscrits grecs originaux, des versions latines, anglaises et françaises...
        </Text>
        <View style={styles.loadingPassageBox}>
          <Text style={styles.loadingPassageText}>{reference}</Text>
        </View>
      </Animated.View>
    </View>
  );

  // ─── Render Compare Tab ────────────────────────────────────────────────────
  const renderCompare = () => {
    if (!compareData) return <SubLoadingView text="Chargement des traductions..." />;

    const filtered = compareData.translations.filter(t => {
      if (langFilter === 'all') return true;
      return t.language === langFilter;
    });

    return (
      <View style={{ flex: 1 }}>
        {/* Filtre de langue */}
        <View style={styles.filterBar}>
          {(['all', 'fr', 'en', 'el', 'la'] as const).map(f => {
            const labelMap = { all: 'Toutes', fr: 'Français', en: 'Anglais', el: 'Grec', la: 'Latin' };
            const selected = langFilter === f;
            return (
              <TouchableOpacity key={f} onPress={() => setLangFilter(f)} style={[styles.filterChip, selected && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{labelMap[f]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
          <Animated.View entering={FadeInDown.duration(350)}>
            {filtered.map((t, i) => (
              <View key={t.code} style={styles.translationCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <View style={styles.nameRow}>
                      <Text style={styles.versionName}>{t.name}</Text>
                      <View style={styles.badgeCode}>
                        <Text style={styles.badgeCodeText}>{t.code}</Text>
                      </View>
                    </View>
                    <Text style={styles.versionMeta}>
                      {t.languageLabel} · {t.year > 0 ? t.year : Math.abs(t.year) + ' av. J.-C.'} · {t.tradition}
                    </Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreLabel}>Littéralité</Text>
                    <Text style={styles.scoreVal}>{t.literalScore}/10</Text>
                  </View>
                </View>

                {/* Barre de spectre */}
                <View style={styles.spectrumTrack}>
                  <View style={[styles.spectrumIndicator, { left: `${t.literalScore * 10 - 6}%` }]} />
                </View>
                <View style={styles.spectrumLabels}>
                  <Text style={styles.spectrumLabelSide}>Dynamique</Text>
                  <Text style={styles.spectrumLabelSide}>Littérale</Text>
                </View>

                <View style={styles.textDivider} />

                {/* Texte du verset */}
                <Text style={[
                  styles.versetText,
                  t.language === 'el' && styles.greekTextFont,
                ]}>
                  {t.text}
                </Text>

                {t.transliteration && (
                  <Text style={styles.transliterationText}>
                    {t.transliteration}
                  </Text>
                )}
              </View>
            ))}
          </Animated.View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  };

  // ─── Render Interlinear Tab ────────────────────────────────────────────────
  const renderInterlinear = () => {
    if (loadingInterlinear) return <SubLoadingView text="Chargement du texte interlinéaire..." />;
    if (!interlinearData) return <SubLoadingView text="Disponible après le chargement initial." />;

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Animated.View entering={FadeInDown.duration(350)}>

          {/* Original Full Text */}
          <View style={styles.fullOriginalCard}>
            <Text style={styles.originalTextHeader}>Texte original</Text>
            <Text style={[styles.fullOriginalText, interlinearData.language === 'grec' && styles.greekTextFont]}>
              {interlinearData.fullOriginalText}
            </Text>
            {interlinearData.fullTransliteration && (
              <Text style={styles.fullTransliterationText}>
                {interlinearData.fullTransliteration}
              </Text>
            )}
          </View>

          <SectionLabel text="ANALYSE MOT A MOT" />

          {/* Words list */}
          {interlinearData.words?.map((w, i) => {
            const isExpanded = expandedWord === i;
            return (
              <Pressable key={i} onPress={() => setExpandedWord(isExpanded ? null : i)} style={styles.wordCard}>
                <View style={styles.wordHeader}>
                  <View style={styles.wordHeaderLeft}>
                    <Text style={[styles.wordOriginal, interlinearData.language === 'grec' && styles.greekTextFont]}>
                      {w.original}
                    </Text>
                    <Text style={styles.wordTranslit}>{w.transliteration}</Text>
                  </View>
                  <View style={styles.wordHeaderRight}>
                    <Text style={styles.wordMeaning}>{w.meaning}</Text>
                    <View style={styles.strongBadge}>
                      <Text style={styles.strongBadgeText}>{w.strongs}</Text>
                    </View>
                  </View>
                </View>

                {isExpanded && (
                  <Animated.View entering={FadeIn.duration(250)} style={styles.wordDetail}>
                    <View style={styles.textDivider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Lemme (base) :</Text>
                      <Text style={styles.detailVal}>{w.lemma}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type grammatical :</Text>
                      <Text style={styles.detailVal}>{w.grammarType}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Analyse morphologique :</Text>
                      <Text style={styles.detailVal}>{w.parsingExpanded} ({w.parsing})</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes sémantiques :</Text>
                      <Text style={styles.detailVal}>{w.semanticNote}</Text>
                    </View>
                    {w.crossReferences?.length > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Passages croisés :</Text>
                        <Text style={[styles.detailVal, { color: TEAL_DARK, fontWeight: '700' }]}>
                          {w.crossReferences.join(', ')}
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                )}
              </Pressable>
            );
          })}

          {interlinearData.textualNotes && (
            <>
              <SectionLabel text="CRITIQUE TEXTUELLE" />
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{interlinearData.textualNotes}</Text>
              </View>
            </>
          )}

        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ─── Render Analysis Tab ───────────────────────────────────────────────────
  const renderAnalysis = () => {
    if (loadingAnalysis) return <SubLoadingView text="Chargement de l'analyse linguistique..." />;
    if (!analysisData) return <SubLoadingView text="Disponible après le chargement initial." />;

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Animated.View entering={FadeInDown.duration(350)}>

          {/* Philosophy Note */}
          <View style={styles.fullOriginalCard}>
            <Text style={styles.originalTextHeader}>Philosophie des traducteurs</Text>
            <Text style={styles.notesText}>{analysisData.translatorPhilosophyNote}</Text>
          </View>

          <SectionLabel text="ECARTS LINGUISTIQUES MAJEURS" />

          {analysisData.keyDifferences?.map((diff, i) => {
            const isExpanded = expandedDiff === i;
            return (
              <Pressable key={i} onPress={() => setExpandedDiff(isExpanded ? null : i)} style={styles.diffCard}>
                <View style={styles.diffHeader}>
                  <View>
                    <Text style={styles.diffTitleWord}>{diff.greekOrHebrewWord} ({diff.transliteration})</Text>
                    <Text style={styles.diffStrongs}>Strong : {diff.strongs}</Text>
                  </View>
                  <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.grayWarm} />
                </View>

                {/* Explications et implications */}
                {isExpanded ? (
                  <Animated.View entering={FadeIn.duration(250)} style={styles.diffExpanded}>
                    <View style={styles.textDivider} />
                    <Text style={styles.diffSectionTitle}>Choix de traduction</Text>
                    <View style={styles.translationsGrid}>
                      {Object.entries(diff.translations).map(([code, val]) => (
                        <View key={code} style={styles.gridItem}>
                          <Text style={styles.gridCode}>{code}</Text>
                          <Text style={styles.gridVal}>{val}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.diffSectionTitle}>Explication linguistique</Text>
                    <Text style={styles.diffText}>{diff.explanation}</Text>
                    <Text style={styles.diffSectionTitle}>Impact doctrinal</Text>
                    <Text style={styles.diffText}>{diff.doctrinalImplication}</Text>
                  </Animated.View>
                ) : (
                  <Text style={styles.diffSummaryText} numberOfLines={2}>
                    {diff.explanation}
                  </Text>
                )}
              </Pressable>
            );
          })}

        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ─── Root ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View entering={FadeInUp.duration(400)} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <LinearGradient colors={['#7BC8E0', TEAL_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <M3Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.white} />
          </M3Pressable>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons name="translate" size={17} color="rgba(255,255,255,0.85)" />
            <Text style={styles.headerTitle}>Comparaison des traductions</Text>
          </View>
          {phase === 'result' && (
            <M3Pressable onPress={() => { setPhase('form'); setCompareData(null); }} style={styles.backBtn}>
              <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
            </M3Pressable>
          )}
          {phase !== 'result' && <View style={{ width: 40 }} />}
        </LinearGradient>

        {phase === 'result' && <TabBar active={activeTab} onChange={setActiveTab} />}
      </Animated.View>

      <View style={styles.body}>
        {phase === 'form' && renderForm()}
        {phase === 'loading' && renderLoading()}
        {phase === 'result' && activeTab === 'Comparaison' && renderCompare()}
        {phase === 'result' && activeTab === 'Grec / Hébreu' && renderInterlinear()}
        {phase === 'result' && activeTab === 'Analyse Écarts' && renderAnalysis()}
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

  tabBar: { backgroundColor: TEAL_DARK, maxHeight: 44 },
  tabBarContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  tabActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  tabTextActive: { color: TEAL_DARK, fontWeight: '700' },

  body: { flex: 1 },

  // Form
  formContent: { padding: 20, paddingBottom: 60 },
  formTitle: { fontSize: 21, fontWeight: '800', color: Colors.navy, marginBottom: 8 },
  formSubtitle: { fontSize: 14, color: Colors.grayWarm, lineHeight: 21, marginBottom: 24 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.navy,
    marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#BBE0EC', padding: 14,
    fontSize: 15, color: Colors.navy,
    marginBottom: 14, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  examplesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  exampleChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: TEAL_LIGHT, borderWidth: 1, borderColor: BLUE_TEAL + '80',
  },
  exampleChipText: { fontSize: 12, color: TEAL_DARK, fontWeight: '600' },
  analyzeBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 24, ...(Platform.OS !== 'web' ? Shadows.hover : {}) },
  analyzeBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  analyzeBtnText: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 0.3 },

  infoBox: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    borderLeftWidth: 3, borderLeftColor: BLUE_TEAL, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  infoTitle: { fontSize: 13, fontWeight: '800', color: Colors.navy, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  infoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE_TEAL, marginTop: 8 },
  infoText: { flex: 1, fontSize: 13, color: Colors.navy, lineHeight: 20 },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 32,
    alignItems: 'center', width: '100%', maxWidth: 360, gap: 16,
    ...(Platform.OS !== 'web' ? Shadows.hover : {}),
  },
  loadingTitle: { fontSize: 17, fontWeight: '800', color: Colors.navy },
  loadingSubtitle: { fontSize: 14, color: Colors.grayWarm, textAlign: 'center', lineHeight: 20 },
  loadingPassageBox: { backgroundColor: TEAL_LIGHT, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  loadingPassageText: { fontSize: 13, fontWeight: '700', color: TEAL_DARK, textAlign: 'center' },

  // Shared / Results
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#BBE0EC' },
  sectionLabelText: { fontSize: 10, fontWeight: '800', color: BLUE_TEAL, letterSpacing: 1.5 },
  tabContent: { padding: 16, paddingBottom: 60 },
  subLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  subLoadingText: { fontSize: 14, color: Colors.grayWarm, textAlign: 'center', lineHeight: 20 },

  filterBar: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: '#E6EFF5', gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  filterChipActive: { backgroundColor: TEAL_LIGHT },
  filterChipText: { fontSize: 12, color: Colors.grayWarm, fontWeight: '500' },
  filterChipTextActive: { color: TEAL_DARK, fontWeight: '700' },

  // Compare Tab Cards
  translationCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 12, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  versionName: { fontSize: 15, fontWeight: '800', color: Colors.navy },
  badgeCode: { backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeCodeText: { fontSize: 10, fontWeight: '800', color: Colors.grayWarm },
  versionMeta: { fontSize: 11, color: Colors.grayWarm, marginTop: 4 },
  scoreBox: { alignItems: 'flex-end' },
  scoreLabel: { fontSize: 9, color: Colors.grayWarm, letterSpacing: 0.5, textTransform: 'uppercase' },
  scoreVal: { fontSize: 13, fontWeight: '800', color: TEAL_DARK, marginTop: 2 },

  spectrumTrack: { height: 4, backgroundColor: '#F0F4F8', borderRadius: 2, marginVertical: 8, position: 'relative' },
  spectrumIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: BLUE_TEAL, position: 'absolute', top: -4 },
  spectrumLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  spectrumLabelSide: { fontSize: 9, color: Colors.grayWarm },

  textDivider: { height: 1, backgroundColor: '#F0F4F8', marginVertical: 12 },
  versetText: { fontSize: 15, color: Colors.navy, lineHeight: 24 },
  greekTextFont: { fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif', fontSize: 17, lineHeight: 26 },
  transliterationText: { fontSize: 13, fontStyle: 'italic', color: Colors.grayWarm, marginTop: 6, lineHeight: 18 },

  // Interlinear Tab
  fullOriginalCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 16, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  originalTextHeader: { fontSize: 11, fontWeight: '800', color: BLUE_TEAL, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  fullOriginalText: { fontSize: 18, color: Colors.navy, lineHeight: 28, textAlign: 'center', fontWeight: '500' },
  fullTransliterationText: { fontSize: 14, fontStyle: 'italic', color: Colors.grayWarm, textAlign: 'center', marginTop: 8 },

  wordCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    marginBottom: 10, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  wordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordHeaderLeft: { gap: 4 },
  wordOriginal: { fontSize: 18, fontWeight: '800', color: Colors.navy },
  wordTranslit: { fontSize: 12, fontStyle: 'italic', color: Colors.grayWarm },
  wordHeaderRight: { alignItems: 'flex-end', gap: 4 },
  wordMeaning: { fontSize: 14, fontWeight: '700', color: TEAL_DARK },
  strongBadge: { backgroundColor: TEAL_LIGHT, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  strongBadgeText: { fontSize: 10, fontWeight: '700', color: TEAL_DARK },

  wordDetail: { marginTop: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4 },
  detailLabel: { width: 130, fontSize: 12, fontWeight: '800', color: Colors.grayWarm },
  detailVal: { flex: 1, fontSize: 12, color: Colors.navy, lineHeight: 18 },

  notesCard: { backgroundColor: TEAL_LIGHT, borderRadius: 12, padding: 14 },
  notesText: { fontSize: 13, color: Colors.navy, lineHeight: 20 },

  // Analysis Tab
  diffCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    marginBottom: 10, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  diffHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diffTitleWord: { fontSize: 15, fontWeight: '800', color: Colors.navy },
  diffStrongs: { fontSize: 11, color: Colors.grayWarm, marginTop: 2 },
  diffSummaryText: { fontSize: 13, color: Colors.grayWarm, lineHeight: 18, marginTop: 8 },

  diffExpanded: { marginTop: 12 },
  diffSectionTitle: { fontSize: 10, fontWeight: '800', color: BLUE_TEAL, letterSpacing: 1, textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  translationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  gridItem: { backgroundColor: '#F0F4F8', borderRadius: 6, padding: 8, minWidth: '45%', flex: 1 },
  gridCode: { fontSize: 9, fontWeight: '800', color: Colors.grayWarm, textTransform: 'uppercase' },
  gridVal: { fontSize: 13, fontWeight: '700', color: Colors.navy, marginTop: 2 },
  diffText: { fontSize: 13, color: Colors.navy, lineHeight: 20 },
});
