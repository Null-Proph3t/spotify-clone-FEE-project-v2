# 🎵 Resonance — Music Streaming Web Application

> A Spotify-inspired music streaming web application built with **HTML5, CSS3, and vanilla JavaScript**.  
> No frameworks, no build tools, and no backend. The application runs entirely in the browser using `localStorage`, `sessionStorage`, and the native HTML5 `<audio>` element.

**Team No. 21 · 3rd Year Engineering Project**

---

# 1. Project Overview

**Resonance** is a single-page-application-style music streaming interface designed to reproduce the core experience of a platform such as Spotify.

The application supports:

- User signup, login, and logout
- Music browsing
- Search
- Song playback
- Queue management
- Shuffle and repeat
- Liked songs
- Custom playlists
- Recently played history
- Rule-based personalized mixes
- Responsive UI
- Client-side routing
- Reusable notifications and modals

The project is intentionally backend-free. User accounts, playlists, likes, history, and player preferences are stored in the browser.

## Academic Focus

The project demonstrates:

- DOM manipulation
- Event delegation
- Modular JavaScript
- Client-side routing
- State management without a framework
- Promises and asynchronous JavaScript
- Web Crypto API
- Browser storage and persistence
- HTML5 audio playback
- Data modeling
- Responsive CSS

---

# 2. How the Application Works

The overall flow is:

```text
User
  │
  ▼
HTML Interface
  │
  ├── CSS → Layout, theme, responsive design
  │
  ▼
JavaScript Event
  │
  ▼
Application Module
  │
  ├── RAuth   → Authentication
  ├── RDB     → Music catalog
  ├── RStore  → User data
  ├── RSearch → Search
  ├── RPlayer → Playback
  └── RUi     → Shared UI
  │
  ▼
app.js
  │
  ├── Routing
  ├── View rendering
  └── Event delegation
  │
  ▼
Updated UI / Audio / Browser Storage
```

The important design principle is:

> **User action → JavaScript logic → application state/data → UI update**

For example:

```text
Click Like
   ↓
app.js detects data-action="like"
   ↓
RStore.toggleLike(songId)
   ↓
User data is updated in localStorage
   ↓
UI is refreshed
   ↓
Heart changes to liked state
```

---

# 3. Features

| Category | Implementation |
|---|---|
| Authentication | Signup, login, logout, session handling, SHA-256 password hashing |
| Music Catalog | 6 artists, 6 albums, 21 songs, 5 curated playlists |
| Playback | One global `<audio>` element, play/pause, next/previous, seek, volume |
| Queue | Manual "Play Next" queue |
| Shuffle / Repeat | Shuffle plus repeat off/context/song |
| Liked Songs | Like/unlike tracks and persistent liked-song list |
| Playlists | Create, rename, delete, add/remove songs |
| Search | Songs, artists, albums, and user playlists |
| Smart Mixes | Daily Mix, Discover Weekly, Release Radar, Repeat Rewind |
| Routing | Hash-based SPA-style routing |
| UI | Toasts, modals, shared icons, sidebar authentication state |
| Responsive Design | Collapsible sidebar, mobile top bar, adaptive layouts |

---

# 4. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Structure | HTML5 | Page and application structure |
| Styling | CSS3 | Theme, layout, components, responsive design |
| Logic | Vanilla JavaScript | Application behavior |
| Modules | IIFE-based modules | Encapsulation without a bundler |
| Persistence | `localStorage` | Catalog and user data |
| Session | `sessionStorage` | Current login session |
| Security | Web Crypto API | SHA-256 password hashing |
| Audio | HTML5 `<audio>` | Music playback |

There is no `npm install` or build step.

For the most reliable local testing, serve the project over HTTP:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/index.html
```

---

# 5. Project Structure

```text
resonance/
│
├── index.html          # Main SPA shell
├── about.html          # About page
├── contact.html        # Contact page
├── signin.html         # Login page
├── signup.html         # Registration page
├── logout.html         # Logout transition page
├── 1.html              # Splash/loading screen
│
├── style.css            # Global styling and theme
│
├── data.js              # Music catalog and seeded data
├── auth.js              # Authentication and session management
├── store.js             # Per-user persistent data
├── search.js            # Local search
├── player.js            # Centralized audio player
├── ui.js                # Shared UI utilities
└── app.js               # Router, views, event delegation
```

---

# 6. Page-Level Architecture

## `index.html`

The main application shell.

### Important HTML responsibilities

- Sidebar/navigation
- Library area
- Dynamic `#view-root`
- Persistent music player
- Script loading order

