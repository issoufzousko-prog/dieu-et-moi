import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
  LayoutAnimation,
  UIManager,
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
  FadeOut,
  SlideInRight,
  SlideInLeft,
  ZoomIn,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors, Shadows, Gradients } from '@/constants/Colors';
import { cache } from '@/lib/cache';
import { supabase } from '@/lib/supabase';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const { width } = Dimensions.get('window');

// M3 Motion tokens
const M3_SPRING = { damping: 20, stiffness: 180, mass: 0.8 };
const M3_EMPHASIZED = { duration: 400, easing: Easing.bezier(0.2, 0, 0, 1) };
const M3_STANDARD = { duration: 300, easing: Easing.bezier(0.2, 0, 0, 1) };

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const STORAGE_KEY = '@dieu_et_moi_bible_assistant_messages_v1';

// Suggestions initiales rapides pour l'utilisateur
const QUICK_SUGGESTIONS = [
  { id: 's1', text: "Explique-moi Romains 8:28", icon: "book-open-outline" },
  { id: 's2', text: "Comment surmonter l'anxiété par la foi ?", icon: "heart-outline" },
  { id: 's3', text: "Rédige une prière pour ma famille", icon: "hands-pray" },
];

// ─── Composant Bouton Animé M3 ───
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function M3Button({ onPress, style, children, disabled }: { onPress: () => void; style?: any; children: React.ReactNode; disabled?: boolean }) {
  const scale = useSharedValue(1);
  const elevation = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: elevation.value,
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.92, M3_SPRING);
        elevation.value = withTiming(0.85, M3_STANDARD);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, M3_SPRING);
        elevation.value = withTiming(1, M3_STANDARD);
      }}
      onPress={disabled ? undefined : onPress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ─── Composant Parser de Markdown Léger M3 ───
interface FormattedMarkdownProps {
  text: string;
}

function FormattedMarkdown({ text }: FormattedMarkdownProps) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, index) => {
        if (line.trim() === '') {
          return <View key={index} style={{ height: 6 }} />;
        }

        let isBullet = false;
        let cleanLine = line;

        if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
          isBullet = true;
          cleanLine = cleanLine.substring(2);
        } else if (cleanLine.trim().startsWith('* ') || cleanLine.trim().startsWith('- ')) {
          isBullet = true;
          cleanLine = cleanLine.trim().substring(2);
        }

        const parts = cleanLine.split('**');

        return (
          <Text
            key={index}
            style={[
              styles.markdownLine,
              isBullet && { paddingLeft: 12, marginBottom: 2 }
            ]}
          >
            {isBullet && <Text style={{ fontWeight: 'bold', color: '#4A90E2' }}>• </Text>}
            {parts.map((part, i) => {
              const isBold = i % 2 === 1;
              return (
                <Text
                  key={i}
                  style={[
                    isBold ? { fontWeight: '700', color: '#1A202C' } : { color: '#2D3748' },
                    { fontSize: 15, lineHeight: 22 }
                  ]}
                >
                  {part}
                </Text>
              );
            })}
          </Text>
        );
      })}
    </View>
  );
}

