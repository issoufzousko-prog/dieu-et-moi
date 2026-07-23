/**
 * Dieu et Moi — FeatureGrid Component
 * Grille 2x4 des modules de l'application
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import { Colors, FeatureColors, Shadows } from '@/constants/Colors';
import FluentIcon, { FluentIconName } from './fluent-icons/FluentIcon';

import { useRouter } from 'expo-router';

interface FeatureItem {
  iconName: FluentIconName;
  imageSource?: any;
  title: string;
  description: string;
  color: string;
}

const ministereIcon = require('@/assets/images/ministere-icon.svg');

const FEATURES: FeatureItem[] = [
  {
    iconName: 'search',
    title: 'Etude',
    description: 'Approfondissez la Parole, langues bibliques',
    color: FeatureColors.etude,
  },
  {
    iconName: 'compass',
    title: 'Exploration',
    description: 'Decouvrez le monde, jumeaux numeriques',
    color: FeatureColors.exploration,
  },
  {
    iconName: 'bell',
    imageSource: ministereIcon,
    title: 'Ministere',
    description: 'Outils pour servir, sermons & predication',
    color: FeatureColors.ministere,
  },
  {
    iconName: 'heart',
    title: 'Priere',
    description: 'Communiquez avec Dieu, prieres personnalisees',
    color: FeatureColors.priere,
  },
  {
    iconName: 'people',
    title: 'Communaute',
    description: "Grandir ensemble, groupes d'etude",
    color: FeatureColors.communaute,
  },
  {
    iconName: 'bookmark',
    title: 'Mes favoris',
    description: 'Accedez a vos contenus',
    color: FeatureColors.favoris,
  },
  {
    iconName: 'flame',
    title: 'Defis spirituels',
    description: 'Grandir chaque jour',
    color: FeatureColors.defis,
  },
  {
    iconName: 'crown',
    title: 'Ressources',
    description: 'Contenus pour edifier, modules speciaux',
    color: FeatureColors.ressources,
  },
];

function FeatureCard({ item, onPress }: { item: FeatureItem; onPress?: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + '1A' }]}>
        {item.imageSource ? (
          <Image
            source={item.imageSource}
            style={styles.customIconImage}
            contentFit="contain"
            tintColor={item.color}
          />
        ) : (
          <FluentIcon
            name={item.iconName}
            size={22}
            color={item.color}
          />
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
    </Pressable>
  );
}

export default function FeatureGrid() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Explorer plus</Text>
      <View style={styles.grid}>
        {FEATURES.map((item, index) => (
          <FeatureCard
            key={index}
            item={item}
            onPress={() => {
              if (item.title === 'Etude') {
                router.push('/bible' as any);
              }
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.navy,
    marginBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '22.5%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    ...Shadows.card,
  },
  cardPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  customIconImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: 2,
  },
  cardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 8,
    color: Colors.grayWarm,
    textAlign: 'center',
    lineHeight: 11,
  },
});
