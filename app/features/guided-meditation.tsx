import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getChapter } from '@/lib/bible';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MOODS = [
  { id: 'm1', label: "Inquiétude face à l'avenir", icon: 'clock-outline', prompt: "Je ressens de l'inquiétude ou du stress face à mon avenir." },
  { id: 'm2', label: "Besoin de guérison intérieure", icon: 'heart-broken', prompt: "Je porte des blessures intérieures ou de la tristesse et j'ai besoin de guérison." },
  { id: 'm3', label: "Recherche de la paix", icon: 'weather-dust', prompt: "Je traverse une tempête dans ma vie et je recherche la paix de Dieu." },
  { id: 'm4', label: "Besoin de direction / Choix", icon: 'compass-outline', prompt: "Je suis à un tournant de ma vie et je dois faire des choix importants." },
  { id: 'm5', label: "Tristesse / Solitude", icon: 'emoticon-sad-outline', prompt: "Je me sens seul ou abattu et j'ai besoin de réconfort." },
  { id: 'm6', label: "Reconnaissance / Action de grâce", icon: 'hands-pray', prompt: "Je veux rendre grâce à Dieu et méditer sur Sa bonté." },
];

export default function GuidedMeditationScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Form State
  const [phase, setPhase] = useState<'mood' | 'details' | 'loading' | 'result'>('mood');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  
  // API Result State
  const [resultData, setResultData] = useState<{
    book: string;
    chapter: number;
    keyVerses: number[];
    meditation: string;
    audio?: string | null;
  } | null>(null);
  
  const [chapterVerses, setChapterVerses] = useState<{ number: number; text: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Playback State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const soundRef = useRef<any>(null);
  const bgSoundRef = useRef<any>(null);
  const bgTimeoutRef = useRef<any>(null);

  // Animations
  const skeletonPulse = useSharedValue(0.4);
  const glowValue = useSharedValue(0);

  useEffect(() => {
    if (phase === 'loading') {
      skeletonPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.ease }),
          withTiming(0.4, { duration: 800, easing: Easing.ease })
        ),
        -1,
        true
      );
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'result') {
      glowValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [phase]);

  const animatedSkeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonPulse.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowValue.value * 0.3 + 0.1,
    transform: [{ scale: glowValue.value * 0.02 + 0.99 }],
  }));

  // Audio pulsing animation
  const audioPulse = useSharedValue(1);

  useEffect(() => {
    if (isSpeaking) {
      audioPulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      audioPulse.value = withTiming(1, { duration: 300 });
    }
  }, [isSpeaking]);

  const animatedAudioPulse = useAnimatedStyle(() => ({
    transform: [{ scale: audioPulse.value }],
  }));

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, []);

  const stopVoice = () => {
    // Clear background music delay timer
    if (bgTimeoutRef.current) {
      clearTimeout(bgTimeoutRef.current);
      bgTimeoutRef.current = null;
    }

    // Stop and release TTS voice
    if (soundRef.current) {
      if (Platform.OS === 'web') {
        soundRef.current.pause?.();
      } else {
        soundRef.current.unloadAsync?.().catch(() => {});
      }
      soundRef.current = null;
    }

    // Stop and release background music
    if (bgSoundRef.current) {
      if (Platform.OS === 'web') {
        bgSoundRef.current.pause?.();
      } else {
        bgSoundRef.current.unloadAsync?.().catch(() => {});
      }
      bgSoundRef.current = null;
    }

    setIsSpeaking(false);
  };

  const playWavAudio = async (base64Data: string) => {
    try {
      if (isSpeaking) {
        stopVoice();
        return;
      }
      setIsSpeaking(true);

      // Convert raw L16 PCM to standard WAV format
      const wavBase64 = pcmToWav(base64Data);

      // 1. Play TTS Voice immediately
      if (Platform.OS === 'web') {
        const audio = new globalThis.Audio(`data:audio/wav;base64,${wavBase64}`);
        soundRef.current = audio;
        audio.onended = () => {
          stopVoice();
        };
        await audio.play();
      } else {
        const tempUri = `${(FileSystem as any).cacheDirectory || ''}/meditation_voice.wav`;
        await FileSystem.writeAsStringAsync(tempUri, wavBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: tempUri },
          { shouldPlay: true }
        );
        soundRef.current = sound;

        sound.setOnPlaybackStatusUpdate((playbackStatus) => {
          if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
            stopVoice();
          }
        });
      }

      // 2. Play Background Music at 03s (3000ms delay)
      bgTimeoutRef.current = setTimeout(async () => {
        try {
          const bgMusicAsset = require('@/assets/audio/meditation_bg.mp3');
          if (Platform.OS === 'web') {
            let src = bgMusicAsset;
            if (typeof bgMusicAsset === 'object' && bgMusicAsset !== null) {
              src = bgMusicAsset.uri || bgMusicAsset.default || bgMusicAsset;
            }
            const bgAudio = new globalThis.Audio(src);
            bgAudio.loop = true;
            bgAudio.volume = 0.06; // Ambient background volume
            bgSoundRef.current = bgAudio;
            await bgAudio.play();
          } else {
            const { sound: bgSound } = await Audio.Sound.createAsync(
              bgMusicAsset,
              { shouldPlay: true, isLooping: true, volume: 0.06 }
            );
            bgSoundRef.current = bgSound;
          }
        } catch (bgErr) {
          console.warn("Background music failed to play:", bgErr);
        }
      }, 3000);
    } catch (err) {
      console.warn("WAV Playback failed:", err);
      setIsSpeaking(false);
    }
  };

  const handleMoodSelect = (moodId: string) => {
    setSelectedMood(moodId);
    setPhase('details');
  };

  const handleBack = () => {
    if (phase === 'details') {
      setPhase('mood');
    } else if (phase === 'result') {
      stopVoice();
      setPhase('mood');
      setSelectedMood(null);
      setInputText('');
      setResultData(null);
      setChapterVerses([]);
      setErrorMessage(null);
    } else {
      router.back();
    }
  };

  const startMeditationAnalysis = async () => {
    if (!selectedMood) return;
    setPhase('loading');
    setErrorMessage(null);

    const moodObj = MOODS.find(m => m.id === selectedMood);
    const answers = [
      { question: "Quelle est votre préoccupation principale ?", answer: moodObj?.prompt || "" },
      { question: "Détails sur ce que vous traversez", answer: inputText || "Pas de précisions écrites." }
    ];

    try {
      // Call Supabase Edge function
      const { data, error } = await supabase.functions.invoke('guided-meditation', {
        body: { answers }
      });

      if (error || !data) {
        throw new Error(error?.message || "Une erreur inconnue s'est produite lors de l'analyse.");
      }

      // Load local Bible chapter
      let localChapter;
      try {
        localChapter = getChapter(data.book, data.chapter);
      } catch (bibleErr: any) {
        console.error("Local Bible Chapter fetch failed:", bibleErr);
        throw new Error(`Le modèle a suggéré "${data.book} ${data.chapter}", mais ce texte n'a pas pu être localisé dans la base locale.`);
      }

      setResultData(data);
      setChapterVerses(localChapter.verses);
      setPhase('result');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Impossible de charger la méditation.");
      setPhase('mood');
    }
  };

  // ──── SCREEN RENDERERS ────

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable onPress={handleBack} style={styles.backBtn}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#2D3748" />
      </Pressable>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Méditation Guidée</Text>
        <Text style={styles.headerSubtitle}>
          {phase === 'mood' && "Sélectionnez votre état intérieur"}
          {phase === 'details' && "Partagez votre cœur"}
          {phase === 'loading' && "Écoute de l'Esprit..."}
          {phase === 'result' && "Votre temps de méditation"}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {renderHeader()}

      {/* PHASE 1: CHOOSE MOOD */}
      {phase === 'mood' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.introCard}>
            <Text style={styles.introText}>
              Dieu entend vos soupirs les plus profonds. Prenez un moment de calme pour répondre à ces quelques questions, et laissez-Le vous guider vers la vérité dont votre âme a besoin aujourd'hui.
            </Text>
          </Animated.View>

          {errorMessage && (
            <View style={styles.errorCard}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#E53E3E" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>Que traversez-vous aujourd'hui ?</Text>
          <View style={styles.moodGrid}>
            {MOODS.map((mood, idx) => (
              <Animated.View key={mood.id} entering={FadeInDown.delay(idx * 80).duration(400)}>
                <Pressable
                  onPress={() => handleMoodSelect(mood.id)}
                  style={styles.moodChip}
                >
                  <View style={styles.moodIconBg}>
                    <MaterialCommunityIcons name={mood.icon as any} size={24} color="#6366F1" />
                  </View>
                  <Text style={styles.moodChipLabel}>{mood.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#A0AEC0" />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* PHASE 2: WRITE DETAILS */}
      {phase === 'details' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={styles.detailsCard}>
              <Text style={styles.questionText}>
                Pouvez-vous préciser ce que vous traversez ou ce qui pèse sur votre cœur ?
              </Text>
              <Text style={styles.questionSub}>
                Écrivez en toute liberté. C'est un espace intime entre vous et Dieu.
              </Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={6}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Exprimez-vous ici..."
                placeholderTextColor="#A0AEC0"
              />

              <Pressable
                onPress={startMeditationAnalysis}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && { opacity: 0.9 }
                ]}
              >
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={styles.submitBtnGradient}
                >
                  <Text style={styles.submitBtnText}>Commencer la méditation</Text>
                  <MaterialCommunityIcons name="book-open-variant" size={20} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      )}

      {/* PHASE 3: LOADING SKELETON */}
      {phase === 'loading' && (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color="#6366F1" style={{ marginBottom: 24 }} />
          <Text style={styles.loadingTitle}>Dieu prépare Sa réponse...</Text>
          <Text style={styles.loadingSub}>
            Nous analysons votre état intérieur avec le modèle GLM-5.2 pour chercher la Parole divine la plus adaptée à vos besoins.
          </Text>

          <View style={styles.skeletonsContainer}>
            <Animated.View style={[styles.skeletonCard, animatedSkeletonStyle, { width: '80%' }]} />
            <Animated.View style={[styles.skeletonCard, animatedSkeletonStyle, { width: '90%' }]} />
            <Animated.View style={[styles.skeletonCard, animatedSkeletonStyle, { width: '70%' }]} />
            <Animated.View style={[styles.skeletonCard, animatedSkeletonStyle, { width: '85%' }]} />
          </View>
        </View>
      )}

      {/* PHASE 4: RESULT */}
      {phase === 'result' && resultData && (
        <ScrollView contentContainerStyle={styles.resultScrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.chapterHeader}>
            <MaterialCommunityIcons name="book-open-outline" size={32} color="#D69E2E" />
            <Text style={styles.chapterTitle}>{resultData.book} {resultData.chapter}</Text>
            <Text style={styles.chapterSubtitle}>Méditez sur la Parole et lisez les versets surlignés</Text>
          </Animated.View>

          {/* Chapter Verses List */}
          <View style={styles.versesCard}>
            {chapterVerses.map(v => {
              const isHighlighted = resultData.keyVerses.includes(v.number);
              return (
                <Animated.View
                  key={v.number}
                  style={[
                    styles.verseRow,
                    isHighlighted && styles.highlightedVerseRow,
                    isHighlighted && animatedGlowStyle,
                  ]}
                >
                  <Text style={[styles.verseNumber, isHighlighted && styles.highlightedVerseNumber]}>
                    {v.number}
                  </Text>
                  <Text style={[styles.verseTextContent, isHighlighted && styles.highlightedVerseText]}>
                    {v.text}
                  </Text>
                </Animated.View>
              );
            })}
          </View>

          {/* AI Meditation Commentary */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.meditationCard}>
            <LinearGradient
              colors={['#FFFDF0', '#FFFBEB']}
              style={styles.meditationGradient}
            >
              <View style={styles.meditationHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <MaterialCommunityIcons name="message-text-outline" size={22} color="#D69E2E" />
                  <Text style={styles.meditationTitle}>Écoute Sa voix</Text>
                </View>
                {resultData.audio && (
                  <Pressable 
                    onPress={() => playWavAudio(resultData.audio!)} 
                    style={styles.playAudioBtn}
                  >
                    <Animated.View style={isSpeaking && animatedAudioPulse}>
                      <MaterialCommunityIcons 
                        name={isSpeaking ? "stop-circle" : "play-circle"} 
                        size={28} 
                        color="#D69E2E" 
                      />
                    </Animated.View>
                  </Pressable>
                )}
              </View>
              <Text style={styles.meditationText}>{resultData.meditation}</Text>
            </LinearGradient>
          </Animated.View>

          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.finishBtn,
              pressed && { opacity: 0.9 }
            ]}
          >
            <Text style={styles.finishBtnText}>Terminer la méditation</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6', // Off-White / Ivoire léger
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
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
    marginBottom: 24,
    ...Shadows.card,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4A5568',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16,
    paddingLeft: 4,
  },
  moodGrid: {
    gap: 12,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    ...Shadows.card,
  },
  moodIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  moodChipLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    ...Shadows.card,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.02)',
  },
  questionText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A202C',
    lineHeight: 24,
    marginBottom: 8,
  },
  questionSub: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#2D3748',
    minHeight: 140,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    marginBottom: 24,
  },
  submitBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.card,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  loadingSub: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 40,
  },
  skeletonsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  skeletonCard: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E2E8F0',
  },
  resultScrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  chapterHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  chapterTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
    marginTop: 8,
    marginBottom: 4,
  },
  chapterSubtitle: {
    fontSize: 13,
    color: '#718096',
  },
  versesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.02)',
    ...Shadows.card,
    marginBottom: 24,
  },
  verseRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  highlightedVerseRow: {
    backgroundColor: '#FFFDF0', // Gold/Ivoire léger
    borderLeftWidth: 4,
    borderLeftColor: '#D69E2E',
    shadowColor: '#D69E2E',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  verseNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#A0AEC0',
    width: 24,
    marginRight: 8,
    textAlign: 'right',
    marginTop: 2,
  },
  highlightedVerseNumber: {
    color: '#D69E2E',
  },
  verseTextContent: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#4A5568',
  },
  highlightedVerseText: {
    color: '#2D3748',
    fontWeight: '600',
  },
  meditationCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214, 158, 46, 0.15)',
    ...Shadows.card,
    marginBottom: 24,
  },
  meditationGradient: {
    padding: 24,
  },
  meditationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  meditationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D69E2E',
  },
  meditationText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4A5568',
    fontStyle: 'italic',
  },
  playAudioBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  finishBtn: {
    backgroundColor: '#1A202C',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  finishBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#C53030',
    flex: 1,
  },
});

function pcmToWav(base64Pcm: string, sampleRate = 24000): string {
  if (base64Pcm.startsWith("UklGR") || base64Pcm.startsWith("SUQz") || base64Pcm.startsWith("ZkxhQ")) {
    return base64Pcm;
  }
  const binaryString = globalThis.atob(base64Pcm);
  const len = binaryString.length;
  const pcmBytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    pcmBytes[i] = binaryString.charCodeAt(i);
  }

  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + len, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, len, true);

  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmBytes, 44);

  let binaryWav = '';
  const chunk = 8192;
  for (let i = 0; i < wavBytes.length; i += chunk) {
    binaryWav += String.fromCharCode.apply(null, wavBytes.subarray(i, i + chunk) as any);
  }
  return globalThis.btoa(binaryWav);
}
