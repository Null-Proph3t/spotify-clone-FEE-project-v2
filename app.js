/* ==========================================================================
   app.js — Resonance SPA shell
   Hash router + view renderers + player bar wiring + event delegation.
   ========================================================================== */

(function (global) {
  "use strict";

  var viewRoot = document.getElementById("view-root");

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  function esc(s) { return global.RUi.escapeHtml(s); }

  function requireLogin(promptText) {
    if (global.RAuth.isLoggedIn()) return true;
    viewRoot.innerHTML =
      '<div class="empty-state">' +
      '<p>' + esc(promptText || "Log in to see this.") + '</p>' +
      '<a class="btn" href="signin.html">Sign In</a>' +
      '</div>';
    return false;
  }

  function getPlaylistAny(id) {
    if (!id) return null;
    if (id.indexOf("cp") === 0) {
      var curated = global.RDB.getCuratedPlaylist(id);
      if (curated) return Object.assign({ owner: "Resonance", editable: false }, curated);
    }
    var mine = global.RStore.getPlaylist(id);
    if (mine) return Object.assign({ editable: true }, mine);
    return null;
  }

  function isOwnPlaylist(playlist) {
    return !!(playlist && playlist.editable);
  }

  // Resolve a "context" (what "next/prev" iterate through) by type+id at
  // click-time, so it always reflects the latest liked/playlist state.
  function resolveContext(type, id) {
    switch (type) {
      case "liked": return { ids: (global.RStore.getLikedSongs() || []).map(function (s) { return s.id; }), name: "Liked Songs" };
      case "playlist": {
        var p = getPlaylistAny(id);
        return { ids: p ? p.songs.slice() : [], name: p ? p.name : "Playlist" };
      }
      case "album": {
        var al = global.RDB.getAlbum(id);
        return { ids: al ? al.songs.slice() : [], name: al ? al.title : "Album" };
      }
      case "artist": {
        var ar = global.RDB.getArtist(id);
        return { ids: ar ? ar.songs.slice() : [], name: ar ? ar.name : "Artist" };
      }
      case "search": return { ids: lastSearchSongIds.slice(), name: "Search results" };
      case "recent": return { ids: (global.RStore.getRecentlyPlayed(50) || []).map(function (s) { return s.id; }), name: "Recently Played" };
      case "mix": {
        var fn = { daily: "getDailyMix", discover: "getDiscoverWeekly", release: "getReleaseRadar", repeat: "getRepeatRewind" }[id];
        var list = fn ? global.RStore[fn]() : [];
        var label = { daily: "Daily Mix", discover: "Discover Weekly", release: "Release Radar", repeat: "Repeat Rewind" }[id];
        return { ids: list.map(function (s) { return s.id; }), name: label };
      }
      default: return { ids: [], name: null };
    }
  }

  var lastSearchSongIds = [];

  // ---------------------------------------------------------------------
  // Small render fragments
  // ---------------------------------------------------------------------
  function likeButtonHtml(songId) {
    var liked = global.RStore.isLiked(songId);
    return '<button class="icon-btn like-toggle ' + (liked ? "is-liked" : "") + '" data-action="like" data-song-id="' + songId + '" aria-label="Like">' +
      (liked ? global.RUi.icons.heartFilled : global.RUi.icons.heartOutline) + '</button>';
  }

  function songRowHtml(song, index, ctxType, ctxId, opts) {
    opts = opts || {};
    var isCurrent = global.RPlayer.isCurrentSong(song.id);
    var isPlaying = global.RPlayer.isCurrentlyPlaying(song.id);
    return (
      '<div class="song-row' + (isCurrent ? " song-row-active" : "") + '" data-song-id="' + song.id + '" data-ctx-type="' + ctxType + '" data-ctx-id="' + (ctxId || "") + '">' +
      '<div class="song-row-index" data-action="play-song" data-song-id="' + song.id + '" data-ctx-type="' + ctxType + '" data-ctx-id="' + (ctxId || "") + '">' +
      (isPlaying ? '<span class="playing-bars" aria-hidden="true">&#9834;</span>' : '<span class="row-num">' + (index + 1) + '</span><span class="row-play">' + global.RUi.icons.play + '</span>') +
      '</div>' +
      '<div class="song-row-art" style="background:' + song.cover + '" data-action="play-song" data-song-id="' + song.id + '" data-ctx-type="' + ctxType + '" data-ctx-id="' + (ctxId || "") + '"></div>' +
      '<div class="song-row-main" data-action="play-song" data-song-id="' + song.id + '" data-ctx-type="' + ctxType + '" data-ctx-id="' + (ctxId || "") + '">' +
      '<div class="song-row-title">' + esc(song.title) + '</div>' +
      '<div class="song-row-sub"><a href="#/artist/' + song.artistId + '" data-action="open-artist" data-id="' + song.artistId + '">' + esc(song.artist) + '</a></div>' +
      '</div>' +
      (opts.showAlbum ? '<div class="song-row-album"><a href="#/album/' + song.albumId + '" data-action="open-album" data-id="' + song.albumId + '">' + esc(song.album) + '</a></div>' : '') +
      '<div class="song-row-actions">' +
      likeButtonHtml(song.id) +
      '<button class="icon-btn" data-action="queue-add" data-song-id="' + song.id + '" title="Add to queue" aria-label="Add to queue">' + global.RUi.icons.queue + '</button>' +
      '<button class="icon-btn" data-action="add-to-playlist" data-song-id="' + song.id + '" title="Add to playlist" aria-label="Add to playlist">' + global.RUi.icons.dots + '</button>' +
      (opts.removableFrom ? '<button class="icon-btn" data-action="remove-from-playlist" data-playlist-id="' + opts.removableFrom + '" data-song-id="' + song.id + '" title="Remove" aria-label="Remove">' + global.RUi.icons.close + '</button>' : '') +
      '<span class="song-row-duration">' + global.RDB.formatDuration(song.duration) + '</span>' +
      '</div>' +
      '</div>'
    );
  }

  function songListHtml(songs, ctxType, ctxId, opts) {
    if (!songs.length) return '<div class="empty-state">No songs here yet.</div>';
    return '<div class="song-list">' + songs.map(function (s, i) { return songRowHtml(s, i, ctxType, ctxId, opts); }).join("") + '</div>';
  }

  function playlistCardHtml(playlist, kind) {
    var id = playlist.id;
    var routeType = kind === "mix" ? "mix" : "playlist";
    var openHref = kind === "mix" ? "#/mix/" + id : "#/playlist/" + id;
    var cover = playlist.cover || global.RDB.coverGradient(String(id));
    return (
      '<a href="' + openHref + '" class="card" data-action="' + (kind === "mix" ? "open-mix" : "open-playlist") + '" data-id="' + id + '">' +
      '<div class="card-thumb" style="background:' + cover + '"><span class="play-btn" data-action="play-context" data-ctx-type="' + routeType + '" data-ctx-id="' + id + '">' + global.RUi.icons.play + '</span></div>' +
      '<h3>' + esc(playlist.name) + '</h3>' +
      '<p>' + esc(playlist.description || "") + '</p>' +
      '</a>'
    );
  }

  // ---------------------------------------------------------------------
  // View renderers
  // ---------------------------------------------------------------------
  function viewHome() {
    var session = global.RAuth.getSession();
    var hour = new Date().getHours();
    var greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    var quickItems = [];
    if (session) {
      quickItems.push({ name: "Liked Songs", href: "#/liked", ctxType: "liked", ctxId: "" });
      global.RStore.getPlaylists().slice(0, 5).forEach(function (p) {
        quickItems.push({ name: p.name, href: "#/playlist/" + p.id, ctxType: "playlist", ctxId: p.id });
      });
    } else {
      global.RDB.getCuratedPlaylists().slice(0, 6).forEach(function (p) {
        quickItems.push({ name: p.name, href: "#/playlist/" + p.id, ctxType: "playlist", ctxId: p.id });
      });
    }

    var quickHtml = quickItems.slice(0, 6).map(function (item) {
      return '<a href="' + item.href + '" class="quick-card" data-action="open-quick" data-ctx-type="' + item.ctxType + '" data-ctx-id="' + item.ctxId + '">' +
        '<span class="quick-thumb"></span><span class="quick-title">' + esc(item.name) + '</span></a>';
    }).join("");

    var curated = global.RDB.getCuratedPlaylists();
    var curatedHtml = curated.map(function (p) { return playlistCardHtml(p, "playlist"); }).join("");

    var mixes = [
      { id: "daily", name: "Daily Mix", description: "Based on what you play." },
      { id: "discover", name: "Discover Weekly", description: "Fresh picks for you." },
      { id: "release", name: "Release Radar", description: "New in the library." },
      { id: "repeat", name: "Repeat Rewind", description: "Songs you come back to." }
    ];
    var mixesHtml = mixes.map(function (m) { return playlistCardHtml(m, "mix"); }).join("");

    var recent = session ? global.RStore.getRecentlyPlayed(6) : [];
    var recentSection = "";
    if (session && recent.length) {
      recentSection =
        '<section class="row">' +
        '<div class="row-header"><h2>Recently Played</h2></div>' +
        '<div class="card-grid">' + recent.map(function (s) {
          return '<a href="#" class="card" data-action="play-song" data-song-id="' + s.id + '" data-ctx-type="recent" data-ctx-id="">' +
            '<div class="card-thumb" style="background:' + s.cover + '"><span class="play-btn">' + global.RUi.icons.play + '</span></div>' +
            '<h3>' + esc(s.title) + '</h3><p>' + esc(s.artist) + '</p></a>';
        }).join("") + '</div></section>';
    }

    viewRoot.innerHTML =
      '<section class="greeting">' +
      '<h1>' + greeting + (session ? ", " + esc(session.profileName) : "") + '</h1>' +
      '<p class="subtitle">Your favorite music, all in one place.</p>' +
      '<div class="quick-grid">' + quickHtml + '</div>' +
      '</section>' +
      '<section class="row">' +
      '<div class="row-header"><h2>Popular Playlists</h2><a href="#/collection/popular" class="see-all">Show all</a></div>' +
      '<div class="card-grid">' + curatedHtml + '</div>' +
      '</section>' +
      '<section class="row">' +
      '<div class="row-header"><h2>Made For You</h2><a href="#/collection/made-for-you" class="see-all">Show all</a></div>' +
      '<div class="card-grid">' + mixesHtml + '</div>' +
      '</section>' +
      recentSection;
  }

  function viewSearch(initialQuery) {
    viewRoot.innerHTML =
      '<section class="content-section">' +
      '<h1>Search</h1>' +
      '<input type="text" id="search-input" class="form-control search-input" placeholder="Songs, artists, albums, or playlists" value="' + esc(initialQuery || "") + '">' +
      '<div id="search-results"></div>' +
      '</section>';

    var input = document.getElementById("search-input");
    var resultsEl = document.getElementById("search-results");

    function renderResults(q) {
      if (!q.trim()) {
        resultsEl.innerHTML = '<div class="empty-state">Start typing to search Resonance.</div>';
        lastSearchSongIds = [];
        return;
      }
      var r = global.RSearch.run(q);
      lastSearchSongIds = r.songs.map(function (s) { return s.id; });
      if (!r.songs.length && !r.artists.length && !r.albums.length && !r.playlists.length) {
        resultsEl.innerHTML = '<div class="empty-state">No results found for &ldquo;' + esc(q) + '&rdquo;.</div>';
        return;
      }
      var html = "";
      if (r.songs.length) html += '<h2 class="search-heading">Songs</h2>' + songListHtml(r.songs.slice(0, 10), "search", "", { showAlbum: true });
      if (r.artists.length) {
        html += '<h2 class="search-heading">Artists</h2><div class="chip-row">' +
          r.artists.map(function (a) { return '<a href="#/artist/' + a.id + '" class="chip" data-action="open-artist" data-id="' + a.id + '">' + esc(a.name) + '</a>'; }).join("") +
          '</div>';
      }
      if (r.albums.length) {
        html += '<h2 class="search-heading">Albums</h2><div class="card-grid">' +
          r.albums.map(function (al) {
            return '<a href="#/album/' + al.id + '" class="card" data-action="open-album" data-id="' + al.id + '">' +
              '<div class="card-thumb" style="background:' + al.artwork + '"><span class="play-btn" data-action="play-context" data-ctx-type="album" data-ctx-id="' + al.id + '">' + global.RUi.icons.play + '</span></div>' +
              '<h3>' + esc(al.title) + '</h3><p>' + esc(al.artist) + '</p></a>';
          }).join("") + '</div>';
      }
      if (r.playlists.length) {
        html += '<h2 class="search-heading">Playlists</h2><div class="card-grid">' + r.playlists.map(function (p) { return playlistCardHtml(Object.assign({ editable: !!p.owner && p.owner !== "Resonance" }, p), "playlist"); }).join("") + '</div>';
      }
      resultsEl.innerHTML = html;
    }

    input.addEventListener("input", function () { renderResults(input.value); });
    renderResults(initialQuery || "");
    if (!initialQuery) input.focus();
  }

  function viewLiked() {
    if (!requireLogin("Log in to see your Liked Songs.")) return;
    var songs = global.RStore.getLikedSongs();
    viewRoot.innerHTML =
      '<section class="content-section detail-header liked-header">' +
      '<div class="detail-cover liked-cover">' + global.RUi.icons.heartFilled + '</div>' +
      '<div><span class="eyebrow">Playlist</span><h1>Liked Songs</h1><p class="detail-sub">' + songs.length + ' song' + (songs.length === 1 ? "" : "s") + '</p></div>' +
      '</section>' +
      '<div class="detail-actions">' +
      '<button class="play-big" data-action="play-context" data-ctx-type="liked" data-ctx-id="" aria-label="Play">' + global.RUi.icons.play + '</button>' +
      '</div>' +
      songListHtml(songs, "liked", "", { showAlbum: true });
  }

  function viewPlaylist(id) {
    var playlist = getPlaylistAny(id);
    if (!playlist) { viewRoot.innerHTML = '<div class="empty-state">Playlist not found.</div>'; return; }
    var songs = global.RDB.songsFor(playlist.songs);
    var mine = isOwnPlaylist(playlist);
    viewRoot.innerHTML =
      '<section class="content-section detail-header">' +
      '<div class="detail-cover" style="background:' + (playlist.cover || global.RDB.coverGradient(id)) + '"></div>' +
      '<div><span class="eyebrow">Playlist</span><h1>' + esc(playlist.name) + '</h1>' +
      '<p class="detail-sub">' + esc(playlist.description || "") + '</p>' +
      '<p class="detail-sub">' + esc(playlist.owner) + ' &middot; ' + songs.length + ' song' + (songs.length === 1 ? "" : "s") + '</p></div>' +
      '</section>' +
      '<div class="detail-actions">' +
      '<button class="play-big" data-action="play-context" data-ctx-type="playlist" data-ctx-id="' + id + '" aria-label="Play">' + global.RUi.icons.play + '</button>' +
      (mine ? '<button class="btn btn-ghost" data-action="rename-playlist" data-id="' + id + '">Rename</button>' +
             '<button class="btn btn-ghost" data-action="delete-playlist" data-id="' + id + '">Delete</button>' : '') +
      '</div>' +
      songListHtml(songs, "playlist", id, { showAlbum: true, removableFrom: mine ? id : null });
  }

  function viewArtist(id) {
    var artist = global.RDB.getArtist(id);
    if (!artist) { viewRoot.innerHTML = '<div class="empty-state">Artist not found.</div>'; return; }
    var topSongs = global.RDB.songsFor(artist.songs).slice(0, 5);
    var albums = global.RDB.getAlbums().filter(function (al) { return al.artistId === id; });
    viewRoot.innerHTML =
      '<section class="content-section detail-header">' +
      '<div class="detail-cover detail-cover-round" style="background:' + artist.image + '"></div>' +
      '<div><span class="eyebrow">Artist</span><h1>' + esc(artist.name) + '</h1><p class="detail-sub">' + esc(artist.bio) + '</p></div>' +
      '</section>' +
      '<div class="detail-actions">' +
      '<button class="play-big" data-action="play-context" data-ctx-type="artist" data-ctx-id="' + id + '" aria-label="Play">' + global.RUi.icons.play + '</button>' +
      '</div>' +
      '<h2 class="search-heading">Popular</h2>' +
      songListHtml(topSongs, "artist", id, { showAlbum: true }) +
      '<h2 class="search-heading">Albums</h2>' +
      '<div class="card-grid">' + albums.map(function (al) {
        return '<a href="#/album/' + al.id + '" class="card" data-action="open-album" data-id="' + al.id + '">' +
          '<div class="card-thumb" style="background:' + al.artwork + '"><span class="play-btn" data-action="play-context" data-ctx-type="album" data-ctx-id="' + al.id + '">' + global.RUi.icons.play + '</span></div>' +
          '<h3>' + esc(al.title) + '</h3><p>' + al.year + '</p></a>';
      }).join("") + '</div>';
  }

  function viewAlbum(id) {
    var album = global.RDB.getAlbum(id);
    if (!album) { viewRoot.innerHTML = '<div class="empty-state">Album not found.</div>'; return; }
    var songs = global.RDB.songsFor(album.songs);
    viewRoot.innerHTML =
      '<section class="content-section detail-header">' +
      '<div class="detail-cover" style="background:' + album.artwork + '"></div>' +
      '<div><span class="eyebrow">Album</span><h1>' + esc(album.title) + '</h1>' +
      '<p class="detail-sub"><a href="#/artist/' + album.artistId + '" data-action="open-artist" data-id="' + album.artistId + '">' + esc(album.artist) + '</a> &middot; ' + album.year + '</p></div>' +
      '</section>' +
      '<div class="detail-actions">' +
      '<button class="play-big" data-action="play-context" data-ctx-type="album" data-ctx-id="' + id + '" aria-label="Play">' + global.RUi.icons.play + '</button>' +
      '</div>' +
      songListHtml(songs, "album", id, {});
  }

  function viewMix(key) {
    var fn = { daily: "getDailyMix", discover: "getDiscoverWeekly", release: "getReleaseRadar", repeat: "getRepeatRewind" }[key];
    var label = { daily: "Daily Mix", discover: "Discover Weekly", release: "Release Radar", repeat: "Repeat Rewind" }[key];
    var desc = {
      daily: "A mix built from the genres you play most.",
      discover: "Tracks from the library you haven't played recently.",
      release: "The newest additions to Resonance.",
      repeat: "Your most-played songs."
    }[key];
    if (!fn) { viewRoot.innerHTML = '<div class="empty-state">Not found.</div>'; return; }
    var songs = global.RStore[fn]();
    viewRoot.innerHTML =
      '<section class="content-section detail-header">' +
      '<div class="detail-cover" style="background:' + global.RDB.coverGradient(key) + '"></div>' +
      '<div><span class="eyebrow">Mix</span><h1>' + label + '</h1><p class="detail-sub">' + desc + '</p></div>' +
      '</section>' +
      '<div class="detail-actions">' +
      '<button class="play-big" data-action="play-context" data-ctx-type="mix" data-ctx-id="' + key + '" aria-label="Play">' + global.RUi.icons.play + '</button>' +
      '</div>' +
      songListHtml(songs, "mix", key, { showAlbum: true });
  }

  function viewCollection(key) {
    if (key === "popular") {
      var curated = global.RDB.getCuratedPlaylists();
      viewRoot.innerHTML = '<section class="content-section"><h1>Popular Playlists</h1><div class="card-grid">' +
        curated.map(function (p) { return playlistCardHtml(p, "playlist"); }).join("") + '</div></section>';
      return;
    }
    if (key === "made-for-you") {
      var mixes = [
        { id: "daily", name: "Daily Mix", description: "Based on what you play." },
        { id: "discover", name: "Discover Weekly", description: "Fresh picks for you." },
        { id: "release", name: "Release Radar", description: "New in the library." },
        { id: "repeat", name: "Repeat Rewind", description: "Songs you come back to." }
      ];
      viewRoot.innerHTML = '<section class="content-section"><h1>Made For You</h1><div class="card-grid">' +
        mixes.map(function (m) { return playlistCardHtml(m, "mix"); }).join("") + '</div></section>';
      return;
    }
    viewRoot.innerHTML = '<div class="empty-state">Not found.</div>';
  }

  function viewQueueBtn() {
    // Queue is shown as a modal (see openQueueModal) rather than a full page,
    // but deep-linking #/queue still opens it for consistency.
    openQueueModal();
    global.location.hash = "#/home";
  }

  function viewProfile() {
    if (!requireLogin("Log in to see your profile.")) return;
    var session = global.RAuth.getSession();
    var stats = global.RStore.getStats();
    viewRoot.innerHTML =
      '<section class="content-section profile-view">' +
      '<div class="profile-avatar">' + esc((session.profileName || "?").charAt(0).toUpperCase()) + '</div>' +
      '<h1 id="profile-name-display">' + esc(session.profileName) + '</h1>' +
      '<p class="detail-sub">' + esc(session.email) + '</p>' +
      '<div class="profile-stats">' +
      '<div class="stat"><strong>' + stats.playlists + '</strong><span>Playlists</span></div>' +
      '<div class="stat"><strong>' + stats.liked + '</strong><span>Liked Songs</span></div>' +
      '<div class="stat"><strong>' + stats.plays + '</strong><span>Plays</span></div>' +
      '</div>' +
      '<form id="profile-form" class="profile-form">' +
      '<div class="form-group"><label for="profile-name-input">Profile name</label>' +
      '<input type="text" id="profile-name-input" class="form-control" value="' + esc(session.profileName) + '" required></div>' +
      '<button type="submit" class="btn">Save Changes</button>' +
      '</form>' +
      '</section>';

    document.getElementById("profile-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("profile-name-input").value.trim();
      if (!name) { global.RUi.toast("Profile name can't be empty.", "error"); return; }
      var res = global.RAuth.updateProfile(session.userId, { profileName: name });
      if (res.ok) {
        global.RUi.toast("Profile updated.", "success");
        global.RUi.renderSidebarAuth();
        renderRoute();
      } else {
        global.RUi.toast(res.error || "Couldn't update profile.", "error");
      }
    });
  }

  function viewPremium() {
    viewRoot.innerHTML =
      '<section class="content-section premium-view">' +
      '<h1>Resonance Premium</h1>' +
      '<p class="detail-sub">Pick the plan that fits how you listen. (Demo only — no payment is processed.)</p>' +
      '<div class="plan-grid">' +
      '<div class="plan-card">' +
      '<h2>Free</h2><p class="plan-price">$0<span>/mo</span></p>' +
      '<ul><li>Ad-supported listening</li><li>Standard audio quality</li><li>Unlimited playlists</li></ul>' +
      '<button class="btn btn-ghost" disabled>Current Plan</button>' +
      '</div>' +
      '<div class="plan-card plan-card-featured">' +
      '<h2>Premium</h2><p class="plan-price">$9.99<span>/mo</span></p>' +
      '<ul><li>Ad-free listening</li><li>High-quality audio</li><li>Offline-ready design</li><li>Unlimited skips</li></ul>' +
      '<button class="btn" data-action="fake-upgrade">Upgrade</button>' +
      '</div>' +
      '</div>' +
      '</section>';
  }

  // ---------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------
  function parseHash() {
    var raw = global.location.hash.replace(/^#/, "");
    if (!raw || raw === "/") raw = "/home";
    var parts = raw.split("/").filter(Boolean);
    return parts; // e.g. ["playlist","pl_123"]
  }

  function renderRoute() {
    var parts = parseHash();
    var root = parts[0];
    var id = parts[1];
    setActiveNav(root);
    renderLibrary();
    switch (root) {
      case "home": viewHome(); break;
      case "search": viewSearch(id ? decodeURIComponent(id) : ""); break;
      case "liked": viewLiked(); break;
      case "playlist": viewPlaylist(id); break;
      case "artist": viewArtist(id); break;
      case "album": viewAlbum(id); break;
      case "mix": viewMix(id); break;
      case "collection": viewCollection(id); break;
      case "queue": viewQueueBtn(); break;
      case "profile": viewProfile(); break;
      case "premium": viewPremium(); break;
      default: viewHome();
    }
    window.scrollTo(0, 0);
  }

  function setActiveNav(root) {
    document.querySelectorAll(".main-nav a[data-route]").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-route") === "/" + root);
    });
  }

  // ---------------------------------------------------------------------
  // Library sidebar
  // ---------------------------------------------------------------------
  function renderLibrary() {
    var el = document.getElementById("library-links");
    if (!el) return;
    if (!global.RAuth.isLoggedIn()) {
      el.innerHTML = '<li class="lib-hint">Log in to see your playlists.</li>';
      return;
    }
    var items = '<li><a href="#/liked">Liked Songs</a></li>';
    global.RStore.getPlaylists().forEach(function (p) {
      items += '<li><a href="#/playlist/' + p.id + '">' + esc(p.name) + '</a></li>';
    });
    el.innerHTML = items;
  }

  // ---------------------------------------------------------------------
  // Modals: create playlist / add-to-playlist / rename / queue
  // ---------------------------------------------------------------------
  function openCreatePlaylistModal() {
    if (!requireLoginToast()) return;
    var box = global.RUi.openModal(
      '<h2>Create Playlist</h2>' +
      '<form id="create-playlist-form">' +
      '<div class="form-group"><label for="np-name">Name</label><input id="np-name" class="form-control" placeholder="My Playlist" required></div>' +
      '<div class="form-group"><label for="np-desc">Description</label><input id="np-desc" class="form-control" placeholder="Optional"></div>' +
      '<button type="submit" class="btn">Create</button>' +
      '</form>'
    );
    box.querySelector("#create-playlist-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = box.querySelector("#np-name").value;
      var desc = box.querySelector("#np-desc").value;
      var res = global.RStore.createPlaylist(name, desc);
      if (res.ok) {
        global.RUi.closeModal();
        global.RUi.toast("Playlist created.", "success");
        renderLibrary();
        global.location.hash = "#/playlist/" + res.playlist.id;
      } else {
        global.RUi.toast(res.error || "Couldn't create playlist.", "error");
      }
    });
  }

  function openAddToPlaylistModal(songId) {
    if (!requireLoginToast()) return;
    var playlists = global.RStore.getPlaylists();
    var listHtml = playlists.length
      ? playlists.map(function (p) {
          return '<button class="playlist-pick" data-playlist-id="' + p.id + '">' + esc(p.name) +
            (p.songs.indexOf(songId) !== -1 ? ' <span class="tag-added">Added</span>' : '') + '</button>';
        }).join("")
      : '<p class="modal-message">You don\'t have any playlists yet.</p>';
    var box = global.RUi.openModal(
      '<h2>Add to Playlist</h2>' +
      '<div class="playlist-pick-list">' + listHtml + '</div>' +
      '<button class="btn btn-ghost" id="modal-new-playlist">+ New Playlist</button>'
    );
    box.querySelectorAll(".playlist-pick").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var res = global.RStore.addToPlaylist(btn.getAttribute("data-playlist-id"), songId);
        if (res.ok) {
          global.RUi.toast('Added to "' + res.playlist.name + '".', "success");
          global.RUi.closeModal();
        } else {
          global.RUi.toast(res.error || "Couldn't add song.", "error");
        }
      });
    });
    box.querySelector("#modal-new-playlist").addEventListener("click", function () {
      global.RUi.closeModal();
      openCreatePlaylistModal();
    });
  }

  function openRenamePlaylistModal(id) {
    var playlist = getPlaylistAny(id);
    if (!playlist) return;
    var box = global.RUi.openModal(
      '<h2>Rename Playlist</h2>' +
      '<form id="rename-form">' +
      '<div class="form-group"><input id="rn-name" class="form-control" value="' + esc(playlist.name) + '" required></div>' +
      '<button type="submit" class="btn">Save</button>' +
      '</form>'
    );
    box.querySelector("#rename-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var res = global.RStore.renamePlaylist(id, box.querySelector("#rn-name").value);
      if (res.ok) {
        global.RUi.closeModal();
        global.RUi.toast("Playlist renamed.", "success");
        renderLibrary();
        renderRoute();
      } else {
        global.RUi.toast(res.error || "Couldn't rename.", "error");
      }
    });
  }

  function openQueueModal() {
    function render() {
      var state = global.RPlayer.getState();
      var manualHtml = state.manualQueue.length
        ? state.manualQueue.map(function (id, i) {
            var s = global.RDB.getSong(id);
            if (!s) return "";
            return '<div class="queue-row"><div class="song-row-art" style="background:' + s.cover + '"></div>' +
              '<div class="song-row-main"><div class="song-row-title">' + esc(s.title) + '</div><div class="song-row-sub">' + esc(s.artist) + '</div></div>' +
              '<button class="icon-btn" data-queue-remove="' + i + '" title="Remove">' + global.RUi.icons.close + '</button></div>';
          }).join("")
        : '<p class="modal-message">Nothing queued.</p>';
      var upNextHtml = state.upNext.length
        ? state.upNext.map(function (s) {
            return '<div class="queue-row"><div class="song-row-art" style="background:' + s.cover + '"></div>' +
              '<div class="song-row-main"><div class="song-row-title">' + esc(s.title) + '</div><div class="song-row-sub">' + esc(s.artist) + '</div></div></div>';
          }).join("")
        : '<p class="modal-message">End of ' + esc(state.contextName || "queue") + '.</p>';

      var box = global.RUi.openModal(
        '<h2>Queue</h2>' +
        (state.currentSong ? '<h3 class="search-heading">Now Playing</h3><div class="queue-row"><div class="song-row-art" style="background:' + state.currentSong.cover + '"></div><div class="song-row-main"><div class="song-row-title">' + esc(state.currentSong.title) + '</div><div class="song-row-sub">' + esc(state.currentSong.artist) + '</div></div></div>' : '') +
        '<h3 class="search-heading">Next in Queue</h3>' + manualHtml +
        (state.manualQueue.length ? '<button class="btn btn-ghost" id="queue-clear">Clear Queue</button>' : '') +
        '<h3 class="search-heading">Next from ' + esc(state.contextName || "context") + '</h3>' + upNextHtml
      );
      box.querySelectorAll("[data-queue-remove]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          global.RPlayer.removeFromQueue(parseInt(btn.getAttribute("data-queue-remove"), 10));
          render();
        });
      });
      var clearBtn = box.querySelector("#queue-clear");
      if (clearBtn) clearBtn.addEventListener("click", function () { global.RPlayer.clearQueue(); render(); });
    }
    render();
  }

  function requireLoginToast() {
    if (global.RAuth.isLoggedIn()) return true;
    global.RUi.toast("Log in to do that.", "info");
    return false;
  }

  // ---------------------------------------------------------------------
  // Player bar
  // ---------------------------------------------------------------------
  var els = {};
  function cachePlayerEls() {
    ["player-bar", "player-art", "player-title", "player-artist", "player-like",
     "btn-shuffle", "btn-prev", "btn-playpause", "btn-next", "btn-repeat",
     "time-current", "time-duration", "seek-bar", "player-context", "btn-queue",
     "btn-mute", "volume-bar"].forEach(function (id) { els[id] = document.getElementById(id); });
  }

  var seeking = false;

  function renderPlayerBar(state) {
    if (!state.currentSong) {
      els["player-bar"].classList.add("player-bar-empty");
      return;
    }
    els["player-bar"].classList.remove("player-bar-empty");
    els["player-art"].style.background = state.currentSong.cover;
    els["player-title"].textContent = state.currentSong.title;
    els["player-artist"].textContent = state.currentSong.artist;
    els["player-like"].innerHTML = global.RStore.isLiked(state.currentSong.id) ? global.RUi.icons.heartFilled : global.RUi.icons.heartOutline;
    els["player-like"].classList.toggle("is-liked", global.RStore.isLiked(state.currentSong.id));
    els["btn-playpause"].innerHTML = state.playing ? global.RUi.icons.pause : global.RUi.icons.play;
    els["btn-shuffle"].classList.toggle("is-active", state.shuffle);
    els["btn-repeat"].classList.toggle("is-active", state.repeatMode !== "off");
    els["btn-repeat"].innerHTML = global.RUi.icons.repeat + (state.repeatMode === "song" ? '<span class="repeat-badge">1</span>' : "");
    els["player-context"].textContent = state.contextName ? "Playing from " + state.contextName : "";

    els["time-current"].textContent = global.RDB.formatDuration(state.currentTime);
    els["time-duration"].textContent = global.RDB.formatDuration(state.duration);
    if (!seeking) {
      var frac = state.duration ? (state.currentTime / state.duration) : 0;
      els["seek-bar"].value = Math.round(frac * 1000);
    }
    els["btn-mute"].innerHTML = state.muted || state.volume === 0 ? global.RUi.icons.mute : global.RUi.icons.volume;
    els["volume-bar"].value = Math.round((state.muted ? 0 : state.volume) * 100);
  }

  function wirePlayerBar() {
    cachePlayerEls();
    els["btn-playpause"].addEventListener("click", function () { global.RPlayer.togglePlay(); });
    els["btn-next"].addEventListener("click", function () { global.RPlayer.next(); });
    els["btn-prev"].addEventListener("click", function () { global.RPlayer.prev(); });
    els["btn-shuffle"].addEventListener("click", function () { global.RPlayer.toggleShuffle(); });
    els["btn-repeat"].addEventListener("click", function () { global.RPlayer.cycleRepeat(); });
    els["btn-mute"].addEventListener("click", function () { global.RPlayer.toggleMute(); });
    els["btn-queue"].addEventListener("click", openQueueModal);
    els["player-like"].addEventListener("click", function () {
      var state = global.RPlayer.getState();
      if (!state.currentSong) return;
      if (!requireLoginToast()) return;
      var res = global.RStore.toggleLike(state.currentSong.id);
      if (res.ok) {
        global.RUi.toast(res.liked ? "Added to Liked Songs." : "Removed from Liked Songs.", "success");
        renderPlayerBar(global.RPlayer.getState());
      }
    });
    els["seek-bar"].addEventListener("input", function () { seeking = true; });
    els["seek-bar"].addEventListener("change", function () {
      global.RPlayer.seekToFraction(parseInt(els["seek-bar"].value, 10) / 1000);
      seeking = false;
    });
    els["volume-bar"].addEventListener("input", function () { global.RPlayer.setVolume(parseInt(els["volume-bar"].value, 10) / 100); });
    global.RPlayer.on(renderPlayerBar);
  }

  // ---------------------------------------------------------------------
  // Event delegation for view-root + sidebar + player-bar clicks
  // ---------------------------------------------------------------------
  function handleDelegatedClick(e) {
    var actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    var action = actionEl.getAttribute("data-action");

    switch (action) {
      case "play-song": {
        e.preventDefault();
        var songId = actionEl.getAttribute("data-song-id");
        var ctxType = actionEl.getAttribute("data-ctx-type");
        var ctxId = actionEl.getAttribute("data-ctx-id");
        var ctx = resolveContext(ctxType, ctxId);
        if (!ctx.ids.length) ctx = { ids: [songId], name: null };
        global.RPlayer.playContext(ctx.ids, songId, ctx.name);
        break;
      }
      case "play-context":
      case "open-quick": {
        e.preventDefault();
        var t = actionEl.getAttribute("data-ctx-type"), i = actionEl.getAttribute("data-ctx-id");
        var c = resolveContext(t, i);
        if (action === "play-context") { global.RPlayer.playContext(c.ids, null, c.name); }
        else { global.location.hash = t === "liked" ? "#/liked" : "#/" + t + "/" + i; }
        break;
      }
      case "like": {
        e.preventDefault();
        if (!requireLoginToast()) return;
        var sid = actionEl.getAttribute("data-song-id");
        var res = global.RStore.toggleLike(sid);
        if (res.ok) {
          global.RUi.toast(res.liked ? "Added to Liked Songs." : "Removed from Liked Songs.", "success");
          renderRoute();
          renderPlayerBar(global.RPlayer.getState());
        }
        break;
      }
      case "queue-add": {
        e.preventDefault();
        global.RPlayer.enqueue(actionEl.getAttribute("data-song-id"));
        break;
      }
      case "add-to-playlist": {
        e.preventDefault();
        openAddToPlaylistModal(actionEl.getAttribute("data-song-id"));
        break;
      }
      case "remove-from-playlist": {
        e.preventDefault();
        var res2 = global.RStore.removeFromPlaylist(actionEl.getAttribute("data-playlist-id"), actionEl.getAttribute("data-song-id"));
        if (res2.ok) { global.RUi.toast("Removed from playlist.", "success"); renderRoute(); }
        break;
      }
      case "open-artist": e.preventDefault(); global.location.hash = "#/artist/" + actionEl.getAttribute("data-id"); break;
      case "open-album": e.preventDefault(); global.location.hash = "#/album/" + actionEl.getAttribute("data-id"); break;
      case "open-playlist": break; // native href handles it
      case "open-mix": break; // native href handles it
      case "create-playlist": e.preventDefault(); openCreatePlaylistModal(); break;
      case "rename-playlist": e.preventDefault(); openRenamePlaylistModal(actionEl.getAttribute("data-id")); break;
      case "delete-playlist": {
        e.preventDefault();
        var pid = actionEl.getAttribute("data-id");
        global.RUi.confirmModal("Delete this playlist? This can't be undone.", "Delete").then(function (yes) {
          if (!yes) return;
          global.RStore.deletePlaylist(pid);
          global.RUi.toast("Playlist deleted.", "success");
          renderLibrary();
          global.location.hash = "#/home";
        });
        break;
      }
      case "open-premium": e.preventDefault(); global.location.hash = "#/premium"; break;
      case "fake-upgrade": e.preventDefault(); global.RUi.toast("This is a demo — no payment was charged.", "info"); break;
      default: break;
    }
  }

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    global.RUi.renderSidebarAuth();
    renderLibrary();
    wirePlayerBar();
    global.RPlayer.restoreSettings();
    document.body.addEventListener("click", handleDelegatedClick);
    global.addEventListener("hashchange", renderRoute);
    renderRoute();
  });
})(window);
