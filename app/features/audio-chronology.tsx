/**
 * Dieu et Moi — Les Contes de la Bible
 * Interface simplifiée en 3 phases inspirée du Générateur de Prières,
 * utilisant exclusivement les composants de Google Material Design 3 (react-native-paper).
 * UX/UI premium animée, micro-interactions de boutons et waveform réactive.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  TextInput as RNTextInput,
} from 'react-native';
import { Text, Button, Chip, SegmentedButtons, TextInput as PaperTextInput } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  FadeOut,
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';

import { Colors, Shadows } from '@/constants/Colors';
import { BiblicalStory, CharacterDialogue } from '@/lib/audioStoryData';
import { generateStoryWithGemini } from '@/lib/storyLLMEngine';
import { synthesizeEdgeTTSAudio } from '@/lib/edgeTTSService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GREEN = '#6E9476';
const GREEN_LIGHT = '#E6F0E8';
const GREEN_DARK = '#4F7357';
const GOLD = '#D4A85A';
const GOLD_LIGHT = '#F5EFE0';
const NAVY = '#13294B';

const M3_SPRING = { damping: 20, stiffness: 180, mass: 0.8 };
const M3_STANDARD = { duration: 300, easing: Easing.bezier(0.2, 0, 0, 1) };

const SUGGESTIONS = [
  { id: 's1', label: 'Joseph & Rédemption', text: "Raconte-moi l'histoire de Joseph" },
  { id: 's2', label: 'David & Goliath', text: "Je veux écouter David et Goliath" },
  { id: 's3', label: 'Pardon & Réconciliation', text: "Je cherche une histoire sur le pardon" },
  { id: 's4', label: 'Peur de l\'avenir', text: "J'ai peur de l'avenir et j'ai besoin d'espoir" },
  { id: 's5', label: 'Développer la sagesse', text: "Comment développer la sagesse ?" },
  { id: 's6', label: 'Surprends-moi !', text: "Sélectionne un récit biblique au hasard pour me surprendre" },
  { id: 's7', label: 'Vertu : Courage', text: "Je veux apprendre la vertu du courage" },
  { id: 's8', label: 'Temps disponible : 15 min', text: "Un récit biblique captivant de 15 minutes" },
];

const AMBIENT_LOOPS: Record<string, string> = {
  desert: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav', // Wind loop
  sea: 'https://assets.mixkit.co/active_storage/sfx/1188/1188-84.wav', // Sea wave
  temple: 'https://assets.mixkit.co/active_storage/sfx/1987/1987-84.wav', // Choir pad
  battle: 'https://assets.mixkit.co/active_storage/sfx/1653/1653-84.wav', // Heavy march
  palace: 'https://assets.mixkit.co/active_storage/sfx/1919/1919-84.wav', // Harp loop
  peaceful: 'https://assets.mixkit.co/active_storage/sfx/2566/2566-84.wav' // Nature birds
};

function M3Pressable({
  onPress,
  children,
  style,
  disabled,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Pressable
      onPressIn={() => {
        if (!disabled) {
          scale.value = withSpring(0.96, M3_SPRING);
          opacity.value = withTiming(0.85, M3_STANDARD);
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
    </Pressable>
  );
}

function M3LoadingCanvas() {
  const rotation1 = useSharedValue(0);
  const rotation2 = useSharedValue(0);
  const scale = useSharedValue(1);

  const rTL = useSharedValue(30);
  const rTR = useSharedValue(70);
  const rBL = useSharedValue(60);
  const rBR = useSharedValue(40);

  const bar1 = useSharedValue(18);
  const bar2 = useSharedValue(32);
  const bar3 = useSharedValue(24);
  const bar4 = useSharedValue(40);
  const bar5 = useSharedValue(16);

  useEffect(() => {
    rotation1.value = withRepeat(withTiming(360, { duration: 6000, easing: Easing.linear }), -1, false);
    rotation2.value = withRepeat(withTiming(-360, { duration: 8000, easing: Easing.linear }), -1, false);
    scale.value = withRepeat(withSequence(withTiming(1.18, { duration: 1500, easing: Easing.inOut(Easing.ease) }), withTiming(0.92, { duration: 1500, easing: Easing.inOut(Easing.ease) })), -1, true);

    rTL.value = withRepeat(withSequence(withTiming(70, { duration: 1200 }), withTiming(25, { duration: 1400 }), withTiming(50, { duration: 1000 })), -1, true);
    rTR.value = withRepeat(withSequence(withTiming(30, { duration: 1400 }), withTiming(75, { duration: 1100 }), withTiming(40, { duration: 1300 })), -1, true);
    rBL.value = withRepeat(withSequence(withTiming(80, { duration: 1100 }), withTiming(35, { duration: 1300 }), withTiming(65, { duration: 1200 })), -1, true);
    rBR.value = withRepeat(withSequence(withTiming(25, { duration: 1300 }), withTiming(65, { duration: 1000 }), withTiming(30, { duration: 1500 })), -1, true);

    bar1.value = withRepeat(withSequence(withTiming(38, { duration: 400 }), withTiming(14, { duration: 400 })), -1, true);
    bar2.value = withRepeat(withSequence(withTiming(16, { duration: 600 }), withTiming(44, { duration: 600 })), -1, true);
    bar3.value = withRepeat(withSequence(withTiming(42, { duration: 480 }), withTiming(18, { duration: 480 })), -1, true);
    bar4.value = withRepeat(withSequence(withTiming(14, { duration: 520 }), withTiming(36, { duration: 520 })), -1, true);
    bar5.value = withRepeat(withSequence(withTiming(34, { duration: 440 }), withTiming(16, { duration: 440 })), -1, true);
  }, []);

  const fluidOuterStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation1.value}deg` }, { scale: scale.value }],
    borderTopLeftRadius: rTL.value,
    borderTopRightRadius: rTR.value,
    borderBottomLeftRadius: rBL.value,
    borderBottomRightRadius: rBR.value,
  }));

  const fluidInnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation2.value}deg` }],
    borderTopLeftRadius: rBR.value,
    borderTopRightRadius: rBL.value,
    borderBottomLeftRadius: rTR.value,
    borderBottomRightRadius: rTL.value,
  }));

  const bar1Style = useAnimatedStyle(() => ({ height: bar1.value }));
  const bar2Style = useAnimatedStyle(() => ({ height: bar2.value }));
  const bar3Style = useAnimatedStyle(() => ({ height: bar3.value }));
  const bar4Style = useAnimatedStyle(() => ({ height: bar4.value }));
  const bar5Style = useAnimatedStyle(() => ({ height: bar5.value }));

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.m3LoadingCanvas}>
      <View style={styles.m3ElevatedLoadingCard}>
        <View style={styles.fluidPuddleContainer}>
          <Animated.View style={[styles.fluidLayerOuter, fluidOuterStyle]} />
          <Animated.View style={[styles.fluidLayerInner, fluidInnerStyle]} />
          <View style={styles.fluidCoreCircle}>
            <MaterialCommunityIcons name="book-open-page-variant" size={28} color={GOLD} />
          </View>
        </View>

        <Text style={styles.m3LoadingTitle}>Composition du Conte</Text>
        <Text style={styles.m3LoadingSubtitle}>Tissage de la fresque narrative et orchestration des ambiances sonores...</Text>

        <View style={styles.m3ProgressStepsRow}>
          <View style={styles.m3StepDotActive} />
          <View style={styles.m3StepLineActive} />
          <View style={styles.m3StepDotActive} />
          <View style={styles.m3StepLineActive} />
          <View style={styles.m3StepDotActive} />
        </View>

        <View style={styles.m3EqualizerRow}>
          <Animated.View style={[styles.m3EqualizerBar, bar1Style]} />
          <Animated.View style={[styles.m3EqualizerBar, bar2Style]} />
          <Animated.View style={[styles.m3EqualizerBar, bar3Style]} />
          <Animated.View style={[styles.m3EqualizerBar, bar4Style]} />
          <Animated.View style={[styles.m3EqualizerBar, bar5Style]} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function AudioChronologyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Phases : 'input' | 'loading' | 'result'
  const [phase, setPhase] = useState<'input' | 'loading' | 'result'>('input');
  const [inputText, setInputText] = useState('');

  // Audio & Narration States
  const [narrationMode, setNarrationMode] = useState<'faithful' | 'kids' | 'dramatic'>('dramatic');
  const [selectedStory, setSelectedStory] = useState<BiblicalStory | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isSynthesizingTTS, setIsSynthesizingTTS] = useState(false);

  // Sound Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const ambientSoundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const audioCacheRef = useRef<Record<number, string>>({});

  // Interruption modal state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [aiQuestionAnswer, setAiQuestionAnswer] = useState<string | null>(null);
  const [isAnsweringQuestion, setIsAnsweringQuestion] = useState(false);

  // Exegesis post-story tab
  const [postTab, setPostTab] = useState<'references' | 'context' | 'interpretations' | 'lessons'>('lessons');

  // Shared values pour les animations interactives de lecture
  const playScale = useSharedValue(1);
  const playBar1 = useSharedValue(4);
  const playBar2 = useSharedValue(4);
  const playBar3 = useSharedValue(4);
  const playBar4 = useSharedValue(4);
  const playBar5 = useSharedValue(4);

  // Animation respirante du bouton Play et de la waveform
  useEffect(() => {
    if (isPlaying && !isSynthesizingTTS) {
      playScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.94, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      playBar1.value = withRepeat(withSequence(withTiming(26, { duration: 320 }), withTiming(6, { duration: 320 })), -1, true);
      playBar2.value = withRepeat(withSequence(withTiming(36, { duration: 440 }), withTiming(8, { duration: 440 })), -1, true);
      playBar3.value = withRepeat(withSequence(withTiming(24, { duration: 380 }), withTiming(5, { duration: 380 })), -1, true);
      playBar4.value = withRepeat(withSequence(withTiming(40, { duration: 480 }), withTiming(10, { duration: 480 })), -1, true);
      playBar5.value = withRepeat(withSequence(withTiming(18, { duration: 280 }), withTiming(4, { duration: 280 })), -1, true);
    } else {
      cancelAnimation(playScale);
      cancelAnimation(playBar1);
      cancelAnimation(playBar2);
      cancelAnimation(playBar3);
      cancelAnimation(playBar4);
      cancelAnimation(playBar5);
      playScale.value = withTiming(1, { duration: 300 });
      playBar1.value = withTiming(4, { duration: 300 });
      playBar2.value = withTiming(4, { duration: 300 });
      playBar3.value = withTiming(4, { duration: 300 });
      playBar4.value = withTiming(4, { duration: 300 });
      playBar5.value = withTiming(4, { duration: 300 });
    }
  }, [isPlaying, isSynthesizingTTS]);

  const animatedPlayStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playScale.value }],
  }));

  const pBar1Style = useAnimatedStyle(() => ({ height: playBar1.value }));
  const pBar2Style = useAnimatedStyle(() => ({ height: playBar2.value }));
  const pBar3Style = useAnimatedStyle(() => ({ height: playBar3.value }));
  const pBar4Style = useAnimatedStyle(() => ({ height: playBar4.value }));
  const pBar5Style = useAnimatedStyle(() => ({ height: playBar5.value }));

  const currentDialogues: CharacterDialogue[] = (selectedStory && selectedStory.narrationModes && selectedStory.narrationModes[narrationMode]) || [];

  const updatePlayingState = (playing: boolean) => {
    isPlayingRef.current = playing;
    setIsPlaying(playing);
  };

  useEffect(() => {
    return () => {
      stopSpeech();
      stopAmbientSound();
    };
  }, []);

  const stopSpeech = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
    } catch (e) {
      console.log('Speech stop error:', e);
    }
    setIsSynthesizingTTS(false);
  };

  /**
   * Pré-génération en arrière-plan des répliques audio suivantes pour une fluidité 0 latence
   */
  const prefetchNextLines = (currentIndex: number, dialoguesList?: CharacterDialogue[]) => {
    const list = dialoguesList || currentDialogues;
    if (!list || list.length === 0) return;
    const lookAhead = [currentIndex, currentIndex + 1, currentIndex + 2];
    for (const nextIdx of lookAhead) {
      if (nextIdx >= 0 && nextIdx < list.length && !audioCacheRef.current[nextIdx]) {
        const line = list[nextIdx];
        synthesizeEdgeTTSAudio(line.text, {
          speaker: line.speaker,
          role: line.role,
          gender: line.gender,
          emotion: line.emotion,
        }).then((url) => {
          if (url) {
            audioCacheRef.current[nextIdx] = url;
          }
        }).catch(() => {});
      }
    }
  };

  const playAmbientSound = async (ambience: string) => {
    try {
      await stopAmbientSound();
      const url = AMBIENT_LOOPS[ambience] || AMBIENT_LOOPS.peaceful;
      if (Platform.OS === 'web') {
        const audio = new globalThis.Audio(url);
        audio.volume = 0.15;
        audio.loop = true;
        (ambientSoundRef as any).current = audio;
        await audio.play().catch(() => {});
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, isLooping: true, volume: 0.15 }
        ).catch(() => ({ sound: null }));
        if (sound) {
          ambientSoundRef.current = sound;
        }
      }
    } catch (err) {
      // Silently catch ambient sound playback issues
    }
  };

  const stopAmbientSound = async () => {
    try {
      if (ambientSoundRef.current) {
        if (Platform.OS === 'web') {
          (ambientSoundRef.current as any).pause();
        } else {
          await ambientSoundRef.current.stopAsync();
          await ambientSoundRef.current.unloadAsync();
        }
        ambientSoundRef.current = null;
      }
    } catch (err) {
      console.log("Ambient sound stop error:", err);
    }
  };

  const speakLine = async (index: number) => {
    if (!currentDialogues || index >= currentDialogues.length) {
      updatePlayingState(false);
      setCurrentLineIndex(0);
      stopAmbientSound();
      return;
    }

    const line = currentDialogues[index];
    await stopSpeech();

    try {
      let mp3Url = audioCacheRef.current[index];
      if (!mp3Url) {
        setIsSynthesizingTTS(true);
        mp3Url = await synthesizeEdgeTTSAudio(line.text, {
          speaker: line.speaker,
          role: line.role,
          gender: line.gender,
          emotion: line.emotion,
        });
        audioCacheRef.current[index] = mp3Url;
        setIsSynthesizingTTS(false);
      } else {
        setIsSynthesizingTTS(false);
      }

      // Lancer la pré-synthèse des prochaines répliques en arrière-plan pendant que celle-ci est lue !
      prefetchNextLines(index);

      if (selectedStory && !ambientSoundRef.current) {
        await playAmbientSound(selectedStory.ambience);
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const audio = new window.Audio(mp3Url);
        webAudioRef.current = audio;
        audio.onended = () => {
          if (isPlayingRef.current) {
            if (index + 1 < currentDialogues.length) {
              const nextIdx = index + 1;
              setCurrentLineIndex(nextIdx);
              speakLine(nextIdx);
            } else {
              updatePlayingState(false);
              setCurrentLineIndex(0);
              stopAmbientSound();
            }
          }
        };
        audio.play().catch(err => {
          console.warn('[AudioChronology] Audio play failed:', err);
          updatePlayingState(false);
        });
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: mp3Url },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            if (isPlayingRef.current) {
              if (index + 1 < currentDialogues.length) {
                const nextIdx = index + 1;
                setCurrentLineIndex(nextIdx);
                speakLine(nextIdx);
              } else {
                updatePlayingState(false);
                setCurrentLineIndex(0);
                stopAmbientSound();
              }
            }
          }
        });
      }
    } catch (ttsErr) {
      console.error('[AudioChronology] Edge-TTS synthesis error:', ttsErr);
      setIsSynthesizingTTS(false);
      updatePlayingState(false);
    }
  };

  const handleTogglePlayPause = async () => {
    if (isPlayingRef.current) {
      await stopSpeech();
      await stopAmbientSound();
      updatePlayingState(false);
    } else {
      updatePlayingState(true);
      await speakLine(currentLineIndex);
    }
  };

  const handleSkipLine = async (direction: 'prev' | 'next') => {
    await stopSpeech();
    let nextIdx = direction === 'next' ? currentLineIndex + 1 : currentLineIndex - 1;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= currentDialogues.length) nextIdx = currentDialogues.length - 1;

    setCurrentLineIndex(nextIdx);
    if (isPlaying) {
      await speakLine(nextIdx);
    }
  };

  const generateBibleStory = async (queryText: string) => {
    if (!queryText.trim()) return;
    await stopSpeech();
    await stopAmbientSound();
    setIsPlaying(false);
    setCurrentLineIndex(0);
    setPhase('loading');
    audioCacheRef.current = {};

    try {
      const story = await generateStoryWithGemini({
        characterOrTopic: queryText.trim(),
        narrationMode: narrationMode,
      });

      setSelectedStory(story);
      setPhase('result');

      // Pré-synthétiser les 3 premières répliques immédiatement en arrière-plan
      const initialDialogues = (story && story.narrationModes && story.narrationModes[narrationMode]) || [];
      prefetchNextLines(0, initialDialogues);
    } catch (err: any) {
      console.error('[AudioChronology] Story generation failed:', err);
      setPhase('input');
    }
  };

  const handlePauseAndAskQuestion = async () => {
    if (isPlaying) {
      await stopSpeech();
      await stopAmbientSound();
      setIsPlaying(false);
    }
    setUserQuestion('');
    setAiQuestionAnswer(null);
    setShowQuestionModal(true);
  };

  const handleSendQuestionToAi = () => {
    if (!userQuestion.trim()) return;
    setIsAnsweringQuestion(true);

    setTimeout(() => {
      const currentDialogue = currentDialogues[currentLineIndex];
      let answer = `Dans le récit de ${selectedStory?.title}, au moment où ${currentDialogue?.speaker || 'le narrateur'} s'exprime, il convient d'analyser le contexte théologique : ${selectedStory?.historicalContext}. `;
      answer += `En réponse à votre question ("${userQuestion}"), l'Écriture nous enseigne la souveraineté et la fidélité de Dieu.`;
      setAiQuestionAnswer(answer);
      setIsAnsweringQuestion(false);
    }, 600);
  };

  const handleResumeAfterQuestion = async () => {
    setShowQuestionModal(false);
    setAiQuestionAnswer(null);
    setUserQuestion('');
    setIsPlaying(true);
    await speakLine(currentLineIndex);
  };

  const handleBackToInput = () => {
    stopSpeech();
    stopAmbientSound();
    if (phase !== 'input') {
      setPhase('input');
      setSelectedStory(null);
      setCurrentLineIndex(0);
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push('/features' as any);
      }
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header M3 Vert Sage */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <M3Pressable onPress={handleBackToInput} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
        </M3Pressable>
        <Text style={styles.headerTitle}>Contes de la Bible</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* ─── PHASE 1 : SAISIE CONVERSATIONNELLE ─── */}
      {phase === 'input' && (
        <Animated.View entering={FadeInLeft.duration(400)} exiting={FadeOutLeft.duration(300)} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.introTitle}>Raconte ton vécu : je te dirai quel héros de la Bible l'a affronté avant toi pour t'en inspirer.</Text>
              <Text style={styles.introSubtitle}>
                Exprime tes sentiments ou tes difficultés. Le conteur IA sélectionnera le récit biblique qui résonne avec ton parcours.
              </Text>

              {/* Carte de Saisie M3 surélevée */}
              <View style={[styles.inputCard, Shadows.card]}>
                <RNTextInput
                  placeholder="Ex: J'ai l'impression que rien ne me réussit et je me sens abandonné..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  value={inputText}
                  onChangeText={setInputText}
                  maxLength={600}
                  textAlignVertical="top"
                  style={styles.textInput}
                />
                <View style={styles.wordCounterContainer}>
                  <Text style={styles.wordCounter}>{inputText.length}/600</Text>
                </View>
              </View>

              {/* Suggestions Chips M3 */}
              <Text style={styles.suggestionTitle}>Suggestions rapides</Text>
              <View style={styles.suggestionsGrid}>
                {SUGGESTIONS.map((s) => (
                  <Chip
                    key={s.id}
                    mode="outlined"
                    onPress={() => {
                      setInputText(s.text);
                      generateBibleStory(s.text);
                    }}
                    style={styles.suggestionChip}
                    textStyle={styles.suggestionChipText}
                  >
                    {s.label}
                  </Chip>
                ))}
              </View>

              {/* Bouton de Validation unique */}
              <Button
                mode="contained"
                disabled={!inputText.trim()}
                onPress={() => generateBibleStory(inputText)}
                style={styles.submitBtn}
                contentStyle={styles.submitBtnContent}
                buttonColor={NAVY}
                textColor={Colors.white}
                icon="feather"
              >
                Lancer le Conte Biblique
              </Button>
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {/* ─── PHASE 2 : CHARGEMENT & COMPOSITION ─── */}
      {phase === 'loading' && (
        <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.loadingArea}>
          <M3LoadingCanvas />
        </Animated.View>
      )}

      {/* ─── PHASE 3 : LECTURE DU CONTE ─── */}
      {phase === 'result' && selectedStory && (
        <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutRight.duration(300)} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* JUSTIFICATION DE L'IA / PRÉLUDE CONVERSATIONNEL */}
            <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.preludeCard}>
              <View style={styles.preludeHeader}>
                <MaterialCommunityIcons name="robot" size={20} color={GREEN_DARK} />
                <Text style={styles.preludeTitle}>Le conseil du Conteur IA</Text>
              </View>
              <Text style={styles.preludeBody}>{selectedStory.aiReasoning}</Text>
            </Animated.View>

            {/* LECTEUR AUDIO SURÉLEVÉ M3 */}
            <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.playerCard}>
              <View style={styles.playerHeader}>
                <View style={styles.ambienceBadge}>
                  <MaterialCommunityIcons name="music-note" size={14} color={GOLD} />
                  <Text style={styles.ambienceText}>{selectedStory.ambienceLabel}</Text>
                </View>
                <View style={styles.modeBadge}>
                  <Text style={styles.modeBadgeText}>Livre Audio HD</Text>
                </View>
              </View>

              <Text style={styles.playerStoryTitle}>{selectedStory.title}</Text>
              <Text style={styles.playerStorySub}>{selectedStory.subtitle}</Text>

              {/* Waveform Réactive en Lecture */}
              <View style={styles.playingEqualizerRow}>
                <Animated.View style={[styles.playingEqualizerBar, pBar1Style]} />
                <Animated.View style={[styles.playingEqualizerBar, pBar2Style]} />
                <Animated.View style={[styles.playingEqualizerBar, pBar3Style]} />
                <Animated.View style={[styles.playingEqualizerBar, pBar4Style]} />
                <Animated.View style={[styles.playingEqualizerBar, pBar5Style]} />
                <Animated.View style={[styles.playingEqualizerBar, pBar3Style]} />
                <Animated.View style={[styles.playingEqualizerBar, pBar1Style]} />
              </View>

              {/* Sélecteur de Mode de Narration M3 */}
              <View style={styles.segmentedButtonsContainer}>
                <SegmentedButtons
                  value={narrationMode}
                  onValueChange={(val) => {
                    stopSpeech();
                    setNarrationMode(val as any);
                    setCurrentLineIndex(0);
                  }}
                  buttons={[
                    { value: 'faithful', label: 'Fidèle' },
                    { value: 'kids', label: 'Enfants' },
                    { value: 'dramatic', label: 'Cinéma' },
                  ]}
                  style={styles.segmentedButtons}
                />
              </View>

              {/* Suivi des répliques et barre de progression */}
              {currentDialogues.length > 0 && (
                <View style={styles.progressSection}>
                  <Text style={styles.progressText}>
                    Réplique {currentLineIndex + 1} sur {currentDialogues.length}
                  </Text>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${((currentLineIndex + 1) / currentDialogues.length) * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Contrôles de lecture */}
              <View style={styles.controlsRow}>
                <M3Pressable onPress={() => handleSkipLine('prev')} style={styles.skipBtn}>
                  <MaterialCommunityIcons name="skip-previous" size={26} color={NAVY} />
                </M3Pressable>

                <Animated.View style={[styles.playBtn, animatedPlayStyle]}>
                  <M3Pressable onPress={handleTogglePlayPause} style={styles.playBtn}>
                    <View style={styles.playBtnCircle}>
                      {isSynthesizingTTS ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <MaterialCommunityIcons name={isPlaying ? 'pause' : 'play'} size={32} color={Colors.white} />
                      )}
                    </View>
                  </M3Pressable>
                </Animated.View>

                <M3Pressable onPress={() => handleSkipLine('next')} style={styles.skipBtn}>
                  <MaterialCommunityIcons name="skip-next" size={26} color={NAVY} />
                </M3Pressable>
              </View>

              {/* Interruption vocale */}
              <M3Pressable onPress={handlePauseAndAskQuestion} style={styles.askAiBtn}>
                <MaterialCommunityIcons name="help-circle-outline" size={16} color={GOLD} />
                <Text style={styles.askAiBtnText}>Poser une question théologique sur ce passage</Text>
              </M3Pressable>
            </Animated.View>

            {/* DÉROULEMENT DES DIALOGUES */}
            <View style={styles.dialoguesContainer}>
              {currentDialogues.map((line, idx) => {
                const isActive = idx === currentLineIndex;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      setCurrentLineIndex(idx);
                      if (isPlaying) speakLine(idx);
                    }}
                    style={[styles.dialogueRow, isActive && styles.dialogueRowActive]}
                  >
                    <View style={styles.dialogueMeta}>
                      <Text style={styles.dialogueSpeaker}>{line.speaker}</Text>
                      {isActive && isPlaying && (
                        <MaterialCommunityIcons name="waveform" size={16} color={GREEN_DARK} />
                      )}
                    </View>
                    <Text style={[styles.dialogueText, isActive && styles.dialogueTextActive]}>{line.text}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* EXÉGÈSE ET ENSEIGNEMENTS M3 */}
            <View style={styles.exegesisContainer}>
              <View style={styles.exegesisTabs}>
                {(['lessons', 'references', 'context', 'interpretations'] as const).map((tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => setPostTab(tab)}
                    style={[styles.exegesisTabBtn, postTab === tab && styles.exegesisTabBtnActive]}
                  >
                    <Text style={[styles.exegesisTabBtnText, postTab === tab && styles.exegesisTabBtnTextActive]}>
                      {tab === 'lessons' ? 'Conseils' : tab === 'references' ? 'Références' : tab === 'context' ? 'Histoire' : 'Traditions'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.exegesisContent}>
                {postTab === 'lessons' && (
                  <View>
                    <Text style={styles.exegesisTitle}>Enseignements Pratiques</Text>
                    {selectedStory.practicalLessons.map((lesson, idx) => (
                      <View key={idx} style={styles.bulletRow}>
                        <MaterialCommunityIcons name="check-circle" size={16} color={GREEN_DARK} style={{ marginTop: 3 }} />
                        <Text style={styles.bulletText}>{lesson}</Text>
                      </View>
                    ))}
                    <View style={styles.prayerCard}>
                      <Text style={styles.prayerCardTitle}>Prière d'application</Text>
                      <Text style={styles.prayerCardText}>« {selectedStory.prayer} »</Text>
                    </View>
                  </View>
                )}

                {postTab === 'references' && (
                  <View>
                    <Text style={styles.exegesisTitle}>Passages Bibliques associés</Text>
                    {selectedStory.references.map((ref, idx) => (
                      <View key={idx} style={styles.bulletRow}>
                        <MaterialCommunityIcons name="book-open" size={16} color={GOLD} style={{ marginTop: 2 }} />
                        <Text style={styles.bulletText}>{ref}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {postTab === 'context' && (
                  <View>
                    <Text style={styles.exegesisTitle}>Contexte Historique et Géologique</Text>
                    <Text style={styles.bodyText}>{selectedStory.historicalContext}</Text>
                  </View>
                )}

                {postTab === 'interpretations' && (
                  <View>
                    <Text style={styles.exegesisTitle}>Regards selon les traditions chrétiennes</Text>
                    {selectedStory.interpretations.map((item, idx) => (
                      <View key={idx} style={styles.interpretationBox}>
                        <View style={styles.interpretationHeader}>
                          <MaterialCommunityIcons name="shield-cross" size={14} color={GREEN_DARK} />
                          <Text style={styles.interpretationTitle}>{item.tradition}</Text>
                        </View>
                        <Text style={styles.interpretationText}>{item.insight}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {/* MODALE INTERRUPTION / QUESTION */}
      <Modal visible={showQuestionModal} transparent animationType="slide" onRequestClose={() => setShowQuestionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="help-circle" size={24} color={GOLD} />
              <Text style={styles.modalTitle}>Posez votre question à l'IA</Text>
              <Pressable onPress={() => setShowQuestionModal(false)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={20} color={NAVY} />
              </Pressable>
            </View>

            <Text style={styles.modalSubText}>
              Le récit est en pause. Demandez une explication ou un éclairage théologique :
            </Text>

            <PaperTextInput
              mode="outlined"
              placeholder="Ex: Pourquoi l'Éternel a-t-il mis à l'épreuve Son serviteur ?"
              multiline
              numberOfLines={3}
              value={userQuestion}
              onChangeText={setUserQuestion}
              style={styles.modalInput}
              outlineColor="#EBE7DF"
              activeOutlineColor={GREEN_DARK}
            />

            {!aiQuestionAnswer && (
              <Button
                mode="contained"
                onPress={handleSendQuestionToAi}
                disabled={isAnsweringQuestion || !userQuestion.trim()}
                style={styles.modalSubmitBtn}
                buttonColor={NAVY}
                textColor={Colors.white}
              >
                {isAnsweringQuestion ? <ActivityIndicator color={Colors.white} size="small" /> : "Demander au Conteur IA"}
              </Button>
            )}

            {aiQuestionAnswer && (
              <View style={styles.aiAnswerCard}>
                <Text style={styles.aiAnswerTitle}>Réponse théologique :</Text>
                <Text style={styles.aiAnswerText}>{aiQuestionAnswer}</Text>
                <Button
                  mode="contained"
                  onPress={handleResumeAfterQuestion}
                  style={styles.modalResumeBtn}
                  buttonColor={GREEN_DARK}
                  textColor={Colors.white}
                  icon="play"
                >
                  Reprendre la narration
                </Button>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF9F5' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#5E7A60',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },

  // PHASE 1 : INPUT
  inputContainer: { flex: 1 },
  introTitle: { fontSize: 22, fontWeight: '800', color: NAVY, marginBottom: 8, lineHeight: 28 },
  introSubtitle: { fontSize: 13, color: Colors.grayWarm, lineHeight: 18, marginBottom: 20 },
  inputCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EBE7DF',
    height: 150,
    marginBottom: 24,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: NAVY,
    backgroundColor: 'transparent',
    padding: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  wordCounterContainer: {
    alignSelf: 'flex-end',
  },
  wordCounter: {
    fontSize: 10,
    color: Colors.grayWarm,
  },
  suggestionTitle: { fontSize: 14, fontWeight: '800', color: NAVY, marginBottom: 12 },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 30 },
  suggestionChip: { backgroundColor: Colors.white, borderColor: '#EBE7DF', borderRadius: 16 },
  suggestionChipText: { fontSize: 11, fontWeight: '600', color: GREEN_DARK },
  submitBtn: { borderRadius: 24, paddingVertical: 4 },
  submitBtnContent: { flexDirection: 'row-reverse' },
  submitBtnDisabled: { opacity: 0.5 },

  // PHASE 2 : LOADING
  loadingArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },

  // PHASE 3 : RESULT (LECTURE)
  preludeCard: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D8E6D9',
  },
  preludeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  preludeTitle: { fontSize: 14, fontWeight: '800', color: GREEN_DARK },
  preludeBody: { fontSize: 13, color: NAVY, lineHeight: 19 },

  playerCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#13294B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 24,
  },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ambienceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FAF8F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  ambienceText: { fontSize: 11, fontWeight: '700', color: GOLD },
  modeBadge: { backgroundColor: '#F0F5F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  modeBadgeText: { fontSize: 11, fontWeight: '800', color: GREEN_DARK },
  playerStoryTitle: { fontSize: 18, fontWeight: '800', color: NAVY, marginBottom: 4 },
  playerStorySub: { fontSize: 12, color: Colors.grayWarm, marginBottom: 16 },

  segmentedButtonsContainer: { marginBottom: 16 },
  segmentedButtons: { backgroundColor: '#FAF9F5' },

  progressSection: { marginBottom: 16 },
  progressText: { fontSize: 11, fontWeight: '700', color: Colors.grayWarm, marginBottom: 6 },
  progressBarBg: { height: 6, backgroundColor: '#F0F5F1', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, backgroundColor: GREEN_DARK, borderRadius: 3 },

  controlsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 16 },
  skipBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0F5F1', alignItems: 'center', justifyContent: 'center' },
  playBtn: { borderRadius: 28, overflow: 'hidden' },
  playBtnCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#5E7A60', alignItems: 'center', justifyContent: 'center' },

  askAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: '#F0E6D2',
    borderRadius: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  askAiBtnText: { fontSize: 11, fontWeight: '800', color: NAVY },

  // WAVEFORM REACTIVE
  playingEqualizerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    marginVertical: 16,
  },
  playingEqualizerBar: {
    width: 6,
    backgroundColor: GOLD,
    borderRadius: 3,
  },

  // DIALOGUES
  dialoguesContainer: { marginBottom: 24 },
  dialogueRow: { padding: 14, borderRadius: 16, backgroundColor: Colors.white, marginBottom: 10, borderWidth: 1, borderColor: '#FAF8F5' },
  dialogueRowActive: { borderColor: GREEN_DARK, backgroundColor: '#F0F5F1' },
  dialogueMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dialogueSpeaker: { fontSize: 11, fontWeight: '800', color: GREEN_DARK },
  dialogueText: { fontSize: 13, color: NAVY, lineHeight: 18 },
  dialogueTextActive: { fontWeight: '700' },

  // EXEGESIS
  exegesisContainer: { backgroundColor: Colors.white, borderRadius: 24, padding: 18 },
  exegesisTabs: { flexDirection: 'row', backgroundColor: '#F0F5F1', borderRadius: 12, padding: 3, gap: 4, marginBottom: 16 },
  exegesisTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  exegesisTabBtnActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  exegesisTabBtnText: { fontSize: 11, fontWeight: '700', color: Colors.grayWarm },
  exegesisTabBtnTextActive: { color: NAVY },

  exegesisContent: { paddingHorizontal: 4 },
  exegesisTitle: { fontSize: 14, fontWeight: '800', color: NAVY, marginBottom: 12 },
  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  bulletText: { flex: 1, fontSize: 12, color: NAVY, lineHeight: 18 },
  bodyText: { fontSize: 12, color: NAVY, lineHeight: 19 },

  prayerCard: { backgroundColor: '#FFFDF5', borderRadius: 16, padding: 16, marginTop: 14, borderWidth: 1, borderColor: GOLD_LIGHT },
  prayerCardTitle: { fontSize: 12, fontWeight: '800', color: GOLD, marginBottom: 6 },
  prayerCardText: { fontSize: 12, fontStyle: 'italic', color: NAVY, lineHeight: 18 },

  interpretationBox: { backgroundColor: '#F8FAF8', borderRadius: 12, padding: 12, marginBottom: 10 },
  interpretationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  interpretationTitle: { fontSize: 11, fontWeight: '800', color: GREEN_DARK },
  interpretationText: { fontSize: 12, color: NAVY, lineHeight: 18 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: Colors.white, borderRadius: 24, padding: 22 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: NAVY },
  modalCloseBtn: { padding: 4 },
  modalSubText: { fontSize: 12, color: Colors.grayWarm, marginBottom: 14, lineHeight: 18 },
  modalInput: { marginBottom: 16 },
  modalSubmitBtn: { borderRadius: 20 },
  aiAnswerCard: { backgroundColor: '#FFFDF5', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: GOLD_LIGHT },
  aiAnswerTitle: { fontSize: 12, fontWeight: '800', color: GOLD, marginBottom: 6 },
  aiAnswerText: { fontSize: 12, color: NAVY, lineHeight: 18, marginBottom: 14 },
  modalResumeBtn: { borderRadius: 20 },

  // LOADER FLUID BOX STYLES
  m3LoadingCanvas: { marginHorizontal: 16, marginTop: 20, alignItems: 'center' },
  m3ElevatedLoadingCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    shadowColor: '#13294B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  fluidPuddleContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    position: 'relative',
  },
  fluidLayerOuter: {
    position: 'absolute',
    width: 86,
    height: 86,
    backgroundColor: 'rgba(212, 168, 90, 0.25)',
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  fluidLayerInner: {
    position: 'absolute',
    width: 70,
    height: 70,
    backgroundColor: 'rgba(110, 148, 118, 0.35)',
    borderWidth: 1.5,
    borderColor: GREEN_DARK,
  },
  fluidCoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GOLD_LIGHT,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  m3LoadingTitle: { fontSize: 16, fontWeight: '800', color: NAVY, textAlign: 'center', marginBottom: 6 },
  m3LoadingSubtitle: { fontSize: 12, color: Colors.grayWarm, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  m3ProgressStepsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  m3StepDotActive: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN_DARK },
  m3StepLineActive: { width: 30, height: 3, backgroundColor: GREEN_DARK, borderRadius: 2 },
  m3EqualizerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 40 },
  m3EqualizerBar: { width: 6, backgroundColor: GOLD, borderRadius: 3 },
});
