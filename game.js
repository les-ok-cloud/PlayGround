(() => {
  'use strict';

  const DW = 700;
  const DH = 820;
  const BOUNDS = { x: 125, y: 295, w: 420, h: 510 };
  const PAINT_MS = 430;

  const PALETTE = [
    { name: 'Cherry', hex: '#d7263d' },
    { name: 'Bubblegum', hex: '#ff6fa5' },
    { name: 'Coral', hex: '#ff7f6b' },
    { name: 'Tangerine', hex: '#ff9f43' },
    { name: 'Lemon', hex: '#ffd93d' },
    { name: 'Mint', hex: '#46c9a8' },
    { name: 'Lagoon', hex: '#24b8c7' },
    { name: 'Sky', hex: '#4dabf7' },
    { name: 'Periwinkle', hex: '#7c83fd' },
    { name: 'Lilac', hex: '#b388eb' },
    { name: 'Rose Gold', hex: '#e8a598' },
    { name: 'Cocoa', hex: '#8d5a4a' },
    { name: 'Noir', hex: '#2b2d42' },
    { name: 'Pearl', hex: '#f4e9df' }
  ];

  const DESIGNS = [
    { id: 'plain', label: 'Plain' },
    { id: 'stripes', label: 'Stripes' },
    { id: 'dots', label: 'Dots' },
    { id: 'hearts', label: 'Hearts' },
    { id: 'glitter', label: 'Glitter' },
    { id: 'french', label: 'French' }
  ];

  const CLIENTS = [
    { name: 'Mia', theme: 'Party Set', note: 'Match every nail to the order' },
    { name: 'Luna', theme: 'Beach Day', note: 'Sun-kissed shades and playful art' },
    { name: 'Sofia', theme: 'Gala Night', note: 'A dramatic set for the red carpet' },
    { name: 'Ava', theme: 'Picnic', note: 'Sweet pastels for a garden party' },
    { name: 'Zoe', theme: 'Concert', note: 'Bold neon for the front row' },
    { name: 'Ivy', theme: 'Wedding', note: 'Something elegant and sparkly' },
    { name: 'Nora', theme: 'Rainy Day', note: 'Cosy colours to brighten the grey' },
    { name: 'Ella', theme: 'Disco', note: 'Glitter, shine and studio lights' }
  ];

  const FINGERS = [
    { id: 'thumb', base: [320, 708], tip: [186, 508], width: 82, taper: 0.2, bow: -4 },
    { id: 'pinky', base: [480, 664], tip: [508, 438], width: 62, taper: 0.13, bow: 2 },
    { id: 'ring', base: [430, 634], tip: [440, 362], width: 72, taper: 0.16, bow: 1 },
    { id: 'middle', base: [378, 624], tip: [360, 334], width: 78, taper: 0.15, bow: -2 },
    { id: 'index', base: [326, 644], tip: [284, 378], width: 74, taper: 0.16, bow: 3 }
  ];

  const SKIN = {
    light: '#f9d8c4',
    mid: '#f1c0a5',
    shade: '#e7b092',
    deep: '#d99a7d',
    line: 'rgba(157, 92, 73, 0.4)',
    crease: 'rgba(147, 82, 64, 0.17)'
  };

  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const canvas = $('handCanvas');
  let ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  let bodyCanvas = null;
  const paletteEl = $('palette');
  const designsEl = $('designs');
  const selectedNameEl = $('selectedName');
  const orderNailsEl = $('orderNails');
  const orderTitleEl = $('orderTitle');
  const orderSubEl = $('orderSub');
  const clientAvatarEl = $('clientAvatar');
  const progressTextEl = $('progressText');
  const newClientBtn = $('newClientBtn');
  const setBadgeEl = $('setBadge');
  const hintEl = $('hint');
  const toastEl = $('toast');
  const celebrateEl = $('celebrate');
  const starsEl = $('stars');
  const celebrateTitleEl = $('celebrateTitle');
  const celebrateSubEl = $('celebrateSub');
  const statStarsEl = $('statStars');
  const statTimeEl = $('statTime');
  const statLooksEl = $('statLooks');
  const nextBtn = $('nextBtn');
  const keepBtn = $('keepBtn');
  const soundBtn = $('soundBtn');
  const tiltBtn = $('tiltBtn');
  const resetBtn = $('resetBtn');
  const newSetBtn = $('newSetBtn');

  const state = {
    level: 1,
    selectedColor: 0,
    selectedDesign: 0,
    order: null,
    completed: false,
    pendingComplete: false,
    mistakes: 0,
    applications: 0,
    startedAt: performance.now(),
    time: 0,
    soundOn: true,
    tiltActive: false,
    tiltSeen: false,
    tiltProbe: null,
    tilt: { x: 0, y: 0 },
    pointerSheen: { x: 0, y: 0 },
    sheen: { x: 0, y: 0 },
    handRot: 0,
    handX: 0,
    handY: 0,
    dragId: null,
    dragPainted: new Set(),
    particles: [],
    chips: [],
    view: { scale: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 }
  };

  let audioCtx = null;
  let toastTimer = 0;
  let lastFrame = performance.now();

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function hexToRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function mix(hexA, hexB, t) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    return `rgb(${Math.round(lerp(a.r, b.r, t))}, ${Math.round(lerp(a.g, b.g, t))}, ${Math.round(lerp(a.b, b.b, t))})`;
  }

  function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  function patternAccent(base, design) {
    if (design === 'french') return '#fff8ec';
    return luminance(base) > 0.66 ? mix(base, '#4a2438', 0.5) : mix(base, '#ffffff', 0.72);
  }

  function shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function formatTime(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function rotatePoint(x, y, cx, cy, angle) {
    const dx = x - cx;
    const dy = y - cy;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
  }

  function applyHandTransform(x, y) {
    const p = rotatePoint(x, y, DW / 2, DH / 2, state.handRot);
    return { x: p.x + state.handX, y: p.y + state.handY };
  }

  function inverseHandTransform(x, y) {
    return rotatePoint(x - state.handX, y - state.handY, DW / 2, DH / 2, -state.handRot);
  }

  function vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (err) {
      
    }
  }

  function ensureAudio() {
    if (!state.soundOn) return;
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (err) {
      audioCtx = null;
    }
  }

  function tone(freq, dur, type, vol, delay, slideTo) {
    if (!state.soundOn) return;
    ensureAudio();
    if (!audioCtx) return;
    try {
      const t0 = audioCtx.currentTime + (delay || 0);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol || 0.05, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (err) {
      
    }
  }

  function soundPaint() {
    tone(540, 0.13, 'triangle', 0.055, 0, 860);
    tone(1260, 0.08, 'sine', 0.018, 0.025, 1500);
  }

  function soundClick() {
    tone(720, 0.06, 'sine', 0.028, 0, 660);
  }

  function soundSparkle() {
    tone(1560, 0.12, 'sine', 0.022, 0);
    tone(1980, 0.14, 'sine', 0.018, 0.06);
    tone(2360, 0.18, 'sine', 0.014, 0.12);
  }

  function soundSuccess() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      tone(f, 0.3, 'triangle', 0.05, i * 0.085, f * 1.01);
    });
    [1568, 2093].forEach((f, i) => tone(f, 0.45, 'sine', 0.016, 0.38 + i * 0.1));
  }

  const nails = [];
  FINGERS.forEach((finger, index) => {
    const fr = fingerFrame(finger);
    const tdx = finger.tip[0] - fr.cx;
    const tdy = finger.tip[1] - fr.cy;
    const tlen = Math.hypot(tdx, tdy) || 1;
    const tdir = { x: tdx / tlen, y: tdy / tlen };
    const width = finger.width * 0.52;
    const height = width * 1.5;
    const center = {
      x: finger.tip[0] - tdir.x * (height / 2 + 8),
      y: finger.tip[1] - tdir.y * (height / 2 + 8)
    };
    const rng = mulberry32(101 + index * 977);
    nails.push({
      index,
      id: finger.id,
      x: center.x,
      y: center.y,
      w: width,
      h: height,
      angle: Math.atan2(tdir.y, tdir.x) - Math.PI / 2,
      look: null,
      prev: null,
      paintT: 1,
      paintStart: 0,
      press: 0,
      req: null,
      glitter: Array.from({ length: 34 }, (_, i) => ({
        x: (rng() - 0.5) * 0.84,
        y: (rng() - 0.5) * 0.88,
        size: 0.018 + rng() * 0.05,
        phase: rng() * Math.PI * 2,
        warm: i % 3 === 0
      }))
    });
  });

  function fingerFrame(f, extend) {
    const ext = extend || 0;
    const [bx0, by0] = f.base;
    const [tx, ty] = f.tip;
    const dx = tx - bx0;
    const dy = ty - by0;
    const len = Math.hypot(dx, dy) || 1;
    const dirx = dx / len;
    const diry = dy / len;
    const bx = bx0 - dirx * ext;
    const by = by0 - diry * ext;
    const nx = -diry;
    const ny = dirx;
    const bow = f.bow || 0;
    return {
      bx, by, tx, ty, dirx, diry, nx, ny,
      len: len + ext,
      cx: (bx + tx) / 2 + nx * bow,
      cy: (by + ty) / 2 + ny * bow
    };
  }

  function fingerPointAt(fr, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * fr.bx + 2 * mt * t * fr.cx + t * t * fr.tx,
      y: mt * mt * fr.by + 2 * mt * t * fr.cy + t * t * fr.ty,
      dx: 2 * mt * (fr.cx - fr.bx) + 2 * t * (fr.tx - fr.cx),
      dy: 2 * mt * (fr.cy - fr.by) + 2 * t * (fr.ty - fr.cy)
    };
  }

  function fingerHalfWidth(f, t) {
    const taper = f.taper == null ? 0.16 : f.taper;
    let w = (f.width / 2) * (1 - taper * t);
    w *= 1 + 0.06 * Math.exp(-Math.pow((t - 0.17) / 0.075, 2));
    w *= 1 + 0.04 * Math.exp(-Math.pow((t - 0.56) / 0.09, 2));
    if (t > 0.86) {
      const u = (t - 0.86) / 0.14;
      w *= Math.sqrt(Math.max(0, 1 - u * u));
    }
    return w;
  }

  function fingerOutline(f, extend) {
    const fr = fingerFrame(f, extend);
    const left = [];
    const right = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = fingerPointAt(fr, t);
      const dl = Math.hypot(p.dx, p.dy) || 1;
      const nx = -p.dy / dl;
      const ny = p.dx / dl;
      const hw = fingerHalfWidth(f, t);
      left.push({ x: p.x + nx * hw, y: p.y + ny * hw });
      right.push({ x: p.x - nx * hw, y: p.y - ny * hw });
    }
    return { fr, left, right };
  }

  function traceSmooth(points) {
    ctx.lineTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2;
      const my = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  function fingerPath(f, open, extend, from) {
    const { left, right } = fingerOutline(f, extend);
    const i0 = from || 0;
    const l = left.slice(i0);
    const r = right.slice(i0).reverse();
    ctx.beginPath();
    ctx.moveTo(l[0].x, l[0].y);
    traceSmooth(l);
    traceSmooth(r);
    if (!open) ctx.closePath();
    return fingerFrame(f, extend);
  }

  function palmPath() {
    ctx.beginPath();
    ctx.moveTo(330, 850);
    ctx.bezierCurveTo(306, 812, 288, 780, 284, 750);
    ctx.bezierCurveTo(280, 722, 288, 694, 304, 672);
    ctx.bezierCurveTo(312, 660, 318, 652, 326, 646);
    traceSmooth([
      { x: 326, y: 646 },
      { x: 350, y: 654 },
      { x: 378, y: 640 },
      { x: 404, y: 650 },
      { x: 430, y: 644 },
      { x: 456, y: 654 },
      { x: 482, y: 668 },
      { x: 505, y: 686 }
    ]);
    ctx.bezierCurveTo(514, 690, 510, 708, 506, 724);
    ctx.bezierCurveTo(510, 762, 502, 806, 486, 850);
    ctx.closePath();
  }

  function palmOutlinePath() {
    ctx.beginPath();
    ctx.moveTo(326, 646);
    ctx.bezierCurveTo(318, 652, 312, 660, 304, 672);
    ctx.bezierCurveTo(288, 694, 280, 722, 284, 750);
    ctx.bezierCurveTo(288, 780, 306, 812, 330, 850);
    ctx.lineTo(486, 850);
    ctx.bezierCurveTo(502, 806, 510, 762, 506, 724);
    ctx.bezierCurveTo(510, 714, 512, 700, 505, 686);
  }

  function palmTopPath() {
    ctx.beginPath();
    ctx.moveTo(326, 646);
    traceSmooth([
      { x: 326, y: 646 },
      { x: 350, y: 654 },
      { x: 378, y: 640 },
      { x: 404, y: 650 },
      { x: 430, y: 644 },
      { x: 456, y: 654 },
      { x: 482, y: 668 },
      { x: 505, y: 686 }
    ]);
  }

  function nailPath(w, h) {
    const hw = w / 2;
    const hh = h / 2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.31, -hh * 0.98);
    ctx.bezierCurveTo(-hw * 0.92, -hh * 0.76, -hw * 1.0, -hh * 0.1, -w * 0.38, hh * 0.42);
    ctx.bezierCurveTo(-w * 0.36, hh * 0.7, -w * 0.24, hh * 0.92, 0, hh);
    ctx.bezierCurveTo(w * 0.24, hh * 0.92, w * 0.36, hh * 0.7, w * 0.38, hh * 0.42);
    ctx.bezierCurveTo(hw * 1.0, -hh * 0.1, hw * 0.92, -hh * 0.76, w * 0.31, -hh * 0.98);
    ctx.bezierCurveTo(w * 0.14, -hh * 0.9, -w * 0.14, -hh * 0.9, -w * 0.31, -hh * 0.98);
    ctx.closePath();
  }

  function drawFinger(f) {
    const ext = f.extend == null ? 46 : f.extend;
    const fr = fingerFrame(f, ext);
    const fa = fingerFrame(f, 0);
    const extBase = { x: fa.bx - fa.dirx * ext, y: fa.by - fa.diry * ext };
    const [tx, ty] = f.tip;

    const mid = fingerPointAt(fr, 0.46);
    const mdl = Math.hypot(mid.dx, mid.dy) || 1;
    const mnx = -mid.dy / mdl;
    const mny = mid.dx / mdl;
    const midW = fingerHalfWidth(f, 0.46);

    fingerPath(f, false, ext);
    const across = ctx.createLinearGradient(
      mid.x + mnx * midW,
      mid.y + mny * midW,
      mid.x - mnx * midW,
      mid.y - mny * midW
    );
    across.addColorStop(0, SKIN.light);
    across.addColorStop(0.3, SKIN.mid);
    across.addColorStop(0.7, SKIN.shade);
    across.addColorStop(1, SKIN.deep);
    ctx.fillStyle = across;
    ctx.fill();

    ctx.save();
    fingerPath(f, false, ext);
    ctx.clip();

    const along = ctx.createLinearGradient(fa.bx, fa.by, tx, ty);
    along.addColorStop(0, 'rgba(126, 62, 48, 0.04)');
    along.addColorStop(0.3, 'rgba(255, 255, 255, 0.02)');
    along.addColorStop(0.72, 'rgba(255, 255, 255, 0.05)');
    along.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
    ctx.fillStyle = along;
    ctx.fillRect(0, 0, DW, DH);

    const tipPt = fingerPointAt(fa, 0.9);
    const blush = ctx.createRadialGradient(tipPt.x, tipPt.y, 2, tipPt.x, tipPt.y, f.width * 0.85);
    blush.addColorStop(0, 'rgba(236, 146, 130, 0.2)');
    blush.addColorStop(1, 'rgba(236, 146, 130, 0)');
    ctx.fillStyle = blush;
    ctx.fillRect(0, 0, DW, DH);

    const a = fingerPointAt(fa, 0.2);
    const b = fingerPointAt(fa, 0.82);
    const aw = fingerHalfWidth(f, 0.2);
    const bw = fingerHalfWidth(f, 0.82);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = f.width * 0.06;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x + mnx * aw * 0.72, a.y + mny * aw * 0.72);
    ctx.quadraticCurveTo(
      b.x + mnx * bw * 0.66,
      b.y + mny * bw * 0.66,
      b.x + mnx * bw * 0.32,
      b.y + mny * bw * 0.32
    );
    ctx.stroke();

    [0.07, 0.33, 0.62].forEach((t, i) => {
      const p = fingerPointAt(fa, t);
      const dlen = Math.hypot(p.dx, p.dy) || 1;
      const ux = -p.dy / dlen;
      const uy = p.dx / dlen;
      const w = fingerHalfWidth(f, t) * (i === 0 ? 0.88 : i === 1 ? 0.72 : 0.62);
      const bend = f.width * (i === 0 ? 0.14 : i === 1 ? 0.13 : 0.1);
      ctx.strokeStyle = `rgba(151, 88, 68, ${i === 0 ? 0.18 : 0.22})`;
      ctx.lineWidth = i === 0 ? 2 : 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x + ux * w, p.y + uy * w);
      ctx.quadraticCurveTo(
        p.x + p.dx / dlen * bend,
        p.y + p.dy / dlen * bend,
        p.x - ux * w,
        p.y - uy * w
      );
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.2;
      const off = f.width * 0.07;
      ctx.beginPath();
      ctx.moveTo(p.x + ux * w * 0.9 - p.dx / dlen * off, p.y + uy * w * 0.9 - p.dy / dlen * off);
      ctx.quadraticCurveTo(
        p.x - p.dx / dlen * (off - bend * 0.5),
        p.y - p.dy / dlen * (off - bend * 0.5),
        p.x - ux * w * 0.9 - p.dx / dlen * off,
        p.y - uy * w * 0.9 - p.dy / dlen * off
      );
      ctx.stroke();
    });
    ctx.restore();

    fingerPath(f, true, ext, 5);
    ctx.strokeStyle = 'rgba(157, 92, 73, 0.3)';
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function drawPalm() {
    palmPath();
    const grad = ctx.createLinearGradient(300, 620, 510, 840);
    grad.addColorStop(0, SKIN.mid);
    grad.addColorStop(0.34, SKIN.mid);
    grad.addColorStop(0.72, SKIN.shade);
    grad.addColorStop(1, SKIN.deep);
    ctx.save();
    ctx.shadowColor = 'rgba(138, 70, 54, 0.14)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    palmPath();
    ctx.clip();

    const sheen = ctx.createRadialGradient(350, 706, 16, 350, 706, 235);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
    sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
    sheen.addColorStop(1, 'rgba(128, 58, 44, 0.08)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, DW, DH);

    const backLight = ctx.createRadialGradient(392, 730, 4, 392, 730, 120);
    backLight.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    backLight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = backLight;
    ctx.fillRect(0, 0, DW, DH);

    [
      [338, 648, 30],
      [380, 630, 30],
      [432, 634, 28],
      [482, 662, 26]
    ].forEach(([x, y, r]) => {
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    [
      [354, 644, 18],
      [406, 630, 16],
      [458, 644, 14]
    ].forEach(([x, y, r]) => {
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(140, 76, 58, 0.08)');
      g.addColorStop(1, 'rgba(140, 76, 58, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = 'rgba(150, 85, 66, 0.07)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    [
      [336, 700, 348, 812],
      [382, 690, 388, 812],
      [430, 696, 426, 814],
      [480, 706, 462, 812]
    ].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) / 2 + (x1 < 400 ? -8 : 6), (y1 + y2) / 2, x2, y2);
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(108, 92, 120, 0.055)';
    ctx.lineWidth = 4;
    [
      [366, 744, 352, 818],
      [412, 748, 418, 820]
    ].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(x1 + 16, y1 + 26, x2 - 14, y2 - 30, x2, y2);
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(140, 78, 62, 0.09)';
    ctx.lineWidth = 2.2;
    [
      [344, 810],
      [360, 824]
    ].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.moveTo(cx - 34, cy - 4);
      ctx.quadraticCurveTo(cx, cy + 6, cx + 40, cy - 2);
      ctx.stroke();
    });

    ctx.restore();

    // Soft occlusion where the fingers rise out of the palm.
    ctx.save();
    palmPath();
    ctx.clip();
    ctx.shadowColor = 'rgba(146, 78, 60, 0.18)';
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 5;
    ctx.strokeStyle = 'rgba(146, 78, 60, 0.05)';
    ctx.lineWidth = 1.5;
    palmTopPath();
    ctx.stroke();
    ctx.restore();

    palmOutlinePath();
    ctx.strokeStyle = SKIN.line;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function renderHandBody() {
    const scale = 2;
    const off = document.createElement('canvas');
    off.width = Math.ceil(DW * scale);
    off.height = Math.ceil(DH * scale);
    const bctx = off.getContext('2d');
    bctx.scale(scale, scale);

    const prev = ctx;
    ctx = bctx;
    FINGERS.forEach((f) => drawFinger(f));
    drawPalm();
    ctx = prev;

    bodyCanvas = off;
  }

  function drawNatural(ctx2, n) {
    const { w, h } = n;
    const hw = w / 2;
    const hh = h / 2;

    const bed = ctx2.createLinearGradient(0, -hh, 0, hh);
    bed.addColorStop(0, '#e9aea3');
    bed.addColorStop(0.18, '#eeb9ae');
    bed.addColorStop(0.58, '#f2cec5');
    bed.addColorStop(0.86, '#f5d9d0');
    bed.addColorStop(1, '#f6ddd5');
    ctx2.fillStyle = bed;
    ctx2.fillRect(-hw, -hh, w, h);

    const blush = ctx2.createRadialGradient(0, hh * 0.18, 1, 0, hh * 0.18, hw * 1.3);
    blush.addColorStop(0, 'rgba(238, 150, 142, 0.4)');
    blush.addColorStop(1, 'rgba(238, 150, 142, 0)');
    ctx2.fillStyle = blush;
    ctx2.fillRect(-hw, -hh, w, h);

    const lun = ctx2.createRadialGradient(0, -hh * 0.6, 1, 0, -hh * 0.6, w * 0.3);
    lun.addColorStop(0, 'rgba(255, 249, 245, 0.95)');
    lun.addColorStop(0.7, 'rgba(255, 247, 243, 0.45)');
    lun.addColorStop(1, 'rgba(255, 247, 243, 0)');
    ctx2.globalAlpha = 0.32;
    ctx2.fillStyle = lun;
    ctx2.beginPath();
    ctx2.ellipse(0, -hh * 0.62, w * 0.28, h * 0.13, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.globalAlpha = 1;

    const freeEdge = ctx2.createLinearGradient(0, hh * 0.72, 0, hh);
    freeEdge.addColorStop(0, 'rgba(255, 252, 249, 0)');
    freeEdge.addColorStop(0.75, 'rgba(255, 252, 249, 0.1)');
    freeEdge.addColorStop(1, 'rgba(255, 252, 249, 0.22)');
    ctx2.fillStyle = freeEdge;
    ctx2.fillRect(-hw, hh * 0.72, w, hh * 0.28);

    ctx2.strokeStyle = 'rgba(196, 137, 124, 0.08)';
    ctx2.lineWidth = 0.8;
    for (let i = -2; i <= 2; i++) {
      ctx2.beginPath();
      ctx2.moveTo(i * w * 0.11, -hh * 0.42);
      ctx2.quadraticCurveTo(i * w * 0.13, 0, i * w * 0.09, hh * 0.55);
      ctx2.stroke();
    }

    const cut = ctx2.createLinearGradient(0, -hh, 0, -hh * 0.3);
    cut.addColorStop(0, 'rgba(176, 108, 95, 0.22)');
    cut.addColorStop(1, 'rgba(176, 108, 95, 0)');
    ctx2.fillStyle = cut;
    ctx2.fillRect(-hw, -hh, w, hh * 0.7);

    const side = ctx2.createLinearGradient(-hw, 0, hw, 0);
    side.addColorStop(0, 'rgba(166, 102, 88, 0.12)');
    side.addColorStop(0.14, 'rgba(166, 102, 88, 0)');
    side.addColorStop(0.86, 'rgba(166, 102, 88, 0)');
    side.addColorStop(1, 'rgba(166, 102, 88, 0.12)');
    ctx2.fillStyle = side;
    ctx2.fillRect(-hw, -hh, w, h);
  }

  function drawHeart(ctx2, x, y, s) {
    ctx2.beginPath();
    ctx2.moveTo(x, y + s * 0.72);
    ctx2.bezierCurveTo(x - s * 1.12, y - s * 0.08, x - s * 0.46, y - s * 0.96, x, y - s * 0.3);
    ctx2.bezierCurveTo(x + s * 0.46, y - s * 0.96, x + s * 1.12, y - s * 0.08, x, y + s * 0.72);
    ctx2.closePath();
    ctx2.fill();
  }

  function drawPattern(ctx2, design, base, n, time) {
    const w = n.w;
    const h = n.h;
    const hw = w / 2;
    const hh = h / 2;
    const accent = patternAccent(base, design);

    ctx2.save();
    ctx2.fillStyle = accent;
    ctx2.strokeStyle = accent;

    if (design === 'stripes') {
      ctx2.lineWidth = Math.max(2, w * 0.085);
      ctx2.lineCap = 'butt';
      for (let i = -5; i <= 5; i++) {
        const x = i * w * 0.25 + w * 0.05;
        ctx2.beginPath();
        ctx2.moveTo(x, -hh);
        ctx2.lineTo(x - h * 0.52, hh);
        ctx2.stroke();
      }
    } else if (design === 'dots') {
      const gap = w * 0.29;
      const r = w * 0.072;
      let row = 0;
      for (let y = -hh + gap * 0.55; y < hh; y += gap) {
        for (let x = -hw + gap * (row % 2 ? 0.95 : 0.45); x < hw; x += gap) {
          ctx2.beginPath();
          ctx2.arc(x, y, r, 0, Math.PI * 2);
          ctx2.fill();
        }
        row++;
      }
    } else if (design === 'hearts') {
      const s = w * 0.15;
      drawHeart(ctx2, -w * 0.18, -h * 0.19, s);
      drawHeart(ctx2, w * 0.2, h * 0.02, s * 0.84);
      drawHeart(ctx2, -w * 0.06, h * 0.27, s * 0.68);
    } else if (design === 'glitter') {
      n.glitter.forEach((g) => {
        const twinkle = 0.44 + 0.56 * (0.5 + 0.5 * Math.sin(time * 2.6 + g.phase + state.sheen.x * 2.4));
        ctx2.globalAlpha = 0.24 + twinkle * 0.72;
        ctx2.fillStyle = g.warm ? accent : '#ffffff';
        ctx2.save();
        ctx2.translate(g.x * w, g.y * h);
        ctx2.rotate(g.phase + time * 0.22);
        const r = g.size * w;
        ctx2.beginPath();
        ctx2.moveTo(0, -r);
        ctx2.lineTo(r * 0.34, 0);
        ctx2.lineTo(0, r);
        ctx2.lineTo(-r * 0.34, 0);
        ctx2.closePath();
        ctx2.fill();
        ctx2.restore();
      });
      ctx2.globalAlpha = 0.9;
      const rng = mulberry32(n.index * 53 + 9);
      for (let i = 0; i < 3; i++) {
        const x = (rng() - 0.5) * w * 0.58;
        const y = (rng() - 0.5) * h * 0.58;
        const r = w * (0.12 + rng() * 0.06);
        ctx2.save();
        ctx2.translate(x, y);
        ctx2.fillStyle = 'rgba(255,255,255,0.92)';
        ctx2.beginPath();
        ctx2.moveTo(0, -r);
        ctx2.quadraticCurveTo(r * 0.16, -r * 0.16, r, 0);
        ctx2.quadraticCurveTo(r * 0.16, r * 0.16, 0, r);
        ctx2.quadraticCurveTo(-r * 0.16, r * 0.16, -r, 0);
        ctx2.quadraticCurveTo(-r * 0.16, -r * 0.16, 0, -r);
        ctx2.fill();
        ctx2.restore();
      }
    } else if (design === 'french') {
      ctx2.beginPath();
      ctx2.moveTo(-hw - 2, hh * 0.1);
      ctx2.quadraticCurveTo(0, hh * 0.34, hw + 2, hh * 0.1);
      ctx2.lineTo(hw + 2, hh + 2);
      ctx2.lineTo(-hw - 2, hh + 2);
      ctx2.closePath();
      ctx2.fill();
      ctx2.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx2.lineWidth = 1.2;
      ctx2.beginPath();
      ctx2.moveTo(-hw, hh * 0.12);
      ctx2.quadraticCurveTo(0, hh * 0.35, hw, hh * 0.12);
      ctx2.stroke();
    }

    ctx2.restore();
  }

  function drawLook(ctx2, n, look, time) {
    const w = n.w;
    const h = n.h;
    const hw = w / 2;
    const hh = h / 2;

    if (!look || !look.color) {
      drawNatural(ctx2, n);
      return;
    }

    const base = look.color;
    const grad = ctx2.createLinearGradient(-hw * 0.55, -hh, hw * 0.7, hh);
    grad.addColorStop(0, mix(base, '#ffffff', 0.4));
    grad.addColorStop(0.36, mix(base, '#ffffff', 0.11));
    grad.addColorStop(0.66, base);
    grad.addColorStop(1, mix(base, '#1c0d17', 0.28));
    ctx2.fillStyle = grad;
    ctx2.fillRect(-hw, -hh, w, h);

    const side = ctx2.createLinearGradient(-hw, 0, hw, 0);
    side.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
    side.addColorStop(0.32, 'rgba(255, 255, 255, 0)');
    side.addColorStop(0.74, 'rgba(20, 5, 15, 0)');
    side.addColorStop(1, 'rgba(20, 5, 15, 0.17)');
    ctx2.fillStyle = side;
    ctx2.fillRect(-hw, -hh, w, h);

    drawPattern(ctx2, look.design, base, n, time);

    const cuticle = ctx2.createLinearGradient(0, -hh, 0, -hh * 0.32);
    cuticle.addColorStop(0, 'rgba(38, 12, 27, 0.3)');
    cuticle.addColorStop(1, 'rgba(38, 12, 27, 0)');
    ctx2.fillStyle = cuticle;
    ctx2.fillRect(-hw, -hh, w, hh * 0.7);

    const tip = ctx2.createLinearGradient(0, hh * 0.58, 0, hh);
    tip.addColorStop(0, 'rgba(255, 255, 255, 0)');
    tip.addColorStop(1, 'rgba(255, 255, 255, 0.16)');
    ctx2.fillStyle = tip;
    ctx2.fillRect(-hw, hh * 0.58, w, hh * 0.42);
  }

  function drawGloss(ctx2, n, strength) {
    const k = strength == null ? 1 : strength;
    const w = n.w;
    const h = n.h;
    const hw = w / 2;
    const hh = h / 2;
    const sx = state.sheen.x * w * 0.16;
    const sy = state.sheen.y * h * 0.1;

    ctx2.save();
    ctx2.translate(sx, sy);
    ctx2.rotate(-0.62);
    const glow = ctx2.createRadialGradient(-w * 0.06, -h * 0.13, 1, -w * 0.06, -h * 0.13, w * 0.56);
    glow.addColorStop(0, `rgba(255, 255, 255, ${0.62 * k})`);
    glow.addColorStop(0.42, `rgba(255, 255, 255, ${0.2 * k})`);
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx2.fillStyle = glow;
    ctx2.beginPath();
    ctx2.ellipse(-w * 0.07, -h * 0.12, w * 0.34, h * 0.42, 0, 0, Math.PI * 2);
    ctx2.fill();

    ctx2.fillStyle = `rgba(255, 255, 255, ${0.42 * k})`;
    ctx2.beginPath();
    ctx2.ellipse(w * 0.2, -h * 0.34, w * 0.06, h * 0.16, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.restore();

    ctx2.fillStyle = `rgba(255, 255, 255, ${0.12 * k})`;
    ctx2.beginPath();
    ctx2.ellipse(-hw * 0.2, hh * 0.62, hw * 0.42, hh * 0.13, 0, 0, Math.PI * 2);
    ctx2.fill();
  }

  function drawNail(n, time) {
    const { w, h } = n;
    const hw = w / 2;
    const hh = h / 2;
    const scale = 1 - n.press * 0.055;

    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(n.angle);
    ctx.scale(scale, scale);

    ctx.save();
    ctx.shadowColor = 'rgba(87, 37, 58, 0.24)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = 'rgba(86, 38, 56, 0.3)';
    nailPath(w, h);
    ctx.fill();
    ctx.restore();

    ctx.save();
    nailPath(w, h);
    ctx.clip();

    if (n.paintT < 1) {
      if (n.prev) drawLook(ctx, n, n.prev, time);
      else drawNatural(ctx, n);

      const p = easeOutCubic(clamp(n.paintT, 0, 1));
      const edge = -hh + h * p;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-hw - 3, -hh - 3, w + 6, Math.max(0, edge + hh + 3));
      ctx.clip();
      drawLook(ctx, n, n.look, time);
      ctx.restore();

      if (p < 0.995) {
        const wet = ctx.createLinearGradient(0, edge - 2, 0, edge + 7);
        wet.addColorStop(0, 'rgba(255, 255, 255, 0)');
        wet.addColorStop(0.5, 'rgba(255, 255, 255, 0.72)');
        wet.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = wet;
        ctx.fillRect(-hw, edge - 2, w, 9);
      }
    } else {
      drawLook(ctx, n, n.look, time);
    }

    const cuticle = ctx.createLinearGradient(0, -hh, 0, -hh * 0.38);
    cuticle.addColorStop(0, 'rgba(170, 100, 86, 0.26)');
    cuticle.addColorStop(0.55, 'rgba(190, 120, 104, 0.07)');
    cuticle.addColorStop(1, 'rgba(190, 120, 104, 0)');
    ctx.fillStyle = cuticle;
    ctx.fillRect(-hw, -hh, w, hh * 0.62);

    const nailSides = ctx.createLinearGradient(-hw, 0, hw, 0);
    nailSides.addColorStop(0, 'rgba(120, 55, 48, 0.15)');
    nailSides.addColorStop(0.12, 'rgba(120, 55, 48, 0)');
    nailSides.addColorStop(0.88, 'rgba(120, 55, 48, 0)');
    nailSides.addColorStop(1, 'rgba(120, 55, 48, 0.15)');
    ctx.fillStyle = nailSides;
    ctx.fillRect(-hw, -hh, w, h);

    drawGloss(ctx, n, n.look && n.look.color ? 1 : 0.42);
    ctx.restore();

    nailPath(w, h);
    ctx.strokeStyle = 'rgba(71, 30, 50, 0.16)';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.6, -hh * 0.72);
    ctx.quadraticCurveTo(-hw * 0.84, -hh * 0.2, -hw * 0.66, hh * 0.18);
    ctx.stroke();

    if (n.look && n.req && looksMatch(n.look, n.req) && n.paintT >= 1) {
      const pulse = 1 + Math.sin(time * 4 + n.index) * 0.12;
      ctx.save();
      ctx.translate(w * 0.39, -h * 0.37);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#ffd977';
      ctx.shadowColor = 'rgba(255, 190, 60, 0.9)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -w * 0.15);
      ctx.quadraticCurveTo(w * 0.025, -w * 0.025, w * 0.15, 0);
      ctx.quadraticCurveTo(w * 0.025, w * 0.025, 0, w * 0.15);
      ctx.quadraticCurveTo(-w * 0.025, w * 0.025, -w * 0.15, 0);
      ctx.quadraticCurveTo(-w * 0.025, -w * 0.025, 0, -w * 0.15);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawHand(time) {
    ctx.save();
    ctx.translate(DW / 2 + state.handX, DH / 2 + state.handY);
    ctx.rotate(state.handRot);
    ctx.translate(-DW / 2, -DH / 2 + Math.sin(time * 1.05) * 1.4);

    ctx.save();
    ctx.translate(360, 700);
    ctx.scale(1, 0.4);
    const shadow = ctx.createRadialGradient(0, 0, 20, 0, 0, 245);
    shadow.addColorStop(0, 'rgba(120, 51, 84, 0.2)');
    shadow.addColorStop(0.55, 'rgba(120, 51, 84, 0.08)');
    shadow.addColorStop(1, 'rgba(120, 51, 84, 0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(0, 0, 245, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (!bodyCanvas) renderHandBody();
    ctx.drawImage(bodyCanvas, 0, 0, DW, DH);

    nails.forEach((n) => drawNail(n, time));
    ctx.restore();
  }

  function drawBackdrop(time) {
    const halo = ctx.createRadialGradient(350, 460, 30, 350, 460, 390);
    halo.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    halo.addColorStop(0.46, 'rgba(255, 226, 238, 0.22)');
    halo.addColorStop(1, 'rgba(255, 226, 238, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, DW, DH);

    const rand = mulberry32(221);
    for (let i = 0; i < 16; i++) {
      const x = 60 + rand() * 590;
      const y = 190 + rand() * 430;
      const r = 1.2 + rand() * 3.2;
      const twinkle = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(time * 1.3 + i * 1.7));
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8})`;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.8);
      ctx.quadraticCurveTo(x + r * 0.2, y - r * 0.2, x + r * 1.8, y);
      ctx.quadraticCurveTo(x + r * 0.2, y + r * 0.2, x, y + r * 1.8);
      ctx.quadraticCurveTo(x - r * 0.2, y + r * 0.2, x - r * 1.8, y);
      ctx.quadraticCurveTo(x - r * 0.2, y - r * 0.2, x, y - r * 1.8);
      ctx.fill();
    }
  }

  function spawnBurst(x, y, color, count, power) {
    const total = count || 12;
    const p = power || 1;
    for (let i = 0; i < total; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (26 + Math.random() * 108) * p;
      const life = 0.5 + Math.random() * 0.65;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 26 * p,
        life,
        maxLife: life,
        size: 2.4 + Math.random() * 4.6 * p,
        color: Math.random() < 0.38 ? '#ffffff' : color,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 7,
        star: Math.random() < 0.55
      });
    }
    if (state.particles.length > 260) state.particles.splice(0, state.particles.length - 260);
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      p.vy += 52 * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    state.particles.forEach((p) => {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.star) {
        const r = p.size * (0.6 + a * 0.55);
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(r * 0.2, -r * 0.2, r, 0);
        ctx.quadraticCurveTo(r * 0.2, r * 0.2, 0, r);
        ctx.quadraticCurveTo(-r * 0.2, r * 0.2, -r, 0);
        ctx.quadraticCurveTo(-r * 0.2, -r * 0.2, 0, -r);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
  }

  function buildPalette() {
    paletteEl.innerHTML = '';
    PALETTE.forEach((color, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch';
      btn.style.setProperty('--c', color.hex);
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-label', color.name);
      btn.setAttribute('aria-selected', i === state.selectedColor ? 'true' : 'false');
      btn.title = color.name;
      const check = document.createElement('span');
      check.className = 'swatch-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';
      btn.appendChild(check);
      btn.addEventListener('click', () => selectColor(i));
      paletteEl.appendChild(btn);
    });
    updateSelectedColorUI();
  }

  function buildDesigns() {
    designsEl.innerHTML = '';
    DESIGNS.forEach((design, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'design';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-label', design.label);
      btn.setAttribute('aria-selected', i === state.selectedDesign ? 'true' : 'false');
      const swatch = document.createElement('span');
      swatch.className = `design-swatch art-${design.id}`;
      swatch.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'design-label';
      label.textContent = design.label;
      btn.append(swatch, label);
      btn.addEventListener('click', () => selectDesign(i));
      designsEl.appendChild(btn);
    });
  }

  function selectColor(i) {
    state.selectedColor = i;
    updateSelectedColorUI();
    soundClick();
    ensureAudio();
  }

  function updateSelectedColorUI() {
    const color = PALETTE[state.selectedColor];
    [...paletteEl.children].forEach((el, i) => {
      el.setAttribute('aria-selected', i === state.selectedColor ? 'true' : 'false');
    });
    selectedNameEl.textContent = color.name;
    selectedNameEl.style.setProperty('--selected', color.hex);
  }

  function selectDesign(i) {
    state.selectedDesign = i;
    [...designsEl.children].forEach((el, idx) => {
      el.setAttribute('aria-selected', idx === i ? 'true' : 'false');
    });
    soundClick();
    ensureAudio();
  }

  function generateOrder(level) {
    const colors = shuffle(PALETTE).slice(0, 5);
    const nonPlain = DESIGNS.filter((d) => d.id !== 'plain');
    const designCount = Math.min(5, Math.max(0, level - 1));
    const slots = shuffle([0, 1, 2, 3, 4]).slice(0, designCount);
    const requirements = colors.map((color, i) => ({
      color: color.hex,
      colorName: color.name,
      design: slots.includes(i) ? nonPlain[Math.floor(Math.random() * nonPlain.length)].id : 'plain'
    }));

    let client = CLIENTS[Math.floor(Math.random() * CLIENTS.length)];
    if (state.order && client.name === state.order.client.name) {
      client = CLIENTS[(CLIENTS.indexOf(client) + 1) % CLIENTS.length];
    }
    return { client, theme: client.theme, note: client.note, requirements };
  }

  function designLabel(id) {
    const found = DESIGNS.find((d) => d.id === id);
    return found ? found.label : 'Plain';
  }

  function startOrder(level) {
    state.level = level;
    state.order = generateOrder(level);
    state.mistakes = 0;
    state.applications = 0;
    state.completed = false;
    state.pendingComplete = false;
    state.startedAt = performance.now();
    state.chips = [];
    state.particles = [];
    state.dragPainted.clear();
    state.dragId = null;

    state.order.requirements.forEach((req, i) => {
      nails[i].req = req;
      nails[i].look = null;
      nails[i].prev = null;
      nails[i].paintT = 1;
      nails[i].press = 0;
    });

    orderTitleEl.textContent = `${state.order.client.name}'s ${state.order.theme}`;
    orderSubEl.textContent = state.order.note;
    clientAvatarEl.textContent = state.order.client.name.charAt(0);
    setBadgeEl.textContent = `Set ${level}`;

    orderNailsEl.innerHTML = '';
    state.order.requirements.forEach((req, i) => {
      const chip = document.createElement('div');
      chip.className = `order-nail art-${req.design}`;
      chip.style.setProperty('--c', req.color);
      chip.style.setProperty('--accent', patternAccent(req.color, req.design));
      chip.title = `${req.colorName} · ${designLabel(req.design)}`;
      chip.setAttribute('role', 'img');
      chip.setAttribute('aria-label', `Nail ${i + 1}: ${req.colorName}, ${designLabel(req.design)}`);
      const tick = document.createElement('span');
      tick.className = 'tick';
      tick.setAttribute('aria-hidden', 'true');
      tick.textContent = '✓';
      chip.appendChild(tick);
      orderNailsEl.appendChild(chip);
      state.chips.push(chip);
    });

    celebrateEl.hidden = true;
    progressTextEl.hidden = false;
    newClientBtn.hidden = true;
    updateProgress();
    hintEl.classList.toggle('hide', state.applications > 0);
    lastFrame = performance.now();
    resize();
  }

  function looksMatch(look, req) {
    return !!look && !!req && look.color === req.color && look.design === req.design;
  }

  function matchedCount() {
    return nails.reduce((sum, n) => sum + (looksMatch(n.look, n.req) ? 1 : 0), 0);
  }

  function allMatched() {
    return nails.every((n) => looksMatch(n.look, n.req));
  }

  function updateProgress() {
    const matched = matchedCount();
    progressTextEl.textContent = `${matched}/5`;
    progressTextEl.classList.toggle('done', matched === 5);
    state.chips.forEach((chip, i) => {
      chip.classList.toggle('matched', looksMatch(nails[i].look, nails[i].req));
    });
    if (state.completed || matched === 5) {
      progressTextEl.hidden = true;
      newClientBtn.hidden = false;
    } else {
      progressTextEl.hidden = false;
      newClientBtn.hidden = true;
    }
  }

  function paintNail(n) {
    const color = PALETTE[state.selectedColor];
    const design = DESIGNS[state.selectedDesign];
    const target = { color: color.hex, design: design.id };

    if (n.look && n.look.color === target.color && n.look.design === target.design && n.paintT >= 1) {
      const c = applyHandTransform(n.x, n.y);
      spawnBurst(c.x, c.y, color.hex, 8, 0.6);
      soundSparkle();
      vibrate(8);
      return;
    }

    n.prev = n.look ? { ...n.look } : null;
    n.look = target;
    n.paintT = 0;
    n.paintStart = performance.now();
    n.press = 1;
    state.applications++;

    const matches = looksMatch(target, n.req);
    if (!matches) state.mistakes++;

    const c = applyHandTransform(n.x, n.y);
    spawnBurst(c.x, c.y, color.hex, matches ? 16 : 11, matches ? 1 : 0.8);
    soundPaint();
    vibrate(matches ? [12, 24, 14] : 12);

    hintEl.classList.add('hide');
    updateProgress();

    if (allMatched()) scheduleComplete();
  }

  function scheduleComplete() {
    if (state.completed || state.pendingComplete) return;
    state.pendingComplete = true;
    const token = state.order;
    window.setTimeout(() => {
      state.pendingComplete = false;
      if (state.order !== token || state.completed) return;
      if (allMatched()) showCelebration();
    }, 680);
  }

  function showCelebration() {
    state.completed = true;
    const stars = state.mistakes === 0 ? 3 : state.mistakes <= 2 ? 2 : 1;
    const elapsed = performance.now() - state.startedAt;

    starsEl.innerHTML = [0, 1, 2]
      .map((i) => `<span class="${i < stars ? '' : 'dim'}">★</span>`)
      .join('');
    celebrateTitleEl.textContent = stars === 3 ? 'Flawless!' : stars === 2 ? 'Gorgeous!' : 'All done!';
    celebrateSubEl.textContent = `${state.order.client.name} loves her ${state.order.theme.toLowerCase()}.`;
    statStarsEl.textContent = String(stars);
    statTimeEl.textContent = formatTime(elapsed);
    statLooksEl.textContent = String(state.applications);

    updateProgress();
    celebrateEl.hidden = false;
    soundSuccess();
    vibrate([24, 40, 24, 40, 48]);

    const center = applyHandTransform(DW / 2, 470);
    spawnBurst(center.x, center.y, '#ffd977', 46, 1.7);
    spawnBurst(center.x, center.y - 40, '#ff9bbd', 30, 1.4);

    window.setTimeout(() => {
      nextBtn.focus({ preventScroll: true });
    }, 120);
  }

  function nextOrder() {
    startOrder(state.level + 1);
    soundSparkle();
    showToast('New client, new nails. Make them shine.');
  }

  function clearNails() {
    nails.forEach((n) => {
      n.prev = n.look;
      n.look = null;
      n.paintT = 1;
      n.press = 0;
    });
    state.completed = false;
    state.pendingComplete = false;
    state.mistakes = 0;
    state.applications = 0;
    state.startedAt = performance.now();
    celebrateEl.hidden = true;
    updateProgress();
    hintEl.classList.remove('hide');
    soundClick();
    showToast('Nails cleared — start again.');
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  const orderCardEl = $('orderCard');

  function resize() {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pixelW = Math.round(rect.width * dpr);
    const pixelH = Math.round(rect.height * dpr);
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }

    const landscape = window.matchMedia('(orientation: landscape) and (max-height: 620px) and (min-width: 560px)').matches;
    const cardRect = orderCardEl.getBoundingClientRect();
    const cardBottom = Math.max(0, cardRect.bottom - rect.top);
    const reserveTop = landscape ? 8 : cardBottom + 18;
    const availW = rect.width * 0.97;
    const availH = Math.max(220, rect.height - reserveTop - 14);
    const scale = Math.max(0.2, Math.min(availW / BOUNDS.w, availH / BOUNDS.h));
    const leftover = Math.max(0, availH - BOUNDS.h * scale);
    const top = reserveTop + leftover * 0.48;
    const shiftX = landscape ? 14 : 0;

    state.view = {
      scale,
      ox: rect.width / 2 - (BOUNDS.x + BOUNDS.w / 2) * scale + shiftX,
      oy: top - BOUNDS.y * scale,
      w: rect.width,
      h: rect.height,
      dpr
    };
  }

  function eventToDesign(e) {
    const rect = canvas.getBoundingClientRect();
    const v = state.view;
    return {
      x: (e.clientX - rect.left - v.ox) / v.scale,
      y: (e.clientY - rect.top - v.oy) / v.scale
    };
  }

  function nailAtPoint(point) {
    const q = inverseHandTransform(point.x, point.y);
    for (const n of nails) {
      const local = rotatePoint(q.x, q.y, n.x, n.y, -n.angle);
      const lx = local.x - n.x;
      const ly = local.y - n.y;
      const rx = Math.max(n.w * 0.64, 19);
      const ry = Math.max(n.h * 0.64, 25);
      if ((lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1.3) return n;
    }
    return null;
  }

  function updateSheenFromPointer(e) {
    const rect = stage.getBoundingClientRect();
    state.pointerSheen.x = clamp(((e.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
    state.pointerSheen.y = clamp(((e.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
  }

  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (!celebrateEl.hidden) return;
      ensureAudio();
      updateSheenFromPointer(e);
      const point = eventToDesign(e);
      const nail = nailAtPoint(point);
      state.dragId = e.pointerId;
      state.dragPainted = new Set();
      if (nail) {
        state.dragPainted.add(nail.index);
        paintNail(nail);
      }
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        
      }
      e.preventDefault();
    },
    { passive: false }
  );

  canvas.addEventListener(
    'pointermove',
    (e) => {
      if (!state.tiltActive) updateSheenFromPointer(e);
      if (state.dragId !== e.pointerId || !celebrateEl.hidden) return;
      const point = eventToDesign(e);
      const nail = nailAtPoint(point);
      if (nail && !state.dragPainted.has(nail.index)) {
        state.dragPainted.add(nail.index);
        paintNail(nail);
      }
    },
    { passive: true }
  );

  function endDrag(e) {
    if (state.dragId === e.pointerId) state.dragId = null;
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => {
    if (!state.tiltActive) {
      state.pointerSheen.x = 0;
      state.pointerSheen.y = 0;
    }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function updateTiltButton() {
    tiltBtn.setAttribute('aria-pressed', state.tiltActive ? 'true' : 'false');
    tiltBtn.title = state.tiltActive ? 'Disable tilt controls' : 'Enable tilt controls';
    tiltBtn.querySelector('.btn-label').textContent = state.tiltActive ? 'Tilt on' : 'Tilt';
  }

  function handleOrientation(e) {
    if (e.gamma == null && e.beta == null) return;
    state.tiltSeen = true;
    state.tilt.x = clamp((e.gamma || 0) / 45, -1, 1);
    state.tilt.y = clamp(((e.beta || 0) - 45) / 55, -1, 1);
  }

  function disableTilt() {
    window.removeEventListener('deviceorientation', handleOrientation, true);
    window.clearTimeout(state.tiltProbe);
    state.tiltActive = false;
    state.tiltSeen = false;
    state.tilt.x = 0;
    state.tilt.y = 0;
    updateTiltButton();
  }

  async function toggleTilt() {
    if (state.tiltActive) {
      disableTilt();
      showToast('Tilt off. Touch controls still work.');
      soundClick();
      return;
    }

    const DOE = window.DeviceOrientationEvent;
    if (!DOE) {
      showToast('Tilt is not available on this device.');
      return;
    }

    try {
      if (typeof DOE.requestPermission === 'function') {
        const permission = await DOE.requestPermission();
        if (permission !== 'granted') {
          showToast('Motion access was not granted. Touch controls still work.');
          return;
        }
      }
    } catch (err) {
      showToast('Tap Tilt again to allow motion access.');
      return;
    }

    window.addEventListener('deviceorientation', handleOrientation, true);
    state.tiltActive = true;
    state.tiltSeen = false;
    updateTiltButton();
    ensureAudio();
    soundSparkle();
    vibrate(14);
    showToast('Tilt on — sway your device to catch the light.');

    window.clearTimeout(state.tiltProbe);
    state.tiltProbe = window.setTimeout(() => {
      if (state.tiltActive && !state.tiltSeen) {
        disableTilt();
        showToast('No motion sensor found — touch still works.');
      }
    }, 2400);
  }

  tiltBtn.addEventListener('click', toggleTilt);

  function updateSoundButton() {
    soundBtn.setAttribute('aria-pressed', state.soundOn ? 'true' : 'false');
    soundBtn.title = state.soundOn ? 'Mute sound' : 'Turn sound on';
  }

  function toggleSound() {
    state.soundOn = !state.soundOn;
    updateSoundButton();
    try {
      localStorage.setItem('glossGlowSound', state.soundOn ? '1' : '0');
    } catch (err) {
      
    }
    if (state.soundOn) {
      ensureAudio();
      soundSparkle();
    } else {
      showToast('Sound off.');
    }
  }

  soundBtn.addEventListener('click', toggleSound);

  resetBtn.addEventListener('click', clearNails);
  newSetBtn.addEventListener('click', nextOrder);
  newClientBtn.addEventListener('click', nextOrder);
  nextBtn.addEventListener('click', nextOrder);

  keepBtn.addEventListener('click', () => {
    celebrateEl.hidden = true;
    updateProgress();
    hintEl.classList.add('hide');
    showToast('Order saved — tap New client for a fresh set.');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !celebrateEl.hidden) {
      celebrateEl.hidden = true;
      updateProgress();
      return;
    }
    if (e.key >= '1' && e.key <= '9') {
      const index = Number(e.key) - 1;
      if (index < PALETTE.length) selectColor(index);
    }
  });

  function updateHand(dt) {
    const targetX = state.tiltActive ? state.tilt.x : state.pointerSheen.x;
    const targetY = state.tiltActive ? state.tilt.y : state.pointerSheen.y;
    const k = 1 - Math.exp(-dt * 5);
    state.sheen.x += (targetX - state.sheen.x) * k;
    state.sheen.y += (targetY - state.sheen.y) * k;

    const hk = 1 - Math.exp(-dt * 3.6);
    state.handRot += (state.sheen.x * 0.03 - state.handRot) * hk;
    state.handX += (-state.sheen.x * 4 - state.handX) * hk;
    state.handY += (-state.sheen.y * 3 - state.handY) * hk;
  }

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    state.time = now / 1000;

    updateHand(dt);
    updateParticles(dt);
    nails.forEach((n) => {
      if (n.paintT < 1) {
        n.paintT = clamp((now - n.paintStart) / PAINT_MS, 0, 1);
        if (n.paintT >= 1) n.prev = null;
      }
      n.press *= Math.exp(-dt * 9);
      if (n.press < 0.001) n.press = 0;
    });

    const v = state.view;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    ctx.clearRect(0, 0, v.w, v.h);
    ctx.save();
    ctx.translate(v.ox, v.oy);
    ctx.scale(v.scale, v.scale);
    drawBackdrop(state.time);
    drawHand(state.time);
    drawParticles();
    ctx.restore();

    requestAnimationFrame(frame);
  }

  try {
    state.soundOn = localStorage.getItem('glossGlowSound') !== '0';
  } catch (err) {
    state.soundOn = true;
  }

  buildPalette();
  buildDesigns();
  updateSoundButton();
  updateTiltButton();
  startOrder(1);

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => resize()).observe(stage);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => {
    window.setTimeout(resize, 220);
    window.setTimeout(resize, 620);
  });
  window.addEventListener('load', resize);
  window.setTimeout(resize, 350);

  requestAnimationFrame(frame);
})();