The main application view is dynamically inserted into:

```html
<div id="view-root">
    <div class="empty-state">Loading Resonance&hellip;</div>
</div>
```

This allows the same HTML shell to display Home, Search, Playlists, Artists, Albums, Liked Songs, and other views.

### Persistent Player

The player structure is present in the main shell so that the playback interface is available throughout the application.

---

## `signin.html`

Responsible for:

- Login form
- Input validation
- Calling `RAuth.login()`
- Displaying authentication errors
- Redirecting successful users to the application

### Flow

```text
User enters email/password
        ↓
Form validation
        ↓
RAuth.login()
        ↓
auth.js validates credentials
        ↓
Session created
        ↓
#/home
```

---

## `signup.html`

Responsible for:

- Registration form
- Email validation
- Password validation
- Profile-name validation
- Calling `RAuth.signup()`

### Flow

```text
User enters details
        ↓
Validate input
        ↓
RAuth.signup()
        ↓
Create user
        ↓
Create user data store
        ↓
Create session
        ↓
Open application
```

---

## `logout.html`

Responsible for the logout transition.

The application clears the current session and returns the user to the appropriate entry point.

---

## `about.html`

Static information page using the same visual theme and shared navigation system.

---

## `contact.html`

Provides the contact form.

Because there is no backend, the project simulates the submission flow locally rather than sending a real email.

---

# 7. CSS Architecture

The project uses a shared `style.css`.

## Theme Variables

The visual theme is centralized through CSS custom properties.

```css
:root {
    --green: #1ed760;
    --bg: #050505;
    --surface: #0d0d0d;
    --surface-2: #121212;
    --text: #f4f4f4;
    --muted: #9b9b9b;
    --border: #242424;
}
```

### Why this matters

Changing a theme value updates multiple components without editing every selector.

---

## Main Layout

```css
.app-container {
    display: flex;
    min-height: 100vh;
}

.sidebar {
    width: 250px;
    position: fixed;
    height: 100vh;
}

.main-content {
    flex: 1;
    margin-left: 250px;
}
```

### Layout process

```text
App Container
   ├── Fixed Sidebar
   └── Main Content
          └── Dynamic View
```

---

## Responsive Design

The CSS includes responsive rules for:

- Smaller screens
- Collapsible sidebar
- Mobile top bar
- Adaptive grids
- Mobile player layout

The goal is to preserve the same application functionality across desktop and mobile widths.

---

# 8. JavaScript Architecture

Each major JavaScript file is wrapped as a lightweight module and exposes a single namespace.

```text
data.js   → RDB
auth.js   → RAuth
store.js  → RStore
search.js → RSearch
player.js → RPlayer
ui.js     → RUi
app.js    → Router + Views + Events
```

This avoids putting all functions into the global scope while keeping the project simple enough to run with normal `<script>` tags.

## Script Dependency Order

```html
<script src="data.js"></script>
<script src="auth.js"></script>
<script src="store.js"></script>
<script src="ui.js"></script>
<script src="search.js"></script>
<script src="player.js"></script>
<script src="app.js"></script>
```

`app.js` is loaded last because it coordinates the modules.

---

# 9. Core Module: `data.js`

## Responsibility

`data.js` is the application's music catalog layer.

It provides:

- Songs
- Artists
- Albums
- Curated playlists
- Catalog lookup functions

The catalog contains:

- 6 artists
- 6 albums
- 21 songs
- 5 curated playlists

## Catalog Persistence

The catalog is seeded into `localStorage` the first time it is needed.

### Important code

```javascript
function loadCatalog() {
    try {
        var raw = localStorage.getItem(DB_KEY);

        if (raw) {
            var parsed = JSON.parse(raw);

            if (
                parsed &&
                parsed.version === 1 &&
                Array.isArray(parsed.songs)
            ) {
                return parsed;
            }
        }
    } catch (e) {
        /* corrupted storage → rebuild */
    }

    var fresh = buildCatalog();
    localStorage.setItem(DB_KEY, JSON.stringify(fresh));
    return fresh;
}
```

