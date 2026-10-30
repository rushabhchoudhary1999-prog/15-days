/* ============================================================
   15 Days — Rushabh & Medhavi
   Interactive script
   ============================================================ */

(function () {
  'use strict';

  // ----------------------------------------------------------
  // State
  // ----------------------------------------------------------
  const totalScenes = 8;
  const navLockMs = 350;
  const envelopeDelayMs = 1400;

  let currentScene = 0;
  let navLocked = false;
  let navLockTimer = 0;
  let envelopeTimer = 0;
  let secretHintTaps = 0;
  let circlesOn = true;
  let fourierFrame = 0;
  let fourierStarted = false;
  let fourierReplayPending = false;
  let revealAllText = '';
  let secretHintText = '';

  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function isPhone() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  }

  // ----------------------------------------------------------
  // DOM elements (filled in init)
  // ----------------------------------------------------------
  const dom = {};

  function cacheDom() {
    const byId = (id) => document.getElementById(id);
    dom.scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
    dom.progressContainer = byId('progress-container');
    dom.progressBar = byId('progress-bar');
    dom.progressText = byId('progress-text');
    dom.bottomNav = byId('bottom-nav');
    dom.navBack = byId('nav-back');
    dom.navNext = byId('nav-next');
    dom.navDots = byId('nav-dots');
    dom.dots = [];
    dom.envelope = byId('envelope-wrapper');
    dom.envelopeNext = byId('btn-scene-1-next');
    dom.heartsGrid = byId('hearts-grid');
    dom.revealAll = byId('btn-reveal-all');
    dom.poetry = byId('poetry-container');
    dom.notes = byId('notes-container');
    dom.secretHint = byId('secret-hint');
    dom.fourierCanvas = byId('fourier-canvas');
    dom.fourierReplay = byId('btn-fourier-replay');
    dom.fourierCircles = byId('btn-fourier-circles');
    dom.confettiCanvas = byId('s8-canvas');
    dom.secretBtn = byId('btn-secret');
    dom.secretMessage = byId('secret-message');
    dom.replayBtn = byId('btn-replay');
    dom.audio = byId('ambient-music');
    dom.musicBtn = byId('btn-music');
  }

  // ----------------------------------------------------------
  // Scene data: fifteen reasons
  // ----------------------------------------------------------
  const reasons = [
    {
      title: 'Your smile',
      message: 'The way your smile arrives, quiet and unexpected, is my favourite part of every day.',
      emoji: '😊'
    },
    {
      title: 'Your kindness',
      message: 'You carry a gentleness that makes the people around you feel seen without ever needing to ask.',
      emoji: '💗'
    },
    {
      title: 'Our conversations',
      message: 'Every talk we have, light or deep, feels like coming home to something I did not know I was missing.',
      emoji: '💬'
    },
    {
      title: 'Your laughter',
      message: 'Your laughter is the sound this story wants to remember most, bright and full of life.',
      emoji: '😂'
    },
    {
      title: 'Your individuality',
      message: 'You are entirely yourself, and that honesty makes every moment we share feel real.',
      emoji: '🌟'
    },
    {
      title: 'Little moments',
      message: 'The smallest pauses between our words hold more warmth than I can put into sentences.',
      emoji: '✨'
    },
    {
      title: 'Feeling understood',
      message: 'With you, I feel understood in the quiet spaces where words do not reach.',
      emoji: '🤝'
    },
    {
      title: 'Anticipation',
      message: 'I find myself looking forward to the next time we speak, every single time.',
      emoji: '⏳'
    },
    {
      title: 'Our memories',
      message: 'Already, these fifteen days are filling with moments I want to keep forever.',
      emoji: '📸'
    },
    {
      title: 'Hope for the future',
      message: 'What comes next excites me, not because I know it, but because I want to build it with you.',
      emoji: '🌅'
    },
    {
      title: 'Your presence',
      message: 'Simply having you near turns an ordinary day into something worth remembering.',
      emoji: '🏡'
    },
    {
      title: 'The way you listen',
      message: 'You listen as if what I say matters, and that makes me want to say more.',
      emoji: '👂'
    },
    {
      title: 'Your quiet strength',
      message: 'There is a steady courage in you that inspires me without you ever having to say a word.',
      emoji: '💪'
    },
    {
      title: 'Our beginning',
      message: 'These first fifteen days are only the start, and I am grateful every one of them is with you.',
      emoji: '🌱'
    },
    {
      title: 'Just being you',
      message: 'Above everything, it is you — exactly as you are — that makes this story worth telling.',
      emoji: '🥰'
    }
  ];

  // ----------------------------------------------------------
  // Scene data: poems
  // ----------------------------------------------------------
  const poems = [
    {
      title: 'Fifteen Days',
      lines: [
        'Fifteen days, and still I find,',
        'Your smile returning to my mind.',
        'If this is how our story starts,',
        'Imagine all the coming parts.',
        '',
        'No grandest words could quite convey,',
        'The warmth you bring into my day.',
        'So here\'s my wish, both sweet and true:',
        'More little days, all spent with you.'
      ],
      author: 'For Medhavi',
      tone: 'tone-1',
      sticker: 'rose',
      corner: 'tr'
    },
    {
      title: 'Missing You',
      lines: [
        'The quiet moments miss you most,',
        'When words are few and thoughts are close.',
        'A pause, a breath, a gentle sigh,',
        'And you are there, against the sky.',
        '',
        'Not far in miles, but held in heart,',
        'A sweet and constant, quiet part.',
        'Until we speak and until we meet,',
        'You make the stillness feel complete.'
      ],
      author: 'A quiet thought',
      tone: 'tone-3',
      sticker: 'love-birds',
      corner: 'tl'
    },
    {
      title: 'Tomorrow',
      lines: [
        'Tomorrow holds a page unwritten,',
        'A morning light not yet been smitten.',
        'We will walk it, side by side,',
        'With nothing planned but open wide.',
        '',
        'New conversations, laughter new,',
        'Days painted in a brighter hue.',
        'Whatever comes, I know it\'s true:',
        'I am glad I am walking it with you.'
      ],
      author: 'Looking forward',
      tone: 'tone-4',
      sticker: 'cupid-heart',
      corner: 'tr'
    }
  ];

  // ----------------------------------------------------------
  // Scene data: hidden notes
  // ----------------------------------------------------------
  const hiddenNotes = [
    'A tiny reminder: someone is smiling because you exist.',
    'My favourite chapter is not behind us. It is the one we have yet to write.',
    'Some people make moments memorable. You make ordinary moments worth remembering.',
    'You do not have to earn my care. You already have it, simply by being you.',
    'I hope your day is as soft and bright as the way you make me feel.',
    'If today felt heavy, remember: fifteen days in, this story is already beautiful.',
    'I am rooting for you, always, in every quiet way.',
    'You deserve every good thing, and then a few more besides.'
  ];

  // ----------------------------------------------------------
  // Shared constants
  // ----------------------------------------------------------
  const heartPathData = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
  const heartSvg = '<svg viewBox="0 0 24 24" focusable="false"><path d="' + heartPathData + '"/></svg>';
  const floaterEmoji = ['💗', '💖', '💕', '💞', '💘', '🌸', '✨', '🫶'];
  const nightFloaterEmoji = ['✨', '💜', '💗', '💖'];
  const confettiColors = ['#ff3d7f', '#ff6b9d', '#ffd166', '#c084fc', '#ff7a59', '#5eead4', '#ffffff'];
  const revealAllDoneText = 'All reasons revealed 💖';
  const secretFoundText = '“You found the secret. Thank you for looking closely.” 🥰';
  const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' };

  // ----------------------------------------------------------
  // Utilities
  // ----------------------------------------------------------
  function esc(text) {
    return String(text).replace(/[&<>"']/g, (ch) => htmlEntities[ch]);
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // Run a step without letting one failure break the whole story.
  function safely(fn) {
    try {
      fn();
    } catch (err) {
      if (window.console && console.error) console.error(err);
    }
  }

  // FourierLove is written separately; every call is guarded.
  function fourier(method, ...args) {
    const api = window.FourierLove;
    if (!api || typeof api[method] !== 'function') return false;
    safely(() => api[method](...args));
    return true;
  }

  function scrollToTop() {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch (err) {
      window.scrollTo(0, 0);
    }
  }

  // ----------------------------------------------------------
  // Navigation
  // ----------------------------------------------------------
  function showScene(index, options) {
    const opts = options || {};
    const n = Math.min(totalScenes, Math.max(1, Math.round(Number(index)) || 1));
    if (n === currentScene) return false;
    if (navLocked && !opts.force) return false;
    const target = document.getElementById('scene-' + n);
    if (!target) return false;

    // Short lock against double taps; always released by the timer.
    navLocked = true;
    clearTimeout(navLockTimer);
    navLockTimer = setTimeout(() => {
      navLocked = false;
    }, navLockMs);

    const from = currentScene;
    if (from) safely(() => leaveScene(from));

    dom.scenes.forEach((s) => s.classList.toggle('active', s === target));
    currentScene = n;
    document.body.dataset.scene = String(n);
    updateChrome(n);

    if (!opts.initial) focusHeading(target, n);
    scrollToTop();

    try {
      history.replaceState(null, '', '#chapter-' + n);
    } catch (err) {
      // Some file:// or sandboxed contexts refuse URL updates; navigation still works.
    }

    safely(() => enterScene(n));
    return true;
  }

  // Move focus to the new chapter's heading (keyboard and screen-reader users).
  function focusHeading(scene, n) {
    const heading = scene.querySelector('h1');
    if (!heading) return;
    heading.focus({ preventScroll: true });
    // Not focusable yet (e.g. styles still settling)? Try once more next frame.
    if (document.activeElement !== heading) {
      requestAnimationFrame(() => {
        if (currentScene === n) heading.focus({ preventScroll: true });
      });
    }
  }

  function updateChrome(n) {
    const label = 'Chapter ' + n + ' of ' + totalScenes;
    if (dom.progressBar) dom.progressBar.style.width = (n / totalScenes) * 100 + '%';
    if (dom.progressContainer) {
      dom.progressContainer.setAttribute('aria-valuenow', String(n));
      dom.progressContainer.setAttribute('aria-valuetext', label);
    }
    if (dom.progressText) dom.progressText.textContent = label;

    dom.dots.forEach((dot, i) => {
      dot.classList.toggle('is-done', i + 1 < n);
      dot.classList.toggle('is-current', i + 1 === n);
    });

    if (dom.navBack) dom.navBack.disabled = n === 1;
    if (dom.navNext) dom.navNext.disabled = n === totalScenes;
    if (dom.bottomNav) {
      if (n === 1) {
        dom.bottomNav.setAttribute('inert', '');
        dom.bottomNav.setAttribute('aria-hidden', 'true');
      } else {
        dom.bottomNav.removeAttribute('inert');
        dom.bottomNav.removeAttribute('aria-hidden');
      }
    }
  }

  function leaveScene(n) {
    if (n === 1) clearEnvelopeTimer();
    if (n === 6) {
      cancelAnimationFrame(fourierFrame);
      fourierFrame = 0;
      fourier('stop');
    }
    if (n === 8) stopConfetti();
  }

  function enterScene(n) {
    if (n === 6) {
      cancelAnimationFrame(fourierFrame);
      // Wait one frame so the freshly shown stage has its final size.
      fourierFrame = requestAnimationFrame(() => {
        fourierFrame = 0;
        if (currentScene !== 6 || !dom.fourierCanvas) return;
        if (!fourier('start', dom.fourierCanvas, {})) return;
        fourierStarted = true;
        if (fourierReplayPending) {
          fourierReplayPending = false;
          fourier('replay');
        }
      });
    }
    if (n === 8) startConfetti();
  }

  function chapterFromHash() {
    const match = /^#(?:chapter-|scene-)?(\d{1,2})$/i.exec(window.location.hash || '');
    return match ? parseInt(match[1], 10) : 0;
  }

  function buildNavDots() {
    if (!dom.navDots) return;
    dom.navDots.innerHTML = '<span class="nav-dot"></span>'.repeat(totalScenes);
    dom.dots = Array.prototype.slice.call(dom.navDots.querySelectorAll('.nav-dot'));
  }

  function prepareHeadings() {
    dom.scenes.forEach((scene) => {
      const heading = scene.querySelector('h1');
      if (heading) heading.setAttribute('tabindex', '-1');
    });
  }

  function wireNavigation() {
    if (dom.navBack) dom.navBack.addEventListener('click', () => showScene(currentScene - 1));
    if (dom.navNext) dom.navNext.addEventListener('click', () => showScene(currentScene + 1));

    // Keyboard: ← / → / Home / End
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      let to;
      if (e.key === 'ArrowRight') to = currentScene + 1;
      else if (e.key === 'ArrowLeft') to = currentScene - 1;
      else if (e.key === 'Home') to = 1;
      else if (e.key === 'End') to = totalScenes;
      else return;
      e.preventDefault();
      showScene(to);
    });

    // Horizontal swipe on touch screens
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;
    document.addEventListener('touchstart', (e) => {
      tracking = e.touches.length === 1;
      if (!tracking) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (!tracking || !e.changedTouches.length) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Date.now() - startTime > 700) return;
      if (Math.abs(dx) > 70 && Math.abs(dx) > 1.6 * Math.abs(dy)) {
        showScene(currentScene + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
    document.addEventListener('touchcancel', () => {
      tracking = false;
    }, { passive: true });

    // Deep links typed into the address bar while the page is open
    window.addEventListener('hashchange', () => {
      const n = chapterFromHash();
      if (n) showScene(n, { force: true });
    });
  }

  // ----------------------------------------------------------
  // Scene 1: Envelope
  // ----------------------------------------------------------
  function openEnvelope() {
    const envelope = dom.envelope;
    if (!envelope || envelope.classList.contains('open')) return;
    envelope.classList.add('open');
    envelope.setAttribute('aria-label', 'Envelope opened');
  }

  function clearEnvelopeTimer() {
    if (envelopeTimer) clearTimeout(envelopeTimer);
    envelopeTimer = 0;
  }

  function initScene1() {
    const envelope = dom.envelope;
    if (envelope) {
      envelope.addEventListener('click', openEnvelope);
      envelope.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        e.preventDefault();
        openEnvelope();
      });
    }

    if (dom.envelopeNext) {
      dom.envelopeNext.addEventListener('click', () => {
        if (envelope && !envelope.classList.contains('open')) {
          openEnvelope();
          // Let the letter slide out before moving on (scheduled once).
          if (!envelopeTimer) {
            envelopeTimer = setTimeout(() => {
              envelopeTimer = 0;
              if (currentScene === 1) showScene(2, { force: true });
            }, envelopeDelayMs);
          }
          return;
        }
        showScene(2);
      });
    }
  }

  // ----------------------------------------------------------
  // Scene 3: Fifteen reasons hearts
  // ----------------------------------------------------------
  function heartCards() {
    return dom.heartsGrid ? Array.prototype.slice.call(dom.heartsGrid.querySelectorAll('.heart-card')) : [];
  }

  function reasonLabel(i, revealed) {
    const reason = reasons[i];
    return 'Reason ' + (i + 1) + ': ' + reason.title + (revealed ? '. ' + reason.message : '');
  }

  function setReasonRevealed(card, revealed) {
    card.classList.toggle('revealed', revealed);
    card.setAttribute('aria-expanded', String(revealed));
    card.setAttribute('aria-label', reasonLabel(Number(card.dataset.index), revealed));
  }

  function updateRevealAll() {
    const btn = dom.revealAll;
    if (!btn) return;
    const cards = heartCards();
    const allRevealed = cards.length > 0 && cards.every((card) => card.classList.contains('revealed'));
    btn.disabled = allRevealed;
    btn.textContent = allRevealed ? revealAllDoneText : revealAllText;
  }

  function initScene3() {
    const grid = dom.heartsGrid;
    if (!grid) return;

    grid.innerHTML = reasons.map((reason, i) =>
      '<button class="heart-card tone-' + ((i % 5) + 1) + '" type="button" aria-expanded="false"' +
        ' data-index="' + i + '" aria-label="' + esc(reasonLabel(i, false)) + '">' +
        '<span class="heart-card-num">' + pad2(i + 1) + '</span>' +
        '<span class="heart-icon" aria-hidden="true">' + heartSvg + '</span>' +
        '<span class="heart-card-title">' + esc(reason.title) + '</span>' +
        '<span class="heart-card-message">' + esc(reason.message) + '</span>' +
        '<span class="heart-card-emoji" aria-hidden="true">' + reason.emoji + '</span>' +
      '</button>'
    ).join('');

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.heart-card');
      if (!card || !grid.contains(card) || card.classList.contains('revealed')) return;
      setReasonRevealed(card, true);
      updateRevealAll();
    });

    if (dom.revealAll) {
      revealAllText = dom.revealAll.textContent;
      dom.revealAll.addEventListener('click', () => {
        heartCards().forEach((card) => setReasonRevealed(card, true));
        updateRevealAll();
      });
    }
  }

  // ----------------------------------------------------------
  // Scene 4: Poetry
  // ----------------------------------------------------------
  function initScene4() {
    const container = dom.poetry;
    if (!container) return;

    container.innerHTML = poems.map((poem) => {
      let lineIndex = 0;
      const linesHtml = poem.lines.map((line) => (line
        ? '<span class="poem-line" style="--i:' + (lineIndex++) + '">' + esc(line) + '</span>'
        : '<span class="poem-gap"></span>')
      ).join('');

      return '<article class="poem-card ' + poem.tone + '">' +
        '<span class="sticker sticker--sm corner-sticker corner-sticker--' + poem.corner + '"' +
          ' data-sticker="' + poem.sticker + '" aria-hidden="true"></span>' +
        '<h2 class="poem-title">' + esc(poem.title) + '</h2>' +
        '<div class="poem-lines">' + linesHtml + '</div>' +
        '<p class="poem-signature">— ' + esc(poem.author) + '</p>' +
      '</article>';
    }).join('');

    if (window.Stickers && typeof window.Stickers.hydrate === 'function') {
      safely(() => window.Stickers.hydrate(container));
    }
  }

  // ----------------------------------------------------------
  // Scene 5: Hidden love notes + secret hint
  // ----------------------------------------------------------
  function noteCards() {
    return dom.notes ? Array.prototype.slice.call(dom.notes.querySelectorAll('.note-card')) : [];
  }

  function noteLabel(i, open) {
    return 'Hidden note ' + (i + 1) + (open ? ': ' + hiddenNotes[i] : '');
  }

  function setNoteFlipped(card, open) {
    card.classList.toggle('flipped', open);
    card.setAttribute('aria-pressed', String(open));
    card.setAttribute('aria-label', noteLabel(Number(card.dataset.index), open));
  }

  function resetSecretHint() {
    secretHintTaps = 0;
    if (!dom.secretHint) return;
    dom.secretHint.textContent = secretHintText;
    dom.secretHint.classList.remove('is-found');
  }

  function initScene5() {
    const container = dom.notes;
    if (container) {
      container.innerHTML = hiddenNotes.map((note, i) =>
        '<button class="note-card tone-' + (((i + 1) % 5) + 1) + '" type="button" aria-pressed="false"' +
          ' data-index="' + i + '" aria-label="' + esc(noteLabel(i, false)) + '">' +
          '<span class="note-inner">' +
            '<span class="note-front"><span class="note-seal" aria-hidden="true">💌</span>' +
              '<span class="note-front-label">Open note</span></span>' +
            '<span class="note-back"><span class="note-message">' + esc(note) + '</span></span>' +
          '</span>' +
        '</button>'
      ).join('');

      container.addEventListener('click', (e) => {
        const card = e.target.closest('.note-card');
        if (card && container.contains(card)) setNoteFlipped(card, !card.classList.contains('flipped'));
      });
    }

    // Secret interaction: tapping the hint three times reveals a hidden message
    const hint = dom.secretHint;
    if (hint) {
      secretHintText = hint.textContent;
      hint.addEventListener('click', () => {
        if (hint.classList.contains('is-found')) return;
        secretHintTaps++;
        if (secretHintTaps >= 3) {
          hint.textContent = secretFoundText;
          hint.classList.add('is-found');
        }
      });
    }
  }

  // ----------------------------------------------------------
  // Scene 6: Fourier drawing controls
  // ----------------------------------------------------------
  function setCircles(on) {
    circlesOn = on;
    fourier('setCircles', on);
    if (!dom.fourierCircles) return;
    dom.fourierCircles.setAttribute('aria-pressed', String(on));
    dom.fourierCircles.textContent = on ? 'Hide circles' : 'Show circles';
  }

  function initScene6() {
    if (dom.fourierReplay) dom.fourierReplay.addEventListener('click', () => fourier('replay'));
    if (dom.fourierCircles) {
      circlesOn = dom.fourierCircles.getAttribute('aria-pressed') !== 'false';
      dom.fourierCircles.addEventListener('click', () => setCircles(!circlesOn));
    }
  }

  // ----------------------------------------------------------
  // Scene 8: confetti hearts (canvas)
  // ----------------------------------------------------------
  const confetti = {
    canvas: null,
    ctx: null,
    shape: null,
    width: 0,
    height: 0,
    hearts: [],
    active: false,
    raf: 0,
    last: 0
  };

  function initConfetti() {
    const canvas = dom.confettiCanvas;
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return;
    confetti.canvas = canvas;
    confetti.ctx = ctx;
    confetti.shape = typeof Path2D === 'function' ? new Path2D(heartPathData) : null;

    window.addEventListener('resize', () => {
      if (!confetti.active) return;
      sizeConfetti();
      if (reducedMotion) drawConfetti(0);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseConfetti();
      else runConfetti();
    });
  }

  function sizeConfetti() {
    const canvas = confetti.canvas;
    const box = canvas.parentElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // Measure the full-screen background layer, never the canvas itself
    // (an unstyled canvas would grow from its own backing store on every resize).
    const w = (box && box.clientWidth) || window.innerWidth;
    const h = (box && box.clientHeight) || window.innerHeight;
    if (confetti.width && w !== confetti.width) {
      const scale = w / confetti.width;
      confetti.hearts.forEach((p) => {
        p.x *= scale;
      });
    }
    confetti.width = w;
    confetti.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    confetti.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Ambient falling heart; reuses `p` when recycling one that left the screen.
  function fallingHeart(p, scatter) {
    const size = rand(10, 24);
    return Object.assign(p || {}, {
      x: rand(0, confetti.width),
      y: scatter ? rand(-0.25, 1) * confetti.height : -size - rand(0, 80),
      vx: 0,
      vy: rand(40, 110),
      size: size,
      sway: rand(10, 36),
      swaySpeed: rand(0.6, 1.6),
      phase: rand(0, Math.PI * 2),
      rot: rand(-0.5, 0.5),
      spin: rand(-1.4, 1.4),
      color: pick(confettiColors),
      alpha: rand(0.75, 1),
      burst: false
    });
  }

  function burstConfetti(count, x, y, power) {
    if (!confetti.active || reducedMotion) return;
    const boost = power || 1;
    const room = Math.max(0, 320 - confetti.hearts.length);
    const ox = x == null ? confetti.width / 2 : x;
    const oy = y == null ? confetti.height * 0.6 : y;
    for (let i = 0; i < Math.min(count, room); i++) {
      const angle = -Math.PI / 2 + rand(-0.45, 0.45) * Math.PI;
      const speed = rand(260, 620) * boost;
      confetti.hearts.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(10, 22),
        sway: 0,
        swaySpeed: 0,
        phase: 0,
        rot: rand(-0.6, 0.6),
        spin: rand(-6, 6),
        color: pick(confettiColors),
        alpha: rand(0.8, 1),
        burst: true
      });
    }
    runConfetti();
  }

  function startConfetti() {
    if (!confetti.ctx) return;
    confetti.active = true;
    sizeConfetti();
    if (!confetti.hearts.length) {
      const count = isPhone() ? 40 : 70;
      for (let i = 0; i < count; i++) confetti.hearts.push(fallingHeart(null, true));
    }
    if (reducedMotion) {
      drawConfetti(0);
      return;
    }
    burstConfetti(28, confetti.width / 2, confetti.height + 10, 1.35);
    runConfetti();
  }

  function runConfetti() {
    if (!confetti.active || confetti.raf || reducedMotion || document.hidden) return;
    confetti.last = 0;
    confetti.raf = requestAnimationFrame(confettiFrame);
  }

  function pauseConfetti() {
    if (confetti.raf) cancelAnimationFrame(confetti.raf);
    confetti.raf = 0;
  }

  function stopConfetti() {
    confetti.active = false;
    pauseConfetti();
    confetti.hearts = confetti.hearts.filter((p) => !p.burst);
  }

  function confettiFrame(now) {
    confetti.raf = 0;
    if (!confetti.active || document.hidden) return;
    const dt = confetti.last ? Math.min(0.05, Math.max(0, (now - confetti.last) / 1000)) : 1 / 60;
    confetti.last = now;
    stepConfetti(dt);
    drawConfetti(now / 1000);
    confetti.raf = requestAnimationFrame(confettiFrame);
  }

  function stepConfetti(dt) {
    const hearts = confetti.hearts;
    for (let i = hearts.length - 1; i >= 0; i--) {
      const p = hearts[i];
      p.rot += p.spin * dt;
      if (p.burst) {
        p.vy += 520 * dt;
        p.vx *= 1 - Math.min(1, 0.9 * dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > confetti.height + 40 || p.x < -60 || p.x > confetti.width + 60) hearts.splice(i, 1);
      } else {
        p.y += p.vy * dt;
        if (p.y > confetti.height + p.size + 40) fallingHeart(p, false);
      }
    }
  }

  function drawConfetti(t) {
    const ctx = confetti.ctx;
    ctx.clearRect(0, 0, confetti.width, confetti.height);
    confetti.hearts.forEach((p) => {
      const x = p.burst ? p.x : p.x + Math.sin(t * p.swaySpeed + p.phase) * p.sway;
      const s = p.size / 24;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.translate(x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(s, s);
      ctx.translate(-12, -12);
      if (confetti.shape) {
        ctx.fill(confetti.shape);
      } else {
        ctx.beginPath();
        ctx.arc(12, 12, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  // ----------------------------------------------------------
  // Scene 8: secret + replay
  // ----------------------------------------------------------
  function setSecretOpen(open) {
    const msg = dom.secretMessage;
    if (!msg) return;
    if (dom.secretBtn) dom.secretBtn.setAttribute('aria-expanded', String(open));
    // Inline display backs up [hidden] in case a card style sets `display`.
    msg.style.display = open ? '' : 'none';
    if (!open) {
      msg.classList.remove('is-revealed');
      msg.hidden = true;
      return;
    }
    msg.hidden = false;
    void msg.offsetWidth; // restart the entrance transition
    msg.classList.add('is-revealed');
    if (dom.secretBtn) {
      const r = dom.secretBtn.getBoundingClientRect();
      burstConfetti(36, r.left + r.width / 2, r.top + r.height / 2);
    }
    safely(() => msg.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' }));
  }

  function resetStory() {
    clearEnvelopeTimer();
    if (dom.envelope) {
      dom.envelope.classList.remove('open');
      dom.envelope.setAttribute('aria-label', 'Open the envelope');
    }
    heartCards().forEach((card) => setReasonRevealed(card, false));
    updateRevealAll();
    noteCards().forEach((card) => setNoteFlipped(card, false));
    resetSecretHint();
    setSecretOpen(false);
    if (!circlesOn) setCircles(true);
    if (fourierStarted) fourierReplayPending = true;
  }

  function initScene8() {
    setSecretOpen(false);
    if (dom.secretBtn && dom.secretMessage) {
      dom.secretBtn.addEventListener('click', () => setSecretOpen(dom.secretMessage.hidden));
    }
    if (dom.replayBtn) {
      dom.replayBtn.addEventListener('click', () => {
        resetStory();
        showScene(1, { force: true });
      });
    }
  }

  // ----------------------------------------------------------
  // Floating emoji in every scene background
  // ----------------------------------------------------------
  function initFloaters() {
    if (reducedMotion) return;
    const count = isPhone() ? 8 : 14;
    document.querySelectorAll('.floaters').forEach((box) => {
      const set = box.closest('#scene-6') ? nightFloaterEmoji : floaterEmoji;
      let html = '';
      for (let i = 0; i < count; i++) {
        const dur = rand(10, 20);
        const x = 2 + ((i + rand(0.15, 0.85)) / count) * 92; // spread evenly, with jitter
        html += '<span class="floater" style="' +
          '--x:' + x.toFixed(1) + '%;' +
          '--size:' + rand(0.9, 1.9).toFixed(2) + 'rem;' +
          '--dur:' + dur.toFixed(1) + 's;' +
          '--delay:' + (-rand(0, dur)).toFixed(1) + 's;' +
          '--drift:' + Math.round(rand(-40, 40)) + 'px;' +
          '--rot:' + Math.round(rand(-25, 25)) + 'deg">' +
          pick(set) + '</span>';
      }
      box.innerHTML = html;
    });
  }

  // ----------------------------------------------------------
  // Music toggle
  // ----------------------------------------------------------
  function initMusic() {
    const audio = dom.audio;
    const btn = dom.musicBtn;
    if (!audio || !btn) return;

    let icon = btn.querySelector('span');
    if (!icon) {
      icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      btn.appendChild(icon);
    }
    let playing = false;

    function setPlaying(on) {
      playing = on;
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
      icon.textContent = on ? '❚❚' : '♪';
    }

    // No playable file (e.g. assets/audio/ambient.mp3 missing) → no button.
    function hideButton() {
      setPlaying(false);
      btn.hidden = true;
      btn.style.display = 'none'; // in case the button style sets `display`
    }

    if (audio.networkState === 3 || audio.error) hideButton(); // 3 = NETWORK_NO_SOURCE
    audio.addEventListener('error', hideButton);
    const source = audio.querySelector('source');
    if (source) source.addEventListener('error', hideButton);
    audio.addEventListener('playing', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));

    btn.addEventListener('click', () => {
      if (playing || !audio.paused) {
        audio.pause(); // returns undefined, nothing to catch
        setPlaying(false);
        return;
      }
      let attempt = null;
      try {
        attempt = audio.play();
      } catch (err) {
        attempt = null;
      }
      if (attempt && typeof attempt.then === 'function') {
        // Only show "playing" once playback has really started.
        attempt.then(() => setPlaying(!audio.paused), () => {
          setPlaying(false);
          if (audio.networkState === 3) hideButton();
        });
      } else {
        setPlaying(!audio.paused);
      }
    });
  }

  // ----------------------------------------------------------
  // Initialize
  // ----------------------------------------------------------
  function init() {
    cacheDom();
    [
      buildNavDots,
      prepareHeadings,
      initScene1,
      initScene3,
      initScene4,
      initScene5,
      initScene6,
      initScene8,
      initConfetti,
      initFloaters,
      initMusic,
      wireNavigation
    ].forEach((step) => safely(step));

    showScene(chapterFromHash() || 1, { force: true, initial: true });
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
