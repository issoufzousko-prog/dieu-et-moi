import { supabase } from '../supabase';

export interface TraccarPosition {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  timestamp: number;
}

export class TraccarTrackerService {
  private static instance: TraccarTrackerService;
  private trackingInterval: any = null;
  private backendUrl: string = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dieu-et-moi-api.onrender.com';

  private constructor() {}

  public static getInstance(): TraccarTrackerService {
    if (!TraccarTrackerService.instance) {
      TraccarTrackerService.instance = new TraccarTrackerService();
    }
    return TraccarTrackerService.instance;
  }

  // --- DÉMARRER LE SUIVI GPS CLIENT TEMPS RÉEL (PROTOCOLE TRACCAR / OSMAND) ---
  public startTracking(userId: string, intervalMs: number = 30000) {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }

    console.log(`[Traccar Client Service] Démarrage du suivi GPS temps réel pour User ${userId}...`);

    // Capture immédiate initiale
    this.captureAndSendLocation(userId);

    // Capture périodique
    this.trackingInterval = setInterval(() => {
      this.captureAndSendLocation(userId);
    }, intervalMs);
  }

  public stopTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
      console.log('[Traccar Client Service] Suivi GPS arrêté.');
    }
  }

  private async captureAndSendLocation(userId: string) {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const accuracy = position.coords.accuracy;
          const speed = position.coords.speed || 0;
          const timestamp = Math.floor(Date.now() / 1000);

          await this.sendTraccarPacket({
            userId,
            latitude: lat,
            longitude: lon,
            accuracy,
            speed,
            timestamp
          });
        },
        async (error) => {
          console.warn('[Traccar Client Service] GPS non disponible, repli sur géolocalisation IP:', error.message);
          await this.fallbackIpLocation(userId);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      await this.fallbackIpLocation(userId);
    }
  }

  // REPLI GEOLOCALISATION PAR IP QUAND LE GPS DU NAVIGATEUR EST REFUSÉ OU INACTIF
  private async fallbackIpLocation(userId: string) {
    try {
      const res = await fetch('http://ip-api.com/json/');
      if (res.ok) {
        const data = await res.json();
        if (data && data.lat && data.lon) {
          await this.sendTraccarPacket({
            userId,
            latitude: data.lat,
            longitude: data.lon,
            timestamp: Math.floor(Date.now() / 1000)
          });
        }
      }
    } catch (e: any) {
      console.warn('[Traccar Client Service] Echec géolocalisation IP:', e.message);
    }
  }

  // ÉMISSION DU PAQUET HTTP PROTOCOLE TRACCAR / OSMAND VERS LE BACKEND
  public async sendTraccarPacket(pos: TraccarPosition): Promise<boolean> {
    try {
      const url = `${this.backendUrl}/api/traccar/location?id=${encodeURIComponent(pos.userId)}&lat=${pos.latitude}&lon=${pos.longitude}&timestamp=${pos.timestamp}`;
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        console.log(`[Traccar Client Service] Paquet GPS transmis pour ${pos.userId}: [${pos.longitude}, ${pos.latitude}]`);
        return true;
      }
      return false;
    } catch (e: any) {
      console.warn('[Traccar Client Service] Echec émission paquet Traccar:', e.message);
      return false;
    }
  }
}
