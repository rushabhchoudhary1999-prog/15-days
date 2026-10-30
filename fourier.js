/* ============================================================
   15 Days — Rushabh & Medhavi
   Fourier-series drawing: circles spinning on circles
   trace "Love You Medhavi" (and a little heart)
   ============================================================ */

(function () {
  'use strict';

  // ----------------------------------------------------------
  // Settings
  // ----------------------------------------------------------
  const FONT = "'Pacifico', 'Dancing Script', 'Segoe Script', 'Brush Script MT', cursive";
  const LAYOUTS = [['Love', 'You', 'Medhavi'], ['Love You', 'Medhavi'], ['Love You Medhavi']];
  const DRAW_MS = 14000;      // the whole drawing, independent of frame rate
  const FADE_MS = 1100;       // circles fade out after the last stroke
  const PULSE_MS = 6500;      // gentle glow pulse once the drawing is complete
  const MAX_DPR = 2;
  const MIN_SAMPLES = 700;
  const MAX_SAMPLES = 1600;
  const MAX_CIRCLES = 180;
  const TAU = Math.PI * 2;

  // Text metrics below are in "units" of a 100px font
  const HEART_W = 64;
  const HEART_H = 58;
  const HEART_GAP = 16;
  const LINE_GAP = 10;

  // Trace colour drifts along the path: hot pink → coral → gold → lilac → rose
  const PALETTE = [
    [255, 61, 127],
    [255, 122, 89],
    [255, 209, 102],
    [192, 132, 252],
    [255, 107, 157]
  ];

  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ----------------------------------------------------------
  // State
  // ----------------------------------------------------------
  const state = {
    canvas: null,
    ctx: null,
    trace: null,
    traceCtx: null,
    width: 0,
    height: 0,
    dpr: 1,
    model: null,
    step: 0,
    elapsed: 0,
    doneAt: 0,
    last: 0,
    complete: false,
    notified: false,
    circles: true,
    wanted: false,
    preparing: false,
    raf: 0,
    token: 0,
    retries: 0,
    resizeTimer: 0,
    onComplete: null
  };

  const chainX = new Float64Array(MAX_CIRCLES + 2);
  const chainY = new Float64Array(MAX_CIRCLES + 2);

  // ----------------------------------------------------------
  // Utilities
  // ----------------------------------------------------------
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function colorAt(u) {
    const span = PALETTE.length - 1;
    const pos = clamp(u, 0, 1) * span;
    const i = Math.min(span - 1, Math.floor(pos));
    const f = pos - i;
    const a = PALETTE[i];
    const b = PALETTE[i + 1];
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' +
      Math.round(a[1] + (b[1] - a[1]) * f) + ',' +
      Math.round(a[2] + (b[2] - a[2]) * f) + ')';
  }

  function fontsReady() {
    if (!document.fonts || typeof document.fonts.load !== 'function') return Promise.resolve();
    const timeout = new Promise((resolve) => setTimeout(resolve, 1500));
    const load = document.fonts.load("400 100px 'Pacifico'").catch(() => null);
    return Promise.race([load, timeout]);
  }

  // ----------------------------------------------------------
  // 1. Layout: pick the line split that allows the biggest letters
  // ----------------------------------------------------------
  function layoutText(w, h) {
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = '100px ' + FONT;
    let best = null;

    LAYOUTS.forEach((lines) => {
      const rows = lines.map((text) => {
        const m = probe.measureText(text);
        const left = m.actualBoundingBoxLeft || 0;
        const right = m.actualBoundingBoxRight || m.width;
        return {
          text: text,
          left: left,
          ink: left + right,
          ascent: m.actualBoundingBoxAscent || 80,
          descent: m.actualBoundingBoxDescent || 25
        };
      });

      // The heart rides on the shortest line
      let heartRow = 0;
      rows.forEach((r, i) => {
        if (r.ink < rows[heartRow].ink) heartRow = i;
      });

      const widest = Math.max.apply(null, rows.map((r, i) => r.ink + (i === heartRow ? HEART_GAP + HEART_W : 0)));
      const tall = rows.reduce((sum, r) => sum + r.ascent + r.descent, 0) + LINE_GAP * (rows.length - 1);
      const scale = Math.min((w * 0.88) / widest, (h * 0.8) / tall);
      if (!best || scale > best.scale) best = { rows: rows, heartRow: heartRow, scale: scale, tall: tall };
    });

    return best;
  }

  // ----------------------------------------------------------
  // 2. Rasterise the text (supersampled) and remember row bands
  // ----------------------------------------------------------
  function rasterText(layout, w, h, ss) {
    const rw = Math.ceil(w * ss);
    const rh = Math.ceil(h * ss);
    const off = document.createElement('canvas');
    off.width = rw;
    off.height = rh;
    const octx = off.getContext('2d', { willReadFrequently: true });
    const k = layout.scale;

    octx.setTransform(ss * k, 0, 0, ss * k, 0, 0);
    octx.font = '100px ' + FONT;
    octx.fillStyle = '#ffffff';
    octx.textBaseline = 'alphabetic';

    const unitsW = w / k;
    const unitsH = h / k;
    const bands = [];
    let heart = null;
    let y = (unitsH - layout.tall) / 2;

    layout.rows.forEach((r, i) => {
      const extra = i === layout.heartRow ? HEART_GAP + HEART_W : 0;
      const x0 = (unitsW - (r.ink + extra)) / 2;
      const baseline = y + r.ascent;
      octx.fillText(r.text, x0 + r.left, baseline);
      if (extra) {
        heart = {
          x: (x0 + r.ink + HEART_GAP + HEART_W / 2) * k,
          y: (baseline - r.ascent * 0.45) * k,
          size: HEART_H * k
        };
      }
      bands.push((y + (r.ascent + r.descent) / 2) * k);
      y += r.ascent + r.descent + LINE_GAP;
    });

    const img = octx.getImageData(0, 0, rw, rh).data;
    const alpha = new Uint8Array(rw * rh);
    for (let i = 0; i < alpha.length; i++) alpha[i] = img[i * 4 + 3];
    return { alpha: alpha, rw: rw, rh: rh, bands: bands, heart: heart, fontPx: 100 * k };
  }

  // ----------------------------------------------------------
  // 3. Outline contours: marching squares with linear interpolation
  // ----------------------------------------------------------
  function traceContours(alpha, rw, rh, ss) {
    const iso = 128;
    const points = new Map();
    const links = new Map();

    function edgePoint(id, x0, y0, a0, x1, y1, a1) {
      if (!points.has(id)) {
        const t = (iso - a0) / (a1 - a0);
        points.set(id, [(x0 + (x1 - x0) * t + 0.5) / ss, (y0 + (y1 - y0) * t + 0.5) / ss]);
      }
      return id;
    }

    function link(a, b) {
      const la = links.get(a);
      if (la) la.push(b); else links.set(a, [b]);
      const lb = links.get(b);
      if (lb) lb.push(a); else links.set(b, [a]);
    }

    for (let y = 0; y < rh - 1; y++) {
      for (let x = 0; x < rw - 1; x++) {
        const i = y * rw + x;
        const tl = alpha[i];
        const tr = alpha[i + 1];
        const bl = alpha[i + rw];
        const br = alpha[i + rw + 1];
        const c = (tl >= iso ? 8 : 0) | (tr >= iso ? 4 : 0) | (br >= iso ? 2 : 0) | (bl >= iso ? 1 : 0);
        if (c === 0 || c === 15) continue;

        // Edge ids: horizontal edges even, vertical edges odd
        const T = () => edgePoint(i * 2, x, y, tl, x + 1, y, tr);
        const B = () => edgePoint((i + rw) * 2, x, y + 1, bl, x + 1, y + 1, br);
        const L = () => edgePoint(i * 2 + 1, x, y, tl, x, y + 1, bl);
        const R = () => edgePoint((i + 1) * 2 + 1, x + 1, y, tr, x + 1, y + 1, br);

        switch (c) {
          case 1: case 14: link(L(), B()); break;
          case 2: case 13: link(B(), R()); break;
          case 3: case 12: link(L(), R()); break;
          case 4: case 11: link(T(), R()); break;
          case 6: case 9: link(T(), B()); break;
          case 7: case 8: link(L(), T()); break;
          case 5: link(L(), T()); link(B(), R()); break;
          case 10: link(T(), R()); link(L(), B()); break;
          default: break;
        }
      }
    }

    // Walk the links into closed loops
    const loops = [];
    const seen = new Set();
    links.forEach((unused, start) => {
      if (seen.has(start)) return;
      const loop = [];
      let prev = -1;
      let cur = start;
      while (cur !== undefined && !seen.has(cur)) {
        seen.add(cur);
        const p = points.get(cur);
        loop.push(p[0], p[1]);
        const nb = links.get(cur);
        const next = nb[0] !== prev ? nb[0] : nb[1];
        prev = cur;
        cur = next;
      }
      if (loop.length >= 12) loops.push(loop);
    });
    return loops;
  }

  function heartLoop(cx, cy, size, count) {
    const pts = [];
    const s = size / 29;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * TAU;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push(cx + x * s, cy + (y - 2.5) * s);
    }
    return pts;
  }

  function loopInfo(loop, bands) {
    let minX = Infinity;
    let sumY = 0;
    let perimeter = 0;
    const n = loop.length / 2;
    for (let i = 0; i < n; i++) {
      const x = loop[i * 2];
      const y = loop[i * 2 + 1];
      if (x < minX) minX = x;
      sumY += y;
      const j = ((i + 1) % n) * 2;
      perimeter += Math.hypot(loop[j] - x, loop[j + 1] - y);
    }
    const cy = sumY / n;
    let row = 0;
    bands.forEach((b, i) => {
      if (Math.abs(b - cy) < Math.abs(bands[row] - cy)) row = i;
    });
    return { loop: loop, minX: minX, row: row, perimeter: perimeter };
  }

  // Rotate a closed loop so it starts at the point nearest to (px, py)
  function rotateLoop(loop, px, py) {
    const n = loop.length / 2;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = (loop[i * 2] - px) * (loop[i * 2] - px) + (loop[i * 2 + 1] - py) * (loop[i * 2 + 1] - py);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return loop.slice(best * 2).concat(loop.slice(0, best * 2));
  }

  // ----------------------------------------------------------
  // 4. One closed path: loops joined by pen-up connectors
  // ----------------------------------------------------------
  function buildPath(loops) {
    const vx = [];
    const vy = [];
    const segPen = [];
    let px = 0;
    let py = 0;

    loops.forEach((raw, li) => {
      let loop = raw;
      if (li === 0) {
        let minI = 0;
        for (let i = 0; i < loop.length / 2; i++) if (loop[i * 2] < loop[minI * 2]) minI = i;
        loop = rotateLoop(loop, loop[minI * 2], loop[minI * 2 + 1]);
      } else {
        loop = rotateLoop(loop, px, py);
      }
      const n = loop.length / 2;
      for (let i = 0; i <= n; i++) {
        const j = (i % n) * 2;
        vx.push(loop[j]);
        vy.push(loop[j + 1]);
        segPen.push(i < n ? 1 : 0);
      }
      px = loop[0];
      py = loop[1];
    });

    // Close the whole path so the series is periodic
    vx.push(vx[0]);
    vy.push(vy[0]);
    return { vx: vx, vy: vy, segPen: segPen };
  }

  // ----------------------------------------------------------
  // 5. Resample by arc length (connectors are travelled faster)
  // ----------------------------------------------------------
  function resample(path) {
    const segCount = path.segPen.length;
    const len = new Float64Array(segCount);
    let drawn = 0;
    let travel = 0;
    for (let j = 0; j < segCount; j++) {
      len[j] = Math.hypot(path.vx[j + 1] - path.vx[j], path.vy[j + 1] - path.vy[j]);
      if (path.segPen[j]) drawn += len[j]; else travel += len[j];
    }

    const connectors = path.segPen.filter((p) => !p).length;
    let spacing = 2.6;
    let N = 0;
    for (let pass = 0; pass < 3; pass++) {
      N = Math.round((drawn + travel / 3 + connectors * 2.2 * spacing) / spacing);
      if (N > MAX_SAMPLES) spacing *= N / MAX_SAMPLES;
      else if (N < MIN_SAMPLES) spacing *= N / MIN_SAMPLES;
      else break;
    }

    // "Time length" of each segment; every connector gets at least ~2 samples
    const tau = new Float64Array(segCount);
    let total = 0;
    for (let j = 0; j < segCount; j++) {
      tau[j] = path.segPen[j] ? len[j] : Math.max(len[j] / 3, 2.2 * spacing);
      total += tau[j];
    }
    N = clamp(Math.round(total / spacing), MIN_SAMPLES, MAX_SAMPLES);
    const stepTau = total / N;

    const sx = new Float64Array(N);
    const sy = new Float64Array(N);
    const pen = new Uint8Array(N);
    const segOf = new Int32Array(N);
    let j = 0;
    let acc = 0;
    for (let k = 0; k < N; k++) {
      const target = k * stepTau;
      while (j < segCount - 1 && acc + tau[j] <= target) {
        acc += tau[j];
        j++;
      }
      const f = tau[j] > 0 ? clamp((target - acc) / tau[j], 0, 1) : 0;
      sx[k] = path.vx[j] + (path.vx[j + 1] - path.vx[j]) * f;
      sy[k] = path.vy[j] + (path.vy[j + 1] - path.vy[j]) * f;
      pen[k] = path.segPen[j];
      segOf[k] = j;
    }

    // Exact run boundaries so strokes start and stop on the outline
    const exitX = new Float64Array(N);
    const exitY = new Float64Array(N);
    const enterX = new Float64Array(N);
    const enterY = new Float64Array(N);
    for (let k = 1; k < N; k++) {
      if (pen[k - 1] && !pen[k]) {
        let q = segOf[k - 1];
        while (q < segOf[k] && path.segPen[q]) q++;
        exitX[k] = path.vx[q];
        exitY[k] = path.vy[q];
      } else if (!pen[k - 1] && pen[k]) {
        let q = segOf[k];
        while (q > segOf[k - 1] && path.segPen[q - 1]) q--;
        enterX[k] = path.vx[q];
        enterY[k] = path.vy[q];
      }
    }

    return { N: N, sx: sx, sy: sy, pen: pen, exitX: exitX, exitY: exitY, enterX: enterX, enterY: enterY };
  }

  // ----------------------------------------------------------
  // 6. Discrete Fourier transform (twiddle tables keep it fast)
  // ----------------------------------------------------------
  function transform(samples, cx, cy) {
    const N = samples.N;
    const cosT = new Float64Array(N);
    const sinT = new Float64Array(N);
    for (let m = 0; m < N; m++) {
      cosT[m] = Math.cos((TAU * m) / N);
      sinT[m] = Math.sin((TAU * m) / N);
    }
    const xs = new Float64Array(N);
    const ys = new Float64Array(N);
    for (let n = 0; n < N; n++) {
      xs[n] = samples.sx[n] - cx;
      ys[n] = samples.sy[n] - cy;
    }

    const terms = [];
    for (let k = 0; k < N; k++) {
      let re = 0;
      let im = 0;
      let idx = 0;
      for (let n = 0; n < N; n++) {
        const c = cosT[idx];
        const s = sinT[idx];
        re += xs[n] * c + ys[n] * s;
        im += ys[n] * c - xs[n] * s;
        idx += k;
        if (idx >= N) idx -= N;
      }
      re /= N;
      im /= N;
      terms.push({ freq: k <= N / 2 ? k : k - N, amp: Math.hypot(re, im), phase: Math.atan2(im, re) });
    }
    terms.sort((a, b) => b.amp - a.amp);

    const freq = new Float64Array(N);
    const amp = new Float64Array(N);
    const phase = new Float64Array(N);
    terms.forEach((t, i) => {
      freq[i] = t.freq;
      amp[i] = t.amp;
      phase[i] = t.phase;
    });
    return { freq: freq, amp: amp, phase: phase };
  }

  function buildModel(w, h) {
    const t0 = performance.now();
    const layout = layoutText(w, h);
    const ss = clamp(Math.sqrt(1100000 / (w * h)), 1, 2);
    const raster = rasterText(layout, w, h, ss);

    let loops = traceContours(raster.alpha, raster.rw, raster.rh, ss)
      .map((loop) => loopInfo(loop, raster.bands))
      .filter((info) => info.perimeter > 6);
    if (!loops.length) return null;

    let heart = null;
    if (raster.heart) {
      heart = heartLoop(raster.heart.x, raster.heart.y, raster.heart.size, 160);
      const info = loopInfo(heart, raster.bands);
      info.row = layout.heartRow;
      info.minX = Infinity; // always last on its line
      loops.push(info);
    }

    loops.sort((a, b) => (a.row - b.row) || (a.minX - b.minX));
    const path = buildPath(loops.map((info) => info.loop));
    const samples = resample(path);
    const cx = w / 2;
    const cy = h / 2;
    const series = transform(samples, cx, cy);

    return {
      N: samples.N,
      sx: samples.sx,
      sy: samples.sy,
      pen: samples.pen,
      exitX: samples.exitX,
      exitY: samples.exitY,
      enterX: samples.enterX,
      enterY: samples.enterY,
      freq: series.freq,
      amp: series.amp,
      phase: series.phase,
      cx: cx,
      cy: cy,
      heart: heart,
      lineWidth: clamp(raster.fontPx * 0.03, 1.6, 3.4),
      prepMs: Math.round(performance.now() - t0)
    };
  }

  // ----------------------------------------------------------
  // Canvas setup
  // ----------------------------------------------------------
  function attach(canvas) {
    state.canvas = canvas;
    state.ctx = canvas.getContext ? canvas.getContext('2d') : null;
    state.model = null;
    if (!state.ctx) return;

    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(onResize).observe(canvas);
    } else {
      window.addEventListener('resize', onResize);
    }
  }

  function setupCanvases(w, h) {
    state.width = w;
    state.height = h;
    state.dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const bw = Math.round(w * state.dpr);
    const bh = Math.round(h * state.dpr);
    state.canvas.width = bw;
    state.canvas.height = bh;
    if (!state.trace) {
      state.trace = document.createElement('canvas');
      state.traceCtx = state.trace.getContext('2d');
    }
    state.trace.width = bw;
    state.trace.height = bh;
    resetTrace();
  }

  function resetTrace() {
    const tctx = state.traceCtx;
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, state.trace.width, state.trace.height);
    tctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    tctx.lineCap = 'round';
    tctx.lineJoin = 'round';
  }

  // ----------------------------------------------------------
  // Drawing
  // ----------------------------------------------------------
  // Each segment is stroked twice: a soft wide halo, then the crisp line
  function strokeSegment(x0, y0, x1, y1, color, width) {
    const tctx = state.traceCtx;
    tctx.strokeStyle = color;
    tctx.globalAlpha = 0.1;
    tctx.lineWidth = width * 3.4;
    tctx.beginPath();
    tctx.moveTo(x0, y0);
    tctx.lineTo(x1, y1);
    tctx.stroke();
    tctx.globalAlpha = 1;
    tctx.lineWidth = width;
    tctx.beginPath();
    tctx.moveTo(x0, y0);
    tctx.lineTo(x1, y1);
    tctx.stroke();
  }

  // Extend the trace from sample `from` to sample `to`
  function traceRange(from, to) {
    const m = state.model;
    for (let k = Math.max(1, from + 1); k <= to && k < m.N; k++) {
      const a = m.pen[k - 1];
      const b = m.pen[k];
      if (!a && !b) continue;
      const color = colorAt(k / m.N);
      if (a && b) strokeSegment(m.sx[k - 1], m.sy[k - 1], m.sx[k], m.sy[k], color, m.lineWidth);
      else if (a) strokeSegment(m.sx[k - 1], m.sy[k - 1], m.exitX[k], m.exitY[k], color, m.lineWidth);
      else strokeSegment(m.enterX[k], m.enterY[k], m.sx[k], m.sy[k], color, m.lineWidth);
    }
  }

  function drawEpicycles(ctx, s, alpha) {
    const m = state.model;
    const theta = (TAU * s) / m.N;
    const shown = Math.min(MAX_CIRCLES, m.N);
    let x = m.cx;
    let y = m.cy;
    chainX[0] = x;
    chainY[0] = y;

    ctx.beginPath();
    for (let i = 0; i < m.N; i++) {
      const r = m.amp[i];
      if (i < shown && r > 0.8) {
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      const a = m.freq[i] * theta + m.phase[i];
      x += r * Math.cos(a);
      y += r * Math.sin(a);
      if (i < shown) {
        chainX[i + 1] = x;
        chainY[i + 1] = y;
      }
    }
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = 'rgba(255, 214, 231, ' + (0.2 * alpha).toFixed(3) + ')';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(chainX[0], chainY[0]);
    for (let i = 1; i <= shown; i++) ctx.lineTo(chainX[i], chainY[i]);
    ctx.lineTo(x, y);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.55 * alpha).toFixed(3) + ')';
    ctx.stroke();

    return { x: x, y: y };
  }

  function drawTip(ctx, x, y) {
    ctx.fillStyle = 'rgba(255, 158, 199, 0.45)';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, TAU);
    ctx.fill();
  }

  function drawHeartFill(ctx, alpha) {
    const pts = state.model.heart;
    if (!pts || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ff3d7f';
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function render(s) {
    const ctx = state.ctx;
    const m = state.model;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, state.width, state.height);

    const since = state.complete ? state.elapsed - state.doneAt : -1;
    if (since >= 0) drawHeartFill(ctx, 0.9 * clamp(since / 800, 0, 1));

    ctx.drawImage(state.trace, 0, 0, state.width, state.height);

    // Breathing glow once the message is complete
    if (since >= 0 && since < FADE_MS + PULSE_MS) {
      const envelope = clamp((FADE_MS + PULSE_MS - since) / 1500, 0, 1);
      const pulse = 0.28 * envelope * (0.5 - 0.5 * Math.cos((TAU * since) / 1700));
      if (pulse > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = pulse;
        ctx.drawImage(state.trace, 0, 0, state.width, state.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }

    const fade = since >= 0 ? 1 - clamp(since / FADE_MS, 0, 1) : 1;
    if (fade <= 0) return;
    if (state.circles) {
      const tip = drawEpicycles(ctx, s, fade);
      if (!state.complete) drawTip(ctx, tip.x, tip.y);
    } else if (!state.complete) {
      const k = Math.min(m.N - 1, Math.floor(s));
      drawTip(ctx, m.sx[k], m.sy[k]);
    }
  }

  // ----------------------------------------------------------
  // Animation loop
  // ----------------------------------------------------------
  function frame(now) {
    state.raf = 0;
    if (!state.wanted || !state.model || document.hidden) return;
    const dt = state.last ? Math.min(64, now - state.last) : 16;
    state.last = now;
    state.elapsed += dt;

    const m = state.model;
    if (!state.complete) {
      const s = Math.min(m.N, (state.elapsed / DRAW_MS) * m.N);
      const target = Math.min(m.N - 1, Math.floor(s));
      if (target > state.step) {
        traceRange(state.step, target);
        state.step = target;
      }
      if (s >= m.N) finish();
      render(s);
    } else {
      render(m.N);
      if (state.elapsed - state.doneAt > FADE_MS + PULSE_MS) return; // settle into a still image
    }
    state.raf = requestAnimationFrame(frame);
  }

  function finish() {
    state.complete = true;
    state.doneAt = state.elapsed;
    state.step = state.model.N - 1;
    if (!state.notified) {
      state.notified = true;
      if (typeof state.onComplete === 'function') {
        try {
          state.onComplete();
        } catch (err) {
          if (window.console) console.error(err);
        }
      }
    }
  }

  function resume() {
    if (!state.model || state.raf || document.hidden) return;
    if (state.complete && state.elapsed - state.doneAt > FADE_MS + PULSE_MS) {
      render(state.model.N);
      return;
    }
    state.last = 0;
    state.raf = requestAnimationFrame(frame);
  }

  // Jump to a fraction of the drawing (used after resizes, reduced motion and QA)
  function fastForward(fraction) {
    const m = state.model;
    resetTrace();
    state.step = 0;
    state.complete = false;
    const target = fraction >= 1 ? m.N - 1 : Math.floor(fraction * m.N);
    traceRange(0, target);
    state.step = target;
    state.elapsed = fraction * DRAW_MS;
    if (fraction >= 1) {
      state.complete = true;
      state.notified = true;
      state.doneAt = state.elapsed - (FADE_MS + PULSE_MS) - 1; // already settled
    }
  }

  function currentFraction() {
    if (!state.model) return 0;
    return state.complete ? 1 : state.step / state.model.N;
  }

  function drawFallback(w, h) {
    const ctx = state.ctx;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = Math.round(Math.min(w / 9, h / 4)) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff9ec7';
    ctx.fillText('Love You Medhavi ♥', w / 2, h / 2);
  }

  function prepare(w, h, fraction) {
    const token = ++state.token;
    state.preparing = true;
    fontsReady().then(() => {
      if (token !== state.token) return;
      state.preparing = false;
      setupCanvases(w, h);
      let model = null;
      try {
        model = buildModel(w, h);
      } catch (err) {
        if (window.console) console.error(err);
      }
      if (!model) {
        state.model = null;
        drawFallback(w, h);
        return;
      }
      state.model = model;
      state.elapsed = 0;
      state.last = 0;
      state.complete = false;
      state.notified = fraction > 0;
      fastForward(reducedMotion ? 1 : fraction);
      if (state.wanted) resume();
      render(state.complete ? model.N : state.step);
    });
  }

  function onResize() {
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(() => {
      if (!state.wanted || !state.canvas) return;
      const rect = state.canvas.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w < 40 || h < 40) return;
      if (Math.abs(w - state.width) > 8 || Math.abs(h - state.height) > 8) {
        cancelAnimationFrame(state.raf);
        state.raf = 0;
        prepare(w, h, currentFraction());
      }
    }, 220);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    } else if (state.wanted) {
      resume();
    }
  });

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  function start(canvas, opts) {
    if (!canvas || typeof canvas.getContext !== 'function') return;
    if (opts && typeof opts.onComplete === 'function') state.onComplete = opts.onComplete;
    if (state.canvas !== canvas) attach(canvas);
    if (!state.ctx) return;
    state.wanted = true;

    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w < 40 || h < 40) {
      // Not laid out yet; try again shortly
      if (state.retries++ < 20) setTimeout(() => state.wanted && start(canvas), 100);
      return;
    }
    state.retries = 0;

    if (!state.model || Math.abs(w - state.width) > 8 || Math.abs(h - state.height) > 8) {
      if (!state.preparing || !state.model) prepare(w, h, currentFraction());
      return;
    }
    resume();
  }

  function stop() {
    state.wanted = false;
    cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.last = 0;
  }

  function replay() {
    if (!state.model) {
      if (state.canvas) start(state.canvas);
      return;
    }
    cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.wanted = true;
    state.notified = false;
    state.last = 0;
    state.elapsed = 0;
    if (reducedMotion) {
      fastForward(1);
      render(state.model.N);
      return;
    }
    fastForward(0);
    resume();
  }

  function setCircles(on) {
    state.circles = !!on;
    if (state.model && !state.raf) render(state.complete ? state.model.N : state.step);
  }

  function isRunning() {
    return !!state.raf || state.preparing;
  }

  // QA hook: render the drawing at a given progress (0..1) synchronously
  function seek(fraction) {
    if (!state.model) return false;
    cancelAnimationFrame(state.raf);
    state.raf = 0;
    const f = clamp(fraction, 0, 1);
    fastForward(f);
    render(f >= 1 ? state.model.N : f * state.model.N);
    return true;
  }

  window.FourierLove = {
    start: start,
    stop: stop,
    replay: replay,
    setCircles: setCircles,
    isRunning: isRunning,
    _seek: seek,
    _stats: () => (state.model ? { N: state.model.N, prepMs: state.model.prepMs, width: state.width, height: state.height } : null)
  };
})();
