/* ==========================================================================
   ui.js — shared UI helpers used across every page
   Toasts, modals, small inline icons, and the auth-aware sidebar footer.
   ========================================================================== */

(function (global) {
  "use strict";

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var ICONS = {
    heartOutline: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.5-4.7-10-9.3C.5 8 2 4 6 4c2.2 0 3.7 1.3 6 3.6C14.3 5.3 15.8 4 18 4c4 0 5.5 4 4 7.7-2.5 4.6-10 9.3-10 9.3z"/></svg>',
    heartFilled: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 21s-7.5-4.7-10-9.3C.5 8 2 4 6 4c2.2 0 3.7 1.3 6 3.6C14.3 5.3 15.8 4 18 4c4 0 5.5 4 4 7.7-2.5 4.6-10 9.3-10 9.3z"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 5l9 7-9 7V5zM17 5h2v14h-2z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 5l-9 7 9 7V5zM5 5h2v14H5z"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h3.5L15 18h5.5M3 18h3.5L11 12M16.5 6H21v4.5M16.5 18H21v-4.5"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2l4 4-4 4M3 12V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 12v3a4 4 0 01-4 4H3"/></svg>',
    volume: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4z"/></svg>',
    mute: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4z"/><path stroke="currentColor" stroke-width="2" d="M16 9l5 6M21 9l-5 6"/></svg>',
    queue: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h10M4 18h10M18 15v6M15 18h6"/></svg>',
    dots: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  // ---------------- Toasts ----------------
  var toastHost = null;
  function ensureToastHost() {
    if (toastHost) return toastHost;
    toastHost = document.createElement("div");
    toastHost.className = "toast-host";
    document.body.appendChild(toastHost);
    return toastHost;
  }
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

  // ---------------- Modal ----------------
  var modalOverlay = null;
  function ensureModalHost() {
    if (modalOverlay) return modalOverlay;
    modalOverlay = document.createElement("div");
    modalOverlay.className = "modal-overlay";
    modalOverlay.innerHTML = '<div class="modal-box" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(modalOverlay);
    modalOverlay.addEventListener("click", function (e) {
      if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modalOverlay.classList.contains("modal-open")) closeModal();
    });
    return modalOverlay;
  }
  function openModal(innerHTML) {
    var host = ensureModalHost();
    host.querySelector(".modal-box").innerHTML = innerHTML;
    host.classList.add("modal-open");
    return host.querySelector(".modal-box");
  }
  function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove("modal-open");
  }

  function confirmModal(message, confirmLabel) {
    return new Promise(function (resolve) {
      var box = openModal(
        '<p class="modal-message">' + escapeHtml(message) + '</p>' +
        '<div class="modal-actions">' +
        '<button class="btn btn-ghost" data-act="cancel">Cancel</button>' +
        '<button class="btn" data-act="confirm">' + escapeHtml(confirmLabel || "Confirm") + '</button>' +
        '</div>'
      );
      box.querySelector('[data-act="cancel"]').onclick = function () { closeModal(); resolve(false); };
      box.querySelector('[data-act="confirm"]').onclick = function () { closeModal(); resolve(true); };
    });
  }

  // ---------------- Sidebar auth footer (shared by every page) ----------------
  function renderSidebarAuth() {
    var el = document.querySelector("[data-sidebar-auth]");
    if (!el) return;
    var session = global.RAuth && global.RAuth.getSession();
    if (session) {
      el.innerHTML =
        '<li><a href="index.html#/profile">' + escapeHtml(session.profileName) + '</a></li>' +
        '<li><a href="logout.html" style="color: var(--theme-green);">Logout</a></li>';
    } else {
      el.innerHTML =
        '<li><a href="signup.html">Sign Up</a></li>' +
        '<li><a href="signin.html">Sign In</a></li>';
    }
  }

  function timeAgo(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.floor(hrs / 24);
    return days + "d ago";
  }

  global.RUi = {
    icons: ICONS,
    escapeHtml: escapeHtml,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    confirmModal: confirmModal,
    renderSidebarAuth: renderSidebarAuth,
    timeAgo: timeAgo
  };

  document.addEventListener("DOMContentLoaded", renderSidebarAuth);
})(window);
