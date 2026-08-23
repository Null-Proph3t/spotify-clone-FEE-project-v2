/* ==========================================================================
   auth.js — Resonance demo authentication
   Client-side only (no backend). Structured so a real backend can later
   replace signup()/login()/logout() without touching the rest of the app.
   ========================================================================== */

(function (global) {
  "use strict";

  var USERS_KEY = "resonance_users_v1";
  var SESSION_KEY = "resonance_session_v1";

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (e) {
      console.warn("Resonance: could not read " + key + ", using default.", e);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("Resonance: could not persist " + key, e);
      return false;
    }
  }

  function getUsers() { return readJSON(USERS_KEY, {}); }
  function saveUsers(users) { return writeJSON(USERS_KEY, users); }

  // Not production-grade security — a salted SHA-256 hash so we at least
  // avoid storing plaintext passwords in localStorage for this demo.
  function hashPassword(password, salt) {
    if (!global.crypto || !global.crypto.subtle) {
      // Fallback for environments without SubtleCrypto: still avoid plaintext.
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

  function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }

  function validateEmail(email) {
    return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(String(email || "").trim());
  }

  function validatePassword(password) {
    return typeof password === "string" && password.length >= 6;
  }

  function makeUserId() {
    return "u_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  var RAuth = {
    validateEmail: validateEmail,
    validatePassword: validatePassword,

    /**
     * @returns {Promise<{ok:boolean, error?:string, user?:object}>}
     */
    signup: function (email, password, profileName) {
      email = normalizeEmail(email);
      profileName = String(profileName || "").trim();

      if (!validateEmail(email)) return Promise.resolve({ ok: false, error: "Please enter a valid email address." });
      if (!validatePassword(password)) return Promise.resolve({ ok: false, error: "Password must be at least 6 characters." });
      if (!profileName) return Promise.resolve({ ok: false, error: "Please tell us what to call you." });

      var users = getUsers();
      if (users[email]) return Promise.resolve({ ok: false, error: "An account with that email already exists." });

      var salt = email + ":" + Date.now();
      return hashPassword(password, salt).then(function (hash) {
        var user = {
          id: makeUserId(),
          email: email,
          profileName: profileName,
          passwordHash: hash,
          passwordSalt: salt,
          created: new Date().toISOString()
        };
        users[email] = user;
        saveUsers(users);
        if (global.RStore) global.RStore.initUser(user.id);
        RAuth.setSession(user);
        return { ok: true, user: user };
      });
    },

    /**
     * @returns {Promise<{ok:boolean, error?:string, user?:object}>}
     */
    login: function (email, password) {
      email = normalizeEmail(email);
      var users = getUsers();
      var user = users[email];
      if (!user) return Promise.resolve({ ok: false, error: "No account found with that email." });

      return hashPassword(password, user.passwordSalt).then(function (hash) {
        if (hash !== user.passwordHash) return { ok: false, error: "Incorrect password." };
        if (global.RStore) global.RStore.initUser(user.id);
        RAuth.setSession(user);
        return { ok: true, user: user };
      });
    },

    logout: function () {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
      try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    },

    setSession: function (user) {
      var session = { userId: user.id, email: user.email, profileName: user.profileName };
      writeJSON(SESSION_KEY, session);
    },

    getSession: function () {
      return readJSON(SESSION_KEY, null);
    },

    isLoggedIn: function () {
      return !!RAuth.getSession();
    },

    getUserByEmail: function (email) {
      return getUsers()[normalizeEmail(email)] || null;
    },

    updateProfile: function (userId, changes) {
      var users = getUsers();
      var email = null;
      Object.keys(users).forEach(function (k) { if (users[k].id === userId) email = k; });
      if (!email) return { ok: false, error: "User not found." };
      if (changes.profileName) users[email].profileName = String(changes.profileName).trim();
      saveUsers(users);
      var session = RAuth.getSession();
      if (session && session.userId === userId) {
        session.profileName = users[email].profileName;
        writeJSON(SESSION_KEY, session);
      }
      return { ok: true, user: users[email] };
    }
  };

  global.RAuth = RAuth;
})(window);
