import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, TextInput, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// Code HTML/JS embarqué avec gestionnaire de messages GeoAgent (MapLibre Agent Skills)
const MAPLIBRE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>Carte Terrestre MapLibre GeoAgent</title>
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #0b132b; }
    #map { position: absolute; top: 0; bottom: 0; left: 0; right: 0; width: 100%; height: 100%; }
    .maplibregl-popup-content {
      background: #ffffff !important;
      color: #202124 !important;
      border-radius: 18px !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      padding: 14px !important;
      box-shadow: 0 12px 32px rgba(0,0,0,0.18) !important;
      border: 1px solid rgba(0,0,0,0.06) !important;
      width: 220px !important;
    }
    .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
      border-top-color: #ffffff !important;
    }
    .m3-shape-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .m3-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .m3-card-title {
      font-size: 16px;
      font-weight: 700;
      color: #1a202c;
      margin: 0;
    }
    .m3-card-subtitle {
      font-size: 12px;
      color: #718096;
      margin: 2px 0 0 0;
    }
    .m3-logo {
      font-size: 11px;
      font-weight: 800;
      color: #3182ce;
      background: #ebf8ff;
      padding: 2px 6px;
      border-radius: 6px;
    }
    .m3-card-img {
      width: 100%;
      height: 110px;
      object-fit: cover;
      border-radius: 12px;
      margin-top: 4px;
    }
    .maplibregl-ctrl-bottom-right {
      bottom: 90px !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://demotiles.maplibre.org/style.json',
      center: [35.2137, 31.7683],
      zoom: 6.5,
      pitch: 30
    });

    map.addControl(new maplibregl.NavigationControl({
      visualizePitch: true,
      showZoom: true,
      showCompass: true
    }), 'bottom-right');

    map.addControl(new maplibregl.FullscreenControl(), 'bottom-right');

    let markers = [];

    function buildM3CardHtml(name, subtitle, imageUrl) {
      const img = imageUrl || 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&auto=format&fit=crop';
      const sub = subtitle || 'Site Historique';
      return '<div class="m3-shape-card"><div class="m3-card-header"><div><h3 class="m3-card-title">' + name + '</h3><p class="m3-card-subtitle">' + sub + '</p></div><span class="m3-logo">M3</span></div><img class="m3-card-img" src="' + img + '" /></div>';
    }

    function addMarker(coords, name, color, popupHtml, subtitle, imageUrl) {
      const cardHtml = popupHtml || buildM3CardHtml(name, subtitle, imageUrl);
      const marker = new maplibregl.Marker({ color: color || '#D4AF37' })
        .setLngLat(coords)
        .setPopup(new maplibregl.Popup({ closeButton: false, offset: 15 }).setHTML(cardHtml))
        .addTo(map);
      return marker;
    }

    // Carte vierge et épurée au démarrage - Seul l'Agent GeoAgent ajoutera des marqueurs sur demande
    window.addEventListener('message', function(event) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || !data.actions) return;

        data.actions.forEach(action => {
          if (action.type === 'flyTo' && action.center) {
            map.flyTo({
              center: action.center,
              zoom: action.zoom || 9,
              pitch: action.pitch || 30,
              speed: 1.2
            });
          }
          if (action.type === 'addMarker' && action.coordinates) {
            addMarker(action.coordinates, action.name || 'Lieu', action.color || '#D4AF37', action.popupHtml);
          }
          if (action.type === 'clearMarkers') {
            markers.forEach(m => m.remove());
            markers = [];
          }
        });
      } catch (err) {
        console.error("Erreur message GeoAgent :", err);
      }
    });
  </script>
