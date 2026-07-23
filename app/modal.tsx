import React from 'react';
import { StyleSheet, View, Platform, Pressable, ScrollView } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FluentIcon from '@/components/fluent-icons/FluentIcon';
import { Colors, Shadows } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function ProfileModalScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    // La redirection vers /login est gérée automatiquement par useProtectedRoute dans _layout.tsx
  };

  const name = user?.user_metadata?.given_name || user?.user_metadata?.name || user?.user_metadata?.full_name || 'Utilisateur';
  const fullName = user?.user_metadata?.full_name || name;
  const email = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url;

  // Initiales pour le fallback de l'avatar
  const initials = name.substring(0, Math.min(name.length, 2)).toUpperCase();

  const currentGender = user?.user_metadata?.gender || 'female';

  const updateGender = async (gender: 'male' | 'female') => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { gender }
      });
      if (error) throw error;
    } catch (e) {
      console.error('Error updating gender:', e);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />

      {/* Header Modal - Close Button */}
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.headerTitle}>
          Mon Profil
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={styles.closeBtn}
          hitSlop={8}
        >
          <FluentIcon name="close" size={24} color={Colors.navy} />
        </Pressable>
      </View>

      <Divider style={styles.divider} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileSection}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initials}</Text>
            </View>
          )}

          <Text variant="headlineLarge" style={styles.nameText}>
            {fullName}
          </Text>
          <Text style={styles.emailText}>{email}</Text>

          <View style={[styles.badge, styles.googleBadge]}>
            <MaterialCommunityIcons
              name="google"
              size={14}
              color={Colors.navy}
            />
            <Text style={[styles.badgeText, styles.googleBadgeText]}>
              Connecté avec Google
            </Text>
          </View>
        </View>

        {/* Gender Selection Section */}
        <View style={styles.genderContainer}>
          <Text style={styles.sectionTitle}>Illustration de la bannière</Text>
          <View style={styles.genderRow}>
            <Pressable
              style={[
                styles.genderOption,
                currentGender === 'male' && styles.genderOptionSelected,
              ]}
              onPress={() => updateGender('male')}
            >
              <Text style={[styles.genderEmoji, currentGender === 'male' && styles.genderTextSelected]}>👨</Text>
              <Text style={[styles.genderLabel, currentGender === 'male' && styles.genderTextSelected]}>
                Homme
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.genderOption,
                currentGender === 'female' && styles.genderOptionSelected,
              ]}
              onPress={() => updateGender('female')}
            >
              <Text style={[styles.genderEmoji, currentGender === 'female' && styles.genderTextSelected]}>👩</Text>
              <Text style={[styles.genderLabel, currentGender === 'female' && styles.genderTextSelected]}>
                Femme
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <FluentIcon name="lock" size={20} color={Colors.grayWarm} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Identifiant unique</Text>
              <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
                {user?.id || 'N/A'}
              </Text>
            </View>
          </View>
          <Divider style={styles.cardDivider} />
          <View style={styles.infoRow}>
            <FluentIcon name="shield" size={20} color={Colors.grayWarm} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Sécurité de session</Text>
              <Text style={styles.infoValue}>Active (chiffrée localement)</Text>
            </View>
          </View>
          <Divider style={styles.cardDivider} />
          <View style={styles.infoRow}>
            <FluentIcon name="phone" size={20} color={Colors.grayWarm} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Version de l'application</Text>
              <Text style={styles.infoValue}>1.0.0 (Production)</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.actionContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.signOutBtn,
              pressed && styles.signOutBtnPressed,
            ]}
            onPress={handleSignOut}
          >
            <FluentIcon name="logout" size={20} color="#C53030" />
            <Text style={styles.signOutBtnText}>Se déconnecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ivory,
    paddingHorizontal: 24,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.navy,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(19,41,75,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    backgroundColor: 'rgba(212, 168, 90, 0.15)',
    marginBottom: 32,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.gold,
    ...Shadows.soft,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.gold,
    ...Shadows.soft,
  },
  avatarFallbackText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.navy,
  },
  nameText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.navy,
    marginBottom: 4,
  },
  emailText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.grayWarm,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  googleBadge: {
    backgroundColor: 'rgba(19, 41, 75, 0.08)',
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  googleBadgeText: {
    color: Colors.navy,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 90, 0.15)',
    ...Shadows.card,
    marginBottom: 40,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.grayWarm,
  },
  infoValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.navy,
    marginTop: 2,
  },
  cardDivider: {
    backgroundColor: 'rgba(212, 168, 90, 0.08)',
    marginVertical: 4,
  },
  actionContainer: {
    alignItems: 'center',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#FEB2B2',
    backgroundColor: '#FFF5F5',
    width: '100%',
  },
  signOutBtnPressed: {
    backgroundColor: '#FED7D7',
    transform: [{ scale: 0.98 }],
  },
  signOutBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#C53030',
  },
  genderContainer: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.navy,
    marginBottom: 12,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 16,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 168, 90, 0.25)',
    backgroundColor: Colors.white,
  },
  genderOptionSelected: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(212, 168, 90, 0.08)',
  },
  genderEmoji: {
    fontSize: 18,
  },
  genderLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.navy,
  },
  genderTextSelected: {
    color: Colors.goldAlt,
  },
  scrollContent: {
    paddingBottom: 32,
  },
});
