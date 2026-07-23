import { supabase } from '../supabase';

export interface SpatialNode {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  spiritualStatus: string | null;
  presenceStatus: 'online' | 'in_prayer' | 'away' | 'offline';
  coordinates: [number, number]; // [lon, lat]
  friendshipStatus: 'pending' | 'accepted' | 'blocked' | null;
  isRequester: boolean;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  createdAt: string;
}

export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-ended';
  senderId: string;
  receiverId: string;
  sdp?: any;
  candidate?: any;
}

export class SocialGraphService {
  private static instance: SocialGraphService;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private realtimeChannel: any = null;

  private constructor() {}

  public static getInstance(): SocialGraphService {
    if (!SocialGraphService.instance) {
      SocialGraphService.instance = new SocialGraphService();
    }
    return SocialGraphService.instance;
  }

  // --- 1. REQUÊTE SPATIALE DYNAMIQUE SANS DONNÉES EN DUR ---
  public async fetchSpatialNodesInBBox(
    backendUrl: string,
    bbox: [number, number, number, number], // [minLon, minLat, maxLon, maxLat]
    currentUserId: string
  ): Promise<SpatialNode[]> {
    try {
      const response = await fetch(`${backendUrl}/api/social/spatial-nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox, currentUserId })
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur spatial: ${response.statusText}`);
      }

      const data = await response.json();
      return data.nodes || [];
    } catch (error: any) {
      console.warn('[SocialGraphService] Echec chargement noeuds spatiaux:', error.message);
      return [];
    }
  }

  // --- 2. GESTION DES RELATIONS DE GRAPHE SOCIAL ---
  public async sendFriendRequest(currentUserId: string, targetUserId: string): Promise<boolean> {
    const { error } = await supabase
      .from('social_friendships')
      .insert([
        { requester_id: currentUserId, receiver_id: targetUserId, status: 'pending' }
      ]);
    
    if (error) {
      console.error('[SocialGraphService] Echec demande amitie:', error.message);
      return false;
    }
    return true;
  }

  public async acceptFriendRequest(currentUserId: string, requesterUserId: string): Promise<boolean> {
    const { error } = await supabase
      .from('social_friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .match({ requester_id: requesterUserId, receiver_id: currentUserId });

    if (error) {
      console.error('[SocialGraphService] Echec acceptation amitie:', error.message);
      return false;
    }
    return true;
  }

  // --- 3. ABONNEMENT TEMPS RÉEL (WEBSOCKET PRESENCE & SIGNALISATION) ---
  public subscribeToRealtimeSignaling(
    currentUserId: string,
    onSignalReceived: (signal: WebRTCSignal) => void,
    onPresenceChange: (presences: any) => void
  ) {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    this.realtimeChannel = supabase.channel(`social-signal-${currentUserId}`, {
      config: { presence: { key: currentUserId } }
    });

    this.realtimeChannel
      .on('broadcast', { event: 'webrtc-signal' }, (payload: any) => {
        if (payload.payload && payload.payload.receiverId === currentUserId) {
          onSignalReceived(payload.payload);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = this.realtimeChannel.presenceState();
        onPresenceChange(state);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await this.realtimeChannel.track({
            online_at: new Date().toISOString(),
            status: 'online'
          });
        }
      });
  }

  public async sendWebRTCSignal(signal: WebRTCSignal): Promise<void> {
    if (!this.realtimeChannel) return;
    await this.realtimeChannel.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload: signal
    });
  }

  // --- 4. ENGINE WEBRTC AUDIO & VIDEO CALLS ---
  public async initializeCall(
    targetUserId: string,
    currentUserId: string,
    videoEnabled: boolean,
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<MediaStream | null> {
    try {
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      this.peerConnection = new RTCPeerConnection(configuration);
      this.remoteStream = new MediaStream();

      // Obtenir le flux audio/video local du navigateur/smartphone
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: videoEnabled
      });

      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      this.peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          if (this.remoteStream) {
            this.remoteStream.addTrack(track);
          }
        });
        onRemoteStream(this.remoteStream);
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendWebRTCSignal({
            type: 'ice-candidate',
            senderId: currentUserId,
            receiverId: targetUserId,
            candidate: event.candidate
          });
        }
      };

      // Creer l'offre SDP
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      await this.sendWebRTCSignal({
        type: 'offer',
        senderId: currentUserId,
        receiverId: targetUserId,
        sdp: offer
      });

      return this.localStream;
    } catch (error: any) {
      console.error('[SocialGraphService] Echec initialisation appel WebRTC:', error.message);
      return null;
    }
  }

  public async handleReceivedOffer(
    signal: WebRTCSignal,
    currentUserId: string,
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<MediaStream | null> {
    try {
      const configuration: RTCConfiguration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      };

      this.peerConnection = new RTCPeerConnection(configuration);
      this.remoteStream = new MediaStream();

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });

      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      this.peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          if (this.remoteStream) {
            this.remoteStream.addTrack(track);
          }
        });
        onRemoteStream(this.remoteStream);
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendWebRTCSignal({
            type: 'ice-candidate',
            senderId: currentUserId,
            receiverId: signal.senderId,
            candidate: event.candidate
          });
        }
      };

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      await this.sendWebRTCSignal({
        type: 'answer',
        senderId: currentUserId,
        receiverId: signal.senderId,
        sdp: answer
      });

      return this.localStream;
    } catch (error: any) {
      console.error('[SocialGraphService] Echec reponse appel WebRTC:', error.message);
      return null;
    }
  }

  public async handleReceivedAnswer(signal: WebRTCSignal): Promise<void> {
    if (this.peerConnection && signal.sdp) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    }
  }

  public async handleIceCandidate(signal: WebRTCSignal): Promise<void> {
    if (this.peerConnection && signal.candidate) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }

  public endCall(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
  }
}
