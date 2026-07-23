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
                  body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #0B0D12; }
                </style>
              </head>
              <body>
                <div id="map"></div>
                <script>
                  var map = new maplibregl.Map({
                    container: 'map',
                    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
                    center: [0.0, 9.0],
                    zoom: 4.5
                  });
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
