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
      Alert.alert('Permission requise', "Autorisez l'acces a la galerie pour changer votre photo.");
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

      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroCircleDecor} />

        {/* Close Button */}
        <Pressable
          onPress={() => router.back()}
          style={styles.closeBtn}
          hitSlop={12}
        >
          <MaterialCommunityIcons name="close" size={20} color="#fff" />
        </Pressable>

        {/* Avatar clickable */}
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
          <View style={styles.cameraOverlay}>
            <MaterialCommunityIcons name="camera" size={15} color="#fff" />
          </View>
        </Pressable>

        {/* Name editable */}
        {isEditingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
              placeholderTextColor="rgba(255,255,255,0.5)"
              placeholder="Votre nom..."
              onSubmitEditing={handleSaveName}
              returnKeyType="done"
            />
            <Pressable onPress={handleSaveName} style={styles.saveNameBtn} disabled={isSavingName}>
              {isSavingName
                ? <ActivityIndicator color={Colors.gold} size="small" />
                : <MaterialCommunityIcons name="check" size={20} color={Colors.gold} />
              }
            </Pressable>
            <Pressable
              onPress={() => { setIsEditingName(false); setDisplayName(name); }}
              style={styles.cancelNameBtn}
            >
              <MaterialCommunityIcons name="close" size={18} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setIsEditingName(true)} style={styles.namePressable}>
            <Text style={styles.heroName}>{displayName}</Text>
            <MaterialCommunityIcons
              name="pencil-outline"
              size={15}
              color="rgba(255,255,255,0.5)"
              style={{ marginLeft: 6, marginTop: 2 }}
            />
          </Pressable>
        )}

        <Text style={styles.heroEmail}>{email}</Text>
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Genre / Banner avatar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Illustration de la banniere</Text>
          <View style={styles.genderRow}>
            <Pressable
              style={[styles.genderOption, currentGender === 'male' && styles.genderOptionSelected]}
              onPress={() => handleUpdateGender('male')}
            >
              <Text style={styles.genderEmoji}>👨</Text>
              <Text style={[styles.genderLabel, currentGender === 'male' && styles.genderLabelSelected]}>
                Homme
              </Text>
              {currentGender === 'male' && (
                <View style={styles.genderCheck}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={Colors.gold} />
                </View>
              )}
            </Pressable>
            <Pressable
              style={[styles.genderOption, currentGender === 'female' && styles.genderOptionSelected]}
              onPress={() => handleUpdateGender('female')}
            >
              <Text style={styles.genderEmoji}>👩</Text>
              <Text style={[styles.genderLabel, currentGender === 'female' && styles.genderLabelSelected]}>
                Femme
              </Text>
              {currentGender === 'female' && (
                <View style={styles.genderCheck}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={Colors.gold} />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <Divider style={styles.sectionDivider} />

        {/* Compte lie */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte lie</Text>
          <View style={styles.providerRow}>
            <View style={styles.providerIconBox}>
              <MaterialCommunityIcons name="google" size={22} color={Colors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Google</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{email}</Text>
            </View>
            <View style={styles.connectedBadge}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedBadgeText}>Connecte</Text>
            </View>
          </View>
        </View>

        <Divider style={styles.sectionDivider} />

        {/* Deconnexion */}
        <View style={[styles.section, { paddingTop: 12 }]}>
          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutBtnPressed]}
            onPress={handleSignOut}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#C53030" />
            <Text style={styles.signOutBtnText}>Se deconnecter</Text>
          </Pressable>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ivory,
  },

  /* Hero Banner */
  heroBanner: {
    backgroundColor: Colors.navy,
    paddingTop: Platform.OS === 'web' ? 36 : 56,
    paddingBottom: 32,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroCircleDecor: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(212,168,90,0.1)',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 14 : 52,
    right: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  /* Avatar */
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: Colors.gold,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(212,168,90,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.gold,
  },
  avatarFallbackText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    color: Colors.gold,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.navy,
  },

  /* Name editing */
  namePressable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  heroEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  nameInput: {
    flex: 1,
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.gold,
    paddingVertical: 4,
    paddingHorizontal: 2,
    textAlign: 'center',
  },
  saveNameBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212,168,90,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelNameBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Scroll */
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.grayWarm,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  sectionDivider: {
    backgroundColor: 'rgba(212,168,90,0.12)',
    marginHorizontal: 24,
  },

  /* Gender */
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(212,168,90,0.2)',
    backgroundColor: Colors.white,
    position: 'relative',
    ...Shadows.card,
  },
  genderOptionSelected: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(212,168,90,0.06)',
  },
  genderEmoji: {
    fontSize: 20,
  },
  genderLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.navy,
  },
  genderLabelSelected: {
    color: Colors.goldAlt,
  },
  genderCheck: {
    position: 'absolute',
    top: 6,
    right: 8,
  },

  /* Provider */
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,168,90,0.12)',
    ...Shadows.card,
  },
  providerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(19,41,75,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.navy,
  },
  infoValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.grayWarm,
    marginTop: 2,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(72,187,120,0.1)',
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38A169',
  },
  connectedBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#2F855A',
  },

  /* Sign Out */
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 26,
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
});