### Process

```text
Request catalog
     ↓
Check localStorage
     ↓
Catalog exists?
 ┌───┴───┐
Yes      No
 │        │
Load     Build catalog
 │        │
 └───┬────┘
     ↓
Return catalog
```

## Generated Album Artwork

Album/artist/song covers are generated deterministically from IDs rather than requiring separate image files.

```javascript
function coverGradient(seed) {
    var n = 0;

    for (var i = 0; i < seed.length; i++) {
        n += seed.charCodeAt(i);
    }

    var h1 = HUES[n % HUES.length];
    var h2 = HUES[(n + 3) % HUES.length];

    return "linear-gradient(135deg, hsl(" +
        h1 + ",65%,32%), hsl(" +
        h2 + ",70%,48%))";
}
```

---

# 10. Core Module: `auth.js`

## Responsibility

Handles:

- Signup
- Login
- Logout
- Session retrieval
- Password hashing

Because there is no backend, authentication is intentionally client-side and is suitable only for a demonstration project.

## Password Hashing

Passwords are not stored directly.

```javascript
function hashPassword(password, salt) {
    var enc =
        new TextEncoder().encode(salt + ":" + password);

    return global.crypto.subtle.digest(
        "SHA-256",
        enc
    ).then(function (buf) {
        var bytes = Array.from(
            new Uint8Array(buf)
        );

        return bytes.map(function (b) {
            return b.toString(16).padStart(2, "0");
        }).join("");
    });
}
```

### Process

```text
Password
   +
Salt
   ↓
TextEncoder
   ↓
SHA-256
   ↓
Stored hash
```

## Login Call

```javascript
RAuth.login(email, password).then(function (res) {
    if (res.ok) {
        window.location.href = "index.html#/home";
    } else {
        errorBox.textContent = res.error;
    }
});
```

This separates authentication logic from the page UI.

### Important distinction

This is **not production-grade authentication**.

It demonstrates client-side password hashing and session handling. Real applications should use server-side authentication and password-hardening algorithms such as bcrypt or Argon2.

---

# 11. Core Module: `store.js`

## Responsibility

`store.js` manages data that belongs to the current user.

Stored information includes:

- Liked songs
- Playlists
- Recently played
- Play counts
- Player settings

## Per-User Storage

```javascript
function key(userId) {
    return "resonance_user_" + userId + "_v1";
}
```

### User data structure

```javascript
function defaultUserData() {
    return {
        likedSongs: [],
        playlists: [],
        recentlyPlayed: [],
        playCounts: {},
        playerSettings: {
            volume: 0.8,
            shuffle: false,
            repeatMode: "off",
            currentSongId: null
        }
    };
}
```

### Why per-user storage?

The application can keep each user's likes and playlists separate even though everything is stored in the same browser.

---

## Liked Songs

Conceptual flow:

```text
Click Like
   ↓
app.js receives event
   ↓
RStore.toggleLike(songId)
   ↓
Update likedSongs[]
   ↓
Save user data
   ↓
Refresh UI
```

---

# 12. Core Module: `search.js`

## Responsibility

Provides client-side search across:

- Songs
- Artists
- Albums
- User playlists

## Search Logic

```javascript
run: function (query) {
    var q = norm(query).trim();

    var songs = global.RDB.getSongs().filter(function (s) {
        return norm(s.title).indexOf(q) !== -1 ||
               norm(s.artist).indexOf(q) !== -1 ||
               norm(s.album).indexOf(q) !== -1;
    });

    return {
        songs: songs,
        artists: artists,
        albums: albums,
        playlists: playlists
    };
}
```

### Search flow

```text
User types query
      ↓
Normalize query
      ↓
Search catalog
      ↓
Match title / artist / album
      ↓
Return grouped results
      ↓
Render search page
```

The search does not require a server or external API.

---

# 13. Core Module: `player.js`

This is one of the most important modules in the application.

## Responsibility

The player controls:

- Current song
- Play/pause
- Next/previous
- Seek
- Volume
- Shuffle
- Repeat
- Queue
- Playback context

