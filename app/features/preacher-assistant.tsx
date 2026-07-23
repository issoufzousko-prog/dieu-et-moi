/**
 * Dieu et Moi — Assistant Prédicateurs
 * Génération de plans de sermon assistée par IA
 * avec Exégèse, Guide de Groupe et Mode Pupitre
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ACCENT = '#8B62B5';
const ACCENT_LIGHT = '#EDE4F5';
const ACCENT_DARK = '#6B44A0';

const M3_SPRING = { damping: 20, stiffness: 180, mass: 0.8 };
const M3_STANDARD = { duration: 300, easing: Easing.bezier(0.2, 0, 0, 1) };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Types ───────────────────────────────────────────────────────────────────

interface SermonPoint {
  number: number;
  title: string;
  textSupport: string;
  explanation: string;
  illustration: string;
}

interface SermonData {
  titles: string[];
  bigIdea: string;
  introduction: { hook: string; setup: string; transition: string };
  points: SermonPoint[];
  conclusion: { summary: string; application: string; call: string };
}

interface ExegesisData {
  historicalContext: string;
  wordStudies: { originalWord: string; meaning: string }[];
  crossReferences: { passage: string; connection: string }[];
}

interface GroupStudyData {
  icebreaker: string;
  questions: { id: number; text: string }[];
  prayerPoints: string[];
}

// ─── Pressable M3 ─────────────────────────────────────────────────────────────
function M3Pressable({
  onPress,
  children,
  style,
  disabled,
  activeOpacity = 0.85,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
  disabled?: boolean;
  activeOpacity?: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <AnimatedPressable
      onPressIn={() => {
        if (!disabled) {
          scale.value = withSpring(0.96, M3_SPRING);
          opacity.value = withTiming(activeOpacity, M3_STANDARD);
        }
      }}
      onPressOut={() => {
        scale.value = withSpring(1, M3_SPRING);
        opacity.value = withTiming(1, M3_STANDARD);
      }}
      onPress={disabled ? undefined : onPress}
      style={[style, aStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ─── Chip Sélecteur ────────────────────────────────────────────────────────────
function SelectionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

// ─── Séparateur de section ─────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionLabelLine} />
      <Text style={styles.sectionLabelText}>{text}</Text>
      <View style={styles.sectionLabelLine} />
    </View>
  );
}

// ─── Onglets de navigation ─────────────────────────────────────────────────────
const TABS = ['Plan', 'Exégèse', 'Groupe', 'Pupitre'] as const;
type Tab = typeof TABS[number];

function TabBar({ activeTab, onChange }: { activeTab: Tab; onChange: (t: Tab) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
      {TABS.map((t) => (
        <Pressable key={t} onPress={() => onChange(t)} style={[styles.tab, activeTab === t && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Écran Principal ──────────────────────────────────────────────────────────
type Phase = 'form' | 'loading' | 'result';

export default function PreacherAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Form state
  const [passageOrTheme, setPassageOrTheme] = useState('');
  const [style, setStyle] = useState('Exégétique');
  const [audience, setAudience] = useState('Général');
  const [duration, setDuration] = useState('30 minutes');
  const [chosenTitleIndex, setChosenTitleIndex] = useState(0);

  // Phase & tabs
  const [phase, setPhase] = useState<Phase>('form');
  const [activeTab, setActiveTab] = useState<Tab>('Plan');

  // AI results
  const [sermonData, setSermonData] = useState<SermonData | null>(null);
  const [exegesisData, setExegesisData] = useState<ExegesisData | null>(null);
  const [groupStudyData, setGroupStudyData] = useState<GroupStudyData | null>(null);

  // Loading sub-states
  const [loadingSermon, setLoadingSermon] = useState(false);
  const [loadingExegesis, setLoadingExegesis] = useState(false);
  const [loadingGroup, setLoadingGroup] = useState(false);

  // Pulpit mode
  const [pulpitPointIndex, setPulpitPointIndex] = useState(0);
  const [pulpitSection, setPulpitSection] = useState<'intro' | 'point' | 'conclusion'>('intro');

  // Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // ─── Generate Sermon ───────────────────────────────────────────────────────
  const generateSermon = async () => {
    if (!passageOrTheme.trim()) return;
    setPhase('loading');
    setLoadingSermon(true);
    setSermonData(null);
    setExegesisData(null);
    setGroupStudyData(null);
    setChosenTitleIndex(0);
    setPulpitPointIndex(0);
    setPulpitSection('intro');

    try {
      const { data, error } = await supabase.functions.invoke('preacher-assistant', {
        body: {
          action: 'sermon',
          passageOrTheme: passageOrTheme.trim(),
          style,
          audience,
          duration,
        },
      });
      if (error || !data) throw new Error(error?.message || 'Réponse vide');
      setSermonData(data as SermonData);
      setPhase('result');
      setActiveTab('Plan');

      // Background: fetch exegesis and group study
      fetchExegesis(passageOrTheme.trim(), data as SermonData);
      fetchGroupStudy(passageOrTheme.trim(), data as SermonData);
    } catch (err: any) {
      console.error('Sermon generation error:', err);
      setPhase('form');
    } finally {
      setLoadingSermon(false);
    }
  };

  const fetchExegesis = async (passage: string, sermon: SermonData) => {
    setLoadingExegesis(true);
    try {
      const { data, error } = await supabase.functions.invoke('preacher-assistant', {
        body: { action: 'exegesis', passageOrTheme: passage },
      });
      if (!error && data) setExegesisData(data as ExegesisData);
    } catch (err) {
      console.error('Exegesis fetch error:', err);
    } finally {
      setLoadingExegesis(false);
    }
  };

  const fetchGroupStudy = async (passage: string, sermon: SermonData) => {
    setLoadingGroup(true);
    try {
      const { data, error } = await supabase.functions.invoke('preacher-assistant', {
        body: { action: 'group-study', passageOrTheme: passage, sermonData: sermon },
      });
      if (!error && data) setGroupStudyData(data as GroupStudyData);
    } catch (err) {
      console.error('Group study fetch error:', err);
    } finally {
      setLoadingGroup(false);
    }
  };

  // ─── Render: Form ──────────────────────────────────────────────────────────
  const renderForm = () => (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <Text style={styles.formTitle}>Préparer un sermon</Text>
        <Text style={styles.formSubtitle}>Renseignez les informations ci-dessous. L'assistant générera un plan complet, des notes exégétiques et un guide de groupe.</Text>

        {/* Passage / Thème */}
        <Text style={styles.fieldLabel}>Passage ou thème biblique</Text>
        <TextInput
          style={styles.textArea}
          value={passageOrTheme}
          onChangeText={setPassageOrTheme}
          placeholder="Ex: Romains 8:1-11, La paix dans l'épreuve, La grâce de Dieu..."
          placeholderTextColor={Colors.grayWarm}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Style de prédication */}
        <Text style={styles.fieldLabel}>Style de prédication</Text>
        <View style={styles.chipRow}>
          {['Exégétique', 'Thématique', 'Narratif', 'Évangélisation'].map(s => (
            <SelectionChip key={s} label={s} selected={style === s} onPress={() => setStyle(s)} />
          ))}
        </View>

        {/* Auditoire */}
        <Text style={styles.fieldLabel}>Auditoire cible</Text>
        <View style={styles.chipRow}>
          {['Général', 'Jeunesse', 'Adultes', 'Évangélisation'].map(a => (
            <SelectionChip key={a} label={a} selected={audience === a} onPress={() => setAudience(a)} />
          ))}
        </View>

        {/* Durée */}
        <Text style={styles.fieldLabel}>Durée approximative</Text>
        <View style={styles.chipRow}>
          {['20 minutes', '30 minutes', '45 minutes', '60 minutes'].map(d => (
            <SelectionChip key={d} label={d} selected={duration === d} onPress={() => setDuration(d)} />
          ))}
        </View>

        {/* Bouton Générer */}
        <M3Pressable
          onPress={generateSermon}
          disabled={!passageOrTheme.trim()}
          style={[styles.generateBtn, !passageOrTheme.trim() && { opacity: 0.45 }]}
        >
          <LinearGradient colors={['#A07CD4', ACCENT_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.generateBtnGradient}>
            <MaterialCommunityIcons name="podium" size={20} color={Colors.white} />
            <Text style={styles.generateBtnText}>Générer le plan de sermon</Text>
          </LinearGradient>
        </M3Pressable>
      </Animated.View>
    </ScrollView>
  );

  // ─── Render: Loading ───────────────────────────────────────────────────────
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.loadingCard}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingTitle}>Préparation du sermon</Text>
        <Text style={styles.loadingSubtitle}>L'assistant analyse les Écritures et structure votre plan homilétique...</Text>
        <Text style={styles.loadingPassage}>{passageOrTheme}</Text>
      </Animated.View>
    </View>
  );

  // ─── Render: Plan Tab ──────────────────────────────────────────────────────
  const renderSermonPlan = () => {
    if (!sermonData) return null;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>

        {/* Titre choisi */}
        <Animated.View entering={FadeInDown.duration(350).delay(0)}>
          <SectionLabel text="CHOIX DU TITRE" />
          {sermonData.titles.map((t, i) => (
            <Pressable key={i} onPress={() => setChosenTitleIndex(i)} style={[styles.titleOption, chosenTitleIndex === i && styles.titleOptionSelected]}>
              <View style={[styles.titleOptionDot, chosenTitleIndex === i && styles.titleOptionDotSelected]} />
              <Text style={[styles.titleOptionText, chosenTitleIndex === i && styles.titleOptionTextSelected]}>{t}</Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* Idée centrale */}
        <Animated.View entering={FadeInDown.duration(350).delay(60)}>
          <SectionLabel text="IDEE CENTRALE" />
          <View style={styles.bigIdeaCard}>
            <Text style={styles.bigIdeaText}>{sermonData.bigIdea}</Text>
          </View>
        </Animated.View>

        {/* Introduction */}
        <Animated.View entering={FadeInDown.duration(350).delay(120)}>
          <SectionLabel text="INTRODUCTION" />
          <View style={styles.introCard}>
            <Text style={styles.introLabel}>Accroche</Text>
            <Text style={styles.introText}>{sermonData.introduction.hook}</Text>
            <View style={styles.introDivider} />
            <Text style={styles.introLabel}>Mise en contexte</Text>
            <Text style={styles.introText}>{sermonData.introduction.setup}</Text>
            <View style={styles.introDivider} />
            <Text style={styles.introLabel}>Transition</Text>
            <Text style={styles.introText}>{sermonData.introduction.transition}</Text>
          </View>
        </Animated.View>

        {/* Points */}
        <Animated.View entering={FadeInDown.duration(350).delay(180)}>
          <SectionLabel text="DEVELOPPEMENT" />
          {sermonData.points.map((p) => (
            <View key={p.number} style={styles.pointCard}>
              <View style={styles.pointHeader}>
                <View style={styles.pointBadge}>
                  <Text style={styles.pointBadgeText}>{p.number}</Text>
                </View>
                <Text style={styles.pointTitle}>{p.title}</Text>
              </View>
              <View style={styles.pointVerseRow}>
                <MaterialCommunityIcons name="book-open-variant" size={13} color={ACCENT} />
                <Text style={styles.pointVerse}>{p.textSupport}</Text>
              </View>
              <Text style={styles.pointLabel}>Explication</Text>
              <Text style={styles.pointBody}>{p.explanation}</Text>
              <View style={styles.illustrationBox}>
                <Text style={styles.illustrationLabel}>Illustration</Text>
                <Text style={styles.illustrationText}>{p.illustration}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Conclusion */}
        <Animated.View entering={FadeInDown.duration(350).delay(240)}>
          <SectionLabel text="CONCLUSION" />
          <View style={styles.conclusionCard}>
            <Text style={styles.introLabel}>Synthèse</Text>
            <Text style={styles.introText}>{sermonData.conclusion.summary}</Text>
            <View style={styles.introDivider} />
            <Text style={styles.introLabel}>Application pratique</Text>
            <Text style={styles.introText}>{sermonData.conclusion.application}</Text>
            <View style={styles.introDivider} />
            <Text style={styles.introLabel}>Appel final</Text>
            <Text style={[styles.introText, { fontStyle: 'italic', color: ACCENT }]}>{sermonData.conclusion.call}</Text>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ─── Render: Exégèse Tab ───────────────────────────────────────────────────
  const renderExegesis = () => {
    if (loadingExegesis) return (
      <View style={styles.subLoadingContainer}>
        <ActivityIndicator size="small" color={ACCENT} />
        <Text style={styles.subLoadingText}>Analyse herméneutique en cours...</Text>
      </View>
    );
    if (!exegesisData) return (
      <View style={styles.subLoadingContainer}>
        <Text style={styles.subLoadingText}>Les notes exégétiques seront disponibles après la génération du sermon.</Text>
      </View>
    );
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Animated.View entering={FadeInDown.duration(350)}>
          <SectionLabel text="CONTEXTE HISTORIQUE" />
          <View style={styles.introCard}>
            <Text style={styles.pointBody}>{exegesisData.historicalContext}</Text>
          </View>

          {exegesisData.wordStudies?.length > 0 && (
            <>
              <SectionLabel text="ETUDE DES MOTS ORIGINAUX" />
              {exegesisData.wordStudies.map((w, i) => (
                <View key={i} style={styles.wordStudyCard}>
                  <Text style={styles.originalWord}>{w.originalWord}</Text>
                  <Text style={styles.wordMeaning}>{w.meaning}</Text>
                </View>
              ))}
            </>
          )}

          {exegesisData.crossReferences?.length > 0 && (
            <>
              <SectionLabel text="VERSETS CROISES" />
              {exegesisData.crossReferences.map((r, i) => (
                <View key={i} style={styles.crossRefCard}>
                  <Text style={styles.crossRefPassage}>{r.passage}</Text>
                  <Text style={styles.crossRefConnection}>{r.connection}</Text>
                </View>
              ))}
            </>
          )}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ─── Render: Guide Groupe Tab ──────────────────────────────────────────────
  const renderGroupStudy = () => {
    if (loadingGroup) return (
      <View style={styles.subLoadingContainer}>
        <ActivityIndicator size="small" color={ACCENT} />
        <Text style={styles.subLoadingText}>Génération du guide de groupe en cours...</Text>
      </View>
    );
    if (!groupStudyData) return (
      <View style={styles.subLoadingContainer}>
        <Text style={styles.subLoadingText}>Le guide de groupe sera disponible après la génération du sermon.</Text>
      </View>
    );
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Animated.View entering={FadeInDown.duration(350)}>
          <SectionLabel text="BRISE-GLACE" />
          <View style={styles.introCard}>
            <Text style={styles.pointBody}>{groupStudyData.icebreaker}</Text>
          </View>

          <SectionLabel text="QUESTIONS DE DISCUSSION" />
          {groupStudyData.questions.map((q) => (
            <View key={q.id} style={styles.questionCard}>
              <View style={styles.questionNumberBadge}>
                <Text style={styles.questionNumberText}>{q.id}</Text>
              </View>
              <Text style={styles.questionText}>{q.text}</Text>
            </View>
          ))}

          <SectionLabel text="SUJETS DE PRIERE" />
          {groupStudyData.prayerPoints.map((p, i) => (
            <View key={i} style={styles.prayerPointRow}>
              <View style={styles.prayerDot} />
              <Text style={styles.prayerPointText}>{p}</Text>
            </View>
          ))}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ─── Render: Mode Pupitre ─────────────────────────────────────────────────
  const renderPulpit = () => {
    if (!sermonData) return null;
    const chosenTitle = sermonData.titles[chosenTitleIndex] || sermonData.titles[0];
    const currentPoint = sermonData.points[pulpitPointIndex];

    const goNext = () => {
      if (pulpitSection === 'intro') {
        setPulpitSection('point');
        setPulpitPointIndex(0);
      } else if (pulpitSection === 'point') {
        if (pulpitPointIndex + 1 < sermonData.points.length) {
          setPulpitPointIndex(i => i + 1);
        } else {
          setPulpitSection('conclusion');
        }
      }
    };

    const goPrev = () => {
      if (pulpitSection === 'conclusion') {
        setPulpitSection('point');
        setPulpitPointIndex(sermonData.points.length - 1);
      } else if (pulpitSection === 'point') {
        if (pulpitPointIndex > 0) {
          setPulpitPointIndex(i => i - 1);
        } else {
          setPulpitSection('intro');
        }
      }
    };

    return (
      <View style={styles.pulpitContainer}>
        {/* Header with timer */}
        <View style={styles.pulpitHeader}>
          <Text style={styles.pulpitSermonTitle}>{chosenTitle}</Text>
          <View style={styles.pulpitTimerRow}>
            <TouchableOpacity onPress={() => setTimerRunning(r => !r)} style={styles.pulpitTimerBtn}>
              <MaterialCommunityIcons name={timerRunning ? 'pause' : 'play'} size={16} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setTimerRunning(false); setTimerSeconds(0); }} style={styles.pulpitTimerBtnReset}>
              <MaterialCommunityIcons name="restart" size={14} color={ACCENT_LIGHT} />
            </TouchableOpacity>
            <Text style={styles.pulpitTimer}>{formatTimer(timerSeconds)}</Text>
          </View>
        </View>

        {/* Section indicator */}
        <View style={styles.pulpitSectionRow}>
          {['intro', 'point', 'conclusion'].map((s) => (
            <View key={s} style={[styles.pulpitSectionDot, pulpitSection === s && styles.pulpitSectionDotActive]} />
          ))}
        </View>

        {/* Content */}
        <ScrollView style={styles.pulpitScroll} contentContainerStyle={styles.pulpitScrollContent} showsVerticalScrollIndicator={false}>
          {pulpitSection === 'intro' && (
            <Animated.View entering={FadeIn.duration(300)} key="intro">
              <Text style={styles.pulpitSectionLabel}>INTRODUCTION</Text>
              <Text style={styles.pulpitBody}>{sermonData.introduction.hook}</Text>
              <Text style={[styles.pulpitBody, { marginTop: 20 }]}>{sermonData.introduction.setup}</Text>
              <Text style={[styles.pulpitBody, { marginTop: 20, color: ACCENT_LIGHT }]}>{sermonData.introduction.transition}</Text>
            </Animated.View>
          )}
          {pulpitSection === 'point' && currentPoint && (
            <Animated.View entering={FadeIn.duration(300)} key={`point-${pulpitPointIndex}`}>
              <Text style={styles.pulpitSectionLabel}>POINT {currentPoint.number} / {sermonData.points.length}</Text>
              <Text style={styles.pulpitPointTitle}>{currentPoint.title}</Text>
              <Text style={styles.pulpitVerse}>{currentPoint.textSupport}</Text>
              <Text style={[styles.pulpitBody, { marginTop: 16 }]}>{currentPoint.explanation}</Text>
              <View style={styles.pulpitIllustrationBox}>
                <Text style={styles.pulpitIllustrationLabel}>ILLUSTRATION</Text>
                <Text style={styles.pulpitIllustrationText}>{currentPoint.illustration}</Text>
              </View>
            </Animated.View>
          )}
          {pulpitSection === 'conclusion' && (
            <Animated.View entering={FadeIn.duration(300)} key="conclusion">
              <Text style={styles.pulpitSectionLabel}>CONCLUSION</Text>
              <Text style={styles.pulpitBody}>{sermonData.conclusion.summary}</Text>
              <Text style={[styles.pulpitBody, { marginTop: 20 }]}>{sermonData.conclusion.application}</Text>
              <Text style={[styles.pulpitBody, { marginTop: 20, fontStyle: 'italic', color: ACCENT_LIGHT }]}>{sermonData.conclusion.call}</Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.pulpitNav}>
          <TouchableOpacity
            onPress={goPrev}
            disabled={pulpitSection === 'intro'}
            style={[styles.pulpitNavBtn, pulpitSection === 'intro' && { opacity: 0.3 }]}
          >
            <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.white} />
            <Text style={styles.pulpitNavText}>Précédent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={goNext}
            disabled={pulpitSection === 'conclusion'}
            style={[styles.pulpitNavBtn, pulpitSection === 'conclusion' && { opacity: 0.3 }]}
          >
            <Text style={styles.pulpitNavText}>Suivant</Text>
            <MaterialCommunityIcons name="chevron-right" size={28} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Root Render ──────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <Animated.View entering={FadeInUp.duration(400)} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <LinearGradient colors={['#A07CD4', ACCENT_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <M3Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.white} />
          </M3Pressable>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons name="podium" size={18} color="rgba(255,255,255,0.85)" />
            <Text style={styles.headerTitle}>Assistant Prédicateurs</Text>
          </View>
          {phase === 'result' && (
            <M3Pressable onPress={() => { setPhase('form'); setSermonData(null); setExegesisData(null); setGroupStudyData(null); }} style={styles.backBtn}>
              <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
            </M3Pressable>
          )}
          {phase !== 'result' && <View style={{ width: 40 }} />}
        </LinearGradient>

        {phase === 'result' && (
          <TabBar activeTab={activeTab} onChange={setActiveTab} />
        )}
      </Animated.View>

      {/* Body */}
      <View style={styles.body}>
        {phase === 'form' && renderForm()}
        {phase === 'loading' && renderLoading()}
        {phase === 'result' && activeTab === 'Plan' && renderSermonPlan()}
        {phase === 'result' && activeTab === 'Exégèse' && renderExegesis()}
        {phase === 'result' && activeTab === 'Groupe' && renderGroupStudy()}
        {phase === 'result' && activeTab === 'Pupitre' && renderPulpit()}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ivory,
  },
  header: {
    backgroundColor: 'transparent',
    zIndex: 10,
    ...(Platform.OS !== 'web' ? Shadows.hover : {}),
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },

  // Tabs
  tabBar: {
    backgroundColor: ACCENT_DARK,
    maxHeight: 44,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabActive: {
    backgroundColor: Colors.white,
  },
  tabText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  tabTextActive: {
    color: ACCENT_DARK,
    fontWeight: '700',
  },

  body: {
    flex: 1,
  },

  // Form
  scrollContainer: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    paddingBottom: 60,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.grayWarm,
    lineHeight: 20,
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textArea: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0D8F0',
    padding: 14,
    fontSize: 15,
    color: Colors.navy,
    minHeight: 90,
    marginBottom: 20,
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: '#E0D8F0',
  },
  chipSelected: {
    backgroundColor: ACCENT_LIGHT,
    borderColor: ACCENT,
  },
  chipText: {
    fontSize: 13,
    color: Colors.grayWarm,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: ACCENT_DARK,
    fontWeight: '700',
  },
  generateBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    ...(Platform.OS !== 'web' ? Shadows.hover : {}),
  },
  generateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  generateBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.3,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    gap: 16,
    ...(Platform.OS !== 'web' ? Shadows.hover : {}),
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: Colors.grayWarm,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingPassage: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
    textAlign: 'center',
  },

  // Section Labels
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 20,
    gap: 10,
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0D8F0',
  },
  sectionLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 1.5,
  },

  // Tab content
  tabContent: {
    padding: 16,
    paddingBottom: 60,
  },

  // Titles
  titleOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0D8F0',
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  titleOptionSelected: {
    borderColor: ACCENT,
    backgroundColor: ACCENT_LIGHT,
  },
  titleOptionDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C0B0D8',
    marginTop: 2,
  },
  titleOptionDotSelected: {
    borderColor: ACCENT,
    backgroundColor: ACCENT,
  },
  titleOptionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.grayWarm,
    lineHeight: 20,
  },
  titleOptionTextSelected: {
    color: ACCENT_DARK,
    fontWeight: '700',
  },

  // Big Idea
  bigIdeaCard: {
    backgroundColor: ACCENT_LIGHT,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: ACCENT,
    padding: 16,
  },
  bigIdeaText: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT_DARK,
    lineHeight: 24,
    fontStyle: 'italic',
  },

  // Introduction & Conclusion
  introCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  conclusionCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  introLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  introText: {
    fontSize: 14,
    color: Colors.navy,
    lineHeight: 22,
  },
  introDivider: {
    height: 1,
    backgroundColor: '#F0EAF8',
    marginVertical: 14,
  },

  // Point cards
  pointCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  pointBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.white,
  },
  pointTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  pointVerseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  pointVerse: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT,
  },
  pointLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.grayWarm,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  pointBody: {
    fontSize: 14,
    color: Colors.navy,
    lineHeight: 22,
  },
  illustrationBox: {
    backgroundColor: '#F8F4FD',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#C9A8E8',
  },
  illustrationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9B70C8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  illustrationText: {
    fontSize: 13,
    color: Colors.navy,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Exegesis
  wordStudyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  originalWord: {
    fontSize: 17,
    fontWeight: '800',
    color: ACCENT_DARK,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  wordMeaning: {
    fontSize: 14,
    color: Colors.navy,
    lineHeight: 22,
  },
  crossRefCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  crossRefPassage: {
    fontSize: 13,
    fontWeight: '800',
    color: ACCENT,
    width: 100,
  },
  crossRefConnection: {
    flex: 1,
    fontSize: 13,
    color: Colors.navy,
    lineHeight: 20,
  },

  // Group Study
  questionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    ...(Platform.OS !== 'web' ? Shadows.card : {}),
  },
  questionNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ACCENT_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumberText: {
    fontSize: 12,
    fontWeight: '900',
    color: ACCENT_DARK,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.navy,
    lineHeight: 22,
  },
  prayerPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  prayerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginTop: 7,
  },
  prayerPointText: {
    flex: 1,
    fontSize: 14,
    color: Colors.navy,
    lineHeight: 22,
  },

  // Sub-loading
  subLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  subLoadingText: {
    fontSize: 14,
    color: Colors.grayWarm,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Pulpit Mode
  pulpitContainer: {
    flex: 1,
    backgroundColor: '#1A0F2E',
  },
  pulpitHeader: {
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 98, 181, 0.3)',
  },
  pulpitSermonTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  pulpitTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pulpitTimerBtn: {
    backgroundColor: ACCENT,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulpitTimerBtnReset: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 98, 181, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulpitTimer: {
    fontSize: 22,
    fontWeight: '300',
    color: Colors.white,
    fontVariant: ['tabular-nums'],
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  pulpitSectionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  pulpitSectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  pulpitSectionDotActive: {
    backgroundColor: ACCENT,
    width: 24,
  },
  pulpitScroll: {
    flex: 1,
  },
  pulpitScrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  pulpitSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  pulpitPointTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 8,
    lineHeight: 34,
  },
  pulpitVerse: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(160, 124, 212, 0.9)',
    marginBottom: 16,
  },
  pulpitBody: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 32,
  },
  pulpitIllustrationBox: {
    marginTop: 24,
    backgroundColor: 'rgba(139, 98, 181, 0.15)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    padding: 16,
  },
  pulpitIllustrationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pulpitIllustrationText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },
  pulpitNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 98, 181, 0.25)',
  },
  pulpitNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pulpitNavText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
});
