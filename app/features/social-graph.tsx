import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Avatar,
  Button,
  Drawer,
  Fab,
  useTheme,
  useMediaQuery,
  Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import CallIcon from '@mui/icons-material/Call';
import ChatIcon from '@mui/icons-material/Chat';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { supabase } from '../../lib/supabase';
import { TraccarTrackerService } from '../../lib/services/traccarTrackerService';
import { BACKEND_API_URL } from '../../lib/apiClient';
import { router } from 'expo-router';

interface UserNode {
  id: string;
  full_name?: string;
  email?: string;
  spiritual_status?: string;
  avatar_url?: string;
  coords?: [number, number];
}

export default function SocialGraphFeatureMui3() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [users, setUsers] = useState<UserNode[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set());
  const [pendingUserIds, setPendingUserIds] = useState<Set<string>>(new Set());

  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        setCurrentUserId(data.user.id);
        TraccarTrackerService.getInstance().startTracking(data.user.id, 30000);
        fetchSocialData(data.user.id);
      }
    });

    return () => {
      TraccarTrackerService.getInstance().stopTracking();
    };
  }, []);

  const fetchSocialData = async (userId: string) => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/social/graph-users`);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
      }
      const connRes = await fetch(`${BACKEND_API_URL}/api/social/connections?userId=${userId}`);
      if (connRes.ok) {
        const connJson = await connRes.json();
        const connectedSet = new Set<string>();
        (connJson.connections || []).forEach((c: any) => {
          connectedSet.add(c.requester_id === userId ? c.target_id : c.requester_id);
        });
        setConnectedUserIds(connectedSet);
      }
    } catch (err) {
      console.error('[SocialGraph MUI3] Erreur chargement:', err);
    }
  };

  const handleConnect = async (targetId: string) => {
    if (!currentUserId || pendingUserIds.has(targetId)) return;
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/social/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentUserId, targetId })
      });
      const json = await res.json();
      if (json.success) {
        setPendingUserIds((prev) => new Set(prev).add(targetId));
      }
    } catch (err) {
      console.error('[SocialGraph MUI3] Erreur connect:', err);
    }
  };

  const filteredUsers = users.filter((u) => {
    const name = (u.full_name || u.email || '').toLowerCase();
    const role = (u.spiritual_status || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || role.includes(q);
  });

  const sidebarContent = (
    <Box
      sx={{
        width: isMobile ? '100%' : 340,
        height: '100%',
        bgcolor: '#0F172A',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        p: 2.5,
        gap: 2,
        borderRight: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/features');
          }}
          sx={{ borderRadius: 3, textTransform: 'none', color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.2)' }}
        >
          Retour
        </Button>
        {isMobile && (
          <IconButton onClick={() => setSidebarOpen(false)} size="small" sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Stack>

      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 1.5, color: '#818CF8' }}>
          RÉSEAU SPIRITUEL
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: '#FFFFFF' }}>
          Fidèles &amp; Connexions
        </Typography>
      </Box>

      <TextField
        fullWidth
        placeholder="Rechercher un membre..."
        size="small"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: '#64748B' }} />
              </InputAdornment>
            ),
            sx: { borderRadius: 4, bgcolor: '#1E293B', color: '#FFF' }
          }
        }}
      />

      <Typography variant="overline" sx={{ fontWeight: 700, mt: 1, color: '#64748B' }}>
        Membres sur la carte ({filteredUsers.length})
      </Typography>

      <Stack spacing={1} sx={{ flex: 1, overflowY: 'auto' }}>
        {filteredUsers.map((u) => {
          const name = u.full_name || u.email || 'Utilisateur';
          const isSelected = selectedUserId === u.id;
          const isConnected = connectedUserIds.has(u.id);

          return (
            <Stack
              key={u.id}
              direction="row"
              spacing={1.5}
              onClick={() => {
                setSelectedUserId(u.id);
                if (isMobile) setSidebarOpen(false);
              }}
              sx={{
                alignItems: 'center',
                p: 1.25,
                borderRadius: 3,
                cursor: 'pointer',
                bgcolor: isSelected ? 'rgba(129, 140, 248, 0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
                transition: 'background-color 0.2s'
              }}
            >
              <Avatar src={u.avatar_url} sx={{ width: 40, height: 40, bgcolor: '#3730A3', color: '#FFF' }}>
                {name.charAt(0).toUpperCase()}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#F1F5F9' }} noWrap>
                  {name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }} noWrap>
                  {u.spiritual_status || 'Membre actif'}
                </Typography>
              </Box>

              {isConnected ? (
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" sx={{ color: '#10B981' }}>
                    <CallIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" sx={{ color: '#818CF8' }}>
                    <ChatIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ) : (
                u.coords && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#22C55E'
                    }}
                  />
                )
              )}
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', bgcolor: '#0B0D12', position: 'relative', overflow: 'hidden' }}>
      {!isMobile && (
        <Box
          sx={{
            width: sidebarOpen ? 340 : 0,
            height: '100%',
            transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden',
            flexShrink: 0
          }}
        >
          {sidebarContent}
        </Box>
      )}

      {isMobile && (
        <Drawer
          anchor="bottom"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85vh', bgcolor: '#0F172A' } } }}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Box sx={{ flex: 1, height: '100%', position: 'relative' }}>
        <IconButton
          onClick={() => setSidebarOpen(!sidebarOpen)}
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 25,
            bgcolor: '#0F172A',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            '&:hover': { bgcolor: '#1E293B', color: '#818CF8' }
          }}
        >
          {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>

        {/* Dynamic Web Maplibre & Canvas Arcs Overlay Container */}
        <Box
          ref={mapContainerRef}
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: '#0B0D12'
          }}
        >
          <iframe
            srcDoc={`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8" />
                <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
                <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
                <style>
                  body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #0B0D12; }
                  #map-wrap { position: relative; width: 100%; height: 100%; }
                  #map { width: 100%; height: 100%; }
                  #arcs-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }
                  
                  .node-anchor {
                    width: 16px; height: 16px;
                    background: radial-gradient(circle, #a78bfa 0%, #6366f1 100%);
                    border: 2px solid rgba(255,255,255,0.9);
                    border-radius: 50%;
                    box-shadow: 0 0 0 4px rgba(129,140,248,0.25), 0 0 16px rgba(129,140,248,0.7);
                    cursor: pointer; transition: transform 0.2s;
                  }
                  .node-anchor:hover { transform: scale(1.6); }
                  .node-me {
                    background: radial-gradient(circle, #34d399 0%, #059669 100%) !important;
                    box-shadow: 0 0 0 4px rgba(52,211,153,0.25), 0 0 16px rgba(52,211,153,0.6) !important;
                  }
                </style>
              </head>
              <body>
                <div id="map-wrap">
                  <div id="map"></div>
                  <canvas id="arcs-canvas"></canvas>
                </div>
                <script>
                  var map, canvas, ctx;
                  var users = ${JSON.stringify(users)};
                  var currentUserId = '${currentUserId}';
                  var connectedUserIds = new Set(${JSON.stringify(Array.from(connectedUserIds))});
                  var animFrameId = null;

                  function initMap() {
                    map = new maplibregl.Map({
                      container: 'map',
                      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
                      center: [0.0, 9.0],
                      zoom: 4.5
                    });

                    canvas = document.getElementById('arcs-canvas');
                    ctx = canvas.getContext('2d');
                    resizeCanvas();
                    window.addEventListener('resize', resizeCanvas);

                    map.on('move', renderArcs);
                    map.on('zoom', renderArcs);

                    renderNodes();
                    startArcAnimation();
                  }

                  function resizeCanvas() {
                    canvas.width = canvas.offsetWidth;
                    canvas.height = canvas.offsetHeight;
                  }

                  function renderNodes() {
                    users.forEach(function(u) {
                      if (!u.coords) return;
                      var isMe = (u.id === currentUserId);
                      var el = document.createElement('div');
                      el.className = 'node-anchor' + (isMe ? ' node-me' : '');
                      new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(u.coords).addTo(map);
                    });
                  }

                  function startArcAnimation() {
                    function loop(timestamp) {
                      renderArcs(timestamp);
                      animFrameId = requestAnimationFrame(loop);
                    }
                    animFrameId = requestAnimationFrame(loop);
                  }

                  function renderArcs(timestamp) {
                    if (!ctx || !users || users.length === 0) return;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    var connectedNodes = users
                      .filter(function(u) { return u.coords && (u.id === currentUserId || connectedUserIds.has(u.id)); })
                      .map(function(u) {
                        var pt = map.project(u.coords);
                        return { id: u.id, x: pt.x, y: pt.y };
                      });

                    if (connectedNodes.length < 2) return;

                    var time = (timestamp || performance.now()) * 0.0008;

                    for (var i = 0; i < connectedNodes.length; i++) {
                      for (var j = i + 1; j < connectedNodes.length; j++) {
                        var p1 = connectedNodes[i], p2 = connectedNodes[j];
                        var dx = p2.x - p1.x, dy = p2.y - p1.y;
                        var dist = Math.sqrt(dx * dx + dy * dy);
                        var curvature = Math.max(dist * 0.25, 45);
                        var midX = (p1.x + p2.x) / 2;
                        var midY = (p1.y + p2.y) / 2 - curvature;

                        // 1. Arc Lamineur Halo de Glow extérieur
                        var gradGlow = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                        gradGlow.addColorStop(0, 'rgba(129, 140, 248, 0.15)');
                        gradGlow.addColorStop(0.5, 'rgba(236, 72, 153, 0.15)');
                        gradGlow.addColorStop(1, 'rgba(16, 185, 129, 0.15)');

                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
                        ctx.strokeStyle = gradGlow;
                        ctx.lineWidth = 10;
                        ctx.lineCap = 'round';
                        ctx.stroke();

                        // 2. Trait de liaison principal gradient
                        var gradArc = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                        gradArc.addColorStop(0, '#818CF8');
                        gradArc.addColorStop(0.5, '#EC4899');
                        gradArc.addColorStop(1, '#10B981');

                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
                        ctx.strokeStyle = gradArc;
                        ctx.lineWidth = 2.5;
                        ctx.lineCap = 'round';
                        ctx.stroke();

                        // 3. Particules d'énergie lumineuses animées le long de la courbe Bézier
                        var t = (time + (i + j) * 0.2) % 1.0;
                        var px = Math.pow(1 - t, 2) * p1.x + 2 * (1 - t) * t * midX + Math.pow(t, 2) * p2.x;
                        var py = Math.pow(1 - t, 2) * p1.y + 2 * (1 - t) * t * midY + Math.pow(t, 2) * p2.y;

                        ctx.beginPath();
                        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
                        ctx.fillStyle = '#FFFFFF';
                        ctx.shadowColor = '#818CF8';
                        ctx.shadowBlur = 12;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                      }
                    }
                  }

                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', initMap);
                  } else {
                    setTimeout(initMap, 0);
                  }
                </script>
              </body>
              </html>
            `}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </Box>

        {selectedUserId && (
          <Paper
            elevation={6}
            sx={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              zIndex: 30,
              p: 2,
              borderRadius: 5,
              bgcolor: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(129, 140, 248, 0.25)',
              color: '#FFF',
              minWidth: 220
            }}
          >
            {(() => {
              const u = users.find((x) => x.id === selectedUserId);
              if (!u) return null;
              const name = u.full_name || u.email || 'Utilisateur';
              const isConnected = connectedUserIds.has(u.id);
              const isPending = pendingUserIds.has(u.id);

              return (
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Avatar src={u.avatar_url} sx={{ width: 42, height: 42, bgcolor: '#3730A3' }}>
                      {name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9' }}>
                        {name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                        {u.spiritual_status || 'Fidèle'}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    {isConnected ? (
                      <>
                        <Button fullWidth variant="contained" color="success" size="small" startIcon={<CallIcon />} sx={{ borderRadius: 2.5, textTransform: 'none' }}>
                          Appel
                        </Button>
                        <Button fullWidth variant="contained" color="primary" size="small" startIcon={<ChatIcon />} sx={{ borderRadius: 2.5, textTransform: 'none' }}>
                          Chat
                        </Button>
                      </>
                    ) : isPending ? (
                      <Button fullWidth variant="outlined" disabled size="small" startIcon={<HourglassEmptyIcon />} sx={{ borderRadius: 2.5, textTransform: 'none' }}>
                        Envoyé
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="contained"
                        size="small"
                        startIcon={<PersonAddIcon />}
                        onClick={() => handleConnect(u.id)}
                        sx={{ borderRadius: 2.5, textTransform: 'none', bgcolor: '#3730A3', '&:hover': { bgcolor: '#4338CA' } }}
                      >
                        Connecter
                      </Button>
                    )}
                  </Stack>
                </Stack>
              );
            })()}
          </Paper>
        )}

        {isMobile && !sidebarOpen && (
          <Fab
            variant="extended"
            onClick={() => setSidebarOpen(true)}
            sx={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              bgcolor: '#3730A3',
              color: '#FFF',
              '&:hover': { bgcolor: '#4338CA' }
            }}
          >
            <PeopleIcon sx={{ mr: 1 }} />
            Voir les membres ({users.length})
          </Fab>
        )}
      </Box>
    </Box>
  );
}
