/*
 * "It All Started With a Ħarsi": the opening of A Maltese Tale, drawn live to the theme song.
 *
 * Everything here is drawn on one canvas, every frame, from the song's own clock: the audio
 * element is the conductor and each scene is a function of time. The lyric timings come from the
 * song file; the beat grid (139.66 bpm) and the kick drum hits were measured from the audio, so
 * the flashes, bounces and cuts land on the music.
 *
 * Query options: ?embed=1 (inside the game; reports back when done), ?t=SECONDS (start there),
 * ?shot=SECONDS (draw that moment, frozen, without sound).
 */
(() => {
  "use strict";

  // ─── Timing ────────────────────────────────────────────────────────────────────────────────

  const BEAT = 60 / 139.66;
  const BEAT0 = 4.63;
  const SONG_END = 174;

  const LINES = [
    [17.394, 20.984, "The bus is late, the sun is hot, the bread is fresh, the coffee's not"],
    [20.984, 24.335, "Nanna's on the balcony and shouting at the neighbour's cat"],
    [24.335, 27.766, "The kids are racing up the street, the church bells ring at half past eight"],
    [27.766, 30.957, "A pastizz in my pocket and I know I'm gonna be late —"],
    [30.957, 34.388, "Wait! Something's moving in the rubble wall!"],
    [34.388, 37.58, "Something's peeking from behind the fish stall!"],
    [37.58, 39.335, "It's small, it's quick, it's kinda shy,"],
    [39.335, 41.09, "It's got a little sparkle in its eye —"],
    [41.09, 43.484, "And it all started with a…"],
    [43.484, 48.59, "Ħarsi! (Ħarsi!) In every wall and every wave!"],
    [48.59, 51.622, "Ħarsi! (Ħarsi!) At every festa, every cave!"],
    [51.622, 55.133, "Grab your nassa — ejja, ejja — don't be late!"],
    [55.133, 58.484, "It all started with a…"],
    [58.484, 61.995, "Somebody broke into the Oracle Room and now the island's in a state"],
    [61.995, 65.505, "So I've got my little partner and a map of every village gate"],
    [65.505, 69.176, "From Mdina's silent walls down to the boats in Marsaxlokk"],
    [69.176, 72.207, "Through the temples and the catacombs and Dingli's dizzy rock"],
    [72.207, 75.479, "My rival's got a grin and a brand new team and says they're gonna win"],
    [75.479, 79.229, "So we battle in the square while the band plays loud and the fireworks begin!"],
    [79.229, 82.42, "Another medal on my bag, another friend inside the Gaġġa"],
    [82.42, 86.011, "It's getting kinda crowded but I'm never gonna stop — ejja!"],
    [86.011, 88.404, "'Cause it all started with a…"],
    [88.404, 93.59, "Ħarsi! (Ħarsi!) In every wall and every wave!"],
    [93.59, 96.543, "Ħarsi! (Ħarsi!) At every festa, every cave!"],
    [96.543, 99.973, "Grab your nassa — ejja, ejja — don't be late!"],
    [99.973, 103.644, "It all started with a…"],
    [103.644, 105.638, "Pastizzi! Kinnie! Festa! Ħarsi!"],
    [105.638, 110.745, "Pastizzi! Kinnie! Festa! Ħarsi!"],
    [110.745, 112.5, "Waħda! Tnejn! Tlieta! Erbgħa!"],
    [112.5, 117.367, "Ejja, ejja, ejja magħna!"],
    [117.367, 120.718, "From the Ice Age caves to the temple stones, the Phoenicians sailing in"],
    [120.718, 123.989, "St Paul washed up, the Knights stood tough, the Siege they couldn't win"],
    [123.989, 127.66, "The George Cross shining on the flag, the ferry's honking in the bay"],
    [127.66, 132.527, "Every stone has got a story — every story's got a Ħarsi on the way!"],
    [132.527, 136.037, "So pack a ftira, grab your net, and tell your nanna you'll be late —"],
    [136.037, 138.351, "'Cause it all started with a…"],
    [138.351, 141.782, "Ħarsi! (Ħarsi!) In every wall and every wave!"],
    [141.782, 144.814, "Ħarsi! (Ħarsi!) At every festa, every cave!"],
    [144.814, 148.245, "Grab your nassa — ejja, ejja — don't be late!"],
    [148.245, 158.245, "It all started with a…"],
  ];
  /** The shouted "ĦARSI!" that ends every build. */
  const HITS = [43.484, 58.484, 88.404, 103.644, 138.351, 169.069];

  /** Strong kick-drum hits measured from the song (seconds). */
  const KICKS = [];
  {
    // A steady four-on-the-floor from the band's entrance; the measured grid is close enough
    // that the strongest beats are simply every beat, with the bar's first beat leaning harder.
    for (let t = BEAT0; t < SONG_END; t += BEAT) KICKS.push(t);
  }

  // ─── Words ─────────────────────────────────────────────────────────────────────────────────

  /** When each word of each line is sung: spread over the line by length, punctuation pausing. */
  const WORDS = LINES.map(([start, end, text]) => {
    const words = text.split(/\s+/).filter((w) => w && w !== "—");
    const weight = (w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1.6 + (/[,!—…?]$/.test(w) ? 1.4 : 0);
    const total = words.reduce((s, w) => s + weight(w), 0);
    const span = Math.min((end - start) * 0.94, total * 0.075 + 0.4);
    let at = start;
    return words.map((w) => {
      const item = { w, t: at };
      at += (weight(w) / total) * span;
      return item;
    });
  });
  /** The time the first word containing `key` is sung in line `i`. */
  function wordAt(i, key, nth = 0) {
    let seen = 0;
    for (const item of WORDS[i]) {
      if (item.w.toLowerCase().includes(key.toLowerCase())) {
        if (seen === nth) return item.t;
        seen++;
      }
    }
    return LINES[i][0];
  }

  // ─── Canvas ────────────────────────────────────────────────────────────────────────────────

  const canvas = document.getElementById("stage");
  const X = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1, S = 0, CX = 0, CY = 0, A = 0, U = 0, PORTRAIT = false;

  let vignette = null;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    // Sharp on phones; on big screens, a pixel budget keeps it smooth (the art is soft anyway).
    DPR = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.4e6 / (W * H)));
    vignette = null;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    S = Math.min(W, H);
    PORTRAIT = H > W * 1.1;
    // The art sits above the lyrics: centred a little high, sized to what's left.
    CX = W / 2;
    CY = H * (PORTRAIT ? 0.42 : 0.43);
    A = Math.min(W * 0.96, H * 0.74);
    U = A / 100;
  }
  window.addEventListener("resize", resize);
  resize();

  const FT = '"Cinzel", Georgia, serif';
  const FB = '"Alegreya Sans", system-ui, sans-serif';

  // ─── Small maths ───────────────────────────────────────────────────────────────────────────

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeIn = (k) => k * k * k;
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const back = (k) => {
    const c1 = 1.9, c3 = c1 + 1;
    return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  };
  const pop = (t, at, dur = 0.22) => (t < at ? 0 : back(clamp((t - at) / dur)));
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = rng(7);
  const rand = (a = 0, b = 1) => a + R() * (b - a);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];

  /** 0 on the beat, rising to 1 just before the next. */
  const beatPhase = (t) => (t < BEAT0 ? 0.999 : (((t - BEAT0) / BEAT) % 1 + 1) % 1);
  const beatIndex = (t) => Math.floor((t - BEAT0) / BEAT);
  /** A kick on every beat: 1 at the hit, dying away. */
  const pulse = (t) => (t < BEAT0 ? 0 : Math.exp(-beatPhase(t) * 5));
  const bounce = (t) => Math.abs(Math.sin(Math.PI * ((t - BEAT0) / BEAT)));

  // ─── Palette ───────────────────────────────────────────────────────────────────────────────

  const C = {
    ink: "#0b1a2e", night: "#0f2440", cream: "#fff6e3", gold: "#ffc93c", amber: "#f39c12",
    red: "#c8102e", blue: "#1f4e8c", sky: "#5ec2f2", sea: "#1677c9", seaDeep: "#0b4f8f",
    stone: "#e8c890", stoneDark: "#c9a466", green: "#2f8f5b", terracotta: "#c8553d",
    pink: "#ff5c8a", purple: "#6a4bc4", lime: "#9be15d",
  };

  // ─── Assets ────────────────────────────────────────────────────────────────────────────────

  const ART = window.HARSI_ART || {};
  const IDS = Object.keys(ART);
  const STARTERS = ["calfleaf", "pharawoof", "duckling"].filter((id) => ART[id]);
  const WATERY = ["luzzitt", "duckling", "kalanka", "ondallus", "platyflow", "murexil", "silgina", "zavorra"].filter((id) => ART[id]);
  const ROCKY = ["qortong", "xrobbog", "ggantroll", "megalithos", "tessera", "kartrutt", "bulqajra", "santwarr"].filter((id) => ART[id]);
  const sprites = {};
  const silhouettes = {};

  function loadSprites() {
    return Promise.all(
      IDS.map(
        (id) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const c = document.createElement("canvas");
              c.width = c.height = 256;
              c.getContext("2d").drawImage(img, 0, 0, 256, 256);
              sprites[id] = c;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(ART[id].s);
          })
      )
    );
  }

  function silhouette(id, color) {
    const key = id + color;
    if (silhouettes[key]) return silhouettes[key];
    const src = sprites[id];
    if (!src) return null;
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, 256, 256);
    silhouettes[key] = c;
    return c;
  }

  /** Draws a Ħarsi centred on (x, y), `size` across. */
  function spr(id, x, y, size, o = {}) {
    const img = o.sil ? silhouette(id, o.sil) : sprites[id];
    if (!img || size <= 0) return;
    X.save();
    X.translate(x, y);
    if (o.rot) X.rotate(o.rot);
    X.scale(o.flip ? -1 : 1, 1);
    if (o.sy) X.scale(1 / o.sy, o.sy);
    if (o.alpha !== undefined) X.globalAlpha *= o.alpha;
    X.drawImage(img, -size / 2, -size / 2, size, size);
    X.restore();
  }

  /** A madum tile: the cement floor tiles of every Maltese house. */
  function makeTile(bg, a, b, edge) {
    const c = document.createElement("canvas");
    const n = 128;
    c.width = c.height = n;
    const g = c.getContext("2d");
    g.fillStyle = bg;
    g.fillRect(0, 0, n, n);
    g.fillStyle = edge;
    for (const [x, y] of [[0, 0], [n, 0], [0, n], [n, n]]) {
      g.beginPath();
      g.arc(x, y, n * 0.26, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = bg;
    for (const [x, y] of [[0, 0], [n, 0], [0, n], [n, n]]) {
      g.beginPath();
      g.arc(x, y, n * 0.16, 0, Math.PI * 2);
      g.fill();
    }
    g.translate(n / 2, n / 2);
    g.fillStyle = a;
    for (let k = 0; k < 2; k++) {
      g.save();
      g.rotate((k * Math.PI) / 4);
      g.fillRect(-n * 0.27, -n * 0.27, n * 0.54, n * 0.54);
      g.restore();
    }
    g.fillStyle = b;
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? n * 0.1 : n * 0.25;
      const ang = (i / 16) * Math.PI * 2;
      g.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    g.fill();
    g.fillStyle = bg;
    g.beginPath();
    g.arc(0, 0, n * 0.06, 0, Math.PI * 2);
    g.fill();
    return c;
  }
  const TILES = {
    blue: makeTile("#f3e7cf", "#1f4e8c", "#c8553d", "#7fa7d8"),
    red: makeTile("#f6e3c6", "#c8102e", "#ffc93c", "#e08a6a"),
    green: makeTile("#efe6cc", "#2f8f5b", "#1f4e8c", "#a3c98f"),
    night: makeTile("#13284a", "#ffc93c", "#c8102e", "#24477a"),
  };
  const tilePatterns = {};
  function tileFill(name, size, ox = 0, oy = 0) {
    if (!tilePatterns[name]) tilePatterns[name] = X.createPattern(TILES[name], "repeat");
    const p = tilePatterns[name];
    const k = size / 128;
    if (p.setTransform) p.setTransform(new DOMMatrix([k, 0, 0, k, ox, oy]));
    return p;
  }

  /** Comic-book halftone dots, as a tiling pattern. */
  const dotPatterns = {};
  function dots(color) {
    if (dotPatterns[color]) return dotPatterns[color];
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const g = c.getContext("2d");
    g.fillStyle = color;
    g.beginPath();
    g.arc(4, 4, 2.6, 0, Math.PI * 2);
    g.arc(12, 12, 2.6, 0, Math.PI * 2);
    g.fill();
    dotPatterns[color] = X.createPattern(c, "repeat");
    return dotPatterns[color];
  }

  /** A soft round glow in one colour, for 'lighter' blending. */
  const glows = {};
  function glow(color) {
    if (glows[color]) return glows[color];
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, color);
    grad.addColorStop(0.25, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    glows[color] = c;
    return c;
  }
  function glowAt(x, y, r, color, alpha = 1) {
    X.save();
    X.globalCompositeOperation = "lighter";
    X.globalAlpha = alpha;
    X.drawImage(glow(color), x - r, y - r, r * 2, r * 2);
    X.restore();
  }

  /** Film grain, drawn at a random offset each frame. */
  const grain = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 192;
    const g = c.getContext("2d");
    const img = g.createImageData(192, 192);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 26;
    }
    g.putImageData(img, 0, 0);
    return c;
  })();

  // ─── Drawing primitives ────────────────────────────────────────────────────────────────────

  function path(points, close = true) {
    X.beginPath();
    points.forEach(([x, y], i) => (i ? X.lineTo(x, y) : X.moveTo(x, y)));
    if (close) X.closePath();
  }
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    X.beginPath();
    X.moveTo(x + r, y);
    X.arcTo(x + w, y, x + w, y + h, r);
    X.arcTo(x + w, y + h, x, y + h, r);
    X.arcTo(x, y + h, x, y, r);
    X.arcTo(x, y, x + w, y, r);
    X.closePath();
  }
  function fill(c) {
    X.fillStyle = c;
    X.fill();
  }
  function stroke(c, w) {
    X.strokeStyle = c;
    X.lineWidth = w;
    X.lineJoin = "round";
    X.lineCap = "round";
    X.stroke();
  }
  function circle(x, y, r, f, s, w) {
    X.beginPath();
    X.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (f) fill(f);
    if (s) stroke(s, w);
  }
  function ell(x, y, rx, ry, f, s, w, rot = 0) {
    X.beginPath();
    X.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2);
    if (f) fill(f);
    if (s) stroke(s, w);
  }
  function grad(x0, y0, x1, y1, stops) {
    const g = X.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  }
  function bg(c1, c2) {
    X.fillStyle = c2 ? grad(0, 0, 0, H, [c1, c2]) : c1;
    X.fillRect(-W, -H, W * 3, H * 3);
  }

  /** Big display text with a chunky outline and drop shadow. */
  function txt(s, x, y, size, o = {}) {
    if (size <= 1) return;
    X.save();
    X.translate(x, y);
    if (o.rot) X.rotate(o.rot);
    if (o.sc !== undefined) X.scale(o.sc, o.sc);
    if (o.alpha !== undefined) X.globalAlpha *= clamp(o.alpha);
    X.font = `${o.w || 900} ${size}px ${o.f || FB}`;
    X.textAlign = o.al || "center";
    X.textBaseline = "middle";
    if (o.track) X.letterSpacing = `${o.track}px`;
    X.lineJoin = "round";
    if (o.shadow !== false) {
      X.fillStyle = o.shadow || "rgba(0,0,0,0.45)";
      X.fillText(s, size * 0.05, size * 0.09);
    }
    if (o.stroke) {
      X.lineWidth = o.sw || size * 0.16;
      X.strokeStyle = o.stroke;
      X.strokeText(s, 0, 0);
    }
    X.fillStyle = o.c || C.cream;
    X.fillText(s, 0, 0);
    X.restore();
  }
  function fitSize(s, maxW, size, o = {}) {
    X.font = `${o.w || 900} ${size}px ${o.f || FB}`;
    const w = X.measureText(s).width;
    return w > maxW ? (size * maxW) / w : size;
  }

  /** Sunburst rays turning about (x, y). */
  function rays(x, y, n, rot, c1, c2, r = Math.hypot(W, H)) {
    X.save();
    X.translate(x, y);
    X.rotate(rot);
    if (c2) {
      X.fillStyle = c2;
      X.fillRect(-r, -r, r * 2, r * 2);
    }
    X.fillStyle = c1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      X.beginPath();
      X.moveTo(0, 0);
      X.arc(0, 0, r, a, a + Math.PI / n);
      X.closePath();
      X.fill();
    }
    X.restore();
  }

  /** Manga speed lines rushing out from (x, y). */
  function speedLines(x, y, n, t, c, inner, alpha = 1) {
    X.save();
    X.globalAlpha = alpha;
    X.strokeStyle = c;
    const r = Math.hypot(W, H);
    const rr2 = rng(Math.floor(t * 20));
    for (let i = 0; i < n; i++) {
      const a = rr2() * Math.PI * 2;
      const r0 = inner + rr2() * r * 0.3;
      X.lineWidth = 1 + rr2() * 4;
      X.beginPath();
      X.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      X.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      X.stroke();
    }
    X.restore();
  }

  /** A diagonal slash of colour across the screen, for punchy cuts. */
  function slash(k, color, dir = 1) {
    if (k <= 0 || k >= 1) return;
    const w = Math.hypot(W, H);
    X.save();
    X.translate(W / 2, H / 2);
    X.rotate(dir * -0.5);
    const x = lerp(-w, w, easeInOut(k));
    X.fillStyle = color;
    X.fillRect(x - w * 0.35, -w, w * 0.7, w * 2);
    X.restore();
  }

  // ─── Particles, rings, flashes ─────────────────────────────────────────────────────────────

  let parts = [];
  let rings = [];
  let flash = { a: 0, c: "#fff" };
  let shake = 0;

  function emit(p) {
    if (parts.length < 900) parts.push(Object.assign({ age: 0, vx: 0, vy: 0, g: 0, drag: 0, rot: 0, vr: 0, size: 6, life: 1, c: "#fff", kind: "glow" }, p));
  }
  const CONFETTI = [C.red, C.cream, C.gold, "#ffffff", C.sky, C.pink, C.lime];
  function confetti(x, y, n, spread = 1, up = 1) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-1.1, 1.1) * spread;
      const v = rand(0.5, 1.4) * S * 1.1 * up;
      emit({ kind: "conf", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: S * 1.1, drag: 1.6, size: rand(0.012, 0.024) * S, life: rand(1.6, 2.8), c: pick(CONFETTI), rot: rand(0, 6), vr: rand(-12, 12) });
    }
  }
  function firework(x, y, color, n = 46) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.05, 0.05);
      const v = rand(0.25, 0.42) * S;
      emit({ kind: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: S * 0.22, drag: 1.4, size: S * 0.006, life: rand(0.9, 1.4), c: color });
    }
    emit({ kind: "glow", x, y, size: S * 0.22, life: 0.45, c: color });
  }
  function sparks(x, y, n, color, speed = 0.6) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(0.3, 1) * S * speed;
      emit({ kind: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2.5, size: S * 0.005, life: rand(0.3, 0.7), c: color });
    }
  }
  function ring(x, y, color, maxR, dur = 0.6, w = 0.02) {
    rings.push({ x, y, c: color, maxR, dur, w: w * S, age: 0 });
  }
  function doFlash(a, c = "#fff") {
    flash = { a: Math.max(flash.a, a), c };
  }

  function updateFx(dt) {
    for (const p of parts) {
      p.age += dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy = p.vy * d + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    parts = parts.filter((p) => p.age < p.life);
    for (const r of rings) r.age += dt;
    rings = rings.filter((r) => r.age < r.dur);
    flash.a = Math.max(0, flash.a - dt * 3.2);
    shake = Math.max(0, shake - dt * 2.5);
  }

  function drawFx() {
    for (const p of parts) {
      const k = p.age / p.life;
      const fade = 1 - k * k;
      if (p.kind === "conf") {
        X.save();
        X.translate(p.x, p.y);
        X.rotate(p.rot);
        X.scale(1, Math.cos(p.rot * 1.7));
        X.globalAlpha = fade;
        X.fillStyle = p.c;
        X.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        X.restore();
      } else if (p.kind === "spark") {
        X.save();
        X.globalCompositeOperation = "lighter";
        X.globalAlpha = fade;
        X.strokeStyle = p.c;
        X.lineWidth = p.size;
        X.lineCap = "round";
        X.beginPath();
        X.moveTo(p.x, p.y);
        X.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
        X.stroke();
        X.restore();
      } else if (p.kind === "glow") {
        glowAt(p.x, p.y, p.size * (0.6 + k * 0.6), p.c, fade);
      } else if (p.kind === "note") {
        txt(p.ch, p.x, p.y, p.size, { c: p.c, alpha: fade, rot: Math.sin(p.age * 6) * 0.3, shadow: false, stroke: C.ink, sw: p.size * 0.12 });
      } else if (p.kind === "shard") {
        X.save();
        X.translate(p.x, p.y);
        X.rotate(p.rot);
        X.globalAlpha = fade;
        path([[0, -p.size], [p.size * 0.6, p.size * 0.5], [-p.size * 0.5, p.size * 0.3]]);
        fill(p.c);
        stroke("rgba(255,255,255,0.9)", 1.5);
        X.restore();
      } else if (p.kind === "drop") {
        X.save();
        X.globalAlpha = fade * 0.8;
        X.strokeStyle = p.c;
        X.lineWidth = p.size;
        X.beginPath();
        X.moveTo(p.x, p.y);
        X.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        X.stroke();
        X.restore();
      } else if (p.kind === "smoke") {
        circle(p.x, p.y, p.size * (0.5 + k), `rgba(240,235,225,${0.5 * fade})`);
      }
    }
    for (const r of rings) {
      const k = r.age / r.dur;
      X.save();
      X.globalAlpha = 1 - k;
      circle(r.x, r.y, r.maxR * easeOut(k), null, r.c, r.w * (1 - k) + 1);
      X.restore();
    }
  }

  // ─── Events (bursts that happen at a moment) ───────────────────────────────────────────────

  const EVENTS = [];
  const at = (t, f) => EVENTS.push({ t, f });

  function hit(t) {
    at(t, () => {
      doFlash(0.95);
      shake = 1;
      ring(W / 2, H / 2, C.gold, Math.hypot(W, H) * 0.7, 0.7, 0.05);
      ring(W / 2, H / 2, "#fff", Math.hypot(W, H) * 0.5, 0.5, 0.03);
      confetti(0, H, 70, 0.5, 1.1);
      confetti(W, H, 70, 0.5, 1.1);
      confetti(W / 2, H * 0.5, 60, 2.2, 0.8);
      sparks(W / 2, H * 0.45, 60, C.gold, 1.1);
    });
  }
  HITS.forEach(hit);

  // ─── Lyrics ────────────────────────────────────────────────────────────────────────────────

  function drawLyrics(t) {
    let i = -1;
    for (let k = 0; k < LINES.length; k++) if (t >= LINES[k][0] - 0.05 && t < LINES[k][1] + 0.15) i = k;
    if (i < 0) return;
    const [start, end] = LINES[i];
    const words = WORDS[i];
    const out = clamp((t - end) / 0.15);
    const size = Math.round(clamp(Math.min(W * (PORTRAIT ? 0.068 : 0.04), H * 0.058), 17, 46));
    const maxW = W * (PORTRAIT ? 0.92 : 0.8);
    X.font = `900 ${size}px ${FB}`;
    const space = size * 0.28;
    // Lay the words out in rows.
    const rows = [[]];
    let rowW = 0;
    for (const item of words) {
      const w = X.measureText(item.w).width;
      if (rowW + w > maxW && rows[rows.length - 1].length) {
        rows.push([]);
        rowW = 0;
      }
      rows[rows.length - 1].push({ ...item, width: w });
      rowW += w + space;
    }
    const lineH = size * 1.12;
    const baseY = H - Math.max(H * 0.06, 26) - (rows.length - 1) * lineH - size * 0.5;
    // A dark band behind, so the words read over anything.
    const bandTop = baseY - size * 1.1;
    X.save();
    X.globalAlpha = (1 - out) * 0.85 * clamp((t - start + 0.05) / 0.12);
    X.fillStyle = grad(0, bandTop, 0, H, ["rgba(8,16,30,0)", "rgba(8,16,30,0.78)", "rgba(8,16,30,0.9)"]);
    X.fillRect(0, bandTop, W, H - bandTop);
    X.restore();
    // The word being sung now.
    let current = -1;
    words.forEach((w, k) => {
      if (t >= w.t) current = k;
    });
    let idx = 0;
    rows.forEach((row, r) => {
      const total = row.reduce((s, w) => s + w.width, 0) + space * (row.length - 1);
      let x = W / 2 - total / 2;
      const y = baseY + r * lineH;
      for (const w of row) {
        const k = idx++;
        if (t >= w.t - 0.02) {
          const p = pop(t, w.t - 0.02, 0.2);
          const now = k === current;
          const isHarsi = /ħarsi/i.test(w.w);
          const c = isHarsi ? C.gold : now ? "#ffe680" : C.cream;
          X.save();
          X.globalAlpha = 1 - out;
          X.translate(x + w.width / 2, y - (now ? size * 0.08 * Math.sin(prog(t, w.t, w.t + 0.15) * Math.PI) : 0));
          X.scale(p, p);
          X.font = `900 ${size}px ${FB}`;
          X.textAlign = "center";
          X.textBaseline = "middle";
          X.lineJoin = "round";
          X.lineWidth = size * 0.2;
          X.strokeStyle = isHarsi ? C.red : C.ink;
          X.strokeText(w.w, 0, 0);
          X.fillStyle = c;
          X.fillText(w.w, 0, 0);
          X.restore();
        }
        x += w.width + space;
      }
    });
  }

  // ─── Scene pieces ──────────────────────────────────────────────────────────────────────────

  /** Rolling hills of the islands seen from the sea, sun behind. */
  function islandsSilhouette(y, color, t, scale = 1) {
    X.fillStyle = color;
    X.beginPath();
    X.moveTo(-W, y);
    const pts = [
      [-0.62, 0], [-0.55, -0.05], [-0.42, -0.08], [-0.33, -0.06], [-0.3, -0.03], [-0.25, 0],
      [-0.2, 0], [-0.17, -0.02], [-0.14, 0],
      [-0.06, 0], [0.0, -0.06], [0.12, -0.1], [0.22, -0.12], [0.3, -0.1], [0.42, -0.07], [0.55, -0.05], [0.66, 0],
    ];
    for (const [px, py] of pts) X.lineTo(W / 2 + px * A * 1.4 * scale, y + py * A * scale);
    X.lineTo(W * 2, y);
    X.lineTo(W * 2, H * 2);
    X.lineTo(-W, H * 2);
    X.closePath();
    X.fill();
    // Mdina's skyline on the high ground: a dome and a bell tower.
    const mx = W / 2 + 0.22 * A * 1.4 * scale;
    const my = y - 0.12 * A * scale;
    circle(mx, my - A * 0.02 * scale, A * 0.025 * scale, color);
    X.fillRect(mx + A * 0.03 * scale, my - A * 0.06 * scale, A * 0.014 * scale, A * 0.06 * scale);
  }

  function sea(y, t, c1 = C.sea, c2 = C.seaDeep, sparkle = true) {
    X.fillStyle = grad(0, y, 0, H, [c1, c2]);
    X.fillRect(-W, y, W * 3, H * 2);
    if (!sparkle) return;
    X.save();
    X.globalCompositeOperation = "lighter";
    for (let i = 0; i < 40; i++) {
      const r = rng(i * 13);
      const yy = y + Math.pow(r(), 1.6) * (H - y);
      const x = ((r() * W * 1.4 + t * (20 + r() * 40)) % (W * 1.4)) - W * 0.2;
      const len = (0.01 + r() * 0.04) * W * (0.4 + (yy - y) / (H - y));
      X.globalAlpha = 0.25 + 0.4 * Math.abs(Math.sin(t * 2 + i));
      X.fillStyle = "#cfefff";
      X.fillRect(x, yy, len, 2);
    }
    X.restore();
  }

  function waves(y, t, color, amp, len, speed) {
    X.fillStyle = color;
    X.beginPath();
    X.moveTo(-10, H + 10);
    for (let x = -10; x <= W + 10; x += 8) X.lineTo(x, y + Math.sin(x / len + t * speed) * amp + Math.sin(x / (len * 0.43) - t * speed * 1.3) * amp * 0.4);
    X.lineTo(W + 10, H + 10);
    X.closePath();
    X.fill();
  }

  function sun(x, y, r, t, face = false) {
    glowAt(x, y, r * 3.2, "rgba(255,200,80,0.9)", 0.8);
    X.save();
    X.translate(x, y);
    X.rotate(t * 0.6);
    X.fillStyle = C.gold;
    for (let i = 0; i < 12; i++) {
      X.rotate(Math.PI / 6);
      path([[r * 1.12, -r * 0.14], [r * 1.5, 0], [r * 1.12, r * 0.14]]);
      X.fill();
    }
    X.restore();
    circle(x, y, r, "#ffd54a", "#e89a1a", r * 0.06);
    if (face) {
      // Sunglasses and a sweaty grin: it is HOT.
      rr(x - r * 0.62, y - r * 0.28, r * 0.55, r * 0.32, r * 0.12);
      fill(C.ink);
      rr(x + r * 0.07, y - r * 0.28, r * 0.55, r * 0.32, r * 0.12);
      fill(C.ink);
      X.fillRect(x - r * 0.1, y - r * 0.2, r * 0.2, r * 0.06);
      X.beginPath();
      X.arc(x, y + r * 0.2, r * 0.35, 0.15 * Math.PI, 0.85 * Math.PI);
      stroke(C.ink, r * 0.08);
      ell(x + r * 0.75, y + r * 0.05 + ((t * 0.6) % 0.4) * r, r * 0.08, r * 0.13, "#7fd3ff");
    }
  }

  /** The old Maltese bus: canary yellow with an orange band, chrome grille. */
  function bus(x, y, L, t) {
    const h = L * 0.42;
    rr(x - L / 2, y - h, L, h * 0.86, L * 0.06);
    fill("#f7c81e");
    stroke(C.ink, L * 0.012);
    X.fillStyle = "#f07a1a";
    X.fillRect(x - L / 2 + L * 0.01, y - h * 0.42, L * 0.98, h * 0.12);
    X.fillStyle = "#ffffff";
    rr(x - L / 2, y - h, L, h * 0.13, L * 0.05);
    fill("#fff8e0");
    for (let i = 0; i < 5; i++) {
      rr(x - L * 0.44 + i * L * 0.165, y - h * 0.8, L * 0.13, h * 0.3, L * 0.015);
      fill("#a9dcf5");
      stroke(C.ink, L * 0.008);
    }
    // Driver's window and the destination board.
    rr(x + L * 0.38, y - h * 0.8, L * 0.1, h * 0.36, L * 0.015);
    fill("#a9dcf5");
    stroke(C.ink, L * 0.008);
    rr(x - L * 0.2, y - h * 1.0, L * 0.4, h * 0.13, L * 0.01);
    fill(C.ink);
    txt("VALLETTA", x, y - h * 0.935, h * 0.1, { c: "#ffb000", shadow: false, w: 800 });
    // Chrome grille and lamps.
    rr(x + L * 0.49, y - h * 0.38, L * 0.035, h * 0.3, L * 0.01);
    fill("#d9dde2");
    circle(x + L * 0.5, y - h * 0.48, L * 0.02, "#fff6b0");
    for (const wx of [x - L * 0.3, x + L * 0.3]) {
      circle(wx, y - h * 0.12, L * 0.075, "#1c1c22");
      circle(wx, y - h * 0.12, L * 0.035, "#c9ced6");
      X.save();
      X.translate(wx, y - h * 0.12);
      X.rotate(t * 18);
      X.fillStyle = "#1c1c22";
      X.fillRect(-L * 0.035, -L * 0.006, L * 0.07, L * 0.012);
      X.restore();
    }
  }

  function bread(x, y, r, t) {
    ell(x, y, r, r * 0.7, "#c9843a", C.ink, r * 0.05);
    ell(x - r * 0.1, y - r * 0.15, r * 0.75, r * 0.4, "#e3a457");
    for (let i = -1; i <= 1; i++) {
      X.beginPath();
      X.moveTo(x + i * r * 0.35 - r * 0.15, y - r * 0.35);
      X.lineTo(x + i * r * 0.35 + r * 0.15, y + r * 0.05);
      stroke("#f6d49a", r * 0.07);
    }
    steam(x, y - r * 0.8, r, t);
  }
  function steam(x, y, r, t) {
    for (let i = -1; i <= 1; i++) {
      X.beginPath();
      for (let k = 0; k <= 10; k++) {
        const yy = y - k * r * 0.07;
        const xx = x + i * r * 0.35 + Math.sin(k * 0.8 + t * 6 + i) * r * 0.08;
        k ? X.lineTo(xx, yy) : X.moveTo(xx, yy);
      }
      X.globalAlpha = 0.8;
      stroke("rgba(255,255,255,0.9)", r * 0.06);
      X.globalAlpha = 1;
    }
  }
  function coffee(x, y, r, t) {
    path([[x - r * 0.6, y - r * 0.5], [x + r * 0.6, y - r * 0.5], [x + r * 0.45, y + r * 0.6], [x - r * 0.45, y + r * 0.6]]);
    fill("#ffffff");
    stroke(C.ink, r * 0.06);
    ell(x, y - r * 0.5, r * 0.6, r * 0.16, "#5a3418", C.ink, r * 0.05);
    X.beginPath();
    X.arc(x + r * 0.62, y, r * 0.22, -Math.PI / 2, Math.PI / 2);
    stroke(C.ink, r * 0.1);
    // A grumpy little face: the coffee's NOT.
    circle(x - r * 0.18, y + r * 0.02, r * 0.05, C.ink);
    circle(x + r * 0.18, y + r * 0.02, r * 0.05, C.ink);
    X.beginPath();
    X.arc(x, y + r * 0.35, r * 0.18, 1.15 * Math.PI, 1.85 * Math.PI);
    stroke(C.ink, r * 0.05);
  }

  function limestoneWall(x, y, w, h, t, seed = 3, shakeAmt = 0) {
    const r = rng(seed);
    X.save();
    X.beginPath();
    X.rect(x, y, w, h);
    X.clip();
    X.fillStyle = "#5c4a30";
    X.fillRect(x, y, w, h);
    const sh = h / 6;
    for (let row = 0; row < 7; row++) {
      let cx = x - r() * sh;
      while (cx < x + w) {
        const sw = sh * (0.9 + r() * 1.1);
        const jx = shakeAmt * (r() - 0.5) * sh * 0.2 * Math.sin(t * 40 + row);
        const pts = [
          [cx + r() * 4 + jx, y + row * sh + r() * 5],
          [cx + sw - r() * 4 + jx, y + row * sh + r() * 5],
          [cx + sw - r() * 6 + jx, y + (row + 1) * sh - r() * 6],
          [cx + r() * 6 + jx, y + (row + 1) * sh - r() * 6],
        ];
        path(pts);
        const tone = 200 + Math.floor(r() * 40);
        fill(`rgb(${tone + 20},${tone - 10},${tone - 70})`);
        stroke("rgba(60,40,20,0.5)", 2);
        cx += sw + sh * 0.05;
      }
    }
    X.restore();
  }

  function eyes(x, y, r, t, blinkEvery = 1.4, color = "#ffe45c") {
    const blink = (t % blinkEvery) < 0.12 ? 0.1 : 1;
    for (const dx of [-r * 1.3, r * 1.3]) {
      glowAt(x + dx, y, r * 3, "rgba(255,230,90,0.8)", 0.6);
      ell(x + dx, y, r, r * blink, color);
      if (blink > 0.5) circle(x + dx + r * 0.2, y, r * 0.45, C.ink);
    }
  }

  function bigEye(x, y, r, t, sparkle) {
    ell(x, y, r * 1.4, r, "#ffffff", C.ink, r * 0.06);
    X.save();
    X.beginPath();
    X.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2);
    X.clip();
    const g = X.createRadialGradient(x, y, 0, x, y, r * 0.8);
    g.addColorStop(0, "#9ff5d8");
    g.addColorStop(0.6, "#1fa68a");
    g.addColorStop(1, "#0c4f5a");
    circle(x, y, r * 0.8, g);
    circle(x, y, r * 0.38, "#071a22");
    X.restore();
    circle(x - r * 0.3, y - r * 0.3, r * 0.2, "#fff");
    if (sparkle > 0) star(x + r * 0.25, y - r * 0.22, r * 0.9 * sparkle, t * 2, "#ffffff");
  }

  /** A four-pointed twinkle. */
  function star(x, y, r, rot, c) {
    glowAt(x, y, r * 1.6, "rgba(255,255,220,0.9)", 0.9);
    X.save();
    X.translate(x, y);
    X.rotate(rot);
    X.beginPath();
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 ? r * 0.16 : r;
      const a = (i / 8) * Math.PI * 2;
      X.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    X.closePath();
    fill(c);
    X.restore();
  }

  /** The nassa: the woven cane fish trap, belly round and mouth open. */
  function nassa(x, y, s, rot = 0) {
    X.save();
    X.translate(x, y);
    X.rotate(rot);
    path([[-s * 0.55, -s * 0.15], [-s * 0.2, -s * 0.5], [s * 0.35, -s * 0.42], [s * 0.6, 0], [s * 0.35, s * 0.42], [-s * 0.2, s * 0.5], [-s * 0.55, s * 0.15]]);
    fill("#d4a24c");
    stroke("#6b4a1a", s * 0.04);
    X.save();
    X.clip();
    for (let i = -6; i <= 6; i++) {
      X.beginPath();
      X.moveTo(i * s * 0.1, -s);
      X.lineTo(i * s * 0.1 + s * 0.3, s);
      stroke("rgba(107,74,26,0.55)", s * 0.025);
      X.beginPath();
      X.moveTo(i * s * 0.1, -s);
      X.lineTo(i * s * 0.1 - s * 0.3, s);
      stroke("rgba(255,230,170,0.5)", s * 0.02);
    }
    X.restore();
    for (const k of [-0.25, 0.1, 0.4]) {
      X.beginPath();
      X.ellipse(k * s, 0, s * 0.06, s * 0.42 * (1 - Math.abs(k) * 0.6), 0, 0, Math.PI * 2);
      stroke("#8a5e22", s * 0.035);
    }
    ell(-s * 0.55, 0, s * 0.08, s * 0.16, "#5a3a12", "#3a2408", s * 0.03);
    X.restore();
  }

  function luzzu(x, y, L, t, hull = "#1f78c8", stripe = "#ffc93c") {
    const bob = Math.sin(t * 2.2 + x * 0.01) * L * 0.03;
    X.save();
    X.translate(x, y + bob);
    X.rotate(Math.sin(t * 1.7 + x) * 0.05);
    path([[-L * 0.5, -L * 0.16], [L * 0.42, -L * 0.2], [L * 0.56, -L * 0.42], [L * 0.5, 0], [L * 0.25, L * 0.16], [-L * 0.3, L * 0.16], [-L * 0.55, -L * 0.3]]);
    fill(hull);
    stroke(C.ink, L * 0.015);
    X.fillStyle = stripe;
    X.fillRect(-L * 0.45, -L * 0.12, L * 0.9, L * 0.05);
    X.fillStyle = C.red;
    X.fillRect(-L * 0.42, -L * 0.04, L * 0.8, L * 0.035);
    // The Eye of Osiris on the bow, watching for trouble.
    ell(L * 0.36, -L * 0.04, L * 0.07, L * 0.035, "#fff", C.ink, L * 0.01);
    circle(L * 0.37, -L * 0.04, L * 0.022, C.ink);
    X.restore();
  }

  function church(x, y, s, t, clockK = 1) {
    // Dome and bell towers behind a honey limestone facade.
    ell(x, y - s * 0.62, s * 0.22, s * 0.24, "#c8553d", C.ink, s * 0.01);
    X.fillStyle = C.stone;
    X.fillRect(x - s * 0.04, y - s * 0.95, s * 0.08, s * 0.12);
    for (const sx of [-1, 1]) {
      const tx = x + sx * s * 0.34;
      rr(tx - s * 0.1, y - s * 0.85, s * 0.2, s * 0.85, s * 0.01);
      fill(C.stone);
      stroke(C.ink, s * 0.01);
      path([[tx - s * 0.11, y - s * 0.85], [tx, y - s * 1.0], [tx + s * 0.11, y - s * 0.85]]);
      fill("#d6b27a");
      stroke(C.ink, s * 0.01);
      // The bell, swinging.
      rr(tx - s * 0.06, y - s * 0.78, s * 0.12, s * 0.14, s * 0.05);
      fill("#3a2a18");
      X.save();
      X.translate(tx, y - s * 0.77);
      X.rotate(Math.sin(t * 9 + sx) * 0.6);
      path([[-s * 0.04, 0], [s * 0.04, 0], [s * 0.055, s * 0.09], [-s * 0.055, s * 0.09]]);
      fill(C.gold);
      X.restore();
      // A clock on each tower: one tells the time, the other is painted to fool the devil.
      const cy2 = y - s * 0.5;
      circle(tx, cy2, s * 0.065, "#fff", C.ink, s * 0.008);
      const hm = sx < 0 ? clockK : 0.2;
      const minute = lerp(-Math.PI / 2 + Math.PI * 8, Math.PI / 2, hm);
      const hour = lerp(-Math.PI / 2 + Math.PI * 2, (8.5 / 12) * Math.PI * 2 - Math.PI / 2, hm);
      X.beginPath();
      X.moveTo(tx, cy2);
      X.lineTo(tx + Math.cos(minute) * s * 0.05, cy2 + Math.sin(minute) * s * 0.05);
      X.moveTo(tx, cy2);
      X.lineTo(tx + Math.cos(hour) * s * 0.035, cy2 + Math.sin(hour) * s * 0.035);
      stroke(C.ink, s * 0.01);
    }
    rr(x - s * 0.25, y - s * 0.62, s * 0.5, s * 0.62, s * 0.01);
    fill("#f0d39c");
    stroke(C.ink, s * 0.01);
    path([[x - s * 0.27, y - s * 0.62], [x, y - s * 0.78], [x + s * 0.27, y - s * 0.62]]);
    fill("#e3c084");
    stroke(C.ink, s * 0.01);
    X.beginPath();
    X.moveTo(x - s * 0.08, y);
    X.lineTo(x - s * 0.08, y - s * 0.22);
    X.arc(x, y - s * 0.22, s * 0.08, Math.PI, 0);
    X.lineTo(x + s * 0.08, y);
    fill("#6b3e1e");
    stroke(C.ink, s * 0.01);
  }

  function person(x, y, s, t, o = {}) {
    // A simple running figure: head, body, swinging limbs.
    const run = o.run ? Math.sin(t * 16 + x) : 0;
    X.lineCap = "round";
    X.strokeStyle = o.c || C.ink;
    X.lineWidth = s * 0.12;
    X.beginPath();
    X.moveTo(x, y - s * 0.5);
    X.lineTo(x, y - s * 0.05);
    X.moveTo(x, y - s * 0.05);
    X.lineTo(x + run * s * 0.25, y + s * 0.4);
    X.moveTo(x, y - s * 0.05);
    X.lineTo(x - run * s * 0.25, y + s * 0.4);
    X.moveTo(x, y - s * 0.4);
    X.lineTo(x - run * s * 0.3, y - s * 0.1);
    X.moveTo(x, y - s * 0.4);
    X.lineTo(x + run * s * 0.3, y - s * 0.1);
    X.stroke();
    circle(x, y - s * 0.68, s * 0.17, o.head || o.c || C.ink);
  }

  /** A comic panel that pops in at `t0`, with halftone behind its contents. */
  function panel(t, t0, x, y, w, h, color, draw) {
    if (t < t0) return;
    const k = pop(t, t0, 0.25);
    X.save();
    X.translate(x + w / 2, y + h / 2);
    X.rotate((1 - Math.min(1, k)) * 0.3);
    X.scale(k, k);
    rr(-w / 2, -h / 2, w, h, S * 0.015);
    fill(color);
    X.save();
    X.clip();
    X.fillStyle = dots("rgba(0,0,0,0.12)");
    X.fillRect(-w / 2, -h / 2, w, h);
    draw(w, h, t - t0);
    X.restore();
    rr(-w / 2, -h / 2, w, h, S * 0.015);
    stroke(C.ink, S * 0.008);
    X.restore();
  }

  /** A ink stamp word, slammed in at an angle. */
  function stamp(word, x, y, size, t, t0, color = C.red, rot = -0.18) {
    if (t < t0) return;
    const k = clamp((t - t0) / 0.14);
    const sc = lerp(2.4, 1, easeOut(k));
    txt(word, x, y, size, { c: color, stroke: "#fff", sw: size * 0.14, rot, sc, alpha: k * 1.5 });
  }

  /** Map of the islands (unit square coordinates). */
  const MALTA = [[0.3, 0.38], [0.38, 0.33], [0.47, 0.36], [0.55, 0.4], [0.63, 0.45], [0.69, 0.5], [0.74, 0.57], [0.78, 0.66], [0.73, 0.73], [0.64, 0.76], [0.55, 0.73], [0.47, 0.69], [0.4, 0.63], [0.34, 0.56], [0.29, 0.47]];
  const GOZO = [[0.04, 0.2], [0.11, 0.14], [0.2, 0.14], [0.26, 0.19], [0.25, 0.26], [0.17, 0.3], [0.08, 0.28]];
  const COMINO = [[0.27, 0.28], [0.3, 0.27], [0.31, 0.3], [0.28, 0.31]];
  const PLACES = [
    ["Victoria", 0.15, 0.21], ["Mdina", 0.44, 0.52], ["Valletta", 0.66, 0.47], ["Dingli", 0.39, 0.61], ["Ħaġar Qim", 0.5, 0.71], ["Marsaxlokk", 0.71, 0.69],
  ];
  function island(points, ox, oy, s, f, st) {
    path(points.map(([x, y]) => [ox + x * s, oy + y * s]));
    fill(f);
    stroke(st, Math.max(2, s * 0.006));
  }

  function medal(x, y, r, c = C.gold) {
    path([[x - r * 0.5, y - r * 2.1], [x - r * 0.1, y - r * 2.1], [x + r * 0.2, y - r * 0.6], [x - r * 0.3, y - r * 0.6]]);
    fill(C.red);
    path([[x + r * 0.5, y - r * 2.1], [x + r * 0.1, y - r * 2.1], [x - r * 0.2, y - r * 0.6], [x + r * 0.3, y - r * 0.6]]);
    fill("#ffffff");
    circle(x, y, r, c, "#8a5a00", r * 0.12);
    maltaCross(x, y, r * 0.55, "#fff7d6");
  }

  /** The eight-pointed cross of the Knights. */
  function maltaCross(x, y, r, c) {
    X.save();
    X.translate(x, y);
    X.fillStyle = c;
    for (let i = 0; i < 4; i++) {
      X.rotate(Math.PI / 2);
      path([[0, -r * 0.08], [-r * 0.5, -r], [0, -r * 0.7], [r * 0.5, -r]]);
      X.fill();
    }
    X.restore();
  }

  function pastizz(x, y, s, rot = 0) {
    X.save();
    X.translate(x, y);
    X.rotate(rot);
    path([[-s, 0], [-s * 0.2, -s * 0.48], [s, 0], [-s * 0.2, s * 0.48]]);
    fill(grad(0, -s * 0.5, 0, s * 0.5, ["#ffe2a0", "#eaa640", "#b8701e"]));
    stroke("#8a5a1c", s * 0.05);
    for (let i = 1; i <= 4; i++) {
      X.beginPath();
      X.ellipse(-s * 0.15, 0, s * 0.17 * i, s * 0.09 * i, 0, -1.2, 1.2);
      stroke("rgba(160,100,30,0.6)", s * 0.03);
    }
    ell(-s * 0.3, -s * 0.15, s * 0.3, s * 0.08, "rgba(255,240,200,0.6)");
    X.restore();
  }

  function kinnie(x, y, s, rot = 0) {
    X.save();
    X.translate(x, y);
    X.rotate(rot);
    path([[-s * 0.22, s], [-s * 0.22, -s * 0.2], [-s * 0.08, -s * 0.5], [-s * 0.08, -s * 0.85], [s * 0.08, -s * 0.85], [s * 0.08, -s * 0.5], [s * 0.22, -s * 0.2], [s * 0.22, s]]);
    fill("#5a2a0a");
    stroke(C.ink, s * 0.04);
    rr(-s * 0.24, -s * 0.05, s * 0.48, s * 0.5, s * 0.04);
    fill("#ff8a1a");
    stroke(C.ink, s * 0.03);
    circle(0, s * 0.2, s * 0.12, "#fff1c8");
    X.fillStyle = "#c8102e";
    X.fillRect(-s * 0.1, -s * 0.94, s * 0.2, s * 0.1);
    X.restore();
  }

  function ftira(x, y, s) {
    circle(x, y, s, "#d79a4a", C.ink, s * 0.05);
    circle(x, y, s * 0.35, "#f7e2b8", C.ink, s * 0.04);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      circle(x + Math.cos(a) * s * 0.65, y + Math.sin(a) * s * 0.65, s * 0.08, i % 2 ? "#c8102e" : "#2f8f5b");
    }
  }

  function cage(x, y, s, t) {
    X.beginPath();
    X.ellipse(x, y - s * 0.2, s * 0.6, s * 0.7, 0, Math.PI, 0);
    X.lineTo(x + s * 0.6, y + s * 0.5);
    X.lineTo(x - s * 0.6, y + s * 0.5);
    X.closePath();
    X.fillStyle = "rgba(255,240,200,0.12)";
    X.fill();
    for (let i = -4; i <= 4; i++) {
      const bx = x + (i / 4) * s * 0.6;
      X.beginPath();
      const top = y - s * 0.2 - Math.sqrt(Math.max(0, 1 - Math.pow(i / 4, 2))) * s * 0.7;
      X.moveTo(bx, top);
      X.lineTo(bx, y + s * 0.5);
      stroke("#c99a3c", s * 0.02);
    }
    X.beginPath();
    X.ellipse(x, y - s * 0.2, s * 0.6, s * 0.7, 0, Math.PI, 0);
    stroke("#c99a3c", s * 0.03);
    rr(x - s * 0.66, y + s * 0.45, s * 1.32, s * 0.12, s * 0.03);
    fill("#7a5520");
    circle(x, y - s * 0.95, s * 0.06, null, "#c99a3c", s * 0.025);
  }

  /** The rival: spiky hair and a grin you want to wipe off. */
  function rival(x, y, s, t) {
    X.save();
    X.translate(x, y);
    path([[-s * 0.6, s], [-s * 0.55, s * 0.45], [0, s * 0.3], [s * 0.55, s * 0.45], [s * 0.6, s]]);
    fill("#2a2a3a");
    rr(-s * 0.12, s * 0.05, s * 0.24, s * 0.3, s * 0.08);
    fill("#e8b98a");
    ell(0, -s * 0.15, s * 0.36, s * 0.4, "#f0c497", C.ink, s * 0.03);
    // Spikes.
    X.beginPath();
    X.moveTo(-s * 0.4, -s * 0.2);
    for (let i = 0; i <= 6; i++) X.lineTo(-s * 0.4 + i * s * 0.135, -s * (i % 2 ? 0.95 : 0.5));
    X.lineTo(s * 0.4, -s * 0.2);
    X.quadraticCurveTo(0, -s * 0.5, -s * 0.4, -s * 0.2);
    fill(C.red);
    stroke(C.ink, s * 0.03);
    // Eyes narrowed, eyebrow up, a wide grin.
    X.beginPath();
    X.moveTo(-s * 0.22, -s * 0.16);
    X.lineTo(-s * 0.06, -s * 0.12);
    X.moveTo(s * 0.06, -s * 0.12);
    X.lineTo(s * 0.22, -s * 0.2);
    stroke(C.ink, s * 0.04);
    X.beginPath();
    X.moveTo(-s * 0.18, s * 0.02);
    X.quadraticCurveTo(0, s * 0.2, s * 0.2, -s * 0.02);
    X.closePath();
    fill("#fff");
    stroke(C.ink, s * 0.03);
    X.restore();
  }

  function trilithon(x, y, s) {
    X.fillStyle = "#d8b47a";
    rr(x - s * 0.5, y - s * 0.9, s * 0.28, s * 0.9, s * 0.04);
    fill("#d8b47a");
    stroke(C.ink, s * 0.015);
    rr(x + s * 0.22, y - s * 0.9, s * 0.28, s * 0.9, s * 0.04);
    fill("#d8b47a");
    stroke(C.ink, s * 0.015);
    rr(x - s * 0.62, y - s * 1.12, s * 1.24, s * 0.24, s * 0.04);
    fill("#e3c189");
    stroke(C.ink, s * 0.015);
    const r = rng(9);
    for (let i = 0; i < 40; i++) circle(x + (r() - 0.5) * s * 1.1, y - r() * s * 1.1, s * 0.012, "rgba(120,80,30,0.45)");
  }

  function ship(x, y, s, t, sail = "#e8d9b0", eye = true) {
    X.save();
    X.translate(x, y);
    X.rotate(Math.sin(t * 2) * 0.05);
    path([[-s * 0.6, 0], [s * 0.6, 0], [s * 0.45, s * 0.22], [-s * 0.48, s * 0.22]]);
    fill("#7a4a22");
    stroke(C.ink, s * 0.02);
    X.fillStyle = C.ink;
    X.fillRect(-s * 0.015, -s * 0.8, s * 0.03, s * 0.8);
    path([[-s * 0.35, -s * 0.72], [s * 0.35, -s * 0.72], [s * 0.3, -s * 0.12], [-s * 0.3, -s * 0.12]]);
    fill(sail);
    stroke(C.ink, s * 0.015);
    X.fillStyle = "rgba(200,16,46,0.75)";
    X.fillRect(-s * 0.33, -s * 0.5, s * 0.64, s * 0.08);
    if (eye) {
      ell(s * 0.4, s * 0.09, s * 0.06, s * 0.035, "#fff", C.ink, s * 0.01);
      circle(s * 0.41, s * 0.09, s * 0.02, C.ink);
    }
    X.restore();
  }

  function cannon(x, y, s, flip = 1, fired = 0) {
    X.save();
    X.translate(x, y);
    X.scale(flip, 1);
    X.rotate(-0.25 - fired * 0.1);
    rr(-s * 0.1, -s * 0.12, s * 0.8, s * 0.24, s * 0.1);
    fill("#2c2c34");
    stroke("#000", s * 0.02);
    X.restore();
    circle(x, y + s * 0.08, s * 0.16, "#6b4a22", C.ink, s * 0.03);
  }

  function ferry(x, y, s, t) {
    X.save();
    X.translate(x, y + Math.sin(t * 2) * s * 0.02);
    path([[-s * 0.7, -s * 0.05], [s * 0.6, -s * 0.05], [s * 0.72, -s * 0.2], [s * 0.6, s * 0.18], [-s * 0.65, s * 0.18]]);
    fill("#ffffff");
    stroke(C.ink, s * 0.02);
    X.fillStyle = C.blue;
    X.fillRect(-s * 0.68, s * 0.05, s * 1.3, s * 0.06);
    rr(-s * 0.45, -s * 0.3, s * 0.8, s * 0.26, s * 0.03);
    fill("#f2f6fa");
    stroke(C.ink, s * 0.015);
    for (let i = 0; i < 6; i++) {
      rr(-s * 0.4 + i * s * 0.12, -s * 0.24, s * 0.08, s * 0.08, s * 0.02);
      fill("#2b6fb2");
    }
    rr(s * 0.05, -s * 0.48, s * 0.12, s * 0.2, s * 0.02);
    fill(C.red);
    X.restore();
  }

  function flag(x, y, w, h, t, shine) {
    X.save();
    X.translate(x, y);
    for (let i = 0; i < 24; i++) {
      const k = i / 24;
      const dy = Math.sin(k * 6 + t * 5) * h * 0.04 * k;
      X.fillStyle = k < 0.5 ? "#ffffff" : C.red;
      X.fillRect(-w / 2 + k * w, -h / 2 + dy, w / 24 + 1, h);
    }
    // The George Cross, in the corner of the white half.
    const gx = -w / 2 + w * 0.12;
    const gy = -h / 2 + h * 0.2;
    X.fillStyle = "#a7a9ac";
    X.fillRect(gx - w * 0.06, gy - h * 0.025, w * 0.12, h * 0.05);
    X.fillRect(gx - w * 0.015, gy - h * 0.1, w * 0.03, h * 0.2);
    X.strokeStyle = C.red;
    X.lineWidth = 2;
    X.strokeRect(gx - w * 0.07, gy - h * 0.13, w * 0.14, h * 0.26);
    if (shine > 0 && shine < 1) {
      X.save();
      X.globalCompositeOperation = "lighter";
      const sx = lerp(-w, w, shine);
      X.fillStyle = grad(sx - w * 0.2, 0, sx + w * 0.2, 0, ["rgba(255,255,255,0)", "rgba(255,255,255,0.8)", "rgba(255,255,255,0)"]);
      X.fillRect(-w / 2, -h / 2, w, h);
      X.restore();
    }
    X.strokeStyle = C.ink;
    X.lineWidth = 3;
    X.strokeRect(-w / 2, -h / 2, w, h);
    X.restore();
  }

  function elephant(x, y, s, t) {
    const step = Math.sin(t * 6) * s * 0.05;
    X.fillStyle = "#7a8a99";
    ell(x, y - s * 0.45, s * 0.5, s * 0.32, "#8796a6", C.ink, s * 0.02);
    for (const [lx, ph] of [[-0.3, 1], [-0.12, -1], [0.12, 1], [0.3, -1]]) {
      rr(x + lx * s - s * 0.06, y - s * 0.3, s * 0.12, s * 0.32 + ph * step, s * 0.04);
      fill("#7a8a99");
      stroke(C.ink, s * 0.015);
    }
    circle(x + s * 0.45, y - s * 0.6, s * 0.2, "#8796a6", C.ink, s * 0.02);
    X.beginPath();
    X.moveTo(x + s * 0.6, y - s * 0.55);
    X.quadraticCurveTo(x + s * 0.8, y - s * 0.3 + step, x + s * 0.7, y - s * 0.1);
    stroke("#8796a6", s * 0.08);
    circle(x + s * 0.5, y - s * 0.65, s * 0.025, C.ink);
    ell(x + s * 0.32, y - s * 0.6, s * 0.12, s * 0.16, "#9aa8b6", C.ink, s * 0.015);
  }

  function clock(x, y, r, t, spin) {
    circle(x, y, r, "#fff", C.ink, r * 0.1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      circle(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, r * 0.05, C.ink);
    }
    const m = t * spin;
    X.beginPath();
    X.moveTo(x, y);
    X.lineTo(x + Math.cos(m) * r * 0.7, y + Math.sin(m) * r * 0.7);
    X.moveTo(x, y);
    X.lineTo(x + Math.cos(m / 12) * r * 0.45, y + Math.sin(m / 12) * r * 0.45);
    stroke(C.red, r * 0.09);
  }

  // A row of Ħarsi bouncing on the beat — the dance floor.
  function crowd(t, ids, y, size, n, offset = 0) {
    for (let i = 0; i < n; i++) {
      const id = ids[(i + offset) % ids.length];
      const x = ((i + 0.5) / n) * W;
      const b = Math.abs(Math.sin(Math.PI * ((t - BEAT0) / BEAT + i * 0.5)));
      spr(id, x, y - b * size * 0.35, size, { flip: i % 2 === 1, rot: Math.sin(t * 4 + i) * 0.12, sy: 1 + (1 - b) * 0.08 });
    }
  }

  /** The build before every ĦARSI!: a tunnel of madum tiles rushing at you. */
  function buildUp(t, t0, t1, palette = "blue", heavy = false) {
    const k = prog(t, t0, t1);
    bg(C.ink);
    const z = Math.pow(k, 2);
    X.save();
    X.translate(W / 2, H / 2);
    for (let i = 10; i >= 1; i--) {
      const d = ((i - (t * (2 + k * 8)) % 1) / 10);
      const size = Math.hypot(W, H) * (0.12 / Math.max(0.03, d));
      X.save();
      X.rotate(d * 2 + t * (0.3 + k));
      X.globalAlpha = clamp(1 - d) * 0.9;
      X.strokeStyle = i % 2 ? C.gold : C.red;
      X.lineWidth = Math.max(2, size * 0.04);
      X.fillStyle = tileFill(palette, size * 0.25, 0, 0);
      X.fillRect(-size / 2, -size / 2, size, size);
      X.strokeRect(-size / 2, -size / 2, size, size);
      X.restore();
    }
    X.restore();
    X.fillStyle = `rgba(11,26,46,${0.35 + z * 0.4})`;
    X.fillRect(0, 0, W, H);
    speedLines(W / 2, H / 2, 40 + Math.floor(k * 80), t, "rgba(255,255,255,0.8)", S * (0.25 - k * 0.15), 0.4 + k * 0.6);
    // Ħarsi silhouettes flying past.
    for (let i = 0; i < 8; i++) {
      const r = rng(i * 31 + Math.floor(t0));
      const a = r() * Math.PI * 2;
      const d = ((t - t0) * (0.8 + r()) * (1 + k * 2) + r()) % 1;
      const dist = Math.pow(d, 2) * Math.hypot(W, H) * 0.7;
      spr(IDS[Math.floor(r() * IDS.length)], W / 2 + Math.cos(a) * dist, H / 2 + Math.sin(a) * dist, S * (0.05 + d * 0.3), { sil: "#ffffff", alpha: d * 0.7, rot: d * 3 });
    }
    const beat = pulse(t);
    const heart = S * (0.06 + k * 0.1) * (1 + beat * 0.25);
    glowAt(W / 2, H / 2, heart * 4, "rgba(255,201,60,0.9)", 0.5 + k * 0.5);
    star(W / 2, H / 2, heart, t * 3, "#fff");
    if (heavy) shake = Math.max(shake, k * 0.4);
  }

  // ─── Scenes ────────────────────────────────────────────────────────────────────────────────

  /** Each scene draws itself from `t`; `lt` is time since the scene began. */
  const SCENES = [];
  const scene = (t0, draw, o = {}) => SCENES.push({ t0, draw, cut: o.cut !== false, wipe: o.wipe });

  // 0 — Darkness. Something small and bright is out there.
  scene(0, (t) => {
    bg("#040a14");
    for (let i = 0; i < 90; i++) {
      const r = rng(i);
      const x = r() * W;
      const y = r() * H;
      X.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.5 + r()) + i));
      circle(x, y, 0.6 + r() * 1.4, "#cfe3ff");
    }
    X.globalAlpha = 1;
    const k = prog(t, 0, 4.6);
    const x = W / 2 + Math.sin(t * 1.3) * W * 0.25 * (1 - k);
    const y = H * 0.45 + Math.sin(t * 2.1) * H * 0.12 * (1 - k);
    glowAt(x, y, S * (0.1 + k * 0.2), "rgba(255,210,90,1)", 0.9);
    star(x, y, S * (0.03 + k * 0.05), t * 2, "#fff");
    eyes(W * 0.22, H * 0.7, S * 0.012, t + 0.3, 1.7);
    eyes(W * 0.8, H * 0.3, S * 0.01, t, 2.1);
    if (t > 2.6) eyes(W * 0.65, H * 0.78, S * 0.014, t + 0.9, 1.3);
    txt("A Maltese Tale", W / 2, H * 0.82, S * 0.045, { f: FT, w: 700, c: "rgba(255,246,227,0.85)", alpha: prog(t, 1.2, 2.6) * (1 - prog(t, 3.8, 4.5)), shadow: false, track: S * 0.01 });
  });

  // 4.6 — Sunrise over the islands. The band kicks in.
  scene(BEAT0 - 0.02, (t, lt) => {
    const k = prog(lt, 0, 6);
    bg(grad(0, 0, 0, H, [lerpColor("#1b2c5a", "#3fa9e6", k), lerpColor("#f06a4a", "#ffe2a8", k)]));
    sun(W / 2, H * 0.62 - easeOut(k) * H * 0.3, S * 0.09, t);
    islandsSilhouette(H * 0.66, lerpColor("#3a2240", "#c99a5e", k), t, 1.1);
    sea(H * 0.66, t, lerpColor("#2a3f7a", C.sea, k), C.seaDeep);
    // Gulls.
    for (let i = 0; i < 5; i++) {
      const gx = ((lt * 60 + i * 150) % (W + 200)) - 100;
      const gy = H * (0.2 + i * 0.05) + Math.sin(t * 3 + i) * 8;
      X.beginPath();
      X.moveTo(gx - 10, gy);
      X.quadraticCurveTo(gx - 5, gy - 6 - Math.sin(t * 10 + i) * 4, gx, gy);
      X.quadraticCurveTo(gx + 5, gy - 6 - Math.sin(t * 10 + i) * 4, gx + 10, gy);
      stroke("rgba(30,30,40,0.7)", 2);
    }
    // The title, one word per beat.
    const words = ["A", "MALTESE", "TALE"];
    const size = fitSize("MALTESE", W * 0.84, S * 0.17, { f: FT });
    words.forEach((w, i) => {
      const at = BEAT0 + BEAT * (6 + i * 2);
      if (t < at) return;
      const p = pop(t, at, 0.3);
      txt(w, W / 2, H * (0.2 + i * 0.13), size * (i === 1 ? 1 : 0.62), { f: FT, c: C.cream, stroke: C.red, sw: size * 0.06, sc: p, shadow: "rgba(0,0,0,0.35)" });
    });
  });

  // 11 — The title holds; the Ħarsi start zipping past. Count-in.
  scene(BEAT0 + BEAT * 15, (t, lt) => {
    bg(C.blue);
    rays(W / 2, H * 0.42, 18, t * 0.25, "rgba(255,255,255,0.08)");
    X.fillStyle = tileFill("blue", S * 0.12, t * 30, 0);
    X.globalAlpha = 0.18;
    X.fillRect(0, 0, W, H);
    X.globalAlpha = 1;
    const size = fitSize("MALTESE", W * 0.84, S * 0.17, { f: FT });
    const b = pulse(t);
    txt("A", W / 2, H * 0.2, size * 0.62, { f: FT, stroke: C.red, sw: size * 0.06, sc: 1 + b * 0.05 });
    txt("MALTESE", W / 2, H * 0.33, size, { f: FT, stroke: C.red, sw: size * 0.06, sc: 1 + b * 0.05 });
    txt("TALE", W / 2, H * 0.46, size * 0.62, { f: FT, stroke: C.red, sw: size * 0.06, sc: 1 + b * 0.05 });
    // A parade of silhouettes, a new one on every beat.
    const n = beatIndex(t) - beatIndex(BEAT0 + BEAT * 15);
    for (let i = 0; i <= n; i++) {
      const born = BEAT0 + BEAT * (15 + i);
      const age = t - born;
      if (age < 0 || age > 1.4) continue;
      const id = IDS[(i * 7) % IDS.length];
      const dir = i % 2 ? -1 : 1;
      const x = W / 2 - dir * (W * 0.7) + dir * age * W * 1.0;
      spr(id, x, H * 0.66 - Math.abs(Math.sin(age * 9)) * S * 0.05, S * 0.18, { flip: dir < 0 });
    }
    // One, two, waħda, tnejn!
    const count = ["ONE!", "TWO!", "WAĦDA!", "TNEJN!"];
    count.forEach((w, i) => {
      const at = 17.394 - BEAT * (4 - i) - 0.05;
      if (t < at || t > at + BEAT * 1.1) return;
      const p = pop(t, at, 0.15);
      rays(W / 2, H / 2, 16, t, i % 2 ? "rgba(200,16,46,0.9)" : "rgba(255,201,60,0.9)", C.ink);
      txt(w, W / 2, H / 2, fitSize(w, W * 0.86, S * 0.3), { c: C.cream, stroke: C.ink, sw: S * 0.03, sc: p, rot: (i % 2 ? 1 : -1) * 0.08 });
    });
  });

  // 17.4 — The bus is late, the sun is hot, the bread is fresh, the coffee's not.
  scene(17.394, (t) => {
    bg("#ffe9b8");
    X.fillStyle = dots("rgba(200,16,46,0.12)");
    X.fillRect(0, 0, W, H);
    const cols = PORTRAIT ? 2 : 4;
    const rows = PORTRAIT ? 2 : 1;
    const gap = S * 0.025;
    const areaW = PORTRAIT ? W * 0.94 : W * 0.94;
    const areaH = PORTRAIT ? H * 0.66 : H * 0.6;
    const pw = (areaW - gap * (cols - 1)) / cols;
    const ph = (areaH - gap * (rows - 1)) / rows;
    const ox = (W - areaW) / 2;
    const oy = PORTRAIT ? H * 0.06 : H * 0.1;
    const beats = [wordAt(0, "bus"), wordAt(0, "sun"), wordAt(0, "bread"), wordAt(0, "coffee")];
    const colors = ["#7fd0ff", "#ffcf5c", "#ffd9a0", "#e6d3ff"];
    const labels = ["LATE!", "HOT!", "FRESH!", "NOT!"];
    beats.forEach((b, i) => {
      const x = ox + (i % cols) * (pw + gap);
      const y = oy + Math.floor(i / cols) * (ph + gap);
      panel(t, b - 0.08, x, y, pw, ph, colors[i], (w, h, lt) => {
        const s = Math.min(w, h);
        if (i === 0) {
          // The bus finally turns up... and goes straight past.
          X.fillStyle = "#9a8a70";
          X.fillRect(-w / 2, h * 0.28, w, h * 0.3);
          bus(lerp(w * 0.8, -w * 0.1, easeOut(clamp(lt / 0.8))) - Math.max(0, lt - 0.8) * w * 0.4, h * 0.3, s * 1.0, t);
        } else if (i === 1) sun(0, 0, s * 0.24, t, true);
        else if (i === 2) bread(0, s * 0.05, s * 0.3, t);
        else {
          coffee(0, s * 0.02, s * 0.3, t);
          if (lt > 0.3) {
            X.beginPath();
            X.moveTo(-s * 0.3, -s * 0.3);
            X.lineTo(s * 0.3, s * 0.3);
            X.moveTo(s * 0.3, -s * 0.3);
            X.lineTo(-s * 0.3, s * 0.3);
            X.globalAlpha = clamp((lt - 0.3) * 5) * 0.85;
            stroke(C.red, s * 0.05);
            X.globalAlpha = 1;
          }
        }
        stamp(labels[i], 0, -h * 0.34, s * 0.16, lt, 0.12, C.red, i % 2 ? 0.12 : -0.12);
      });
    });
  });

  // 21 — Nanna's on the balcony and shouting at the neighbour's cat.
  scene(20.984, (t, lt) => {
    bg(C.sky, "#bfe8ff");
    // The house front.
    const s = A * 0.9;
    X.fillStyle = C.stone;
    X.fillRect(W / 2 - s * 0.6, CY - s * 0.55, s * 1.2, H);
    X.fillStyle = "rgba(160,120,60,0.25)";
    for (let i = 0; i < 12; i++) X.fillRect(W / 2 - s * 0.6, CY - s * 0.55 + i * s * 0.09, s * 1.2, 2);
    // The gallarija: the enclosed wooden balcony, painted green.
    const bx = W / 2 - s * 0.32;
    const by = CY - s * 0.42;
    rr(bx, by, s * 0.64, s * 0.42, s * 0.02);
    fill("#1f8a5b");
    stroke(C.ink, s * 0.01);
    for (let i = 0; i < 4; i++) {
      rr(bx + s * 0.035 + i * s * 0.15, by + s * 0.06, s * 0.12, s * 0.22, s * 0.01);
      fill(i === 1 || i === 2 ? "#cbeefc" : "#7ac9e8");
      stroke(C.ink, s * 0.006);
    }
    rr(bx - s * 0.03, by + s * 0.4, s * 0.7, s * 0.05, s * 0.01);
    fill("#156d47");
    // Nanna, leaning out between the shutters, shaking her fist.
    const shout = Math.abs(Math.sin(lt * 14)) * (lt > 0.4 ? 1 : 0);
    const nx = W / 2;
    const ny = by + s * 0.2;
    rr(nx - s * 0.11, ny, s * 0.22, s * 0.12, s * 0.05);
    fill("#2b2b38");
    circle(nx, ny - s * 0.03, s * 0.075, "#f2c9a0", C.ink, s * 0.006);
    circle(nx, ny - s * 0.11, s * 0.045, "#d8d8de", C.ink, s * 0.006);
    X.beginPath();
    X.arc(nx - s * 0.025, ny - s * 0.035, s * 0.016, 0, Math.PI * 2);
    X.arc(nx + s * 0.025, ny - s * 0.035, s * 0.016, 0, Math.PI * 2);
    stroke(C.ink, s * 0.005);
    ell(nx, ny + s * 0.01, s * 0.022, s * 0.012 + shout * s * 0.015, "#5a1a1a");
    X.save();
    X.translate(nx + s * 0.1, ny + s * 0.02);
    X.rotate(-1.2 + Math.sin(lt * 18) * 0.4);
    X.fillStyle = "#f2c9a0";
    X.fillRect(0, -s * 0.015, s * 0.12, s * 0.03);
    circle(s * 0.13, 0, s * 0.025, "#f2c9a0");
    X.restore();
    if (lt > 0.4) {
      const k = pop(t, LINES[1][0] + 0.4, 0.2);
      X.save();
      X.translate(nx - s * 0.36, ny - s * 0.16);
      X.scale(k, k);
      ell(0, 0, s * 0.17, s * 0.1, "#fff", C.ink, s * 0.008);
      path([[s * 0.08, s * 0.07], [s * 0.2, s * 0.14], [s * 0.12, s * 0.05]]);
      fill("#fff");
      txt("MUR!", 0, 0, s * 0.09, { c: C.red, shadow: false, rot: Math.sin(lt * 20) * 0.08 });
      X.restore();
    }
    // The cat, bolting across the street below.
    const catAt = wordAt(1, "cat");
    const ck = prog(t, catAt - 0.6, catAt + 0.5);
    const cx = lerp(W * 1.1, -W * 0.1, ck);
    const cy = CY + s * 0.32 - Math.abs(Math.sin(ck * Math.PI * 4)) * s * 0.08;
    X.fillStyle = "#3a3a3a";
    ell(cx, cy, s * 0.09, s * 0.045, "#2b2b30");
    circle(cx - s * 0.08, cy - s * 0.04, s * 0.04, "#2b2b30");
    path([[cx - s * 0.11, cy - s * 0.06], [cx - s * 0.1, cy - s * 0.11], [cx - s * 0.08, cy - s * 0.07]]);
    fill("#2b2b30");
    X.beginPath();
    X.moveTo(cx + s * 0.08, cy);
    X.quadraticCurveTo(cx + s * 0.16, cy - s * 0.1, cx + s * 0.2, cy - s * 0.05);
    stroke("#2b2b30", s * 0.02);
    for (let i = 0; i < 4; i++) {
      X.beginPath();
      X.moveTo(cx + s * (0.12 + i * 0.05), cy - s * 0.03 + i * 6);
      X.lineTo(cx + s * (0.25 + i * 0.07), cy - s * 0.03 + i * 6);
      stroke("rgba(0,0,0,0.3)", 3);
    }
    if (t > catAt - 0.1) txt("MIAAAW!", cx, cy - s * 0.17, s * 0.07, { c: "#fff", stroke: C.ink, sw: s * 0.015, sc: pop(t, catAt - 0.1), rot: -0.1 });
  });

  // 24.3 — The kids race up the street; the church bells ring at half past eight.
  scene(24.335, (t, lt) => {
    bg("#9ad8ff", "#e5f6ff");
    const bellAt = wordAt(2, "bells");
    const s = A * 0.95;
    church(W / 2, CY + s * 0.35, s * 0.85, t, easeOut(prog(t, bellAt - 0.3, wordAt(2, "eight") + 0.2)));
    if (t > bellAt) {
      for (let i = 0; i < 3; i++) {
        const k = ((t - bellAt) * 1.6 + i / 3) % 1;
        X.globalAlpha = 1 - k;
        for (const sx of [-1, 1]) circle(W / 2 + sx * s * 0.29, CY + s * 0.35 - s * 0.66, s * (0.05 + k * 0.3), null, C.gold, 4);
        X.globalAlpha = 1;
      }
      txt("DONG!", W / 2 - s * 0.42, CY - s * 0.25, s * 0.08, { c: C.gold, stroke: C.ink, sw: s * 0.015, sc: 1 + pulse(t) * 0.2, rot: -0.2 });
      txt("DONG!", W / 2 + s * 0.42, CY - s * 0.2, s * 0.08, { c: C.gold, stroke: C.ink, sw: s * 0.015, sc: 1 + pulse(t + BEAT / 2) * 0.2, rot: 0.2 });
    }
    // The street and the kids pelting along it.
    X.fillStyle = "#bba57d";
    X.fillRect(0, CY + s * 0.35, W, H);
    for (let i = 0; i < 4; i++) {
      const x = ((lt * W * 0.5 + i * W * 0.28) % (W * 1.2)) - W * 0.1;
      person(x, CY + s * 0.42 + (i % 2) * s * 0.06, s * 0.13, t, { run: true, c: ["#c8102e", C.blue, "#2f8f5b", "#f39c12"][i], head: "#f2c9a0" });
    }
    if (t > bellAt) txt("8:30", W / 2, CY + s * 0.45 + s * 0.12, s * 0.09, { f: FT, c: C.cream, stroke: C.ink, sw: s * 0.015, sc: pop(t, wordAt(2, "eight")) });
  });

  // 27.8 — A pastizz in my pocket and I know I'm gonna be late!
  scene(27.766, (t, lt) => {
    rays(W / 2, CY, 20, t * 0.4, "#ffcf5c", "#ff9d3c");
    const s = A;
    const flip = pop(t, wordAt(3, "pastizz"), 0.3);
    pastizz(W / 2 - (PORTRAIT ? 0 : s * 0.25), CY - (PORTRAIT ? s * 0.18 : 0), s * 0.32 * flip, Math.sin(t * 3) * 0.2);
    steam(W / 2 - (PORTRAIT ? 0 : s * 0.25), CY - (PORTRAIT ? s * 0.18 : 0) - s * 0.2, s * 0.3, t);
    const lateAt = wordAt(3, "late");
    const ck = pop(t, wordAt(3, "know"), 0.3);
    clock(W / 2 + (PORTRAIT ? 0 : s * 0.28), CY + (PORTRAIT ? s * 0.25 : 0), s * 0.18 * ck, t, 14 + prog(t, lateAt - 1, lateAt) * 30);
    stamp("LATE!", W / 2 + (PORTRAIT ? 0 : s * 0.28), CY + (PORTRAIT ? s * 0.25 : 0), s * 0.16, t, lateAt, C.red, -0.25);
  });

  // 31 — WAIT! Something's moving in the rubble wall!
  scene(30.957, (t, lt) => {
    const s = A;
    const waitK = clamp(lt / 0.9);
    limestoneWall(0, 0, W, H, t, 5, lt > 1 ? 1 : 0);
    // A gap in the wall, and in it, eyes.
    ell(W / 2, CY, s * 0.18, s * 0.11, "#140c06");
    if (lt > 1.3) eyes(W / 2, CY, s * 0.025, lt, 1.1);
    if (lt > 1) for (let i = 0; i < 2; i++) if (R() < 0.3) emit({ kind: "smoke", x: rand(0, W), y: rand(0, H * 0.5), vy: S * 0.4, size: S * 0.008, life: 0.6, g: S });
    // Freeze-frame: the record scratches, everything goes grey and the word glitches in.
    if (waitK < 1) {
      X.fillStyle = `rgba(30,30,40,${0.65 * (1 - easeIn(waitK))})`;
      X.fillRect(0, 0, W, H);
      const size = fitSize("WAIT!", W * 0.8, S * 0.35);
      const j = (1 - waitK) * S * 0.02;
      X.save();
      X.globalCompositeOperation = "lighter";
      txt("WAIT!", W / 2 - j, CY + rand(-j, j), size, { c: "rgba(255,0,60,0.8)", shadow: false });
      txt("WAIT!", W / 2 + j, CY + rand(-j, j), size, { c: "rgba(0,220,255,0.8)", shadow: false });
      X.restore();
      txt("WAIT!", W / 2, CY, size, { c: "#fff", stroke: C.ink, sw: size * 0.08, alpha: 1 - easeIn(waitK) });
    }
    if (lt > 1) txt("?!", W / 2 + s * 0.25, CY - s * 0.2, s * 0.14, { c: C.gold, stroke: C.ink, sw: s * 0.02, sc: pop(t, LINES[4][0] + 1), rot: 0.2 });
  });

  // 34.4 — Something's peeking from behind the fish stall!
  scene(34.388, (t, lt) => {
    bg("#bde7ff", "#fff3d6");
    const s = A;
    // Striped awning.
    for (let i = 0; i < 12; i++) {
      X.fillStyle = i % 2 ? "#fff" : C.red;
      X.fillRect((i / 12) * W, 0, W / 12 + 1, H * 0.12);
      X.beginPath();
      X.arc((i / 12) * W + W / 24, H * 0.12, W / 24, 0, Math.PI);
      X.fill();
    }
    // The Ħarsi, rising up behind the crate.
    const peek = 0.45 + 0.4 * Math.sin(lt * 4.2);
    const pid = ART.kalanka ? "kalanka" : IDS[3];
    X.save();
    X.beginPath();
    X.rect(0, 0, W, CY + s * 0.05);
    X.clip();
    spr(pid, W / 2 + s * 0.12, CY + s * 0.18 - peek * s * 0.3, s * 0.42);
    X.restore();
    // The stall: crates of fish on ice.
    rr(W / 2 - s * 0.55, CY + s * 0.02, s * 1.1, s * 0.4, s * 0.02);
    fill("#a8723a");
    stroke(C.ink, s * 0.01);
    for (let i = 0; i < 4; i++) {
      X.fillStyle = "rgba(0,0,0,0.15)";
      X.fillRect(W / 2 - s * 0.55, CY + s * (0.1 + i * 0.08), s * 1.1, 3);
    }
    for (let i = 0; i < 7; i++) {
      const fx = W / 2 - s * 0.45 + i * s * 0.15;
      ell(fx, CY + s * 0.0, s * 0.07, s * 0.03, i % 2 ? "#9fb6c8" : "#c9d6df", C.ink, s * 0.006, -0.3 + i * 0.1);
      circle(fx + s * 0.045, CY - s * 0.01, s * 0.008, C.ink);
    }
    // The fishmonger's sign, with a luzzu eye.
    rr(W / 2 - s * 0.25, CY + s * 0.15, s * 0.5, s * 0.14, s * 0.02);
    fill("#fff6e3");
    stroke(C.ink, s * 0.008);
    ell(W / 2 - s * 0.15, CY + s * 0.22, s * 0.05, s * 0.025, "#fff", C.ink, s * 0.006);
    circle(W / 2 - s * 0.145, CY + s * 0.22, s * 0.015, C.blue);
    txt("ĦUT", W / 2 + s * 0.06, CY + s * 0.225, s * 0.07, { f: FT, c: C.blue, shadow: false });
    // Spotlight on the peeker.
    X.save();
    X.globalCompositeOperation = "lighter";
    glowAt(W / 2 + s * 0.12, CY - s * 0.05, s * 0.4, "rgba(255,240,180,0.5)", 0.5);
    X.restore();
    if (peek > 0.4) txt("!", W / 2 + s * 0.35, CY - s * 0.25, s * 0.15, { c: C.red, stroke: "#fff", sw: s * 0.02, sc: 1 + pulse(t) * 0.2 });
  });

  // 37.6 — It's small, it's quick, it's kinda shy. It's got a little sparkle in its eye.
  scene(37.58, (t, lt) => {
    const s = A;
    const id = ART.kalanka ? "kalanka" : IDS[3];
    const tSmall = wordAt(6, "small");
    const tQuick = wordAt(6, "quick");
    const tShy = wordAt(6, "shy");
    const tEye = LINES[7][0];
    if (t < tEye) {
      const phase = t < tQuick ? 0 : t < tShy ? 1 : 2;
      bg(["#ffe066", "#7ee0ff", "#ffb0c8"][phase]);
      rays(W / 2, CY, 16, t * 0.5, "rgba(255,255,255,0.25)");
      if (phase === 0) {
        spr(id, W / 2, CY, s * lerp(0.6, 0.18, easeOut(prog(t, tSmall, tSmall + 0.4))));
        txt("SMALL", W / 2, CY - s * 0.3, s * 0.14, { c: C.ink, shadow: false, sc: pop(t, tSmall) * 0.7 });
      } else if (phase === 1) {
        const k = prog(t, tQuick, tShy);
        for (let i = 5; i >= 0; i--) spr(id, lerp(-W * 0.2, W * 1.2, clamp(k * 1.4 - i * 0.04)), CY, s * 0.3, { alpha: i ? 0.25 : 1 });
        speedLines(W / 2, CY, 20, t, "rgba(255,255,255,0.9)", s * 0.2, 0.6);
        txt("QUICK", W / 2, CY - s * 0.3, s * 0.18, { c: C.ink, shadow: false, sc: pop(t, tQuick), rot: -0.1 });
      } else {
        // Shy: peeks out from behind a prickly pear pad, blushing.
        spr(id, W / 2 + s * 0.12, CY + s * 0.05, s * 0.36);
        ell(W / 2 + s * 0.05, CY - s * 0.02, s * 0.03, s * 0.015, "rgba(255,80,120,0.7)");
        ell(W / 2 - s * 0.05, CY + s * 0.05, s * 0.2, s * 0.24, "#5aa64a", C.ink, s * 0.01, 0.2);
        for (let i = 0; i < 6; i++) circle(W / 2 - s * 0.05 + Math.cos(i) * s * 0.12, CY + s * 0.05 + Math.sin(i * 2) * s * 0.15, s * 0.01, "#fff6c0");
        txt("shy…", W / 2, CY - s * 0.3, s * 0.13, { c: C.ink, shadow: false, sc: pop(t, tShy), w: 800 });
      }
    } else {
      // The sparkle: a huge close-up of one eye, and a twinkle you can hear.
      bg(C.ink);
      const k = easeOut(prog(t, tEye, tEye + 0.5));
      bigEye(W / 2, CY, s * 0.22 * lerp(0.6, 1, k), t, prog(t, wordAt(7, "sparkle"), wordAt(7, "sparkle") + 0.25) * (1 + pulse(t) * 0.3));
      if (t > wordAt(7, "sparkle")) for (let i = 0; i < 2; i++) emit({ kind: "glow", x: W / 2 + rand(-1, 1) * s * 0.4, y: CY + rand(-1, 1) * s * 0.3, size: S * 0.03, life: 0.6, c: "rgba(255,240,170,1)" });
    }
  });

  // 41.1 — And it all started with a…
  scene(41.09, (t) => buildUp(t, 41.09, 43.484, "blue", true));

  // 43.5 — CHORUS: Ħarsi! In every wall and every wave!
  function chorusWallWave(t, lt, night) {
    const s = A;
    // Split down a slanted line: limestone wall on one side, the sea on the other.
    limestoneWall(0, 0, W, H, t, 11);
    if (night) {
      X.fillStyle = "rgba(10,20,50,0.45)";
      X.fillRect(0, 0, W, H);
    }
    X.save();
    const slant = W * 0.12;
    X.beginPath();
    X.moveTo(W / 2 + slant, -10);
    X.lineTo(W + 10, -10);
    X.lineTo(W + 10, H + 10);
    X.lineTo(W / 2 - slant, H + 10);
    X.closePath();
    X.clip();
    bg(night ? "#0b2a5a" : "#7fd3ff", night ? "#04122a" : "#1677c9");
    waves(H * 0.45, t, night ? "#1b4c8f" : "#3a9ae0", S * 0.03, S * 0.08, 2.5);
    waves(H * 0.58, t, night ? "#123a72" : "#1f7fca", S * 0.035, S * 0.11, -2);
    waves(H * 0.72, t, night ? "#0b2a5a" : "#1466b0", S * 0.04, S * 0.09, 3);
    // Water Ħarsi riding the waves.
    WATERY.forEach((id, i) => {
      const x = W * 0.55 + ((i * 0.13 + t * 0.06) % 0.5) * W;
      const y = H * (0.42 + (i % 3) * 0.14) + Math.sin(t * 3 + i) * S * 0.03;
      spr(id, x, y, s * 0.2, { rot: Math.sin(t * 3 + i) * 0.2 });
    });
    X.restore();
    X.beginPath();
    X.moveTo(W / 2 + slant, -10);
    X.lineTo(W / 2 - slant, H + 10);
    stroke("#fff", S * 0.015);
    // Rock Ħarsi popping out of the wall on the beat.
    ROCKY.forEach((id, i) => {
      const bi = beatIndex(t) - i;
      const up = 0.35 + (bi % 2 === 0 ? 0.65 * Math.sin(beatPhase(t) * Math.PI) : 0);
      const x = W * (0.08 + (i % 3) * 0.13);
      const y = H * (0.2 + Math.floor(i / 3) * 0.2);
      ell(x, y + s * 0.06, s * 0.1, s * 0.04, "#1a0f06");
      X.save();
      X.beginPath();
      X.rect(0, 0, W, y + s * 0.06);
      X.clip();
      spr(id, x, y + s * 0.12 - up * s * 0.14, s * 0.18);
      X.restore();
    });
    // The two shouts: ĦARSI! from the wall, (ĦARSI!) back from the sea.
    const s1 = LINES.find((l) => Math.abs(l[0] - (t - lt)) < 0.01);
    const t0 = t - lt;
    const big = fitSize("ĦARSI!", W * 0.42, S * 0.16, { f: FT });
    if (lt > 0.35 && lt < 1.2) txt("ĦARSI!", W * 0.27, H * 0.5, big, { f: FT, c: C.gold, stroke: C.red, sw: big * 0.08, sc: pop(t, t0 + 0.35), rot: -0.12 });
    if (lt > 0.85 && lt < 1.9) txt("(ĦARSI!)", W * 0.74, H * 0.32, big * 0.75, { f: FT, c: "#fff", stroke: C.blue, sw: big * 0.08, sc: pop(t, t0 + 0.85), rot: 0.12 });
    void s1;
  }
  function chorusFestaCave(t, lt, line, night) {
    const s = A;
    const caveAt = wordAt(line, "cave");
    if (t < caveAt - 0.15) {
      // Festa night: lights, banners and fireworks.
      bg("#0b1638", "#2a1a4a");
      for (let i = 0; i < 3; i++) {
        X.beginPath();
        const y = H * (0.12 + i * 0.1);
        X.moveTo(0, y);
        X.quadraticCurveTo(W / 2, y + H * 0.08, W, y);
        stroke("rgba(255,255,255,0.3)", 1.5);
        for (let k = 0; k <= 20; k++) {
          const u = k / 20;
          const yy = (1 - u) * (1 - u) * y + 2 * u * (1 - u) * (y + H * 0.08) + u * u * y;
          circle(u * W, yy, S * 0.006, ["#ffd23c", "#ff5c8a", "#7fe0ff", "#9be15d"][(k + i + beatIndex(t)) % 4]);
        }
      }
      // Pavaljuni: the red festa banners.
      for (let i = 0; i < 5; i++) {
        const x = W * (0.1 + i * 0.2);
        path([[x - S * 0.04, H * 0.42], [x + S * 0.04, H * 0.42], [x + S * 0.04, H * 0.62], [x, H * 0.58], [x - S * 0.04, H * 0.62]]);
        fill(C.red);
        stroke(C.gold, 2);
        maltaCross(x, H * 0.49, S * 0.025, C.gold);
      }
      // The saint on the shoulders of the crowd.
      X.fillStyle = "#1a1030";
      X.fillRect(0, H * 0.74, W, H);
      for (let i = 0; i < 18; i++) circle((i / 17) * W, H * 0.74 + Math.sin(t * 8 + i) * 4, S * 0.03, "#1a1030");
      if (R() < 0.12 + pulse(t) * 0.1) firework(rand(W * 0.1, W * 0.9), rand(H * 0.12, H * 0.4), pick(["#ffd23c", "#ff5c8a", "#7fe0ff", "#9be15d", "#ffffff"]));
      if (lt > 0.35 && lt < 1.3) {
        const big = fitSize("ĦARSI!", W * 0.6, S * 0.17, { f: FT });
        txt(lt < 0.85 ? "ĦARSI!" : "(ĦARSI!)", W / 2, H * 0.3, big, { f: FT, c: C.gold, stroke: C.red, sw: big * 0.08, sc: pop(t, t - lt + (lt < 0.85 ? 0.35 : 0.85)) });
      }
      txt("FESTA!", W / 2, CY + s * 0.1, fitSize("FESTA!", W * 0.7, S * 0.18), { c: "#fff", stroke: C.red, sw: S * 0.02, sc: pop(t, wordAt(line, "festa")) * (1 + pulse(t) * 0.08), alpha: t > wordAt(line, "festa") ? 1 : 0 });
    } else {
      // The Blue Grotto: an arch of rock, glowing water, eyes in the dark.
      bg("#02060c");
      X.save();
      X.beginPath();
      X.ellipse(W / 2, H * 0.62, W * 0.42, H * 0.42, 0, Math.PI, 0);
      X.closePath();
      X.clip();
      bg("#0a3a6a", "#00b4ff");
      const g = X.createRadialGradient(W / 2, H * 0.75, 0, W / 2, H * 0.75, W * 0.5);
      g.addColorStop(0, "rgba(120,240,255,0.9)");
      g.addColorStop(1, "rgba(0,120,255,0)");
      X.fillStyle = g;
      X.fillRect(0, 0, W, H);
      waves(H * 0.62, t, "rgba(0,170,255,0.7)", S * 0.01, S * 0.05, 1.5);
      X.restore();
      eyes(W * 0.3, H * 0.4, S * 0.012, t, 1.6, "#7ff7ff");
      eyes(W * 0.72, H * 0.33, S * 0.01, t + 0.5, 1.9, "#7ff7ff");
      eyes(W * 0.55, H * 0.5, S * 0.014, t + 1.1, 1.3, "#7ff7ff");
      txt("CAVE!", W / 2, H * 0.18, fitSize("CAVE!", W * 0.6, S * 0.18), { c: "#bff6ff", stroke: C.ink, sw: S * 0.02, sc: pop(t, caveAt - 0.15) });
    }
    void night;
  }
  function chorusNassa(t, lt, line, night) {
    const s = A;
    rays(W / 2, CY, 22, t * 0.6, night ? "rgba(255,201,60,0.18)" : "rgba(255,255,255,0.25)", night ? "#1a2a6a" : "#2f8f5b");
    const tGrab = wordAt(line, "grab");
    const k = prog(t, tGrab, tGrab + 0.8);
    nassa(W / 2, CY, s * lerp(0.15, 0.62, easeOut(k)), t * 4 * (1 - k) + Math.sin(t * 3) * 0.1);
    // Ħarsi being scooped in with a sparkle.
    for (let i = 0; i < 4; i++) {
      const born = tGrab + 0.6 + i * BEAT;
      if (t < born) continue;
      const q = prog(t, born, born + 0.5);
      const a = i * 1.7;
      const x = lerp(W / 2 + Math.cos(a) * W * 0.6, W / 2, easeIn(q));
      const y = lerp(CY + Math.sin(a) * H * 0.6, CY, easeIn(q));
      if (q < 1) spr(IDS[(i * 11 + line) % IDS.length], x, y, s * 0.2 * (1 - q * 0.7), { rot: q * 6 });
    }
    const tEj1 = wordAt(line, "ejja", 0);
    const tEj2 = wordAt(line, "ejja", 1);
    stamp("EJJA!", W * 0.27, CY - s * 0.32, fitSize("EJJA!", W * 0.4, S * 0.16), t, tEj1, C.gold, -0.2);
    stamp("EJJA!", W * 0.73, CY + s * 0.3, fitSize("EJJA!", W * 0.4, S * 0.16), t, tEj2, C.gold, 0.2);
    const tLate = wordAt(line, "late");
    if (t > tLate - 0.1) clock(W * 0.82, CY - s * 0.3, s * 0.1 * pop(t, tLate - 0.1), t, 30);
  }

  function chorus(t0, lines, night) {
    scene(t0, (t, lt) => chorusWallWave(t, lt, night));
    scene(LINES[lines[1]][0], (t, lt) => chorusFestaCave(t, lt, lines[1], night));
    scene(LINES[lines[2]][0], (t, lt) => chorusNassa(t, lt, lines[2], night));
  }
  chorus(43.484, [9, 10, 11], false);
  scene(55.133, (t) => buildUp(t, 55.133, 58.484, "red", true));

  // 58.5 — Somebody broke into the Oracle Room!
  scene(58.484, (t, lt) => {
    const s = A;
    bg("#1a1410", "#3a2a1a");
    // The chamber: megalithic slabs and the oracle's window.
    for (let i = 0; i < 6; i++) {
      rr(W / 2 + (i - 2.5) * s * 0.3 - s * 0.13, CY - s * 0.45, s * 0.26, s * 0.9, s * 0.03);
      fill(i % 2 ? "#7a5a3a" : "#8a6a44");
      stroke("#2a1a0a", 3);
    }
    rr(W / 2 - s * 0.12, CY - s * 0.15, s * 0.24, s * 0.2, s * 0.1);
    fill("#000");
    // The alarm: red sweeps, three times a second at most.
    const siren = Math.sin(t * 9) > 0;
    X.fillStyle = siren ? "rgba(255,30,40,0.28)" : "rgba(0,0,0,0)";
    X.fillRect(0, 0, W, H);
    if (lt < 0.1) for (let i = 0; i < 28; i++) emit({ kind: "shard", x: W / 2, y: CY - s * 0.05, vx: rand(-1, 1) * S, vy: rand(-1.2, 0.3) * S, g: S * 1.5, size: S * rand(0.01, 0.03), life: 1.6, c: "rgba(170,230,255,0.85)", vr: rand(-10, 10) });
    // Footprints leading off.
    for (let i = 0; i < 6; i++) {
      if (lt < 0.8 + i * 0.25) continue;
      ell(W * 0.2 + i * W * 0.11, CY + s * 0.38 + (i % 2) * s * 0.05, s * 0.025, s * 0.04, "rgba(0,0,0,0.55)", null, 0, 1.4);
    }
    // News ticker.
    const by = H * (PORTRAIT ? 0.66 : 0.7);
    X.fillStyle = C.red;
    X.fillRect(0, by, W, S * 0.07);
    X.fillStyle = "#fff";
    X.fillRect(0, by + S * 0.07, W, S * 0.05);
    txt("BREAKING", S * 0.11, by + S * 0.035, S * 0.04, { c: "#fff", shadow: false, f: FB });
    X.save();
    X.beginPath();
    X.rect(S * 0.22, by, W, S * 0.07);
    X.clip();
    const msg = "ORACLE ROOM BROKEN INTO · ĦAĠAR QIM · ISLAND IN A STATE · POLICE BAFFLED · NANNA SUSPECTS THE NEIGHBOUR'S CAT · ";
    X.font = `900 ${S * 0.04}px ${FB}`;
    const mw = X.measureText(msg).width;
    const x0 = S * 0.24 - ((lt * S * 0.35) % mw);
    txt(msg + msg, x0, by + S * 0.035, S * 0.04, { c: "#fff", shadow: false, al: "left" });
    X.restore();
    txt("LIVE · ĦAĠAR QIM", S * 0.24, by + S * 0.095, S * 0.03, { c: C.ink, shadow: false, al: "left", w: 800 });
    const tState = wordAt(13, "state");
    stamp("IN A STATE!", W / 2, CY - s * 0.32, fitSize("IN A STATE!", W * 0.8, S * 0.13), t, tState - 0.15, C.gold, -0.08);
  });

  // 62 — My little partner and a map of every village gate.
  scene(61.995, (t, lt) => {
    bg("#f3e2b8");
    X.fillStyle = dots("rgba(140,100,40,0.12)");
    X.fillRect(0, 0, W, H);
    const s = A * 1.05;
    const ox = W / 2 - s * 0.45;
    const oy = CY - s * 0.48;
    // The sea on the old map, with a compass rose.
    X.fillStyle = "rgba(31,78,140,0.12)";
    for (let i = 0; i < 12; i++) {
      X.beginPath();
      for (let x = 0; x < W; x += 12) X.lineTo(x, oy + i * s * 0.08 + Math.sin(x * 0.04 + t) * 3);
      stroke("rgba(31,78,140,0.18)", 1.5);
    }
    island(GOZO, ox, oy, s, "#e8cf96", "#6b4a1a");
    island(COMINO, ox, oy, s, "#e8cf96", "#6b4a1a");
    island(MALTA, ox, oy, s, "#e8cf96", "#6b4a1a");
    X.save();
    X.translate(ox + s * 0.88, oy + s * 0.18);
    X.rotate(t * 0.2);
    for (let i = 0; i < 4; i++) {
      X.rotate(Math.PI / 2);
      path([[0, -s * 0.09], [s * 0.02, 0], [-s * 0.02, 0]]);
      fill(i === 0 ? C.red : "#6b4a1a");
    }
    X.restore();
    // The route, drawn out place by place, a pin landing on each beat.
    const k = clamp(lt / 3.1);
    const pts = PLACES.map(([, px, py]) => [ox + px * s, oy + py * s]);
    const n = (pts.length - 1) * k;
    X.setLineDash([S * 0.015, S * 0.012]);
    X.beginPath();
    for (let i = 0; i <= Math.floor(n); i++) (i ? X.lineTo : X.moveTo).call(X, pts[i][0], pts[i][1]);
    const f = n % 1;
    const iFloor = Math.floor(n);
    let hx = pts[iFloor][0];
    let hy = pts[iFloor][1];
    if (iFloor < pts.length - 1) {
      hx = lerp(pts[iFloor][0], pts[iFloor + 1][0], f);
      hy = lerp(pts[iFloor][1], pts[iFloor + 1][1], f);
      X.lineTo(hx, hy);
    }
    stroke(C.red, S * 0.008);
    X.setLineDash([]);
    PLACES.forEach(([name], i) => {
      if (i > n + 0.01) return;
      const p = pop(t, t - lt + (i / (pts.length - 1)) * 3.1, 0.25);
      const [x, y] = pts[i];
      X.save();
      X.translate(x, y);
      X.scale(p, p);
      circle(0, -S * 0.03, S * 0.018, C.red, C.ink, 2);
      path([[-S * 0.012, -S * 0.022], [S * 0.012, -S * 0.022], [0, 0]]);
      fill(C.red);
      X.restore();
      txt(name, x, y + S * 0.025, S * 0.03, { c: C.ink, shadow: false, w: 800, alpha: p });
    });
    // The partner, hopping along at the head of the route.
    spr(STARTERS[0], hx, hy - S * 0.05 - bounce(t) * S * 0.04, S * 0.11);
    txt("MY PARTNER", hx, hy - S * 0.13, S * 0.028, { c: "#fff", stroke: C.ink, sw: S * 0.008, alpha: lt < 1.5 ? 1 : 0 });
  });

  // 65.5 — From Mdina's silent walls down to the boats in Marsaxlokk.
  scene(65.505, (t, lt) => {
    const s = A;
    const tBoats = wordAt(15, "boats") - 0.25;
    if (t < tBoats) {
      bg("#0d1b3a", "#25407a");
      for (let i = 0; i < 50; i++) {
        const r = rng(i + 400);
        circle(r() * W, r() * H * 0.5, 1 + r(), `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 2 + i)})`);
      }
      circle(W * 0.8, H * 0.16, S * 0.05, "#fff6d0");
      // The walls of the Silent City, the gate glowing.
      X.fillStyle = "#c9a466";
      X.fillRect(0, CY - s * 0.15, W, H);
      for (let x = 0; x < W; x += S * 0.06) X.fillRect(x, CY - s * 0.2, S * 0.035, s * 0.06);
      X.fillStyle = "rgba(10,20,50,0.45)";
      X.fillRect(0, CY - s * 0.2, W, H);
      rr(W / 2 - s * 0.22, CY - s * 0.32, s * 0.44, s * 0.6, s * 0.02);
      fill("#e3c189");
      stroke(C.ink, 3);
      X.beginPath();
      X.moveTo(W / 2 - s * 0.1, CY + s * 0.28);
      X.lineTo(W / 2 - s * 0.1, CY - s * 0.05);
      X.arc(W / 2, CY - s * 0.05, s * 0.1, Math.PI, 0);
      X.lineTo(W / 2 + s * 0.1, CY + s * 0.28);
      fill("#2a1608");
      glowAt(W / 2, CY + s * 0.05, s * 0.3, "rgba(255,190,90,0.9)", 0.5);
      txt("MDINA", W / 2, CY - s * 0.23, s * 0.07, { f: FT, c: C.ink, shadow: false });
      txt("shhh…", W / 2 + s * 0.32, CY - s * 0.32, s * 0.07, { c: "#fff", shadow: false, w: 700, alpha: prog(lt, 0.4, 0.8) });
    } else {
      // Whip-pan to Marsaxlokk: bright morning, painted boats bobbing.
      const whip = clamp((t - tBoats) / 0.25);
      bg("#9ee0ff", "#e6f7ff");
      X.fillStyle = "#e8cf96";
      X.fillRect(0, H * 0.34, W, H * 0.1);
      for (let i = 0; i < 9; i++) {
        X.fillStyle = ["#f6e1b0", "#efd29a", "#f8e8c4"][i % 3];
        X.fillRect((i / 9) * W, H * 0.24, W / 9 - 4, H * 0.12);
        X.fillStyle = ["#2f8f5b", C.blue, C.red][i % 3];
        X.fillRect((i / 9) * W + W / 30, H * 0.27, W / 30, H * 0.05);
      }
      sea(H * 0.44, t, "#29a0e6", "#0e5aa8");
      const L = Math.min(W * 0.32, s * 0.5);
      luzzu(W * 0.22, H * 0.56, L, t, "#1f78c8", "#ffc93c");
      luzzu(W * 0.7, H * 0.52, L * 0.9, t + 1, "#ffc93c", "#2f8f5b");
      luzzu(W * 0.46, H * 0.7, L * 1.1, t + 2, "#2f8f5b", "#c8102e");
      txt("MARSAXLOKK", W / 2, H * 0.14, fitSize("MARSAXLOKK", W * 0.86, S * 0.1, { f: FT }), { f: FT, c: C.blue, stroke: "#fff", sw: S * 0.012, sc: pop(t, tBoats + 0.1) });
      if (whip < 1) {
        X.fillStyle = `rgba(255,255,255,${1 - whip})`;
        X.fillRect(0, 0, W, H);
      }
    }
  });

  // 69.2 — Through the temples and the catacombs and Dingli's dizzy rock.
  scene(69.176, (t, lt) => {
    const s = A;
    const tCat = wordAt(16, "catacombs") - 0.1;
    const tDingli = wordAt(16, "dingli") - 0.1;
    if (t < tCat) {
      bg("#ff9a5a", "#ffd9a0");
      sun(W * 0.75, H * 0.25, S * 0.07, t);
      X.fillStyle = "#a8865a";
      X.fillRect(0, CY + s * 0.3, W, H);
      trilithon(W / 2, CY + s * 0.32, s * 0.55 * pop(t, LINES[16][0], 0.3));
      txt("ĦAĠAR QIM", W / 2, CY - s * 0.38, s * 0.09, { f: FT, c: C.ink, shadow: false, sc: pop(t, LINES[16][0] + 0.1) });
    } else if (t < tDingli) {
      // Catacombs: a corridor of candles rushing past.
      bg("#0b0806");
      const z = (t - tCat) * 3;
      for (let i = 8; i >= 0; i--) {
        const d = (i - (z % 1)) / 8;
        const k = 1 / Math.max(0.08, d);
        const w = s * 0.12 * k;
        const h = s * 0.16 * k;
        rr(W / 2 - w / 2, CY - h / 2, w, h, w * 0.3);
        X.globalAlpha = clamp(1 - d * 0.9);
        stroke("#5a4028", Math.max(2, w * 0.05));
        X.globalAlpha = 1;
        const fl = 0.8 + Math.sin(t * 30 + i) * 0.2;
        glowAt(W / 2 - w * 0.45, CY, w * 0.25 * fl, "rgba(255,170,60,0.9)", clamp(1 - d));
        glowAt(W / 2 + w * 0.45, CY, w * 0.25 * fl, "rgba(255,170,60,0.9)", clamp(1 - d));
      }
      txt("CATACOMBS", W / 2, CY + s * 0.38, fitSize("CATACOMBS", W * 0.8, s * 0.1, { f: FT }), { f: FT, c: "#ffd9a0", shadow: false, sc: pop(t, tCat) });
    } else {
      // Dingli Cliffs: and the world spins.
      X.save();
      X.translate(W / 2, H / 2);
      X.rotate((t - tDingli) * 2.4);
      X.scale(1.6, 1.6);
      X.translate(-W / 2, -H / 2);
      bg("#7fd3ff", "#1677c9");
      X.fillStyle = "#c9a466";
      path([[-W, CY - s * 0.1], [W * 0.55, CY - s * 0.12], [W * 0.62, CY + s * 0.3], [W * 0.58, H * 2], [-W, H * 2]]);
      fill("#c9a466");
      stroke("#7a5a2a", 4);
      spr(STARTERS[0], W * 0.5, CY - s * 0.2, s * 0.18);
      X.restore();
      X.save();
      X.globalAlpha = 0.4;
      for (let i = 0; i < 4; i++) {
        X.beginPath();
        X.arc(W / 2, CY, s * (0.1 + i * 0.08), t * 6 + i, t * 6 + i + 4);
        stroke("#fff", 4);
      }
      X.restore();
      txt("DIZZY!", W / 2, CY + s * 0.36, fitSize("DIZZY!", W * 0.7, s * 0.14), { c: C.gold, stroke: C.ink, sw: s * 0.02, rot: Math.sin(t * 8) * 0.15, sc: pop(t, tDingli) });
    }
  });

  // 72.2 — My rival's got a grin and a brand new team.
  scene(72.207, (t, lt) => {
    const s = A;
    // VS split: blue for you, red for them.
    bg(C.red);
    X.fillStyle = dots("rgba(0,0,0,0.18)");
    X.fillRect(0, 0, W, H);
    X.save();
    path([[0, 0], [W * 0.62, 0], [W * 0.38, H], [0, H]]);
    X.clip();
    bg(C.blue);
    X.fillStyle = dots("rgba(255,255,255,0.12)");
    X.fillRect(0, 0, W, H);
    X.restore();
    path([[W * 0.62, 0], [W * 0.38, H]], false);
    stroke("#fff", S * 0.02);
    // You and your partner on the left.
    const inL = easeOut(prog(lt, 0, 0.3));
    spr(STARTERS[0], lerp(-W * 0.3, W * 0.22, inL), H * (PORTRAIT ? 0.32 : 0.45), s * 0.38);
    txt("YOU", lerp(-W * 0.3, W * 0.2, inL), H * (PORTRAIT ? 0.12 : 0.15), s * 0.11, { f: FT, c: "#fff", stroke: C.ink, sw: s * 0.015 });
    // The rival, grinning; their new team slams in behind on the beat.
    const inR = easeOut(prog(lt, 0.2, 0.5));
    const rx = lerp(W * 1.3, W * 0.76, inR);
    const ry = H * (PORTRAIT ? 0.6 : 0.45);
    const team = ["xrobbraxx", "jannisar", "bombarda"].filter((id) => ART[id]);
    const tTeam = wordAt(17, "team");
    team.forEach((id, i) => {
      const tt = tTeam + i * BEAT * 0.5;
      if (t < tt) return;
      spr(id, rx + (i - 1) * s * 0.2, ry + s * 0.2, s * 0.22 * pop(t, tt), { flip: true });
    });
    rival(rx, ry - s * 0.05, s * 0.18, t);
    if (t > wordAt(17, "grin")) {
      star(rx + s * 0.04, ry - s * 0.02, s * 0.05 * pop(t, wordAt(17, "grin")), t * 3, "#fff");
    }
    txt("RIVAL", rx, ry - s * 0.32, s * 0.1, { f: FT, c: "#fff", stroke: C.ink, sw: s * 0.015, alpha: inR });
    // VS!
    const vs = pop(t, LINES[17][0] + 0.15, 0.3);
    const vsS = s * 0.24 * (1 + pulse(t) * 0.12);
    txt("VS", W / 2, H / 2, vsS, { f: FT, c: C.gold, stroke: C.ink, sw: vsS * 0.12, sc: vs, rot: -0.15 });
    const tWin = wordAt(17, "win");
    stamp("GONNA WIN!", rx, ry + s * 0.42, fitSize("GONNA WIN!", W * 0.45, s * 0.09), t, tWin - 0.1, "#fff", 0.1);
  });

  // 75.5 — We battle in the square while the band plays loud and the fireworks begin!
  scene(75.479, (t, lt) => {
    const s = A;
    bg("#2a1a50", "#ff8a5a");
    church(W / 2, CY + s * 0.15, s * 0.7, t, 1);
    X.fillStyle = "rgba(20,10,40,0.35)";
    X.fillRect(0, 0, W, H);
    X.fillStyle = "#c9a466";
    X.fillRect(0, CY + s * 0.15, W, H);
    // The fighters.
    const L = STARTERS[0];
    const Rr = ART.xrobbraxx ? "xrobbraxx" : IDS[5];
    const lx = W * 0.2;
    const rx = W * 0.8;
    const fy = CY + s * 0.18;
    spr(L, lx, fy - bounce(t) * s * 0.03, s * 0.3);
    spr(Rr, rx, fy - bounce(t + BEAT / 2) * s * 0.03, s * 0.3, { flip: true });
    // Beams meet in the middle and push against each other on the beat.
    const mid = W / 2 + Math.sin(t * 2.3) * W * 0.08;
    const p = pulse(t);
    X.save();
    X.globalCompositeOperation = "lighter";
    X.lineCap = "round";
    for (const [x0, col] of [[lx + s * 0.1, "rgba(120,255,140,0.9)"], [rx - s * 0.1, "rgba(255,120,60,0.9)"]]) {
      X.strokeStyle = col;
      X.lineWidth = s * (0.05 + p * 0.03);
      X.beginPath();
      X.moveTo(x0, fy - s * 0.05);
      X.lineTo(mid, fy - s * 0.05);
      X.stroke();
      X.lineWidth = s * 0.015;
      X.strokeStyle = "#fff";
      X.stroke();
    }
    X.restore();
    glowAt(mid, fy - s * 0.05, s * (0.18 + p * 0.12), "rgba(255,240,160,1)", 1);
    if (R() < 0.6) sparks(mid, fy - s * 0.05, 3, pick(["#ffef9a", "#ff8a3a", "#9effa6"]), 0.5);
    // The band: notes bouncing out of the square.
    if (t > wordAt(18, "band") && R() < 0.25) emit({ kind: "note", ch: pick(["♪", "♫", "♬"]), x: rand(W * 0.1, W * 0.9), y: H * 0.8, vy: -S * 0.3, vx: rand(-40, 40), size: S * 0.05, life: 1.5, c: pick([C.gold, "#fff", C.pink]) });
    const tFw = wordAt(18, "fireworks");
    if (t > tFw && R() < 0.2) firework(rand(W * 0.1, W * 0.9), rand(H * 0.08, H * 0.35), pick(["#ffd23c", "#ff5c8a", "#7fe0ff", "#9be15d", "#ffffff"]));
    stamp("BATTLE!", W / 2, H * 0.14, fitSize("BATTLE!", W * 0.6, S * 0.13), t, wordAt(18, "battle"), C.gold, -0.1);
  });

  // 79.2 — Another medal on my bag, another friend inside the Gaġġa.
  scene(79.229, (t, lt) => {
    const s = A;
    const tCage = wordAt(19, "friend") - 0.2;
    if (t < tCage) {
      bg(C.blue);
      rays(W / 2, CY, 18, t * 0.3, "rgba(255,255,255,0.1)");
      // The satchel.
      rr(W / 2 - s * 0.3, CY - s * 0.2, s * 0.6, s * 0.45, s * 0.06);
      fill("#8a5a2a");
      stroke(C.ink, s * 0.012);
      X.beginPath();
      X.moveTo(W / 2 - s * 0.25, CY - s * 0.2);
      X.quadraticCurveTo(W / 2, CY - s * 0.65, W / 2 + s * 0.25, CY - s * 0.2);
      stroke("#6a4018", s * 0.04);
      rr(W / 2 - s * 0.3, CY - s * 0.2, s * 0.6, s * 0.18, s * 0.06);
      fill("#a06a32");
      stroke(C.ink, s * 0.01);
      // Medals flying on and sticking, one a beat.
      for (let i = 0; i < 6; i++) {
        const tt = LINES[19][0] + i * BEAT * 0.5;
        const q = prog(t, tt, tt + 0.25);
        if (q <= 0) continue;
        const tx = W / 2 - s * 0.2 + (i % 3) * s * 0.2;
        const ty = CY + s * 0.08 + Math.floor(i / 3) * s * 0.12;
        const x = lerp(tx + (i % 2 ? W : -W) * 0.5, tx, easeOut(q));
        const y = lerp(ty - H * 0.4, ty, easeOut(q));
        medal(x, y, s * 0.045, [C.gold, "#c0c6d0", "#e08a4a"][i % 3]);
        if (q >= 1 && t - tt < 0.4) glowAt(tx, ty, s * 0.08, "rgba(255,240,170,1)", 0.6);
      }
      stamp("+1 MEDAL!", W / 2, CY - s * 0.38, fitSize("+1 MEDAL!", W * 0.6, s * 0.1), t, wordAt(19, "medal"), C.gold, -0.1);
    } else {
      bg("#2a5a3a", "#183a24");
      const n = Math.min(10, 1 + Math.floor((t - tCage) / (BEAT * 0.5)));
      cage(W / 2, CY + s * 0.05, s * 0.6, t);
      X.save();
      X.beginPath();
      X.ellipse(W / 2, CY + s * 0.05 - s * 0.12, s * 0.35, s * 0.42, 0, 0, Math.PI * 2);
      X.rect(W / 2 - s * 0.36, CY - s * 0.07, s * 0.72, s * 0.37);
      X.clip();
      for (let i = 0; i < n; i++) spr(IDS[(i * 13 + 5) % IDS.length], W / 2 + ((i % 4) - 1.5) * s * 0.15, CY + s * 0.24 - Math.floor(i / 4) * s * 0.13 - bounce(t + i * 0.1) * s * 0.03, s * 0.15);
      X.restore();
      cage(W / 2, CY + s * 0.05, s * 0.6, t);
      txt("GAĠĠA", W / 2, CY - s * 0.45, s * 0.1, { f: FT, c: C.gold, stroke: C.ink, sw: s * 0.015, sc: pop(t, tCage) });
    }
  });

  // 82.4 — It's getting kinda crowded but I'm never gonna stop — ejja!
  scene(82.42, (t, lt) => {
    const s = A;
    bg("#ffcf5c", "#ff8a3a");
    rays(W / 2, H, 24, t * 0.2, "rgba(255,255,255,0.18)");
    const n = Math.min(21, 1 + Math.floor(lt / (BEAT * 0.5)));
    let i = 0;
    const size = s * 0.16;
    for (let row = 0; row < 6 && i < n; row++) {
      const count = 6 - row;
      for (let c = 0; c < count && i < n; c++, i++) {
        const x = W / 2 + (c - (count - 1) / 2) * size * 0.85;
        const y = CY + s * 0.38 - row * size * 0.72;
        const wob = Math.sin(t * 6 + row) * row * 0.04;
        spr(IDS[(i * 17 + 3) % IDS.length], x + wob * size, y, size, { rot: wob });
      }
    }
    txt("CROWDED!", W / 2, H * 0.1, fitSize("CROWDED!", W * 0.7, S * 0.1), { c: C.ink, shadow: false, sc: pop(t, wordAt(20, "crowded")), alpha: t > wordAt(20, "crowded") ? 1 : 0 });
    stamp("EJJA!", W / 2, CY, fitSize("EJJA!", W * 0.7, S * 0.26), t, wordAt(20, "ejja") - 0.05, C.red, -0.15);
  });

  scene(86.011, (t) => buildUp(t, 86.011, 88.404, "green", true));
  chorus(88.404, [22, 23, 24], true);
  scene(99.973, (t) => buildUp(t, 99.973, 103.644, "night", true));

  // 103.6 — BRIDGE: Pastizzi! Kinnie! Festa! Ħarsi!
  function bridgeCards(t, line) {
    const words = WORDS[line];
    const colors = ["#ffcf5c", "#ff8a1a", C.red, C.blue];
    const cols = PORTRAIT ? 2 : 4;
    const rows = PORTRAIT ? 2 : 1;
    const gap = S * 0.025;
    const areaW = W * 0.94;
    const areaH = PORTRAIT ? H * 0.68 : H * 0.62;
    const pw = (areaW - gap * (cols - 1)) / cols;
    const ph = (areaH - gap * (rows - 1)) / rows;
    const ox = (W - areaW) / 2;
    const oy = PORTRAIT ? H * 0.05 : H * 0.1;
    bg(C.ink);
    rays(W / 2, H / 2, 24, t * 0.5, "rgba(255,201,60,0.15)");
    words.slice(0, 4).forEach((w, i) => {
      const x = ox + (i % cols) * (pw + gap);
      const y = oy + Math.floor(i / cols) * (ph + gap) - (i === beatIndex(t) % 4 ? pulse(t) * S * 0.015 : 0);
      panel(t, w.t - 0.06, x, y, pw, ph, colors[i], (pw2, ph2, lt) => {
        const s = Math.min(pw2, ph2);
        if (i === 0) pastizz(0, -s * 0.05, s * 0.3, Math.sin(t * 4) * 0.2);
        if (i === 1) kinnie(0, -s * 0.04, s * 0.32, Math.sin(t * 5) * 0.12);
        if (i === 2) {
          if (R() < 0.08) firework(x + pw / 2 + rand(-1, 1) * pw * 0.3, y + ph * 0.3, pick(["#ffd23c", "#fff", "#7fe0ff"]), 24);
          maltaCross(0, -s * 0.05, s * 0.25, "#fff");
        }
        if (i === 3) spr(STARTERS[1] || IDS[0], 0, -s * 0.05, s * 0.6);
        const label = w.w.replace(/[!,]/g, "").toUpperCase();
        txt(label + "!", 0, ph2 * 0.33, fitSize(label + "!", pw2 * 0.9, s * 0.17), { c: "#fff", stroke: C.ink, sw: s * 0.03, sc: 1 + (lt < 0.3 ? 0.2 * (1 - lt / 0.3) : 0) });
      });
    });
  }
  scene(103.644, (t) => bridgeCards(t, 26));
  scene(105.638, (t, lt) => {
    bridgeCards(t, 27);
    if (lt > 2.4) {
      // The four cards dance; Ħarsi pour across the bottom.
      crowd(t, IDS, H * 0.92, S * 0.12, PORTRAIT ? 6 : 10, beatIndex(t));
    }
  });
  // Waħda! Tnejn! Tlieta! Erbgħa!
  scene(110.745, (t) => {
    const words = WORDS[28];
    let i = 0;
    words.forEach((w, k) => {
      if (t >= w.t - 0.05) i = k;
    });
    const cols = ["#ffcf5c", "#7fe0ff", "#ff5c8a", "#9be15d"];
    rays(W / 2, CY, 20, t * 0.8 * (i % 2 ? -1 : 1), "rgba(255,255,255,0.25)", cols[i]);
    const p = pop(t, words[i].t - 0.05, 0.18);
    const big = Math.min(H * 0.55, W * 0.6);
    txt(String(i + 1), W / 2, CY - big * 0.08, big, { f: FT, c: "#fff", stroke: C.ink, sw: big * 0.05, sc: p, rot: (i % 2 ? 0.1 : -0.1) });
    const word = words[i].w.replace(/!/g, "").toUpperCase();
    txt(word + "!", W / 2, CY + big * 0.45, fitSize(word + "!", W * 0.8, S * 0.13), { c: C.ink, stroke: "#fff", sw: S * 0.015, sc: p });
  });
  // Ejja, ejja, ejja magħna! — the whole island dances.
  scene(112.5, (t, lt) => {
    bg("#ff5c8a", "#ffcf5c");
    rays(W / 2, H * 0.3, 28, t * 0.4, "rgba(255,255,255,0.2)");
    X.fillStyle = tileFill("red", S * 0.1, 0, t * 40);
    X.globalAlpha = 0.15;
    X.fillRect(0, 0, W, H);
    X.globalAlpha = 1;
    const rowsN = PORTRAIT ? 4 : 3;
    for (let r = 0; r < rowsN; r++) crowd(t + r * 0.12, IDS.slice(r * 20), H * (0.42 + r * (PORTRAIT ? 0.12 : 0.17)), S * (0.12 + r * 0.03), PORTRAIT ? 5 + r : 8 + r * 2, r * 7);
    WORDS[29].forEach((w, i) => {
      if (t < w.t) return;
      const label = w.w.replace(/[!,]/g, "").toUpperCase() + "!";
      txt(label, W * (0.2 + (i % 4) * 0.2), H * 0.16 + (i % 2) * S * 0.08, fitSize(label, W * 0.3, S * 0.11), { c: "#fff", stroke: C.red, sw: S * 0.015, sc: pop(t, w.t) * (1 + pulse(t) * 0.1), rot: (i % 2 ? 0.12 : -0.12) });
    });
    if (R() < 0.15) confetti(rand(0, W), -10, 6, 3, -0.2);
  });

  // 117.4 — VERSE 3: the whole of Malta's history at a run.
  function eraCard(t, t0, year, label, bgA, bgB) {
    bg(bgA, bgB);
    const p = pop(t, t0, 0.25);
    const y = H * (PORTRAIT ? 0.1 : 0.12);
    X.fillStyle = "rgba(11,26,46,0.75)";
    X.fillRect(0, y - S * 0.06, W, S * 0.12);
    txt(year, W * 0.5, y - S * 0.012, fitSize(year, W * 0.6, S * 0.08, { f: FT }), { f: FT, c: C.gold, sc: p, shadow: false });
    txt(label, W * 0.5, y + S * 0.042, S * 0.03, { c: "#fff", shadow: false, w: 800, alpha: p });
    // The timeline ribbon, ticking along.
    const tick = (t * 3) % 1;
    X.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = -1; i < 12; i++) X.fillRect(((i + tick) / 10) * W, y + S * 0.07, 2, S * 0.015);
  }
  scene(117.367, (t, lt) => {
    const s = A;
    const tTemple = wordAt(30, "temple") - 0.1;
    const tPhoen = wordAt(30, "phoenicians") - 0.1;
    if (t < tTemple) {
      eraCard(t, LINES[30][0], "ICE AGE", "Għar Dalam: dwarf elephants and hippos", "#bfe3ff", "#eef8ff");
      for (let i = 0; i < 2; i++) emit({ kind: "glow", x: rand(0, W), y: -5, vy: S * 0.2, vx: rand(-20, 20), size: S * 0.008, life: 4, c: "rgba(255,255,255,1)" });
      X.fillStyle = "#5a6a7a";
      X.beginPath();
      X.ellipse(W / 2, CY + s * 0.5, W * 0.7, s * 0.65, 0, Math.PI, 0);
      fill("#6f7f8f");
      X.beginPath();
      X.ellipse(W / 2, CY + s * 0.5, W * 0.4, s * 0.42, 0, Math.PI, 0);
      fill("#1c242c");
      elephant(lerp(W * 0.15, W * 0.55, prog(t, LINES[30][0], tTemple)), CY + s * 0.4, s * 0.32, t);
    } else if (t < tPhoen) {
      eraCard(t, tTemple, "3600 BC", "Ġgantija: older than the pyramids", "#ffb36a", "#ffe1a8");
      X.fillStyle = "#b08a52";
      X.fillRect(0, CY + s * 0.32, W, H);
      trilithon(W / 2, CY + s * 0.34, s * 0.6 * pop(t, tTemple, 0.25));
    } else {
      eraCard(t, tPhoen, "800 BC", "The Phoenicians sail in", "#7fd3ff", "#d9f3ff");
      sea(CY + s * 0.25, t);
      ship(lerp(-W * 0.2, W * 0.55, easeOut(prog(t, tPhoen, tPhoen + 1.2))), CY + s * 0.2, s * 0.5, t);
    }
  });
  scene(120.718, (t, lt) => {
    const s = A;
    const tKnights = wordAt(31, "knights") - 0.1;
    const tSiege = wordAt(31, "siege") - 0.1;
    if (t < tKnights) {
      eraCard(t, LINES[31][0], "AD 60", "St Paul is shipwrecked", "#2a3a4a", "#4a5a6a");
      sea(CY + s * 0.25, t, "#2b4a5a", "#102030", false);
      ship(W / 2, CY + s * 0.2, s * 0.5, t * 3, "#d8ccb0", false);
      for (let i = 0; i < 6; i++) emit({ kind: "drop", x: rand(0, W * 1.2), y: -10, vx: -S * 0.3, vy: S * 1.6, size: 1.5, life: 0.8, c: "rgba(200,220,255,0.7)" });
      if (lt > 0.3 && lt < 0.42) {
        doFlash(0.5, "#dfe8ff");
        path([[W * 0.7, 0], [W * 0.64, H * 0.2], [W * 0.69, H * 0.2], [W * 0.6, H * 0.45]], false);
        stroke("#fff", 5);
      }
    } else if (t < tSiege) {
      eraCard(t, tKnights, "1530", "The Knights of St John arrive", C.red, "#8a0c20");
      const p = pop(t, tKnights, 0.3);
      X.save();
      X.translate(W / 2, CY + s * 0.08);
      X.scale(p, p);
      X.rotate((1 - Math.min(1, p)) * 2);
      path([[-s * 0.25, -s * 0.3], [s * 0.25, -s * 0.3], [s * 0.25, s * 0.05], [0, s * 0.32], [-s * 0.25, s * 0.05]]);
      fill(C.red);
      stroke("#fff", s * 0.02);
      maltaCross(0, -s * 0.02, s * 0.2, "#fff");
      X.restore();
    } else {
      eraCard(t, tSiege, "1565", "The Great Siege: they couldn't win", "#5a3a2a", "#c9a466");
      X.fillStyle = "#c9a466";
      X.fillRect(0, CY + s * 0.25, W, H);
      for (let x = 0; x < W; x += S * 0.06) X.fillRect(x, CY + s * 0.2, S * 0.035, s * 0.06);
      const fired = beatIndex(t) % 2;
      cannon(W * 0.25, CY + s * 0.18, s * 0.3, 1, fired);
      cannon(W * 0.75, CY + s * 0.18, s * 0.3, -1, 1 - fired);
      if (beatPhase(t) < 0.08) {
        emit({ kind: "smoke", x: W * (fired ? 0.4 : 0.6), y: CY + s * 0.02, vx: (fired ? 1 : -1) * S * 0.3, vy: -S * 0.1, size: S * 0.06, life: 1, drag: 2 });
        shake = Math.max(shake, 0.25);
      }
      stamp("BOOM!", W / 2, CY - s * 0.12, s * 0.12, t, tSiege + 0.3, C.gold, 0.1);
    }
  });
  scene(123.989, (t, lt) => {
    const s = A;
    const tFerry = wordAt(32, "ferry") - 0.1;
    if (t < tFerry) {
      eraCard(t, LINES[32][0], "1942", "The George Cross: for the whole island's courage", "#3a5a8a", "#9ab8e0");
      flag(W / 2, CY + s * 0.08, Math.min(W * 0.8, s * 0.9), Math.min(W * 0.8, s * 0.9) * 0.62, t, prog(t, wordAt(32, "shining"), wordAt(32, "shining") + 0.7));
    } else {
      eraCard(t, tFerry, "TODAY", "The Gozo ferry, honking in the bay", "#7fd3ff", "#d9f3ff");
      islandsSilhouette(CY + s * 0.15, "#b89a66", t, 0.6);
      sea(CY + s * 0.15, t);
      ferry(lerp(W * 1.2, W * 0.5, easeOut(prog(t, tFerry, tFerry + 0.8))), CY + s * 0.2, s * 0.5, t);
      const tHonk = wordAt(32, "honking");
      if (t > tHonk) {
        for (let i = 0; i < 3; i++) {
          const k = ((t - tHonk) * 2 + i / 3) % 1;
          X.globalAlpha = 1 - k;
          circle(W * 0.5 + s * 0.06, CY - s * 0.08, s * (0.04 + k * 0.25), null, "#fff", 4);
          X.globalAlpha = 1;
        }
        stamp("HONK!", W * 0.5 + s * 0.3, CY - s * 0.05, s * 0.12, t, tHonk, C.red, 0.15);
      }
    }
  });
  // Every stone has got a story: the wall lights up, a Ħarsi in every stone.
  scene(127.66, (t, lt) => {
    bg("#140c06");
    const cols = PORTRAIT ? 4 : 7;
    const rows = PORTRAIT ? 6 : 4;
    const cw = W / cols;
    const ch = (H * 0.86) / rows;
    const r = rng(77);
    for (let row = 0; row < rows; row++) {
      for (let c = 0; c < cols; c++) {
        const i = row * cols + c;
        const x = c * cw + (row % 2 ? cw * 0.15 : 0);
        const y = row * ch;
        rr(x + 3, y + 3, cw - 6, ch - 6, cw * 0.12);
        const lit = lt > 0.15 + (i / (rows * cols)) * 3.4;
        const tone = 190 + Math.floor(r() * 40);
        fill(lit ? `rgb(${tone + 40},${tone + 10},${tone - 50})` : `rgb(${tone - 90},${tone - 110},${tone - 150})`);
        if (lit) {
          glowAt(x + cw / 2, y + ch / 2, Math.min(cw, ch) * 0.6, "rgba(255,210,120,0.7)", 0.35);
          spr(IDS[(i * 7 + 2) % IDS.length], x + cw / 2, y + ch / 2 - bounce(t + i * 0.07) * ch * 0.05, Math.min(cw, ch) * 0.8);
        }
      }
    }
  });
  // So pack a ftira, grab your net, and tell your nanna you'll be late.
  scene(132.527, (t, lt) => {
    const s = A;
    bg("#2f8f5b", "#1f6a42");
    X.fillStyle = dots("rgba(255,255,255,0.08)");
    X.fillRect(0, 0, W, H);
    const items = [
      [wordAt(34, "ftira"), (x, y, sz) => ftira(x, y, sz * 0.3), "FTIRA ✓"],
      [wordAt(34, "net"), (x, y, sz) => nassa(x, y, sz * 0.7, -0.3), "NET ✓"],
      [wordAt(34, "nanna"), (x, y, sz) => {
        circle(x, y - sz * 0.05, sz * 0.22, "#f2c9a0", C.ink, 3);
        circle(x, y - sz * 0.25, sz * 0.12, "#d8d8de", C.ink, 3);
        ell(x, y + sz * 0.05, sz * 0.05, sz * 0.03 + Math.abs(Math.sin(t * 14)) * sz * 0.02, "#5a1a1a");
        X.save();
        X.translate(x + sz * 0.25, y);
        X.rotate(Math.sin(t * 12) * 0.5);
        X.fillStyle = "#f2c9a0";
        X.fillRect(-sz * 0.02, -sz * 0.2, sz * 0.04, sz * 0.2);
        X.restore();
      }, "TELL NANNA ✓"],
    ];
    const n = items.length;
    items.forEach(([tt, draw, label], i) => {
      if (t < tt - 0.05) return;
      const p = pop(t, tt - 0.05, 0.25);
      const x = PORTRAIT ? W / 2 : W * ((i + 0.5) / n);
      const y = PORTRAIT ? H * (0.13 + i * 0.22) : CY;
      const sz = PORTRAIT ? Math.min(W * 0.4, H * 0.2) : Math.min(W / n, H * 0.5) * 0.9;
      X.save();
      X.translate(x, y);
      X.scale(p, p);
      draw(0, 0, sz);
      X.restore();
      txt(label, x, y + sz * 0.45, Math.min(sz * 0.14, S * 0.05), { c: "#fff", stroke: C.ink, sw: S * 0.008, sc: p });
    });
    stamp("LATE!", W / 2, H * 0.7, fitSize("LATE!", W * 0.5, S * 0.14), t, wordAt(34, "late"), C.gold, -0.12);
  });
  scene(136.037, (t) => buildUp(t, 136.037, 138.351, "red", true));
  chorus(138.351, [36, 37, 38], false);

  // 148.2 — "It all started with a…": the big build. Twenty seconds of hyperspace through every Ħarsi.
  scene(148.245, (t, lt) => {
    const T = 169.069 - 148.245;
    const k = prog(lt, 0, T);
    bg("#02040a");
    // Stars rushing past.
    X.save();
    X.translate(W / 2, H / 2);
    for (let i = 0; i < 160; i++) {
      const r = rng(i * 3);
      const a = r() * Math.PI * 2;
      const z = (r() + lt * (0.15 + k * 0.9)) % 1;
      const d = Math.pow(z, 3) * Math.hypot(W, H);
      const d0 = Math.pow(Math.max(0, z - 0.04 - k * 0.05), 3) * Math.hypot(W, H);
      X.strokeStyle = `rgba(${200 + Math.floor(r() * 55)},${200 + Math.floor(r() * 55)},255,${z})`;
      X.lineWidth = 1 + z * 3;
      X.beginPath();
      X.moveTo(Math.cos(a) * d0, Math.sin(a) * d0);
      X.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      X.stroke();
    }
    X.restore();
    // Every Ħarsi in the game, one after another, flying out at you.
    const per = Math.max(0.07, 0.35 - k * 0.28);
    const n = Math.floor(lt / per);
    for (let j = Math.max(0, n - 10); j <= n; j++) {
      const age = lt - j * per;
      if (age < 0) continue;
      const q = age / (per * 10);
      if (q > 1) continue;
      const r = rng(j * 7 + 1);
      const a = r() * Math.PI * 2;
      const dist = Math.pow(q, 2.2) * Math.hypot(W, H) * 0.6;
      spr(IDS[j % IDS.length], W / 2 + Math.cos(a) * dist, H / 2 + Math.sin(a) * dist, S * (0.04 + Math.pow(q, 2) * 0.5), { rot: (r() - 0.5) * q * 2, alpha: clamp(q * 4) });
    }
    // Madum tiles orbiting in a ring that tightens.
    X.save();
    X.translate(W / 2, H / 2);
    X.rotate(lt * (0.4 + k * 2));
    const ringR = S * (0.46 - k * 0.12);
    for (let i = 0; i < 12; i++) {
      X.save();
      X.rotate((i / 12) * Math.PI * 2);
      X.translate(ringR, 0);
      X.rotate(lt * 2);
      const ts = S * 0.06 * (1 + pulse(t) * 0.2);
      X.globalAlpha = 0.85;
      X.drawImage(TILES[["blue", "red", "green"][i % 3]], -ts / 2, -ts / 2, ts, ts);
      X.restore();
    }
    X.restore();
    // The heart of it, growing brighter on every beat.
    const heart = S * (0.05 + k * 0.12) * (1 + pulse(t) * 0.25);
    glowAt(W / 2, H / 2, heart * 5, "rgba(255,201,60,1)", 0.4 + k * 0.6);
    star(W / 2, H / 2, heart, lt * 2, "#fff");
    // The words, one by one, swelling.
    const words = ["IT", "ALL", "STARTED", "WITH", "A…"];
    const shown = Math.min(words.length, Math.floor(lt / 1.6) + 1);
    const line = words.slice(0, shown).join(" ");
    const size = fitSize(line, W * 0.8, S * (0.07 + k * 0.05), { f: FT });
    txt(line, W / 2, H * 0.78, size, { f: FT, c: C.cream, stroke: C.red, sw: size * 0.06, sc: 1 + pulse(t) * 0.04 });
    if (lt > T - 3) shake = Math.max(shake, prog(lt, T - 3, T) * 0.6);
    // A rising white-out into the final shout.
    X.fillStyle = `rgba(255,255,255,${easeIn(prog(lt, T - 1.4, T)) * 0.9})`;
    X.fillRect(0, 0, W, H);
  });

  // 169.1 — ĦARSI! The finale.
  scene(169.069, (t, lt) => {
    bg(C.ink);
    rays(W / 2, H * 0.42, 24, lt * 0.3, "rgba(200,16,46,0.55)", "#16305a");
    X.fillStyle = tileFill("night", S * 0.14, lt * 20, lt * 10);
    X.globalAlpha = 0.25;
    X.fillRect(0, 0, W, H);
    X.globalAlpha = 1;
    if (R() < 0.18) firework(rand(W * 0.1, W * 0.9), rand(H * 0.08, H * 0.4), pick(["#ffd23c", "#ff5c8a", "#7fe0ff", "#9be15d", "#ffffff"]));
    // The three partners, out front.
    STARTERS.forEach((id, i) => {
      const x = W / 2 + (i - 1) * Math.min(W * 0.3, S * 0.32);
      const p = pop(t, 169.069 + 1.2 + i * 0.15, 0.3);
      spr(id, x, H * (PORTRAIT ? 0.72 : 0.74) - bounce(t + i * 0.2) * S * 0.03, S * 0.24 * p, { flip: i === 2 });
    });
    const a = pop(t, 169.069 + 1.6, 0.3);
    const size = fitSize("A MALTESE TALE", W * 0.86, S * 0.09, { f: FT });
    txt("A MALTESE TALE", W / 2, H * (PORTRAIT ? 0.52 : 0.55), size, { f: FT, c: C.cream, stroke: C.blue, sw: size * 0.1, sc: a });
  });

  /** The giant ĦARSI! that lands on every shout, over whatever is playing. */
  function drawHit(t) {
    for (const h of HITS) {
      const age = t - h;
      const final = h === HITS[HITS.length - 1];
      const life = final ? 99 : 1.6;
      if (age < 0 || age > life) continue;
      const out = final ? 0 : prog(age, 1.15, 1.6);
      X.save();
      X.globalAlpha = 1 - out;
      if (age < 0.9 && !final) {
        X.globalAlpha = (1 - out) * (1 - prog(age, 0.5, 0.9)) * 0.85;
        rays(W / 2, H * 0.45, 20, age * 1.5, "rgba(255,201,60,0.6)", "rgba(200,16,46,0.9)");
        X.globalAlpha = 1 - out;
      }
      // A ring of madum tiles bursting outward.
      X.save();
      X.translate(W / 2, H * 0.42);
      X.rotate(age * 1.4);
      const rr2 = S * (0.18 + easeOut(clamp(age / 0.5)) * 0.28);
      for (let i = 0; i < 10; i++) {
        X.save();
        X.rotate((i / 10) * Math.PI * 2);
        X.translate(rr2, 0);
        X.rotate(-age * 3);
        const ts = S * 0.075;
        X.drawImage(TILES[["red", "blue"][i % 2]], -ts / 2, -ts / 2, ts, ts);
        X.restore();
      }
      X.restore();
      // Starters flying out of the burst.
      if (!final) {
        STARTERS.concat(IDS.slice(10, 13)).forEach((id, i) => {
          const a = (i / 6) * Math.PI * 2 + 0.4;
          const d = easeOut(clamp(age / 0.8)) * S * 0.42;
          spr(id, W / 2 + Math.cos(a) * d, H * 0.42 + Math.sin(a) * d * 0.8, S * 0.13 * clamp(age * 4), { rot: age * 3 * (i % 2 ? 1 : -1) });
        });
      }
      const size = fitSize("ĦARSI!", W * 0.86, S * 0.3, { f: FT });
      const sc = age < 0.22 ? lerp(2.6, 1, easeOut(age / 0.22)) : 1 + Math.sin(age * 12) * 0.02 * (1 - clamp(age)) + pulse(t) * 0.04;
      const g = X.createLinearGradient(0, H * 0.42 - size / 2, 0, H * 0.42 + size / 2);
      g.addColorStop(0, "#fff3b0");
      g.addColorStop(0.5, C.gold);
      g.addColorStop(1, "#f08a1a");
      txt("ĦARSI!", W / 2, H * (final ? 0.36 : 0.42), size, { f: FT, c: g, stroke: C.red, sw: size * 0.09, sc: sc * (out ? 1 + out * 0.6 : 1), shadow: "rgba(0,0,0,0.55)" });
      X.restore();
    }
  }

  // Scenes that open with a whoosh rather than a hard cut.
  for (const sc of SCENES) sc.wipe = sc.wipe ?? (R() < 0.5 ? 1 : -1);

  // ─── Colour helper ─────────────────────────────────────────────────────────────────────────

  function lerpColor(a, b, k) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp(pa >> 16, pb >> 16, k));
    const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, k));
    const bl = Math.round(lerp(pa & 255, pb & 255, k));
    return `rgb(${r},${g},${bl})`;
  }

  let grainPattern = null;

  // ─── Frame ─────────────────────────────────────────────────────────────────────────────────

  function sceneAt(t) {
    let current = SCENES[0];
    let next = null;
    for (let i = 0; i < SCENES.length; i++) {
      if (SCENES[i].t0 <= t) {
        current = SCENES[i];
        next = SCENES[i + 1] || null;
      }
    }
    return { current, next };
  }

  function render(t) {
    X.setTransform(DPR, 0, 0, DPR, 0, 0);
    X.globalAlpha = 1;
    X.globalCompositeOperation = "source-over";
    const { current } = sceneAt(t);
    const lt = t - current.t0;
    X.save();
    // Camera: shake on the big hits, a little zoom-punch on every beat.
    const shk = shake * shake * S * 0.03;
    const punch = 1 + pulse(t) * 0.012;
    X.translate(W / 2 + rand(-shk, shk), H / 2 + rand(-shk, shk));
    X.scale(punch, punch);
    X.translate(-W / 2, -H / 2);
    current.draw(t, lt);
    drawFx();
    X.restore();
    drawHit(t);
    drawLyrics(t);
    // The cut: a quick slash of colour into each new scene.
    if (lt < 0.22 && current.t0 > 1) slash(0.5 + lt / 0.44, ["#ffc93c", "#c8102e", "#ffffff", "#1f4e8c"][Math.floor(current.t0) % 4], current.wipe);
    if (flash.a > 0) {
      X.fillStyle = flash.c;
      X.globalAlpha = flash.a;
      X.fillRect(0, 0, W, H);
      X.globalAlpha = 1;
    }
    // Vignette and grain: the film look.
    if (!vignette) {
      // Drawn once, small, and stretched: a soft gradient doesn't need the pixels.
      vignette = document.createElement("canvas");
      vignette.width = 160;
      vignette.height = Math.max(1, Math.round((160 * H) / W));
      const g = vignette.getContext("2d");
      const vw = vignette.width, vh = vignette.height;
      const v = g.createRadialGradient(vw / 2, vh / 2, (Math.min(vw, vh)) * 0.4, vw / 2, vh / 2, Math.hypot(vw, vh) * 0.62);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(0,0,0,0.42)");
      g.fillStyle = v;
      g.fillRect(0, 0, vw, vh);
      grainPattern = X.createPattern(grain, "repeat");
    }
    X.drawImage(vignette, 0, 0, W, H);
    X.globalAlpha = 0.5;
    X.fillStyle = grainPattern;
    X.save();
    X.translate(rand(0, 192), rand(0, 192));
    X.fillRect(-192, -192, W + 384, H + 384);
    X.restore();
    X.globalAlpha = 1;
  }

  // ─── Clock and controls ────────────────────────────────────────────────────────────────────

  const audio = document.getElementById("song");
  const params = new URLSearchParams(location.search);
  const embedded = params.get("embed") === "1";
  const shot = params.has("shot") ? parseFloat(params.get("shot")) : null;
  const ui = {
    start: document.getElementById("start"),
    end: document.getElementById("end"),
    play: document.getElementById("play"),
    skip: document.getElementById("skip"),
    skipStart: document.getElementById("skip-start"),
    begin: document.getElementById("begin"),
    beginLabel: document.getElementById("begin-label"),
    again: document.getElementById("again"),
    loading: document.getElementById("loading"),
    bar: document.getElementById("bar"),
  };
  if (!embedded) ui.beginLabel.textContent = "Play A Maltese Tale";
  if (params.has("vol")) audio.volume = clamp(parseFloat(params.get("vol")) || 0);
  if (embedded) ui.skipStart.classList.remove("hidden");

  let playing = false;
  let ended = false;
  let lastT = 0;
  let base = 0;
  let stamp0 = 0;
  let lastAudio = -1;
  let eventCursor = 0;

  function clockNow(now) {
    if (shot !== null) return shot;
    if (!playing) return audio.currentTime || 0;
    const a = audio.currentTime;
    if (a !== lastAudio) {
      lastAudio = a;
      base = a;
      stamp0 = now;
    }
    return Math.min(base + (now - stamp0) / 1000, a + 0.3);
  }

  function resetTo(t) {
    parts = [];
    rings = [];
    flash.a = 0;
    shake = 0;
    EVENTS.sort((a, b) => a.t - b.t);
    eventCursor = EVENTS.findIndex((e) => e.t >= t);
    if (eventCursor < 0) eventCursor = EVENTS.length;
    lastT = t;
  }

  function step(t) {
    let dt = t - lastT;
    if (dt < -0.5 || dt > 1) {
      resetTo(t);
      dt = 0;
    }
    dt = clamp(dt, 0, 0.05);
    while (eventCursor < EVENTS.length && EVENTS[eventCursor].t <= t) EVENTS[eventCursor++].f();
    updateFx(dt);
    lastT = t;
  }

  function frame(now) {
    const t = clockNow(now);
    step(t);
    render(t);
    ui.bar.style.width = `${(clamp(t / SONG_END) * 100).toFixed(2)}%`;
    if (playing && !ended && (t >= SONG_END - 2.6 || audio.ended)) showEnd();
    if (shot === null) requestAnimationFrame(frame);
  }

  function finish() {
    audio.pause();
    if (embedded && window.parent !== window) window.parent.postMessage({ type: "maltese-intro-done" }, "*");
    else location.href = "../";
  }

  function showEnd() {
    ended = true;
    ui.end.classList.remove("hidden");
    ui.skip.classList.add("hidden");
  }

  function play(from = 0) {
    ended = false;
    ui.end.classList.add("hidden");
    ui.start.classList.add("hidden");
    ui.skip.classList.remove("hidden");
    audio.currentTime = from;
    resetTo(from);
    lastAudio = -1;
    const started = audio.play();
    playing = true;
    if (started && started.catch) {
      started.catch(() => {
        // The browser wants a tap first.
        playing = false;
        ui.start.classList.remove("hidden");
        ui.skip.classList.add("hidden");
      });
    }
  }

  audio.addEventListener("ended", () => {
    if (!ended) showEnd();
  });
  ui.play.addEventListener("click", () => play(parseFloat(params.get("t") || "0") || 0));
  ui.again.addEventListener("click", () => play(0));
  ui.begin.addEventListener("click", finish);
  ui.skip.addEventListener("click", finish);
  ui.skipStart.addEventListener("click", finish);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") finish();
    if (e.key === " " && playing) {
      e.preventDefault();
      if (audio.paused) audio.play();
      else audio.pause();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) lastAudio = -1;
  });

  // Fonts and art first, so the very first frame is right.
  const ready = Promise.all([
    loadSprites(),
    document.fonts ? Promise.all(["900 40px \"Alegreya Sans\"", "800 40px Cinzel", "700 40px Cinzel"].map((f) => document.fonts.load(f).catch(() => null))) : Promise.resolve(),
    new Promise((resolve) => {
      if (audio.readyState >= 2) resolve();
      audio.addEventListener("canplay", resolve, { once: true });
      setTimeout(resolve, 6000);
    }),
  ]);
  ready.then(() => {
    ui.loading.classList.add("hidden");
    ui.loading.style.display = "none";
    ui.play.classList.remove("hidden");
    if (shot !== null) {
      ui.start.style.display = "none";
      // Run the effects up to the requested moment, then draw it.
      resetTo(Math.max(0, shot - 1.5));
      for (let t = Math.max(0, shot - 1.5); t < shot; t += 1 / 60) step(t);
      step(shot);
      render(shot);
      document.body.dataset.ready = "1";
      return;
    }
    if (params.get("autoplay") === "1") play(parseFloat(params.get("t") || "0") || 0);
    document.body.dataset.ready = "1";
  });
  requestAnimationFrame((now) => {
    resetTo(0);
    if (shot === null) frame(now);
  });
})();
