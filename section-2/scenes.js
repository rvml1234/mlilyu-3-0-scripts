// Webflow build of Section sample 2 (2026-11-17), from rv1-midnight-layer-scroll-interaction v185 (the local prototype, unchanged).
// Served by jsDelivr from github.com/rvml1234/mlilyu-3-0-scripts. The only change: images and textures the script loads itself
// come from this script's own folder (MLILY_S2_BASE), so the page can live on Webflow. The scroll frames' address is the
// canvas's data-src in the page markup.
const MLILY_S2_BASE = (document.currentScript && document.currentScript.src) ? new URL('./', document.currentScript.src).href : './';
gsap.registerPlugin(ScrollTrigger);

const NS = 'http://www.w3.org/2000/svg';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = gsap.utils.clamp(0, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
// t (0..1) with an eased start: quadratic up to t0, then straight on to 1 (value and slope stay continuous).
const softStart = (t, t0) => {
  const c = 1 / (2 * t0 - t0 * t0);
  return t < t0 ? c * t * t : c * (2 * t0 * t - t0 * t0);
};

// Showroom floor plan, shared by the 3D and flat floors (plan units, 1 = 1 cm): 4 rows x 8 beds, keys are "row-col".
// A smaller 12-bed floor was tried on 2026-11-04 and rolled back; to try one again, list the keys to keep in FLOOR_ONLY.
const FLOOR_ROWS = [140, 500, 860, 1220];
const FLOOR_COLS = [140, 390, 640, 890, 1320, 1570, 1820, 2070];
const FLOOR_ONLY = null;
const floorBeds = () => FLOOR_ROWS.flatMap((y, r) => FLOOR_COLS.map((x, c) => ({ x, y, key: `${r}-${c}` })))
  .filter((b) => !FLOOR_ONLY || FLOOR_ONLY.has(b.key));

// One plain bed in the showroom's plan style, shared by the flat floor and the 3D floor's plain beds (plan units =
// cm). (x, y) is the frame's top-left corner, head at the top: a soft light pool and shadow, a headboard bar, a hairline
// frame, the mattress with a stitched quilting line, a folded throw in Good Blue at the foot and two puffy pillows.
// Presentation attributes are inline so the same markup also renders on its own as an image (the 3D floor's texture);
// the flat floor's CSS state rules (.is-lit, .is-current, .is-mlily) still override them.
const BED_DEFS = '<radialGradient id="bedSpot"><stop offset="0" stop-color="#ffffff" stop-opacity="0.09"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>'
  + '<filter id="bedShadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>';
const bedGlyph = (x, y, { pool = true } = {}) => [
  pool ? `<ellipse class="bed__spot" cx="${x + 85}" cy="${y + 118}" rx="200" ry="225" fill="url(#bedSpot)"/>` : '',
  pool ? `<rect class="bed__shadow" x="${x + 6}" y="${y + 10}" width="170" height="220" rx="16" fill="#000000" fill-opacity="0.16" filter="url(#bedShadow)"/>` : '',
  `<rect class="bed__head" x="${x - 3}" y="${y - 20}" width="176" height="13" rx="6.5" fill="#ffffff" fill-opacity="0.2"/>`,
  `<rect class="bed__frame" x="${x}" y="${y}" width="170" height="220" rx="14" fill="#ffffff" fill-opacity="0.03" stroke="#ffffff" stroke-opacity="0.26" stroke-width="2"/>`,
  `<rect class="bed__top" x="${x + 8}" y="${y + 9}" width="154" height="202" rx="12" fill="#ffffff" fill-opacity="0.075" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1.2"/>`,
  `<rect class="bed__stitch" x="${x + 17}" y="${y + 18}" width="136" height="184" rx="8" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1" stroke-dasharray="3 4"/>`,
  `<rect class="bed__throw" x="${x + 8}" y="${y + 150}" width="154" height="30" fill="#a4c8e1" fill-opacity="0.13"/>`,
  `<line class="bed__throw" x1="${x + 8}" y1="${y + 150}" x2="${x + 162}" y2="${y + 150}" stroke="#a4c8e1" stroke-opacity="0.4" stroke-width="1.2"/>`,
  `<rect class="bed__pillow" x="${x + 18}" y="${y + 20}" width="62" height="32" rx="13" fill="#ffffff" fill-opacity="0.2" stroke="#ffffff" stroke-opacity="0.4" stroke-width="1"/>`,
  `<rect class="bed__pillow" x="${x + 90}" y="${y + 20}" width="62" height="32" rx="13" fill="#ffffff" fill-opacity="0.2" stroke="#ffffff" stroke-opacity="0.4" stroke-width="1"/>`,
].join('');

// A scene's local progress t (0..1) holds still for `lead` at the start and `hold` at the end; `anim` is the part in between.
const phase = (t, lead, hold) => ({
  anim: clamp01((t - lead) / Math.max(0.0001, 1 - lead - hold)),
  rest: hold > 0 ? clamp01((t - (1 - hold)) / hold) : 0,
});

// How far out along its spoke from a centre the point (x, y) has to go, as a multiple of where it is, to leave the box
// [l, r] × [t, b] around that same centre; 1 if it is outside already. (The medley orbit keeps photos off the headline.)
function spokeExit(x, y, l, r, t, b) {
  if (!x && !y) return 1;
  let enter = -Infinity;
  let exit = Infinity;
  if (x) { enter = Math.max(enter, Math.min(l / x, r / x)); exit = Math.min(exit, Math.max(l / x, r / x)); }
  else if (l >= 0 || r <= 0) return 1;
  if (y) { enter = Math.max(enter, Math.min(t / y, b / y)); exit = Math.min(exit, Math.max(t / y, b / y)); }
  else if (t >= 0 || b <= 0) return 1;
  return enter < 1 && exit > 1 ? exit : 1;
}

// Lenis smooth scroll on desktop devices only (Ramir, 2026-11-07): "should not work on tablet or mobile", but "should
// definitely still work on desktop, even at smaller sizes". So it goes by the device, not the width: a mouse or
// trackpad (a fine pointer that can hover) gets Lenis at any window size; touch tablets and phones get the browser's
// native scroll. It is created or destroyed if that changes (a mouse plugged into a tablet, say).
if (!reduceMotion && window.Lenis) {
  const desktop = matchMedia('(hover: hover) and (pointer: fine)');
  let lenis = null;
  const syncLenis = () => {
    if (desktop.matches && !lenis) {
      lenis = new Lenis({ autoRaf: false, lerp: 0.08 });
      lenis.on('scroll', ScrollTrigger.update);
    } else if (!desktop.matches && lenis) {
      lenis.destroy();
      lenis = null;
    }
    window.lenis = lenis;
  };
  syncLenis();
  desktop.addEventListener('change', syncLenis);
  gsap.ticker.add((time) => { if (lenis) lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
}

function initNav() {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return; // no top nav on the page (removed 2026-11-09)
  const intro = document.querySelector('[data-top-nav]');
  const setShown = (shown) => {
    nav.classList.toggle('is-shown', shown);
    nav.toggleAttribute('inert', !shown);
    nav.setAttribute('aria-hidden', String(!shown));
  };

  // The capsule appears once the intro nav's bottom edge passes the top of the screen, and leaves when it comes back.
  // Without an intro nav (the scenes-only prototype, 2026-11-05) it is simply always there.
  if (!intro) setShown(true);
  else {
    ScrollTrigger.create({
      trigger: intro,
      start: 'bottom top',
      end: 'max',
      onToggle: (self) => setShown(self.isActive),
    });
  }

  // Glass colour follows whichever section sits under the middle of the capsule.
  const bar = nav.querySelector('.nav-bar');
  const line = () => `${Math.round(nav.offsetTop + bar.offsetHeight / 2)}px`;
  document.querySelectorAll('[data-theme]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: () => `top ${line()}`,
      end: () => `bottom ${line()}`,
      onToggle: (self) => { if (self.isActive) nav.dataset.navTheme = section.dataset.theme; },
    });
  });
}

function splitWords(root) {
  const words = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) return walk(child);
      if (child.nodeType !== Node.TEXT_NODE) return;
      const frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.append(part);
        const span = document.createElement('span');
        span.textContent = part;
        frag.append(span);
        words.push(span);
      });
      child.replaceWith(frag);
    });
  };
  walk(root);
  return words;
}

function initStatement() {
  const text = document.querySelector('[data-statement]');
  if (!text || reduceMotion) return;
  gsap.fromTo(splitWords(text), { opacity: 0.16 }, {
    opacity: 1, ease: 'none', stagger: 0.08,
    scrollTrigger: { trigger: text, start: 'top 82%', end: 'bottom 48%', scrub: true },
  });
}

function sequenceScene(panel, { lead, hold }) {
  const canvas = panel.querySelector('[data-sequence]');
  const ctx = canvas.getContext('2d');
  const count = Number(canvas.dataset.frames);
  const digits = Number(canvas.dataset.digits);
  const focusX = Number(canvas.dataset.focusX || 0.5);
  const zoom = Number(canvas.dataset.zoom || 1);
  const url = (i) => `${canvas.dataset.src}${String(i + 1).padStart(digits, '0')}.${canvas.dataset.ext}`;
  const loaded = [];
  const requested = new Set();
  let want = 0;
  let drawn = -1;

  function request(i) {
    if (requested.has(i)) return;
    requested.add(i);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { loaded[i] = img; if (Math.abs(i - want) <= 2) paint(true); };
    img.src = url(i);
  }

  function nearest(i) {
    for (let d = 0; d < count; d++) {
      if (loaded[i - d]) return loaded[i - d];
      if (loaded[i + d]) return loaded[i + d];
    }
    return null;
  }

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; drawn = -1; }
  }

  function paint(force) {
    if (!force && want === drawn) return;
    const img = nearest(want);
    if (!img) return;
    fit();
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / img.width, ch / img.height) * zoom;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = Math.min(0, Math.max(cw - w, cw * focusX - w / 2));
    ctx.drawImage(img, x, (ch - h) / 2, w, h);
    drawn = want;
  }

  request(0);
  return {
    preload() { for (let i = 0; i < count; i++) request(i); },
    render(t) { want = Math.round(phase(t, lead, hold).anim * (count - 1)); paint(false); },
    resize() { drawn = -1; paint(true); },
  };
}

function floorScene(panel, { lead, hold }) {
  const svg = panel.querySelector('svg');
  const floor = panel.querySelector('.floor-plan__plane');
  const route = svg.querySelector('[data-route]');
  const glow = svg.querySelector('[data-route-glow]');
  const tip = svg.querySelector('[data-tip]');
  const bedLayer = svg.querySelector('[data-beds]');
  const dotLayer = svg.querySelector('[data-dots]');
  const [vbW, vbH] = svg.getAttribute('viewBox').split(' ').slice(2).map(Number);
  const centre = { x: vbW / 2, y: vbH / 2 };

  const beds = [];
  floorBeds().forEach(({ x, y, key }) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'bed');
    g.innerHTML = bedGlyph(x, y);
    bedLayer.append(g);
    beds.push({ g, key, origin: [x, y], card: [x + 85, y + 248], at: null, on: false });
  });

  const length = route.getTotalLength();
  [route, glow].forEach((p) => { p.style.strokeDasharray = `${length} ${length}`; p.style.strokeDashoffset = length; });
  const pointAt = (l) => route.getPointAtLength(Math.min(length, Math.max(0, l)));
  const samples = Array.from({ length: 601 }, (_, i) => { const l = (length * i) / 600; const p = route.getPointAtLength(l); return { l, x: p.x, y: p.y }; });
  const nearest = (x, y) => samples.reduce((best, s) => {
    const d = Math.hypot(s.x - x, s.y - y);
    return d < best.d ? { l: s.l, d } : best;
  }, { l: 0, d: Infinity });

  beds.forEach((b) => { const n = nearest(...b.card); if (n.d < 135) b.at = n.l / length; });
  const xs = samples.map((s) => s.x);
  const ys = samples.map((s) => s.y);
  const focus = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };

  const marks = [...panel.querySelectorAll('[data-label]')].map((el) => {
    const [x, y] = el.dataset.near.split(',').map(Number);
    const n = nearest(x, y);
    const pt = pointAt(n.l);
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('class', 'route__dot');
    dot.setAttribute('cx', pt.x);
    dot.setAttribute('cy', pt.y);
    dot.setAttribute('r', 9);
    dotLayer.append(dot);
    const inner = el.firstElementChild;
    gsap.set(inner, { autoAlpha: 0, y: 18 });
    return { el, inner, dot, bed: beds.find((b) => b.key === el.dataset.bed), at: n.l / length, on: false };
  });

  // The stop beds are MLILY mattresses: the white MLILY lockup at the foot of the top and a blue stripe like the Midnight piping.
  marks.forEach(({ bed }) => {
    const [x, y] = bed.origin;
    bed.g.classList.add('is-mlily');
    bed.g.insertAdjacentHTML('beforeend',
      `<rect class="bed__stripe" x="${x + 10}" y="${y + 198}" width="150" height="6" rx="3"/>`
      + `<image class="bed__logo" href="${MLILY_S2_BASE}assets/brand/mlily-mark-white.png" x="${x + 30}" y="${y + 150}" width="110" height="33.6" preserveAspectRatio="xMidYMid meet"/>`);
  });

  function place() {
    const box = panel.getBoundingClientRect();
    marks.forEach((m) => {
      const r = m.dot.getBoundingClientRect();
      m.el.style.transform = `translate(${r.left + r.width / 2 - box.left}px, ${r.top + r.height / 2 - box.top}px)`;
    });
  }

  let last = 0;
  function render(t) {
    last = t;
    const { anim } = phase(t, lead, hold);
    const at = anim * length;
    const offset = length - at;
    route.style.strokeDashoffset = offset;
    glow.style.strokeDashoffset = offset;

    const head = pointAt(at);
    tip.setAttribute('transform', `translate(${head.x.toFixed(1)} ${head.y.toFixed(1)})`);

    // Camera stays framed on the route and makes one slow push-in across the scene; it never chases the head.
    const scale = floor.clientWidth / vbW;
    floor.style.setProperty('--tx', `${((centre.x - focus.x) * scale).toFixed(1)}px`);
    floor.style.setProperty('--ty', `${((centre.y - focus.y) * scale).toFixed(1)}px`);
    floor.style.setProperty('--zoom', lerp(0.74, 0.88, smooth(t)).toFixed(4));
    floor.style.setProperty('--rz', `${lerp(-7, -3, smooth(t)).toFixed(2)}deg`);

    beds.forEach((b) => {
      if (b.at === null) return;
      const on = anim >= b.at;
      if (on !== b.on) { b.on = on; b.g.classList.toggle('is-current', on); }
    });

    place();
    marks.forEach((m) => {
      const on = anim >= m.at;
      if (on === m.on) return;
      m.on = on;
      m.bed.g.classList.toggle('is-lit', on);
      m.dot.classList.toggle('is-on', on);
      gsap.to(m.inner, on
        ? { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', overwrite: true }
        : { autoAlpha: 0, y: 18, duration: 0.3, ease: 'power2.in', overwrite: true });
    });
  }

  return { render, resize: () => render(last) };
}

