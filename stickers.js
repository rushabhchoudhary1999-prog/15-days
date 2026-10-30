/* ============================================================
   15 Days — Rushabh & Medhavi
   Sticker clip-art (inline SVG, no external assets)
   ============================================================ */

(function () {
  'use strict';

  const ART = {};

  /* @@STICKERS_A@@ */

  /* @@STICKERS_B@@ */

  function get(name) {
    return ART[name] || '';
  }

  // Fill every [data-sticker] element inside root that has not been filled yet
  function hydrate(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-sticker]:not([data-sticker-ready])').forEach((el) => {
      const svg = ART[el.getAttribute('data-sticker')];
      if (!svg) return;
      el.innerHTML = svg;
      el.setAttribute('data-sticker-ready', '');
    });
  }

  window.Stickers = { names: Object.keys(ART), get: get, hydrate: hydrate };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrate(document));
  } else {
    hydrate(document);
  }
})();
