/* ==========================================================================
   data.js — Resonance music data model
   Centralized song/artist/album/curated-playlist library.
   Seeded once into localStorage so it behaves like a real (if tiny) catalog.
   ========================================================================== */

(function (global) {
  "use strict";

  var DB_KEY = "resonance_db_v1";

  // A small set of freely streamable demo tracks (SoundHelix), cycled across
  // the catalog so every song has a real, playable audio source.
  var SAMPLE_AUDIO = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3"
  ];

  // Deterministic "cover art" — a CSS gradient built from the id, so every
  // card gets a distinct but consistent thumbnail without image assets.
  var HUES = [140, 152, 12, 200, 265, 330, 45, 185, 300, 95];
  function coverGradient(seed) {
    var n = 0;
    for (var i = 0; i < seed.length; i++) n += seed.charCodeAt(i);
    var h1 = HUES[n % HUES.length];
    var h2 = HUES[(n + 3) % HUES.length];
    return "linear-gradient(135deg, hsl(" + h1 + ",65%,32%), hsl(" + h2 + ",70%,48%))";
  }

  var ARTISTS = [
    { id: "ar1", name: "Neon Ember", bio: "Slow-burning rock & blues out of Austin.", genre: "Rock" },
    { id: "ar2", name: "Velvet Static", bio: "Indie favorites with fuzzed-out guitars.", genre: "Indie" },
    { id: "ar3", name: "Crimson Atlas", bio: "High-energy electronic production duo.", genre: "Electronic" },
    { id: "ar4", name: "Ada Solace", bio: "Smooth soul and R&B songwriter.", genre: "Soul" },
    { id: "ar5", name: "Midnight Fold", bio: "Lo-fi beats for late nights and deep focus.", genre: "Lo-fi" },
    { id: "ar6", name: "Glass Parade", bio: "Bright, hook-driven pop.", genre: "Pop" }
  ];

  var ALBUMS = [
    { id: "al1", title: "Slow Burn", artistId: "ar1", year: 2024 },
    { id: "al2", title: "Wine & Static", artistId: "ar2", year: 2025 },
    { id: "al3", title: "Pulse Theory", artistId: "ar3", year: 2026 },
    { id: "al4", title: "Charcoal Hours", artistId: "ar4", year: 2023 },
    { id: "al5", title: "Fold Line", artistId: "ar5", year: 2025 },
    { id: "al6", title: "Parade", artistId: "ar6", year: 2026 }
  ];

  // title, artistId, albumId, genre, year, duration(seconds)
  var RAW_SONGS = [
    ["Ember Road", "ar1", "al1", "Rock", 2024, 214],
    ["Whiskey Static", "ar1", "al1", "Rock", 2024, 198],
    ["Low Flame", "ar1", "al1", "Rock", 2024, 231],
    ["Rust & Rain", "ar1", "al1", "Rock", 2024, 205],

    ["Wine & Static", "ar2", "al2", "Indie", 2025, 187],
    ["Paper Windows", "ar2", "al2", "Indie", 2025, 202],
    ["Faded Polaroid", "ar2", "al2", "Indie", 2025, 176],

    ["Scarlet Pulse", "ar3", "al3", "Electronic", 2026, 221],
    ["Voltage Bloom", "ar3", "al3", "Electronic", 2026, 195],
    ["Neon Sprint", "ar3", "al3", "Electronic", 2026, 208],
    ["Pulse Theory", "ar3", "al3", "Electronic", 2026, 240],

    ["Charcoal Soul", "ar4", "al4", "Soul", 2023, 213],
    ["Slow Honey", "ar4", "al4", "Soul", 2023, 224],
    ["Amber Light", "ar4", "al4", "Soul", 2023, 199],

    ["Midnight Maroon", "ar5", "al5", "Lo-fi", 2025, 165],
    ["Coding Focus", "ar5", "al5", "Lo-fi", 2025, 189],
    ["Rewind Static", "ar5", "al5", "Lo-fi", 2025, 172],
    ["Fold Line", "ar5", "al5", "Lo-fi", 2025, 180],

    ["Bright Parade", "ar6", "al6", "Pop", 2026, 196],
    ["Daily Mix", "ar6", "al6", "Pop", 2026, 203],
    ["Repeat Rewind", "ar6", "al6", "Pop", 2026, 210]
  ];

  function buildSongs() {
    var albumsById = {};
    ALBUMS.forEach(function (a) { albumsById[a.id] = a; });
    var artistsById = {};
    ARTISTS.forEach(function (a) { artistsById[a.id] = a; });

    return RAW_SONGS.map(function (row, i) {
      var id = "s" + (i + 1);
      var title = row[0], artistId = row[1], albumId = row[2], genre = row[3], year = row[4], duration = row[5];
      return {
        id: id,
        title: title,
        artistId: artistId,
        artist: artistsById[artistId].name,
        albumId: albumId,
        album: albumsById[albumId].title,
        cover: coverGradient(id),
        audio: SAMPLE_AUDIO[i % SAMPLE_AUDIO.length],
        duration: duration,
        genre: genre,
        year: year
      };
    });
  }

  function buildCatalog() {
    var songs = buildSongs();

    var artists = ARTISTS.map(function (a) {
      var artistSongs = songs.filter(function (s) { return s.artistId === a.id; }).map(function (s) { return s.id; });
      var artistAlbums = ALBUMS.filter(function (al) { return al.artistId === a.id; }).map(function (al) { return al.id; });
      return {
        id: a.id,
        name: a.name,
        bio: a.bio,
        genre: a.genre,
        image: coverGradient(a.id),
        songs: artistSongs,
        albums: artistAlbums,
        followers: 1000 + (a.id.charCodeAt(2) || 0) * 137
      };
    });

    var albums = ALBUMS.map(function (al) {
      var albumSongs = songs.filter(function (s) { return s.albumId === al.id; }).map(function (s) { return s.id; });
      var artist = ARTISTS.filter(function (a) { return a.id === al.artistId; })[0];
      return {
        id: al.id,
        title: al.title,
        artistId: al.artistId,
        artist: artist.name,
        artwork: coverGradient(al.id),
        songs: albumSongs,
        year: al.year
      };
    });

    // Curated ("Popular Playlists") — owned by Resonance, shown on Home.
    var curated = [
      { id: "cp1", name: "Ember Road", description: "Slow-burning rock & blues.", owner: "Resonance", songs: ["s1", "s2", "s3", "s4"] },
      { id: "cp2", name: "Midnight Maroon", description: "Deep cuts for late nights.", owner: "Resonance", songs: ["s15", "s16", "s17", "s18"] },
      { id: "cp3", name: "Scarlet Pulse", description: "High-energy beats.", owner: "Resonance", songs: ["s8", "s9", "s10", "s11"] },
      { id: "cp4", name: "Wine & Static", description: "Indie favorites.", owner: "Resonance", songs: ["s5", "s6", "s7"] },
      { id: "cp5", name: "Charcoal Soul", description: "Smooth soul and R&B.", owner: "Resonance", songs: ["s12", "s13", "s14"] }
    ];

    // Default sidebar playlists — seeded into every new user's library.
    var defaultUserPlaylists = [
      { name: "Late Night Drive", description: "For the long way home.", songs: ["s15", "s2", "s13", "s6"] },
      { name: "Coding Focus", description: "Low-key beats to concentrate to.", songs: ["s16", "s17", "s18", "s9"] },
      { name: "Gym Beats", description: "High-energy tracks to move to.", songs: ["s8", "s10", "s19", "s11"] },
      { name: "Top 50 Global", description: "What everyone's listening to.", songs: ["s1", "s5", "s8", "s12", "s15", "s19"] }
    ];

    return {
      version: 1,
      songs: songs,
      artists: artists,
      albums: albums,
      curated: curated,
      defaultUserPlaylists: defaultUserPlaylists
    };
  }

  function loadCatalog() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1 && Array.isArray(parsed.songs)) return parsed;
      }
    } catch (e) {
      console.warn("Resonance: catalog storage was corrupted, rebuilding.", e);
    }
    var fresh = buildCatalog();
    try { localStorage.setItem(DB_KEY, JSON.stringify(fresh)); } catch (e) { /* storage unavailable */ }
    return fresh;
  }

  var CATALOG = loadCatalog();

  function indexById(list) {
    var map = {};
    list.forEach(function (item) { map[item.id] = item; });
    return map;
  }

  var songsById = indexById(CATALOG.songs);
  var artistsById = indexById(CATALOG.artists);
  var albumsById = indexById(CATALOG.albums);
  var curatedById = indexById(CATALOG.curated);

  var RDB = {
    getSongs: function () { return CATALOG.songs.slice(); },
    getSong: function (id) { return songsById[id] || null; },
    getArtists: function () { return CATALOG.artists.slice(); },
    getArtist: function (id) { return artistsById[id] || null; },
    getAlbums: function () { return CATALOG.albums.slice(); },
    getAlbum: function (id) { return albumsById[id] || null; },
    getCuratedPlaylists: function () { return CATALOG.curated.slice(); },
    getCuratedPlaylist: function (id) { return curatedById[id] || null; },
    getDefaultUserPlaylists: function () { return CATALOG.defaultUserPlaylists.slice(); },
    songsFor: function (ids) {
      return (ids || []).map(function (id) { return songsById[id]; }).filter(Boolean);
    },
    formatDuration: function (totalSeconds) {
      totalSeconds = Math.max(0, Math.floor(totalSeconds || 0));
      var m = Math.floor(totalSeconds / 60);
      var s = totalSeconds % 60;
      return m + ":" + (s < 10 ? "0" : "") + s;
    },
    coverGradient: coverGradient
  };

  global.RDB = RDB;
})(window);
