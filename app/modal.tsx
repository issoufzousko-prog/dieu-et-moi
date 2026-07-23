import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Shadows } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function ProfileModalScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.given_name || 'Utilisateur';
  const email = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = name.substring(0, Math.min(name.length, 2)).toUpperCase();

  const [displayName, setDisplayName] = useState(name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [currentGender, setCurrentGender] = useState<'male' | 'female'>(
    (user?.user_metadata?.gender as 'male' | 'female') || 'female'
  );

  const effectiveAvatar = localAvatarUri || avatarUrl;

  const handleSignOut = async () => {
    await signOut();
  };

  const handlePickAvatar = useCallback(async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      (input as any).onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setIsUploadingAvatar(true);
        try {
          const ext = file.name.split('.').pop() ?? 'jpg';
          const path = `avatars/${user.id}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, file, { upsert: true, contentType: file.type });
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          const publicUrl = data.publicUrl + '?t=' + Date.now();
          await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
          setLocalAvatarUri(publicUrl);
        } catch (err: any) {
          console.warn('[ProfileModal] Avatar upload error:', err?.message);
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      input.click();
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour changer votre photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0] || !user) return;

    const asset = result.assets[0];
    setIsUploadingAvatar(true);
    try {
      const uriParts = asset.uri.split('.');
      const ext = uriParts[uriParts.length - 1] ?? 'jpg';
      const path = `avatars/${user.id}.${ext}`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl + '?t=' + Date.now();
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      setLocalAvatarUri(publicUrl);
    } catch (err: any) {
      console.warn('[ProfileModal] Avatar upload error:', err?.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [user]);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setIsSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName.trim() },
      });
      if (error) throw error;
      await supabase.from('user_profiles').upsert(
        { id: user?.id, full_name: displayName.trim() },
        { onConflict: 'id' }
      );
      setIsEditingName(false);
    } catch (err: any) {
      console.warn('[ProfileModal] Save name error:', err?.message);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleUpdateGender = async (gender: 'male' | 'female') => {
    setCurrentGender(gender);
    try {
      await supabase.auth.updateUser({ data: { gender } });
    } catch (e) {
      console.error('Error updating gender:', e);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View style={styles.topAppBar}>
        <Pressable onPress={() => router.back()} style={styles.topBackBtn} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.navy} />
          <Text style={styles.topAppTitle}>Profil Utilisateur</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.topCloseBtn} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={20} color={Colors.grayWarm} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Luxury Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlowEffect} />
          <View style={styles.heroGlowSecondary} />

          {/* Avatar Container */}
          <Pressable onPress={handlePickAvatar} style={styles.avatarWrapper}>
            {isUploadingAvatar ? (
              <View style={styles.avatarFallback}>
                <ActivityIndicator color={Colors.gold} />
              </View>
            ) : effectiveAvatar ? (
              <Image
                source={{ uri: effectiveAvatar }}
                style={styles.avatar}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraFab}>
              <MaterialCommunityIcons name="camera-outline" size={16} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Name & Edit Section */}
          {isEditingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                style={styles.nameInput}
                value={displayName}
                onChangeText={setDisplayName}
                autoFocus
                placeholderTextColor="rgba(255,255,255,0.4)"
                placeholder="Votre nom complet"
                onSubmitEditing={handleSaveName}
                returnKeyType="done"
              />
              <View style={styles.nameEditActions}>
                <Pressable onPress={handleSaveName} style={styles.actionIconButton} disabled={isSavingName}>
                  {isSavingName
                    ? <ActivityIndicator color={Colors.gold} size="small" />
                    : <MaterialCommunityIcons name="check" size={18} color={Colors.gold} />
                  }
                </Pressable>
                <Pressable
                  onPress={() => { setIsEditingName(false); setDisplayName(name); }}
                  style={styles.actionIconButton}
                >
                  <MaterialCommunityIcons name="close" size={18} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setIsEditingName(true)} style={styles.nameContainer}>
              <Text style={styles.heroName}>{displayName}</Text>
              <View style={styles.editBadge}>
                <MaterialCommunityIcons name="pencil" size={12} color={Colors.gold} />
              </View>
            </Pressable>
          )}

          <View style={styles.emailContainer}>
            <MaterialCommunityIcons name="email-outline" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.heroEmail}>{email}</Text>
          </View>
        </View>

        {/* Section: Genre & Bannière (MUI 3 Styled Toggle Group - NO EMOJIS) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Illustration de la bannière</Text>
          <Text style={styles.sectionSubtitle}>Sélectionnez votre profil d'affichage</Text>
          <View style={styles.genderToggleGroup}>
            <Pressable
              style={[
                styles.genderSegment,
                currentGender === 'male' && styles.genderSegmentActive,
              ]}
              onPress={() => handleUpdateGender('male')}
            >
              <MaterialCommunityIcons
                name="account-tie"
                size={22}
                color={currentGender === 'male' ? Colors.goldAlt : Colors.navy}
              />
              <Text
                style={[
                  styles.genderSegmentText,
                  currentGender === 'male' && styles.genderSegmentTextActive,
                ]}
              >
                Homme
              </Text>
              {currentGender === 'male' && (
                <View style={styles.checkIndicator}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color={Colors.goldAlt} />
                </View>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.genderSegment,
                currentGender === 'female' && styles.genderSegmentActive,
              ]}
              onPress={() => handleUpdateGender('female')}
            >
              <MaterialCommunityIcons
                name="account-dress"
                size={22}
                color={currentGender === 'female' ? Colors.goldAlt : Colors.navy}
              />
              <Text
                style={[
                  styles.genderSegmentText,
                  currentGender === 'female' && styles.genderSegmentTextActive,
                ]}
              >
                Femme
              </Text>
              {currentGender === 'female' && (
                <View style={styles.checkIndicator}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color={Colors.goldAlt} />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Section: Compte & Connexion (MUI 3 Card Style) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Compte lié</Text>
          <View style={styles.accountCard}>
            <View style={styles.accountIconBox}>
              <MaterialCommunityIcons name="google" size={20} color={Colors.navy} />
            </View>
            <View style={styles.accountMetaInfo}>
              <Text style={styles.accountProviderTitle}>Google Workspace</Text>
              <Text style={styles.accountEmailText} numberOfLines={1}>
                {email}
              </Text>
            </View>
            <View style={styles.statusChip}>
              <View style={styles.statusDot} />
              <Text style={styles.statusChipText}>Connecté</Text>
            </View>
          </View>
        </View>

        {/* Action: Déconnexion (MUI 3 Outlined Danger Button) */}
        <View style={styles.actionSection}>
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
            onPress={handleSignOut}
          >
            <MaterialCommunityIcons name="logout-variant" size={18} color="#D32F2F" />
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ivory,
  },

  /* Top Bar */
  topAppBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(19, 41, 75, 0.08)',
    ...Shadows.card,
  },
  topBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topAppTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.navy,
  },
  topCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(19, 41, 75, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  /* Hero Card (Modern Dark Navy Gradient Banner) */
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 24,
    ...Shadows.hover,
  },
  heroGlowEffect: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(212, 168, 90, 0.15)',
  },
  heroGlowSecondary: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
  },

  /* Avatar & FAB Camera */
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: Colors.gold,
  },
  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(212, 168, 90, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.gold,
  },
  avatarFallbackText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.gold,
  },
  cameraFab: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
    ...Shadows.soft,
  },

  /* Name & Edit */
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  heroName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  editBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 168, 90, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
  },

  nameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
    width: '100%',
    maxWidth: 280,
  },
  nameInput: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 6,
  },
  nameEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconButton: {
    padding: 6,
  },

  /* Section Containers */
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.navy,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.grayWarm,
    marginBottom: 12,
  },

  /* Gender Toggle Group (MUI 3 Segmented Cards - NO EMOJIS) */
  genderToggleGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  genderSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(19, 41, 75, 0.1)',
    backgroundColor: Colors.white,
    position: 'relative',
    ...Shadows.card,
  },
  genderSegmentActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(212, 168, 90, 0.08)',
  },
  genderSegmentText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.navy,
  },
  genderSegmentTextActive: {
    color: Colors.navy,
    fontFamily: 'Inter_700Bold',
  },
  checkIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },

  /* Account Card (MUI 3 Styled Item) */
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(19, 41, 75, 0.08)',
    ...Shadows.card,
  },
  accountIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(19, 41, 75, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  accountMetaInfo: {
    flex: 1,
  },
  accountProviderTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.navy,
  },
  accountEmailText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.grayWarm,
    marginTop: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
  },
  statusChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#2E7D32',
  },

  /* Logout Button */
  actionSection: {
    marginTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#EF5350',
    backgroundColor: '#FFEBEE',
  },
  logoutButtonPressed: {
    backgroundColor: '#FFCDD2',
    transform: [{ scale: 0.99 }],
  },
  logoutButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#D32F2F',
  },
});
