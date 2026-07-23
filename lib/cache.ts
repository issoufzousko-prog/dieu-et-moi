import { createMMKV, MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let mmkvStore: MMKV | null = null;

if (Platform.OS !== 'web') {
  try {
    mmkvStore = createMMKV({
      id: 'dieu_et_moi_app_cache',
    });
  } catch (err) {
    console.warn('Failed to initialize MMKV, falling back to AsyncStorage:', err);
  }
}

/**
 * CacheManager unifié de haute performance.
 * Utilise MMKV (écrit en C++ via JSI) sur iOS/Android pour des lectures/écritures ultra-rapides,
 * et bascule automatiquement sur AsyncStorage sur le Web ou en cas d'erreur d'initialisation.
 */
export const cache = {
  /**
   * Récupère un élément du cache
   */
  getItem: async (key: string): Promise<string | null> => {
    if (mmkvStore) {
      try {
        return mmkvStore.getString(key) ?? null;
      } catch (err) {
        console.warn('MMKV read error, falling back to AsyncStorage:', err);
      }
    }
    return await AsyncStorage.getItem(key);
  },
  
  /**
   * Enregistre un élément dans le cache
   */
  setItem: async (key: string, value: string): Promise<void> => {
    if (mmkvStore) {
      try {
        mmkvStore.set(key, value);
        return;
      } catch (err) {
        console.warn('MMKV write error, falling back to AsyncStorage:', err);
      }
    }
    await AsyncStorage.setItem(key, value);
  },
  
  /**
   * Supprime un élément du cache
   */
  removeItem: async (key: string): Promise<void> => {
    if (mmkvStore) {
      try {
        mmkvStore.remove(key);
        return;
      } catch (err) {
        console.warn('MMKV delete error, falling back to AsyncStorage:', err);
      }
    }
    await AsyncStorage.removeItem(key);
  },

  /**
   * Vide entièrement le cache
   */
  clearAll: async (): Promise<void> => {
    if (mmkvStore) {
      try {
        mmkvStore.clearAll();
        return;
      } catch (err) {
        console.warn('MMKV clear error, falling back to AsyncStorage:', err);
      }
    }
    await AsyncStorage.clear();
  }
};
