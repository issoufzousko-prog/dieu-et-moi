/**
 * Dieu et Moi -- QuickActionCard Component
 * Carte d'action rapide avec icone, titre, description et compteur
 */

import React from 'react';
import { StyleSheet, Pressable, View, ImageSourcePropType } from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Shadows } from '@/constants/Colors';
import FluentIcon, { FluentIconName } from './fluent-icons/FluentIcon';

interface QuickActionCardProps {
  iconName?: FluentIconName;
  materialIcon?: string;
  imageSource?: ImageSourcePropType;
  title: string;
  description: string;
  count: number;
  color: string;
  gradientColors?: [string, string];
  onPress?: () => void;
  imageSize?: number;
  tintColor?: string;
}

export default function QuickActionCard({
  iconName,
  materialIcon,
  imageSource,
  title,
  description,
  count,
  color,
  gradientColors,
  onPress,
  imageSize,
  tintColor,
}: QuickActionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.shadowWrapper}>
        <LinearGradient
          colors={gradientColors || ([color, color] as [string, string])}
          start={{ x: 0.15, y: 0.15 }}
          end={{ x: 0.85, y: 0.85 }}
          style={styles.iconContainer}
        >
          {imageSource ? (
            <Image
              source={imageSource}
              style={[
                styles.customImage,
                imageSize ? { width: imageSize, height: imageSize } : null
              ]}
              contentFit="contain"
              transition={200}
              tintColor={tintColor}
            />
          ) : iconName ? (
            <FluentIcon
              name={iconName}
              size={24}
              color={Colors.white}
            />
          ) : materialIcon ? (
            <MaterialCommunityIcons
              name={materialIcon as any}
              size={22}
              color={Colors.white}
            />
          ) : null}
        </LinearGradient>
      </View>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      <Text style={styles.description} numberOfLines={2}>{description}</Text>
      <Text style={styles.count}>{count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 95,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    ...Shadows.card,
  },
  cardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  shadowWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 10,
    // Ombre douce épaisse pour le relief 3D (gomme)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Bordure blanche translucide pour simuler le biseau (effet gomme moulée)
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.grayWarm,
    textAlign: 'center',
    lineHeight: 13,
    marginBottom: 10,
    minHeight: 26,
  },
  count: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 16,
    color: Colors.gold,
  },
  customImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});
