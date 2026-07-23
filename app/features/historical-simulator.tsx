import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
  Dimensions,
  KeyboardAvoidingView,
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
import { supabase } from '@/lib/supabase';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STORIES = [
  {
    id: 'red-sea',
    title: 'La Traversée de la Mer Rouge',
    description: 'Le peuple est piégé face aux eaux déchaînées. Moïse s\'avance...',
    icon: 'waves',
    color: '#3182CE',
    bgColor: '#EBF8FF',
  },
  {
    id: 'david-goliath',
    title: 'David contre Goliath',
    description: 'Le géant philistin défie l\'armée. Un jeune berger s\'avance...',
    icon: 'sword',
    color: '#DD6B20',
    bgColor: '#FFFAF0',
  },
  {
    id: 'noah-ark',
    title: 'L\'Arche de Noé',
    description: 'Le grand déluge commence. Aidez la famille de Noé à tout préparer.',
    icon: 'sail-boat',
    color: '#38A169',
    bgColor: '#F0FDF4',
  },
  {
    id: 'daniel-lions',
    title: 'La Fosse aux Lions',
    description: 'Daniel est jeté aux lions affamés. Devenez le témoin de sa foi.',
    icon: 'paw',
    color: '#805AD5',
    bgColor: '#FAF5FF',
  },
];