// Scene 2 in real 3D (Three.js r147 classic build). It reuses the flat floor's plan coordinates (1 plan unit = 1 cm),
// its route string, stops and labels, so both versions tell the same story. Only the three MLILY stops are built (the
// plan's 29 plain beds are not drawn since 2026-11-05); they wear their real product covers (data-product on each
// label: midnight, wellflex-ice, chiropro), textured from MLILY's own product photos, at their real thickness. The
// room (2026-11-05): seen from the overhead camera, a cutaway plate with its left side cut off (the copy sits on the
// dark page there), midnight black walls (Ramir's call, so the page text stays white), tall steel windows with a city
// view in the right-hand wall, an ambientCG oak plank floor (assets/img/showroom/SOURCES.md), a partition that rises
// out of frame behind the beds, furniture kept to the nightstands and pendants, and sunlight through the windows and a
// clerestory. Earlier rooms:
// _archive/scene2-navy-showroom-v65-*, scene2-white-room-v71-*, scene2-frontal-midnight-v80-*, scene2-brand-wall-v89-*.
function floor3dScene(panel, { lead, hold }) {
  const T = window.THREE;
  const host = panel.querySelector('[data-floor3d]');
  const canvas = host.querySelector('canvas');
  // Phones and low-power devices get a lighter build: lower resolution, smaller shadow map, fewer curve steps.
  const lite = matchMedia('(max-width: 767px)').matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: lite ? 'default' : 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.75));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap; // with a blur radius on the key light (below)
  const aniso = Math.min(lite ? 2 : 8, renderer.capabilities.getMaxAnisotropy());
  const steps = lite ? 4 : 6;

  const scene = new T.Scene();
  scene.background = new T.Color(0x0b1016); // midnight beyond the room
  const camera = new T.PerspectiveCamera(30, 1, 0.1, 90);

  const toWorld = (x, y) => new T.Vector3((x - 1200) * 0.01, 0, (y - 880) * 0.01);
  const linear = (hex) => new T.Color(hex).convertSRGBToLinear();

  let raf = 0;
  let last = 0;
  const requestRender = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; placeCamera(last); applyLights(); renderer.render(scene, camera); placeLabels(); });
  };

  // Light: natural sunlight (Ramir, 2026-11-05: "mimic natural sunlight"). Sunlight reads as real through contrast,
  // so it is built from three parts:
  // 1. Sun: one warm directional light, low from the right (Ramir, 2026-11-05: "correct the sun light source"), that
  //    gets in through the right wall's windows only (set up with the room below), so it falls in as long window
  //    patches with mullion shadows across the floor, the beds and the partition. Whatever it misses is in shade.
  // 2. Skylight: a dim, slightly cool environment (the sky through the side windows), so the shade stays soft and
  //    readable, never flat.
  // 3. Bounce: a warm glow off the sunlit oak (part of the same environment), and baked occlusion where things meet
  //    (further down). No HDRI file: core three.js r147 has no HDR loader, so the sky is built here as glowing panels.
  {
    const pmrem = new T.PMREMGenerator(renderer);
    const env = new T.Scene();
    env.add(new T.Mesh(new T.BoxGeometry(18, 7, 18), new T.MeshBasicMaterial({ color: new T.Color(0.13, 0.135, 0.165), side: T.BackSide })));
    [
      { size: [12, 4.4], pos: [-8.9, 2.2, 2], rot: [0, Math.PI / 2, 0], rgb: [1.05, 1.15, 1.35] }, // sky through the windows, left (the building's shaded side)
      { size: [12, 4.4], pos: [8.9, 2.2, 2], rot: [0, -Math.PI / 2, 0], rgb: [1.95, 2.12, 2.5] }, // sky through the windows, right (the sun's side)
      { size: [16, 5], pos: [0, 1.8, 8.9], rot: [0, Math.PI, 0], rgb: [0.9, 0.96, 1.1] }, // sky, front
      { size: [12, 10], pos: [0, 3.45, 0], rot: [Math.PI / 2, 0, 0], rgb: [0.55, 0.58, 0.66] }, // soft overhead
      { size: [18, 18], pos: [0, -3.45, 0], rot: [-Math.PI / 2, 0, 0], rgb: [0.56, 0.4, 0.26] }, // warm bounce off the sunlit floor
    ].forEach(({ size, pos, rot, rgb }) => {
      const panelLight = new T.Mesh(new T.PlaneGeometry(...size), new T.MeshBasicMaterial({ color: new T.Color(...rgb), side: T.DoubleSide }));
      panelLight.position.set(...pos);
      panelLight.rotation.set(...rot);
      env.add(panelLight);
    });
    scene.environment = pmrem.fromScene(env, 0.035).texture;
    pmrem.dispose();
  }
  // The sun (key). Its direction and target, and the mask that keeps it to the windows, are set with the room, since
  // they need the set's position. Shadows are fairly crisp, as sunlight's are, softened a little by the PCF radius.
  const key = new T.DirectionalLight(0xffe4c2, 4.3); // a low sun: a little brighter than the old floor patches at 30 degrees (Ramir: "a bit more sunlight")
  scene.add(key.target);
  key.castShadow = true;
  key.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  key.shadow.radius = lite ? 2.5 : 4; // a sunlit penumbra: window shadows a few centimetres soft, as real sun's are at this distance
  Object.assign(key.shadow.camera, { left: -17, right: 17, top: 15, bottom: -15, near: 1, far: 60 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  // Textures drawn in code; the only download is the MLILY lockup.
  const canvasTexture = (size, draw, height = size) => {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = height;
    draw(c.getContext('2d'), size, height);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = aniso;
    return t;
  };
  // Real covers: flattened from MLILY's own product photos (Master Images 2026, see assets/img/beds/README.txt).
  const bedTex = (file) => {
    const t = new T.TextureLoader().load(`${MLILY_S2_BASE}assets/img/beds/${file}`, requestRender);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = aniso;
    return t;
  };
  const glowTex = canvasTexture(64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
  });

  const mat = (o) => new T.MeshStandardMaterial({ roughness: 0.9, ...o });
  let seed = 11;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Surfaces (realism pass, 2026-11-05; sources in assets/img/showroom/SOURCES.md). Each material has its own scan
  // and its own finish, so veneer, linen, cotton, paint, glaze and metal no longer read alike:
  // - ambientCG scans in assets/img/showroom/ambientcg/: nightstand veneer Wood068, linen Fabric066, base weave
  //   Fabric039, cotton Fabric019, paint relief PaintedPlaster004 (and the floor's WoodFloor051, set up with the floor). Colour maps are sRGB; normal and roughness maps stay
  //   linear data. three.js r147 tiles all of a material's maps with one UV transform, so each set shares one repeat,
  //   chosen from the scan's real size (rounded slabs have UVs in metres).
  // - Soft parts and joinery are rounded, bevelled slabs, so their edges catch a gentle highlight; metal is metal.
  const ACG = 'ambientcg/';
  const surf = (file, repeat, srgb = false, rotation = 0) => {
    const t = new T.TextureLoader().load(`${MLILY_S2_BASE}assets/img/showroom/${file}`, requestRender);
    if (srgb) t.encoding = T.sRGBEncoding;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    if (Array.isArray(repeat)) t.repeat.set(repeat[0], repeat[1]);
    else t.repeat.set(repeat, repeat);
    t.rotation = rotation;
    t.anisotropy = aniso;
    return t;
  };
  // One scanned material: colour (optional), normal and roughness, all on the same repeat.
  const scan = (name, repeat, { color = true, rotation = 0 } = {}) => ({
    ...(color ? { map: surf(`${ACG}acg_${name}_color_512.jpg`, repeat, true, rotation) } : {}),
    normalMap: surf(`${ACG}acg_${name}_normal_512.jpg`, repeat, false, rotation),
    roughnessMap: surf(`${ACG}acg_${name}_rough_512.jpg`, repeat, false, rotation),
  });
  const v2 = (s) => new T.Vector2(s, s);
  // Fabric: a physical material with sheen, the soft grazing-angle glow of woven cloth.
  const fabric = (o, sheenHex, sheenRoughness = 0.75, sheen = 1) => new T.MeshPhysicalMaterial({ roughness: 1, sheen, sheenRoughness, sheenColor: linear(sheenHex), ...o });
  // Midnight paint: flat colour with the scanned paint relief and an eggshell roughness (~0.7, varying a little), so
  // the sun reads on it as paint, never as dirt. w, h = the surface's size in metres when its UVs run 0..1.
  const PAINT_TILE = 1.4;
  const paint = (w, h, extra = {}) => mat({ color: linear(0x101820), ...scan('paintedplaster004', [w / PAINT_TILE, h / PAINT_TILE], { color: false }), normalScale: v2(0.22), roughness: 1, ...extra });
  const VENEER_TILE = 0.4; // Wood068 covers about 0.4 m
  // The room's palette: midnight black walls and joinery, an oak floor, light veneer, ivory and linen, with charcoal kept
  // to the bed bases and the slim metal legs. Accents that would vanish on black are lighter: ivory pendant shades,
  // white vases.
  const M = {
    base: fabric({ ...scan('fabric039_weave', 1 / 0.25), normalScale: v2(0.6) }, 0x4a4b4f, 0.6), // tight charcoal weave
    head: fabric({ ...scan('fabric045_boucle_ivory', 1 / 0.35), normalScale: v2(0.7) }, 0xcfc6b8, 0.8, 0.8), // warm ivory bouclé (ambientCG Fabric045): fine, soft loops; low contrast so it reads as upholstery, not speckle
    baseWelt: mat({ color: linear(0x1b1c1f), roughness: 0.5 }), // the base's piping: a smooth, faintly glossy cord
    headWelt: mat({ color: linear(0xbdb3a3), roughness: 0.72 }), // the headboard's piping, a shade darker than the bouclé
    pillow: fabric({ ...scan('fabric019_cotton', 1 / 0.5), normalScale: v2(1.2), envMapIntensity: 0.85 }, 0xcfcac0, 0.6, 0.45), // cotton: little sheen, albedo below pure white so the sun never flattens it
    wall: mat({ color: linear(0x101820), roughness: 0.9 }), // midnight black (MLILY Accent Black #101820), Ramir 2026-11-05
    panel: mat({ color: linear(0x101820), roughness: 0.8 }), // the partition's ends and back
    gap: mat({ color: linear(0x040609), roughness: 1 }), // shadow-gap joints and recessed skirting, darker than the walls
    veneer: mat({ ...scan('wood068_veneer', 1 / VENEER_TILE), normalScale: v2(0.6), roughness: 1 }), // fine, straight-grained light veneer, satin lacquer (Ramir asked for a new finish, 2026-11-05)
    metal: mat({ color: linear(0x2c2f33), metalness: 1, roughness: 0.36 }), // powder-coated steel: crisp, controlled reflections
    steel: mat({ color: linear(0x1c1f23), roughness: 0.38, metalness: 0.45 }), // black steel window frames, a soft sheen on their edges
    plinth: mat({ color: linear(0x151517), roughness: 0.8 }),
    shade: mat({ color: linear(0xdcd5c9), roughness: 0.5, side: T.DoubleSide }), // matte ivory ceramic pendant shades
    ceramic: mat({ color: linear(0xe2dcd1), roughness: 0.2, side: T.DoubleSide }), // glossy glaze
    linen: mat({ color: linear(0xddd5c7), roughness: 0.9 }),
    paper: mat({ color: linear(0xe6e1d7), roughness: 0.85 }),
    leaf: mat({ color: 0xffffff, roughness: 0.55, side: T.DoubleSide }), // tinted per leaf (instance colours)
  };

  // The three MLILY stops. Each label names its product with data-product; a missing or unknown name falls back to
  // Midnight. h = thickness in metres (12", 14", 13").
  const PRODUCTS = {
    midnight: { h: 0.305 },
    'wellflex-ice': { h: 0.356 },
    chiropro: { h: 0.33 },
  };

  const roundedRect = (w, d, r) => {
    const s = new T.Shape();
    const x = -w / 2;
    const y = -d / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r);
    s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d);
    s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  // A rounded slab sitting on y = 0: footprint w (x) by d (z), height h, soft bevelled edges.
  const slab = (w, d, h, r, bevel, segments = 3) => {
    const g = new T.ExtrudeGeometry(roundedRect(w - 2 * bevel, d - 2 * bevel, r), {
      depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segments, curveSegments: steps,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, bevel, 0);
    return g;
  };

  // A mattress slab with clean edges and photos that wrap without seams.
  // - Edges: each rounded top edge is split at 45 degrees. The upper half belongs to the top (top material, the top
  //   photo projected straight down, normals close to straight up); the lower half belongs to the side (normals close
  //   to horizontal). So the top shades like the top right up to the edge, the side like the side, and the rounded
  //   edge no longer catches extra light as a pale strip between them. Bottom edges go with the side.
  // - Sides: u runs round the perimeter in metres, v up the height. The front stretch (both foot corners + the foot
  //   face) is one pass of the foot photo, laid on by width as seen from the front (material 2); the right side has its own image that sweeps down from the
  //   raised border under the logo (material 3); the left side and back repeat the side strip (material 1).
  const STRIP_M = 0.37; // the side strip shows this many metres of the real cover
  const wrappedSlab = (w, d, h, r, bevel) => {
    const src = slab(w, d, h, r, bevel, 4);
    const pos = src.attributes.position;
    const uv = src.attributes.uv;
    const a = w / 2 - bevel - r;
    const b = d / 2 - bevel - r;
    const R = r + bevel;
    const arc = (Math.PI * R) / 2;
    // Perimeter stations, starting where the back-left corner meets the left side and running towards the foot.
    const S = { left: 0, lf: 2 * b, foot: 2 * b + arc, rf: 2 * b + arc + 2 * a };
    S.right = S.rf + arc;
    S.rb = S.right + 2 * b;
    S.back = S.rb + arc;
    S.lb = S.back + 2 * a;
    const P = S.lb + arc;
    const perim = (x, z) => {
      const cx = Math.min(a, Math.max(-a, x));
      const cz = Math.min(b, Math.max(-b, z));
      const dx = x - cx;
      const dz = z - cz;
      const e = 1e-6;
      if (Math.abs(dz) < e && dx < 0) return S.left + (cz + b);
      if (Math.abs(dx) < e && dz > 0) return S.foot + (cx + a);
      if (Math.abs(dz) < e && dx > 0) return S.right + (b - cz);
      if (Math.abs(dx) < e && dz < 0) return S.back + (a - cx);
      const t = Math.atan2(dz, dx); // 0 = +x, PI/2 = foot (+z), PI = -x, -PI/2 = head (-z)
      if (dx < 0 && dz > 0) return S.lf + R * (Math.PI - t);
      if (dx > 0 && dz > 0) return S.rf + R * (Math.PI / 2 - t);
      if (dx > 0 && dz < 0) return S.rb + R * -t;
      return S.lb + R * (-Math.PI / 2 - t);
    };
    // How far up the rounded edge a point is: 1 at the top cap, 0 on the straight wall, -1 at the bottom cap.
    const rise = (y) => (y > h - bevel ? Math.min(1, (y - (h - bevel)) / bevel) : y < bevel ? -Math.min(1, (bevel - y) / bevel) : 0);
    const outward = (x, z, v) => v.set(x - Math.min(a, Math.max(-a, x)), 0, z - Math.min(b, Math.max(-b, z))).normalize();
    const lists = [[], [], [], []];
    src.groups.forEach((grp) => {
      for (let i = grp.start; i < grp.start + grp.count; i += 3) {
        if (grp.materialIndex === 0) { lists[0].push([i, null, 'cap']); continue; }
        const up = (rise(pos.getY(i)) + rise(pos.getY(i + 1)) + rise(pos.getY(i + 2))) / 3;
        if (up > 0.7) { lists[0].push([i, null, 'edge']); continue; }
        const ss = [0, 1, 2].map((k) => perim(pos.getX(i + k), pos.getZ(i + k)));
        if (Math.max(...ss) - Math.min(...ss) > P / 2) ss.forEach((v, k) => { if (v < P / 2) ss[k] = v + P; });
        const mid = (ss[0] + ss[1] + ss[2]) / 3;
        lists[mid > S.lf && mid < S.right ? 2 : mid > S.right && mid < S.rb ? 3 : 1].push([i, ss, 'side']);
      }
    });
    const n = lists.reduce((sum, list) => sum + list.length, 0) * 3;
    const P3 = new Float32Array(n * 3);
    const N3 = new Float32Array(n * 3);
    const U2 = new Float32Array(n * 2);
    const out = new T.BufferGeometry();
    const nv = new T.Vector3();
    let o = 0;
    lists.forEach((list, m) => {
      out.addGroup(o, list.length * 3, m);
      list.forEach(([i, ss, kind]) => {
        for (let k = 0; k < 3; k++, o++) {
          const j = i + k;
          const x = pos.getX(j);
          const y = pos.getY(j);
          const z = pos.getZ(j);
          P3.set([x, y, z], o * 3);
          if (kind === 'cap') {
            nv.set(0, y > h / 2 ? 1 : -1, 0);
            U2.set([uv.getX(j), uv.getY(j)], o * 2);
          } else if (kind === 'edge') {
            const tilt = 0.3 * Math.min(1, Math.max(0, (1 - rise(y)) / 0.3));
            outward(x, z, nv).multiplyScalar(tilt).setY(1).normalize();
            U2.set([x, -z], o * 2); // same projection as the top cap
          } else {
            outward(x, z, nv).setY(0.3 * rise(y)).normalize();
            let u = ss[k] / STRIP_M;
            if (m === 2) u = (x + w / 2) / w; // the foot photo is a straight-on view: place it by width, so logos sit where they do on the product
            if (m === 3) u = (ss[k] - S.right) / (S.rb - S.right);
            U2.set([u, Math.min(1, Math.max(0, y / h))], o * 2);
          }
          N3.set([nv.x, nv.y, nv.z], o * 3);
        }
      });
    });
    out.setAttribute('position', new T.BufferAttribute(P3, 3));
    out.setAttribute('normal', new T.BufferAttribute(N3, 3));
    out.setAttribute('uv', new T.BufferAttribute(U2, 2));
    src.dispose();
    return out;
  };

  // ---- The floor: 32 beds (floorBeds()). Base, headboard and pillows are the same on every bed (one instanced mesh each) ----
  const mlilyKeys = new Set([...panel.querySelectorAll('[data-label]')].map((el) => el.dataset.bed));
  const beds = floorBeds().map(({ x, y, key }) => ({ key, pos: toWorld(x + 85, y + 110), mlily: mlilyKeys.has(key) }));

  const mx = new T.Matrix4();
  const instanced = (list, geo, material, offsets) => {
    const im = new T.InstancedMesh(geo, material, list.length * offsets.length);
    let i = 0;
    list.forEach((b) => offsets.forEach(([ox, oy, oz]) => { mx.makeTranslation(b.pos.x + ox, oy, b.pos.z + oz); im.setMatrixAt(i++, mx); }));
    im.castShadow = true;
    im.receiveShadow = true;
    scene.add(im);
    return im;
  };
  // Upholstery built like the real thing, not as sharp boxes (improved 2026-11-05, Ramir: "add improvement to the
  // mattress bases and headboards"):
  // - The base: a padded platform 4 cm proud of the mattress all round, tailored with a smooth dark piping cord along
  //   its top and bottom edges, floating on a deeper recessed plinth, so each bed sits on a crisp shadow line.
  // - The headboard: one padded panel (Ramir preferred it to a channel-tufted one), now plumper, with softly rounded
  //   corners, a few centimetres wider than the bed, in ivory bouclé with a piped edge; 0.98 m tall, 12 cm deep, its
  //   back 2 cm off the partition.
  const BASE = { w: 1.76, d: 2.26, y0: 0.06, top: 0.2 };
  const HEAD = { w: 1.86, h: 0.98, t: 0.12, z: -1.08 }; // z: its front face, from the bed's centre
  const baseGeo = slab(BASE.w, BASE.d, BASE.top - BASE.y0, 0.05, 0.02, 3);
  const plinthGeo = new T.BoxGeometry(BASE.w - 0.18, BASE.y0, BASE.d - 0.18);
  const headGeo = slab(HEAD.w, HEAD.h, HEAD.t, 0.1, 0.045, 4);
  headGeo.rotateX(-Math.PI / 2);
  headGeo.translate(0, HEAD.h / 2, 0);
  // Piping: a thin cord following a rounded rectangle, w x h with corner radius r, in the floor's plane ('xz') or upright ('xy').
  const piping = (w, h, r, plane, radius) => {
    const at = (a, b) => (plane === 'xz' ? new T.Vector3(a, 0, b) : new T.Vector3(a, b, 0));
    const hw = w / 2;
    const hh = h / 2;
    const run = [[-hw + r, -hh], [hw - r, -hh], [hw, -hh + r], [hw, hh - r], [hw - r, hh], [-hw + r, hh], [-hw, hh - r], [-hw, -hh + r]];
    const corner = [[hw, -hh], [hw, hh], [-hw, hh], [-hw, -hh]];
    const path = new T.CurvePath();
    for (let i = 0; i < 4; i++) {
      const [a0, b0] = run[2 * i];
      const [a1, b1] = run[2 * i + 1];
      const [n0, n1] = run[(2 * i + 2) % 8];
      path.add(new T.LineCurve3(at(a0, b0), at(a1, b1)));
      path.add(new T.QuadraticBezierCurve3(at(a1, b1), at(...corner[i]), at(n0, n1)));
    }
    return new T.TubeGeometry(path, lite ? 120 : 220, radius, 6, true);
  };
  const baseWeltGeo = piping(BASE.w - 0.022, BASE.d - 0.022, 0.045, 'xz', 0.007);
  const headWeltGeo = piping(HEAD.w - 0.05, HEAD.h - 0.05, 0.085, 'xy', 0.009);
  const bedFrame = (list) => {
    instanced(list, baseGeo, M.base, [[0, BASE.y0, 0]]);
    instanced(list, plinthGeo, M.plinth, [[0, BASE.y0 / 2, 0]]);
    instanced(list, baseWeltGeo, M.baseWelt, [[0, BASE.top - 0.008, 0], [0, BASE.y0 + 0.008, 0]]);
    instanced(list, headGeo, M.head, [[0, 0, HEAD.z]]);
    instanced(list, headWeltGeo, M.headWelt, [[0, HEAD.h / 2, HEAD.z - 0.02]]);
  };
  const stopBeds = beds.filter((b) => b.mlily);
  bedFrame(stopBeds);

  // A soft pillow: a puffy top and bottom that meet at a seam round the edge, long sides bowed out a little, corners
  // tucked in, and a slight lean back towards the headboard. a, b = half width/depth, t = thickness at the middle.
  // Built centred on its seam; more rows near the edge, where it curves fastest.
  const pillowGeometry = (a, b, t, segX = 32, segZ = 20) => {
    const pos = [];
    const uvs = [];
    const idx = [];
    const ease = (s) => Math.sin((s * Math.PI) / 2); // dense near the edges
    [1, -1].forEach((side) => {
      const base = pos.length / 3;
      for (let j = 0; j <= segZ; j++) {
        for (let i = 0; i <= segX; i++) {
          const u = ease(-1 + (2 * i) / segX);
          const v = ease(-1 + (2 * j) / segZ);
          const puff = Math.sqrt(Math.max(0, 1 - u ** 4)) * Math.sqrt(Math.max(0, 1 - v ** 4));
          // Soft creases, a few millimetres deep, strongest mid-face and gone at the seam.
          const crease = 0.006 * puff * (Math.sin(u * 5.3 + v * 2.1 + side) * Math.sin(v * 4.1 - u * 1.7) + 0.5 * Math.sin(u * 11 - v * 7));
          pos.push(u * a * (1 + 0.05 * (1 - v * v)), side * ((t / 2) * puff + crease), v * b * (1 + 0.08 * (1 - u * u)));
          uvs.push((u + 1) * a, (v + 1) * b);
        }
      }
      for (let j = 0; j < segZ; j++) {
        for (let i = 0; i < segX; i++) {
          const p0 = base + j * (segX + 1) + i;
          const p1 = p0 + segX + 1;
          if (side > 0) idx.push(p0, p1, p0 + 1, p0 + 1, p1, p1 + 1);
          else idx.push(p0, p0 + 1, p1, p0 + 1, p1 + 1, p1);
        }
      }
    });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.rotateX(0.12);
    g.computeVertexNormals();
    return g;
  };
  const PILLOW_T = 0.15;
  const pillowGeo = pillowGeometry(0.3, 0.17, PILLOW_T);
  const pillowY = (mattressTop) => mattressTop + PILLOW_T / 2 - 0.02; // sinks 2 cm into the mattress

  // The 29 plain beds are gone from the 3D floor (Ramir, 2026-11-05: remove the drawn beds); only the three MLILY
  // stops stand on it. The flat fallback (?floor=flat) still draws the whole plan.


  // MLILY stops: one mattress per product, its real cover photos wrapped onto it (top, foot face with tag, sweep,
  // piping and MLILY lockup, and the sides). The foot face glows a little when the route arrives.
  const W = 1.68;
  const D = 2.18;
  const PART_H = 30; // the partition rises past the top of every frame, phones included (Ramir: "raise the partition all the way to the top")
  const PART_SEEN = 18; // the most of it any frame shows (a phone at the start of the scroll sees about 17 m)
  const PART_OUT = 4; // and it runs on 4 m past each side wall, so the frame's top corners show wall, not sky
  const labelFor = Object.fromEntries([...panel.querySelectorAll('[data-label]')].map((el) => [el.dataset.bed, el.dataset.product]));
  beds.filter((b) => b.mlily).forEach((b) => {
    const key = PRODUCTS[labelFor[b.key]] ? labelFor[b.key] : 'midnight';
    const p = PRODUCTS[key];
    const g = new T.Group();
    g.position.copy(b.pos);
    const top = bedTex(`${key}-top.jpg`);
    top.repeat.set(1 / W, 1 / D); // top UVs are plan coordinates in metres; the photo spans the whole top, edges included
    top.offset.set(0.5, 0.5);
    const sideTex = bedTex(`${key}-side.jpg`);
    sideTex.wrapS = T.MirroredRepeatWrapping;
    const footTex = bedTex(`${key}-foot.jpg`);
    const glow = mat({ map: footTex, emissive: 0xffffff, emissiveMap: footTex, emissiveIntensity: 0 });
    const rightSide = mat({ map: bedTex(`${key}-rside.jpg`), roughness: 0.95 });
    const mattress = new T.Mesh(wrappedSlab(W, D, p.h, 0.06, 0.035), [mat({ map: top, roughness: 0.95 }), mat({ map: sideTex, roughness: 0.95 }), glow, rightSide]);
    mattress.position.y = 0.2;
    mattress.castShadow = true;
    mattress.receiveShadow = true;
    const pillows = [-0.4, 0.4].map((x) => {
      const m = new T.Mesh(pillowGeo, M.pillow);
      m.position.set(x, pillowY(0.2 + p.h), -0.78);
      m.castShadow = true;
      return m;
    });
    g.add(mattress, ...pillows);
    scene.add(g);
    b.mlilyParts = { g, glow };
  });

  // ---- The room (2026-11-05) ----
  // Midnight black walls with flat-panel joints, tall steel windows in the right-hand wall, an oak plank floor
  // (ambientCG WoodFloor051, see assets/img/showroom/SOURCES.md) and the MLILY set against its partition. The furniture
  // language first came from the CodeSandbox render Ramir chose ("Shopping" by drcmda).
  // The left side is cut away (Ramir, 2026-11-05: the space on the left felt "barren and unused"; "cut out that side",
  // after an architect's cutaway model he sent): the plate stops 1.5 m left of the route and shows its section against
  // the page's midnight, where the copy sits. x -1.6..10.8, z -8.4..8.4, walls 4 m, the left side and the front open.
  const ROOM = { x0: -1.6, x1: 10.8, z: 8.4, h: 4 };
  const ROOM_W = ROOM.x1 - ROOM.x0;
  const ROOM_CX = (ROOM.x0 + ROOM.x1) / 2;
  // The floor runs from the partition's back face (ZB, below) on past the camera to FLOOR_FRONT, so no camera position,
  // even the far one phones need, sees its front edge, and nothing shows behind the partition, not even past its cut
  // end. The occlusion and daylight canvases cover ZB..ROOM.z; beyond it the floor is plain.
  const FLOOR_FRONT = 60;
  const FLOOR_TILE = 3.6; // WoodFloor051 holds 24 rows of planks: laid at 3.6 m they are 15 cm wide, 0.6-1.8 m long

  // The layout first, so the baked occlusion below can be painted from it.
  const setBeds = beds.filter((b) => b.mlily).sort((a, b) => a.pos.x - b.pos.x);
  const setXs = setBeds.map((b) => b.pos.x);
  const SET = setBeds.length ? {
    x0: Math.min(...setXs) - 1.5, // the partition behind the set
    x1: Math.max(...setXs) + 1.5,
    back: Math.min(...setBeds.map((b) => b.pos.z)) - 1.22, // its front face; the headboards meet it
  } : null;
  const ends = SET ? [
    { x: Math.min(...setXs) - 0.87 - 0.3, z: setBeds[0].pos.z - 0.92 },
    { x: Math.max(...setXs) + 0.87 + 0.3, z: setBeds[0].pos.z - 0.92 },
  ] : [];
  // Furniture kept to a minimum (Ramir, 2026-11-05): the three beds with their nightstands and pendants, nothing else
  // on the floor, so the aisle and the space round every bed stay open. The room's shape comes from architecture
  // instead. The partition behind the beds runs the plate's whole width, cut edge to cut edge (Ramir: "it should
  // occupy the length of the room"), and rises out of every frame ("all the way to the top"), so nothing behind it
  // shows.
  // Pilasters stand on both side walls every 4 m from the partition's line, with a tall window in each bay in front.
  const PART_T = 0.16; // the partition's thickness
  const partZ = SET ? SET.back - PART_T / 2 : -ROOM.z + 4; // its centre line
  const ZB = partZ - PART_T / 2; // the floor's back edge: the partition's back face
  const FLOOR_D = FLOOR_FRONT - ZB;
  const AO_D = ROOM.z - ZB;
  const PILASTERS = [partZ, partZ + 4, partZ + 8].filter((z) => z < ROOM.z - 1);
  const PIL_HALF = 0.25; // a pilaster is 0.5 m along the wall
  const WIN = { y0: 0.45, y1: 3.55, inset: 0.18 }; // window sill and head heights; inset from the pilasters
  const SIDE_T = 0.3; // the side walls are 0.3 m thick, so the window openings show real depth
  // One window per bay in front of the partition (behind it is out of sight); the front bay stops 0.6 m short of the
  // walls' open ends.
  const BAYS = PILASTERS.map((z, i) => [z + PIL_HALF + WIN.inset, i + 1 < PILASTERS.length ? PILASTERS[i + 1] - PIL_HALF - WIN.inset : ROOM.z - 0.6])
    .filter(([a, b]) => b - a > 1.5);

  // ---- Sunlight: low from the right, through the right wall's windows ----
  // From the set towards the sun: right and a touch to the front, 30 degrees up (an afternoon sun). The right wall's
  // windows are on its side, so they throw long window patches across the floor towards the beds, onto the Chiropro
  // and its nightstand, and against the partition; the left wall's windows face away and let in skylight only. The
  // same sun also comes in from above, through a clerestory out of frame (below), and lands on Midnight and WellFlex.
  const sunAt = SET ? new T.Vector3((SET.x0 + SET.x1) / 2, 0, SET.back + 2) : new T.Vector3();
  const SUN_DIR = new T.Vector3(0.85, 0.5, 0.15).normalize();
  key.target.position.copy(sunAt);
  key.position.copy(sunAt).addScaledVector(SUN_DIR, 30);
  {
    // The sun's shadow camera, fitted to the room as the sun sees it: the floor out to past the camera, the walls and
    // the partition up to the most any frame shows. Everything visible is inside it (outside it, three.js r147 lights
    // a surface fully), and no shadow texels are spent beyond the room, so the window shadows stay crisp.
    const zAxis = SUN_DIR.clone();
    const xAxis = new T.Vector3(0, 1, 0).cross(zAxis).normalize();
    const yAxis = zAxis.clone().cross(xAxis);
    const xs = [];
    const ys = [];
    [ROOM.x0 - SIDE_T - PART_OUT, ROOM.x1 + SIDE_T + PART_OUT].forEach((x) => [0, PART_SEEN].forEach((y) => [partZ - PART_T, ROOM.z + 6].forEach((z) => {
      const d = new T.Vector3(x, y, z).sub(sunAt);
      xs.push(d.dot(xAxis));
      ys.push(d.dot(yAxis));
    })));
    Object.assign(key.shadow.camera, { left: Math.min(...xs) - 0.5, right: Math.max(...xs) + 0.5, bottom: Math.min(...ys) - 0.5, top: Math.max(...ys) + 0.5 });
    key.shadow.camera.updateProjectionMatrix();
  }
  {
    // The room has no ceiling, so on its own the sun would pour in over the walls. A big sheet square to the sun, between
    // it and the room, stops that: its material writes neither colour nor depth, so it is never seen, it only casts
    // shadows. (In three.js r147 the shadow pass skips objects the main camera can't see, so a hidden layer would not
    // work.) Its one opening is the right wall's window band: the windows' outline on the wall's outer face, a little
    // oversize, carried along the rays onto the sheet. That wall casts shadows, so it cuts the light to each window,
    // its reveals, mullions and transom.
    const SHEET = { w: 80, h: 80 };
    const sheet = new T.Shape();
    sheet.moveTo(-SHEET.w / 2, -SHEET.h / 2);
    sheet.lineTo(SHEET.w / 2, -SHEET.h / 2);
    sheet.lineTo(SHEET.w / 2, SHEET.h / 2);
    sheet.lineTo(-SHEET.w / 2, SHEET.h / 2);
    sheet.lineTo(-SHEET.w / 2, -SHEET.h / 2);
    const frame = new T.Mesh(undefined, new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: T.DoubleSide }));
    frame.position.copy(sunAt).addScaledVector(SUN_DIR, 20);
    frame.lookAt(sunAt);
    frame.updateMatrixWorld();
    // An opening in the sheet: a rectangle on a vertical plane x (from za to zb along the wall, ya to yb up it),
    // carried along the sun's rays onto the sheet.
    const opening = (x, za, zb, ya, yb) => {
      const pts = [[za, ya], [zb, ya], [zb, yb], [za, yb]].map(([z, y]) => {
        const at = new T.Vector3(x, y, z);
        return frame.worldToLocal(at.addScaledVector(SUN_DIR, frame.position.clone().sub(at).dot(SUN_DIR)));
      });
      const hole = new T.Path();
      hole.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((c) => hole.lineTo(c.x, c.y));
      hole.lineTo(pts[0].x, pts[0].y);
      sheet.holes.push(hole);
    };
    if (BAYS.length) opening(ROOM.x1 + SIDE_T + 0.05, BAYS[0][0] - 0.3, BAYS[BAYS.length - 1][1] + 0.3, WIN.y0 - 0.2, WIN.y1 + 0.2);
    // Overhead sunlight for the two left beds (Ramir, 2026-11-05: "expand the light to reach midnight ... overhead
    // sunlight", then "a bit more sunlight"): a clerestory window high above the right wall, out of frame: four tall
    // panes, from 4.25 m (its light clears the wall's top) to 7.4 m. At this sun its light lands across
    // Midnight and WellFlex, from the headboards nearly to the feet, past Midnight's nightstand, and on the partition
    // behind them; the floor in front of the route, under the "Floor cards" label, stays in shade, so that label reads
    // without any text shadow.
    if (SET) {
      const C = { x: ROOM.x1 + SIDE_T, z0: SET.back + 0.6, z1: SET.back + 3.9, y0: 4.25, y1: 7.4, panes: 4, bar: 0.08 };
      const pw = (C.z1 - C.z0) / C.panes;
      for (let i = 0; i < C.panes; i++) {
        const za = C.z0 + i * pw + (i ? C.bar / 2 : 0);
        const zb = C.z0 + (i + 1) * pw - (i < C.panes - 1 ? C.bar / 2 : 0);
        opening(C.x, za, zb, C.y0, C.y1); // tall panes, no transom: long bands of light across the beds
      }
    }
    frame.geometry = new T.ShapeGeometry(sheet);
    frame.castShadow = true;
    scene.add(frame);
  }

  const add = (geo, material, x, y, z, parent = scene, cast = true) => {
    const m = new T.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const lathe = (pts) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), lite ? 16 : 28);
  const withUv2 = (g) => { g.setAttribute('uv2', g.attributes.uv); return g; };

  // Baked ambient occlusion: the soft darkening where things meet, which is most of what makes a white room look real.
  // Painted once into small canvases from the layout above and applied as aoMaps, so it dims only the soft fill light
  // (the environment), never the key light, its shadows or the product photos.
  const aoTexture = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = Math.max(8, Math.round(h));
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, c.width, c.height);
    draw(x, c.width, c.height);
    const t = new T.CanvasTexture(c);
    t.anisotropy = aniso;
    return t;
  };
  // One soft footprint: the blurred shadow of a rectangle or ellipse (canvas px) drawn off-canvas, so only the blur lands.
  const occlude = (x, rx, ry, rw, rh, blur, alpha, round = false) => {
    x.save();
    x.shadowColor = `rgba(0,0,0,${alpha})`;
    x.shadowBlur = blur;
    x.shadowOffsetX = 20000;
    x.fillStyle = '#000';
    x.beginPath();
    if (round) x.ellipse(rx + rw / 2 - 20000, ry + rh / 2, rw / 2, rh / 2, 0, 0, Math.PI * 2);
    else x.rect(rx - 20000, ry, rw, rh);
    x.fill();
    x.restore();
  };

  // ---- Floor ----
  // Oak planks (Ramir, 2026-11-05: "stick with the wood floors", from ambientCG): WoodFloor051, a natural brushed oak
  // in random lengths, with its own normal map for the plank seams and a satin oil finish (roughness ~0.5) that takes
  // a soft sheen from the windows. 2K colour, so the grain stays crisp close to the camera.
  const floorTex = (file, srgb) => {
    const t = new T.TextureLoader().load(`${MLILY_S2_BASE}assets/img/showroom/${file}`, requestRender);
    if (srgb) t.encoding = T.sRGBEncoding;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(ROOM_W / FLOOR_TILE, FLOOR_D / FLOOR_TILE);
    t.anisotropy = aniso;
    return t;
  };
  // Floor occlusion, in floor UVs (canvas top = the partition): the partition, the beds, everything that stands on the
  // boards, and a wide gentle falloff away from the set. The left edge is an open cut, so it gets none.
  const floorAO = aoTexture(1024, (1024 * AO_D) / ROOM_W, (x, w, h) => {
    const k = w / ROOM_W;
    const X = (v) => (v - ROOM.x0) * k;
    const Z = (v) => (v - ZB) * k;
    occlude(x, 0, -6, w, 6, 0.5 * k, 0.6);
    occlude(x, w, -20, 6, h + 40, 0.5 * k, 0.55); // the right wall
    if (!SET) return;
    occlude(x, 0, Z(SET.back - PART_T), w, PART_T * k, 0.35 * k, 0.65); // the partition, wall to wall
    setBeds.forEach((b) => occlude(x, X(b.pos.x - BASE.w / 2), Z(b.pos.z - BASE.d / 2), BASE.w * k, BASE.d * k, 0.18 * k, 0.85)); // beds stand on the oak
    ends.forEach((e) => occlude(x, X(e.x - 0.25), Z(e.z - 0.2), 0.5 * k, 0.4 * k, 0.22 * k, 0.5));
    const cx = X((SET.x0 + SET.x1) / 2);
    const cz = Z(SET.back + 1.6);
    const g = x.createRadialGradient(cx, cz, 4 * k, cx, cz, 17 * k);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
  });
  // Daylight from the side windows, baked into the floor as a light map in the occlusion's layout: a soft pool in
  // front of each window, brightest about half a metre out and gone 3.6 m in, a touch cool, as skylight is. It sits
  // under the sun patches the shadow map draws through the windows. Nothing stands near the wall, so a bake is exact.
  const floorDay = (() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = Math.round((512 * AO_D) / ROOM_W);
    const x = c.getContext('2d');
    x.fillStyle = '#000';
    x.fillRect(0, 0, c.width, c.height);
    const k = c.width / ROOM_W;
    const REACH = 3.6;
    [[ROOM.x1, -1, 0.6]].forEach(([wall, into, power]) => BAYS.forEach(([a, b]) => {
      const x0 = (wall - ROOM.x0) * k;
      const x1 = x0 + into * REACH * k;
      const g = x.createLinearGradient(x0 - 20000, 0, x1 - 20000, 0); // drawn off-canvas: only its blurred shadow lands
      g.addColorStop(0, `rgba(255,255,255,${0.45 * power})`);
      g.addColorStop(0.14, `rgba(255,255,255,${power})`);
      g.addColorStop(0.45, `rgba(255,255,255,${0.38 * power})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.save();
      x.shadowColor = 'rgb(214,226,250)';
      x.shadowBlur = 0.45 * k;
      x.shadowOffsetX = 20000;
      x.fillStyle = g;
      x.fillRect(Math.min(x0, x1) - 20000, (a - 0.1 - ZB) * k, REACH * k, (b - a + 0.2) * k);
      x.restore();
    }));
    // Bounce (lighting pass, 2026-11-05): sunlit oak throws warm light back into the room, so each sun patch sits in a
    // faint warm glow on the floor around it instead of ending flat at its edge. Each opening is carried down the
    // sun's rays to the floor and painted there, blurred wide.
    const toFloor = (px, py, pz) => [px - (SUN_DIR.x * py) / SUN_DIR.y, pz - (SUN_DIR.z * py) / SUN_DIR.y];
    const glowAt = (pts, alpha) => {
      x.save();
      x.shadowColor = `rgba(255,214,170,${alpha})`;
      x.shadowBlur = 0.7 * k;
      x.shadowOffsetX = 20000;
      x.fillStyle = '#fff';
      x.beginPath();
      pts.forEach(([fx, fz], i) => (i ? x.lineTo : x.moveTo).call(x, (fx - ROOM.x0) * k - 20000, (fz - ZB) * k));
      x.closePath();
      x.fill();
      x.restore();
    };
    const footprint = (ox, za, zb, ya, yb) => [[za, ya], [zb, ya], [zb, yb], [za, yb]].map(([z, y]) => toFloor(ox, y, z));
    BAYS.forEach(([a, b]) => glowAt(footprint(ROOM.x1 + 0.2, a, b, WIN.y0, WIN.y1), 0.24));
    if (SET) glowAt(footprint(ROOM.x1 + SIDE_T, SET.back + 0.6, SET.back + 3.9, 4.25, 7.4), 0.16);
    return new T.CanvasTexture(c); // linear light, not a colour map; it shares the occlusion's UV transform
  })();
  // A soft, wide brightness variation (about 9 m across) breaks up the 3.6 m repeat over the big floor. It is
  // multiplied in the shader: three.js r147 maps share one UV transform, so it is sampled from the same UVs at a
  // fraction of the scale.
  const floorMat = new T.MeshStandardMaterial({
    map: floorTex(`${ACG}acg_woodfloor051_oak_color_2k.jpg`, true),
    normalMap: floorTex(`${ACG}acg_woodfloor051_oak_normal_1k.jpg`),
    normalScale: v2(1.6), // the scan's seams are shallow; a little deeper so the planks read from above
    roughnessMap: floorTex(`${ACG}acg_woodfloor051_oak_rough_1k.jpg`),
    roughness: 1,
    aoMap: floorAO,
    lightMap: floorDay,
    lightMapIntensity: 1.8, // enough to read as light from each window; the sun stays the brightest thing on the floor
  });
  const macro = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#808080';
    x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 70; i++) {
      const cx = rand() * 128;
      const cy = rand() * 128;
      const r = 14 + rand() * 30;
      const v = rand() < 0.5 ? '0,0,0' : '255,255,255';
      const a = 0.08 + rand() * 0.12;
      [-128, 0, 128].forEach((ox) => [-128, 0, 128].forEach((oy) => { // drawn wrapped, so the map tiles seamlessly
        const g = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r);
        g.addColorStop(0, `rgba(${v},${a})`);
        g.addColorStop(1, `rgba(${v},0)`);
        x.fillStyle = g;
        x.fillRect(cx + ox - r, cy + oy - r, 2 * r, 2 * r);
      }));
    }
    const t = new T.CanvasTexture(c); // linear: a data map, not a colour
    t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  })();
  floorMat.onBeforeCompile = (shader) => {
    shader.uniforms.macroMap = { value: macro };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\nuniform sampler2D macroMap;')
      .replace('#include <map_fragment>', `#include <map_fragment>\n  diffuseColor.rgb *= 0.9 + 0.2 * texture2D( macroMap, vUv * ${(FLOOR_TILE / 9).toFixed(3)} ).r;`);
  };
  const floorMesh = new T.Mesh(withUv2(new T.PlaneGeometry(ROOM_W, FLOOR_D)), floorMat);
  floorMesh.position.x = ROOM_CX;
  floorMesh.rotation.x = -Math.PI / 2; // planks run left to right, along the back wall, as in the reference
  floorMesh.position.z = (FLOOR_FRONT + ZB) / 2;
  // The occlusion canvas spans z = ZB..ROOM.z of the floor's ZB..FLOOR_FRONT (its own aoMap transform); clamped
  // beyond, so the right wall's soft edge runs on to the front.
  floorAO.wrapT = T.ClampToEdgeWrapping;
  floorAO.repeat.set(1, FLOOR_D / AO_D);
  floorAO.offset.set(0, 1 - FLOOR_D / AO_D);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);
  // The cut edge on the left: the plate's section, a dark slab with the oak boards' edge on top, like the cut floor of
  // an architect's model, seen against the page's midnight.
  {
    const SLAB = 0.45;
    const sectionMat = mat({ color: linear(0x1c2129), roughness: 0.9 });
    const boardsMat = mat({ color: linear(0x9a7a5c), roughness: 0.6 });
    [[ROOM.x0, 1]].forEach(([edge, inward]) => { // the open left edge (the right one has its wall)
      const section = new T.Mesh(new T.BoxGeometry(0.3, SLAB, FLOOR_D), sectionMat);
      section.position.set(edge + inward * 0.15, -SLAB / 2 - 0.003, floorMesh.position.z);
      scene.add(section);
      const boards = new T.Mesh(new T.BoxGeometry(0.012, 0.022, FLOOR_D), boardsMat);
      boards.position.set(edge + inward * 0.006, -0.011, floorMesh.position.z);
      scene.add(boards);
    });
  }

  // Plants: real leaf shapes (a pointed blade, folded along the midrib and curling back), one instanced mesh for the
  // whole room, each leaf a slightly different green.
  const leafGeo = (() => {
    const rows = lite ? 5 : 8;
    const pos = [];
    const idx = [];
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      const half = 0.34 * Math.sin(Math.PI * v ** 0.8);
      const z = 0.3 * v * v;
      pos.push(-half, v, z - 0.3 * half, 0, v, z, half, v, z - 0.3 * half);
      if (j < rows) {
        const a = j * 3;
        idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();
  const leaves = [];
  const plant = (x, y, z, n, size, spread) => {
    for (let i = 0; i < n; i++) {
      const q = new T.Quaternion().setFromEuler(new T.Euler(0.2 + rand() * spread, (i / n) * Math.PI * 2 + rand() * 0.7, 0, 'YXZ'));
      const len = size * (0.7 + rand() * 0.45);
      leaves.push({ m: new T.Matrix4().compose(new T.Vector3(x, y, z), q, new T.Vector3(len, len, len)), tone: rand() });
    }
  };

  // Soft contact shadows where small things rest on furniture (pillows on the mattresses, books and vases on the
  // nightstands): a blurred dark blob on the surface below, one instanced quad each. They give
  // the objects weight in the shade too, where the sun's shadow map does not reach. [x, y, z, w, d]
  const decals = [];
  const blobTex = canvasTexture(128, (x) => {
    x.fillStyle = '#000';
    x.fillRect(0, 0, 128, 128);
    x.shadowColor = '#fff';
    x.shadowBlur = 22;
    x.shadowOffsetX = 400;
    x.fillRect(26 - 400, 26, 76, 76);
  });

  // Shadow-gap joints: the thin dark lines that draw panels, doors and recessed skirting on the white surfaces. One
  // instanced mesh draws them all. A wall face runs along `along` ('x' or 'z'), sits at `at` and looks towards `face`.
  const gaps = []; // [x, y, z, sx, sy, sz]
  const GAP = 0.014;
  const joints = ({ along, at, face, from, to, h, every = 0, cuts = [], rails = [] }) => {
    const put = (u, y, du, dy) => {
      const c = at + face * 0.002;
      gaps.push(along === 'x' ? [u, y, c, du, dy, 0.004] : [c, y, u, 0.004, dy, du]);
    };
    put((from + to) / 2, 0.02, to - from, 0.04); // recessed skirting: a 4 cm shadow line along the floor
    rails.forEach((y) => put((from + to) / 2, y, to - from, GAP));
    const n = every ? Math.max(1, Math.round((to - from) / every)) : 0;
    const us = [...cuts, ...Array.from({ length: Math.max(0, n - 1) }, (_, i) => from + ((to - from) * (i + 1)) / n)];
    us.forEach((u) => put(u, (h + 0.04) / 2, GAP, h - 0.04));
  };

  // ---- Walls and windows ----
  // There is no back wall any more: the full-height partition is the room's back (the plate stops at it).
  joints({ along: 'z', at: ROOM.x1, face: -1, from: ZB, to: ROOM.z, h: ROOM.h }); // the right wall's recessed skirting
  // The right wall's windows (Ramir, 2026-11-05). Openings through the 0.3 m wall, glass 0.2 m back in black steel
  // frames, three tall panes a window and no transom, so the sun falls in as long, calm bands of light (the
  // clerestory's language). History: the first plain glass "never looked real" and the windows were hidden for a while
  // (wall and steel shadow-only, light kept); a city view and a bloom were tried and removed. Then Ramir asked to "try
  // realistic glass": see the glass, reveals and sills below.
  const GLASS_IN = 0.2;
  const sidePaint = paint(1, 1); // extruded walls have UVs in metres
  const bars = []; // window steel: [x, y, z, sx, sy, sz]
  const FRAME = 0.07; // outer frame
  const BAR = 0.05; // mullions: slim, but enough to draw a clean line in the sun
  const FD = 0.05; // frame depth
  [1].forEach((side) => { // the right wall; the left side of the plate is cut away
    const face = side < 0 ? ROOM.x0 : ROOM.x1;
    const u = (z) => (side < 0 ? z : -z); // the shape is drawn looking at the wall's room face
    const outline = new T.Shape();
    outline.moveTo(u(ZB), 0); // from the partition forward
    outline.lineTo(u(ROOM.z), 0);
    outline.lineTo(u(ROOM.z), ROOM.h);
    outline.lineTo(u(ZB), ROOM.h);
    outline.lineTo(u(ZB), 0);
    BAYS.forEach(([a, b]) => {
      const hole = new T.Path();
      hole.moveTo(u(a), WIN.y0);
      hole.lineTo(u(b), WIN.y0);
      hole.lineTo(u(b), WIN.y1);
      hole.lineTo(u(a), WIN.y1);
      hole.lineTo(u(a), WIN.y0);
      outline.holes.push(hole);
      const xf = face + side * (GLASS_IN - 0.015); // the steel, just room-side of the glass
      const w = b - a;
      const h = WIN.y1 - WIN.y0;
      const zc = (a + b) / 2;
      const yc = (WIN.y0 + WIN.y1) / 2;
      bars.push([xf, yc, a + FRAME / 2, FD, h, FRAME], [xf, yc, b - FRAME / 2, FD, h, FRAME]); // jambs
      bars.push([xf, WIN.y0 + FRAME / 2, zc, FD, FRAME, w], [xf, WIN.y1 - FRAME / 2, zc, FD, FRAME, w]); // sill and head
      const n = Math.max(1, Math.round(w / 1.05)); // three tall panes a window
      for (let i = 1; i < n; i++) bars.push([xf, yc, a + (w * i) / n, FD, h, BAR]); // mullions
    });
    const g = new T.ExtrudeGeometry(outline, { depth: SIDE_T, bevelEnabled: false, curveSegments: 1 });
    g.rotateY(side < 0 ? -Math.PI / 2 : Math.PI / 2); // shape (along, up, depth) -> world (z, y, outwards in x)
    g.translate(face, 0, 0);
    const wall = new T.Mesh(g, sidePaint);
    wall.receiveShadow = true;
    wall.castShadow = true; // the sun's side: it cuts the sunlight to the windows
    scene.add(wall);
  });
  const steelMesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), M.steel, bars.length);
  bars.forEach(([x, y, z, sx, sy, sz], i) => {
    mx.makeScale(sx, sy, sz).setPosition(x, y, z);
    steelMesh.setMatrixAt(i, mx);
  });
  steelMesh.receiveShadow = true;
  steelMesh.castShadow = true; // mullion shadows in the window light
  scene.add(steelMesh);
  // Fluted glass (Ramir, 2026-11-05: "Try realistic glass", then "a different glass", then "Use fluted" from four
  // options: clear, smoked, fluted, satin). Reeded panes, vertical ribs about 6 cm wide. Each rib bends the daylight
  // behind it (a brighter core, a dark seam), and a ribbed normal map makes the room's reflection run down the ribs.
  // As with any glass seen this obliquely, the reflection takes over at grazing angles and the light through it dims
  // (transmitted light is what the reflection leaves). The daylight behind is a cool sky over a bright, warm haze
  // with dim, out-of-focus trees, slightly green, as float glass is.
  const viewTex = canvasTexture(64, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#aebfcf'); // sky
    g.addColorStop(0.5, '#d9dfe0'); // haze at the horizon
    g.addColorStop(0.62, '#e0dacd'); // sunlit ground beyond
    g.addColorStop(1, '#c2baab');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    // Out-of-focus trees and the far side of the street: soft, dim masses below the horizon, nothing recognisable.
    for (let i = 0; i < 14; i++) {
      const cx = rand() * w;
      const cy = h * (0.5 + rand() * 0.32);
      const rx = w * (0.12 + rand() * 0.3);
      const ry = h * (0.04 + rand() * 0.08);
      x.save();
      x.translate(cx, cy);
      x.scale(1, ry / rx);
      const m = x.createRadialGradient(0, 0, 0, 0, 0, rx);
      m.addColorStop(0, `rgba(96,108,92,${0.28 + rand() * 0.22})`);
      m.addColorStop(1, 'rgba(96,108,92,0)');
      x.fillStyle = m;
      x.fillRect(-rx, -rx, 2 * rx, 2 * rx);
      x.restore();
    }
  }, 256);
  const ribs = (w) => Math.max(1, Math.round(w / 0.06)); // reeds about 6 cm wide
  const flutedView = canvasTexture(1024, (x, w, h) => {
    x.drawImage(viewTex.image, 0, 0, w, h); // the same view, seen through the reeds
    const n = ribs(3.1);
    const rw = w / n;
    for (let i = 0; i < n; i++) {
      const g = x.createLinearGradient(i * rw, 0, (i + 1) * rw, 0);
      g.addColorStop(0, 'rgba(40,46,52,0.34)');
      g.addColorStop(0.18, 'rgba(255,255,255,0.05)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.22)');
      g.addColorStop(0.82, 'rgba(255,255,255,0.05)');
      g.addColorStop(1, 'rgba(40,46,52,0.34)');
      x.fillStyle = g;
      x.fillRect(i * rw, 0, rw, h);
    }
  }, 256);
  const flutedNormal = (() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 4;
    const x = c.getContext('2d');
    const n = ribs(3.1);
    const img = x.createImageData(c.width, c.height);
    for (let px = 0; px < c.width; px++) {
      const ph = ((px / c.width) * n % 1) * 2 - 1; // -1..1 across a rib
      const nx = ph * 0.7;
      const nz = Math.sqrt(1 - nx * nx);
      for (let py = 0; py < c.height; py++) {
        const o = (py * c.width + px) * 4;
        img.data[o] = Math.round((nx * 0.5 + 0.5) * 255);
        img.data[o + 1] = 128;
        img.data[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        img.data[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    const t = new T.CanvasTexture(c); // linear data
    t.anisotropy = aniso;
    return t;
  })();
  const glassMat = new T.MeshPhysicalMaterial({
    color: 0x000000, metalness: 0, ior: 1.6, envMapIntensity: 1.5, roughness: 0.08, normalMap: flutedNormal, normalScale: v2(0.9),
    emissive: new T.Color(0.95, 0.99, 0.97), emissiveMap: flutedView, emissiveIntensity: 1.25,
  });
  glassMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
      'float glassFresnel = pow( 1.0 - saturate( dot( normal, geometry.viewDir ) ), 5.0 );\n\tvec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance * ( 1.0 - 0.75 * glassFresnel );',
    );
  };
  const glass = new T.InstancedMesh(new T.PlaneGeometry(1, 1), glassMat, BAYS.length);
  const paneTurn = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -Math.PI / 2); // facing into the room
  BAYS.forEach(([a, b], i) => {
    mx.compose(new T.Vector3(ROOM.x1 + GLASS_IN, (WIN.y0 + WIN.y1) / 2, (a + b) / 2), paneTurn, new T.Vector3(b - a, WIN.y1 - WIN.y0, 1));
    glass.setMatrixAt(i, mx);
  });
  glass.frustumCulled = false; // r147 culls instanced meshes by the base geometry's bounds, at the origin
  scene.add(glass);
  // The reveals: daylight from the glass spills onto the jambs and the head, brightest against the glass and fading
  // towards the room (thin liners just inside each opening, a faint emissive gradient over the wall's own paint).
  {
    const pos = [];
    const nor = [];
    const uv = [];
    const idx = [];
    const quad = (pts, uvs, n) => {
      const base = pos.length / 3;
      pts.forEach((p) => pos.push(...p));
      uvs.forEach((t) => uv.push(...t));
      for (let i = 0; i < 4; i++) nor.push(...n);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const xr = ROOM.x1 + 0.001;
    const xg = ROOM.x1 + GLASS_IN - 0.012;
    BAYS.forEach(([a, b]) => {
      const za = a + 0.002;
      const zb = b - 0.002;
      const yh = WIN.y1 - 0.002;
      quad([[xr, WIN.y0, za], [xg, WIN.y0, za], [xg, WIN.y1, za], [xr, WIN.y1, za]], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 0, 1]);
      quad([[xr, WIN.y0, zb], [xr, WIN.y1, zb], [xg, WIN.y1, zb], [xg, WIN.y0, zb]], [[0, 0], [0, 1], [1, 1], [1, 0]], [0, 0, -1]);
      quad([[xr, yh, a], [xg, yh, a], [xg, yh, b], [xr, yh, b]], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, -1, 0]);
    });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const spillTex = canvasTexture(64, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#141414');
      gr.addColorStop(0.6, '#5a5a5a');
      gr.addColorStop(1, '#ffffff');
      x.fillStyle = gr;
      x.fillRect(0, 0, w, h);
    }, 4);
    const liners = new T.Mesh(g, mat({ color: linear(0x101820), roughness: 0.85, emissive: linear(0xb4c2d0), emissiveMap: spillTex, emissiveIntensity: 0.14 }));
    liners.receiveShadow = true;
    scene.add(liners);
  }
  // Stone sills inside each window, a little proud of the wall: they catch the sun as it comes in.
  {
    const SILL_T = 0.03;
    const sills = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), mat({ color: linear(0xd8d3cb), roughness: 0.42 }), BAYS.length);
    BAYS.forEach(([a, b], i) => {
      mx.makeScale(GLASS_IN + 0.05, SILL_T, b - a + 0.06).setPosition(ROOM.x1 + (GLASS_IN - 0.05) / 2, WIN.y0 + SILL_T / 2, (a + b) / 2);
      sills.setMatrixAt(i, mx);
    });
    sills.castShadow = true;
    sills.receiveShadow = true;
    sills.frustumCulled = false;
    scene.add(sills);
  }

  // ---- The MLILY set: the room's centrepiece, where the reference has its dining table ----
  // A midnight partition with one panel bay per bed behind the headboards, the beds straight on the oak (no rug since
  // 2026-11-05), veneer nightstands on slim charcoal legs with slender ivory pendants above them.
  if (SET) {
    const partL = ROOM.x0; // cut flush with the plate on the left
    const partR = ROOM.x1 + SIDE_T; // and to the right wall's outer face
    const partW = partR - partL;
    const AO_H = 5; // occlusion only matters near the floor; above this the canvas's clean top row is clamped
    const partAO = aoTexture(2048, (2048 * AO_H) / partW, (x, w, h) => {
      const k = w / partW;
      const X = (v) => (v - partL) * k;
      const Y = (v) => (AO_H - v) * k;
      occlude(x, 0, h, w, 6, 0.4 * k, 0.55);
      setBeds.forEach((b) => occlude(x, X(b.pos.x - HEAD.w / 2), Y(HEAD.h), HEAD.w * k, HEAD.h * k + 6, 0.12 * k, 0.6));
      ends.forEach((e) => occlude(x, X(e.x - 0.25), Y(0.58), 0.5 * k, 0.58 * k + 6, 0.16 * k, 0.35));
    });
    partAO.repeat.set(1, PART_H / AO_H); // the face's UVs run up all of PART_H; the canvas covers its bottom AO_H
    // Its cut ends, at the plate's open edges, take the page's own colour, unlit, so no light-catching strip shows
    // where the wall stops (Ramir, 2026-11-05: "remove the space in the back side of the partition").
    const cutEnd = new T.MeshBasicMaterial({ color: scene.background });
    const partition = new T.Mesh(withUv2(new T.BoxGeometry(partW, PART_H, PART_T)), [cutEnd, cutEnd, M.panel, M.panel, paint(partW, PART_H, { aoMap: partAO }), cutEnd]);
    partition.position.set((partL + partR) / 2, PART_H / 2, SET.back - PART_T / 2);
    partition.castShadow = true;
    partition.receiveShadow = true;
    scene.add(partition);
    // Panel joints: one bay per bed, and panels about as wide across the rest of the wall.
    const panels = (a, b) => { const n = Math.max(1, Math.round((b - a) / 2.5)); return Array.from({ length: n - 1 }, (_, i) => a + ((b - a) * (i + 1)) / n); };
    const cuts = [...setBeds.slice(1).map((b, i) => (setBeds[i].pos.x + b.pos.x) / 2), SET.x0, SET.x1, ...panels(partL, SET.x0), ...panels(SET.x1, partR)];
    const rails = Array.from({ length: Math.floor(PART_SEEN / 2.3) }, (_, i) => 2.3 * (i + 1)); // a rail every 2.3 m, as high as any frame looks
    joints({ along: 'x', at: SET.back, face: 1, from: partL, to: partR, h: PART_H, cuts, rails });


    // Nightstands at the two ends of the set: light veneer on slim charcoal legs with a drawer joint, and a slender
    // pendant above each (the reference's pendants, at bedside), its shade ivory so it reads on the dark wall.
    const standGeo = slab(0.5, 0.4, 0.42, 0.02, 0.012, 3);
    const drawerGeo = slab(0.44, 0.014, 0.15, 0.004, 0.003, 1); // a drawer front standing 14 mm proud of the body
    const pullGeo = new T.BoxGeometry(0.1, 0.008, 0.012);
    const standLeg = new T.CylinderGeometry(0.012, 0.009, 0.16, 8);
    const coneGeo = new T.CylinderGeometry(0.024, 0.085, 0.3, lite ? 16 : 28, 1, true);
    const cordGeo = new T.CylinderGeometry(0.004, 0.004, 1, 6);
    const SHADE_Y = 2.3; // bottom of each pendant shade: hung high, clear of the labels on every layout
    ends.forEach(({ x, z }) => {
      add(standGeo, M.veneer, x, 0.16, z);
      add(drawerGeo, M.veneer, x, 0.395, z + 0.2 + 0.007);
      add(pullGeo, M.metal, x, 0.525, z + 0.2 + 0.02);
      [[-0.22, -0.17], [0.22, -0.17], [-0.22, 0.17], [0.22, 0.17]].forEach(([lx, lz]) => add(standLeg, M.metal, x + lx, 0.08, z + lz));
      add(coneGeo, M.shade, x, SHADE_Y + 0.15, z + 0.04, scene, false); // no shadow: it only smudged the partition
      const cord = add(cordGeo, M.metal, x, 0, z + 0.04, scene, false);
      cord.scale.y = PART_H - (SHADE_Y + 0.3); // up past the top of the frame, to a ceiling out of sight
      cord.position.y = (SHADE_Y + 0.3 + PART_H) / 2;
    });
    const [L, R] = ends;
    const standTop = 0.58;
    // Left: two linen books and a small white vase, kept low (the first label's line rises just in front of it).
    add(slab(0.26, 0.19, 0.035, 0.006, 0.004, 1), M.linen, L.x - 0.07, standTop, L.z + 0.02);
    add(slab(0.22, 0.16, 0.03, 0.006, 0.004, 1), M.paper, L.x - 0.06, standTop + 0.035, L.z + 0.01);
    decals.push([L.x - 0.07, standTop + 0.002, L.z + 0.02, 0.36, 0.28], [L.x + 0.15, standTop + 0.002, L.z - 0.05, 0.2, 0.2], [R.x + 0.08, standTop + 0.002, R.z - 0.02, 0.24, 0.24]);
    add(lathe([[0, 0], [0.045, 0], [0.06, 0.04], [0.058, 0.08], [0.035, 0.11], [0.03, 0.125], [0.034, 0.128]]), M.ceramic, L.x + 0.15, standTop, L.z - 0.05);
    // Right: a white ceramic vase on its own (the plant came out, Ramir 2026-11-05).
    add(lathe([[0, 0], [0.05, 0], [0.075, 0.06], [0.08, 0.12], [0.065, 0.19], [0.04, 0.23], [0.038, 0.25], [0.043, 0.252]]), M.ceramic, R.x + 0.08, standTop, R.z - 0.02);

  }


  const gapMesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), M.gap, gaps.length);
  gaps.forEach(([x, y, z, sx, sy, sz], i) => {
    mx.makeScale(sx, sy, sz).setPosition(x, y, z);
    gapMesh.setMatrixAt(i, mx);
  });
  gapMesh.receiveShadow = true;
  scene.add(gapMesh);
  // Pillows rest on the three MLILY mattresses (their tops are at 0.2 + h).
  setBeds.forEach((b) => {
    const h = (PRODUCTS[labelFor[b.key]] || PRODUCTS.midnight).h;
    [-0.4, 0.4].forEach((px) => decals.push([b.pos.x + px, 0.2 + h + 0.003, b.pos.z - 0.76, 0.74, 0.5]));
    decals.push([b.pos.x, BASE.top + 0.002, b.pos.z, BASE.w + 0.1, BASE.d + 0.1]); // the mattress's soft contact shadow on the base's ledge
  });
  const decalMesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({
    color: 0x000000, alphaMap: blobTex, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }), decals.length);
  decals.forEach(([x, y, z, w, d], i) => {
    mx.makeScale(w, 1, d).setPosition(x, y, z);
    decalMesh.setMatrixAt(i, mx);
  });
  decalMesh.renderOrder = 1;
  scene.add(decalMesh);
  if (leaves.length) { // no plants in the room since 2026-11-05; the leaf builder stays for when one comes back
    const leafMesh = new T.InstancedMesh(leafGeo, M.leaf, leaves.length);
    const deepLeaf = linear(0x44533a);
    const freshLeaf = linear(0x7d8d5c);
    leaves.forEach(({ m, tone }, i) => {
      leafMesh.setMatrixAt(i, m);
      leafMesh.setColorAt(i, deepLeaf.clone().lerp(freshLeaf, tone));
    });
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    scene.add(leafMesh);
  }

  // ---- The route: the same path string as the flat floor, a glowing ribbon revealed with drawRange ----
  const route = new T.CurvePath();
  let cursor = null;
  host.dataset.route.replace(/([MLQ])([^MLQ]*)/g, (_, cmd, args) => {
    const n = args.trim().split(/[\s,]+/).map(Number);
    if (cmd === 'M') cursor = toWorld(n[0], n[1]);
    if (cmd === 'L') { const p = toWorld(n[0], n[1]); route.add(new T.LineCurve3(cursor, p)); cursor = p; }
    if (cmd === 'Q') { const p = toWorld(n[2], n[3]); route.add(new T.QuadraticBezierCurve3(cursor, toWorld(n[0], n[1]), p)); cursor = p; }
    return '';
  });
  const SEG = lite ? 360 : 600;
  const RAD = lite ? 6 : 10;
  const tubeGeo = new T.TubeGeometry(route, SEG, 0.055, RAD, false);
  // The trail (Ramir, 2026-11-05: "update the colors being used for the trailer"): it brightens from Better Blue to Good
  // Blue as it reaches the stops (the light-blue-on-dark treatment Ramir validated for this scene), over a glow of
  // Better Blue that reads blue on the oak (the old pale Good Blue halo went grey there). The head and its glow are Good
  // Blue; the stop dots are white, like the labels.
  const colours = [];
  const from = linear(0x5e8ab4);
  const litBlue = linear(0xa4c8e1);
  const c = new T.Color();
  for (let i = 0; i <= SEG; i++) { c.copy(from).lerp(litBlue, i / SEG); for (let j = 0; j <= RAD; j++) colours.push(c.r, c.g, c.b); }
  tubeGeo.setAttribute('color', new T.Float32BufferAttribute(colours, 3));
  const tube = new T.Mesh(tubeGeo, new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  const glow = new T.Mesh(new T.TubeGeometry(route, SEG, 0.17, RAD, false), new T.MeshBasicMaterial({
    color: linear(0x5e8ab4), transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false,
  }));
  tube.position.y = 0.03;
  glow.position.y = 0.025;
  glow.scale.y = 0.12; // a flat halo on the floor: as a round tube it stood in front of the bed bases and tinted them
  scene.add(tube, glow);

  const head = new T.Mesh(new T.SphereGeometry(0.09, 20, 14), new T.MeshBasicMaterial({ color: linear(0xa4c8e1), toneMapped: false }));
  const headGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: linear(0xa4c8e1), transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }));
  headGlow.scale.set(0.75, 0.75, 1);
  const headLight = new T.PointLight(0xa4c8e1, 0.25, 3, 2);
  scene.add(head, headGlow, headLight);

  const samples = Array.from({ length: 401 }, (_, i) => ({ u: i / 400, p: route.getPointAt(i / 400) }));
  const nearest = (w) => samples.reduce((best, s) => {
    const dist = Math.hypot(s.p.x - w.x, s.p.z - w.z);
    return dist < best.d ? { u: s.u, d: dist, p: s.p } : best;
  }, { u: 0, d: Infinity, p: null });

  const dotGeo = new T.SphereGeometry(0.07, 16, 12);
  const marks = [...panel.querySelectorAll('[data-label]')].map((el) => {
    const [x, y] = el.dataset.near.split(',').map(Number);
    const n = nearest(toWorld(x, y));
    const bed = beds.find((b) => b.key === el.dataset.bed);
    // Each stop's spotlight hangs in front of the bed and aims at its foot half, so it lights the top and the foot
    // face (tag, logo) without reaching the row in front.
    const aim = new T.Object3D();
    aim.position.copy(bed.pos).add(new T.Vector3(0, 0.25, 0.45));
    const spot = new T.SpotLight(0xfff1e2, 0, 10, 0.4, 1, 1.3);
    spot.position.copy(bed.pos).add(new T.Vector3(0, 4.4, 3));
    spot.target = aim;
    scene.add(aim, spot);
    const dot = new T.Mesh(dotGeo, new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    dot.position.set(n.p.x, 0.06, n.p.z);
    dot.scale.setScalar(0.001);
    scene.add(dot);
    const inner = el.firstElementChild;
    gsap.set(inner, { autoAlpha: 0, y: 18 });
    const raised = !el.classList.contains('floor-label--below');
    return { el, inner, dot, spot, bed, raised, below: !raised, body: inner.querySelector('.floor-label__body'), bodyH: 0, glow: bed.mlilyParts.glow, at: n.u, on: false, level: 0, narrowHide: el.hasAttribute('data-narrow-hide') };
  });
  // Tablet and phone (≤ 991 px) drop the data-narrow-hide stops (New model): no label, dot or spotlight, and the camera
  // centres on and fits only the stops left (Floor cards, Weekend sale). Desktop keeps all three.
  const isNarrow = () => canvas.clientWidth <= 991;
  const live = (mk) => !(mk.narrowHide && isNarrow());

  // Stop lighting: as the route head enters the stretch of stops, all three spotlights fade up to a soft pre-light
  // (scroll-linked, so it fades back when scrolling up); each comes up to full when the route reaches its bed. In the
  // bright room this is a gentle lift that brings out the cover texture, never a theatrical pool or a clipped top.
  const stopsAt = Math.min(...marks.map((mk) => mk.at));
  const SPOT_PRE = 0.15;
  const SPOT_FULL = 0.35;
  let zone = 0;
  const applyLights = () => marks.forEach((mk) => { mk.spot.intensity = SPOT_PRE * zone + (SPOT_FULL - SPOT_PRE * zone) * mk.level; });

  // Camera aims at the row of stops (the MLILY beds), not the whole route, so the story sits mid-frame.
  const centre = (list) => list.reduce((v, mk) => v.add(mk.dot.position), new T.Vector3()).divideScalar(list.length).setY(0);
  const focusAll = centre(marks);
  const focusNarrow = centre(marks.filter((mk) => !mk.narrowHide));
  let focus = focusAll; // set in size(): the narrow focus under 992 px
  const tanHalf = Math.tan(T.MathUtils.degToRad(camera.fov / 2));

  // Under 992 px the camera backs off and slides just enough for every label (line, photo and text) to fit on
  // screen with a 16 px margin. Solved on resize from the labels' real widths, so longer CMS titles still fit.
  const fit = { scale: 1, shift: 0 };

  // Camera: the overhead three-quarter view (Ramir went back to it from the frontal CodeSandbox angle, 2026-11-05),
  // shifted so the stops sit right of the text on desktop; one slow push-in and a small turn. Composition pass
  // (2026-11-05): a little closer (19 m of floor across, was 21), a little lower (42° → 36°, was 52° → 47°) and aimed
  // further back into the set, so the back wall and both side walls, with their windows, are in the shot and less
  // empty floor fills the foreground; all three beds stay fully readable from above.
  // Tablet and phone (2026-11-07, Ramir; desktop untouched): "a slightly lower camera angle and zoom" (elevation
  // 38° → 32°, was 46° → 41°), then "move the camera in a circle ... on the left of the subjects": it orbits to
  // 30° → 22° left of the beds (desktop -14° → -6°), so the row reads on a diagonal and the right wall's windows show.
  // Seen at an angle the row is narrower on screen, so it also comes closer (NARROW_ZOOM; tried 45°: beds too small,
  // labels across the beds). solveFit still backs the camera off if a label would leave the screen; on phones the
  // three labels fill the width, so the phone gains the angle but little zoom (Ramir: leave phone labels as is).
  const NARROW_EL = [38, 32];
  const NARROW_AZ = [-30, -22];
  // With New model dropped on tablet/phone (data-narrow-hide), the camera centres on Floor cards + Weekend sale and
  // comes in to 0.6 (was 0.74 with three stops); on phones the two labels still set the limit via solveFit.
  const NARROW_ZOOM = 0.6;
  function placeCamera(t) {
    const e = smooth(t);
    const narrow = canvas.clientWidth <= 991;
    const target = focus.clone().add(narrow ? new T.Vector3(fit.shift, 0, -0.2) : new T.Vector3(-2.4, 0, -1.4));
    const fitWidth = narrow ? 11 : 19;
    const dist = Math.min(30, Math.max(10, fitWidth / (2 * tanHalf * camera.aspect))) * (narrow ? NARROW_ZOOM * fit.scale : 1) * lerp(1.06, 0.92, e);
    const az = T.MathUtils.degToRad(narrow ? lerp(NARROW_AZ[0], NARROW_AZ[1], e) : lerp(-14, -6, e));
    const el = T.MathUtils.degToRad(narrow ? lerp(NARROW_EL[0], NARROW_EL[1], e) : lerp(42, 36, e));
    camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * dist,
      Math.sin(el) * dist,
      target.z + Math.cos(az) * Math.cos(el) * dist,
    );
    camera.lookAt(target);
  }

  // In the low, frontal view a raised label's photo and text must sit on the wall above its bed's headboard, never
  // across it: each frame the label line grows (CSS --lift, a minimum on top of the designed height) until the body
  // clears the headboard top by 15 cm and 8 px.
  const headTop = new T.Vector3();
  let navClear = 90; // px from the top the labels keep free: the floating nav's pill plus a margin (set in size())
  function placeLabels() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    marks.forEach((mk) => {
      const v = mk.dot.position.clone().project(camera);
      const x = ((v.x + 1) / 2) * w;
      const y = ((1 - v.y) / 2) * h;
      mk.el.style.transform = `translate(${x}px, ${y}px)`;
      if (!mk.raised) return;
      headTop.set(mk.bed.pos.x, HEAD.h + 0.15, mk.bed.pos.z + HEAD.z).project(camera);
      const clear = y - ((1 - headTop.y) / 2) * h + mk.bodyH + 8;
      mk.inner.style.setProperty('--lift', `${Math.round(Math.min(clear, y - navClear))}px`); // never up under the nav
    });
  }

  // Fit is checked at the end of the scene (t = 1), where the push-in is tightest and every label is showing.
  function solveFit() {
    fit.scale = 1;
    fit.shift = 0;
    const w = canvas.clientWidth;
    if (!w || w > 991) return;
    const pad = 16;
    const room = w - 2 * pad;
    const shown = marks.filter(live);
    const widths = shown.map((mk) => mk.inner.offsetWidth);
    const screenX = (p) => ((p.clone().project(camera).x + 1) / 2) * w;
    for (let i = 0; i < 8; i++) {
      placeCamera(1);
      camera.updateMatrixWorld();
      const xs = shown.map((mk) => screenX(mk.dot.position));
      const left = Math.min(...xs) - 2;
      const right = Math.max(...xs.map((x, k) => x - 1.5 + widths[k]));
      if (left >= pad - 0.5 && right <= w - pad + 0.5) break;
      const ppu = screenX(focus.clone().add(new T.Vector3(1, 0, 0))) - screenX(focus);
      if (right - left > room) {
        fit.scale *= (right - left) / room;
        fit.shift += ((left + right) / 2 - w / 2) / ppu;
      } else {
        fit.shift += (right > w - pad ? right - (w - pad) : left - pad) / ppu;
      }
    }
  }

  // Tablet and phone (2026-11-17, Ramir: "Fix the floor cards overlap at tablet width"): under 992 px the scene copy sits
  // at the bottom, and a label that hangs below its stop (Floor cards) could run into it in a short window. Checked at
  // the end of the scene (t = 1, the tightest push-in, where a below label sits lowest): the label's line first shortens
  // so its body ends 16 px above the copy (never under 28 px); if even that does not fit, the label goes up like the
  // others, as long as it clears the next raised label to its right. Desktop and windows with room keep the design as is.
  const stageEl = canvas.closest('.store-scroll__stage');
  const copyEl = stageEl && stageEl.querySelector('.store-scroll__copy');
  function fitBelow() {
    marks.forEach((mk) => {
      if (!mk.below) return;
      mk.raised = false;
      mk.el.classList.add('floor-label--below');
      mk.inner.style.removeProperty('height');
    });
    if (!isNarrow() || !stageEl || !copyEl) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const copyTop = copyEl.getBoundingClientRect().top - stageEl.getBoundingClientRect().top;
    placeCamera(1);
    camera.updateMatrixWorld();
    const screen = (p) => { const v = p.clone().project(camera); return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h }; };
    marks.filter((mk) => mk.below && live(mk)).forEach((mk) => {
      const at = screen(mk.dot.position);
      const room = copyTop - 16 - at.y;
      if (mk.inner.offsetHeight <= room) return;
      if (room >= 28) { mk.inner.style.height = `${Math.floor(room)}px`; return; }
      const right = at.x + mk.inner.offsetWidth + 12;
      const blocked = marks.some((o) => o !== mk && o.raised && live(o) && screen(o.dot.position).x > at.x && screen(o.dot.position).x < right);
      if (blocked) { mk.inner.style.height = '28px'; return; }
      mk.raised = true;
      mk.el.classList.remove('floor-label--below');
      mk.bodyH = mk.body ? mk.body.offsetHeight : 0;
    });
  }

  function size() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    marks.forEach((mk) => { mk.bodyH = mk.body ? mk.body.offsetHeight : 0; });
    const rootStyle = getComputedStyle(document.documentElement);
    navClear = document.querySelector('[data-nav]')
      ? (parseFloat(rootStyle.getPropertyValue('--pill-top')) || 16) + (parseFloat(rootStyle.getPropertyValue('--pill-h')) || 60) + 14
      : 24; // no top nav: labels only keep a small margin from the top edge
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    focus = isNarrow() ? focusNarrow : focusAll;
    solveFit();
    fitBelow();
  }

  function render(t) {
    last = t;
    const { anim } = phase(t, lead, hold);
    const count = Math.floor(SEG * anim) * RAD * 6;
    tube.geometry.setDrawRange(0, count);
    glow.geometry.setDrawRange(0, count);
    const p = route.getPointAt(Math.max(0.0001, anim));
    head.position.set(p.x, 0.09, p.z);
    headGlow.position.set(p.x, 0.12, p.z);
    headLight.position.set(p.x, 0.5, p.z);
    zone = smooth(Math.min(1, Math.max(0, (anim - (stopsAt - 0.12)) / 0.14)));

    marks.forEach((mk) => {
      const on = anim >= mk.at && live(mk);
      if (on === mk.on) return;
      mk.on = on;
      gsap.to(mk, { level: on ? 1 : 0, duration: 0.9, ease: 'power2.out', overwrite: true, onUpdate: requestRender });
      gsap.to(mk.dot.scale, { x: on ? 1 : 0.001, y: on ? 1 : 0.001, z: on ? 1 : 0.001, duration: 0.4, overwrite: true, onUpdate: requestRender });
      gsap.to(mk.glow, { emissiveIntensity: on ? 0.1 : 0, duration: 0.8, overwrite: true, onUpdate: requestRender });
      gsap.to(mk.inner, on
        ? { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', overwrite: true }
        : { autoAlpha: 0, y: 18, duration: 0.3, ease: 'power2.in', overwrite: true });
    });
    requestRender();
  }

  size();
  requestRender();
  // Label widths depend on Montserrat; re-fit once it has loaded.
  if (document.fonts) document.fonts.ready.then(() => { size(); requestRender(); });
  return { render, resize: () => { size(); requestRender(); } };
}

