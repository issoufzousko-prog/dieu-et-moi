import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, oauthHash } from '../lib/supabase';

// Complète la session pour le flux web unique
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: any | null;
  user: any | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Aide à extraire les paramètres d'un fragment de hachage (#) URL de type OAuth
const parseHashParams = (url: string) => {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return {};
  const hash = url.substring(hashIndex + 1);
  const params: Record<string, string> = {};
  hash.split('&').forEach((pair) => {
    const [key, val] = pair.split('=');
    if (key && val) {
      params[key] = decodeURIComponent(val);
    }
  });
  return params;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let subscription: any = null;

    async function loadSession() {
      try {
        // Fallback pour le Web : Si un hash initial a été capturé avant d'être effacé par le routeur
        if (Platform.OS === 'web' && oauthHash) {
          const hashParams = parseHashParams(oauthHash);
          const accessToken = hashParams.access_token;
          const refreshToken = hashParams.refresh_token;
          
          if (accessToken && refreshToken) {
            console.log('Supabase Auth - Setting session from captured web hash...');
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }

        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log('Supabase Auth - initialSession exists:', !!initialSession);
        
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
        }

        const { data } = supabase.auth.onAuthStateChange((event, currentSession) => {
          console.log('Supabase Auth - onAuthStateChange event:', event, 'session exists:', !!currentSession);
          setSession(currentSession);
          setUser(currentSession?.user || null);

          if (currentSession?.user) {
            const u = currentSession.user;
            supabase.from('user_profiles').upsert({
              id: u.id,
              full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Membre Dieu & Moi',
              avatar_url: u.user_metadata?.avatar_url || null
            }).then(({ error }) => {
              if (error) console.warn('[AuthContext] Synchro profil utilisateur:', error.message);
            });
          }
          
          // Ne pas enlever le chargement si on attend l'événement SIGNED_IN d'une redirection en cours
          const hasHashToken = Platform.OS === 'web' && (window.location.hash.includes('access_token') || oauthHash.includes('access_token'));
          if (hasHashToken && event === 'INITIAL_SESSION') {
            console.log('Supabase Auth - Waiting for SIGNED_IN event before removing loader...');
            return;
          }
          setIsLoading(false);
        });
        subscription = data.subscription;
      } catch (e) {
        console.error('Error loading session:', e);
      } finally {
        // Conserver le chargement actif s'il y a un jeton dans le hash de l'URL
        const hasHashToken = Platform.OS === 'web' && (window.location.hash.includes('access_token') || oauthHash.includes('access_token'));
        if (!hasHashToken) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Écoute les liens profonds (Deep Linking) pour les redirections OAuth sur mobile natif
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleDeepLink = async ({ url }: { url: string }) => {
      try {
        // Lecture des paramètres de requête standards (?)
        const { queryParams } = Linking.parse(url);
        let accessToken = queryParams?.access_token as string;
        let refreshToken = queryParams?.refresh_token as string;

        // Repli : Lecture des paramètres du fragment de hachage (#) (comportement par défaut Supabase OAuth)
        if (!accessToken || !refreshToken) {
          const hashParams = parseHashParams(url);
          accessToken = hashParams.access_token;
          refreshToken = hashParams.refresh_token;
        }

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
          }
        }
      } catch (err) {
        console.error('Deep link error:', err);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const redirectUrl = Linking.createURL('(tabs)');
      console.log('Google Auth - Generated Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          console.log('Google Auth - Opening in-app browser for URL:', data.url);
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          console.log('Google Auth - Browser result:', result);

          if (result.type === 'success' && result.url) {
            const hashParams = parseHashParams(result.url);
            const accessToken = hashParams.access_token;
            const refreshToken = hashParams.refresh_token;

            if (accessToken && refreshToken) {
              console.log('Google Auth - Session tokens found. Setting session...');
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (sessionError) throw sessionError;
              if (sessionData.session) {
                setSession(sessionData.session);
                setUser(sessionData.session.user);
                console.log('Google Auth - Session successfully set!');
              }
            } else {
              console.warn('Google Auth - Access token or Refresh token missing from redirect URL');
            }
          } else {
            console.log('Google Auth - Browser closed or canceled. Result type:', result.type);
          }
        }
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
