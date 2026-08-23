/* ==========================================================================
   search.js — searches the local music library
   ========================================================================== */

(function (global) {
  "use strict";

  function norm(s) { return String(s || "").toLowerCase(); }

  var RSearch = {
    /**
     * @returns {{songs:Array, artists:Array, albums:Array, playlists:Array}}
     */
    run: function (query) {
      var q = norm(query).trim();
      if (!q) return { songs: [], artists: [], albums: [], playlists: [] };

      var songs = global.RDB.getSongs().filter(function (s) {
        return norm(s.title).indexOf(q) !== -1 || norm(s.artist).indexOf(q) !== -1 || norm(s.album).indexOf(q) !== -1;
      });

      var artists = global.RDB.getArtists().filter(function (a) { return norm(a.name).indexOf(q) !== -1; });

      var albums = global.RDB.getAlbums().filter(function (al) {
        return norm(al.title).indexOf(q) !== -1 || norm(al.artist).indexOf(q) !== -1;
      });

      var playlists = global.RDB.getCuratedPlaylists().filter(function (p) { return norm(p.name).indexOf(q) !== -1; });
      if (global.RStore && global.RStore.getData()) {
        playlists = playlists.concat(
          global.RStore.getPlaylists().filter(function (p) { return norm(p.name).indexOf(q) !== -1; })
        );
      }

      return { songs: songs, artists: artists, albums: albums, playlists: playlists };
    }
  };

  global.RSearch = RSearch;
})(window);