export default function HistoricalSimulatorScreen() {
  const router = useRouter();

  // Simulation State
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [phase, setPhase] = useState<'selection' | 'loading' | 'game' | 'error'>('selection');
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  
  const [narrative, setNarrative] = useState<string>('');
  const [choices, setChoices] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  
  const [customAction, setCustomAction] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const soundRef = useRef<any>(null);
  const bgSoundRef = useRef<any>(null);
  const bgTimeoutRef = useRef<any>(null);

  // Animations
  const skeletonPulse = useSharedValue(0.4);
  const zoomValue = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);

  // Loading skeleton pulse
  useEffect(() => {
    if (phase === 'loading' || isSubmitting) {
      skeletonPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.ease }),
          withTiming(0.4, { duration: 800, easing: Easing.ease })
        ),
        -1,
        true
      );
    }
  }, [phase, isSubmitting]);

  // Cinematic Ken Burns effect (Slow panning/zooming)
  useEffect(() => {
    if (phase === 'game' && currentImage) {
      // Reset values
      zoomValue.value = 1.0;
      panX.value = 0;
      panY.value = 0;

      // Start looping animation
      zoomValue.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 15000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 15000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      panX.value = withRepeat(
        withSequence(
          withTiming(12, { duration: 12000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-12, { duration: 12000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      panY.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
          withTiming(8, { duration: 10000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [phase, currentImage]);

  // Cleanup audio
  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, []);

  const stopVoice = () => {
    if (bgTimeoutRef.current) {
      clearTimeout(bgTimeoutRef.current);
      bgTimeoutRef.current = null;
    }
    if (soundRef.current) {
      if (Platform.OS === 'web') {
        soundRef.current.pause?.();
      } else {
        soundRef.current.unloadAsync?.().catch(() => {});
      }
      soundRef.current = null;
    }
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

      const wavBase64 = pcmToWav(base64Data);

      // Play narration voice
      if (Platform.OS === 'web') {
        const audio = new globalThis.Audio(`data:audio/wav;base64,${wavBase64}`);
        soundRef.current = audio;
        audio.onended = () => {
          stopVoice();
        };
        await audio.play();
      } else {
        const tempUri = `${(FileSystem as any).cacheDirectory || ''}/narrator_voice.wav`;
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

      // Play ambient background music after 3 seconds
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
            bgAudio.volume = 0.05; // Extremely soft background pad
            bgSoundRef.current = bgAudio;
            await bgAudio.play();
          } else {
            const { sound: bgSound } = await Audio.Sound.createAsync(
              bgMusicAsset,
              { shouldPlay: true, isLooping: true, volume: 0.05 }
            );
            bgSoundRef.current = bgSound;
          }
        } catch (bgErr) {
          console.warn("Background music failure:", bgErr);
        }
      }, 3000);

    } catch (err) {
      console.warn("Playback failed:", err);
      stopVoice();
    }
  };

  const handleStartSimulation = async (storyId: string) => {
    setSelectedStory(storyId);
    setPhase('loading');
    setErrorMessage(null);
    setHistory([]);
    setCurrentImage(null);
    setCurrentAudio(null);

    try {
      const { data, error } = await supabase.functions.invoke('simulate-history', {
        body: { storyId, history: [], selectedChoice: "Début de la simulation" }
      });

      if (error || !data) {
        throw new Error(error?.message || "Impossible de démarrer la simulation.");
      }

      setNarrative(data.narrative);
      setChoices(data.choices);
      setCurrentImage(data.image);
      setCurrentAudio(data.audio);
      if (data.imageError) {
        console.warn("Hugging Face Image Error:", data.imageError);
      }
      
      // Add first turn to history
      setHistory([
        { role: 'user', content: "Début de la simulation" },
        { role: 'assistant', content: JSON.stringify({ narrative: data.narrative, choices: data.choices }) }
      ]);
      setPhase('game');

      // Auto play narration if audio is returned
      if (data.audio) {
        playWavAudio(data.audio);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Impossible de charger le récit.");
      setPhase('error');
    }
  };

  const handleAction = async (actionText: string) => {
    if (isSubmitting || !selectedStory) return;
    stopVoice();
    setIsSubmitting(true);
    setErrorMessage(null);
    setCustomAction('');

    const newHistory = [...history];

    try {
      const { data, error } = await supabase.functions.invoke('simulate-history', {
        body: { 
          storyId: selectedStory, 
          history: newHistory, 
          selectedChoice: actionText 
        }
      });

      if (error || !data) {
        throw new Error(error?.message || "Erreur de chargement du choix.");
      }

      setNarrative(data.narrative);
      setChoices(data.choices);
      if (data.image) {
        setCurrentImage(data.image);
      }
      setCurrentAudio(data.audio);
      if (data.imageError) {
        console.warn("Hugging Face Image Error:", data.imageError);
      }

      // Append turns
      setHistory([
        ...newHistory,
        { role: 'user', content: actionText },
        { role: 'assistant', content: JSON.stringify({ narrative: data.narrative, choices: data.choices }) }
      ]);
      
      setIsSubmitting(false);

      if (data.audio) {
        playWavAudio(data.audio);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erreur lors de la soumission de l'action.");
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    stopVoice();
    if (phase === 'game' || phase === 'error' || phase === 'loading') {
      setPhase('selection');
      setSelectedStory(null);
      setNarrative('');
      setChoices([]);
      setCurrentImage(null);
      setCurrentAudio(null);
      setHistory([]);
    } else {
      router.back();
    }
  };

  // Reanimated style for Ken Burns effect
  const animatedCinematicImage = useAnimatedStyle(() => ({
    transform: [
      { scale: zoomValue.value },
      { translateX: panX.value },
      { translateY: panY.value },
    ],
  }));

  const animatedSkeleton = useAnimatedStyle(() => ({
    opacity: skeletonPulse.value,
  }));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A202C" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {phase === 'game' && selectedStory
            ? STORIES.find(s => s.id === selectedStory)?.title
            : 'Simulateur Historique'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* PHASE 1: STORY SELECTION */}
      {phase === 'selection' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.introCard}>
            <Text style={styles.introText}>
              Incarnez un témoin oculaire des plus grands miracles et événements de l'histoire biblique. Écoutez le récit, contemplez la scène et décidez de vos actions.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Choisissez votre récit</Text>

          {STORIES.map(story => (
            <Pressable
              key={story.id}
              onPress={() => handleStartSimulation(story.id)}
              style={({ pressed }) => [
                styles.storyCard,
                pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: story.bgColor }]}>
                <MaterialCommunityIcons name={story.icon as any} size={28} color={story.color} />
              </View>
              <View style={styles.storyDetails}>
                <Text style={styles.storyTitle}>{story.title}</Text>
                <Text style={styles.storyDesc}>{story.description}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#A0AEC0" />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* PHASE 2: LOADING */}
      {phase === 'loading' && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#D69E2E" />
          <Text style={styles.loadingText}>Immersion temporelle en cours...</Text>
          <Text style={styles.loadingSub}>Nous générons l'atmosphère, les visuels et la voix du récit.</Text>
        </View>
      )}

      {/* PHASE 3: GAMEPLAY */}
      {phase === 'game' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.gameScrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Cinematic visual card */}
            <View style={styles.visualContainer}>
              {currentImage ? (
                <Animated.Image
                  source={{ uri: `data:image/jpeg;base64,${currentImage}` }}
                  style={[styles.cinematicImage, animatedCinematicImage]}
                  resizeMode="cover"
                />
              ) : (
                <Animated.View style={[styles.skeletonImage, animatedSkeleton]} />
              )}
              
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.imageOverlay}
              >
                <View style={styles.overlayBottomRow}>
                  <Text style={styles.overlayTag}>TÉMOIN DE LA SCÈNE</Text>
                  {currentAudio ? (
                    <Pressable
                      onPress={() => playWavAudio(currentAudio)}
                      style={styles.soundButton}
                    >
                      <MaterialCommunityIcons
                        name={isSpeaking ? 'volume-high' : 'volume-off'}
                        size={24}
                        color="#FFFFFF"
                      />
                    </Pressable>
                  ) : null}
                </View>
              </LinearGradient>
            </View>

            {/* Narrative Box */}
            <Animated.View entering={FadeIn.duration(400)} style={styles.narrativeCard}>
              {isSubmitting ? (
                <View style={styles.loadingNarrative}>
                  <ActivityIndicator size="small" color="#D69E2E" />
                  <Text style={styles.submittingText}>La suite de votre choix s'écrit...</Text>
                </View>
              ) : (
                <Text style={styles.narrativeText}>{narrative}</Text>
              )}
            </Animated.View>

            {/* Choices */}
            {!isSubmitting && (
              <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.choicesContainer}>
                <Text style={styles.actionPromptTitle}>Que décidez-vous de faire ?</Text>
                
                {choices.map((choice, index) => (
                  <Pressable
                    key={index}
                    onPress={() => handleAction(choice)}
                    style={({ pressed }) => [
                      styles.choiceBtn,
                      pressed && { opacity: 0.9, backgroundColor: '#FAF9F6' }
                    ]}
                  >
                    <Text style={styles.choiceBtnIndex}>{index + 1}</Text>
                    <Text style={styles.choiceBtnText}>{choice}</Text>
                  </Pressable>
                ))}

                {/* Custom Action Field */}
                <View style={styles.customActionRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="Écrivez votre propre action libre..."
                    placeholderTextColor="#A0AEC0"
                    value={customAction}
                    onChangeText={setCustomAction}
                    onSubmitEditing={() => customAction.trim() && handleAction(customAction)}
                  />
                  <Pressable
                    onPress={() => customAction.trim() && handleAction(customAction)}
                    style={[
                      styles.sendActionBtn,
                      !customAction.trim() && { opacity: 0.5 }
                    ]}
                    disabled={!customAction.trim()}
                  >
                    <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
              </Animated.View>
            )}

            {errorMessage && (
              <View style={styles.errorCard}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#C53030" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* PHASE 4: ERROR STATE */}
      {phase === 'error' && (() => {
        const isQuotaError = errorMessage?.includes('24h') || errorMessage?.includes('Quota');
        return (
          <View style={styles.centerContainer}>
            {isQuotaError ? (
              <MaterialCommunityIcons name="clock-outline" size={56} color="#D69E2E" />
            ) : (
              <MaterialCommunityIcons name="alert-circle-outline" size={56} color="#C53030" />
            )}
            <Text style={styles.errorTitle}>
              {isQuotaError ? "Quota Limite Atteint" : "Une erreur est survenue"}
            </Text>
            <Text style={styles.errorSub}>
              {errorMessage || "Veuillez vérifier votre connexion."}
            </Text>
            <Pressable onPress={handleBack} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retour aux récits</Text>
            </Pressable>
          </View>
        );
      })()}
    </View>
  );
}

// Convert Raw PCM Base64 to WAV wrapper helper
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6', // Ivory background
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
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.02)',
    ...Shadows.card,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4A5568',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 16,
  },
  storyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.02)',
    ...Shadows.card,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  storyDetails: {
    flex: 1,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  storyDesc: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSub: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 18,
  },
  gameScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  visualContainer: {
    width: '100%',
    height: SCREEN_WIDTH * 0.58, // Cinematic Aspect Ratio (approx 16:10)
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginBottom: 20,
    ...Shadows.card,
  },
  cinematicImage: {
    width: '100%',
    height: '100%',
  },
  skeletonImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2D3748',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    letterSpacing: 1.0,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  overlayBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  overlayTag: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D69E2E',
    letterSpacing: 1.2,
  },
  soundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  narrativeCard: {
    backgroundColor: '#FFFDF0', // Gold-Ivoire light
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(214, 158, 46, 0.12)',
    marginBottom: 20,
    ...Shadows.card,
  },
  narrativeText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#2D3748',
    fontStyle: 'italic',
  },
  loadingNarrative: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  submittingText: {
    fontSize: 14,
    color: '#718096',
  },
  choicesContainer: {
    gap: 12,
  },
  actionPromptTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 4,
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.02)',
    ...Shadows.card,
  },
  choiceBtnIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 26,
    marginRight: 12,
  },
  choiceBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  customActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    color: '#2D3748',
    ...Shadows.card,
  },
  sendActionBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A202C',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
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
    marginTop: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#C53030',
    flex: 1,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: '#1A202C',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 28,
    ...Shadows.card,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
