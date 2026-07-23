/**
 * Dieu et Moi — VerseCard Component
 * Carte "Verset du jour" avec image de fond et style premium
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Shadows, Gradients } from '@/constants/Colors';
import FluentIcon from './fluent-icons/FluentIcon';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { getVerseOfDay, fetchVerseOfDay } from '@/lib/bible';

const verseMorning = require('@/assets/images/verse-morning.png');
const verseNight = require('@/assets/images/verse-night.png');

export default function VerseCard() {
  const [verse, setVerse] = useState<{ text: string; reference: string } | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const { isNight } = useTimeOfDay();

  // Load verse from Supabase and check bookmark status
  useEffect(() => {
    let active = true;

    async function initVerseAndBookmark() {
      try {
        const loadedVerse = await fetchVerseOfDay();
        if (active) {
          setVerse(loadedVerse);
          
          // Load bookmark status for the loaded verse
          const bookmarkKey = `@dieu_et_moi_bookmark_${loadedVerse.reference}`;
          const val = await AsyncStorage.getItem(bookmarkKey);
          setBookmarked(val === 'true');
        }
      } catch (err) {
        console.warn('Error loading verse or bookmark:', err);
      }
    }

    initVerseAndBookmark();

    return () => {
      active = false;
    };
  }, []);

  // Handle bookmark toggle
  const toggleBookmark = async () => {
    if (!verse) return;
    try {
      const nextVal = !bookmarked;
      setBookmarked(nextVal);
      const key = `@dieu_et_moi_bookmark_${verse.reference}`;
      await AsyncStorage.setItem(key, String(nextVal));
    } catch (err) {
      console.warn('Error toggling bookmark:', err);
    }
  };

  const currentBackground = isNight ? verseNight : verseMorning;
  const currentGradient = isNight ? Gradients.verseNight : Gradients.verseMorning;
  const textColor = isNight ? Colors.white : Colors.navy;
  const iconColor = bookmarked ? Colors.gold : (isNight ? Colors.white : Colors.navy);
  const labelColor = isNight ? Colors.gold : Colors.navy;

  if (!verse) {
    return (
      <View style={[styles.container, { height: 160, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(19,41,75,0.08)' }]}>
        <Text style={{ color: Colors.navy, fontFamily: 'Inter_600SemiBold' }}>Chargement du verset du jour...</Text>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
    >
      <View style={styles.imageBackground}>
        <Image
          source={currentBackground}
          style={[StyleSheet.absoluteFill, styles.imageStyle]}
          contentFit="cover"
          contentPosition="bottom center"
          transition={200}
        />
        <LinearGradient
          colors={currentGradient as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.overlay}
        />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.labelRow}>
              <FluentIcon
                name={isNight ? 'sparkle' : 'sunny'}
                size={20}
                color={Colors.gold}
              />
              <Text style={[styles.label, { color: labelColor }]}>
                Verset du jour
              </Text>
            </View>
            <Pressable
              onPress={toggleBookmark}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FluentIcon
                name={bookmarked ? 'bookmarkFilled' : 'bookmark'}
                size={22}
                color={iconColor}
              />
            </Pressable>
          </View>

          {/* Verse Text */}
          <Text style={[styles.verseText, { color: textColor }]}>
            {verse.text}
          </Text>
          <Text style={styles.verseRef}>{verse.reference}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 24,
    overflow: 'hidden',
    ...Shadows.soft,
    backgroundColor: Colors.white,
  },
  containerPressed: {
    transform: [{ scale: 0.98 }],
  },
  imageBackground: {
    width: '100%',
    minHeight: 160,
  },
  imageStyle: {
    borderRadius: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.navy,
  },
  verseText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 23,
    color: Colors.navy,
    marginBottom: 8,
  },
  verseRef: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.gold,
  },
});
