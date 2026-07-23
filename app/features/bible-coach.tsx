import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Colors, Shadows } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// M3 Motion Presets
const M3_SPRING = { damping: 20, stiffness: 180, mass: 0.8 };
const M3_STANDARD = { duration: 300, easing: Easing.bezier(0.2, 0, 0, 1) };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        if (disabled) return;
        scale.value = withSpring(0.96, M3_SPRING);
        opacity.value = withTiming(activeOpacity, M3_STANDARD);
      }}
      onPressOut={() => {
        if (disabled) return;
        scale.value = withSpring(1, M3_SPRING);
        opacity.value = withTiming(1, M3_STANDARD);
      }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

interface PlanDay {
  day: number;
  reading: string;
  description: string;
  goal: string;
}

export default function BibleCoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const parseReadingRef = (reading: string) => {
    const regex = /^([1-3]?\s*[A-Za-zÀ-ÿ]+)\s+(\d+)/;
    const match = reading.trim().match(regex);
    if (match) {
      return {
        book: match[1].trim(),
        chapter: match[2]
      };
    }
    return null;
  };

  // Navigation / UI States
  const [phase, setPhase] = useState<'welcome' | 'evaluation' | 'generating' | 'plan' | 'day-detail'>('welcome');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Evaluation Quiz States
  const [quizQuestions, setQuizQuestions] = useState<{ id: number; question: string; context: string }[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');

  // Plan States
  const [userLevel, setUserLevel] = useState<string>('');
  const [evaluationSummary, setEvaluationSummary] = useState<string>('');
  const [readingPlan, setReadingPlan] = useState<PlanDay[]>([]);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [selectedDay, setSelectedDay] = useState<PlanDay | null>(null);

  // Daily Submission States
  const [userSummary, setUserSummary] = useState('');
  const [evaluationFeedback, setEvaluationFeedback] = useState<string | null>(null);
  const [evaluationInsights, setEvaluationInsights] = useState<string | null>(null);
  const [isSubmittingSummary, setIsSubmittingSummary] = useState(false);
  const [isDayPassed, setIsDayPassed] = useState(false);

  // Shared values pour les animations M3
  const loaderRotation = useSharedValue(0);
  const skeletonPulse = useSharedValue(0.4);

  // Animer le chargeur en phase 'generating'
  useEffect(() => {
    if (phase === 'generating') {
      loaderRotation.value = 0;
      loaderRotation.value = withRepeat(
        withTiming(360, { duration: 1800, easing: Easing.linear }),
        -1,
        false
      );
      skeletonPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(loaderRotation);
      cancelAnimation(skeletonPulse);
    }
  }, [phase]);

  const loaderAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${loaderRotation.value}deg` }],
  }));

  // Load persisted plan on startup
  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    try {
      const savedPlan = await AsyncStorage.getItem('@bible_coach_plan');
      const savedLevel = await AsyncStorage.getItem('@bible_coach_level');
      const savedSummary = await AsyncStorage.getItem('@bible_coach_summary');
      const savedCompleted = await AsyncStorage.getItem('@bible_coach_completed');

      if (savedPlan && savedLevel) {
        setReadingPlan(JSON.parse(savedPlan));
        setUserLevel(savedLevel);
        setEvaluationSummary(savedSummary || '');
        setCompletedDays(savedCompleted ? JSON.parse(savedCompleted) : []);
        setPhase('plan');
      }
    } catch (err) {
      console.warn("Erreur lors du chargement des donnees locales :", err);
    }
  };

  const saveLocalData = async (plan: PlanDay[], level: string, summary: string) => {
    try {
      await AsyncStorage.setItem('@bible_coach_plan', JSON.stringify(plan));
      await AsyncStorage.setItem('@bible_coach_level', level);
      await AsyncStorage.setItem('@bible_coach_summary', summary);
    } catch (err) {
      console.warn("Erreur lors de la sauvegarde locale :", err);
    }
  };

  const parseSupabaseError = async (error: any): Promise<string> => {
    if (!error) return "Erreur inconnue.";
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json();
        return body.error || error.message;
      }
    } catch (err) {
      console.warn("Erreur lors de l'analyse du contexte d'erreur :", err);
    }
    return error.message || "Erreur de connexion au serveur.";
  };

  const handleStartQuizInit = async () => {
    setLoading(true);
    setErrorMsg(null);
    setPhase('generating');

    try {
      const { data, error } = await supabase.functions.invoke('bible-coach', {
        body: { action: 'initialize' }
      });

      if (error) {
        const msg = await parseSupabaseError(error);
        throw new Error(msg);
      }

      if (!data || !data.questions) {
        throw new Error("Erreur d'initialisation du quiz.");
      }

      setQuizQuestions(data.questions);
      setCurrentQuizIndex(0);
      setQuizAnswers({});
      setCurrentAnswer('');
      setPhase('evaluation');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Impossible de generer le questionnaire d'evaluation.");
      setPhase('welcome');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuiz = () => {
    if (!currentAnswer.trim()) return;

    const currentQuestion = quizQuestions[currentQuizIndex];
    const updatedAnswers = { ...quizAnswers, [currentQuestion.id]: currentAnswer };
    setQuizAnswers(updatedAnswers);
    setCurrentAnswer('');

    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    } else {
      generatePlan(updatedAnswers);
    }
  };

  const generatePlan = async (answers: Record<number, string>) => {
    setLoading(true);
    setErrorMsg(null);
    setPhase('generating');

    const formattedAnswers = quizQuestions.map(q => ({
      question: q.question,
      context: q.context,
      answer: answers[q.id]
    }));

    try {
      const { data, error } = await supabase.functions.invoke('bible-coach', {
        body: { action: 'generatePlan', responses: formattedAnswers }
      });

      if (error) {
        const msg = await parseSupabaseError(error);
        throw new Error(msg);
      }

      if (!data || !data.plan) {
        throw new Error("Erreur lors de la generation du plan.");
      }

      setReadingPlan(data.plan);
      setUserLevel(data.level || 'Debutant');
      setEvaluationSummary(data.evaluationSummary || '');
      setCompletedDays([]);
      
      await saveLocalData(data.plan, data.level, data.evaluationSummary);
      await AsyncStorage.setItem('@bible_coach_completed', JSON.stringify([]));

      setPhase('plan');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Impossible de generer le plan de lecture.");
      setPhase('welcome');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDailySummary = async () => {
    if (!userSummary.trim() || !selectedDay) return;

    setIsSubmittingSummary(true);
    setEvaluationFeedback(null);
    setEvaluationInsights(null);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.functions.invoke('bible-coach', {
        body: {
          action: 'submitResponse',
          currentDay: selectedDay.day,
          userResponse: userSummary,
          planDayDetails: selectedDay
        }
      });

      if (error) {
        const msg = await parseSupabaseError(error);
        throw new Error(msg);
      }

      if (!data) {
        throw new Error("Erreur lors de la validation du resume.");
      }

      setEvaluationFeedback(data.feedback);
      setEvaluationInsights(data.insights);
      setIsDayPassed(data.success);

      if (data.success) {
        // Mark day as completed
        const newCompleted = [...new Set([...completedDays, selectedDay.day])];
        setCompletedDays(newCompleted);
        await AsyncStorage.setItem('@bible_coach_completed', JSON.stringify(newCompleted));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erreur de validation de votre resume.");
    } finally {
      setIsSubmittingSummary(false);
    }
  };

  const resetAllCoachProgress = async () => {
    try {
      await AsyncStorage.removeItem('@bible_coach_plan');
      await AsyncStorage.removeItem('@bible_coach_level');
      await AsyncStorage.removeItem('@bible_coach_summary');
      await AsyncStorage.removeItem('@bible_coach_completed');
      setReadingPlan([]);
      setUserLevel('');
      setEvaluationSummary('');
      setCompletedDays([]);
      setPhase('welcome');
    } catch (err) {
      console.warn(err);
    }
  };

  const handleBack = () => {
    if (phase === 'day-detail') {
      setPhase('plan');
      setSelectedDay(null);
      setUserSummary('');
      setEvaluationFeedback(null);
      setEvaluationInsights(null);
      setIsDayPassed(false);
      setErrorMsg(null);
    } else if (phase === 'plan') {
      router.back();
    } else if (phase === 'evaluation') {
      setPhase('welcome');
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <M3Pressable onPress={handleBack} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.navy} />
        </M3Pressable>
        <Text style={styles.headerTitle}>Coach biblique</Text>
        {phase === 'plan' ? (
          <M3Pressable onPress={resetAllCoachProgress} style={styles.resetBtn}>
            <MaterialCommunityIcons name="refresh" size={20} color={Colors.navy} />
          </M3Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* PHASE 1: WELCOME SCREEN */}
      {phase === 'welcome' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.welcomeCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="account-tie-voice-outline" size={48} color={Colors.gold} />
            </View>
            <Text style={styles.welcomeTitle}>Un guide intelligent pour votre foi</Text>
            <Text style={styles.welcomeDesc}>
              Evaluez votre niveau actuel de connaissance des recits bibliques et creez un plan de lecture sur mesure de 28 jours. L'objectif est de vous donner la capacite d'expliquer ou de resumer n'importe quel livre de la Bible avec vos propres termes.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.featureListCard}>
            <Text style={styles.sectionHeaderTitle}>Ce que comprend ce parcours :</Text>
            
            <View style={styles.featureItemRow}>
              <View style={styles.featureDot} />
              <View style={styles.featureTextCol}>
                <Text style={styles.featureItemTitle}>Evaluation sur mesure</Text>
                <Text style={styles.featureItemDesc}>Un quiz initial de 3 questions pour sonder vos connaissances de base.</Text>
              </View>
            </View>

            <View style={styles.featureItemRow}>
              <View style={styles.featureDot} />
              <View style={styles.featureTextCol}>
                <Text style={styles.featureItemTitle}>Parcours cible de 28 jours</Text>
                <Text style={styles.featureItemDesc}>Une selection rigoureuse de lectures des chapitres cles, adaptee a votre niveau.</Text>
              </View>
            </View>

            <View style={styles.featureItemRow}>
              <View style={styles.featureDot} />
              <View style={styles.featureTextCol}>
                <Text style={styles.featureItemTitle}>Validation interactive</Text>
                <Text style={styles.featureItemDesc}>Chaque jour, redigez un court resume et laissez le Coach biblique evaluer votre comprehension.</Text>
              </View>
            </View>
          </Animated.View>

          {errorMsg && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <M3Pressable onPress={handleStartQuizInit} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Commencer mon evaluation</Text>
            </M3Pressable>
          </Animated.View>
        </ScrollView>
      )}

      {/* PHASE 2: EVALUATION SCREEN */}
      {phase === 'evaluation' && quizQuestions.length > 0 && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>Question {currentQuizIndex + 1} sur {quizQuestions.length}</Text>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }
                  ]} 
                />
              </View>
            </View>

            <Animated.View key={currentQuizIndex} entering={FadeIn.duration(300)} style={styles.quizCard}>
              <Text style={styles.quizContext}>{quizQuestions[currentQuizIndex].context}</Text>
              <Text style={styles.quizQuestionText}>{quizQuestions[currentQuizIndex].question}</Text>
            </Animated.View>

            <View style={styles.inputCard}>
              <TextInput
                style={styles.textInputArea}
                placeholder="Redigez votre reponse ici..."
                placeholderTextColor={Colors.grayWarm}
                multiline
                numberOfLines={5}
                value={currentAnswer}
                onChangeText={setCurrentAnswer}
              />
            </View>

            <M3Pressable 
              onPress={handleNextQuiz} 
              style={[styles.primaryBtn, !currentAnswer.trim() && { opacity: 0.6 }]}
              disabled={!currentAnswer.trim()}
            >
              <Text style={styles.primaryBtnText}>
                {currentQuizIndex === quizQuestions.length - 1 ? "Generer mon plan" : "Question suivante"}
              </Text>
            </M3Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* PHASE 3: GENERATING SCREEN */}
      {phase === 'generating' && (
        <View style={styles.centerContainer}>
          <Animated.View style={[styles.haloContainer, loaderAnimatedStyle]}>
            <LinearGradient
              colors={['#D4A85A', 'rgba(212, 168, 90, 0.2)', '#13294B']}
              style={styles.animatedLoaderCircle}
            />
          </Animated.View>
          <Text style={styles.generatingTitle}>Preparation en cours</Text>
          <Text style={styles.generatingDesc}>Nous etudions vos reponses pour etablir votre plan de lecture personnalise de 28 jours.</Text>
        </View>
      )}

      {/* PHASE 4: READING PLAN HUB */}
      {phase === 'plan' && readingPlan.length > 0 && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(400)} style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <Text style={styles.levelLabel}>Niveau evalue :</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{userLevel}</Text>
              </View>
            </View>
            <Text style={styles.levelSummaryText}>{evaluationSummary}</Text>
          </Animated.View>

          <Text style={styles.gridSectionTitle}>Votre plan de lecture (28 jours)</Text>

          <View style={styles.daysGrid}>
            {readingPlan.map((dayItem, index) => {
              const isCompleted = completedDays.includes(dayItem.day);
              const isCurrent = completedDays.length + 1 === dayItem.day || (completedDays.length === 28 && dayItem.day === 28);
              return (
                <Animated.View
                  key={dayItem.day}
                  entering={FadeInDown.duration(400).delay(index * 30).springify().damping(18)}
                >
                  <M3Pressable
                    onPress={() => {
                      setSelectedDay(dayItem);
                      setPhase('day-detail');
                    }}
                    style={[
                      styles.gridDayCard,
                      isCompleted && styles.dayCardCompleted,
                      isCurrent && styles.dayCardCurrent,
                    ]}
                  >
                    <View style={styles.dayNumberRow}>
                      <Text style={[styles.dayNumberText, isCompleted && styles.textWhite, isCurrent && styles.textWhite]}>
                        Jour {dayItem.day}
                      </Text>
                      {isCompleted && (
                        <MaterialCommunityIcons name="check-circle" size={16} color={Colors.white} />
                      )}
                    </View>
                    <Text 
                      style={[
                        styles.dayReadingText, 
                        isCompleted && styles.textWhite, 
                        isCurrent && styles.textWhite
                      ]} 
                      numberOfLines={2}
                    >
                      {dayItem.reading}
                    </Text>
                  </M3Pressable>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* PHASE 5: DAY DETAIL / SESSION */}
      {phase === 'day-detail' && selectedDay && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(350)} style={styles.sessionHeaderCard}>
              <View style={styles.sessionHeaderTop}>
                <Text style={styles.sessionDayLabel}>Jour {selectedDay.day}</Text>
                {completedDays.includes(selectedDay.day) && (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>Complete</Text>
                  </View>
                )}
              </View>
              <M3Pressable
                onPress={() => {
                  const ref = parseReadingRef(selectedDay.reading);
                  if (ref) {
                    router.push({
                      pathname: '/bible',
                      params: { book: ref.book, chapter: ref.chapter }
                    } as any);
                  } else {
                    router.push('/bible' as any);
                  }
                }}
                style={styles.bibleLinkBtn}
              >
                <Text style={styles.sessionReadingTitle}>{selectedDay.reading}</Text>
                <MaterialCommunityIcons name="book-open-page-variant-outline" size={20} color={Colors.gold} />
              </M3Pressable>
              <Text style={styles.sessionDesc}>{selectedDay.description}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.goalCard}>
              <Text style={styles.goalHeaderTitle}>Objectif du jour :</Text>
              <Text style={styles.goalText}>{selectedDay.goal}</Text>
            </Animated.View>

            {/* If not completed yet or retrying */}
            {!completedDays.includes(selectedDay.day) && !isDayPassed && (
              <Animated.View entering={FadeInDown.delay(150).duration(350)}>
                <Text style={styles.inputSectionTitle}>Redigez votre explication ou resume :</Text>
                <View style={styles.inputCard}>
                  <TextInput
                    style={styles.textInputArea}
                    placeholder="Expliquez ce livre ou ce chapitre dans vos propres mots..."
                    placeholderTextColor={Colors.grayWarm}
                    multiline
                    numberOfLines={6}
                    value={userSummary}
                    onChangeText={setUserSummary}
                    editable={!isSubmittingSummary}
                  />
                </View>

                {errorMsg && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{errorMsg}</Text>
                  </View>
                )}

                <M3Pressable
                  onPress={handleSubmitDailySummary}
                  style={[styles.primaryBtn, (!userSummary.trim() || isSubmittingSummary) && { opacity: 0.6 }]}
                  disabled={!userSummary.trim() || isSubmittingSummary}
                >
                  {isSubmittingSummary ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Soumettre au Coach</Text>
                  )}
                </M3Pressable>
              </Animated.View>
            )}

            {/* Display Coach Feedback */}
            {(evaluationFeedback || isDayPassed) && (
              <Animated.View entering={ZoomIn.duration(400)} style={styles.feedbackCard}>
                <View style={styles.feedbackHeader}>
                  <MaterialCommunityIcons 
                    name={isDayPassed ? "check-decagram" : "alert-decagram"} 
                    size={24} 
                    color={isDayPassed ? "#38A169" : "#DD6B20"} 
                  />
                  <Text style={[styles.feedbackTitle, { color: isDayPassed ? "#2F855A" : "#C05621" }]}>
                    {isDayPassed ? "Validation Reussie" : "Retours du Coach"}
                  </Text>
                </View>
                <Text style={styles.feedbackText}>{evaluationFeedback}</Text>
                
                {evaluationInsights && (
                  <View style={styles.insightsContainer}>
                    <Text style={styles.insightsTitle}>Eclairage additionnel :</Text>
                    <Text style={styles.insightsText}>{evaluationInsights}</Text>
                  </View>
                )}

                {!isDayPassed && (
                  <M3Pressable 
                    onPress={() => {
                      setEvaluationFeedback(null);
                      setEvaluationInsights(null);
                    }} 
                    style={styles.retryBtn}
                  >
                    <Text style={styles.retryBtnText}>Reessayer la formulation</Text>
                  </M3Pressable>
                )}
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ivory,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    ...Shadows.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: Colors.navy,
    textAlign: 'center',
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(19, 41, 75, 0.04)',
    ...Shadows.soft,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 168, 90, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeDesc: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.grayWarm,
    textAlign: 'center',
  },
  featureListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(19, 41, 75, 0.04)',
    ...Shadows.soft,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: Colors.navy,
    marginBottom: 16,
  },
  featureItemRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
    marginTop: 6,
  },
  featureTextCol: {
    flex: 1,
  },
  featureItemTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.navy,
    marginBottom: 4,
  },
  featureItemDesc: {
    fontSize: 13,
    color: Colors.grayWarm,
    lineHeight: 18,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 20,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  progressRow: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.navy,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(19, 41, 75, 0.06)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.gold,
  },
  quizCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 90, 0.15)',
    ...Shadows.soft,
  },
  quizContext: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.gold,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  quizQuestionText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.navy,
    lineHeight: 24,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    ...Shadows.soft,
  },
  textInputArea: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.navy,
    minHeight: 100,
    textAlignVertical: 'top',
    padding: 0,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  generatingTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.navy,
    marginTop: 16,
    marginBottom: 8,
  },
  generatingDesc: {
    fontSize: 14,
    color: Colors.grayWarm,
    textAlign: 'center',
    lineHeight: 20,
  },
  levelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(19, 41, 75, 0.04)',
    ...Shadows.soft,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  levelLabel: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: Colors.navy,
  },
  levelBadge: {
    backgroundColor: 'rgba(212, 168, 90, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 90, 0.2)',
  },
  levelBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.gold,
  },
  levelSummaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.grayWarm,
  },
  gridSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: Colors.navy,
    marginBottom: 16,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridDayCard: {
    width: (SCREEN_WIDTH - 60) / 2, // 2 columns layout
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(19, 41, 75, 0.04)',
    ...Shadows.soft,
  },
  dayCardCompleted: {
    backgroundColor: '#38A169',
    borderColor: '#38A169',
  },
  dayCardCurrent: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  dayNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayNumberText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.navy,
  },
  dayReadingText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.navy,
  },
  textWhite: {
    color: Colors.white,
  },
  sessionHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(19, 41, 75, 0.04)',
    ...Shadows.soft,
  },
  sessionHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionDayLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.gold,
    textTransform: 'uppercase',
  },
  completedBadge: {
    backgroundColor: 'rgba(56, 161, 105, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  completedBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#38A169',
  },
  sessionReadingTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.navy,
    marginBottom: 8,
  },
  sessionDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.grayWarm,
  },
  goalCard: {
    backgroundColor: 'rgba(212, 168, 90, 0.06)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 90, 0.12)',
    marginBottom: 20,
  },
  goalHeaderTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: Colors.navy,
    marginBottom: 6,
  },
  goalText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.navy,
  },
  inputSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: Colors.navy,
    marginBottom: 10,
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...Shadows.soft,
    marginBottom: 20,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.navy,
    marginBottom: 16,
  },
  insightsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 16,
  },
  insightsTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: Colors.gold,
    marginBottom: 6,
  },
  insightsText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.grayWarm,
  },
  retryBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.navy,
  },
  errorBanner: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#C53030',
  },
  haloContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  animatedLoaderCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  bibleLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
});