---

## One Global Audio Element

```javascript
var audio = document.createElement("audio");

audio.id = "resonance-audio";
audio.preload = "metadata";

document.body.appendChild(audio);
```

### Design decision

The application uses **one shared audio element** rather than creating one audio element per song.

```text
Song cards
    ↓
RPlayer
    ↓
ONE <audio>
    ↓
Current song
```

This keeps playback centralized while the user changes views.

---

## Player State

```javascript
var state = {
    contextSongIds: [],
    contextName: null,
    playOrder: [],
    pointer: -1,
    manualQueue: [],
    shuffle: false,
    repeatMode: "off",
    volume: 0.8,
    muted: false,
    currentSong: null
};
```

This state describes what the player is currently doing.

---

## Playback Context

A context is the list from which the user is currently playing.

Examples:

- Playlist
- Album
- Search results
- Liked Songs
- Mix

```text
Play Playlist
     ↓
Set playlist as context
     ↓
Choose starting song
     ↓
Play
     ↓
Next uses same context
```

---

## Shuffle

Shuffle generates a randomized play order using Fisher–Yates shuffling.

The selected starting song is kept first so that clicking Play on a particular track behaves predictably.

---

## Queue

A manual "Play Next" queue takes priority over the current playback context.

```javascript
next: function (auto) {
    if (state.manualQueue.length > 0) {
        var nextId = state.manualQueue.shift();
        var song = global.RDB.getSong(nextId);

        if (song) {
            loadAndPlay(song);
            return;
        }
    }

    /* otherwise advance through current context */
}
```

### Queue behavior

```text
Current Song
    ↓
Manual Queue has songs?
 ┌──┴──┐
Yes    No
 │      │
Play   Advance
Queue  Context
Song   Order
```

---

## Player State Updates

The player exposes state changes to the UI.

```javascript
var listeners = [];

function emit() {
    var snapshot = {
        currentSong: state.currentSong,
        playing: !audio.paused
    };

    listeners.forEach(function (cb) {
        cb(snapshot);
    });
}

RPlayer.on = function (cb) {
    listeners.push(cb);
};
```

This allows the player UI to react to playback changes without repeatedly polling the audio element.

---

# 14. Core Module: `app.js`

`app.js` acts as the application coordinator.

It is responsible for:

- Hash routing
- View rendering
- User interactions
- Connecting UI actions to modules

## Hash-Based Routing

Examples:

```text
#/home
#/search/rock
#/liked
#/playlist/pl_123
#/artist/ar1
#/album/al1
#/mix/daily
```

### Router

```javascript
function renderRoute() {
    var parts = parseHash();
    var root = parts[0];
    var id = parts[1];

    switch (root) {
        case "home":
            viewHome();
            break;

        case "search":
            viewSearch(id ? decodeURIComponent(id) : "");
            break;

        case "liked":
            viewLiked();
            break;

        case "playlist":
            viewPlaylist(id);
            break;

        case "artist":
            viewArtist(id);
            break;

        case "album":
            viewAlbum(id);
            break;

        case "mix":
            viewMix(id);
            break;

        default:
            viewHome();
    }
}

window.addEventListener("hashchange", renderRoute);
```

### Why hash routing?

It provides SPA-like navigation without requiring a backend or routing framework.

---

# 15. Event Delegation

The application dynamically generates many song rows, cards, and buttons.

Instead of attaching a separate event listener to every generated element, `app.js` uses event delegation.

```javascript
function handleDelegatedClick(e) {
    var actionEl = e.target.closest("[data-action]");

    if (!actionEl) return;

    switch (actionEl.getAttribute("data-action")) {
        case "play-song":
            /* resolve context & play */
            break;

        case "like":
            /* toggle like */
            break;

        case "queue-add":
            /* add to queue */
            break;
    }
}

document.body.addEventListener(
    "click",
    handleDelegatedClick
);
```

### Flow

```text
User clicks button
       ↓
Event bubbles to body
       ↓
Find nearest [data-action]
       ↓
Read action
       ↓
Call correct module
```

This is especially useful because views are generated dynamically.

---

# 16. Core Module: `ui.js`

`ui.js` contains reusable UI behavior.

