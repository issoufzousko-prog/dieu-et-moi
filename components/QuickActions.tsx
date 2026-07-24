/**
 * Dieu et Moi — QuickActions Component
 * Section horizontale scrollable avec les 4 cartes d'action
 */

import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import QuickActionCard from './QuickActionCard';
import { Colors } from '@/constants/Colors';
import FluentIcon from './fluent-icons/FluentIcon';
import { ALL_FEATURES, FeatureItem, getGradientColors } from '@/constants/Features';

export default function QuickActions() {
  const router = useRouter();

  // Select 4 random features and memoize them so they remain stable during the current session
  const ACTIONS = useMemo(() => {
    // Shuffle the features array randomly
    const shuffled = [...ALL_FEATURES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4).map(item => {
      // Parse badge or generate a random count between 5 and 20
      let countVal = 10;
      if (item.badge) {
        const parsed = parseInt(item.badge.split('/')[0], 10);
        countVal = isNaN(parsed) ? 10 : parsed;
      } else {
        countVal = Math.floor(Math.random() * 15) + 5;
      }

      return {
        id: item.id,
        iconName: item.fluentIcon,
        materialIcon: item.materialIcon,
        imageSource: item.imageSource,
        title: item.title,
        description: item.description,
        count: countVal,
        color: item.color,
        gradientColors: getGradientColors(item.color),
        imageSize: item.imageSize,
        tintColor: item.tintWhite !== false ? Colors.white : undefined,
        category: item.category,
      };
    });
  }, []);

  const handlePress = (item: typeof ACTIONS[0]) => {
    if (item.title === 'Assistant biblique') {
      router.push('/features/assistant-biblique' as any);
    } else if (item.title === 'Coach biblique') {
      router.push('/features/bible-coach' as any);
    } else if (item.title === 'Étude') {
      router.push('/bible' as any);
    } else if (item.title === 'Lecture audio') {
      router.push('/bible?audio=true' as any);
    } else if (item.title === 'Générateur de prières') {
      router.push('/features/prayer-generator' as any);
    } else if (item.title === 'Méditation guidée') {
      router.push('/features/guided-meditation' as any);
    } else {
      router.push('/features' as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pour commencer aujourd'hui</Text>
        <Pressable
          style={styles.headerLink}
          onPress={() => router.push('/features' as any)}
        >
          <Text style={styles.headerLinkText}>Tout voir</Text>
          <FluentIcon
            name="chevronRight"
            size={16}
            color={Colors.grayWarm}
          />
        </Pressable>
      </View>

      {/* Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={107}
        decelerationRate="fast"
      >
        {ACTIONS.map((action, index) => (
          <QuickActionCard
            key={action.id || index}
            {...action}
            onPress={() => handlePress(action)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.navy,
  },
  headerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerLinkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.grayWarm,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 4,
  },
});
