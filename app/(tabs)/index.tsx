import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import HeroHeader from '@/components/HeroHeader';
import QuickActions from '@/components/QuickActions';
import VerseCard from '@/components/VerseCard';
import FeatureGrid from '@/components/FeatureGrid';
import CTACard from '@/components/CTACard';
import FAB from '@/components/FAB';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <HeroHeader />
        <QuickActions />
        <VerseCard />
        <FeatureGrid />
        <CTACard />
      </ScrollView>
      <FAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ivory,
  },
  scrollContent: {
    paddingBottom: 96, // Espace pour le FAB et la bottom bar
  },
});
