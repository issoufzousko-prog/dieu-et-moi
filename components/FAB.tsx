/**
 * Dieu et Moi — FAB Component
 * Floating Action Button pour ouvrir l'assistant IA
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Pressable } from 'react-native';
import FluentIcon from './fluent-icons/FluentIcon';
import { Colors, Shadows } from '@/constants/Colors';

export default function FAB() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for premium effect
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <Pressable
        style={styles.fab}
        android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: true }}
        onPress={() => {}}
      >
        <FluentIcon
          name="sparkle"
          size={26}
          color={Colors.white}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 50,
    ...Shadows.fab,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
