import { useState, useEffect } from 'react';
import { cache } from '@/lib/cache';
import { fetchVerseOfDay } from '@/lib/bible';
import { supabase } from '@/lib/supabase';

export type TimePeriod = 'aube' | 'matin' | 'midi' | 'apres-midi' | 'soiree' | 'nuit';

interface GreetingData {
  period: TimePeriod;
  isNight: boolean;
  message: string;      // Simple greeting: "Bonjour, [Nom]" or "Bonsoir, [Nom]"
  sunIconName: string;
  heroTitle: string;    // Dynamic blessing (AI-powered or local fallback)
}

// Détermine la période exacte de la journée
function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour < 8) return 'aube';          // 5h - 8h : Aube
  if (hour >= 8 && hour < 12) return 'matin';        // 8h - 12h : Matinée
  if (hour >= 12 && hour < 14) return 'midi';        // 12h - 14h : Midi/Pause
  if (hour >= 14 && hour < 18) return 'apres-midi';  // 14h - 18h : Après-midi
  if (hour >= 18 && hour < 22) return 'soiree';      // 18h - 22h : Soirée
  return 'nuit';                                     // 22h - 5h : Nuit
}



function getSunIcon(period: TimePeriod): string {
  switch (period) {
    case 'aube':
      return 'weather-sunset-up';
    case 'matin':
    case 'midi':
      return 'white-balance-sunny';
    case 'apres-midi':
      return 'weather-sunny';
    case 'soiree':
      return 'weather-sunset-down';
    case 'nuit':
      return 'weather-night';
  }
}

// Helper pour obtenir la salutation simple selon la période
function getSimpleGreeting(period: TimePeriod, name: string): string {
  switch (period) {
    case 'aube':
    case 'matin':
      return `Bonjour, ${name}`;
    case 'midi':
    case 'apres-midi':
      return `Bon après-midi, ${name}`;
    case 'soiree':
    case 'nuit':
      return `Bonsoir, ${name}`;
    default:
      return `Bonjour, ${name}`;
  }
}

const VISIT_COUNT_KEY = '@dieu_et_moi_visit_count';
const LAST_VISIT_TIME_KEY = '@dieu_et_moi_last_visit_time';
const CACHED_HERO_TITLE_KEY = '@dieu_et_moi_cached_hero_title';
const CACHED_HERO_TITLE_PERIOD_KEY = '@dieu_et_moi_cached_hero_title_period';

export function useSmartGreeting(userName: string): GreetingData {
  const [hour, setHour] = useState(new Date().getHours());
  const period = getTimePeriod(hour);
  const isNight = period === 'soiree' || period === 'nuit';
  const sunIconName = getSunIcon(period);

  // La salutation courte reste simple et synchrone
  const message = getSimpleGreeting(period, userName);

  // Le titre principal commence vide et est chargé depuis le cache / l'IA
  const [heroTitle, setHeroTitle] = useState<string>("");

  // Met à jour l'heure régulièrement
  useEffect(() => {
    const interval = setInterval(() => {
      setHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Gestion des visites et chargement/génération du titre dynamique via IA
  useEffect(() => {
    let active = true;

    async function manageHeroTitle() {
      try {
        const now = new Date();
        const lastVisitStr = await cache.getItem(LAST_VISIT_TIME_KEY);
        const savedCountStr = await cache.getItem(VISIT_COUNT_KEY);
        const cachedHeroTitle = await cache.getItem(CACHED_HERO_TITLE_KEY);
        const cachedPeriod = await cache.getItem(CACHED_HERO_TITLE_PERIOD_KEY);

        let visits = 1;
        let isNewVisit = false;

        if (lastVisitStr && savedCountStr) {
          const lastVisit = new Date(parseInt(lastVisitStr, 10));
          const savedCount = parseInt(savedCountStr, 10);

          if (now.toDateString() !== lastVisit.toDateString()) {
            visits = 1;
            isNewVisit = true;
          } else if (now.getTime() - lastVisit.getTime() > 30 * 60 * 1000) {
            visits = savedCount + 1;
            isNewVisit = true;
          } else {
            visits = savedCount;
          }
        } else {
          isNewVisit = true;
        }

        // Sauvegarde de l'état de la visite
        await cache.setItem(LAST_VISIT_TIME_KEY, now.getTime().toString());
        await cache.setItem(VISIT_COUNT_KEY, visits.toString());

        // Si on a un titre en cache pour la bonne période, on l'affiche immédiatement
        if (cachedHeroTitle && cachedPeriod === period) {
          if (active) setHeroTitle(cachedHeroTitle);
        }

        // Si c'est une nouvelle visite ou si le cache est expiré, on génère une nouvelle bénédiction IA
        if (isNewVisit || !cachedHeroTitle || cachedPeriod !== period) {
          // Récupérer le verset d'inspiration du jour
          const todayVerse = await fetchVerseOfDay(now);

          // Appeler l'Edge Function Supabase de manière sécurisée (le SDK attache automatiquement le jeton de session JWT)
          const { data, error: funcError } = await supabase.functions.invoke('ai-proxy', {
            body: {
              period: period,
              visits: visits,
              verseText: todayVerse.text,
              verseRef: todayVerse.reference,
            },
          });

          if (funcError || !data) {
            throw new Error(funcError?.message || 'Erreur lors de l\'appel de la fonction ai-proxy');
          }

          let aiTitle = data.heroTitle || '';

          // Nettoyage des guillemets et caractères de formatage
          if (aiTitle) {
            aiTitle = aiTitle.replace(/^["'«\s]+|["'»\s]+$/g, '').trim();
          }

          if (aiTitle && aiTitle.length > 3) {
            await cache.setItem(CACHED_HERO_TITLE_KEY, aiTitle);
            await cache.setItem(CACHED_HERO_TITLE_PERIOD_KEY, period);
            if (active) setHeroTitle(aiTitle);
          }
        }
      } catch (error) {
        console.warn("Error managing AI dynamic hero title:", error);
      }
    }

    manageHeroTitle();

    return () => {
      active = false;
    };
  }, [userName, period]);

  return {
    period,
    isNight,
    message,
    sunIconName,
    heroTitle,
  };
}
