/* ==========================================================================
   store.js — Resonance user-specific data
   Liked songs, playlists, recently played, play counts, player settings.
   Everything here is scoped to the logged-in user (resonance_user_<id>).
   ========================================================================== */

(function (global) {
  "use strict";

  var RECENT_LIMIT = 50;

  function key(userId) { return "resonance_user_" + userId + "_v1"; }

  function defaultUserData() {
    return {
      likedSongs: [],
      playlists: [],           // [{id,name,description,cover,owner,songs:[ids],created}]
      recentlyPlayed: [],      // [{songId, playedAt}]
      playCounts: {},          // {songId: count}
      playerSettings: { volume: 0.8, shuffle: false, repeatMode: "off", queue: [], currentSongId: null, contextName: null }
    };
  }

  function readJSON(k, fallback) {
    try {
      var raw = localStorage.getItem(k);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (e) {
      console.warn("Resonance: user data for " + k + " was corrupted, resetting.", e);
      return fallback;
    }
  }

  function writeJSON(k, value) {
    try { localStorage.setItem(k, JSON.stringify(value)); return true; }
    catch (e) { console.error("Resonance: failed to persist " + k, e); return false; }
  }

  function makeId(prefix) {
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  }

  function currentUserId() {
    var session = global.RAuth && global.RAuth.getSession();
    return session ? session.userId : null;
  }

  function load(userId) {
    var data = readJSON(key(userId), null);
    if (!data) { data = defaultUserData(); writeJSON(key(userId), data); }
    // Backfill any fields added after a user's data already existed.
    var defaults = defaultUserData();
    Object.keys(defaults).forEach(function (k) { if (!(k in data)) data[k] = defaults[k]; });
    if (!data.playerSettings) data.playerSettings = defaults.playerSettings;
    return data;
  }

  function save(userId, data) { writeJSON(key(userId), data); }

  var RStore = {
    initUser: function (userId) {
      var existing = readJSON(key(userId), null);
      if (existing) return;
      var data = defaultUserData();
      var defaults = global.RDB ? global.RDB.getDefaultUserPlaylists() : [];
      data.playlists = defaults.map(function (p) {
        return {
          id: makeId("pl"),
          name: p.name,
          description: p.description,
          owner: "you",
          songs: p.songs.slice(),
          created: new Date().toISOString()
        };
      });
      save(userId, data);
    },

    requireUser: function () {
      var uid = currentUserId();
      if (!uid) return null;
      return uid;
    },

    getData: function () {
      var uid = currentUserId();
      if (!uid) return null;
      return load(uid);
    },

    // ---------- Liked songs ----------
    isLiked: function (songId) {
      var d = RStore.getData();
      return !!(d && d.likedSongs.indexOf(songId) !== -1);
    },
    toggleLike: function (songId) {
      var uid = currentUserId();
      if (!uid) return { ok: false, error: "auth-required" };
      var d = load(uid);
      var idx = d.likedSongs.indexOf(songId);
      var liked;
      if (idx === -1) { d.likedSongs.unshift(songId); liked = true; }
      else { d.likedSongs.splice(idx, 1); liked = false; }
      save(uid, d);
      return { ok: true, liked: liked };
    },
    getLikedSongs: function () {
      var d = RStore.getData();
      if (!d) return [];
      return global.RDB.songsFor(d.likedSongs);
    },

    // ---------- Playlists ----------
    getPlaylists: function () {
      var d = RStore.getData();
      return d ? d.playlists : [];
    },
    getPlaylist: function (id) {
      var d = RStore.getData();
      if (!d) return null;
      return d.playlists.filter(function (p) { return p.id === id; })[0] || null;
    },
    createPlaylist: function (name, description) {
      var uid = currentUserId();
      if (!uid) return { ok: false, error: "auth-required" };
      name = String(name || "").trim();
      if (!name) return { ok: false, error: "Give your playlist a name." };
      var d = load(uid);
      var playlist = {
        id: makeId("pl"),
        name: name,
        description: String(description || "").trim(),
        owner: "you",
        songs: [],
        created: new Date().toISOString()
      };
      d.playlists.unshift(playlist);
      save(uid, d);
      return { ok: true, playlist: playlist };
    },
    renamePlaylist: function (id, name) {
      var uid = currentUserId();
      if (!uid) return { ok: false, error: "auth-required" };
      var d = load(uid);
      var p = d.playlists.filter(function (pl) { return pl.id === id; })[0];
      if (!p) return { ok: false, error: "Playlist not found." };
      name = String(name || "").trim();
      if (!name) return { ok: false, error: "Name can't be empty." };
      p.name = name;
      save(uid, d);
      return { ok: true, playlist: p };
    },
    deletePlaylist: function (id) {
      var uid = currentUserId();
      if (!uid) return { ok: false, error: "auth-required" };
      var d = load(uid);
      d.playlists = d.playlists.filter(function (p) { return p.id !== id; });
      save(uid, d);
      return { ok: true };
    },
    addToPlaylist: function (playlistId, songId) {
      var uid = currentUserId();
      if (!uid) return { ok: false, error: "auth-required" };
      var d = load(uid);
      var p = d.playlists.filter(function (pl) { return pl.id === playlistId; })[0];
      if (!p) return { ok: false, error: "Playlist not found." };
      if (p.songs.indexOf(songId) !== -1) return { ok: false, error: "Already in this playlist." };
      p.songs.push(songId);
      save(uid, d);
      return { ok: true, playlist: p };
    },
    removeFromPlaylist: function (playlistId, songId) {
      var uid = currentUserId();
      if (!uid) return { ok: false, error: "auth-required" };
      var d = load(uid);
      var p = d.playlists.filter(function (pl) { return pl.id === playlistId; })[0];
      if (!p) return { ok: false, error: "Playlist not found." };
      p.songs = p.songs.filter(function (id) { return id !== songId; });
      save(uid, d);
      return { ok: true, playlist: p };
    },

    // ---------- Recently played / play counts ----------
    recordPlay: function (songId) {
      var uid = currentUserId();
      if (!uid) return;
      var d = load(uid);
      d.recentlyPlayed = d.recentlyPlayed.filter(function (e) { return e.songId !== songId; });
      d.recentlyPlayed.unshift({ songId: songId, playedAt: new Date().toISOString() });
      if (d.recentlyPlayed.length > RECENT_LIMIT) d.recentlyPlayed.length = RECENT_LIMIT;
      d.playCounts[songId] = (d.playCounts[songId] || 0) + 1;
      save(uid, d);
    },
    getRecentlyPlayed: function (limit) {
      var d = RStore.getData();
      if (!d) return [];
      var ids = d.recentlyPlayed.slice(0, limit || 10).map(function (e) { return e.songId; });
      return global.RDB.songsFor(ids);
    },

    // ---------- Personalization (rule-based, not ML) ----------
    getRepeatRewind: function () {
      var d = RStore.getData();
      if (!d) return [];
      var ids = Object.keys(d.playCounts).sort(function (a, b) { return d.playCounts[b] - d.playCounts[a]; }).slice(0, 8);
      return global.RDB.songsFor(ids);
    },
    getDailyMix: function () {
      var d = RStore.getData();
      var all = global.RDB.getSongs();
      if (!d || Object.keys(d.playCounts).length === 0) return all.slice(0, 8);
      var favGenres = {};
      Object.keys(d.playCounts).forEach(function (songId) {
        var s = global.RDB.getSong(songId);
        if (s) favGenres[s.genre] = (favGenres[s.genre] || 0) + d.playCounts[songId];
      });
      var topGenres = Object.keys(favGenres).sort(function (a, b) { return favGenres[b] - favGenres[a]; }).slice(0, 2);
      var mix = all.filter(function (s) { return topGenres.indexOf(s.genre) !== -1; });
      return (mix.length ? mix : all).slice(0, 8);
    },
    getDiscoverWeekly: function () {
      var d = RStore.getData();
      var all = global.RDB.getSongs();
      if (!d) return all.slice(0, 8);
      var recentIds = d.recentlyPlayed.map(function (e) { return e.songId; });
      var fresh = all.filter(function (s) { return recentIds.indexOf(s.id) === -1; });
      return (fresh.length ? fresh : all).slice(0, 8);
    },
    getReleaseRadar: function () {
      var all = global.RDB.getSongs().slice().sort(function (a, b) { return b.year - a.year; });
      return all.slice(0, 8);
    },

    // ---------- Player settings (persisted, not auto-resumed on load) ----------
    getPlayerSettings: function () {
      var d = RStore.getData();
      return d ? d.playerSettings : defaultUserData().playerSettings;
    },
    savePlayerSettings: function (partial) {
      var uid = currentUserId();
      if (!uid) return;
      var d = load(uid);
      d.playerSettings = Object.assign({}, d.playerSettings, partial);
      save(uid, d);
    },

    // ---------- Profile stats ----------
    getStats: function () {
      var d = RStore.getData();
      if (!d) return { playlists: 0, liked: 0, plays: 0 };
      var plays = Object.keys(d.playCounts).reduce(function (sum, k) { return sum + d.playCounts[k]; }, 0);
      return { playlists: d.playlists.length, liked: d.likedSongs.length, plays: plays };
    }
  };

  global.RStore = RStore;
})(window);
