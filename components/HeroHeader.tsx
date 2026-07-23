/**
 * Dieu et Moi — HeroHeader Component
 * Section hero avec image adaptative matin/nuit, greeting et verset
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ImageBackground,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import FluentIcon from './fluent-icons/FluentIcon';
import { Colors, Gradients } from '@/constants/Colors';
import { useSmartGreeting } from '@/hooks/useSmartGreeting';
import { useAuth } from '@/contexts/AuthContext';
import { fetchHeaderVerse } from '@/lib/bible';

const { width } = Dimensions.get('window');

const heroMorningFemale = require('@/assets/images/hero-morning-female.jpg');
const heroNightFemale = require('@/assets/images/hero-night-female.png');
const heroMorningMale = require('@/assets/images/hero-morning-male.jpg');
const heroNightMale = require('@/assets/images/hero-night-male.png');

export default function HeroHeader() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const userName = isLoading
    ? ''
    : (user?.user_metadata?.given_name || user?.user_metadata?.name || user?.user_metadata?.full_name || 'Ami');
  const { isNight, message, sunIconName, period, heroTitle } = useSmartGreeting(userName);

  const [headerVerse, setHeaderVerse] = useState<{ text: string; reference: string } | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadHeaderVerse() {
      try {
        setHasError(false);
        const verse = await fetchHeaderVerse();
        if (active) setHeaderVerse(verse);
      } catch (err) {
        console.warn('Error fetching header verse:', err);
        if (active) {
          setHeaderVerse(null);
          setHasError(true);
        }
      }
    }
    loadHeaderVerse();
    return () => {
      active = false;
    };
  }, []);

  const gradientColors = isNight ? Gradients.heroNight : Gradients.heroMorning;
  const avatarUrl = user?.user_metadata?.avatar_url;

  const gender = user?.user_metadata?.gender || 'female';
  const heroMorning = gender === 'male' ? heroMorningMale : heroMorningFemale;
  const heroNight = gender === 'male' ? heroNightMale : heroNightFemale;
  const currentHeroImage = isNight ? heroNight : heroMorning;

  return (
    <View style={styles.container}>
      <View style={styles.imageBackground}>
        <Image
          source={currentHeroImage}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="bottom center"
          transition={200}
        />
        <LinearGradient
          colors={gradientColors as unknown as [string, string, ...string[]]}
          locations={[0, 0.4, 1]}
          style={styles.overlay}
        />

        {/* Profile Action Button */}
        <Pressable
          style={styles.profileBtn}
          onPress={() => router.push('/modal')}
          android_ripple={{ color: 'rgba(19,41,75,0.1)', borderless: true }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImg}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <FluentIcon
              name="user"
              size={24}
              color={Colors.white}
            />
          )}
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.greetingRow}>
            <Text
              style={[styles.greeting, isNight && styles.greetingNight]}
              numberOfLines={2}
            >
              {message}
            </Text>
            <FluentIcon
              name={sunIconName.includes('sunny') || sunIconName.includes('up') ? 'sunny' : 'sparkle'}
              size={16}
              color={Colors.gold}
            />
          </View>

          <Text
            style={[styles.title, isNight && styles.titleNight]}
            variant="displayLarge"
          >
            {heroTitle}
          </Text>

          {headerVerse ? (
            <>
              <Text style={[styles.verse, isNight && styles.verseNight]}>
                {headerVerse.text}
              </Text>
              <Text style={styles.verseRef}>{headerVerse.reference}</Text>
            </>
          ) : hasError ? (
            <Text style={[styles.verse, isNight && styles.verseNight, { opacity: 0.8, fontSize: 13, color: '#D9534F' }]}>
              Veuillez vous connecter à Internet pour charger la Parole.
            </Text>
          ) : (
            <Text style={[styles.verse, isNight && styles.verseNight, { opacity: 0.6, fontSize: 13 }]}>
              Chargement de la Parole...
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  imageBackground: {
    width: '100%',
    minHeight: 320,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  profileBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    minHeight: 320,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  greeting: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.gold,
  },
  greetingNight: {
    color: Colors.gold,
  },
  title: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 28,
    lineHeight: 34,
    color: Colors.navy,
    marginBottom: 12,
    maxWidth: 280,
  },
  titleNight: {
    color: Colors.white,
  },
  verse: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.grayWarm,
    maxWidth: 300,
  },
  verseNight: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  verseRef: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.gold,
    marginTop: 4,
  },
});
