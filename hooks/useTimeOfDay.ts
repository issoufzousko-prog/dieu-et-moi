/**
 * Dieu et Moi — useTimeOfDay Hook
 * Detecte l'heure et retourne les donnees adaptatives matin/nuit
 */

import { useState, useEffect } from 'react';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

interface TimeOfDayData {
  timeOfDay: TimeOfDay;
  isNight: boolean;
  greeting: string;
  heroTitle: string;
  sunIconName: string;
}

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 21) return 'evening';
  return 'night';
}

function getGreeting(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return 'Bonjour';
    case 'afternoon': return 'Bon apres-midi';
    case 'evening': return 'Bonsoir';
    case 'night': return 'Bonsoir';
  }
}

function getHeroTitle(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return 'Que Dieu eclaire votre journee';
    case 'afternoon': return 'Que Sa grace vous accompagne';
    case 'evening': return 'Que Dieu vous accorde un doux repos';
    case 'night': return 'Que Dieu veille sur votre sommeil';
  }
}

function getSunIconName(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return 'white-balance-sunny';
    case 'afternoon': return 'white-balance-sunny';
    case 'evening': return 'moon-waning-crescent';
    case 'night': return 'moon-waning-crescent';
  }
}

export function useTimeOfDay(): TimeOfDayData {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay());

  useEffect(() => {
    // Re-check every 5 minutes
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const isNight = timeOfDay === 'evening' || timeOfDay === 'night';

  return {
    timeOfDay,
    isNight,
    greeting: getGreeting(timeOfDay),
    heroTitle: getHeroTitle(timeOfDay),
    sunIconName: getSunIconName(timeOfDay),
  };
}
