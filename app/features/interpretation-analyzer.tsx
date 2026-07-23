/**
 * Dieu et Moi — Analyseur des Interprétations
 * Analyse comparative des grandes lectures théologiques d'un passage biblique
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

const GOLD = '#D4A85A';
const GOLD_LIGHT = '#F5EFE0';
const GOLD_DARK = '#8B6A2A';

const M3_SPRING = { damping: 20, stiffness: 180, mass: 0.8 };
const M3_STANDARD = { duration: 300, easing: Easing.bezier(0.2, 0, 0, 1) };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Types ───────────────────────────────────────────────────────────────────

interface Tradition {
  name: string;
  centralReading: string;
  doctrineSupported: string;
  keyAuthority: string;
  practicalImplication: string;
}

interface Father {
  name: string;
  era: string;
  tradition: string;
  position: string;
  keyQuote: string;
  influence: string;
}

interface Tension {
  topic: string;
  summary: string;
  positionA: { label: string; argument: string };
  positionB: { label: string; argument: string };
}

interface TensionsData {
  tensions: Tension[];
  consensus: { summary: string; sharedDoctrines: string[] };
}

interface HermeneuticsMethod {
  name: string;
  description: string;
  reading: string;
  tradition: string;
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
      <ActivityIndicator size="small" color={GOLD} />
      <Text style={styles.subLoadingText}>{text}</Text>
    </View>
  );
}

// ─── Onglets ──────────────────────────────────────────────────────────────────
const TABS = ['Traditions', 'Pères', 'Tensions', 'Herméneutique'] as const;
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

// ─── Couleurs par tradition ───────────────────────────────────────────────────
const TRADITION_COLORS: Record<string, string> = {
  'Catholique': '#C0392B',
  'Orthodoxe Orientale': '#8E44AD',
  'Luthérienne': '#27AE60',
  'Réformée (Calviniste)': '#2980B9',
  'Évangélique': '#E67E22',
  'Pentecôtiste / Charismatique': '#F39C12',
};

// ─── Écran Principal ──────────────────────────────────────────────────────────
type Phase = 'form' | 'loading' | 'result';

export default function InterpretationAnalyzerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [passageOrVerse, setPassageOrVerse] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [activeTab, setActiveTab] = useState<Tab>('Traditions');

  const [traditionsData, setTraditionsData] = useState<{ passage: string; traditions: Tradition[] } | null>(null);
  const [fathersData, setFathersData] = useState<{ fathers: Father[] } | null>(null);
  const [tensionsData, setTensionsData] = useState<TensionsData | null>(null);
  const [hermeneuticsData, setHermeneuticsData] = useState<{ methods: HermeneuticsMethod[] } | null>(null);

  const [loadingFathers, setLoadingFathers] = useState(false);
  const [loadingTensions, setLoadingTensions] = useState(false);
  const [loadingHermeneutics, setLoadingHermeneutics] = useState(false);

  // Expanded states for detail cards
  const [expandedTradition, setExpandedTradition] = useState<number | null>(null);
  const [expandedFather, setExpandedFather] = useState<number | null>(null);
  const [expandedTension, setExpandedTension] = useState<number | null>(null);
  const [expandedHermeneutics, setExpandedHermeneutics] = useState<number | null>(null);

  const analyze = async () => {
    if (!passageOrVerse.trim()) return;
    setPhase('loading');
    setTraditionsData(null);
    setFathersData(null);
    setTensionsData(null);
    setHermeneuticsData(null);
    setExpandedTradition(null);
    setExpandedFather(null);
    setExpandedTension(null);
    setExpandedHermeneutics(null);

    try {
      const { data, error } = await supabase.functions.invoke('interpretation-analyzer', {
        body: { action: 'traditions', passageOrVerse: passageOrVerse.trim() },
      });
      if (error || !data) throw new Error(error?.message || 'Réponse vide');
      setTraditionsData(data);
      setPhase('result');
      setActiveTab('Traditions');
      // Background fetches
      fetchBackground('fathers', setFathersData, setLoadingFathers);
      fetchBackground('tensions', setTensionsData, setLoadingTensions);
      fetchBackground('hermeneutics', setHermeneuticsData, setLoadingHermeneutics);
    } catch (err: any) {
      console.error('[InterpretationAnalyzer] Traditions error:', err);
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
      const { data, error } = await supabase.functions.invoke('interpretation-analyzer', {
        body: { action, passageOrVerse: passageOrVerse.trim() },
      });
      if (!error && data) setter(data);
    } catch (err) {
      console.error(`[InterpretationAnalyzer] ${action} error:`, err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render Form ───────────────────────────────────────────────────────────
  const renderForm = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <Text style={styles.formTitle}>Analyseur des interprétations</Text>
        <Text style={styles.formSubtitle}>
          Entrez un verset ou passage biblique pour découvrir comment les grandes traditions chrétiennes, les Pères de l'Eglise et les méthodes herméneutiques le lisent et l'interprètent.
        </Text>

        <Text style={styles.fieldLabel}>Passage ou verset biblique</Text>
        <TextInput
          style={styles.textInput}
          value={passageOrVerse}
          onChangeText={setPassageOrVerse}
          placeholder="Ex: Jean 3:16, Romains 5:12-21, Apocalypse 20:1-6..."
          placeholderTextColor={Colors.grayWarm}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <View style={styles.examplesRow}>
          {['Jean 1:1', 'Romains 8:28-30', 'Matthieu 16:18', 'Ephésiens 2:8-9'].map(ex => (
            <Pressable key={ex} onPress={() => setPassageOrVerse(ex)} style={styles.exampleChip}>
              <Text style={styles.exampleChipText}>{ex}</Text>
            </Pressable>
          ))}
        </View>

        <M3Pressable
          onPress={analyze}
          disabled={!passageOrVerse.trim()}
          style={[styles.analyzeBtn, !passageOrVerse.trim() && { opacity: 0.4 }]}
        >
          <LinearGradient colors={['#E0B870', GOLD_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.analyzeBtnGradient}>
            <MaterialCommunityIcons name="scale-balance" size={20} color={Colors.white} />
            <Text style={styles.analyzeBtnText}>Lancer l'analyse comparative</Text>
          </LinearGradient>
        </M3Pressable>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Ce que vous obtiendrez</Text>
          {[
            'Lecture de 6 traditions confessionnelles (Catholique, Orthodoxe, Luthérienne, Réformée, Evangélique, Pentecôtiste)',
            'Commentaires des Pères de l\'Eglise (Augustin, Chrysostome, Luther, Calvin...)',
            'Tensions doctrinales et points de consensus',
            'Grille herméneutique : 4 sens de l\'Ecriture appliqués',
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
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingTitle}>Analyse comparative en cours</Text>
        <Text style={styles.loadingSubtitle}>
          Consultation des 6 traditions confessionnelles, des Pères de l'Eglise et des méthodes herméneutiques...
        </Text>
        <View style={styles.loadingPassageBox}>
          <Text style={styles.loadingPassageText}>{passageOrVerse}</Text>
        </View>
      </Animated.View>
    </View>
  );

  // ─── Render Traditions Tab ─────────────────────────────────────────────────
  const renderTraditions = () => {
    if (!traditionsData) return <SubLoadingView text="Chargement des traditions..." />;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Animated.View entering={FadeInDown.duration(350)}>
          <View style={styles.passagePill}>
            <MaterialCommunityIcons name="book-open-variant" size={14} color={GOLD_DARK} />
            <Text style={styles.passagePillText}>{traditionsData.passage || passageOrVerse}</Text>
          </View>

          {traditionsData.traditions?.map((t, i) => {
            const color = TRADITION_COLORS[t.name] || GOLD;
            const isExpanded = expandedTradition === i;
            return (
              <Animated.View key={i} entering={FadeInDown.duration(300).delay(i * 50)}>
                <Pressable onPress={() => setExpandedTradition(isExpanded ? null : i)} style={[styles.traditionCard, { borderLeftColor: color }]}>
                  <View style={styles.traditionHeader}>
                    <View style={[styles.traditionBadge, { backgroundColor: color + '22', borderColor: color }]}>
                      <Text style={[styles.traditionBadgeText, { color }]}>{t.name}</Text>
                    </View>
                    <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.grayWarm} />
                  </View>
                  <Text style={styles.traditionReading} numberOfLines={isExpanded ? undefined : 3}>{t.centralReading}</Text>

                  {isExpanded && (
                    <Animated.View entering={FadeIn.duration(250)}>
                      <View style={styles.traditionDivider} />
                      <Text style={styles.traditionDetailLabel}>Doctrine soutenue</Text>
                      <Text style={styles.traditionDetailText}>{t.doctrineSupported}</Text>
                      <View style={styles.traditionDivider} />
                      <Text style={styles.traditionDetailLabel}>Autorité de référence</Text>
                      <Text style={styles.traditionDetailText}>{t.keyAuthority}</Text>
                      <View style={styles.traditionDivider} />
                      <Text style={styles.traditionDetailLabel}>Implication pratique</Text>
                      <Text style={styles.traditionDetailText}>{t.practicalImplication}</Text>
                    </Animated.View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ─── Render Pères Tab ──────────────────────────────────────────────────────
  const renderFathers = () => {
    if (loadingFathers) return <SubLoadingView text="Consultation des Pères de l'Eglise..." />;
    if (!fathersData) return <SubLoadingView text="Disponible après l'analyse des traditions." />;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Animated.View entering={FadeInDown.duration(350)}>
          {fathersData.fathers?.map((f, i) => {
            const isExpanded = expandedFather === i;
            return (
              <Pressable key={i} onPress={() => setExpandedFather(isExpanded ? null : i)} style={styles.fatherCard}>
                <View style={styles.fatherHeader}>
                  <View>
                    <Text style={styles.fatherName}>{f.name}</Text>
                    <Text style={styles.fatherMeta}>{f.era} · {f.tradition}</Text>
                  </View>
                  <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.grayWarm} />
                </View>
                <Text style={styles.fatherPosition} numberOfLines={isExpanded ? undefined : 3}>{f.position}</Text>

                {isExpanded && f.keyQuote && (
                  <Animated.View entering={FadeIn.duration(250)}>
                    <View style={styles.quoteBox}>
                      <Text style={styles.quoteText}>"{f.keyQuote}"</Text>
                    </View>
                    <Text style={styles.traditionDetailLabel}>Influence théologique</Text>
                    <Text style={styles.traditionDetailText}>{f.influence}</Text>
                  </Animated.View>
                )}
              </Pressable>
            );
          })}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ─── Render Tensions Tab ───────────────────────────────────────────────────
  const renderTensions = () => {
    if (loadingTensions) return <SubLoadingView text="Analyse des tensions doctrinales..." />;
    if (!tensionsData) return <SubLoadingView text="Disponible après l'analyse des traditions." />;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Animated.View entering={FadeInDown.duration(350)}>

          {/* Consensus */}
          {tensionsData.consensus && (
            <>
              <SectionLabel text="CONSENSUS INTERCONFESSIONNEL" />
              <View style={styles.consensusCard}>
                <Text style={styles.consensusSummary}>{tensionsData.consensus.summary}</Text>
                {tensionsData.consensus.sharedDoctrines?.map((d, i) => (
                  <View key={i} style={styles.sharedDoctrineRow}>
                    <View style={styles.sharedDot} />
                    <Text style={styles.sharedDoctrineText}>{d}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Tensions */}
          <SectionLabel text="TENSIONS DOCTRINALES" />
          {tensionsData.tensions?.map((t, i) => {
            const isExpanded = expandedTension === i;
            return (
              <Pressable key={i} onPress={() => setExpandedTension(isExpanded ? null : i)} style={styles.tensionCard}>
                <View style={styles.tensionHeader}>
                  <Text style={styles.tensionTopic}>{t.topic}</Text>
                  <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.grayWarm} />
                </View>
                <Text style={styles.tensionSummary} numberOfLines={isExpanded ? undefined : 2}>{t.summary}</Text>

                {isExpanded && (
                  <Animated.View entering={FadeIn.duration(250)}>
                    <View style={styles.debateRow}>
                      <View style={[styles.debateBox, { borderTopColor: '#2980B9' }]}>
                        <Text style={[styles.debateLabel, { color: '#2980B9' }]}>{t.positionA.label}</Text>
                        <Text style={styles.debateArgument}>{t.positionA.argument}</Text>
                      </View>
                      <View style={[styles.debateBox, { borderTopColor: '#C0392B' }]}>
                        <Text style={[styles.debateLabel, { color: '#C0392B' }]}>{t.positionB.label}</Text>
                        <Text style={styles.debateArgument}>{t.positionB.argument}</Text>
                      </View>
                    </View>
                  </Animated.View>
                )}
              </Pressable>
            );
          })}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ─── Render Herméneutique Tab ──────────────────────────────────────────────
  const METHOD_COLORS = ['#27AE60', '#8E44AD', '#E67E22', '#2980B9'];

  const renderHermeneutics = () => {
    if (loadingHermeneutics) return <SubLoadingView text="Application de la grille herméneutique..." />;
    if (!hermeneuticsData) return <SubLoadingView text="Disponible après l'analyse des traditions." />;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Animated.View entering={FadeInDown.duration(350)}>
          <Text style={styles.hermeneuticsIntro}>
            Les quatre sens de l'Ecriture sont des méthodes d'interprétation héritées de la tradition chrétienne. Chacune révèle une dimension différente du même texte.
          </Text>
          {hermeneuticsData.methods?.map((m, i) => {
            const color = METHOD_COLORS[i] || GOLD;
            const isExpanded = expandedHermeneutics === i;
            return (
              <Pressable key={i} onPress={() => setExpandedHermeneutics(isExpanded ? null : i)}
                style={[styles.methodCard, { borderLeftColor: color }]}>
                <View style={styles.methodHeader}>
                  <View style={[styles.methodNumberBadge, { backgroundColor: color }]}>
                    <Text style={styles.methodNumber}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.methodName}>{m.name}</Text>
                    <Text style={styles.methodDescription} numberOfLines={1}>{m.description}</Text>
                  </View>
                  <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.grayWarm} />
                </View>

                <Text style={styles.methodReading} numberOfLines={isExpanded ? undefined : 3}>{m.reading}</Text>

                {isExpanded && (
                  <Animated.View entering={FadeIn.duration(250)}>
                    <View style={[styles.methodTraditionBox, { backgroundColor: color + '15', borderColor: color + '40' }]}>
                      <Text style={[styles.methodTraditionLabel, { color }]}>Tradition associée</Text>
                      <Text style={styles.methodTraditionText}>{m.tradition}</Text>
                    </View>
                  </Animated.View>
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
        <LinearGradient colors={['#E0B870', GOLD_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <M3Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.white} />
          </M3Pressable>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons name="scale-balance" size={17} color="rgba(255,255,255,0.85)" />
            <Text style={styles.headerTitle}>Analyseur des interprétations</Text>
          </View>
          {phase === 'result' && (
            <M3Pressable onPress={() => { setPhase('form'); setTraditionsData(null); }} style={styles.backBtn}>
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
        {phase === 'result' && activeTab === 'Traditions' && renderTraditions()}
        {phase === 'result' && activeTab === 'Pères' && renderFathers()}
        {phase === 'result' && activeTab === 'Tensions' && renderTensions()}
        {phase === 'result' && activeTab === 'Herméneutique' && renderHermeneutics()}
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

  tabBar: { backgroundColor: GOLD_DARK, maxHeight: 44 },
  tabBarContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  tabActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  tabTextActive: { color: GOLD_DARK, fontWeight: '700' },

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
    borderWidth: 1.5, borderColor: '#E8D9B8', padding: 14,
    fontSize: 15, color: Colors.navy, minHeight: 90,
    marginBottom: 14, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  examplesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  exampleChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: GOLD_LIGHT, borderWidth: 1, borderColor: GOLD + '80',
  },
  exampleChipText: { fontSize: 12, color: GOLD_DARK, fontWeight: '600' },
  analyzeBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 24, ...(Platform.OS !== 'web' ? Shadows.hover : {}) },
  analyzeBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  analyzeBtnText: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 0.3 },

  infoBox: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    borderLeftWidth: 3, borderLeftColor: GOLD, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  infoTitle: { fontSize: 13, fontWeight: '800', color: Colors.navy, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  infoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD, marginTop: 8 },
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
  loadingPassageBox: { backgroundColor: GOLD_LIGHT, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  loadingPassageText: { fontSize: 13, fontWeight: '700', color: GOLD_DARK, textAlign: 'center' },

  // Shared
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#E8D9B8' },
  sectionLabelText: { fontSize: 10, fontWeight: '800', color: GOLD, letterSpacing: 1.5 },
  tabContent: { padding: 16, paddingBottom: 60 },
  subLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  subLoadingText: { fontSize: 14, color: Colors.grayWarm, textAlign: 'center', lineHeight: 20 },
  passagePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center',
    backgroundColor: GOLD_LIGHT, borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 7, marginBottom: 16, borderWidth: 1, borderColor: GOLD + '60',
  },
  passagePillText: { fontSize: 13, fontWeight: '700', color: GOLD_DARK },

  // Traditions
  traditionCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 12, borderLeftWidth: 4,
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  traditionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  traditionBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1.5,
  },
  traditionBadgeText: { fontSize: 12, fontWeight: '800' },
  traditionReading: { fontSize: 14, color: Colors.navy, lineHeight: 22 },
  traditionDivider: { height: 1, backgroundColor: '#F0E8D8', marginVertical: 12 },
  traditionDetailLabel: { fontSize: 10, fontWeight: '800', color: GOLD, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  traditionDetailText: { fontSize: 13, color: Colors.navy, lineHeight: 20, marginBottom: 4 },

  // Fathers
  fatherCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 12, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  fatherHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  fatherName: { fontSize: 15, fontWeight: '800', color: Colors.navy },
  fatherMeta: { fontSize: 12, color: Colors.grayWarm, marginTop: 2 },
  fatherPosition: { fontSize: 14, color: Colors.navy, lineHeight: 22 },
  quoteBox: {
    backgroundColor: GOLD_LIGHT, borderRadius: 10, padding: 14,
    borderLeftWidth: 3, borderLeftColor: GOLD, marginVertical: 12,
  },
  quoteText: { fontSize: 14, fontStyle: 'italic', color: GOLD_DARK, lineHeight: 22 },

  // Tensions
  tensionCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 12, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  tensionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  tensionTopic: { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.navy, marginRight: 8 },
  tensionSummary: { fontSize: 13, color: Colors.grayWarm, lineHeight: 20 },
  debateRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  debateBox: {
    flex: 1, backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12,
    borderTopWidth: 3,
  },
  debateLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
  debateArgument: { fontSize: 13, color: Colors.navy, lineHeight: 20 },
  consensusCard: {
    backgroundColor: GOLD_LIGHT, borderRadius: 14, padding: 16,
    borderLeftWidth: 4, borderLeftColor: GOLD,
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  consensusSummary: { fontSize: 14, color: Colors.navy, lineHeight: 22, marginBottom: 12 },
  sharedDoctrineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  sharedDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: GOLD, marginTop: 7 },
  sharedDoctrineText: { flex: 1, fontSize: 13, color: GOLD_DARK, lineHeight: 20, fontWeight: '600' },

  // Hermeneutics
  hermeneuticsIntro: { fontSize: 14, color: Colors.grayWarm, lineHeight: 22, marginBottom: 16, fontStyle: 'italic' },
  methodCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 12, borderLeftWidth: 4,
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  methodHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  methodNumberBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  methodNumber: { fontSize: 13, fontWeight: '900', color: Colors.white },
  methodName: { fontSize: 14, fontWeight: '800', color: Colors.navy },
  methodDescription: { fontSize: 12, color: Colors.grayWarm, marginTop: 2 },
  methodReading: { fontSize: 14, color: Colors.navy, lineHeight: 22 },
  methodTraditionBox: { borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1 },
  methodTraditionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  methodTraditionText: { fontSize: 13, color: Colors.navy, lineHeight: 20 },
});
