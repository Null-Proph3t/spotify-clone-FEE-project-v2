# 🎵 Resonance — A Front-End Music Streaming Web App

> A Spotify-inspired music streaming platform built with **plain HTML, CSS, and vanilla JavaScript** — no frameworks, no build tools, no backend. Everything runs entirely in the browser using `localStorage` as a mock database.

**Team No. 21** · 3rd Year Engineering Project

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Architecture](#-architecture)
- [Key Implementation Details](#-key-implementation-details)
  - [1. Authentication (`auth.js`)](#1-client-side-authentication-authjs)
  - [2. Data Layer (`data.js`)](#2-in-browser-music-catalog-datajs)
  - [3. Hash-Based Router (`app.js`)](#3-hash-based-spa-router-appjs)
  - [4. Centralized Audio Player (`player.js`)](#4-centralized-audio-engine-playerjs)
  - [5. User Data & Playlists (`store.js`)](#5-per-user-data-store-storejs)
  - [6. Search Engine (`search.js`)](#6-local-search-engine-searchjs)
  - [7. Shared UI Utilities (`ui.js`)](#7-shared-ui-utilities-uijs)
- [Known Limitations](#-known-limitations)
- [Future Improvements](#-future-improvements)
- [Contributors](#-contributors)

---

## 🧐 Overview

**Resonance** is a fully functional, single-page-application-style music streaming interface. It replicates the core listening experience of platforms like Spotify — browsing, searching, playing, queueing, liking songs, and building playlists — while being intentionally backend-free.

Since there's no server, the project demonstrates how far the browser's native storage APIs (`localStorage`, `sessionStorage`) and the Web Audio/`<audio>` element can go in simulating a real product: user accounts, a persistent music catalog, personalized playlists, and playback state all live on the client.

This makes it an ideal academic project for demonstrating:
- DOM manipulation & event delegation at scale
- State management without a framework (React/Vue)
- Client-side routing (SPA behavior using the URL hash)
- Asynchronous JavaScript (Promises, the Web Crypto API)
- Data modeling and persistence strategies in the browser

---

## ✨ Features

| Category | Details |
|---|---|
| 🔐 **Authentication** | Sign up / log in / log out with hashed passwords (SHA-256), session persistence |
| 🎶 **Music Catalog** | 6 artists, 6 albums, 21 songs, 5 curated playlists — auto-seeded on first load |
| ▶️ **Playback Engine** | Single global `<audio>` player, shuffle, repeat (off/context/song), seek bar, volume control |
| 📃 **Queue System** | Manual "Play Next" queue that takes priority over the current playing context |
| ❤️ **Liked Songs** | Like/unlike any track, synced across the whole UI in real time |
| 📂 **Custom Playlists** | Create, rename, delete playlists; add/remove songs |
| 🔍 **Search** | Instant local search across songs, artists, albums, and playlists |
| 🎧 **Smart Mixes** | Rule-based "Daily Mix", "Discover Weekly", "Release Radar", "Repeat Rewind" |
| 📱 **Responsive UI** | Collapsible sidebar, mobile top bar, adaptive layouts |
| 🧭 **SPA Routing** | Hash-based router (`#/playlist/pl_123`) — no page reloads within the app |
| 🔔 **Toasts & Modals** | Reusable notification and dialog system shared across all pages |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (custom properties / CSS variables, Flexbox) |
| Logic | Vanilla JavaScript (ES5-style, IIFE modules — no bundler needed) |
| Persistence | Browser `localStorage` / `sessionStorage` |
| Security | Web Crypto API (`SubtleCrypto.digest`) for password hashing |
| Audio | Native HTML5 `<audio>` element |

No `npm install`, no build step — open `index.html` and it works.

---

## 📁 Project Structure

```
resonance/
├── index.html          # Main SPA shell (home, search, playlists, player bar)
├── about.html           # Static About page
├── contact.html         # Contact form (stored locally, no real email backend)
├── signin.html           # Login page
├── signup.html           # Registration page
├── logout.html          # Session-clearing transition page
├── 1.html                # Splash / loading screen (auto-redirects to index.html)
│
├── style.css             # All styling, theming via CSS variables
│
├── data.js               # Seeds & serves the music catalog (songs/artists/albums)
├── auth.js                # Signup / login / logout / session management
├── store.js                # Per-user data: liked songs, playlists, history
├── search.js                # Local search across the catalog
├── player.js                 # Centralized playback engine
├── ui.js                      # Toasts, modals, sidebar auth footer, icons
└── app.js                      # Router + view rendering + event delegation
```

---

## 🚀 Getting Started

Since this is a static front-end project with no backend dependencies:

1. **Clone / download** the project folder.
2. Open **`index.html`** directly in a browser, or serve it locally for best results (audio autoplay policies behave more predictably over `http://` than `file://`):

   ```bash
   # Using Python's built-in server
   python -m http.server 8000

   # Then visit:
   http://localhost:8000/index.html
   ```
3. **Sign up** for a demo account (any email + a 6+ character password works — nothing is actually emailed or verified).
4. Explore Home, Search, Liked Songs, and try creating a playlist!

> 💡 All data (accounts, playlists, likes, play history) is stored in **your browser's `localStorage`**, scoped to the domain/port you're using. Clearing browser data resets everything.

---

## 🏗 Architecture

Resonance follows a lightweight **module pattern**: each `.js` file wraps itself in an IIFE and exposes a single global namespace (`RAuth`, `RDB`, `RStore`, `RPlayer`, `RUi`, `RSearch`), avoiding global scope pollution while still being simple enough to link via plain `<script>` tags (no imports/bundler required).

```
        ┌────────────┐
        │  data.js   │  (RDB)  → static music catalog
        └─────┬──────┘
              │
 ┌────────────┼───────────────┬───────────────┐
 │            │               │               │
┌─▼───────┐ ┌─▼────────┐  ┌───▼─────┐   ┌─────▼─────┐
│ auth.js │ │ store.js │  │search.js│   │ player.js │
│ (RAuth) │ │ (RStore) │  │(RSearch)│   │ (RPlayer) │
└─────────┘ └──────────┘  └─────────┘   └───────────┘
        \        │              │            /
         \       │              │           /
          ▼       ▼             ▼          ▼
              ┌───────────────────┐
              │      app.js       │  ← router + views + click delegation
              └─────────┬─────────┘
                        │
                  ┌─────▼─────┐
                  │   ui.js   │  ← toasts, modals (used by everything)
                  └───────────┘
```

Every page (`index.html`, `about.html`, `contact.html`, etc.) loads a subset of these scripts depending on what it needs — for instance, `signin.html` only needs `data.js`, `auth.js`, and `store.js`.

---

## 🔑 Key Implementation Details

### 1. Client-Side Authentication (`auth.js`)

Since there's no backend, passwords are **never stored in plaintext**. Each password is salted with the user's email + signup timestamp and hashed with **SHA-256** via the browser's native `SubtleCrypto` API, with a graceful fallback for environments without it:

```javascript
function hashPassword(password, salt) {
  if (!global.crypto || !global.crypto.subtle) {
    // Fallback for environments without SubtleCrypto
    var h = 0;
    var str = salt + ":" + password;
    for (var i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    return Promise.resolve("fallback:" + h);
  }
  var enc = new TextEncoder().encode(salt + ":" + password);
  return global.crypto.subtle.digest("SHA-256", enc).then(function (buf) {
    var bytes = Array.from(new Uint8Array(buf));
    return bytes.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  });
}
```

Signup/login return **Promises** with a consistent `{ ok, error, user }` shape, so the calling UI code stays clean:

```javascript
RAuth.login(email, password).then(function (res) {
  if (res.ok) {
    window.location.href = "index.html#/home";
  } else {
    errorBox.textContent = res.error;
  }
});
```

### 2. In-Browser Music Catalog (`data.js`)

The entire "database" (6 artists, 6 albums, 21 songs, 5 curated playlists) is defined as plain JS objects and **seeded into `localStorage` on first load**, so it persists like a real catalog instead of being rebuilt every visit:

```javascript
function loadCatalog() {
  try {
    var raw = localStorage.getItem(DB_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && Array.isArray(parsed.songs)) return parsed;
    }
  } catch (e) { /* corrupted storage → rebuild */ }
  var fresh = buildCatalog();
  localStorage.setItem(DB_KEY, JSON.stringify(fresh));
  return fresh;
}
```

Album art is **procedurally generated** — no image assets needed. Each song/artist/album ID is hashed into two hues that form a CSS gradient, so covers are unique but deterministic:

```javascript
var HUES = [140, 152, 12, 200, 265, 330, 45, 185, 300, 95];
function coverGradient(seed) {
  var n = 0;
  for (var i = 0; i < seed.length; i++) n += seed.charCodeAt(i);
  var h1 = HUES[n % HUES.length];
  var h2 = HUES[(n + 3) % HUES.length];
  return "linear-gradient(135deg, hsl(" + h1 + ",65%,32%), hsl(" + h2 + ",70%,48%))";
}
```

### 3. Hash-Based SPA Router (`app.js`)

Instead of a heavyweight router library, Resonance parses `window.location.hash` and re-renders the relevant view into a single `#view-root` container — giving app-like navigation (`#/playlist/pl_123`, `#/artist/ar1`) without page reloads:

```javascript
function renderRoute() {
  var parts = parseHash();
  var root = parts[0], id = parts[1];
  switch (root) {
    case "home": viewHome(); break;
    case "search": viewSearch(id ? decodeURIComponent(id) : ""); break;
    case "liked": viewLiked(); break;
    case "playlist": viewPlaylist(id); break;
    case "artist": viewArtist(id); break;
    case "album": viewAlbum(id); break;
    case "mix": viewMix(id); break;
    default: viewHome();
  }
}

window.addEventListener("hashchange", renderRoute);
```

All click interactions across every dynamically rendered view (song rows, play buttons, like buttons, playlist cards…) are handled through a **single delegated event listener** on `document.body`, keyed off `data-action` attributes — avoiding hundreds of individually attached listeners:

```javascript
function handleDelegatedClick(e) {
  var actionEl = e.target.closest("[data-action]");
  if (!actionEl) return;
  switch (actionEl.getAttribute("data-action")) {
    case "play-song": /* resolve context & play */ break;
    case "like": /* toggle like */ break;
    case "queue-add": /* add to queue */ break;
    // ...
  }
}
document.body.addEventListener("click", handleDelegatedClick);
```

### 4. Centralized Audio Engine (`player.js`)

There is exactly **one** `<audio>` element for the entire app, created once and reused, so playback survives across view/route changes:

```javascript
var audio = document.createElement("audio");
audio.id = "resonance-audio";
audio.preload = "metadata";
document.body.appendChild(audio);
```

Playback is context-aware: playing any list of songs (a playlist, album, search result, "Liked Songs") loads that list as the **current context**, and shuffle generates a Fisher–Yates-shuffled play order while keeping the requested start song first:

```javascript
function shuffledOrder(length, keepIndex) {
  var order = [];
  for (var i = 0; i < length; i++) order.push(i);
  for (var j = order.length - 1; j > 0; j--) {
    var k = Math.floor(Math.random() * (j + 1));
    var tmp = order[j]; order[j] = order[k]; order[k] = tmp;
  }
  if (typeof keepIndex === "number") {
    var pos = order.indexOf(keepIndex);
    if (pos > -1) { order.splice(pos, 1); order.unshift(keepIndex); }
  }
  return order;
}
```

A manual **"Play Next" queue** always takes priority over the current context when advancing tracks:

```javascript
next: function (auto) {
  if (state.manualQueue.length > 0) {
    var nextId = state.manualQueue.shift();
    var song = global.RDB.getSong(nextId);
    if (song) { loadAndPlay(song); return; }
  }
  // ...otherwise advance through the current context
}
```

The player emits state changes via a simple **pub-sub pattern**, so the UI (progress bar, play/pause icon, now-playing info) reacts without polling:

```javascript
var listeners = [];
function emit() {
  var snapshot = { currentSong: state.currentSong, playing: !audio.paused, /* ... */ };
  listeners.forEach(function (cb) { cb(snapshot); });
}
RPlayer.on = function (cb) { listeners.push(cb); };
```

### 5. Per-User Data Store (`store.js`)

Every logged-in user gets an isolated `localStorage` bucket (`resonance_user_<id>_v1`) holding their liked songs, playlists, play history, and player settings — keeping accounts fully independent:

```javascript
function key(userId) { return "resonance_user_" + userId + "_v1"; }

function defaultUserData() {
  return {
    likedSongs: [],
    playlists: [],
    recentlyPlayed: [],
    playCounts: {},
    playerSettings: { volume: 0.8, shuffle: false, repeatMode: "off", currentSongId: null }
  };
}
```

"Smart" recommendation-style sections (**Daily Mix**, **Discover Weekly**, **Repeat Rewind**) are computed with simple, explainable rules rather than ML — e.g. Daily Mix favors the user's two most-played genres:

```javascript
getDailyMix: function () {
  var d = RStore.getData();
  var favGenres = {};
  Object.keys(d.playCounts).forEach(function (songId) {
    var s = global.RDB.getSong(songId);
    if (s) favGenres[s.genre] = (favGenres[s.genre] || 0) + d.playCounts[songId];
  });
  var topGenres = Object.keys(favGenres)
    .sort(function (a, b) { return favGenres[b] - favGenres[a]; })
    .slice(0, 2);
  return global.RDB.getSongs().filter(function (s) { return topGenres.indexOf(s.genre) !== -1; }).slice(0, 8);
}
```

### 6. Local Search Engine (`search.js`)

A lightweight substring-matching search runs entirely client-side across songs, artists, albums, and (once logged in) the user's own playlists:

```javascript
run: function (query) {
  var q = norm(query).trim();
  var songs = global.RDB.getSongs().filter(function (s) {
    return norm(s.title).indexOf(q) !== -1
        || norm(s.artist).indexOf(q) !== -1
        || norm(s.album).indexOf(q) !== -1;
  });
  // ...same pattern for artists, albums, playlists
  return { songs: songs, artists: artists, albums: albums, playlists: playlists };
}
```

### 7. Shared UI Utilities (`ui.js`)

A single reusable **toast** and **modal** system is shared by every page (auth pages, contact form, main app) so notifications and dialogs look and behave consistently:

```javascript
function toast(message, kind) {
  var host = ensureToastHost();
  var el = document.createElement("div");
  el.className = "toast toast-" + (kind || "info");
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(function () { el.classList.add("toast-show"); });
  setTimeout(function () {
    el.classList.remove("toast-show");
    setTimeout(function () { el.remove(); }, 250);
  }, 3200);
}
```

The sidebar's login/logout footer is rendered the same way on **every** page (Home, About, Contact) by checking the current session:

```javascript
function renderSidebarAuth() {
  var el = document.querySelector("[data-sidebar-auth]");
  var session = global.RAuth.getSession();
  el.innerHTML = session
    ? '<li><a href="index.html#/profile">' + escapeHtml(session.profileName) + '</a></li><li><a href="logout.html">Logout</a></li>'
    : '<li><a href="signup.html">Sign Up</a></li><li><a href="signin.html">Sign In</a></li>';
}
```

---

## ⚠️ Known Limitations

Since this is an academic/demo project, a few things are intentionally simplified:

- **No real backend** — all "accounts" live in `localStorage` on a single browser/device. Clearing site data wipes everything.
- **Not production-grade security** — SHA-256 salted hashing is far better than plaintext, but lacks the iteration count (e.g. bcrypt/Argon2) needed for real-world password storage.
- **Demo audio tracks** — all songs stream from free sample audio (SoundHelix) rather than licensed music.
- **Contact form** doesn't send real emails; submissions are stored locally to simulate the flow.
- **No cross-device sync** — since there's no server, a user's playlists don't follow them to another browser.

---

## 🔮 Future Improvements

- Connect to a real backend (Node/Express + database) for persistent, multi-device accounts
- Replace demo audio with a licensed streaming API
- Add collaborative/shareable playlists
- Server-side password hashing (bcrypt/Argon2) once a backend exists
- Progressive Web App (PWA) support for offline playback

---

## 👥 Contributors

**Team No. 21** — 3rd Year Engineering Project

---

<p align="center">Made with 🎧 and vanilla JavaScript</p>
