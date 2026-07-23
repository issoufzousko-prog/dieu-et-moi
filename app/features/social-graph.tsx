import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { TraccarTrackerService } from '../../lib/services/traccarTrackerService';

const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dieu-et-moi-api.onrender.com';

const SOCIAL_GRAPH_HTML_TEMPLATE = (backendUrl: string, supabaseUrl: string, supabaseKey: string, currentUserId: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>Social Graph</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/livekit-client@2.6.0/dist/livekit-client.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body, html {
      width: 100%; height: 100%; overflow: hidden;
      background: #0B0D12;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    #root { display: flex; width: 100%; height: 100%; position: relative; }

    /* SIDEBAR 320px fond #0F172A */
    #sidebar {
      width: 320px; min-width: 320px; height: 100%;
      background: #0F172A;
      border-right: 1px solid rgba(255,255,255,0.06);
      display: flex; flex-direction: column;
      z-index: 20;
      box-shadow: 4px 0 32px rgba(0,0,0,0.7);
    }
    .sidebar-inner { display: flex; flex-direction: column; gap: 20px; padding: 24px 20px 12px; }

    /* Bouton Retour MUI variant="outlined" discret */
    .btn-back {
      display: inline-flex; align-items: center; gap: 6px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.18);
      color: rgba(255,255,255,0.75);
      padding: 6px 16px 6px 12px;
      border-radius: 8px;
      font-size: 12px; font-weight: 600; font-family: inherit;
      letter-spacing: 0.4px; cursor: pointer; width: fit-content;
      transition: border-color 0.2s, color 0.2s, background 0.2s;
    }
    .btn-back:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.35); color: #fff; }

    /* Typography MUI 3 */
    .header-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #818CF8; text-transform: uppercase; }
    .header-title { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.5px; line-height: 1.15; margin-top: 4px; }

    /* TextField outlined capsule */
    .search-wrap { position: relative; }
    .search-icon-svg {
      position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
      width: 16px; height: 16px; color: #475569; pointer-events: none;
    }
    .search-input {
      width: 100%; background: #1E293B;
      border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
      padding: 11px 16px 11px 42px; color: #fff;
      font-size: 13px; font-family: inherit; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search-input:focus { border-color: #818CF8; box-shadow: 0 0 0 3px rgba(129,140,248,0.15); }
    .search-input::placeholder { color: #475569; }

    .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 0 -20px; }
    .list-header { padding: 14px 20px 8px; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: #475569; text-transform: uppercase; }

    /* MUI List */
    #userList {
      flex: 1; overflow-y: auto; padding: 0 12px 12px;
      display: flex; flex-direction: column; gap: 2px;
    }
    #userList::-webkit-scrollbar { width: 4px; }
    #userList::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }

    /* MUI ListItem */
    .user-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px; border-radius: 12px; cursor: pointer;
      transition: background 0.15s ease; background: transparent;
    }
    .user-item:hover { background: rgba(255,255,255,0.05); }
    .user-item.active { background: rgba(129,140,248,0.12); }

    /* MUI Avatar */
    .user-avatar-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1.5px solid rgba(129,140,248,0.5); flex-shrink: 0; background: #1E293B; }
    .user-avatar-init {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, #3730A3 0%, #6D28D9 100%);
      border: 1.5px solid rgba(129,140,248,0.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .user-meta { flex: 1; min-width: 0; }
    .user-name { font-size: 14px; font-weight: 600; color: #F1F5F9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-role { font-size: 12px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
    .user-indicator { width: 8px; height: 8px; border-radius: 50%; background: #22C55E; flex-shrink: 0; }

    .empty-state { padding: 32px 16px; text-align: center; color: #475569; font-size: 13px; line-height: 1.6; }

    /* Zone carte */
    #map-wrapper { flex: 1; height: 100%; position: relative; }
    #map { width: 100%; height: 100%; }
    #arcs-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }

    /* Popover MUI 3 Card - fond sombre, coins 20px MD3 */
    .maplibregl-popup-content {
      background: transparent !important; padding: 0 !important;
      box-shadow: none !important; border-radius: 0 !important; border: none !important;
    }
    .maplibregl-popup-anchor-bottom .maplibregl-popup-tip { border-top-color: #1E293B !important; }
    .maplibregl-popup { z-index: 30; }

    .mui3-card {
      background: #1E293B;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px; padding: 16px;
      display: flex; flex-direction: column; gap: 14px;
      min-width: 200px; max-width: 240px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4);
    }
    .pop-header { display: flex; align-items: center; gap: 12px; }
    .pop-avatar-img { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid #818CF8; flex-shrink: 0; }
    .pop-avatar-init {
      width: 42px; height: 42px; border-radius: 50%;
      background: linear-gradient(135deg, #3730A3 0%, #6D28D9 100%);
      border: 2px solid #818CF8;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .pop-meta { display: flex; flex-direction: column; gap: 2px; }
    .pop-name { font-size: 14px; font-weight: 700; color: #F1F5F9; }
    .pop-role { font-size: 11px; color: #94A3B8; }
    .pop-divider { height: 1px; background: rgba(255,255,255,0.07); }
    .pop-actions { display: flex; gap: 8px; }
    .action-btn {
      flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      padding: 7px 10px; border-radius: 10px; font-size: 11px; font-weight: 600;
      font-family: inherit; cursor: pointer; border: 1px solid transparent;
      transition: background 0.2s, border-color 0.2s;
    }
    .action-btn-outline { background: transparent; border-color: rgba(129,140,248,0.35); color: #A5B4FC; }
    .action-btn-outline:hover { background: rgba(129,140,248,0.1); border-color: rgba(129,140,248,0.6); }
    .action-btn-filled { background: #3730A3; color: #fff; }
    .action-btn-filled:hover { background: #4338CA; }

    /* Controles carte */
    .maplibregl-ctrl-group {
      background: #1E293B !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
    }
    /* Noeud GPS — petit disque lumineux sous la card */
    .node-anchor {
      width: 14px;
      height: 14px;
      background: radial-gradient(circle, #a78bfa 0%, #6366f1 100%);
      border: 2px solid rgba(255,255,255,0.9);
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(129,140,248,0.25), 0 0 16px rgba(129,140,248,0.7);
      cursor: pointer;
      transition: transform 0.18s;
    }
    .node-anchor:hover { transform: scale(1.5); }
    /* Card MUI3 persistante — Shape MD3 large radius */
    .user-card-persistent {
      background: rgba(15,23,42,0.92);
      border: 1px solid rgba(129,140,248,0.22);
      border-radius: 18px;
      padding: 12px 14px 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 185px;
      max-width: 220px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      cursor: default;
    }
    .ucp-header { display: flex; align-items: center; gap: 10px; }
    .ucp-avatar-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #818CF8; flex-shrink: 0; }
    .ucp-avatar-init {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, #3730A3 0%, #7C3AED 100%);
      border: 2px solid #818CF8;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .ucp-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .ucp-name { font-size: 13px; font-weight: 700; color: #F1F5F9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ucp-role { font-size: 11px; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ucp-actions { display: flex; gap: 7px; }
    .ucp-btn {
      flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      padding: 6px 10px; border-radius: 10px; font-size: 11px; font-weight: 600;
      font-family: inherit; cursor: pointer; border: 1px solid transparent;
      transition: background 0.18s, transform 0.12s;
    }
    .ucp-btn:active { transform: scale(0.96); }
    .ucp-btn-local { background: rgba(255,255,255,0.06); border-color: rgba(129,140,248,0.35); color: #A5B4FC; }
    .ucp-btn-local:hover { background: rgba(129,140,248,0.12); border-color: rgba(129,140,248,0.6); }
    .ucp-btn-connect { background: #3730A3; color: #fff; }
    .ucp-btn-connect:hover { background: #4338CA; }
    .ucp-btn-connect.pending { background: #1e3a5f; color: #93c5fd; border-color: #3b82f6; cursor: default; }
    /* Panel appel vocal - flottant en bas au centre */
    #call-panel {
      display: none;
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(15,23,42,0.97);
      border: 1px solid rgba(99,179,237,0.3);
      border-radius: 20px;
      padding: 16px 20px;
      gap: 16px;
      align-items: center;
      box-shadow: 0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,179,237,0.15);
      backdrop-filter: blur(20px);
      z-index: 9999;
      min-width: 280px;
    }
    .call-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .call-peer { font-size: 14px; font-weight: 700; color: #F1F5F9; }
    .call-room { font-size: 10px; color: #64748B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
    .call-status { font-size: 11px; color: #34d399; display: flex; align-items: center; gap: 4px; }
    .call-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; animation: pulse-dot 1.2s infinite; }
    @keyframes pulse-dot { 0%,100%{opacity:1}50%{opacity:0.3} }
    .call-actions { display: flex; gap: 8px; }
    .call-btn {
      width: 40px; height: 40px; border-radius: 50%; border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: transform 0.15s, background 0.15s;
      background: rgba(255,255,255,0.08);
    }
    .call-btn:hover { transform: scale(1.1); background: rgba(255,255,255,0.14); }
    .call-btn.hangup { background: #ef4444; }
    .call-btn.hangup:hover { background: #dc2626; }
    /* Node propre (moi) - couleur differente */
    .node-me {
      background: radial-gradient(circle, #34d399 0%, #059669 100%) !important;
      box-shadow: 0 0 0 4px rgba(52,211,153,0.25), 0 0 16px rgba(52,211,153,0.6) !important;
    }
    /* Popup wrapper transparent */
    .maplibregl-popup-content { background: transparent !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; border: none !important; }
    .maplibregl-popup-tip { display: none !important; }
    .maplibregl-popup { z-index: 25; }
  </style>
</head>
<body>
  <div id="root">
    <div id="sidebar">
      <div class="sidebar-inner">
        <button class="btn-back" onclick="window.parent.postMessage('GO_BACK', '*')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Retour
        </button>
        <div>
          <div class="header-label">Social Graph</div>
          <div class="header-title">Users &amp; Connections</div>
        </div>
        <div class="search-wrap">
          <svg class="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="searchInput" class="search-input" placeholder="Rechercher un utilisateur..." oninput="filterUsers()" />
        </div>
      </div>
      <div class="divider"></div>
      <div class="list-header" id="listHeader">Utilisateurs</div>
      <div id="userList"><div class="empty-state">Connexion a Supabase...</div></div>
    </div>

    <div id="map-wrapper">
      <div id="map"></div>
      <canvas id="arcs-canvas"></canvas>
    </div>

    <!-- Panel appel vocal LiveKit -->
    <div id="call-panel">
      <div class="call-info">
        <div class="call-peer" id="call-peer-name">Utilisateur</div>
        <div class="call-status"><span class="call-dot"></span>Appel en cours</div>
        <div class="call-room" id="call-room-name"></div>
      </div>
      <div class="call-actions">
        <button class="call-btn" id="mic-btn" data-muted="false" data-action="toggle-mic" title="Micro">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
        </button>
        <button class="call-btn hangup" data-action="hangup" title="Raccrocher">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 3.07 12a19.79 19.79 0 0 1-3.07-8.64A2 2 0 0 1 2 1.17h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L6.18 8.88a16 16 0 0 0 5.5 5.5l.99-.99z"/></svg>
        </button>
      </div>
    </div>
  </div>

  <script>
    var map, canvas, ctx;
    var registeredUsers = [];
    var selectedUserId = null;
    var openPopup = null;
    var activeRoom = null;
    // Injecte depuis React
    var CURRENT_USER_ID = '${currentUserId}';
    var BACKEND_URL = '${backendUrl}';
    var LIVEKIT_WS_URL = 'wss://dieu-et-moi-bkrbtx4b.livekit.cloud';
    // Connexions acceptees : Set d IDs
    var connectedUserIds = new Set();
    // Demandes en attente envoyees : Set d IDs
    var pendingUserIds = new Set();

    async function initSocialGraph() {
      map = new maplibregl.Map({
        container: 'map',
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [0.0, 9.0],
        zoom: 4.5,
        pitch: 0
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

      canvas = document.getElementById('arcs-canvas');
      ctx = canvas.getContext('2d');
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      map.on('move', drawArcs);
      map.on('zoom', drawArcs);
      map.on('click', function() { selectUser(null); });

      try {
        const res = await fetch(BACKEND_URL + '/api/social/graph-users');
        if (res.ok) {
          const json = await res.json();
          registeredUsers = json.users || [];
        }
      } catch (e) { console.warn('Erreur API graph-users:', e); }

      // Charger les connexions existantes de l utilisateur courant
      if (CURRENT_USER_ID) {
        try {
          const cr = await fetch(BACKEND_URL + '/api/social/connections?userId=' + CURRENT_USER_ID);
          if (cr.ok) {
            const cj = await cr.json();
            (cj.connections || []).forEach(function(c) {
              var otherId = c.requester_id === CURRENT_USER_ID ? c.target_id : c.requester_id;
              connectedUserIds.add(otherId);
            });
          }
          const pr = await fetch(BACKEND_URL + '/api/social/pending?userId=' + CURRENT_USER_ID);
          if (pr.ok) {
            const pj = await pr.json();
            (pj.pending || []).forEach(function(p) { pendingUserIds.add(p.target_id); });
          }
        } catch (e) { console.warn('Erreur API connections:', e); }
      }

      renderUserList(registeredUsers);
      renderMapNodes(registeredUsers);
      drawArcs();
    }

    function selectUser(userId) {
      selectedUserId = userId;
      document.querySelectorAll('.user-item').forEach(el => {
        el.classList.toggle('active', el.dataset.uid === userId);
      });
      if (openPopup && userId === null) {
        openPopup.remove();
        openPopup = null;
      }
    }

    function renderUserList(list) {
      const container = document.getElementById('userList');
      const header = document.getElementById('listHeader');
      container.innerHTML = '';

      if (!list || list.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucun utilisateur enregistre.</div>';
        header.textContent = 'Utilisateurs';
        return;
      }

      header.textContent = 'Utilisateurs - ' + list.length;

      list.forEach(u => {
        const name = u.full_name || u.email || 'Utilisateur';
        const role = u.spiritual_status || u.role || 'Membre';
        const initial = name.charAt(0).toUpperCase();

        const item = document.createElement('div');
        item.className = 'user-item';
        item.dataset.uid = u.id;

        const avatarHtml = (u.avatar_url || u.avatar)
          ? '<img class="user-avatar-img" src="' + (u.avatar_url || u.avatar) + '" alt="' + name + '" />'
          : '<div class="user-avatar-init">' + initial + '</div>';

        item.innerHTML =
          avatarHtml +
          '<div class="user-meta">' +
            '<div class="user-name">' + name + '</div>' +
            '<div class="user-role">' + role + '</div>' +
          '</div>' +
          (u.coords ? '<div class="user-indicator" title="En ligne"></div>' : '');

        item.onclick = () => {
          selectUser(u.id);
          if (u.coords) map.flyTo({ center: u.coords, zoom: 8, duration: 1200 });
        };

        container.appendChild(item);
      });
    }

    function filterUsers() {
      const q = document.getElementById('searchInput').value.toLowerCase();
      const filtered = registeredUsers.filter(u => {
        const name = (u.full_name || u.email || '').toLowerCase();
        const role = (u.spiritual_status || u.role || '').toLowerCase();
        return name.includes(q) || role.includes(q);
      });
      renderUserList(filtered);
    }

    function renderMapNodes(list) {
      if (!list || list.length === 0) return;
      list.forEach(function(u) {
        if (!u.coords) return;
        var name = u.full_name || u.email || 'Utilisateur';
        var role = u.spiritual_status || u.role || 'Membre';
        var initial = name.charAt(0).toUpperCase();
        var isMe = (u.id === CURRENT_USER_ID);

        // Noeud GPS — disque lumineux pour tous (moi inclus)
        var el = document.createElement('div');
        el.className = 'node-anchor' + (isMe ? ' node-me' : '');
        el.dataset.uid = u.id;
        new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(u.coords).addTo(map);

        el.addEventListener('click', function(e) {
          e.stopPropagation();
          map.flyTo({ center: u.coords, zoom: 9, duration: 900 });
          selectUser(u.id);
        });

        // Card persistante UNIQUEMENT pour les autres utilisateurs
        if (isMe) return;

        var isConnected = connectedUserIds.has(u.id);
        var isPending = pendingUserIds.has(u.id);

        var buttonsHtml = '';
        if (isConnected) {
          buttonsHtml =
            '<button class="ucp-btn ucp-btn-call" data-uid="' + u.id + '" data-action="call">📞 Appel</button>' +
            '<button class="ucp-btn ucp-btn-chat" data-uid="' + u.id + '" data-action="chat">💬 Chat</button>';
        } else if (isPending) {
          buttonsHtml =
            '<button class="ucp-btn ucp-btn-local" data-uid="' + u.id + '" data-action="local">📍 Local</button>' +
            '<button class="ucp-btn ucp-btn-connect pending" disabled>⏳ Envoyé</button>';
        } else {
          buttonsHtml =
            '<button class="ucp-btn ucp-btn-local" data-uid="' + u.id + '" data-action="local">📍 Local</button>' +
            '<button class="ucp-btn ucp-btn-connect" data-uid="' + u.id + '" data-action="connect">➕ Connecter</button>';
        }

        var cardHtml =
          '<div class="user-card-persistent">' +
            '<div class="ucp-header">' +
              avatarHtml +
              '<div class="ucp-meta">' +
                '<div class="ucp-name">' + name + '</div>' +
                '<div class="ucp-role">' + role + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="ucp-actions">' + buttonsHtml + '</div>' +
          '</div>';

        new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          anchor: 'bottom',
          offset: [0, -20],
          maxWidth: 'none'
        })
        .setLngLat(u.coords)
        .setHTML(cardHtml)
        .addTo(map);
      });
    }




    // === GESTIONNAIRE DELEGUE BOUTONS CARD ===
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.stopPropagation();
      var uid = btn.dataset.uid;
      var action = btn.dataset.action;

      if (action === 'local') {
        var u = registeredUsers.find(function(x) { return x.id === uid; });
        if (u && u.coords) map.flyTo({ center: u.coords, zoom: 12, duration: 1000 });

      } else if (action === 'connect') {
        handleConnect(uid, btn);

      } else if (action === 'call') {
        handleVoiceCall(uid);

      } else if (action === 'chat') {
        handleChat(uid);

      } else if (action === 'hangup') {
        hangupCall();

      } else if (action === 'toggle-mic') {
        toggleMic();
      }
    });

    // === CONNECT : appel Supabase reel ===
    async function handleConnect(targetId, btn) {
      if (!CURRENT_USER_ID) return;
      if (pendingUserIds.has(targetId) || connectedUserIds.has(targetId)) return;

      btn.disabled = true;
      btn.textContent = '...';

      try {
        var r = await fetch(BACKEND_URL + '/api/social/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requesterId: CURRENT_USER_ID, targetId: targetId })
        });
        var json = await r.json();
        if (json.success) {
          pendingUserIds.add(targetId);
          btn.textContent = 'Envoyee';
          btn.className = 'ucp-btn ucp-btn-connect pending';
          btn.disabled = false;
          console.log('[Social] Demande envoyee a', targetId);
        } else {
          btn.textContent = 'Erreur';
          btn.disabled = false;
        }
      } catch (err) {
        console.error('[Social] Erreur connect:', err);
        btn.textContent = 'Connect';
        btn.disabled = false;
      }
    }

    // === APPEL VOCAL LIVEKIT CLOUD ===
    async function handleVoiceCall(targetId) {
      if (!CURRENT_USER_ID) return;
      var roomName = 'call-' + [CURRENT_USER_ID, targetId].sort().join('-');
      var targetUser = registeredUsers.find(function(x) { return x.id === targetId; });
      var targetName = targetUser ? (targetUser.full_name || targetUser.email || 'Utilisateur') : 'Utilisateur';

      try {
        var r = await fetch(BACKEND_URL + '/api/livekit/token?room=' + encodeURIComponent(roomName) + '&userId=' + CURRENT_USER_ID);
        var json = await r.json();
        if (!json.token) { alert('Impossible d obtenir le token LiveKit'); return; }
        showCallPanel(targetName, json.token, roomName);
      } catch (err) {
        console.error('[LiveKit] Erreur token:', err);
      }
    }

    async function showCallPanel(peerName, token, roomName) {
      var panel = document.getElementById('call-panel');
      document.getElementById('call-peer-name').textContent = peerName;
      if (document.getElementById('call-room-name')) {
        document.getElementById('call-room-name').textContent = roomName;
      }
      panel.style.display = 'flex';

      if (window.LivekitClient) {
        try {
          activeRoom = new LivekitClient.Room({ adaptiveStream: true, dynacast: true });
          await activeRoom.connect(LIVEKIT_WS_URL, token);
          await activeRoom.localParticipant.setMicrophoneEnabled(true);
          console.log('[LiveKit WebRTC] Connecté avec succès à la room:', roomName);
        } catch (e) {
          console.warn('[LiveKit WebRTC] Connexion room:', e.message);
        }
      }
    }

    function hangupCall() {
      if (activeRoom) {
        activeRoom.disconnect();
        activeRoom = null;
      }
      var panel = document.getElementById('call-panel');
      panel.style.display = 'none';
      console.log('[LiveKit WebRTC] Appel terminé');
    }

    function toggleMic() {
      var btn = document.getElementById('mic-btn');
      var muted = btn.dataset.muted === 'true';
      btn.dataset.muted = (!muted).toString();
      btn.style.background = muted ? 'rgba(255,255,255,0.08)' : '#ef4444';
      if (activeRoom && activeRoom.localParticipant) {
        activeRoom.localParticipant.setMicrophoneEnabled(muted);
      }
    }

    // === CHAT (stub - Supabase Realtime Phase suivante) ===
    function handleChat(targetId) {
      var u = registeredUsers.find(function(x) { return x.id === targetId; });
      var name = u ? (u.full_name || u.email || 'Utilisateur') : 'Utilisateur';
      console.log('[Chat] Ouverture conversation avec', name, targetId);
    }


    function resizeCanvas() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawArcs();
    }

    function drawArcs() {
      if (!ctx || !registeredUsers || registeredUsers.length === 0) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      var connectedNodes = registeredUsers
        .filter(function(u) { return u.coords && (u.id === CURRENT_USER_ID || connectedUserIds.has(u.id)); })
        .map(function(u) {
          var pt = map.project(u.coords);
          return { id: u.id, x: pt.x, y: pt.y };
        });

      if (connectedNodes.length < 2) return;

      var zoom = map.getZoom();
      // Arc visible meme a faible zoom : epaisseur min 1.5
      var lw = Math.max(1.5, Math.min(4, zoom / 3.5));

      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var p1 = nodes[i], p2 = nodes[j];
          var dx = p2.x - p1.x;
          var dy = p2.y - p1.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          // Courbure proportionnelle a la distance ecran
          var curvature = Math.max(dist * 0.25, 60);
          var midX = (p1.x + p2.x) / 2;
          var midY = (p1.y + p2.y) / 2 - curvature;

          // Trace principal : bleu cyan -> violet
          var grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          grad.addColorStop(0, 'rgba(99, 179, 237, 0.75)');
          grad.addColorStop(0.5, 'rgba(167, 139, 250, 0.65)');
          grad.addColorStop(1, 'rgba(139, 92, 246, 0.75)');

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = lw;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Halo lumineux en dessous pour effet glow
          var gradGlow = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          gradGlow.addColorStop(0, 'rgba(99, 179, 237, 0.15)');
          gradGlow.addColorStop(1, 'rgba(139, 92, 246, 0.15)');
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
          ctx.strokeStyle = gradGlow;
          ctx.lineWidth = lw * 3.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }
    }

    // Dans un iframe srcDoc, window.onload ne se déclenche pas.
    // On utilise DOMContentLoaded ou un appel direct si le document est déjà prêt.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSocialGraph);
    } else {
      setTimeout(initSocialGraph, 0);
    }
  </script>
</body>
</html>
`;

export default function SocialGraphFeature() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        setCurrentUserId(data.user.id);
        TraccarTrackerService.getInstance().startTracking(data.user.id, 30000);
      }
    });

    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'GO_BACK') {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/features');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      TraccarTrackerService.getInstance().stopTracking();
    };
  }, []);

  // N'affiche l'iframe que lorsqu'on a l'userId (evite un rendu sans filtrage)
  if (!currentUserId) return <View style={styles.container}><Stack.Screen options={{ headerShown: false }} /></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <iframe
        srcDoc={SOCIAL_GRAPH_HTML_TEMPLATE(BACKEND_API_URL, supabaseUrl, supabaseKey, currentUserId)}
        style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#0B0D12' } as any}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D12' }
});