// ─── Composant Bulle de Message Animée ───
function AnimatedMessage({ message, index }: { message: Message; index: number }) {
  const isUser = message.role === 'user';

  const entering = isUser
    ? SlideInRight.duration(350).springify().damping(18).stiffness(150)
    : SlideInLeft.duration(350).springify().damping(18).stiffness(150);

  return (
    <Animated.View
      entering={entering}
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAssistant,
      ]}
    >
      {isUser ? (
        <LinearGradient
          colors={['#4A90E2', '#0056B3']}
          start={{ x: 0.15, y: 0.15 }}
          end={{ x: 0.85, y: 0.85 }}
          style={[styles.bubble, styles.bubbleUser]}
        >
          <Text style={styles.textUser}>{message.content}</Text>
        </LinearGradient>
      ) : (
        <Animated.View style={[styles.bubble, styles.bubbleAssistant, Shadows.card]}>
          <FormattedMarkdown text={message.content} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── Composant Loading Pulsant M3 ───
function PulsingLoader() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 650, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(350).springify().damping(20)}
      exiting={FadeOut.duration(200)}
      style={[styles.messageRow, styles.messageRowAssistant]}
    >
      <View style={[styles.m3LoadingBubble, Shadows.card]}>
        <View style={styles.m3LoaderHeader}>
          <Animated.View style={[styles.m3SkeletonCircle, animatedStyle]} />
          <Animated.View style={[styles.m3SkeletonTitle, animatedStyle]} />
        </View>
        <View style={styles.m3SkeletonBody}>
          <Animated.View style={[styles.m3SkeletonLine, { width: '85%' }, animatedStyle]} />
          <Animated.View style={[styles.m3SkeletonLine, { width: '60%', marginTop: 8 }, animatedStyle]} />
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Composant Principal ───
export default function BibleAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const ATTACHMENT_OPTIONS = [
    { id: 'opt1', label: "Demander un verset d'encouragement", icon: "emoticon-happy-outline", prompt: "Donne-moi un verset d'encouragement" },
    { id: 'opt2', label: "Demander une explication théologique", icon: "book-open-variant", prompt: "Explique-moi le concept théologique de : " },
    { id: 'opt3', label: "Rédiger une prière personnalisée", icon: "hands-pray", prompt: "Rédige une prière chrétienne pour : " },
  ];

  const handleSelectOption = (prompt: string) => {
    setInputText(prompt);
    setShowAttachmentMenu(false);
    if (!isFocused) {
      toggleFocus(true);
    }
  };

  const toggleFocus = (focus: boolean) => {
    LayoutAnimation.configureNext({
      duration: 250,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.85 },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    setIsFocused(focus);
  };

  const isExpanded = isFocused || inputText.trim().length > 0;

  // Charger les messages du cache local (MMKV) au démarrage
  useEffect(() => {
    async function loadMessages() {
      try {
        const cachedData = await cache.getItem(STORAGE_KEY);
        if (cachedData) {
          const parsed = JSON.parse(cachedData) as Message[];
          setMessages(parsed);
          if (parsed.length > 0) {
            setShowSuggestions(false);
          }
        }
      } catch (err) {
        console.warn('Failed to load chat messages from cache:', err);
      }
    }
    loadMessages();
  }, []);

  // Sauvegarder les messages en cache à chaque mise à jour
  const saveMessages = async (newMessages: Message[]) => {
    try {
      await cache.setItem(STORAGE_KEY, JSON.stringify(newMessages));
    } catch (err) {
      console.warn('Failed to save chat messages to cache:', err);
    }
  };

  // Auto-scroll vers le bas
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isLoading]);

  // Vider la discussion
  const handleClearHistory = async () => {
    try {
      await cache.removeItem(STORAGE_KEY);
      LayoutAnimation.configureNext({
        duration: 300,
        create: { type: 'easeInEaseOut', property: 'opacity' },
        update: { type: 'spring', springDamping: 0.8 },
        delete: { type: 'easeInEaseOut', property: 'opacity' },
      });
      setMessages([]);
      setShowSuggestions(true);
      setIsLoading(false);
    } catch (err) {
      console.warn('Failed to clear chat history:', err);
    }
  };

  // Envoyer un message
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');
    setShowSuggestions(false);
    Keyboard.dismiss();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    await saveMessages(updatedMessages);

    setIsLoading(true);

    try {
      // Préparer l'historique récent des messages pour le contexte de l'IA (limité aux 8 derniers messages)
      const recentHistory = updatedMessages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Appel de l'Edge Function Supabase de manière sécurisée
      const { data, error } = await supabase.functions.invoke('bible-expert', {
        body: { messages: recentHistory },
      });

      if (error || !data) {
        throw new Error(error?.message || 'Erreur lors de la récupération de la réponse IA');
      }

      // Vérifier si la discussion a été effacée pendant l'appel réseau
      setMessages(currentMessages => {
        if (currentMessages.length === 0) {
          return currentMessages;
        }
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply || "Que la paix soit avec vous. Je n'ai pas pu formuler ma réponse, veuillez réessayer.",
          timestamp: Date.now(),
        };
        const finalMessages = [...currentMessages, assistantMessage];
        saveMessages(finalMessages);
        return finalMessages;
      });
    } catch (err: any) {
      console.warn("Chatbot Error:", err);
      // Vérifier si la discussion a été effacée pendant l'appel réseau
      setMessages(currentMessages => {
        if (currentMessages.length === 0) {
          return currentMessages;
        }
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Désolé, une erreur de connexion est survenue. Veuillez vérifier votre connexion Internet et réessayer.",
          timestamp: Date.now(),
        };
        const finalMessages = [...currentMessages, errorMessage];
        saveMessages(finalMessages);
        return finalMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── HEADER ─── */}
      <Animated.View entering={FadeInDown.duration(400).delay(50)} style={styles.header}>
        <M3Button onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.navy} />
        </M3Button>

        <Text style={styles.headerTitle}>Assistant biblique</Text>

        <M3Button onPress={handleClearHistory} style={styles.headerBtn}>
          <MaterialCommunityIcons name="trash-can-outline" size={22} color={Colors.navy} />
        </M3Button>
      </Animated.View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatAreaContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showSuggestions && messages.length === 0 && (
          <View style={styles.suggestionsContainer}>
            {/* Logo animé */}
            <Animated.View entering={ZoomIn.duration(500).springify().damping(14)} style={styles.logoCircleWrapper}>
              <LinearGradient
                colors={['#4A90E2', '#0056B3']}
                start={{ x: 0.15, y: 0.15 }}
                end={{ x: 0.85, y: 0.85 }}
                style={styles.logoCircle}
              >
                <MaterialCommunityIcons name="chat-processing-outline" size={40} color={Colors.white} />
              </LinearGradient>
            </Animated.View>

            <Animated.Text entering={FadeInDown.duration(400).delay(200)} style={styles.welcomeTitle}>
              Comment puis-je vous guider ?
            </Animated.Text>
            <Animated.Text entering={FadeInDown.duration(400).delay(350)} style={styles.welcomeSubtitle}>
              Posez vos questions théologiques ou demandez des éclaircissements sur des versets sacrés.
            </Animated.Text>

            {/* Suggestions avec entrée décalée M3 */}
            <View style={styles.suggestionsGrid}>
              {QUICK_SUGGESTIONS.map((suggestion, i) => (
                <Animated.View
                  key={suggestion.id}
                  entering={FadeInUp.duration(400).delay(450 + i * 100).springify().damping(16)}
                >
                  <M3Button
                    onPress={() => handleSend(suggestion.text)}
                    style={styles.suggestionCard}
                  >
                    <MaterialCommunityIcons
                      name={suggestion.icon as any}
                      size={20}
                      color="#4A5568"
                      style={styles.suggestionIcon}
                    />
                    <Text style={styles.suggestionText}>{suggestion.text}</Text>
                  </M3Button>
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {/* Messages avec animation d'entrée */}
        {messages.map((message, index) => (
          <AnimatedMessage key={message.id} message={message} index={index} />
        ))}

        {/* Indicateur de chargement pulsant M3 */}
        {isLoading && <PulsingLoader />}
      </ScrollView>

      {/* ─── ZONE DE SAISIE (COPILOT STYLE) ─── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Animated.View
          entering={FadeInDown.duration(350).delay(300)}
          style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <View style={styles.inputCard}>
            {isExpanded ? (
              <View style={styles.expandedInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Poser une question biblique..."
                  placeholderTextColor="#A0AEC0"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  onFocus={() => toggleFocus(true)}
                  onBlur={() => toggleFocus(false)}
                  maxLength={500}
                  autoFocus={isFocused}
                />

                <View style={styles.inputDivider} />

                <View style={styles.inputBottomRow}>
                  {/* Bouton d'ajout "+" */}
                  <M3Button onPress={() => setShowAttachmentMenu(true)} style={styles.addBtn}>
                    <MaterialCommunityIcons name="plus" size={22} color="#4A5568" />
                  </M3Button>

                  <View style={styles.inputActionsRight}>
                    {inputText.trim().length === 0 ? (
                      <>
                        <M3Button
                          onPress={() => router.push({ pathname: '/features/live-assistant', params: { camera: 'true' } } as any)}
                          style={styles.copilotIcon}
                        >
                          <MaterialCommunityIcons name="glasses" size={20} color="#718096" />
                        </M3Button>
                        <M3Button
                          onPress={() => router.push('/features/live-assistant' as any)}
                          style={styles.copilotIcon}
                        >
                          <MaterialCommunityIcons name="waveform" size={20} color="#718096" />
                        </M3Button>
                      </>
                    ) : (
                      <M3Button onPress={() => handleSend()} style={styles.sendBtn}>
                        <LinearGradient
                          colors={['#4A90E2', '#0056B3']}
                          start={{ x: 0.15, y: 0.15 }}
                          end={{ x: 0.85, y: 0.85 }}
                          style={styles.sendBtnGradient}
                        >
                          <MaterialCommunityIcons name="send" size={16} color={Colors.white} />
                        </LinearGradient>
                      </M3Button>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.compactInputRow}>
                {/* Bouton d'ajout "+" */}
                <M3Button onPress={() => setShowAttachmentMenu(true)} style={styles.addBtn}>
                  <MaterialCommunityIcons name="plus" size={22} color="#4A5568" />
                </M3Button>

                {/* Saisie compacte */}
                <TextInput
                  style={styles.compactInput}
                  placeholder="Poser une question biblique..."
                  placeholderTextColor="#A0AEC0"
                  value={inputText}
                  onChangeText={setInputText}
                  onFocus={() => toggleFocus(true)}
                  onBlur={() => toggleFocus(false)}
                  maxLength={500}
                />

                {/* Icône waveform (live audio) */}
                <M3Button
                  onPress={() => router.push('/features/live-assistant' as any)}
                  style={styles.copilotIcon}
                >
                  <MaterialCommunityIcons name="waveform" size={20} color="#718096" />
                </M3Button>
              </View>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* ─── BOTTOM SHEET QUICK PROMPTS (M3 Shape) ─── */}
      {showAttachmentMenu && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.menuOverlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAttachmentMenu(false)} />
          <Animated.View
            entering={SlideInDown.duration(300).springify().damping(22)}
            exiting={SlideOutDown.duration(200)}
            style={[styles.menuSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          >
            <View style={styles.menuDragHandle} />
            <Text style={styles.menuTitle}>Actions Rapides</Text>
            
            {ATTACHMENT_OPTIONS.map((opt) => (
              <M3Button
                key={opt.id}
                onPress={() => handleSelectOption(opt.prompt)}
                style={styles.menuItem}
              >
                <MaterialCommunityIcons name={opt.icon as any} size={22} color="#4A90E2" />
                <Text style={styles.menuItemText}>{opt.label}</Text>
              </M3Button>
            ))}

            <M3Button
              onPress={() => setShowAttachmentMenu(false)}
              style={styles.menuCancelBtn}
            >
              <Text style={styles.menuCancelText}>Fermer</Text>
            </M3Button>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5F0', // Couleur papier élégante
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    backgroundColor: '#F7F5F0',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.navy,
  },
  chatArea: {
    flex: 1,
  },
  chatAreaContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  suggestionsContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  logoCircleWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    ...Shadows.card,
    marginBottom: 24,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  suggestionsGrid: {
    width: '100%',
    gap: 12,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    ...Shadows.card,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '500',
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    width: '100%',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleUser: {
    borderRadius: 20,
    borderBottomRightRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.02)',
  },
  m3LoadingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    width: 240,
    padding: 16,
  },
  m3LoaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  m3SkeletonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  m3SkeletonTitle: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    width: 120,
    marginLeft: 8,
  },
  m3SkeletonBody: {
    width: '100%',
  },
  m3SkeletonLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
  },
  textUser: {
    color: Colors.white,
    fontSize: 15,
    lineHeight: 21,
  },
  textAssistant: {
    color: '#1A1A1A',
    fontSize: 15,
    lineHeight: 22,
  },
  markdownLine: {
    fontSize: 15,
    lineHeight: 22,
    color: '#2D3748',
  },
  inputWrapper: {
    backgroundColor: '#F7F5F0',
    paddingHorizontal: 16,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...Shadows.card,
  },
  input: {
    fontSize: 15,
    color: Colors.navy,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
    textAlignVertical: 'top',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  inputDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    marginVertical: 8,
  },
  compactInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  compactInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.navy,
    paddingHorizontal: 12,
    height: 36,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  expandedInputContainer: {
    width: '100%',
  },
  inputBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7F5F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  inputActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copilotIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    ...Shadows.card,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  sendBtnGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    ...Shadows.card,
  },
  menuDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.navy,
    marginBottom: 16,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  menuCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  menuCancelText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#64748B',
  },
});
