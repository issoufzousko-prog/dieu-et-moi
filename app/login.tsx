import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Shadows } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import GlowingCross from '@/components/GlowingCross';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Une erreur s'est produite lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* En-tête : Badge & Logo */}
        <View style={styles.topBadgeContainer}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="cross" size={24} color="#FFE27A" />
          </View>
          <Text style={styles.topBadgeText}>DIEU & MOI</Text>
        </View>

        {/* Croix lumineuse positionnée comme illustration centrale */}
        <View style={styles.crossIllustrationContainer}>
          <GlowingCross />
        </View>

        {/* Section Titre & Sous-titre */}
        <View style={styles.header}>
          <Text style={styles.title}>Dieu et Moi</Text>
          
          <View style={styles.sparkleContainer}>
            <Text style={styles.sparkle}>✦</Text>
          </View>
          
          <Text style={styles.subtitle}>
            Une relation intime guidée par{'\n'}la prière et la Parole de Dieu,{'\n'}à chaque instant de votre journée.
          </Text>
        </View>

        {/* Card Actions & Formulaire */}
        <View style={styles.actionCard}>
          {errorMsg && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#C53030" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Bouton Google */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator animating={true} color="#FFE27A" size="small" />
              <Text style={styles.loadingText}>Connexion en cours...</Text>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.darkButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleSignIn}
            >
              <View style={styles.buttonIconLeft}>
                <MaterialCommunityIcons name="google" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.separator} />
              <Text style={styles.buttonText}>
                Continuer avec Google
              </Text>
            </Pressable>
          )}

          {/* Grille des fonctionnalités en bas de la carte */}
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="book-open-variant-outline" size={22} color="#FFE27A" />
              <Text style={styles.featureLabel}>Étudiez{'\n'}la Parole</Text>
            </View>
            
            <View style={styles.featureSeparator} />
            
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="heart-outline" size={22} color="#FFE27A" />
              <Text style={styles.featureLabel}>Priez{'\n'}avec foi</Text>
            </View>
            
            <View style={styles.featureSeparator} />
            
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="sprout-outline" size={22} color="#FFE27A" />
              <Text style={styles.featureLabel}>Grandissez{'\n'}chaque jour</Text>
            </View>
            
            <View style={styles.featureSeparator} />
            
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="account-group-outline" size={22} color="#FFE27A" />
              <Text style={styles.featureLabel}>Marcher{'\n'}ensemble</Text>
            </View>
          </View>
        </View>

        {/* Pied de page */}
        <View style={styles.footerContainer}>
          <MaterialCommunityIcons name="shield-lock-outline" size={14} color="rgba(212, 168, 90, 0.6)" />
          <Text style={styles.footerText}>
            Vos données sont sécurisées et confidentielles.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030508',
  },
  crossIllustrationContainer: {
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingBottom: 40,
    alignItems: 'center',
  },
  topBadgeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 226, 122, 0.3)',
    marginBottom: 8,
  },
  topBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#FFE27A',
    letterSpacing: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia-Bold' : 'serif',
    fontWeight: '800',
    fontSize: 40,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sparkleContainer: {
    marginVertical: 8,
  },
  sparkle: {
    fontSize: 16,
    color: '#FFE27A',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255, 253, 249, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionCard: {
    backgroundColor: 'rgba(15, 20, 30, 0.7)',
    borderRadius: 28,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 90, 0.15)',
    ...Shadows.hover,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonIconLeft: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 12,
  },
  buttonText: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    textAlign: 'center',
    paddingRight: 32,
  },
  darkButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 52,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 226, 122, 0.15)',
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#FFE27A',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(197, 48, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(197, 48, 48, 0.25)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#FEB2B2',
    flex: 1,
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
  },
  featureLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    color: 'rgba(255, 226, 122, 0.65)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 12,
  },
  featureSeparator: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'center',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(212, 168, 90, 0.6)',
    textAlign: 'center',
  },
});
