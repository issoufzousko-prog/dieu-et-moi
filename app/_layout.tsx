import { useFonts } from 'expo-font';
import { Stack, useSegments, useRouter, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { PaperProvider } from 'react-native-paper';
import { DieuEtMoiTheme } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <PaperProvider theme={DieuEtMoiTheme}>
        <RootLayoutNav />
      </PaperProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    console.log('Redirect Hook - State:', {
      sessionExists: !!session,
      isLoading,
      segments,
      navReady: !!navigationState?.key
    });

    // Attendre que la navigation soit complètement montée et que le chargement soit fini
    if (!navigationState?.key || isLoading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!session && !inAuthGroup) {
      console.log('Redirect Hook - Action: Redirecting to /login');
      router.replace('/login');
    } else if (session && inAuthGroup) {
      console.log('Redirect Hook - Action: Redirecting to /(tabs)');
      router.replace('/(tabs)');
    } else {
      console.log('Redirect Hook - Action: No redirect needed');
    }
  }, [session, isLoading, segments, navigationState?.key]);

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Profil' }} />
      <Stack.Screen
        name="bible/index"
        options={{
          title: 'Sainte Bible',
          headerBackTitle: 'Retour',
          headerStyle: { backgroundColor: '#FBF9F4' },
          headerTintColor: '#13294B',
          headerTitleStyle: { fontFamily: 'Inter_700Bold' },
        }}
      />
      <Stack.Screen
        name="features/index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

