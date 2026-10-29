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
    { id: 'thumb', base: [300, 700], tip: [172, 512], width: 84 },
    { id: 'pinky', base: [478, 660], tip: [512, 430], width: 64 },
    { id: 'ring', base: [428, 630], tip: [438, 356], width: 74 },
    { id: 'middle', base: [376, 620], tip: [358, 330], width: 80 },
    { id: 'index', base: [324, 640], tip: [282, 372], width: 76 }
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
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
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
    const dx = finger.tip[0] - finger.base[0];
    const dy = finger.tip[1] - finger.base[1];
    const len = Math.hypot(dx, dy);
    const dir = { x: dx / len, y: dy / len };
    const width = finger.width * 0.7;
    const height = width * 1.62;
    const center = {
      x: finger.tip[0] - dir.x * (height / 2 + 5),
      y: finger.tip[1] - dir.y * (height / 2 + 5)
    };
    const rng = mulberry32(101 + index * 977);
    nails.push({
      index,
      id: finger.id,
      x: center.x,
      y: center.y,
      w: width,
      h: height,
      angle: Math.atan2(dir.y, dir.x) - Math.PI / 2,
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

  function fingerPath(f) {
    ctx.beginPath();
    const [bx, by] = f.base;
    const [tx, ty] = f.tip;
    const dx = tx - bx;
    const dy = ty - by;
    const len = Math.hypot(dx, dy);
    const dirx = dx / len;
    const diry = dy / len;
    const nx = -diry;
    const ny = dirx;
    const half = f.width / 2;
    const tipR = f.width * 0.43;
    const tipCx = tx - dirx * tipR;
    const tipCy = ty - diry * tipR;
    const bl = { x: bx + nx * half, y: by + ny * half };
    const br = { x: bx - nx * half, y: by - ny * half };
    const tl = { x: tipCx + nx * tipR, y: tipCy + ny * tipR };
    const tr = { x: tipCx - nx * tipR, y: tipCy - ny * tipR };

    ctx.moveTo(bl.x, bl.y);
    ctx.bezierCurveTo(
      bl.x + dirx * len * 0.3 + nx * 1.6,
      bl.y + diry * len * 0.3 + ny * 1.6,
      tl.x - dirx * tipR * 1.5 + nx * 0.8,
      tl.y - diry * tipR * 1.5 + ny * 0.8,
      tl.x,
      tl.y
    );
    ctx.arc(tipCx, tipCy, tipR, Math.atan2(ny, nx), Math.atan2(ny, nx) - Math.PI, true);
    ctx.bezierCurveTo(
      tr.x - dirx * tipR * 1.5 - nx * 0.8,
      tr.y - diry * tipR * 1.5 - ny * 0.8,
      br.x + dirx * len * 0.3 - nx * 1.6,
      br.y + diry * len * 0.3 - ny * 1.6,
      br.x,
      br.y
    );
    ctx.closePath();
    return { dirx, diry, nx, ny, len };
  }

  function palmPath() {
    ctx.beginPath();
    ctx.moveTo(292, 840);
    ctx.bezierCurveTo(274, 760, 282, 690, 318, 648);
    ctx.bezierCurveTo(348, 620, 402, 612, 444, 622);
    ctx.bezierCurveTo(480, 632, 502, 658, 508, 698);
    ctx.bezierCurveTo(516, 752, 500, 804, 476, 840);
    ctx.closePath();
  }

  function nailPath(w, h) {
    const hw = w / 2;
    const hh = h / 2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -hh);
    ctx.bezierCurveTo(-hw * 1.03, -hh * 0.62, -hw * 0.98, -hh * 0.05, -hw * 0.86, hh * 0.22);
    ctx.bezierCurveTo(-hw * 0.76, hh * 0.74, -hw * 0.36, hh, 0, hh);
    ctx.bezierCurveTo(hw * 0.36, hh, hw * 0.76, hh * 0.74, hw * 0.86, hh * 0.22);
    ctx.bezierCurveTo(hw * 0.98, -hh * 0.05, hw * 1.03, -hh * 0.62, w * 0.34, -hh);
    ctx.bezierCurveTo(w * 0.16, -hh * 0.84, -w * 0.16, -hh * 0.84, -w * 0.34, -hh);
    ctx.closePath();
  }

  function drawFinger(f) {
    const info = fingerPath(f);
    const [bx, by] = f.base;
    const [tx, ty] = f.tip;
    const half = f.width / 2;

    const across = ctx.createLinearGradient(
      bx + info.nx * half,
      by + info.ny * half,
      bx - info.nx * half,
      by - info.ny * half
    );
    across.addColorStop(0, SKIN.light);
    across.addColorStop(0.34, SKIN.mid);
    across.addColorStop(0.72, SKIN.shade);
    across.addColorStop(1, SKIN.deep);
    ctx.fillStyle = across;
    ctx.fill();

    ctx.save();
    fingerPath(f);
    ctx.clip();

    const along = ctx.createLinearGradient(bx, by, tx, ty);
    along.addColorStop(0, 'rgba(120, 60, 45, 0.10)');
    along.addColorStop(0.45, 'rgba(255, 255, 255, 0.03)');
    along.addColorStop(1, 'rgba(255, 255, 255, 0.16)');
    ctx.fillStyle = along;
    ctx.fillRect(0, 0, DW, DH);

    const blush = ctx.createRadialGradient(tx, ty, 2, tx, ty, f.width * 0.9);
    blush.addColorStop(0, 'rgba(233, 143, 128, 0.18)');
    blush.addColorStop(1, 'rgba(233, 143, 128, 0)');
    ctx.fillStyle = blush;
    ctx.fillRect(0, 0, DW, DH);

    ctx.strokeStyle = SKIN.crease;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    [0.34, 0.58].forEach((t) => {
      const cx = bx + info.dirx * info.len * t;
      const cy = by + info.diry * info.len * t;
      const w = f.width * (0.34 - t * 0.08);
      ctx.beginPath();
      ctx.moveTo(cx + info.nx * w, cy + info.ny * w);
      ctx.quadraticCurveTo(
        cx - info.dirx * f.width * 0.16,
        cy - info.diry * f.width * 0.16,
        cx - info.nx * w,
        cy - info.ny * w
      );
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = f.width * 0.075;
    ctx.beginPath();
    const hx = bx + info.nx * half * 0.64;
    const hy = by + info.ny * half * 0.64;
    ctx.moveTo(hx + info.dirx * info.len * 0.14, hy + info.diry * info.len * 0.14);
    ctx.quadraticCurveTo(
      tx + info.nx * half * 0.42 + info.dirx * 10,
      ty + info.ny * half * 0.42 + info.diry * 10,
      tx + info.nx * half * 0.2,
      ty + info.ny * half * 0.2
    );
    ctx.stroke();
    ctx.restore();

    fingerPath(f);
    ctx.strokeStyle = SKIN.line;
    ctx.lineWidth = 2.1;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function drawPalm() {
    palmPath();
    const grad = ctx.createLinearGradient(292, 620, 512, 820);
    grad.addColorStop(0, SKIN.light);
    grad.addColorStop(0.4, SKIN.mid);
    grad.addColorStop(0.78, SKIN.shade);
    grad.addColorStop(1, SKIN.deep);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    palmPath();
    ctx.clip();

    const sheen = ctx.createRadialGradient(356, 664, 18, 356, 664, 220);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.19)');
    sheen.addColorStop(0.6, 'rgba(255, 255, 255, 0.03)');
    sheen.addColorStop(1, 'rgba(130, 60, 45, 0.08)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, DW, DH);

    ctx.strokeStyle = 'rgba(150, 85, 66, 0.1)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    [
      [326, 660, 350, 750],
      [382, 646, 392, 746],
      [438, 650, 436, 744]
    ].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) / 2 + 4, (y1 + y2) / 2, x2, y2);
      ctx.stroke();
    });
    ctx.restore();

    palmPath();
    ctx.strokeStyle = SKIN.line;
    ctx.lineWidth = 2.3;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function drawNatural(ctx2, n) {
    const { w, h } = n;
    const hw = w / 2;
    const hh = h / 2;
    const grad = ctx2.createLinearGradient(0, -hh, 0, hh);
    grad.addColorStop(0, '#f3c6b8');
    grad.addColorStop(0.42, '#eeb5a4');
    grad.addColorStop(0.72, '#e6a692');
    grad.addColorStop(1, '#efd0c5');
    ctx2.fillStyle = grad;
    ctx2.fillRect(-hw, -hh, w, h);

    const blush = ctx2.createRadialGradient(0, hh * 0.2, 1, 0, hh * 0.2, hw * 1.25);
    blush.addColorStop(0, 'rgba(249, 177, 170, 0.42)');
    blush.addColorStop(1, 'rgba(249, 177, 170, 0)');
    ctx2.fillStyle = blush;
    ctx2.fillRect(-hw, -hh, w, h);

    const freeEdge = ctx2.createLinearGradient(0, hh * 0.62, 0, hh);
    freeEdge.addColorStop(0, 'rgba(255, 250, 247, 0)');
    freeEdge.addColorStop(0.72, 'rgba(255, 250, 247, 0.16)');
    freeEdge.addColorStop(1, 'rgba(255, 250, 247, 0.3)');
    ctx2.fillStyle = freeEdge;
    ctx2.fillRect(-hw, hh * 0.62, w, hh * 0.38);

    ctx2.strokeStyle = 'rgba(186, 122, 107, 0.22)';
    ctx2.lineWidth = 1.3;
    ctx2.beginPath();
    ctx2.moveTo(-w * 0.26, -hh * 0.72);
    ctx2.quadraticCurveTo(0, -hh * 0.58, w * 0.26, -hh * 0.72);
    ctx2.stroke();

    ctx2.strokeStyle = 'rgba(190, 132, 116, 0.12)';
    ctx2.lineWidth = 0.9;
    for (let i = -2; i <= 2; i++) {
      ctx2.beginPath();
      ctx2.moveTo(i * w * 0.09, -hh * 0.45);
      ctx2.quadraticCurveTo(i * w * 0.11, 0, i * w * 0.08, hh * 0.5);
      ctx2.stroke();
    }
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
    ctx.shadowColor = 'rgba(87, 37, 58, 0.34)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = 'rgba(86, 38, 56, 0.42)';
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

    drawGloss(ctx, n, n.look && n.look.color ? 1 : 0.55);
    ctx.restore();

    nailPath(w, h);
    ctx.strokeStyle = 'rgba(71, 30, 50, 0.28)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.8;
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
    ctx.translate(352, 660);
    ctx.scale(1, 0.38);
    const shadow = ctx.createRadialGradient(0, 0, 20, 0, 0, 250);
    shadow.addColorStop(0, 'rgba(120, 51, 84, 0.24)');
    shadow.addColorStop(0.55, 'rgba(120, 51, 84, 0.1)');
    shadow.addColorStop(1, 'rgba(120, 51, 84, 0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(0, 0, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    FINGERS.forEach(drawFinger);
    drawPalm();

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
