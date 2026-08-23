/* ==========================================================================
   player.js — Resonance playback engine
   ONE centralized <audio> element and player state for the whole app.
   Views never create their own <audio> tags — they all talk to RPlayer.
   ========================================================================== */

(function (global) {
  "use strict";

  var audio = document.createElement("audio");
  audio.id = "resonance-audio";
  audio.preload = "metadata";
  document.body.appendChild(audio);

  var state = {
    contextSongIds: [],   // ordered ids of the current playing context (playlist/album/liked/search/etc)
    contextName: null,    // human label, e.g. "Liked Songs"
    playOrder: [],         // permutation of indices into contextSongIds (identity, or shuffled)
    pointer: -1,            // index into playOrder pointing at the current song
    manualQueue: [],       // song ids explicitly queued by the user — take priority for "next"
    shuffle: false,
    repeatMode: "off",     // off | context | song
    volume: 0.8,
    muted: false,
    currentSong: null
  };

  var listeners = [];
  function emit() {
    var snapshot = {
      currentSong: state.currentSong,
      playing: !audio.paused && !audio.ended && !!state.currentSong,
      currentTime: audio.currentTime || 0,
      duration: audio.duration || (state.currentSong ? state.currentSong.duration : 0),
      volume: state.volume,
      muted: state.muted,
      shuffle: state.shuffle,
      repeatMode: state.repeatMode,
      contextName: state.contextName,
      manualQueue: state.manualQueue.slice(),
      upNext: upcomingFromContext(5)
    };
    listeners.forEach(function (cb) { try { cb(snapshot); } catch (e) { console.error(e); } });
  }

  function upcomingFromContext(limit) {
    var out = [];
    for (var i = state.pointer + 1; i < state.playOrder.length && out.length < limit; i++) {
      var song = global.RDB.getSong(state.contextSongIds[state.playOrder[i]]);
      if (song) out.push(song);
    }
    return out;
  }

  function shuffledOrder(length, keepIndex) {
    var order = [];
    for (var i = 0; i < length; i++) order.push(i);
    for (var j = order.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = order[j]; order[j] = order[k]; order[k] = tmp;
    }
    if (typeof keepIndex === "number") {
      var pos = order.indexOf(keepIndex);
      if (pos > -1) {
        order.splice(pos, 1);
        order.unshift(keepIndex);
      }
    }
    return order;
  }

  function sequentialOrder(length) {
    var order = [];
    for (var i = 0; i < length; i++) order.push(i);
    return order;
  }

  function loadAndPlay(song, opts) {
    opts = opts || {};
    state.currentSong = song;
    if (audio.src !== song.audio) {
      audio.src = song.audio;
    }
    var playPromise = audio.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function (err) {
        console.warn("Resonance: playback was blocked or failed.", err);
        if (global.RUi) global.RUi.toast("Couldn't play " + song.title + ". Tap play again.", "error");
        emit();
      });
    }
    if (global.RStore) {
      global.RStore.recordPlay(song.id);
      global.RStore.savePlayerSettings({ currentSongId: song.id, contextName: state.contextName });
    }
    if (!opts.silent) emit();
  }

  var RPlayer = {
    on: function (cb) { listeners.push(cb); },
    off: function (cb) { listeners = listeners.filter(function (l) { return l !== cb; }); },
    getState: function () {
      return {
        currentSong: state.currentSong,
        playing: !audio.paused && !audio.ended && !!state.currentSong,
        currentTime: audio.currentTime || 0,
        duration: audio.duration || (state.currentSong ? state.currentSong.duration : 0),
        volume: state.volume,
        muted: state.muted,
        shuffle: state.shuffle,
        repeatMode: state.repeatMode,
        contextName: state.contextName,
        manualQueue: state.manualQueue.slice(),
        upNext: upcomingFromContext(5)
      };
    },

    /** Play a full context (playlist/album/artist/liked/search results) starting at startId (or first song). */
    playContext: function (songIds, startId, contextName) {
      songIds = (songIds || []).filter(Boolean);
      if (!songIds.length) {
        if (global.RUi) global.RUi.toast("Nothing to play here yet.", "info");
        return;
      }
      state.contextSongIds = songIds.slice();
      state.contextName = contextName || null;
      var startIndex = startId ? songIds.indexOf(startId) : 0;
      if (startIndex === -1) startIndex = 0;

      state.playOrder = state.shuffle ? shuffledOrder(songIds.length, startIndex) : sequentialOrder(songIds.length);
      state.pointer = state.shuffle ? 0 : startIndex;

      var song = global.RDB.getSong(state.contextSongIds[state.playOrder[state.pointer]]);
      if (song) loadAndPlay(song);
    },

    /** Play one song ad hoc (its own tiny context of length 1). */
    playSong: function (song) {
      RPlayer.playContext([song.id], song.id, song.title);
    },

    togglePlay: function () {
      if (!state.currentSong) return;
      if (audio.paused) {
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        audio.pause();
      }
      emit();
    },

    pause: function () { if (!audio.paused) { audio.pause(); emit(); } },

    next: function (auto) {
      // Manual queue takes priority.
      if (state.manualQueue.length > 0) {
        var nextId = state.manualQueue.shift();
        var song = global.RDB.getSong(nextId);
        if (song) { loadAndPlay(song); return; }
      }
      if (!state.contextSongIds.length) return;
      var atEnd = state.pointer >= state.playOrder.length - 1;
      if (atEnd) {
        if (state.repeatMode === "context") {
          state.pointer = 0;
        } else if (auto) {
          // End of context, nothing queued, repeat off — stop.
          audio.pause();
          emit();
          return;
        } else {
          state.pointer = 0; // manual "next" wraps around
        }
      } else {
        state.pointer += 1;
      }
      var nextSong = global.RDB.getSong(state.contextSongIds[state.playOrder[state.pointer]]);
      if (nextSong) loadAndPlay(nextSong);
    },

    prev: function () {
      if (audio.currentTime > 3 || !state.contextSongIds.length) {
        audio.currentTime = 0;
        if (audio.paused && state.currentSong) { var p = audio.play(); if (p && p.catch) p.catch(function(){}); }
        emit();
        return;
      }
      state.pointer = state.pointer > 0 ? state.pointer - 1 : 0;
      var song = global.RDB.getSong(state.contextSongIds[state.playOrder[state.pointer]]);
      if (song) loadAndPlay(song);
    },

    seekToFraction: function (fraction) {
      if (!audio.duration) return;
      audio.currentTime = Math.max(0, Math.min(1, fraction)) * audio.duration;
      emit();
    },

    seekBy: function (deltaSeconds) {
      if (!audio.duration) return;
      audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + deltaSeconds));
      emit();
    },

    setVolume: function (v) {
      state.volume = Math.max(0, Math.min(1, v));
      state.muted = state.volume === 0;
      audio.volume = state.volume;
      audio.muted = false;
      if (global.RStore) global.RStore.savePlayerSettings({ volume: state.volume });
      emit();
    },

    toggleMute: function () {
      state.muted = !state.muted;
      audio.muted = state.muted;
      emit();
    },

    toggleShuffle: function () {
      state.shuffle = !state.shuffle;
      if (state.contextSongIds.length) {
        var currentActualIndex = state.playOrder[state.pointer];
        state.playOrder = state.shuffle
          ? shuffledOrder(state.contextSongIds.length, currentActualIndex)
          : sequentialOrder(state.contextSongIds.length);
        state.pointer = state.playOrder.indexOf(currentActualIndex);
        if (state.pointer === -1) state.pointer = 0;
      }
      if (global.RStore) global.RStore.savePlayerSettings({ shuffle: state.shuffle });
      emit();
    },

    cycleRepeat: function () {
      var order = ["off", "context", "song"];
      state.repeatMode = order[(order.indexOf(state.repeatMode) + 1) % order.length];
      if (global.RStore) global.RStore.savePlayerSettings({ repeatMode: state.repeatMode });
      emit();
    },

    enqueue: function (songId) {
      state.manualQueue.push(songId);
      emit();
      if (global.RUi) {
        var song = global.RDB.getSong(songId);
        global.RUi.toast((song ? song.title : "Song") + " added to queue.", "success");
      }
    },

    removeFromQueue: function (index) {
      state.manualQueue.splice(index, 1);
      emit();
    },

    clearQueue: function () {
      state.manualQueue = [];
      emit();
    },

    isCurrentlyPlaying: function (songId) {
      return !!state.currentSong && state.currentSong.id === songId && !audio.paused;
    },

    isCurrentSong: function (songId) {
      return !!state.currentSong && state.currentSong.id === songId;
    },

    restoreSettings: function () {
      if (!global.RStore) return;
      var settings = global.RStore.getPlayerSettings();
      if (!settings) return;
      state.volume = typeof settings.volume === "number" ? settings.volume : 0.8;
      state.shuffle = !!settings.shuffle;
      state.repeatMode = settings.repeatMode || "off";
      audio.volume = state.volume;
      // Per spec: never autoplay on load. If a song was mid-session, show it
      // loaded-but-paused so the UI feels continuous without violating
      // browser autoplay policy.
      if (settings.currentSongId) {
        var song = global.RDB.getSong(settings.currentSongId);
        if (song) {
          state.currentSong = song;
          state.contextSongIds = [song.id];
          state.contextName = settings.contextName || song.title;
          state.playOrder = [0];
          state.pointer = 0;
          audio.src = song.audio;
        }
      }
      emit();
    }
  };

  audio.addEventListener("timeupdate", function () { emit(); });
  audio.addEventListener("loadedmetadata", function () { emit(); });
  audio.addEventListener("play", function () { emit(); });
  audio.addEventListener("pause", function () { emit(); });
  audio.addEventListener("ended", function () {
    if (state.repeatMode === "song") {
      audio.currentTime = 0;
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
      return;
    }
    RPlayer.next(true);
  });
  audio.addEventListener("error", function () {
    if (state.currentSong && global.RUi) {
      global.RUi.toast("This track couldn't be loaded.", "error");
    }
  });

  // Keyboard shortcuts — ignored while typing in a field.
  document.addEventListener("keydown", function (e) {
    var tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || (document.activeElement && document.activeElement.isContentEditable)) return;
    switch (e.key) {
      case " ": e.preventDefault(); RPlayer.togglePlay(); break;
      case "ArrowRight": RPlayer.seekBy(5); break;
      case "ArrowLeft": RPlayer.seekBy(-5); break;
      case "m": case "M": RPlayer.toggleMute(); break;
      case "n": case "N": RPlayer.next(); break;
      case "p": case "P": RPlayer.prev(); break;
    }
  });

  global.RPlayer = RPlayer;
})(window);