</body>
</html>
`;

export default function BiblicalMapScreen() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const iframeRef = useRef<any>(null);

  const handleSendGeoCommand = async () => {
    if (!query.trim()) return;

    const userPrompt = query.trim();
    setQuery('');
    setIsLoading(true);
    setAgentResponse(null);

    try {
      const res = await fetch(`${BACKEND_API_URL}/api/geo-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.speechResponse) {
          setAgentResponse(data.speechResponse);
        }
        if (data.actions && data.actions.length > 0 && iframeRef.current) {
          iframeRef.current.contentWindow.postMessage(JSON.stringify({ actions: data.actions }), '*');
        }
      } else {
        throw new Error("HTTP " + res.status);
      }
    } catch (e: any) {
      console.warn("Bascule de secours locale GeoAgent :", e?.message);
      
      // Secours local sur client
      let name = userPrompt;
      let coords = [35.2137, 31.7683];
      let sub = "Site Historique";
      let img = "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&auto=format&fit=crop";

      const pLower = userPrompt.toLowerCase();
      if (pLower.includes("ararat")) {
        name = "Mont Ararat"; coords = [44.299, 39.702]; sub = "Arche de Noé"; img = "https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=800&auto=format&fit=crop";
      } else if (pLower.includes("palmyre")) {
        name = "Palmyre"; coords = [38.267, 34.56]; sub = "Cité Antique"; img = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Palmyra_arch.jpg/800px-Palmyra_arch.jpg";
      } else if (pLower.includes("sinaï") || pLower.includes("sinai")) {
        name = "Mont Sinaï"; coords = [33.9753, 28.5394]; sub = "Mont de la Loi"; img = "https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=800&auto=format&fit=crop";
      } else if (pLower.includes("babylone")) {
        name = "Babylone"; coords = [44.421, 32.542]; sub = "Cité Mésopotamienne"; img = "https://images.unsplash.com/photo-1599575637287-42527b1720f3?w=800&auto=format&fit=crop";
      }

      setAgentResponse(`Exploration de ${name} (${sub}).`);
      const fallbackActions = [
        { type: 'flyTo', center: coords, zoom: 8.5, pitch: 30 },
        { type: 'addMarker', name, subtitle: sub, coordinates: coords, color: '#D4AF37', imageUrl: img }
      ];
      if (iframeRef.current) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ actions: fallbackActions }), '*');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Masquage de l'en-tête natif d'Expo Router */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Rendu 100% Plein Écran de la Carte MapLibre GL */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <iframe
            ref={iframeRef}
            srcDoc={MAPLIBRE_HTML}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title="Carte MapLibre GL GeoAgent"
          />
        ) : (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 40 }}>
            Chargement de la Carte MapLibre...
          </Text>
        )}
      </View>

      {/* Bouton de retour M3 flottant (Top-Left) */}
      <Pressable onPress={() => router.back()} style={styles.floatingM3BackBtn}>
        <MaterialCommunityIcons name="arrow-left" size={22} color="#D4AF37" />
      </Pressable>

      {/* Bulle d'explication vocale / exégétique de l'IA (Si disponible) */}
      {agentResponse && (
        <View style={styles.speechResponseCard}>
          <MaterialCommunityIcons name="auto-fix" size={18} color="#D4AF37" style={{ marginTop: 2 }} />
          <Text style={styles.speechResponseText}>{agentResponse}</Text>
          <Pressable onPress={() => setAgentResponse(null)} style={styles.closeSpeechBtn}>
            <MaterialCommunityIcons name="close" size={16} color="#A0AEC0" />
          </Pressable>
        </View>
      )}

      {/* Barre de Recherche / Assistant M3 Flottante en Bas */}
      <View style={styles.bottomSearchContainer}>
        <View style={styles.floatingM3SearchBar}>
          <MaterialCommunityIcons name="auto-fix" size={22} color="#3C4043" style={styles.sparklesIcon} />
          <TextInput
            style={[{ outlineStyle: 'none', outlineWidth: 0 } as any, styles.searchInput]}
            placeholder="Discutez avec votre assistant de carte (ex: Zoome sur Babylone...)"
            placeholderTextColor="#70757A"
            underlineColorAndroid="transparent"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSendGeoCommand}
          />
          {isLoading ? (
            <ActivityIndicator size="small" color="#D4AF37" style={{ marginLeft: 8 }} />
          ) : (
            <Pressable onPress={handleSendGeoCommand} style={styles.micBtn}>
              <MaterialCommunityIcons name="send-circle" size={26} color="#D4AF37" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
    position: 'relative',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  floatingM3BackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    zIndex: 9999,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 19, 43, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  speechResponseCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 76,
    right: 20,
    zIndex: 9999,
    maxWidth: 520,
    backgroundColor: 'rgba(28, 37, 65, 0.95)',
    borderRadius: 16,
    padding: 12,
    paddingRight: 36,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  speechResponseText: {
    flex: 1,
    fontSize: 13,
    color: '#F3E5AB',
    lineHeight: 18,
  },
  closeSpeechBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  bottomSearchContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  floatingM3SearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 520,
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 27,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  sparklesIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#202124',
    paddingVertical: 8,
    borderWidth: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  micBtn: {
    padding: 4,
    marginLeft: 6,
  },
});
