/**
 * Dieu et Moi — CTACard Component
 * Carte "Besoin d'aide ?" pour chatter avec l'assistant biblique IA
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import FluentIcon from './fluent-icons/FluentIcon';
import { Colors, Shadows } from '@/constants/Colors';

export default function CTACard() {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={() => {}}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <FluentIcon
            name="chat"
            size={22}
            color={Colors.navy}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Besoin d'aide ?</Text>
          <Text style={styles.description}>Discutez avec votre assistant biblique IA</Text>
        </View>
      </View>
      <FluentIcon
        name="chevronRight"
        size={18}
        color={Colors.grayWarm}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    marginVertical: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 90, 0.15)',
    ...Shadows.soft,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(19, 41, 75, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.navy,
    marginBottom: 2,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.grayWarm,
    lineHeight: 14,
  },
});
