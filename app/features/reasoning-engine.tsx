/**
 * Dieu et Moi — Moteur de raisonnement biblique
 * Décortique des questions doctrinales ou morales
 * en s'appuyant EXCLUSIVEMENT sur la Bible
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ACCENT = '#8B62B5';
const ACCENT_LIGHT = '#EDE4F5';
const ACCENT_DARK = '#6B44A0';

const M3_SPRING = { damping: 20, stiffness: 180, mass: 0.8 };
const M3_STANDARD = { duration: 300, easing: Easing.bezier(0.2, 0, 0, 1) };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScriptureSupport {
  reference: string;
  text: string;
  explanation: string;
}

interface ReasoningStep {
  number: number;
  title: string;
  argument: string;
  scriptureSupport: ScriptureSupport[];
}

interface Objection {
  objectionText: string;
  response: string;
}

interface Synthesis {
  conclusion: string;
  practicalApplications: string[];
}

interface ReasoningData {
  question: string;
  dissection: string;
  steps: ReasoningStep[];
  objections: Objection[];
  synthesis: Synthesis;
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

// ─── Onglets ──────────────────────────────────────────────────────────────────
const TABS = ['Cheminement', 'Écritures', 'Objections', 'Synthèse'] as const;
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

export default function ReasoningEngineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [activeTab, setActiveTab] = useState<Tab>('Cheminement');

  const [reasoningData, setReasoningData] = useState<ReasoningData | null>(null);

  // Accordion lists
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [expandedObjection, setExpandedObjection] = useState<number | null>(null);

  const runReasoning = async () => {
    if (!question.trim()) return;
    setPhase('loading');
    setReasoningData(null);
    setExpandedStep(null);
    setExpandedObjection(null);

    try {
      const { data, error } = await supabase.functions.invoke('reasoning-engine', {
        body: { question: question.trim() },
      });
      if (error || !data) throw new Error(error?.message || 'Réponse vide');
      setReasoningData(data);
      setPhase('result');
      setActiveTab('Cheminement');
    } catch (err: any) {
      console.error('[ReasoningEngine] Error:', err);
      setPhase('form');
    }
  };

  // ─── Render Form ───────────────────────────────────────────────────────────
  const renderForm = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <Text style={styles.formTitle}>Moteur de raisonnement</Text>
        <Text style={styles.formSubtitle}>
          Posez une question de foi ou de doctrine difficile. L'IA construira une démonstration logique par étapes, appuyée EXCLUSIVEMENT sur la Bible.
        </Text>

        <Text style={styles.fieldLabel}>Votre question de foi</Text>
        <TextInput
          style={styles.textInput}
          value={question}
          onChangeText={setQuestion}
          placeholder="Ex: Pourquoi un Dieu d'amour permet-il la souffrance ? La foi s'oppose-t-elle à la loi ?"
          placeholderTextColor={Colors.grayWarm}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={styles.examplesRow}>
          {[
            "Pourquoi le mal existe-t-il si Dieu est bon ?",
            "Le salut s'obtient-il par la foi seule ou par les oeuvres ?",
            "La prédestination exclut-elle le libre arbitre ?",
            "Comment la grâce de Dieu coexiste-t-elle avec sa justice ?",
          ].map(ex => (
            <Pressable key={ex} onPress={() => setQuestion(ex)} style={styles.exampleChip}>
              <Text style={styles.exampleChipText} numberOfLines={1}>{ex}</Text>
            </Pressable>
          ))}
        </View>

        <M3Pressable
          onPress={runReasoning}
          disabled={!question.trim()}
          style={[styles.analyzeBtn, !question.trim() && { opacity: 0.4 }]}
        >
          <LinearGradient colors={['#A07CD4', ACCENT_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.analyzeBtnGradient}>
            <MaterialCommunityIcons name="brain" size={20} color={Colors.white} />
            <Text style={styles.analyzeBtnText}>Lancer la déduction logique</Text>
          </LinearGradient>
        </M3Pressable>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Règles du raisonnement</Text>
          {[
            'Autorité suprême et unique : Les textes de l\'Ancien et du Nouveau Testament',
            'Raisonnement logique pas-à-pas (Chain of Thought)',
            'Intégration systématique des preuves scripturales',
            'Neutralité confessionnelle stricte : pas de philosophie externe',
            'Exclusion totale des emojis et termes familiers',
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
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingTitle}>Déduction en cours</Text>
        <Text style={styles.loadingSubtitle}>
          Analyse herméneutique de la question et construction de la chaîne de preuves purement scripturales...
        </Text>
        <View style={styles.loadingQuestionBox}>
          <Text style={styles.loadingQuestionText}>"{question}"</Text>
        </View>
      </Animated.View>
    </View>
  );

  // ─── Render Cheminement Tab ────────────────────────────────────────────────
  const renderCheminement = () => {
    if (!reasoningData) return null;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Animated.View entering={FadeInDown.duration(350)}>
          {/* Dissection */}
          <View style={styles.dissectionCard}>
            <Text style={styles.cardHeaderTitle}>Dissection de la question</Text>
            <Text style={styles.dissectionText}>{reasoningData.dissection}</Text>
          </View>

          <SectionLabel text="ETAPES LOGIQUES" />

          {/* Timeline of steps */}
          {reasoningData.steps?.map((step, idx) => {
            const isExpanded = expandedStep === idx;
            const isLast = idx === reasoningData.steps.length - 1;

            return (
              <View key={step.number} style={styles.timelineRow}>
                {/* Visual Line */}
                <View style={styles.timelineLeft}>
                  <View style={styles.timelineDot}>
                    <Text style={styles.timelineDotText}>{step.number}</Text>
                  </View>
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                {/* Card */}
                <Pressable
                  onPress={() => setExpandedStep(isExpanded ? null : idx)}
                  style={[styles.stepCard, isExpanded && styles.stepCardExpanded]}
                >
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.grayWarm} />
                  </View>
                  <Text style={styles.stepArgument} numberOfLines={isExpanded ? undefined : 3}>
                    {step.argument}
                  </Text>

                  {isExpanded && step.scriptureSupport?.length > 0 && (
                    <Animated.View entering={FadeIn.duration(250)} style={styles.stepDetails}>
                      <View style={styles.textDivider} />
                      <Text style={styles.supportLabel}>Preuves bibliques associées :</Text>
                      {step.scriptureSupport.map((ref, rIdx) => (
                        <View key={rIdx} style={styles.miniRefCard}>
                          <View style={styles.miniRefHeader}>
                            <MaterialCommunityIcons name="book-open-variant" size={13} color={ACCENT} />
                            <Text style={styles.miniRefTitle}>{ref.reference}</Text>
                          </View>
                          <Text style={styles.miniRefText}>"{ref.text}"</Text>
                        </View>
                      ))}
                    </Animated.View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ─── Render Ecritures Tab ──────────────────────────────────────────────────
  const renderEcritures = () => {
    if (!reasoningData) return null;

    // Collect all scriptural supports
    const allRefs: { stepNumber: number; ref: ScriptureSupport }[] = [];
    reasoningData.steps?.forEach(s => {
      s.scriptureSupport?.forEach(r => {
        allRefs.push({ stepNumber: s.number, ref: r });
      });
    });

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Animated.View entering={FadeInDown.duration(350)}>
          {allRefs.map((item, idx) => (
            <View key={idx} style={styles.fullRefCard}>
              <View style={styles.fullRefHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Étape {item.stepNumber}</Text>
                </View>
                <Text style={styles.fullRefTitle}>{item.ref.reference}</Text>
              </View>

              <View style={styles.quoteBox}>
                <Text style={styles.quoteText}>"{item.ref.text}"</Text>
              </View>

              <Text style={styles.detailLabel}>Application à la démonstration</Text>
              <Text style={styles.detailVal}>{item.ref.explanation}</Text>
            </View>
          ))}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ─── Render Objections Tab ─────────────────────────────────────────────────
  const renderObjections = () => {
    if (!reasoningData) return null;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Animated.View entering={FadeInDown.duration(350)}>
          {reasoningData.objections?.map((obj, idx) => {
            const isExpanded = expandedObjection === idx;
            return (
              <Pressable
                key={idx}
                onPress={() => setExpandedObjection(isExpanded ? null : idx)}
                style={[styles.objectionCard, isExpanded && styles.objectionCardExpanded]}
              >
                <View style={styles.objectionHeader}>
                  <View style={styles.objectionTitleRow}>
                    <MaterialCommunityIcons name="alert-decagram-outline" size={18} color="#C53030" />
                    <Text style={styles.objectionTitle}>Objection {idx + 1}</Text>
                  </View>
                  <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.grayWarm} />
                </View>

                <Text style={styles.objectionText} numberOfLines={isExpanded ? undefined : 2}>
                  {obj.objectionText}
                </Text>

                {isExpanded && (
                  <Animated.View entering={FadeIn.duration(250)} style={styles.objectionAnswer}>
                    <View style={styles.textDivider} />
                    <Text style={styles.answerLabel}>Réfutation / Réconciliation biblique</Text>
                    <Text style={styles.answerText}>{obj.response}</Text>
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

  // ─── Render Synthèse Tab ───────────────────────────────────────────────────
  const renderSynthese = () => {
    if (!reasoningData) return null;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Animated.View entering={FadeInDown.duration(350)}>
          {/* Conclusion Card */}
          <View style={styles.conclusionCard}>
            <Text style={styles.cardHeaderTitle}>Synthèse scripturale finale</Text>
            <Text style={styles.conclusionText}>{reasoningData.synthesis.conclusion}</Text>
          </View>

          <SectionLabel text="APPLICATIONS PRATIQUES" />

          {reasoningData.synthesis.practicalApplications?.map((app, idx) => (
            <View key={idx} style={styles.appCard}>
              <View style={styles.appNumberBadge}>
                <Text style={styles.appNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.appText}>{app}</Text>
            </View>
          ))}
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
        <LinearGradient colors={['#A07CD4', ACCENT_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <M3Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.white} />
          </M3Pressable>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons name="brain" size={17} color="rgba(255,255,255,0.85)" />
            <Text style={styles.headerTitle}>Moteur de raisonnement</Text>
          </View>
          {phase === 'result' && (
            <M3Pressable onPress={() => { setPhase('form'); setReasoningData(null); }} style={styles.backBtn}>
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
        {phase === 'result' && activeTab === 'Cheminement' && renderCheminement()}
        {phase === 'result' && activeTab === 'Écritures' && renderEcritures()}
        {phase === 'result' && activeTab === 'Objections' && renderObjections()}
        {phase === 'result' && activeTab === 'Synthèse' && renderSynthese()}
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

  tabBar: { backgroundColor: ACCENT_DARK, maxHeight: 44 },
  tabBarContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  tabActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  tabTextActive: { color: ACCENT_DARK, fontWeight: '700' },

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
    borderWidth: 1.5, borderColor: '#E0D8F0', padding: 14,
    fontSize: 15, color: Colors.navy, minHeight: 90,
    marginBottom: 14, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  examplesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  exampleChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, maxWidth: SCREEN_WIDTH ? SCREEN_WIDTH - 40 : 300,
    backgroundColor: ACCENT_LIGHT, borderWidth: 1, borderColor: ACCENT + '80',
  },
  exampleChipText: { fontSize: 12, color: ACCENT_DARK, fontWeight: '600' },
  analyzeBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 24, ...(Platform.OS !== 'web' ? Shadows.hover : {}) },
  analyzeBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  analyzeBtnText: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 0.3 },

  infoBox: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    borderLeftWidth: 3, borderLeftColor: ACCENT, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  infoTitle: { fontSize: 13, fontWeight: '800', color: Colors.navy, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  infoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT, marginTop: 8 },
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
  loadingQuestionBox: { backgroundColor: ACCENT_LIGHT, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  loadingQuestionText: { fontSize: 13, fontWeight: '700', color: ACCENT_DARK, textAlign: 'center' },

  // Shared
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#E0D8F0' },
  sectionLabelText: { fontSize: 10, fontWeight: '800', color: ACCENT, letterSpacing: 1.5 },
  tabContent: { padding: 16, paddingBottom: 60 },

  // Dissection
  dissectionCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 16, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  cardHeaderTitle: { fontSize: 11, fontWeight: '800', color: ACCENT, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  dissectionText: { fontSize: 14, color: Colors.navy, lineHeight: 22 },

  // Timeline
  timelineRow: { flexDirection: 'row', gap: 14, position: 'relative' },
  timelineLeft: { width: 32, alignItems: 'center' },
  timelineDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  timelineDotText: { fontSize: 13, fontWeight: 'bold', color: Colors.white },
  timelineLine: { width: 2, backgroundColor: '#E0D8F0', position: 'absolute', top: 32, bottom: 0, left: 15, zIndex: 1 },

  stepCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 16, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  stepCardExpanded: { borderColor: ACCENT_LIGHT, borderLeftWidth: 3, borderLeftColor: ACCENT },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stepTitle: { fontSize: 15, fontWeight: '800', color: Colors.navy, flex: 1, marginRight: 8 },
  stepArgument: { fontSize: 14, color: Colors.navy, lineHeight: 22 },
  stepDetails: { marginTop: 12 },
  textDivider: { height: 1, backgroundColor: '#F0EAF8', marginVertical: 12 },
  supportLabel: { fontSize: 11, fontWeight: '800', color: ACCENT, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  miniRefCard: { backgroundColor: '#F9F6FC', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#EDE4F5' },
  miniRefHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  miniRefTitle: { fontSize: 12, fontWeight: '800', color: ACCENT_DARK },
  miniRefText: { fontSize: 12, fontStyle: 'italic', color: Colors.navy, lineHeight: 18 },

  // Ecritures Tab
  fullRefCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 14, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  fullRefHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stepBadge: { backgroundColor: ACCENT_LIGHT, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  stepBadgeText: { fontSize: 11, fontWeight: '800', color: ACCENT_DARK },
  fullRefTitle: { fontSize: 15, fontWeight: '800', color: Colors.navy },
  quoteBox: {
    backgroundColor: '#F9F6FC', borderRadius: 10, padding: 14,
    borderLeftWidth: 3, borderLeftColor: ACCENT, marginVertical: 10,
  },
  quoteText: { fontSize: 14, fontStyle: 'italic', color: ACCENT_DARK, lineHeight: 22 },
  detailLabel: { fontSize: 10, fontWeight: '800', color: Colors.grayWarm, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  detailVal: { fontSize: 13, color: Colors.navy, lineHeight: 20, marginBottom: 8 },

  // Objections Tab
  objectionCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 12, ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  objectionCardExpanded: { borderLeftWidth: 3, borderLeftColor: '#C53030' },
  objectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  objectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  objectionTitle: { fontSize: 14, fontWeight: '800', color: '#C53030' },
  objectionText: { fontSize: 14, color: Colors.navy, lineHeight: 22 },
  objectionAnswer: { marginTop: 12 },
  answerLabel: { fontSize: 11, fontWeight: '800', color: ACCENT, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  answerText: { fontSize: 13, color: Colors.navy, lineHeight: 20 },

  // Synthesis Tab
  conclusionCard: {
    backgroundColor: ACCENT_LIGHT, borderRadius: 14, padding: 16,
    borderLeftWidth: 4, borderLeftColor: ACCENT,
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  conclusionText: { fontSize: 14, color: ACCENT_DARK, lineHeight: 22, fontWeight: '600' },
  appCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  appNumberBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: ACCENT_LIGHT, alignItems: 'center', justifyContent: 'center' },
  appNumberText: { fontSize: 12, fontWeight: 'bold', color: ACCENT_DARK },
  appText: { flex: 1, fontSize: 14, color: Colors.navy, lineHeight: 22 },
});
