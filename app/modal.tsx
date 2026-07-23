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
import { Text } from 'react-native-paper';
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
    <View style={styles.webViewportWrapper}>
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* Top Header Bar */}
        <View style={styles.topAppBar}>
          <Pressable onPress={() => router.back()} style={styles.topBackBtn} hitSlop={10}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.navy} />
            <Text style={styles.topAppTitle}>Profil</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.topCloseBtn} hitSlop={10}>
            <MaterialCommunityIcons name="close" size={20} color={Colors.grayWarm} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero Banner Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroGlowEffect} />

            {/* Avatar */}
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
                <MaterialCommunityIcons name="camera-outline" size={14} color="#FFFFFF" />
              </View>
            </Pressable>

            {/* Editable Name */}
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

            <Text style={styles.heroEmail}>{email}</Text>
          </View>

          {/* Section: Genre / Illustration (MUI 3 Styled - NO EMOJIS) */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeaderTitle}>Illustration de la bannière</Text>
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
                  size={20}
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
                  <MaterialCommunityIcons name="check-circle" size={16} color={Colors.goldAlt} />
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
                  size={20}
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
                  <MaterialCommunityIcons name="check-circle" size={16} color={Colors.goldAlt} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Section: Compte lié */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeaderTitle}>Compte lié</Text>
            <View style={styles.accountCard}>
              <View style={styles.accountIconBox}>
                <MaterialCommunityIcons name="google" size={18} color={Colors.navy} />
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

          {/* Action: Déconnexion */}
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

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webViewportWrapper: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 450,
    backgroundColor: Colors.ivory,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 25,
    elevation: 8,
  },

  /* Top Bar */
  topAppBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(19, 41, 75, 0.08)',
    ...Shadows.card,
  },
  topBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topAppTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: Colors.navy,
  },
  topCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(19, 41, 75, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 20,
    ...Shadows.hover,
  },
  heroGlowEffect: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(212, 168, 90, 0.15)',
  },

  /* Avatar & FAB */
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: Colors.gold,
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(212, 168, 90, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.gold,
  },
  avatarFallbackText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: Colors.gold,
  },
  cameraFab: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
  },

  /* Name & Edit */
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  heroName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#FFFFFF',
  },
  editBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(212, 168, 90, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
  },

  nameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 6,
    width: '100%',
    maxWidth: 240,
  },
  nameInput: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 4,
  },
  nameEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionIconButton: {
    padding: 4,
  },

  /* Section */
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.navy,
    marginBottom: 10,
    letterSpacing: 0.1,
  },

  /* Gender Segmented Cards */
  genderToggleGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  genderSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(19, 41, 75, 0.1)',
    backgroundColor: Colors.white,
    ...Shadows.card,
  },
  genderSegmentActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(212, 168, 90, 0.08)',
  },
  genderSegmentText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.navy,
  },
  genderSegmentTextActive: {
    color: Colors.navy,
    fontFamily: 'Inter_700Bold',
  },

  /* Account Card */
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(19, 41, 75, 0.08)',
    ...Shadows.card,
  },
  accountIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(19, 41, 75, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountMetaInfo: {
    flex: 1,
  },
  accountProviderTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.navy,
  },
  accountEmailText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.grayWarm,
    marginTop: 1,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
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
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
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
    fontSize: 13,
    color: '#D32F2F',
  },
});
