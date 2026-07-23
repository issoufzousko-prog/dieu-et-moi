import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, {
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { GeminiModelfile } from '@/GeminiModelfile';

// Nombre de barres d'égaliseur
const NUM_BARS = 28;
const BAR_WIDTH = (SCREEN_WIDTH - 40) / NUM_BARS;

export default function LiveAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ camera?: string }>();
  const { user, isLoading } = useAuth();

  const [status, setStatus] = useState<'idle' | 'recording' | 'thinking' | 'speaking'>('idle');
  const [responseText, setResponseText] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const soundRef = useRef<any>(null);
  const historyRef = useRef<{ role: string; parts: any[] }[]>([]);
  const hasInitializedRef = useRef(false);

  // Shared values pour chaque barre d'égaliseur (hauteur animée)
  const barHeights = useRef(
    Array.from({ length: NUM_BARS }, () => useSharedValue(0.08))
  ).current;

  // Activer la caméra si param
  useEffect(() => {
    if (params.camera === 'true') {
      toggleCamera(true);
    }
  }, [params.camera]);

  // Initialiser l'historique et démarrer la conversation vocale avec le nom de l'utilisateur
  useEffect(() => {
    if (isLoading || hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const userName = user?.user_metadata?.given_name || user?.user_metadata?.name || user?.user_metadata?.full_name || '';
    
    let systemPrompt = GeminiModelfile.SYSTEM;
    if (userName) {
      systemPrompt = systemPrompt.replace(/mon frère\/ma sœur/g, userName);
    }
    
    historyRef.current = [
      { role: 'user', parts: [{ text: systemPrompt }] }
    ];

    setStatus('thinking');
    callGemini('', '', null);
  }, [user, isLoading]);

  // Nettoyage
  useEffect(() => {
    return () => {
      stopRecording();
      stopCameraStream();
      stopBarAnimations();
      if (soundRef.current) {
        if (Platform.OS === 'web') {
          soundRef.current.pause?.();
        } else {
          soundRef.current.unloadAsync?.().catch(() => {});
        }
      }
    };
  }, []);

  // Réagir aux changements de status pour animer les barres
  useEffect(() => {
    if (status === 'speaking') {
      startBarAnimations();
    } else if (status === 'recording') {
      startRecordingBars();
    } else {
      stopBarAnimations();
    }
  }, [status]);

  // ─── ANIMATIONS DES BARRES ───

  const startBarAnimations = () => {
    barHeights.forEach((bar, i) => {
      const baseHeight = 0.15 + Math.random() * 0.35;
      const duration = 200 + Math.random() * 300;
      const delay = i * 15;

      bar.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(baseHeight + Math.random() * 0.5, {
              duration,
              easing: Easing.out(Easing.quad),
            }),
            withTiming(0.05 + Math.random() * 0.15, {
              duration: duration * 0.8,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          true
        )
      );
    });
  };

  const startRecordingBars = () => {
    barHeights.forEach((bar, i) => {
      const duration = 400 + Math.random() * 200;
      const delay = i * 20;

      bar.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.08 + Math.random() * 0.12, {
              duration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(0.03, {
              duration: duration * 0.6,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          true
        )
      );
    });
  };

  const stopBarAnimations = () => {
    barHeights.forEach((bar) => {
      cancelAnimation(bar);
      bar.value = withTiming(0.08, { duration: 400 });
    });
  };

  // ─── CAMÉRA ───

  const toggleCamera = async (forceOn?: boolean) => {
    const newState = forceOn !== undefined ? forceOn : !isCameraOn;

    if (newState && Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
        setIsCameraOn(true);
      } catch (err) {
        console.warn('Camera access denied:', err);
      }
    } else if (newState) {
      setIsCameraOn(true);
    } else {
      stopCameraStream();
      setIsCameraOn(false);
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const captureFrame = (): string | null => {
    if (Platform.OS !== 'web' || !videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, 320, 240);
    return canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
  };

  const setVideoElement = (el: any) => {
    if (Platform.OS === 'web' && el) {
      videoRef.current = el;
      if (streamRef.current) {
        el.srcObject = streamRef.current;
        el.play().catch(() => {});
      }
    }
  };

  // ─── ENREGISTREMENT ───

  const startRecording = async () => {
    try {
      setStatus('recording');
      setResponseText('');

      if (Platform.OS !== 'web') {
        const perm = await Audio.requestPermissionsAsync();
        if (perm.status !== 'granted') {
          setStatus('idle');
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recordingRef.current = recording;
      }
    } catch (err) {
      console.warn('Recording error:', err);
      setStatus('idle');
    }
  };

  const stopRecording = async () => {
    if (status !== 'recording') return;
    setStatus('thinking');

    try {
      let base64Audio = '';
      let mimeType = 'audio/m4a';

      if (Platform.OS !== 'web' && recordingRef.current) {
        const rec = recordingRef.current;
        recordingRef.current = null;
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        if (uri) {
          base64Audio = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      } else {
        await new Promise((r) => setTimeout(r, 800));
        base64Audio = 'DUMMY';
      }

      const frameBase64 = isCameraOn ? captureFrame() : null;
      await callGemini(base64Audio, mimeType, frameBase64);
    } catch (err) {
      console.warn('Stop recording error:', err);
      setStatus('idle');
    }
  };

  // ─── GEMINI API ───

  const callGemini = async (base64Audio: string, mimeType: string, frameBase64: string | null) => {
    try {
      // 1. Si l'historique est vide, on l'initialise d'abord (sécurité)
      if (historyRef.current.length === 0) {
        const userName = user?.user_metadata?.given_name || user?.user_metadata?.name || user?.user_metadata?.full_name || '';
        let systemPrompt = GeminiModelfile.SYSTEM;
        if (userName) {
          systemPrompt = systemPrompt.replace(/mon frère\/ma sœur/g, userName);
        }
        historyRef.current = [
          { role: 'user', parts: [{ text: systemPrompt }] }
        ];
      } else if (base64Audio || frameBase64) {
        // Ajouter le tour utilisateur
        const userParts: any[] = [];
        if (base64Audio && base64Audio !== 'DUMMY') {
          userParts.push({ inlineData: { mimeType, data: base64Audio } });
        } else {
          userParts.push({ text: "L'utilisateur écoute et te demande de continuer à prier pour lui." });
        }
        if (frameBase64) {
          userParts.push({ inlineData: { mimeType: 'image/jpeg', data: frameBase64 } });
        }
        historyRef.current.push({
          role: 'user',
          parts: userParts
        });
      }

      const userName = user?.user_metadata?.given_name || user?.user_metadata?.name || user?.user_metadata?.full_name || '';
      let systemPrompt = GeminiModelfile.SYSTEM;
      if (userName) {
        systemPrompt = systemPrompt.replace(/mon frère\/ma sœur/g, userName);
      }

      // Appeler l'Edge Function Supabase qui gère le pipeline LLM + TTS
      const { data, error } = await supabase.functions.invoke('generate-prayer', {
        body: {
          messages: historyRef.current,
          systemPrompt: systemPrompt,
          voiceName: GeminiModelfile.PARAMETERS.voiceName
        }
      });

      if (error || !data) throw new Error(error?.message || 'Empty response');

      const replyText = data.text || 'Que la paix soit avec vous.';
      const responseBase64Audio = data.audio;

      // Ajouter la réponse du modèle à l'historique
      historyRef.current.push({
        role: 'model',
        parts: [{ text: replyText }]
      });

      if (responseBase64Audio) {
        const wavAudio = pcmToWav(responseBase64Audio, 24000);
        await playGeminiVoice(wavAudio, replyText);
      } else {
        console.warn("No audio data returned by Gemini model");
        setStatus('idle');
      }
    } catch (err) {
      console.warn('Gemini error:', err);
      setStatus('idle');
    }
  };

  // Lecture de la voix ultra-réaliste native de Gemini
  const playGeminiVoice = async (base64Data: string, text: string) => {
    try {
      setStatus('speaking');
      setResponseText(text);

      if (soundRef.current) {
        if (Platform.OS === 'web') {
          soundRef.current.pause?.();
        } else {
          await soundRef.current.unloadAsync().catch(() => {});
        }
        soundRef.current = null;
      }

      if (Platform.OS === 'web') {
        const audioUrl = `data:audio/wav;base64,${base64Data}`;
        const audio = new globalThis.Audio(audioUrl);
        soundRef.current = audio;
        audio.onended = () => {
          setStatus('idle');
          setResponseText('');
          soundRef.current = null;
        };
        await audio.play();
      } else {
        const tempUri = `${(FileSystem as any).cacheDirectory || ''}/gemini_voice.wav`;
        await FileSystem.writeAsStringAsync(tempUri, base64Data, {
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
            setStatus('idle');
            setResponseText('');
            sound.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        });
      }
    } catch (err) {
      console.warn("Failed to play Gemini native voice:", err);
      setStatus('idle');
      setResponseText('');
    }
  };

  const handleMicPress = () => {
    if (status === 'recording') stopRecording();
    else startRecording();
  };

  // ─── RENDU ───

  const centerMessage = () => {
    if (status === 'thinking') return 'Réflexion en cours...';
    if (status === 'speaking') return responseText;
    if (status === 'recording') return 'Je vous écoute...';
    return 'Commencer à parler';
  };

  const centerMessageStyle = () => {
    if (status === 'idle') return styles.idleMessage;
    if (status === 'recording') return styles.recordingMessage;
    if (status === 'thinking') return styles.thinkingMessage;
    return styles.speakingMessage;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>

        {/* ─── FOND CAMÉRA ─── */}
        {isCameraOn && Platform.OS === 'web' && (
          <View style={styles.cameraLayer}>
            {/* @ts-ignore */}
            <video
              ref={setVideoElement}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
              }}
            />
            {/* @ts-ignore */}
            <canvas ref={(el: any) => { canvasRef.current = el; }} style={{ display: 'none' }} />
            <View style={styles.cameraOverlay} />
          </View>
        )}

        {/* ─── EN-TÊTE MINIMALISTE ─── */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
            onPress={() => { stopCameraStream(); router.back(); }}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={26}
              color={isCameraOn ? '#FFFFFF' : '#334155'}
            />
          </Pressable>

          <View style={styles.headerRight}>
            {/* Bouton lunettes / caméra */}
            <Pressable
              style={({ pressed }) => [
                styles.headerBtn,
                isCameraOn && styles.headerBtnActive,
                pressed && { opacity: 0.6 },
              ]}
              onPress={() => toggleCamera()}
            >
              <MaterialCommunityIcons
                name="glasses"
                size={22}
                color={isCameraOn ? '#3B82F6' : '#64748B'}
              />
            </Pressable>
          </View>
        </View>

        {/* ─── MESSAGE CENTRAL ─── */}
        <View style={styles.centerArea}>
          <Text style={[styles.centerText, centerMessageStyle()]}>
            {centerMessage()}
          </Text>
        </View>

        {/* ─── BOUTON MICRO FLOTTANT ─── */}
        <View style={styles.micArea}>
          <Pressable
            style={({ pressed }) => [
              styles.micBtn,
              status === 'recording' && styles.micBtnRecording,
              pressed && { transform: [{ scale: 0.93 }] },
            ]}
            onPress={handleMicPress}
          >
            <MaterialCommunityIcons
              name={status === 'recording' ? 'stop' : 'microphone'}
              size={28}
              color={status === 'recording' ? '#FFFFFF' : '#334155'}
            />
          </Pressable>
        </View>

        {/* ─── DÉGRADÉ RÉACTIF EN BAS (Barres d'égaliseur) ─── */}
        <View style={[styles.equalizerWrapper, { paddingBottom: insets.bottom }]}>
          <LinearGradient
            colors={
              isCameraOn
                ? ['transparent', 'rgba(15, 23, 42, 0.85)']
                : ['transparent', 'rgba(79, 70, 229, 0.08)', 'rgba(59, 130, 246, 0.15)']
            }
            style={styles.equalizerGradient}
          >
            <View style={styles.barsContainer}>
              {barHeights.map((barH, index) => (
                <EqualizerBar key={index} height={barH} index={index} isCameraOn={isCameraOn} />
              ))}
            </View>
          </LinearGradient>
        </View>
      </View>
    </>
  );
}

// ─── Composant Barre d'Égaliseur Animée ───

function EqualizerBar({
  height,
  index,
  isCameraOn,
}: {
  height: any;
  index: number;
  isCameraOn: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: `${height.value * 100}%`,
  }));

  // Dégradé de couleurs pour chaque barre (du violet au bleu)
  const hue = 220 + (index / NUM_BARS) * 40; // de bleu à violet
  const barColor = isCameraOn
    ? `hsla(${hue}, 80%, 70%, 0.7)`
    : `hsla(${hue}, 60%, 55%, 0.5)`;

  return (
    <View style={styles.barWrapper}>
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: barColor },
          animatedStyle,
        ]}
      />
    </View>
  );
}

// ─── STYLES ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFF0', // Ivoire
  },
  cameraLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  headerBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    zIndex: 2,
  },
  centerText: {
    textAlign: 'center',
    lineHeight: 28,
  },
  idleMessage: {
    fontSize: 22,
    fontWeight: '300',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  recordingMessage: {
    fontSize: 20,
    fontWeight: '500',
    color: '#EF4444',
    letterSpacing: 0.3,
  },
  thinkingMessage: {
    fontSize: 18,
    fontWeight: '400',
    color: '#64748B',
    fontStyle: 'italic',
  },
  speakingMessage: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1E293B',
    lineHeight: 26,
  },
  micArea: {
    alignItems: 'center',
    paddingBottom: 24,
    zIndex: 5,
  },
  micBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  micBtnRecording: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  equalizerWrapper: {
    zIndex: 3,
  },
  equalizerGradient: {
    height: 120,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    width: '60%',
    minHeight: 4,
    borderRadius: 3,
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
