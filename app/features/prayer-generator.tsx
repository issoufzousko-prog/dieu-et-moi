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
} from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  FadeOut,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Colors, Shadows } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

import { GeminiModelfile } from '@/GeminiModelfile';

const SUGGESTIONS = [
  { id: 's1', label: 'Anxiété & Paix', text: "Je ressens de l'anxiété face à l'avenir et j'ai besoin de retrouver la paix intérieure" },
  { id: 's2', label: 'Reconnaissance', text: "Je souhaite exprimer ma profonde gratitude pour la santé et le bonheur de ma famille" },
  { id: 's3', label: 'Maladie & Guérison', text: "Je traverse une période de maladie et je prie pour la guérison et le courage" },
  { id: 's4', label: 'Famille & Foyer', text: "Je prie pour l'unité, la sagesse et l'amour au sein de mon foyer" },
];

export default function PrayerGeneratorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Phases : 'input' | 'loading' | 'result'
  const [phase, setPhase] = useState<'input' | 'loading' | 'result'>('input');
  const [inputText, setInputText] = useState('');
  const [generatedPrayer, setGeneratedPrayer] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [cachedWavAudio, setCachedWavAudio] = useState<string | null>(null);

  // Audio refs
  const soundRef = useRef<any>(null);

  // Shared values pour les animations M3
  const loaderRotation = useSharedValue(0);
  const skeletonPulse = useSharedValue(0.4);
  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.6);

  // Démarrer les animations de chargement M3
  useEffect(() => {
    if (phase === 'loading') {
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

  // Animer le halo réactif quand l'IA parle
  useEffect(() => {
    if (isSpeaking) {
      haloScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(0.9, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      haloOpacity.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 900, easing: Easing.out(Easing.ease) }),
          withTiming(0.4, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(haloScale);
      cancelAnimation(haloOpacity);
      haloScale.value = withTiming(1, { duration: 400 });
      haloOpacity.value = withTiming(0.6, { duration: 400 });
    }
  }, [isSpeaking]);

  // Nettoyer l'audio à la fermeture
  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, []);

  const stopVoice = () => {
    if (soundRef.current) {
      if (Platform.OS === 'web') {
        soundRef.current.pause?.();
      } else {
        soundRef.current.unloadAsync?.().catch(() => {});
      }
      soundRef.current = null;
    }
    setIsSpeaking(false);
  };

  // Appel API Gemini
  const generatePrayerFromGemini = async () => {
    if (!inputText.trim()) return;

    setPhase('loading');
    setGeneratedPrayer('');
    stopVoice();

    try {
      const userName = user?.user_metadata?.given_name || user?.user_metadata?.name || user?.user_metadata?.full_name || '';
      
      let baseSystem = GeminiModelfile.SYSTEM;
      if (userName) {
        baseSystem = baseSystem.replace(/mon frère\/ma sœur/g, userName);
      }

      const prompt = `${baseSystem}

Prière pour l'intention suivante de l'utilisateur : ${inputText}`;

      // Appeler l'Edge Function Supabase qui gère le pipeline LLM + TTS
      const { data, error } = await supabase.functions.invoke('generate-prayer', {
        body: {
          messages: [{ role: 'user', content: inputText }],
          systemPrompt: baseSystem,
          voiceName: GeminiModelfile.PARAMETERS.voiceName
        }
      });

      if (error || !data) throw new Error(error?.message || 'Empty response');

      const replyText = data.text || 'Seigneur, écoute notre prière.';
      const base64Audio = data.audio;

      setGeneratedPrayer(replyText);
      setPhase('result');

      // Jouer la voix
      if (base64Audio) {
        const wavAudio = pcmToWav(base64Audio, 24000);
        setCachedWavAudio(wavAudio);
        await playVoiceAudio(wavAudio, replyText);
      } else {
        console.warn("No audio data returned by Gemini model");
      }
    } catch (err) {
      console.warn("Prayer generator error:", err);
      setPhase('input');
    }
  };

  // Lecture audio
  const playVoiceAudio = async (base64Data: string, text: string) => {
    try {
      setIsSpeaking(true);

      const wavBase64 = pcmToWav(base64Data);

      if (Platform.OS === 'web') {
        const audioUrl = `data:audio/wav;base64,${wavBase64}`;
        const audio = new globalThis.Audio(audioUrl);
        soundRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          soundRef.current = null;
        };
        await audio.play();
      } else {
        const tempUri = `${(FileSystem as any).cacheDirectory || ''}/prayer_voice.wav`;
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
            setIsSpeaking(false);
            sound.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        });
      }
    } catch (err) {
      console.warn("WAV Playback failed:", err);
      setIsSpeaking(false);
    }
  };

  // Styles animés
  const animatedLoaderStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${loaderRotation.value}deg` }],
  }));

  const animatedSkeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonPulse.value,
  }));

  const animatedHaloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
    opacity: haloOpacity.value,
  }));

  // Bouton de retour ou annulation
  const handleBack = () => {
    if (phase === 'result') {
      stopVoice();
      setPhase('input');
    } else if (phase === 'loading') {
      setPhase('input');
    } else {
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
            onPress={handleBack}
          >
            <MaterialCommunityIcons name="chevron-left" size={28} color="#334155" />
          </Pressable>
          <Text style={styles.headerTitle}>Générateur de prières</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ─── PHASE Saisie ─── */}
        {phase === 'input' && (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.Text entering={FadeInDown.duration(400).delay(100)} style={styles.introTitle}>
              Confiez vos intentions de prière
            </Animated.Text>
            <Animated.Text entering={FadeInDown.duration(400).delay(200)} style={styles.introSubtitle}>
              Décrivez ce qui vous tracasse, vos soucis, vos remerciements ou vos souhaits les plus chers.
            </Animated.Text>

            {/* Suggestions M3 */}
            <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.suggestionsContainer}>
              {SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion.id}
                  style={styles.suggestionChip}
                  onPress={() => setInputText(suggestion.text)}
                >
                  <Text style={styles.suggestionChipText}>{suggestion.label}</Text>
                </Pressable>
              ))}
            </Animated.View>

            {/* Input Card M3 */}
            <Animated.View entering={FadeInDown.duration(400).delay(400)} style={[styles.inputCard, Shadows.card]}>
              <TextInput
                style={styles.textInput}
                placeholder="Seigneur, je traverse des épreuves dans mon travail et je prie pour de la clarté et de l'apaisement..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={6}
                value={inputText}
                onChangeText={setInputText}
                maxLength={800}
                textAlignVertical="top"
              />
              <View style={styles.wordCounterContainer}>
                <Text style={styles.wordCounter}>{inputText.length}/800</Text>
              </View>
            </Animated.View>

            {/* Bouton de soumission */}
            <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.btnWrapper}>
              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  !inputText.trim() && styles.submitBtnDisabled,
                  pressed && inputText.trim() && { transform: [{ scale: 0.97 }] },
                ]}
                disabled={!inputText.trim()}
                onPress={generatePrayerFromGemini}
              >
                <LinearGradient
                  colors={inputText.trim() ? ['#4A90E2', '#0056B3'] : ['#CBD5E1', '#94A3B8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitBtnGradient}
                >
                  <MaterialCommunityIcons name="feather" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Rédiger ma prière</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </ScrollView>
        )}

        {/* ─── PHASE Chargement Animé M3 ─── */}
        {phase === 'loading' && (
          <View style={styles.loadingArea}>
            <Animated.View style={[styles.loadingCircleWrapper, animatedLoaderStyle]}>
              <MaterialCommunityIcons name="progress-helper" size={54} color="#4A90E2" />
            </Animated.View>
            <Text style={styles.loadingTitle}>Écoute et intercession...</Text>
            <Text style={styles.loadingSub}>Le Saint-Esprit prépare votre prière personnalisée.</Text>

            {/* M3 Card Skeletons */}
            <View style={styles.skeletonsContainer}>
              <Animated.View style={[styles.skeletonCard, animatedSkeletonStyle]} />
              <Animated.View style={[styles.skeletonCard, { width: '80%' }, animatedSkeletonStyle]} />
              <Animated.View style={[styles.skeletonCard, { width: '65%' }, animatedSkeletonStyle]} />
            </View>
          </View>
        )}

        {/* ─── PHASE RÉSULTAT (ÉCRAN IVOIRE + HALO RÉACTIF) ─── */}
        {phase === 'result' && (
          <View style={styles.resultArea}>
            <ScrollView
              style={styles.resultScroll}
              contentContainerStyle={styles.resultScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View entering={ZoomIn.duration(500)} style={styles.prayerIconCircle}>
                <MaterialCommunityIcons name="hands-pray" size={32} color="#4A90E2" />
              </Animated.View>

              <Animated.View entering={FadeIn.duration(600).delay(200)} style={styles.prayerTextContainer}>
                <Text style={styles.prayerText}>{generatedPrayer}</Text>
              </Animated.View>
            </ScrollView>

            {/* HALO DE COULEUR INTERACTIF (SIRI/GEMINI LIVE STYLE) */}
            <View style={styles.haloContainer}>
              <Animated.View style={[styles.colorHalo, animatedHaloStyle]}>
                <LinearGradient
                  colors={['rgba(74, 144, 226, 0.4)', 'rgba(139, 98, 181, 0.45)', 'rgba(59, 130, 246, 0.05)']}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>

              <Pressable
                style={({ pressed }) => [styles.voiceBtn, pressed && { scale: 0.95 }]}
                onPress={() => {
                  if (isSpeaking) {
                    stopVoice();
                  } else if (cachedWavAudio) {
                    playVoiceAudio(cachedWavAudio, generatedPrayer);
                  }
                }}
              >
                <MaterialCommunityIcons
                  name={isSpeaking ? "volume-high" : "volume-mute"}
                  size={26}
                  color={isSpeaking ? "#4A90E2" : "#94A3B8"}
                />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFF0', // Écran en couleur ivoire (requis)
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.03)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 24,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.card,
  },
  suggestionChipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    height: 180,
    marginBottom: 24,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 22,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  wordCounterContainer: {
    alignItems: 'flex-end',
  },
  wordCounter: {
    fontSize: 11,
    color: '#94A3B8',
  },
  btnWrapper: {
    width: '100%',
  },
  submitBtn: {
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    ...Shadows.card,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  loadingCircleWrapper: {
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  loadingSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  skeletonsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  skeletonCard: {
    height: 16,
    width: '90%',
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  resultArea: {
    flex: 1,
    backgroundColor: '#FFFFF0', // Ivoire
  },
  resultScroll: {
    flex: 1,
  },
  resultScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 160,
    alignItems: 'center',
  },
  prayerIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(74, 144, 226, 0.15)',
    ...Shadows.card,
    marginBottom: 24,
  },
  prayerTextContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.02)',
    ...Shadows.card,
    width: '100%',
  },
  prayerText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#2D3748',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  haloContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  colorHalo: {
    position: 'absolute',
    bottom: -60,
    width: SCREEN_WIDTH * 1.2,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    // Filtre de flou sur le halo coloré (Siri style)
    ...Platform.select({
      web: { filter: 'blur(35px)' } as any,
    }),
  },
  voiceBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    zIndex: 20,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
});

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64(input: string): Uint8Array {
  const str = input.replace(/=+$/, '');
  const len = str.length;
  const bytes = new Uint8Array(Math.floor((len * 3) / 4));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const chunk = 
      (chars.indexOf(str[i]) << 18) |
      (chars.indexOf(str[i + 1]) << 12) |
      (i + 2 < len ? chars.indexOf(str[i + 2]) << 6 : 0) |
      (i + 3 < len ? chars.indexOf(str[i + 3]) : 0);
    bytes[p++] = (chunk >> 16) & 255;
    if (i + 2 < len) bytes[p++] = (chunk >> 8) & 255;
    if (i + 3 < len) bytes[p++] = chunk & 255;
  }
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const chunk = 
      (bytes[i] << 16) |
      (i + 1 < len ? bytes[i + 1] << 8 : 0) |
      (i + 2 < len ? bytes[i + 2] : 0);
    result += 
      chars[(chunk >> 18) & 63] +
      chars[(chunk >> 12) & 63] +
      (i + 1 < len ? chars[(chunk >> 6) & 63] : '=') +
      (i + 2 < len ? chars[chunk & 63] : '=');
  }
  return result;
}

function pcmToWav(pcmBase64: string, sampleRate = 24000): string {
  if (pcmBase64.startsWith("UklGR") || pcmBase64.startsWith("SUQz") || pcmBase64.startsWith("ZkxhQ")) {
    return pcmBase64;
  }
  const rawBytes = decodeBase64(pcmBase64);
  const len = rawBytes.length;
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + len, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, len, true);

  const bytes = new Uint8Array(buffer);
  bytes.set(rawBytes, 44);

  return encodeBase64(bytes);
}