Examples:

- Toast notifications
- Modals
- Shared icons
- Sidebar authentication state
- HTML escaping
- Common UI helpers

## Toast System

```javascript
function toast(message, kind) {
    var host = ensureToastHost();

    var el = document.createElement("div");
    el.className = "toast toast-" + (kind || "info");
    el.textContent = message;

    host.appendChild(el);

    requestAnimationFrame(function () {
        el.classList.add("toast-show");
    });

    setTimeout(function () {
        el.classList.remove("toast-show");

        setTimeout(function () {
            el.remove();
        }, 250);
    }, 3200);
}
```

### Why centralize this?

Every feature can display notifications using the same system instead of implementing its own notification markup.

---

## Sidebar Authentication State

The sidebar changes depending on whether a session exists.

```javascript
function renderSidebarAuth() {
    var el =
        document.querySelector("[data-sidebar-auth]");

    var session = global.RAuth.getSession();

    el.innerHTML = session
        ? "Profile + Logout"
        : "Sign Up + Sign In";
}
```

The actual implementation also escapes the profile name before inserting it into the sidebar.

---

# 17. Smart Mixes

The application does not claim to implement Spotify's recommendation infrastructure.

Instead, it uses simple, explainable rules.

Examples:

- Daily Mix
- Discover Weekly
- Release Radar
- Repeat Rewind

## Daily Mix Example

The application examines play counts and determines the user's most-played genres.

```text
Playback history
      ↓
Count plays by genre
      ↓
Find top genres
      ↓
Select songs from those genres
      ↓
Generate Daily Mix
```

This is intentionally rule-based rather than ML-based.

---

# 18. Important Feature Flows

## A. Play a Song

```text
User clicks song
      ↓
app.js detects play-song
      ↓
RPlayer receives song/context
      ↓
Audio source loaded
      ↓
<audio>.play()
      ↓
Player UI updates
      ↓
Recently Played updated
```

---

## B. Like a Song

```text
Click heart
      ↓
app.js
      ↓
RStore.toggleLike(songId)
      ↓
User data updated
      ↓
localStorage
      ↓
Heart/UI refreshed
```

---

## C. Create Playlist

```text
Create Playlist
      ↓
Collect playlist name
      ↓
RStore creates playlist
      ↓
Save user data
      ↓
Sidebar / library refreshed
```

---

## D. Search

```text
Search input
      ↓
RSearch.run(query)
      ↓
Songs + Artists + Albums + Playlists
      ↓
Render results
      ↓
Click result
      ↓
Open / Play
```

---

## E. Login

```text
Login form
      ↓
Input validation
      ↓
RAuth.login()
      ↓
Verify stored hash
      ↓
Create session
      ↓
#/home
```

---

# 19. Presentation / PPT Code Selection Guide

The project should **not** be presented by showing every line of code.

For each important page or feature, show only the code that explains its behavior.

## Recommended HTML snippets

Show:

- Main layout structure
- Forms
- Dynamic view root
- Player structure
- Important buttons/data attributes

Do not show:

- Every `<div>`
- Repeated cards
- Decorative markup

## Recommended CSS snippets

Show:

- Main layout
- Sidebar positioning
- Player positioning
- Responsive behavior
- Important theme variables

Do not show:

- Every color
- Every hover selector
- Repetitive component styling

## Recommended JavaScript snippets

Show:

- Authentication call
- Catalog loading
- Router
- Player state
- Audio creation
- Search function
- Playlist/like storage
- Event delegation
- Smart Mix logic

## PPT rule

> **Prefer 3–6 meaningful snippets over 20 lines of unrelated code.**

The objective is to demonstrate understanding, not to turn the presentation into a code dump.

---

# 20. Recommended PPT Structure

A strong presentation can follow this order:

### Slide 1 — Title
**Resonance: Spotify-Inspired Music Streaming Web Application**

### Slide 2 — Objective
What the project was designed to achieve.

### Slide 3 — Key Features
Authentication, playback, search, playlists, queue, etc.

### Slide 4 — Technology Stack
HTML5, CSS3, JavaScript, Browser Storage, Web Crypto, HTML5 Audio.

### Slide 5 — Project Structure
Show the file/module organization.

