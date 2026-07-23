import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Text, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FluentIcon from '@/components/fluent-icons/FluentIcon';
import { Colors, Shadows } from '@/constants/Colors';
import { allBooks, Book } from '@/lib/bible';

const { width, height } = Dimensions.get('window');

export default function BibleScreen() {
  const params = useLocalSearchParams<{ book?: string; chapter?: string; audio?: string }>();

  // Determine initial book and chapter index
  const initialBook = useMemo(() => {
    if (params.book) {
      const book = allBooks.find(
        b => b.Text.toLowerCase() === params.book?.toLowerCase() ||
             b.Text.toLowerCase().startsWith(params.book?.toLowerCase() || '')
      );
      if (book) return book;
    }
    return allBooks[0];
  }, [params.book]);

  const initialChapterIndex = useMemo(() => {
    if (params.chapter) {
      const parsed = parseInt(params.chapter, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed - 1; // 1-indexed to 0-indexed
      }
    }
    return 0;
  }, [params.chapter]);

  const [selectedBook, setSelectedBook] = useState<Book>(initialBook);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(initialChapterIndex);
  const [fontSize, setFontSize] = useState(16);
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [testamentTab, setTestamentTab] = useState<'old' | 'new'>('old');

  const scrollViewRef = useRef<ScrollView>(null);

  // Audio states
  const [audioPanelVisible, setAudioPanelVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeakingVerse, setCurrentSpeakingVerse] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const soundRef = useRef<any>(null); // Audio.Sound on native, HTMLAudioElement on web
  const audioBufferRef = useRef<Map<number, string>>(new Map()); // index -> base64 audio
  const prefetchingRef = useRef<Set<number>>(new Set()); // versets en cours de chargement
  const PREFETCH_SIZE = 5;
  const isAutoTransitionRef = useRef(false);

  // Synchroniser l'état du livre et du chapitre en cas de changement des paramètres de route
  useEffect(() => {
    if (params.book) {
      const book = allBooks.find(
        b => b.Text.toLowerCase() === params.book?.toLowerCase() ||
             b.Text.toLowerCase().startsWith(params.book?.toLowerCase() || '')
      );
      if (book) {
        setSelectedBook(book);
        if (params.chapter) {
          const parsed = parseInt(params.chapter, 10);
          if (!isNaN(parsed) && parsed > 0) {
            setSelectedChapterIndex(parsed - 1);
          } else {
            setSelectedChapterIndex(0);
          }
        } else {
          setSelectedChapterIndex(0);
        }
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    }
  }, [params.book, params.chapter]);

  // Activer le panneau audio si params.audio est à true
  useEffect(() => {
    if (params.audio === 'true') {
      setAudioPanelVisible(true);
    }
  }, [params.audio]);

  // Séparation Ancien/Nouveau Testament (39 livres dans l'Ancien Testament)
  const oldTestamentBooks = useMemo(() => allBooks.slice(0, 39), []);
  const newTestamentBooks = useMemo(() => allBooks.slice(39), []);

  const currentChapter = useMemo(() => {
    return selectedBook.Chapters[selectedChapterIndex] || selectedBook.Chapters[0];
  }, [selectedBook, selectedChapterIndex]);

  // TTS Engine Logic — prefetch read-ahead buffer
  const stopAudio = async () => {
    setIsPlaying(false);
    setIsAudioLoading(false);
    setCurrentSpeakingVerse(null);
    audioBufferRef.current.clear();
    prefetchingRef.current.clear();
    if (soundRef.current) {
      try {
        if (Platform.OS === 'web') {
          soundRef.current.pause?.();
        } else {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        }
      } catch (err) {
        console.warn("Error unloading sound:", err);
      }
      soundRef.current = null;
    }
  };

  // Construit le texte TTS pour un verset donné
  const buildTTSText = (verseIndex: number): string => {
    const rawText = currentChapter.Verses[verseIndex].Text;
    if (verseIndex === 0) {
      // Premier verset : annoncer le livre et le chapitre
      return `${selectedBook.Text}, Chapitre ${selectedChapterIndex + 1}. ${rawText}`;
    }
    return rawText; // Texte brut uniquement — Edge-TTS gère très bien la ponctuation
  };

  // Précharge PREFETCH_SIZE versets en parallèle à partir de fromIndex
  const prefetchAhead = (fromIndex: number) => {
    const total = currentChapter.Verses.length;
    for (let i = fromIndex; i < Math.min(fromIndex + PREFETCH_SIZE, total); i++) {
      if (audioBufferRef.current.has(i) || prefetchingRef.current.has(i)) continue;
      prefetchingRef.current.add(i);
      const verseIndex = i;
      const verseText = buildTTSText(verseIndex);
      // Fire-and-forget — ne bloque pas
      supabase.functions.invoke('bible-tts', {
        body: { text: verseText }
      }).then(({ data, error }) => {
        if (!error && data?.audio) {
          audioBufferRef.current.set(verseIndex, data.audio);
          console.log(`[Prefetch] Verset ${verseIndex + 1} mis en buffer.`);
        } else {
          console.warn(`[Prefetch] Échec verset ${verseIndex + 1}:`, error?.message);
        }
      }).catch((e) => {
        console.warn(`[Prefetch] Erreur verset ${verseIndex + 1}:`, e);
      }).finally(() => {
        prefetchingRef.current.delete(verseIndex);
      });
    }
  };

  const speakVerse = async (index: number) => {
    if (index >= currentChapter.Verses.length) {
      if (selectedChapterIndex + 1 < selectedBook.Chapters.length) {
        console.log(`Auto transitioning to next chapter: ${selectedChapterIndex + 2}`);
        isAutoTransitionRef.current = true;
        setSelectedChapterIndex(prev => prev + 1);
      } else {
        const bookIndex = allBooks.findIndex(b => b.Text === selectedBook.Text);
        if (bookIndex !== -1 && bookIndex + 1 < allBooks.length) {
          console.log(`Auto transitioning to next book: ${allBooks[bookIndex + 1].Text}`);
          isAutoTransitionRef.current = true;
          setSelectedBook(allBooks[bookIndex + 1]);
          setSelectedChapterIndex(0);
        } else {
          console.log("End of Bible reached. Stopping audio.");
          await stopAudio();
        }
      }
      return;
    }

    setIsAudioLoading(true);
    setCurrentSpeakingVerse(index);

    // Arrêter le son précédent s'il y en a un
    if (soundRef.current) {
      try {
        if (Platform.OS === 'web') {
          soundRef.current.pause?.();
        } else {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        }
      } catch (err) {
        console.warn("Error stopping previous sound:", err);
      }
      soundRef.current = null;
    }

    try {
      // Utiliser le buffer si disponible, sinon fetch direct
      let base64Audio = audioBufferRef.current.get(index);
      if (base64Audio) {
        console.log(`[Audio] Verset ${index + 1} lu depuis le buffer.`);
        audioBufferRef.current.delete(index);
      } else {
        console.log(`[Audio] Verset ${index + 1} — fetch direct (pas encore dans le buffer).`);
        const { data, error } = await supabase.functions.invoke('bible-tts', {
          body: { text: buildTTSText(index) }
        });
        if (error || !data?.audio) {
          throw new Error(error?.message || 'Reponse de synthese vocale vide.');
        }
        base64Audio = data.audio;
      }

      // Lancer le prefetch des 5 versets suivants en arrière-plan
      prefetchAhead(index + 1);

      if (Platform.OS === 'web') {
        const audio = new globalThis.Audio(`data:audio/mp3;base64,${base64Audio}`);
        audio.playbackRate = playbackRate;
        soundRef.current = audio;
        setIsAudioLoading(false);
        setIsPlaying(true);

        audio.onended = async () => {
          await speakVerse(index + 1);
        };
        await audio.play();
      } else {
        const tempUri = `${(FileSystem as any).cacheDirectory || ''}/bible_verse_${index}.mp3`;
        
        await FileSystem.writeAsStringAsync(tempUri, base64Audio!, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: tempUri },
          { shouldPlay: true, rate: playbackRate, shouldCorrectPitch: true }
        );

        soundRef.current = sound;
        setIsAudioLoading(false);
        setIsPlaying(true);

        sound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded && status.didJustFinish) {
            await speakVerse(index + 1);
          }
        });
      }

    } catch (err) {
      console.error("Erreur de synthese vocale / lecture audio :", err);
      setIsAudioLoading(false);
      await stopAudio();
    }
  };

  const startAudio = async () => {
    if (isPlaying || isAudioLoading) {
      await stopAudio();
    } else {
      const startIndex = currentSpeakingVerse !== null ? currentSpeakingVerse : 0;
      // Démarrer le prefetch des 5 premiers versets immédiatement
      prefetchAhead(startIndex);
      await speakVerse(startIndex);
    }
  };

  // Mettre à jour le playbackRate sur le son en cours
  useEffect(() => {
    if (soundRef.current) {
      if (Platform.OS === 'web') {
        soundRef.current.playbackRate = playbackRate;
      } else {
        soundRef.current.setRateAsync(playbackRate, true).catch(() => {});
      }
    }
  }, [playbackRate]);

  // Stop playback when book or chapter changes, unless it is an automatic transition
  useEffect(() => {
    if (isAutoTransitionRef.current) {
      isAutoTransitionRef.current = false;
      audioBufferRef.current.clear();
      prefetchingRef.current.clear();
      // Pre-charge the first verses of the new chapter and play
      prefetchAhead(0);
      speakVerse(0);
    } else {
      stopAudio();
    }
  }, [selectedBook, selectedChapterIndex]);

  // Stop playback on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Auto-scroll screen to active speaking verse
  useEffect(() => {
    if (currentSpeakingVerse !== null && scrollViewRef.current) {
      const targetY = Math.max(0, currentSpeakingVerse * 70 - 100);
      scrollViewRef.current.scrollTo({ y: targetY, animated: true });
    }
  }, [currentSpeakingVerse]);

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    setSelectedChapterIndex(0);
    setBookModalVisible(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleChapterSelect = (index: number) => {
    setSelectedChapterIndex(index);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const incrementFontSize = () => {
    if (fontSize < 24) setFontSize(prev => prev + 2);
  };

  const decrementFontSize = () => {
    if (fontSize > 12) setFontSize(prev => prev - 2);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Top Selection Bar */}
      <View style={styles.selectorBar}>
        <Pressable
          style={styles.bookSelector}
          onPress={() => {
            // Déterminer l'onglet par défaut du livre en cours
            const bookIndex = allBooks.findIndex(b => b.Text === selectedBook.Text);
            setTestamentTab(bookIndex < 39 ? 'old' : 'new');
            setBookModalVisible(true);
          }}
        >
          <Text style={styles.bookSelectorText}>{selectedBook.Text}</Text>
          <FluentIcon name="chevronDown" size={16} color={Colors.navy} />
        </Pressable>

        {/* Audio Toggle Button */}
        <Pressable 
          onPress={() => {
            if (audioPanelVisible) {
              stopAudio();
            }
            setAudioPanelVisible(prev => !prev);
          }} 
          style={[styles.audioToggleBtn, audioPanelVisible && styles.audioToggleBtnActive]}
        >
          <MaterialCommunityIcons 
            name={audioPanelVisible ? "headset" : "headset-off"} 
            size={22} 
            color={audioPanelVisible ? Colors.gold : Colors.navy} 
          />
        </Pressable>

        {/* Text Size Controls */}
        <View style={styles.sizeControls}>
          <Pressable onPress={decrementFontSize} style={styles.sizeBtn}>
            <Text style={styles.sizeBtnText}>A-</Text>
          </Pressable>
          <Text style={styles.sizeValText}>{fontSize}</Text>
          <Pressable onPress={incrementFontSize} style={styles.sizeBtn}>
            <Text style={styles.sizeBtnText}>A+</Text>
          </Pressable>
        </View>
      </View>

      {/* Chapters Horizontal Scroll */}
      <View style={styles.chaptersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chaptersScrollContent}
        >
          {selectedBook.Chapters.map((_, index) => {
            const isSelected = index === selectedChapterIndex;
            return (
              <Pressable
                key={index}
                style={[
                  styles.chapterBubble,
                  isSelected && styles.chapterBubbleSelected,
                ]}
                onPress={() => handleChapterSelect(index)}
              >
                <Text
                  style={[
                    styles.chapterText,
                    isSelected && styles.chapterTextSelected,
                  ]}
                >
                  {index + 1}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Verses Reader */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.readerScroll}
        contentContainerStyle={[styles.readerContent, audioPanelVisible && { paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.chapterHeader}>
          {selectedBook.Text} {selectedChapterIndex + 1}
        </Text>
        <View style={styles.divider} />

        {currentChapter.Verses.map((v, i) => {
          const isSpeaking = i === currentSpeakingVerse;
          return (
            <Pressable
              key={i}
              onPress={() => {
                if (audioPanelVisible) {
                  stopAudio();
                  setIsPlaying(true);
                  speakVerse(i);
                }
              }}
              style={[
                styles.verseRow,
                isSpeaking && styles.verseRowSpeaking
              ]}
            >
              <Text style={[styles.verseNumber, { fontSize: fontSize * 0.75 }, isSpeaking && styles.textGold]}>
                {i + 1}
              </Text>
              <Text
                style={[
                  styles.verseText,
                  { fontSize: fontSize, lineHeight: fontSize * 1.6 },
                  isSpeaking && styles.verseTextSpeaking
                ]}
              >
                {v.Text}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bottom Audio Controller Panel */}
      {audioPanelVisible && (
        <View style={styles.audioPanel}>
          <View style={styles.audioPanelHeader}>
            <Text style={styles.audioPanelTitle}>Lecture Audio</Text>
            <Pressable onPress={() => { stopAudio(); setAudioPanelVisible(false); }} style={styles.audioCloseBtn}>
              <MaterialCommunityIcons name="close" size={20} color={Colors.grayWarm} />
            </Pressable>
          </View>
          
          <View style={styles.audioControlsRow}>
            {/* Speed Adjuster */}
            <Pressable 
              onPress={() => {
                const nextRates = [0.75, 1.0, 1.25, 1.5];
                const currentIndex = nextRates.indexOf(playbackRate);
                const nextIndex = (currentIndex + 1) % nextRates.length;
                setPlaybackRate(nextRates[nextIndex]);
              }} 
              style={styles.speedBtn}
            >
              <Text style={styles.speedBtnText}>{playbackRate}x</Text>
            </Pressable>

            {/* Play/Pause */}
            <Pressable onPress={startAudio} style={styles.playPauseBtn} disabled={isAudioLoading}>
              {isAudioLoading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <MaterialCommunityIcons 
                  name={isPlaying ? "pause" : "play"} 
                  size={28} 
                  color={Colors.white} 
                />
              )}
            </Pressable>

            {/* Stop */}
            <Pressable onPress={stopAudio} style={[styles.stopBtn, !(isPlaying || isAudioLoading) && { opacity: 0.5 }]}>
              <MaterialCommunityIcons name="stop" size={24} color={Colors.navy} />
            </Pressable>
          </View>

          {currentSpeakingVerse !== null && (
            <Text style={styles.speakingVerseIndicator}>
              Verset {currentSpeakingVerse + 1} en cours de lecture
            </Text>
          )}
        </View>
      )}

      {/* Modal - Select Book */}
      <Modal
        visible={bookModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBookModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un livre</Text>
              <Pressable
                onPress={() => setBookModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <FluentIcon name="dismiss" size={20} color={Colors.navy} />
              </Pressable>
            </View>

            {/* Testament Tabs */}
            <View style={styles.tabsContainer}>
              <Pressable
                style={[
                  styles.tabBtn,
                  testamentTab === 'old' && styles.tabBtnActive,
                ]}
                onPress={() => setTestamentTab('old')}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    testamentTab === 'old' && styles.tabBtnTextActive,
                  ]}
                >
                  Ancien Testament
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.tabBtn,
                  testamentTab === 'new' && styles.tabBtnActive,
                ]}
                onPress={() => setTestamentTab('new')}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    testamentTab === 'new' && styles.tabBtnTextActive,
                  ]}
                >
                  Nouveau Testament
                </Text>
              </Pressable>
            </View>

            {/* Books Grid */}
            <FlatList
              data={testamentTab === 'old' ? oldTestamentBooks : newTestamentBooks}
              keyExtractor={(item) => item.Text}
              numColumns={3}
              contentContainerStyle={styles.booksGrid}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.bookCard,
                    selectedBook.Text === item.Text && styles.bookCardSelected,
                  ]}
                  onPress={() => handleBookSelect(item)}
                >
                  <Text
                    style={[
                      styles.bookCardText,
                      selectedBook.Text === item.Text && styles.bookCardTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {item.Text}
                  </Text>
                  <Text style={styles.bookCardSub}>
                    {item.Chapters.length} ch.
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ivory,
  },
  selectorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(19,41,75,0.08)',
    backgroundColor: '#FFFFFF',
  },
  bookSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(19,41,75,0.04)',
  },
  bookSelectorText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.navy,
  },
  sizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19,41,75,0.04)',
    borderRadius: 12,
    padding: 2,
  },
  sizeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sizeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.navy,
  },
  sizeValText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.navy,
    paddingHorizontal: 6,
  },
  chaptersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(19,41,75,0.08)',
    paddingVertical: 8,
  },
  chaptersScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chapterBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(19,41,75,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterBubbleSelected: {
    backgroundColor: Colors.gold,
  },
  chapterText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.navy,
  },
  chapterTextSelected: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
  },
  readerScroll: {
    flex: 1,
  },
  readerContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  chapterHeader: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    height: 2,
    backgroundColor: Colors.gold,
    width: 40,
    alignSelf: 'center',
    marginBottom: 28,
    borderRadius: 1,
  },
  verseRow: {
    flexDirection: 'row',
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  verseNumber: {
    fontFamily: 'Inter_700Bold',
    color: Colors.gold,
    width: 28,
    paddingTop: 2,
    textAlign: 'right',
    paddingRight: 8,
  },
  verseText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    color: '#2C3E50',
    textAlign: 'justify',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: height * 0.75,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(19,41,75,0.06)',
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.navy,
  },
  closeModalBtn: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(19,41,75,0.03)',
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: Colors.navy,
  },
  tabBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.grayWarm,
  },
  tabBtnTextActive: {
    color: Colors.white,
  },
  booksGrid: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bookCard: {
    flex: 1,
    margin: 4,
    backgroundColor: 'rgba(19,41,75,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(19,41,75,0.04)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookCardSelected: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(168,129,57,0.05)',
  },
  bookCardText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.navy,
    marginBottom: 2,
    textAlign: 'center',
  },
  bookCardTextSelected: {
    color: Colors.gold,
  },
  bookCardSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.grayWarm,
  },
  audioToggleBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(19,41,75,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioToggleBtnActive: {
    backgroundColor: 'rgba(212,168,90,0.12)',
  },
  verseRowSpeaking: {
    backgroundColor: 'rgba(212,168,90,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    paddingVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  textGold: {
    color: Colors.gold,
  },
  verseTextSpeaking: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.navy,
  },
  audioPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(19,41,75,0.08)',
    ...Shadows.soft,
    alignItems: 'center',
  },
  audioPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  audioPanelTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  audioCloseBtn: {
    padding: 4,
  },
  audioControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    width: '100%',
    marginBottom: 8,
  },
  speedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(19,41,75,0.1)',
  },
  speedBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.navy,
  },
  playPauseBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  stopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(19,41,75,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakingVerseIndicator: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.grayWarm,
    marginTop: 4,
  },
});