function photoScene(panel) {
  const img = panel.querySelector('img');
  return {
    preload() { img.loading = 'eager'; },
    render(t) { img.style.setProperty('--zoom', (1.12 - 0.12 * t).toFixed(4)); },
  };
}

const sceneKinds = {
  sequence: sequenceScene,
  floor: floorScene,
  photo: photoScene,
  // Real 3D unless ?floor=flat, Three.js failed to load, or the device can't give us WebGL; then the flat floor.
  floor3d: (panel, opts) => {
    if (new URLSearchParams(location.search).get('floor') !== 'flat' && window.THREE) {
      try { return floor3dScene(panel, opts); } catch (err) { console.warn('3D floor unavailable, using the flat floor.', err); }
    }
    panel.dataset.kind = 'floor';
    return floorScene(panel, opts);
  },
};

function initScenes(root) {
  const panels = [...root.querySelectorAll('[data-panel]')];
  const copies = [...root.querySelectorAll('[data-copy]')];
  const fills = [...root.querySelectorAll('.store-scroll__fill')];
  // The scene titles' reveal (v181, Ramir 2026-11-11: "Yes, scenes too", the headline's serious.business-style reveal).
  // Each title is split into its lines as laid out (balanced wrap, current font and width), and each line becomes its
  // own clip that swings in (css: .reveal-line, --li = line number). Split again once the fonts load and on resize.
  // The visible copy is aria-hidden (screen readers get the .u-sr-only copy), so the extra spans change nothing there.
  const titles = copies.map((c) => c.querySelector('h2')).filter(Boolean);
  function splitTitles() {
    titles.forEach((h) => {
      const text = h.dataset.text || h.textContent.trim().replace(/\s+/g, ' ');
      h.dataset.text = text;
      h.textContent = '';
      const words = text.split(' ').map((w, i, all) => {
        const s = document.createElement('span');
        s.textContent = w;
        h.append(s);
        if (i < all.length - 1) h.append(' ');
        return s;
      });
      const lines = [];
      let top = null;
      words.forEach((w) => {
        if (top === null || Math.abs(w.offsetTop - top) > 2) { lines.push([]); top = w.offsetTop; }
        lines[lines.length - 1].push(w.textContent);
      });
      h.textContent = '';
      lines.forEach((ws, i) => {
        const line = document.createElement('span');
        line.className = 'reveal-line';
        line.style.setProperty('--li', i);
        const inner = document.createElement('span');
        inner.textContent = ws.join(' ');
        line.append(inner);
        h.append(line);
      });
    });
  }
  splitTitles();
  if (document.fonts) document.fonts.ready.then(splitTitles);
  const weights = (root.dataset.weights || '1,1,1').split(',').map(Number);
  const total = weights.reduce((a, b) => a + b, 0);
  const blend = Number(root.dataset.blend || 0.5) / total;
  const ranges = [];
  weights.reduce((start, w) => { ranges.push([start / total, (start + w) / total]); return start + w; }, 0);
  // The opening (data-intro screens) runs first on the same pinned stage; the scenes keep their own 0→1 progress after it.
  // data-intro-turn (v164): screens of scroll at its very start in which the medley makes half a turn around the headline
  // (Ramir, 2026-11-09: "one half rotation before the center text goes up into the 3-scene"). The rest of the opening
  // (scatter, rise, window) then runs exactly as before, but begins over the turn's last TURN_OVERLAP, so the turn eases
  // out as the photos drift off and the headline starts up ("need it to be smooth with the text rise and 3-scene show",
  // v165). The headline's text switch is triggered inside it (v168 stretched it to 1.6 screens for a scrubbed switch;
  // v169 plays the switch on a timer instead, back to 1.2; v172 makes the whole scroll 25% longer, so 1.5). With reduced
  // motion there is no turn, but the switch (a quick cross-fade there) still needs its moment, so it keeps half.
  const TURN_OVERLAP = 0.25; // of the turn (was a fixed 0.3 screens of 1.2 until v171)
  // Tablet and phone (2026-11-17, Ramir: "prolong the animation a bit for store scroll, the beginning especially is a bit
  // too quick from a tablet and mobile perspective (the scenes are fine)"): under 992 px the opening takes more scroll,
  // the half turn at its very start most (NARROW_TURN), the scatter, rise and window a little (NARROW_REST). The three
  // scenes keep their length. Re-set when the window crosses 992 px (a tablet turned, say). Desktop is unchanged.
  const NARROW_TURN = 1.6;
  const NARROW_REST = 1.3;
  // Desktop (2026-11-17, Ramir: "It's a bit too fast on desktop. Would like it if 'How do you stay ready to sell' part got
  // a bit more screen time before the transition"): the half turn takes a quarter more scroll (WIDE_TURN) and the text
  // switch waits until later in it (SWITCH_AT_WIDE, below), so the first headline holds for about a screen of scroll
  // (was under half a screen) while the photos turn. The rest of the opening and the scenes are unchanged.
  const WIDE_TURN = 1.25;
  const narrowMQ = matchMedia('(max-width: 991px)');
  let introBase = 0;
  let turnLen = 0;
  let turnLead = 0; // where the rest of the opening starts
  let intro = 0;
  let span = total;
  const setLengths = () => {
    const n = narrowMQ.matches;
    const base = Number(root.dataset.intro || 0);
    introBase = base * (n ? NARROW_REST : 1);
    turnLen = base ? Number(root.dataset.introTurn || 0) * (reduceMotion ? 0.5 : 1) * (n ? NARROW_TURN : WIDE_TURN) : 0;
    turnLead = turnLen * (1 - TURN_OVERLAP);
    intro = introBase + turnLead;
    span = total + intro;
    root.style.setProperty('--scenes-length', span);
  };
  setLengths();
  const introLayer = root.querySelector('[data-intro-layer]');
  const slot = root.querySelector('[data-intro-slot]');
  const stage = root.querySelector('.store-scroll__stage');
  const ui = root.querySelector('.store-scroll__ui');

  const scenes = panels.map((panel) => sceneKinds[panel.dataset.kind](panel, {
    lead: Number(panel.dataset.lead || 0),
    hold: Number(panel.dataset.hold || 0),
  }));
  let active = -1;

  function setActive(i) {
    if (i === active) return;
    active = i;
    copies.forEach((c, k) => c.classList.toggle('is-active', k === i));
    root.dataset.activeIndex = i;
  }

  // Tone: the copy, rail and floating nav follow what fills the stage. A light panel (data-tone="light", the bright 3D
  // showroom) turns them to ink once it covers more than half the stage, mid cross-fade, so text never sits light on
  // light or dark on dark. The section's data-theme follows too, so the nav picks it up when it scrolls back in.
  const nav = document.querySelector('[data-nav]');
  let tone = '';
  function setTone(next) {
    if (next === tone) return;
    tone = next;
    root.dataset.tone = next;
    root.dataset.theme = next;
    if (!nav) return;
    const bar = nav.querySelector('.nav-bar');
    const line = nav.offsetTop + (bar ? bar.offsetHeight / 2 : 0);
    const box = root.getBoundingClientRect();
    if (box.top <= line && box.bottom >= line) nav.dataset.navTheme = next;
  }

  // Each later panel fades in over `blend` screens from its start, on top of the one before it, which is resting on its last state.
  function update(progress, live = true) {
    let index = ranges.findIndex(([, end]) => progress < end);
    if (index < 0) index = ranges.length - 1;
    setActive(live ? index : -1); // no scene copy until the opening has finished, so scene 1's copy rises in as it starts

    const fade = ranges.map(([start], i) => (i === 0 ? 1 : smooth(clamp01((progress - start) / blend))));
    panels.forEach((panel, i) => {
      const covered = fade.slice(i + 1).some((o) => o >= 1);
      const o = covered ? 0 : fade[i];
      panel.style.opacity = o.toFixed(4);
      panel.style.visibility = o > 0 ? 'visible' : 'hidden';
      panel.style.setProperty('--next-fade', (fade[i + 1] || 0).toFixed(4)); // how far the next scene has faded in over this one
    });
    // How much of the stage the light panels fill: each panel's opacity times what the panels above let through.
    let light = 0;
    let through = 1;
    for (let i = panels.length - 1; i >= 0; i--) {
      if (panels[i].dataset.tone === 'light') light += fade[i] * through;
      through *= 1 - fade[i];
    }
    setTone(light >= 0.5 ? 'light' : 'dark');

    ranges.forEach(([start, end], i) => {
      const t = clamp01((progress - start) / (end - start));
      fills[i].style.setProperty('--p', t.toFixed(4));
      if (panels[i].style.visibility !== 'hidden') scenes[i].render(t);
    });
  }

  // The opening's window is the empty slot under the titles (measured in stage pixels). While scene 1 sits in it, it is
  // scaled to INTRO_S0 around the slot's centre and shifted so the mattress (FOCUS, fractions of the frame) is centred.
  const INTRO_S0 = 0.3;
  const FOCUS = [0.56, 0.46];
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function measureIntro() {
    if (!intro || !slot) return;
    // Offsets, not getBoundingClientRect: the titles (and the slot with them) lift as the window opens, and the
    // window must keep the slot's resting place.
    let l = 0;
    let t = 0;
    for (let el = slot; el && el !== stage; el = el.offsetParent) { l += el.offsetLeft; t += el.offsetTop; }
    const s = { width: stage.clientWidth, height: stage.clientHeight };
    const r = { width: slot.offsetWidth, height: slot.offsetHeight };
    const cx = l + r.width / 2;
    const cy = t + r.height / 2;
    const set = (k, v) => root.style.setProperty(k, `${v.toFixed(2)}px`);
    set('--win-t', t);
    set('--win-l', l);
    set('--win-r', s.width - (l + r.width));
    set('--win-b', s.height - (t + r.height));
    set('--win-cx', cx);
    set('--win-cy', cy);
    set('--intro-dx', -INTRO_S0 * (FOCUS[0] * s.width - cx));
    set('--intro-dy', -INTRO_S0 * (FOCUS[1] * s.height - cy));
    // The headline's top, so the medley photos above it can keep clear of it (css: --type-top).
    const title = root.querySelector('.intro-title');
    if (title) {
      let tt = 0;
      for (let el = title; el && el !== stage; el = el.offsetParent) tt += el.offsetTop;
      set('--type-top', tt);
    }
    measureOrbit(); // after --type-top: the photos' resting places depend on it
  }

  // The headline's rise has inertia of its own (Ramir, 2026-11-09: "more slowly with a bit more inertia"). The scroll sets
  // a target (over the first RISE_END of the opening) and the shown value follows it on a critically damped spring
  // (RISE_SMOOTH: roughly the seconds it trails by), so it eases off, glides and settles after the scroll stops; on top
  // of Lenis's smoothing. Reduced motion: no lag.
  const RISE_END = 0.55;
  const RISE_SMOOTH = 0.15; // 0.5 s was "way too much inertia" (Ramir, 2026-11-09)
  let riseTarget = 0;
  let rise = 0;
  let riseVel = 0;
  const showRise = () => root.style.setProperty('--intro-u', rise.toFixed(4));
  if (intro) {
    gsap.ticker.add((time, deltaTime) => {
      if (Math.abs(riseTarget - rise) < 0.0004 && Math.abs(riseVel) < 0.001) {
        if (rise !== riseTarget) { rise = riseTarget; riseVel = 0; showRise(); }
        return;
      }
      const dt = Math.min(deltaTime / 1000, 0.05);
      const omega = 2 / RISE_SMOOTH;
      const w = omega * dt;
      const k = 1 / (1 + w + 0.48 * w * w + 0.235 * w * w * w);
      const change = rise - riseTarget;
      const temp = (riseVel + omega * change) * dt;
      riseVel = (riseVel - omega * temp) * k;
      rise = riseTarget + (change + temp) * k;
      showRise();
    });
  }

  // The medley turns around the headline (Ramir, 2026-11-09: "have the medley in this one rotate circularly slowly, when a
  // user scrolls down that rotation is sped up by a bit"). Each visible photo rides its own ellipse through its resting
  // place, all at one angular speed, like photos on a tilted turntable: one turn in ORBIT_PERIOD s at rest. Scrolling
  // builds the speed up to (1 + ORBIT_BOOST)× (more for a faster scroll) and it eases back to the base speed once the
  // scroll stops; the angle is summed from the speed, so nothing ever jumps. The ellipses are wider than tall (the
  // screen's own shape, at least ORBIT_ASPECT : 1), and one that would bring its photo within --type-gap of the headline
  // at some angle is enlarged until it doesn't. While scrolling, a photo is also pushed out along its spoke if the rising
  // headline would reach it. The scroll scatter (24vw / 24vh × depth, as before) runs outward from where the photo is on
  // its ellipse. Only the position moves (--ox / --oy, from the resting place): size, depth, opacity, float and wipe-in
  // are the CSS's, and the photos stay upright. Reduced motion: no orbit (the CSS falls back to the old scatter).
  // The half turn (v164): the first data-intro-turn screens of scroll add half a turn on top (eased in and out, scrubbed,
  // so scrolling back turns it back) while the headline holds in the middle; it then rises as before. v165: the turn
  // trails the scroll on a damped spring (TURN_SMOOTH, about the seconds it lags by; Ramir: "add some inertia, let it
  // sort of delay a bit"), on top of Lenis, so it keeps gliding a moment after the scroll stops.
  // The z-axis (v167, Ramir: "can we create a z-axis as well?", after CLOU's 3D ring): the ring is seen from above, so its
  // bottom is the near side and its top the far side. A photo grows as it comes round the bottom and shrinks round the
  // top (--oz, up to Z_SCALE either way on a 16:10 screen; rounder rings on taller screens are seen more from above and
  // get less), fades a little on the far side (--of, up to Z_FADE) and is stacked by how near it is (z-index), so nearer
  // photos pass over farther ones. Bigger rings swing nearer and farther. The headline guard sizes each photo as it will
  // be on that part of its ring. Positions stay on the same ellipses; photos stay upright.
  const ORBIT_PERIOD = 100; // seconds per turn at rest
  const ORBIT_BOOST = 2;    // a scroll adds up to twice the base speed (so up to 3×) …
  const ORBIT_V0 = 0.6;     // … about two thirds of that at 0.6 screens a second
  const ORBIT_UP = 0.25;    // seconds: how fast the boost builds …
  const ORBIT_DOWN = 1.1;   // … and how slowly it eases back
  const ORBIT_ASPECT = 1.2; // the narrowest path, width : height (portrait screens)
  const FLOAT = 10;         // the float's lift in px × depth (css: medley-float)
  const TURN_SMOOTH = 0.35; // seconds the half turn trails the scroll by (the headline's rise: 0.15)
  const Z_SCALE = 0.25;     // near side up to 25% bigger, far side up to 25% smaller (16:10 screen, average ring)
  const Z_FADE = 0.2;       // far side up to 20% fainter
  const zOf = (rn, th) => Math.max(-1.3, Math.min(1.3, rn * Math.sin(th))); // −1 far (top) … +1 near (bottom)
  const medleyItems = [...root.querySelectorAll('.medley__item')];
  const headline = root.querySelector('.intro-title');
  const orbitOn = Boolean(intro && medleyItems.length && headline && slot && !reduceMotion);
  let orbit = [];
  let orbitBox = null;
  let orbitZ = 0; // the depth's size swing for this screen
  let orbitAngle = 0;
  let orbitSpeed = 1;
  let introM = 0;
  let introG = 0;
  let introTurn = 0; // 0→1 over the half turn's scroll
  let turn = 0;      // the half turn shown, radians (follows its target with inertia)
  let turnVel = 0;
  // The entrance (v177, Ramir 2026-11-11: "Have the animation start as the pictures coming into frame from the top right
  // orbiting around the center and going into position ... when we get to where does great sleep start"). When the
  // opening comes into view (the moment the headline rises in, css .is-in), the photos come into frame one after
  // another from beyond the top-right corner and ride round the headline into their places. The ring spins in as one
  // piece, so the photos keep their spacing and never cross: through about one turn (each photo's trip is the way round
  // from the corner to its place, clockwise like the orbit; a place just past the corner goes round once more) in
  // ENTER_DUR seconds, eased in and out, and it hands over to the slow orbit without a stop. Until the spin reaches a
  // photo it waits beyond the corner, off screen; then it spirals in onto its ring over its first ENTER_IN of travel.
  // Once per page load. Reduced motion: no entrance (the photos fade in where they rest, as before).
  const ENTER_DUR = 3.4;                    // seconds, from the first photo in to all of them in place
  const ENTER_MIN = (40 * Math.PI) / 180;  // a place closer than this past the corner goes round once more
  const ENTER_LEAD = (6 * Math.PI) / 180;  // the first photo starts in as the spin starts
  const ENTER_IN = (70 * Math.PI) / 180;   // the spiral in from beyond the corner onto the ring
  const enterEase = (x) => (1 - Math.cos(Math.PI * clamp01(x))) / 2;
  let enterAt = -Math.PI / 4; // the top-right corner as an angle on the rings (measureOrbit)
  let enterSpan = 0;          // the spin, radians: the longest trip + ENTER_LEAD (measureOrbit)
  // Tablet and phone (2026-11-17, Ramir: "let's not open up with the orbit into position, just have it prepositioned
  // already, along with the text in the beginning"): under 992 px at load the entrance is already over, so the photos
  // start in their places on the ring (css skips the headline's rise-in at the same width). Desktop keeps the entrance.
  let enterT = narrowMQ.matches ? ENTER_DUR : -1; // seconds into the entrance; -1 = not started, the photos wait off screen

  function measureOrbit() {
    if (!orbitOn) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const k = Math.max(ORBIT_ASPECT, W / H);
    // Places relative to the stage centre, from offsets (transform-proof).
    const at = (el) => {
      let l = 0;
      let t = 0;
      for (let e = el; e && e !== stage; e = e.offsetParent) { l += e.offsetLeft; t += e.offsetTop; }
      return [l - W / 2, t - H / 2];
    };
    // The headline at rest: its place in the column, pushed down by half the window slot and its gap (css: .intro-title).
    const [hl, ht] = at(headline);
    const lift = (slot.offsetHeight + slot.offsetTop - headline.offsetTop - headline.offsetHeight) / 2;
    const gap = Math.min(32, Math.max(16, H * 0.03)); // --type-gap
    orbitBox = { l: hl, r: hl + headline.offsetWidth, t: ht + lift, b: ht + lift + headline.offsetHeight, lift, gap };
    const base = medleyItems.filter((el) => el.offsetWidth).map((el) => {
      const [l, t] = at(el);
      const hw = el.offsetWidth / 2;
      const hh = el.offsetHeight / 2;
      const px = l + hw;
      const py = t + hh;
      const depth = parseFloat(getComputedStyle(el).getPropertyValue('--depth')) || 1;
      return { el, px, py, hw, hh, depth, b: Math.hypot(px / k, py) };
    });
    const mean = base.reduce((sum, p) => sum + p.b, 0) / (base.length || 1);
    // A flatter ring is seen from lower down, so it shows less depth: the swing goes with sqrt(1 - 1/k²), 1 at 16:10.
    orbitZ = (Z_SCALE * Math.sqrt(1 - 1 / (k * k))) / Math.sqrt(1 - 1 / 2.56);
    orbit = base.map((p) => {
      const rn = p.b / mean; // this ring against the average: bigger rings swing nearer and farther
      // Enlarge the ellipse until the photo, at its size on each part of the ring (plus the gap and its float), clears
      // the headline all the way round.
      let s = 1;
      for (let i = 0; i < 720; i++) {
        const th = (i / 720) * Math.PI * 2;
        const zs = 1 + orbitZ * zOf(rn, th);
        const ew = p.hw * zs + gap;
        const eh = (p.hh + FLOAT * p.depth) * zs + gap;
        s = Math.max(s, spokeExit(k * p.b * Math.cos(th), p.b * Math.sin(th), orbitBox.l - ew, orbitBox.r + ew, orbitBox.t - eh, orbitBox.b + eh));
      }
      return { ...p, rn, a: k * p.b * s, b: p.b * s, t0: Math.atan2(p.py, p.px / k), zi: null };
    });
    // The entrance (v177): the top-right corner's angle on the rings, and each photo's trip from it round to its place.
    enterAt = Math.atan2(-H / 2, W / 2 / k);
    orbit.forEach((p) => {
      let d = (p.t0 - enterAt) % (Math.PI * 2);
      if (d < 0) d += Math.PI * 2;
      if (d < ENTER_MIN) d += Math.PI * 2;
      p.trip = d;
    });
    enterSpan = orbit.length ? Math.max(...orbit.map((p) => p.trip)) + ENTER_LEAD : 0;
    placeOrbit();
    if (introLayer) introLayer.dataset.enter = ''; // css: no wipe-in, the photos are placed by the entrance
  }

  function placeOrbit() {
    if (!orbitBox) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const { l, r, t, b, lift, gap } = orbitBox;
    const shift = -lift * rise - 0.06 * H * introG; // how far the headline has risen from rest (css: .intro-title)
    const toGo = enterT < 0 ? enterSpan : enterSpan * (1 - enterEase(enterT / ENTER_DUR)); // the entrance's spin left
    orbit.forEach((p) => {
      // The entrance: how far round from the corner this photo has come (below 0 it still waits at the corner).
      const trip = p.trip - toGo;
      const th = enterAt + Math.max(0, trip) + orbitAngle + turn; // = p.t0 + orbitAngle + turn once it is in place
      const out = 0.24 * p.depth * introM;      // the scroll scatter: 24vw / 24vh × depth
      const z = zOf(p.rn, th);                   // how near, on the ring
      const zs = 1 + orbitZ * z;                 // css: --oz
      // Coming in: the ring is enlarged so the photo starts just off screen beyond the corner, then eases onto it.
      let m = 1;
      const inArc = Math.min(ENTER_IN, p.trip * 0.85);
      if (trip < inArc) {
        const cx = p.a * Math.cos(th);
        const cy = p.b * Math.sin(th);
        let off = Infinity;
        if (cx > 1) off = Math.min(off, (W / 2 + p.hw * zs + 8) / cx);
        if (cy < -1) off = Math.min(off, (H / 2 + (p.hh + FLOAT * p.depth) * zs + 8) / -cy);
        const u = Math.max(0, trip) / inArc;
        m = 1 + (Math.max(1, Number.isFinite(off) ? off : 2.5) - 1) * (1 - u * u * (3 - 2 * u));
      }
      let x = (p.a * m + out * W) * Math.cos(th);
      let y = (p.b * m + out * H) * Math.sin(th);
      const grow = (1 + 0.12 * introM * p.depth) * zs;  // css: scale()
      const ew = p.hw * grow + gap;
      const eh = (p.hh + FLOAT * p.depth) * grow + gap;
      const s = spokeExit(x, y, l - ew, r + ew, t + shift - eh, b + shift + eh);
      x *= s;
      y *= s;
      p.el.style.setProperty('--ox', `${(x - p.px).toFixed(2)}px`);
      p.el.style.setProperty('--oy', `${(y - p.py).toFixed(2)}px`);
      p.el.style.setProperty('--oz', zs.toFixed(4));
      p.el.style.setProperty('--of', (1 - Z_FADE * Math.min(1, Math.max(0, -z))).toFixed(4));
      const zi = Math.round(1000 + 400 * z);     // nearer on top (inside the medley's own stacking context)
      if (zi !== p.zi) {
        p.zi = zi;
        p.el.style.zIndex = String(zi);
      }
    });
  }

  if (orbitOn) {
    let lastY = window.scrollY;
    gsap.ticker.add((time, deltaTime) => {
      const dt = Math.min(Math.max(deltaTime, 1) / 1000, 0.05);
      const y = window.scrollY;
      const v = Math.abs(y - lastY) / dt / window.innerHeight; // screens a second
      lastY = y;
      const target = 1 + ORBIT_BOOST * (1 - Math.exp(-v / ORBIT_V0));
      orbitSpeed += (target - orbitSpeed) * (1 - Math.exp(-dt / (target > orbitSpeed ? ORBIT_UP : ORBIT_DOWN)));
      // The half turn: its target follows the scroll (eased in and out), the shown value follows the target on a
      // critically damped spring, the same one the headline's rise uses.
      const turnTarget = (Math.PI * (1 - Math.cos(Math.PI * introTurn))) / 2;
      if (Math.abs(turnTarget - turn) < 1e-4 && Math.abs(turnVel) < 1e-3) {
        turn = turnTarget;
        turnVel = 0;
      } else {
        const omega = 2 / TURN_SMOOTH;
        const w = omega * dt;
        const k = 1 / (1 + w + 0.48 * w * w + 0.235 * w * w * w);
        const change = turn - turnTarget;
        const temp = (turnVel + omega * change) * dt;
        turnVel = (turnVel - omega * temp) * k;
        turn = turnTarget + (change + temp) * k;
      }
      if (enterT >= 0 && enterT < ENTER_DUR) enterT = Math.min(ENTER_DUR, enterT + dt); // the entrance's clock
      if (introDone || introM >= 1) return; // the medley has gone; it carries on from here when it comes back
      orbitAngle += ((Math.PI * 2) / ORBIT_PERIOD) * orbitSpeed * dt;
      placeOrbit();
    });
  }

  // The headline's text switch (v168, Ramir: "From two lines of text into 'Great sleep starts on your sales floor.' ...
  // The text switch should be a mask change. The previous text goes up into the y-direction, the next 2 lines come up").
  // Each line is a mask holding two texts (css: .intro-line__from / __to), and --sw (0 to 1) moves them.
  // v169 (Ramir: "It also needs to complete its animation, not be scrub based"): the switch is a timed animation. Once
  // the scroll passes SWITCH_AT of the half turn it plays to the end: each line takes SWITCH_LINE seconds, eased in and
  // out, the second SWITCH_STAGGER after the first. Coming back above (SWITCH_BACK of slack, so resting on the line
  // can't flicker it) plays it back; turning round mid-way just runs the playhead the other way, so it never jumps.
  // Reduced motion: a quick cross-fade (css) at the same point.
  const SWITCH_AT_NARROW = 0.25; // of the half turn's scroll, tablet and phone (2.88 screens: 0.72 screens in)
  const SWITCH_AT_WIDE = 0.45;   // desktop (2.25 screens: 1.01 screens in; was 0.25 of 1.8 = 0.45 screens)
  const SWITCH_BACK = 0.04;
  // Timing: 0.8 s per line, 0.12 s apart, about 0.92 s in all (v169; v170–v171 tried 0.6 and 0.75 s, but Ramir: "The
  // text switch was fine before, i'm talking about the overall scroll", so it is back to v169's).
  const SWITCH_LINE = reduceMotion ? 0.3 : 0.8; // seconds per line
  const SWITCH_STAGGER = reduceMotion ? 0 : 0.12; // seconds between the lines
  const switchLines = [...root.querySelectorAll('.intro-title .intro-line')].filter((l) => l.querySelector('.intro-line__from'));
  const switchTotal = SWITCH_LINE + SWITCH_STAGGER * Math.max(0, switchLines.length - 1);
  let switchOn = false; // which headline the scroll is asking for
  let switchT = 0; // the playhead, seconds: 0 = first headline, switchTotal = second
  let switchPrimed = false;
  const showSwitch = () => {
    switchLines.forEach((line, i) => {
      const t = clamp01((switchT - i * SWITCH_STAGGER) / SWITCH_LINE);
      line.style.setProperty('--sw', (reduceMotion ? t : easeInOut(t)).toFixed(4));
    });
    // v175 (Ramir: the question on a black background, back to the gradient for the answer): the opening's black
    // (css: .intro-aura::after) lifts over the whole switch, on the same playhead, so it also plays back with it.
    const day = clamp01(switchT / switchTotal);
    if (introLayer) introLayer.style.setProperty('--intro-day', (reduceMotion ? day : easeInOut(day)).toFixed(4));
  };
  if (switchLines.length) {
    gsap.ticker.add((time, deltaTime) => {
      const goal = switchOn ? switchTotal : 0;
      if (switchT === goal) return;
      const dt = Math.min(Math.max(deltaTime, 1) / 1000, 0.05);
      switchT = goal > switchT ? Math.min(goal, switchT + dt) : Math.max(goal, switchT - dt);
      showSwitch();
    });
  }

  let introDone = null;
  function updateAll(p) {
    const x = p * span;
    // ip: the opening as it was before the half turn (2026-11-09), which now starts turnLead screens in.
    const ip = intro ? clamp01((x - turnLead) / (intro - turnLead)) : 1;
    const live = ip >= 1;
    update(intro ? clamp01((x - intro) / total) : p, live);
    if (!intro) return;
    introTurn = turnLen ? clamp01(x / turnLen) : 0;
    if (switchLines.length) {
      const f = turnLen ? x / turnLen : 1;
      const SWITCH_AT = narrowMQ.matches ? SWITCH_AT_NARROW : SWITCH_AT_WIDE;
      if (!switchPrimed) {
        // a page opened mid-scroll starts on the right headline, without playing
        switchOn = f >= SWITCH_AT; switchT = switchOn ? switchTotal : 0; switchPrimed = true; showSwitch();
      } else if (!switchOn && f >= SWITCH_AT) switchOn = true;
      else if (switchOn && f < SWITCH_AT - SWITCH_BACK) switchOn = false;
    }
    // The medley scatters over 0–60% of the opening while the headline rises from the middle of the screen to its place
    // above the window (target over 0–55%, shown with inertia). The window fades in and grows from 30%, so it overlaps
    // the medley's second half (Ramir, 2026-11-09: "overlap ... by a bit", then "needs to overlap a bit more"); it still
    // waits for the headline to clear it (CSS gate on --intro-u), so in practice it shows from about 36%.
    // v166: the scatter eases in over its first 12% (it now starts while the half turn is still moving), then runs straight.
    const m = softStart(clamp01(ip / 0.6), 0.12);
    const g = clamp01((ip - 0.3) / 0.7);
    const e = easeInOut(g);
    introM = m;
    introG = g;
    riseTarget = smooth(clamp01(ip / RISE_END));
    if (reduceMotion) { rise = riseTarget; riseVel = 0; showRise(); }
    root.style.setProperty('--intro', ip.toFixed(4));
    root.style.setProperty('--intro-m', m.toFixed(4));
    root.style.setProperty('--intro-g', g.toFixed(4));
    root.style.setProperty('--intro-e', e.toFixed(4));
    // Scene 1 reaches full size a little before the window does, so it always covers the window as it opens.
    root.style.setProperty('--intro-s', (INTRO_S0 + (1 - INTRO_S0) * Math.min(1, e * 1.1)).toFixed(4));
    if (ui) ui.style.opacity = clamp01((ip - 0.9) / 0.1).toFixed(3);
    if (live !== introDone) {
      introDone = live;
      root.toggleAttribute('data-intro-done', live);
    }
  }

  const trigger = ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => updateAll(self.progress),
    onRefresh: (self) => { measureIntro(); updateAll(self.progress); },
  });
  measureIntro();
  // The headline and the medley rise in once the opening is in view (straight away on load: it is the top of the page).
  if (introLayer) {
    const reveal = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      document.fonts.ready.then(() => requestAnimationFrame(() => {
        introLayer.classList.add('is-in');
        if (orbitOn && enterT < 0) enterT = 0; // v177: the photos' entrance starts with the headline's rise
      }));
      reveal.disconnect();
    }, { threshold: 0.35 });
    reveal.observe(stage);
  }

  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    scenes.forEach((s) => s.preload && s.preload());
    io.disconnect();
  }, { rootMargin: '150% 0px' });
  io.observe(root);

  window.addEventListener('resize', () => { scenes.forEach((s) => s.resize && s.resize()); splitTitles(); measureIntro(); updateAll(trigger.progress); });
  narrowMQ.addEventListener('change', () => { setLengths(); ScrollTrigger.refresh(); });
  updateAll(trigger.progress);
}

initNav();
initStatement();
document.querySelectorAll('[data-scenes]').forEach(initScenes);
document.fonts.ready.then(() => ScrollTrigger.refresh());