### Slide 6 — System Architecture
Show how `data.js`, `auth.js`, `store.js`, `search.js`, `player.js`, `ui.js`, and `app.js` interact.

### Slide 7 — Home Page
HTML + CSS snippets.

### Slide 8 — Authentication
HTML + JS + login flow.

### Slide 9 — Data Layer
Catalog model + localStorage persistence.

### Slide 10 — SPA Routing
Hash router snippet + route flow.

### Slide 11 — Search
Search HTML + search.js logic.

### Slide 12 — Music Player
Player HTML/CSS + centralized audio engine.

### Slide 13 — Queue / Shuffle / Repeat
Important `player.js` logic.

### Slide 14 — Playlists / Liked Songs
`store.js` + user data flow.

### Slide 15 — Smart Mixes
Rule-based personalization.

### Slide 16 — Shared UI
Toasts, modals, sidebar state.

### Slide 17 — Complete User Flow
Signup → Login → Search → Play → Like → Playlist → Queue → History.

### Slide 18 — Limitations
Backend, security, demo audio, cross-device sync.

### Slide 19 — Future Scope
Backend, database, licensed streaming, collaborative playlists, PWA.

### Slide 20 — Demo / Thank You

---

# 21. Viva Preparation

The team should be able to answer these questions:

### Architecture

- Why did you use vanilla JavaScript instead of React?
- Why did you separate the JavaScript into modules?
- Why is `app.js` loaded last?
- How do the modules communicate?

### Routing

- How does hash routing work?
- Why use `window.location.hash`?
- What happens when the hash changes?

### Player

- Why is there only one `<audio>` element?
- How does the player know which song is playing?
- How does next-track logic work?
- How does shuffle work?
- How does the manual queue interact with the playlist context?
- How does the UI know when playback changes?

### Storage

- Why use localStorage?
- What data is stored?
- How is data separated per user?
- What happens if localStorage is cleared?

### Authentication

- Why hash passwords?
- What is SHA-256?
- Why is this authentication not production-grade?
- Why would bcrypt/Argon2 be preferable for a real backend?

### Search

- How does search work?
- Is the search server-side?
- What data structures are searched?

### UI

- Why use event delegation?
- Why create reusable toast/modal functions?
- How does responsive CSS work?

---

# 22. Known Limitations

This is an academic/demo project, so several parts are intentionally simplified.

### No real backend

All accounts and user data live in browser storage.

Clearing site data removes the stored information.

### Not production-grade authentication

SHA-256 hashing demonstrates the concept of not storing plaintext passwords, but real applications should use server-side password hashing with an appropriate password-hardening algorithm such as bcrypt or Argon2.

### Demo audio

The project uses free sample audio rather than a licensed commercial music catalog.

### Contact form

The contact form simulates submission locally instead of sending real email.

### No cross-device synchronization

Because there is no server, user playlists and listening history do not automatically follow the user to another browser/device.

---

# 23. Future Improvements

If the project were developed beyond the academic version:

1. Add a Node.js/Express backend.
2. Add a real database.
3. Implement server-side authentication.
4. Use bcrypt/Argon2 for password storage.
5. Replace demo tracks with appropriately licensed music.
6. Add cross-device synchronization.
7. Add collaborative and shareable playlists.
8. Add a real recommendation system.
9. Add PWA support.
10. Support offline playback where legally and technically appropriate.

---

# 24. Final Project Summary

Resonance demonstrates how a surprisingly complete music-streaming experience can be built using browser-native technologies.

The project combines:

```text
HTML
 +
CSS
 +
Vanilla JavaScript
 +
Browser Storage
 +
HTML5 Audio
 +
Web Crypto API
```

The most important architectural idea is separation of responsibilities:

```text
RDB
 ↓
Catalog

RAuth
 ↓
Authentication

RStore
 ↓
User State

RSearch
 ↓
Search

RPlayer
 ↓
Playback

RUi
 ↓
Reusable UI

app.js
 ↓
Routing + Views + Events
```

This structure keeps the application understandable while still providing a realistic Spotify-style user experience.

---

# 👥 Contributors

**Team No. 21**
- Pranav Mishra (Leader)
- Aditya Singh Rawat
- Akshit Gupta

---


