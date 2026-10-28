/* KFT · the story stage, the moments sheet, BLUE FIRE, the voices' wave and the architects' plan.
   One pinned stage and one master timeline on scroll (MV:g18), full screen all the way: the chapters ride on the film.
   The timeline runs 248 units over the .runway's 180vh of scroll (css/site.css); the page keeps pinned scroll under 30%.
   Then the photo the story ended on shrinks into its place on the moments sheet (one pinned screen, 76vh), and the
   BLUE FIRE name is cut out of the white page, the camera flying through its I into the grill photo (MV:g156, 60vh).
   Without GSAP, with reduced motion or with "stop animations" on, the page stays the static version: real text and still images.
   The oven's flicker is CSS only, so nothing here writes to the page while it is still. */
(() => {
  const root = document.documentElement;

  /* ---- the voices' wave: one recording across the page, built here so the markup stays clean. Heights are a fixed
     sum of sines (the same wave on every visit); --k is each bar's place from the start side ---- */
  const wave = document.querySelector('.wave');
  if (wave && !wave.children.length) {
    const n = innerWidth < 768 ? 64 : 128;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const env = Math.sin(Math.PI * t) * 0.55 + 0.45;
      const h = Math.abs(Math.sin(i * 0.53) * 0.5 + Math.sin(i * 1.71 + 1) * 0.3 + Math.sin(i * 0.17 + 2) * 0.2) * env;
      const b = document.createElement('i');
      b.style.setProperty('--k', t.toFixed(4));
      b.style.setProperty('--h', Math.max(0.06, h).toFixed(3));
      frag.appendChild(b);
    }
    wave.appendChild(frag);
  }

  const story = document.querySelector('.story');
  if (!story || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s) => story.querySelector(s);
  const pinZone = $('.pin-zone');
  const stage = $('.stage');
  const canvas = $('.seq');
  const ctx = canvas.getContext('2d', { alpha: false });
  const heroCopy = $('.hero');
  const hero = $('.ph-hero');
  const scrim = $('.scrim');
  const linesOver = $('.lines-over');
  const dim = $('.dim');
  const edge = $('.wipe-edge');
  const rail = $('.rail');
  const railItems = [...rail.querySelectorAll('li')];
  const tags = $('.plan-tags');
  const chScrim = $('.ch-scrim');
  const chaptersEl = $('.chapters');
  const chapters = [...chaptersEl.querySelectorAll('.chapter')];
  const meta = $('.stage-meta');
  const PAPER = '#FFFFFF';
  const N = 210;
  const YARD = 60; // the first frame of the film: the same plan, chalked on the paving of the yard
  // phones, and tablets held upright (the same query as the sheet layout in the CSS)
  const SHEET_MQ = '(max-width: 767px), (max-width: 1023px) and (orientation: portrait)';

  /* ---- frames: index 0-59 rise from the photo's camera to the white paper plan (a line drawing).
     60-209 are the film, rendered in Blender (../blender/kft_film.py): the plan chalked on the yard, the kitchen built
     on it while the sun sets, and the camera coming down to the photographer's eye as the lights come on.
     Its last frame sits on the evening photo, so the story ends on the photo it started from ---- */
  const pad = (n) => String(n).padStart(3, '0');
  const frameName = (i) => (i < YARD ? `flight_${pad(YARD - 1 - i)}` : `film_${pad(i - YARD)}`);
  const frames = new Array(N);
  let loading = false;

  function loadFrames() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tier = innerWidth >= 1024 && innerWidth * dpr > 1500 ? '1920' : '1280';
    const order = [];
    const seen = new Set();
    const push = (i) => { if (i >= 0 && i < N && !seen.has(i)) { seen.add(i); order.push(i); } };
    [0, YARD - 1, YARD, N - 1].forEach(push);
    [8, 4, 2, 1].forEach((step) => { for (let i = 0; i < N; i += step) push(i); });
    let next = 0;
    const worker = () => {
      if (next >= order.length) return;
      const i = order[next++];
      const img = new Image();
      img.decoding = 'async';
      img.src = `frames/${tier}/${frameName(i)}.webp`;
      img.decode().then(() => { frames[i] = img; if (live && Math.abs(i - Math.round(S.frame)) < 3) draw(true); }).catch(() => {}).finally(worker);
    };
    // four at a time: over HTTP/1.1 that leaves two connections for the page's own pictures
    for (let w = 0; w < 4; w++) worker();
  }

  function nearest(i) {
    if (frames[i]) return frames[i];
    for (let d = 1; d < N; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  /* ---- drawing: always cover, identical to the photo's object-fit and object-position (--fx), so the film fills the
     screen from the first frame to the last ---- */
  let W = 0, H = 0, dpr = 1, lastKey = '', live = false, fx = 0.5;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(canvas.clientWidth * dpr);
    H = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    fx = (parseFloat(getComputedStyle(root).getPropertyValue('--fx')) || 50) / 100;
    lastKey = '';
    draw(true);
  }
  function draw(force) {
    if (!W || !H) return;
    const i = Math.max(0, Math.min(N - 1, Math.round(S.frame)));
    const img = nearest(i);
    // the paper plan turns into the same plan on the yard: the film's first frame fades in over it
    const over = i < YARD && S.yard > 0 ? frames[YARD] : null;
    const key = `${i}|${S.yard.toFixed(3)}|${W}|${H}|${img ? img.src : ''}|${over ? 1 : 0}`;
    if (!force && key === lastKey) return;
    lastKey = key;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    if (!img) return;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(W / iw, H / ih);
    const r = { w: iw * s, h: ih * s };
    r.x = (W - r.w) * fx; r.y = (H - r.h) * 0.5;
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    if (over) { ctx.globalAlpha = Math.min(1, S.yard); ctx.drawImage(over, r.x, r.y, r.w, r.h); ctx.globalAlpha = 1; }
    // the plan's labels ride on the same rectangle as the drawing
    Object.assign(tags.style, { left: `${(r.x / dpr).toFixed(1)}px`, top: `${(r.y / dpr).toFixed(1)}px`, width: `${(r.w / dpr).toFixed(1)}px`, height: `${(r.h / dpr).toFixed(1)}px` });
  }

  /* ---- state, written by the timeline and painted in one place, and only what changed ---- */
  const S0 = { frame: 0, lines: 0, dim: 0, wipe: 0, edge: 0, tags: 0, yard: 0, photo: 1, scrim: 1, copy: 1, c0: 0, c1: 0, c2: 0, paper: 0, chs: 0 };
  const S = { ...S0 };
  const last = new Map();
  const put = (key, val, fn) => { if (last.get(key) !== val) { last.set(key, val); fn(val); } };
  let tl = null;
  const RAIL_A = 74, RAIL_B = 240;
  const NARROW = matchMedia('(max-width: 767px)');
  let past = false;
  const META_END = 226;

  function paint() {
    const p = tl ? tl.time() : 0;
    put('wipe', S.wipe.toFixed(2), (v) => stage.style.setProperty('--wipe', `${v}%`));
    put('hero', S.wipe >= 99.9 || S.photo <= 0, (v) => { hero.style.visibility = v ? 'hidden' : ''; });
    put('photo', S.photo.toFixed(3), (v) => { hero.style.opacity = v; });
    put('scrim', S.scrim.toFixed(3), (v) => { scrim.style.opacity = v; });
    // once the whole story has scrolled away, the hero's words are back in the page, out of sight, as they are without motion
    put('copy', past ? '' : S.copy.toFixed(3), (v) => { heroCopy.style.opacity = v; heroCopy.style.visibility = v === '' || +v ? '' : 'hidden'; });
    put('lines', S.lines.toFixed(3), (v) => { linesOver.style.opacity = v; });
    put('dim', S.dim.toFixed(3), (v) => { dim.style.opacity = v; });
    put('edge', S.edge.toFixed(3), (v) => { edge.style.opacity = v; });
    put('tags', S.tags.toFixed(3), (v) => { tags.style.opacity = v; });
    put('chs', S.chs.toFixed(3), (v) => { chScrim.style.opacity = v; });
    put('paper', S.paper.toFixed(3), (v) => chaptersEl.style.setProperty('--paper', v));
    [S.c0, S.c1, S.c2].forEach((c, i) => put(`c${i}`, c.toFixed(3), (v) => {
      chapters[i].style.setProperty('--show', v);
      chapters[i].classList.toggle('is-shown', +v > 0.001);
    }));
    draw(false);
    // the photo shows at the start, until it is half erased, and again at the very end
    const photo = S.photo > 0.5 && S.wipe < 50;
    put('tone', photo || S.chs > 0.5 || S.frame > 150 ? 'dark' : 'light', (v) => { stage.dataset.tone = v; });
    put('rail', Math.max(0, Math.min(1, (p - RAIL_A) / (RAIL_B - 8 - RAIL_A))).toFixed(3), (v) => rail.style.setProperty('--rail', v));
    put('ch', p < RAIL_A || p > RAIL_B ? '' : p < 129 ? 'table' : p < 182 ? 'factory' : 'install', (ch) => {
      railItems.forEach((li) => li.classList.toggle('on', li.dataset.ch === ch));
      rail.classList.toggle('show', !!ch);
    });
    // on a phone the hero's words scroll up through the pause button's place, so it steps aside until they are gone
    // and on every screen it steps aside before the moments' sheet rises over the story's last screen
    put('meta', (NARROW.matches && p > 4 && S.copy > 0.05) || p > META_END ? '0' : '1', (v) => { meta.style.opacity = v; meta.style.visibility = +v ? '' : 'hidden'; });
  }

  function build() {
    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: paint });
    // 1 · the photo is traced: cream lines over the evening photo, which dims under them
    tl.to(S, { lines: 1, dim: 0.38, duration: 23 }, 5);
    // 2 · the photo is erased from the bottom up and leaves the drawing of the same kitchen, on white paper
    tl.to(S, { wipe: 100, duration: 46, ease: 'power1.inOut' }, 31);
    tl.to(S, { edge: 1, duration: 5 }, 31).to(S, { edge: 0, duration: 6 }, 71);
    // the hero's words leave with the photo, before the rising edge reaches them, so they never sit on the paper
    tl.to(S, { copy: 0, duration: 12 }, 49);
    // the photo stays out of sight from here until the end, clean: no lines, no dimming, no hero scrim
    tl.set(S, { photo: 0, wipe: 0, lines: 0, dim: 0, scrim: 0 }, 78);
    // 3 · the table: the camera rises until the drawing is a plan; the chapter rises out of its hairline beside it
    tl.to(S, { frame: YARD - 1, duration: 42, ease: 'power1.inOut' }, 74);
    tl.to(S, { paper: 1, duration: 6 }, 78).to(S, { paper: 0, duration: 5 }, 121);
    tl.to(S, { c0: 1, duration: 6, ease: 'power2.out' }, 80).to(S, { c0: 0, duration: 5, ease: 'power2.in' }, 121);
    tl.to(S, { tags: 1, duration: 6 }, 104).to(S, { tags: 0, duration: 5 }, 121);
    // the paper becomes the yard: the same plan, chalked on the paving in the late afternoon sun
    tl.to(S, { yard: 1, duration: 11, ease: 'power1.inOut' }, 119);
    // 4 · the factory: the kitchen is built on its plan, the cabinet, then the front, then the stone top
    tl.to(S, { frame: YARD + 86, duration: 52 }, 129);
    tl.to(S, { chs: 1, duration: 6 }, 128);
    tl.to(S, { c1: 1, duration: 6, ease: 'power2.out' }, 131).to(S, { c1: 0, duration: 5, ease: 'power2.in' }, 173);
    // 5 · installation: the camera comes down to the photographer's eye and the lights come on
    tl.to(S, { frame: N - 1, duration: 51 }, 182);
    tl.to(S, { c2: 1, duration: 6, ease: 'power2.out' }, 184).to(S, { c2: 0, duration: 5, ease: 'power2.in' }, 223);
    tl.to(S, { chs: 0, duration: 10 }, 228);
    // 6 · and the render gives way to the real photo it was matched to: the stools, the plants, the fire
    tl.to(S, { photo: 1, duration: 11, ease: 'power1.inOut' }, 233);
    tl.set({}, {}, 248);
    ScrollTrigger.create({ trigger: pinZone, start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: tl });
    ScrollTrigger.create({ trigger: pinZone, start: 'bottom top', onEnter: () => { past = true; paint(); }, onLeaveBack: () => { past = false; paint(); } });
  }

  /* ---- the moments. Wide screens: the section rises over the story's last screen with the very same photo, so the
     handoff is invisible; then the photo shrinks into its slot on the sheet (FLIP: the frame's own box
     shrinks, the picture covers it), the grid's hairlines draw, and the evenings around the kitchen come in one by one, then the closing line.
     Sheet layout: the same photo opens the section full screen, and the moments follow in two columns, no pin ---- */
  const mSec = document.getElementById('moments');
  const mPin = mSec && mSec.querySelector('.m-pin');
  const mK = mSec && mSec.querySelector('.m-k');
  const mSlot = mSec && mSec.querySelector('.m-slot');
  const mGrid = mSec && mSec.querySelector('.m-grid');
  const mLines = mSec && mSec.querySelector('.m-lines');
  const mHead = mSec && mSec.querySelector('.m-head');
  const mCells = mSec ? [...mSec.querySelectorAll('.m')] : [];
  const mClose = mSec && mSec.querySelector('.m-close');
  const SVGNS = 'http://www.w3.org/2000/svg';

  function buildMoments(isSheet) {
    if (!mSec) return () => {};
    const kills = [];
    mSec.classList.toggle('is-flow', isSheet);
    // the section is on (the photo shows) once its top reaches the top of the screen
    kills.push(ScrollTrigger.create({ trigger: mSec, start: 'top top', end: 'bottom top', onToggle: (st) => mSec.classList.toggle('is-on', st.isActive || st.progress >= 1) }));
    if (isSheet) return () => kills.forEach((k) => k.kill());

    const M = { u: 0 };
    let G = null;
    // measured in the pinned screen's own coordinates; the pin never moves inside its box, so once per refresh is enough
    const measure = () => {
      const pr = mPin.getBoundingClientRect();
      const sr = mSlot.getBoundingClientRect();
      const gr = mGrid.getBoundingClientRect();
      G = { W: pr.width, H: pr.height, x: sr.left - pr.left, y: sr.top - pr.top, w: sr.width, h: sr.height };
      // the sheet's hairlines: the edges and the gaps between the cells, drawn from the measured cells
      const rects = mCells.map((c) => c.getBoundingClientRect());
      const cols = [...new Set(rects.map((r) => Math.round(r.left)))].sort((a, b) => a - b);
      const rows = [...new Set(rects.map((r) => Math.round(r.top)))].sort((a, b) => a - b);
      const gx = gr.left, gy = gr.top, gw = gr.width, gh = gr.height;
      const gap = parseFloat(getComputedStyle(mGrid).columnGap) || 0;
      const xs = [0, gw];
      const colW = rects[0].width;
      cols.slice(0, -1).forEach((c) => xs.push(c - gx + colW + gap / 2));
      // between the two middle columns there is the kitchen: its edges are the lines there
      const ys = [0, gh];
      rows.slice(1).forEach((r) => ys.push(r - gy - gap / 2));
      const ext = Math.min(48, gx);
      mLines.setAttribute('viewBox', `0 0 ${gw} ${gh}`);
      mLines.setAttribute('width', gw);
      mLines.setAttribute('height', gh);
      mLines.textContent = '';
      const line = (x1, y1, x2, y2) => {
        const l = document.createElementNS(SVGNS, 'line');
        Object.entries({ x1, y1, x2, y2, pathLength: 1 }).forEach(([k, v]) => l.setAttribute(k, typeof v === 'number' ? v.toFixed(1) : v));
        mLines.appendChild(l);
      };
      [...new Set(ys.map((y) => Math.round(y)))].forEach((y) => line(gw + ext, y, -ext, y)); // from the start side (right)
      [...new Set(xs.map((x) => Math.round(x)))].sort((a, b) => b - a).forEach((x) => line(x, -ext / 2, x, gh + ext / 2));
      paintM();
    };
    const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const lerp = (a, b, t) => a + (b - a) * t;
    function paintM() {
      if (!G) return;
      const u = inOut(Math.max(0, Math.min(1, M.u)));
      const x = lerp(0, G.x, u), y = lerp(0, G.y, u), w = lerp(G.W, G.w, u), h = lerp(G.H, G.h, u);
      // the frame itself shrinks to the slot (not a clip over a full-screen box), so once it lands it is just the cell;
      // the photo and its fire both cover the frame with the same crop, so they stay matched at every size
      mK.style.inset = 'auto';
      Object.assign(mK.style, { left: `${x.toFixed(1)}px`, top: `${y.toFixed(1)}px`, width: `${w.toFixed(1)}px`, height: `${h.toFixed(1)}px` });
    }
    const mt = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    mt.to(M, { u: 1, duration: 0.38, onUpdate: paintM }, 0);
    mt.fromTo(mHead, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.18);
    mt.fromTo(mLines, { '--draw': 0 }, { '--draw': 1, duration: 0.26, ease: 'power1.inOut' }, 0.22);
    mCells.forEach((c, i) => {
      const fig = c.querySelector('figure'), img = c.querySelector('img'), cap = c.querySelector('p');
      const at = 0.38 + i * 0.065;
      mt.fromTo(fig, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.14, ease: 'power2.inOut' }, at);
      mt.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 0.2, ease: 'power2.out' }, at);
      // autoAlpha: until its photo has landed, a caption is out of the page too, not only transparent
      mt.fromTo(cap, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: 'power2.out' }, at + 0.08);
    });
    mt.fromTo(mClose, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power2.out' }, 0.82);
    mt.set({}, {}, 1);
    kills.push(ScrollTrigger.create({ trigger: mSec, start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: mt, onRefresh: measure }));
    measure();
    return () => {
      kills.forEach((k) => k.kill());
      mt.revert();
      mK.removeAttribute('style');
      mLines.textContent = '';
    };
  }

  /* ---- BLUE FIRE: the name is cut out of the white page, the grill photo behind it. On the way in its outline
     draws and the letters open; pinned, the camera flies through the I of FIRE until the photo fills the screen ---- */
  const bfScene = document.querySelector('.bf-scene');
  const bfPin = bfScene && bfScene.querySelector('.bf-pin');
  const bfSvg = bfScene && bfScene.querySelector('.bf-cut');
  const bfImg = bfScene && bfScene.querySelector('img');

  function buildGrill(isSheet) {
    if (!bfScene) return () => {};
    const kills = [];
    const B = { draw: 0, open: 0, z: 0 };
    let Z = null;
    const make = (tag, attrs, parent) => {
      const el = document.createElementNS(SVGNS, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      if (parent) parent.appendChild(el);
      return el;
    };
    const layout = () => {
      const W = bfPin.clientWidth, H = bfPin.clientHeight;
      if (!W || !H) return;
      const two = isSheet || W / H < 1.1;
      const lines = two ? ['BLUE', 'FIRE'] : ['BLUE FIRE'];
      // the I's ink, measured on a canvas at 100px: its width, and its height above the baseline
      const c = document.createElement('canvas').getContext('2d');
      c.font = '700 100px GS';
      c.direction = 'ltr'; c.textAlign = 'left';
      const mI = c.measureText('I');
      const iw100 = mI.actualBoundingBoxLeft + mI.actualBoundingBoxRight;
      const cap100 = mI.actualBoundingBoxAscent;
      const wide100 = Math.max(...lines.map((t) => c.measureText(t).width));
      const fs = (W * (two ? 0.8 : 0.88) / wide100) * 100;
      const cap = (cap100 * fs) / 100, lead = cap * 1.32;
      bfSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      bfSvg.textContent = '';
      const defs = make('defs', {}, bfSvg);
      const mask = make('mask', { id: 'bf-m', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);
      make('rect', { x: -W, y: -H, width: W * 3, height: H * 3, fill: '#fff' }, mask);
      const gm = make('g', {}, mask);
      make('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff', mask: 'url(#bf-m)' }, bfSvg);
      const go = make('g', { class: 'bf-o' }, bfSvg);
      const top = H / 2 - ((lines.length - 1) * lead + cap) / 2;
      const texts = [];
      lines.forEach((t, i) => {
        const base = top + cap + i * lead;
        const a = { x: W / 2, y: base, 'text-anchor': 'middle', direction: 'ltr', 'font-size': fs.toFixed(1) };
        const tm = make('text', { ...a, fill: '#000' }, gm);
        tm.textContent = t;
        const to = make('text', { ...a, class: 'bf-out', 'stroke-dasharray': (fs * 4).toFixed(0) }, go);
        to.textContent = t;
        texts.push({ tm, to, base });
      });
      // the I of FIRE: its cell from the laid-out text, its ink from the canvas
      const row = texts[texts.length - 1];
      const idx = two ? 1 : 6;
      const ext = row.tm.getExtentOfChar(idx);
      const k = fs / 100;
      const inkL = ext.x - mI.actualBoundingBoxLeft * k, inkW = iw100 * k;
      const A = { x: inkL + inkW / 2, y: row.base - cap / 2 };
      // the same stem as a plain rect: huge scaled glyphs can drop out of a mask, a rect never does
      const stem = make('rect', { x: inkL.toFixed(2), y: (row.base - cap).toFixed(2), width: inkW.toFixed(2), height: cap.toFixed(2), fill: '#000' }, gm);
      const sEnd = (W * 1.2) / inkW;
      Z = { W, H, A, C: { x: W / 2, y: H / 2 }, sEnd: Math.max(sEnd, (H * 1.2) / cap), fs, gm, go, texts, stem };
      paintB();
    };
    const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    function paintB() {
      if (!Z) return;
      const z = Math.max(0, Math.min(1, B.z));
      const s = Math.pow(Z.sEnd, z);
      const q = inOut(Math.min(1, z * 1.8));
      const px = Z.A.x + (Z.C.x - Z.A.x) * q, py = Z.A.y + (Z.C.y - Z.A.y) * q;
      const tr = `translate(${px.toFixed(2)} ${py.toFixed(2)}) scale(${s.toFixed(4)}) translate(${(-Z.A.x).toFixed(2)} ${(-Z.A.y).toFixed(2)})`;
      Z.gm.setAttribute('transform', tr);
      Z.go.setAttribute('transform', tr);
      const dash = Z.fs * 4;
      Z.texts.forEach((t) => {
        t.to.setAttribute('stroke-dashoffset', (dash * (1 - B.draw)).toFixed(1));
        t.tm.setAttribute('fill-opacity', B.open.toFixed(3));
      });
      Z.stem.setAttribute('fill-opacity', B.open.toFixed(3));
      bfSvg.style.visibility = z > 0.995 ? 'hidden' : '';
      Z.go.setAttribute('opacity', Math.max(0, 1 - z / 0.3).toFixed(3));
      bfImg.style.transform = `scale(${(1.12 - 0.12 * z).toFixed(4)})`;
    }
    const run = () => document.fonts.load('700 100px GS').then(layout, layout);
    // on the way in: the outline draws, then the letters open onto the photo
    const entry = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: paintB });
    entry.to(B, { draw: 1, duration: 0.6, ease: 'power1.inOut' }, 0).to(B, { open: 1, duration: 0.45, ease: 'power1.in' }, 0.55);
    kills.push(ScrollTrigger.create({ trigger: bfScene, start: 'top 85%', end: 'top top', scrub: 0.6, animation: entry }));
    const zoom = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: paintB });
    zoom.to(B, { z: 1, duration: 1, ease: 'power1.in' }, 0);
    kills.push(ScrollTrigger.create({ trigger: bfScene, start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: zoom, onRefresh: run }));
    run();
    return () => {
      kills.forEach((k) => k.kill());
      entry.kill(); zoom.kill();
      bfSvg.textContent = '';
      [bfImg, bfSvg].forEach((el) => el && el.removeAttribute('style'));
    };
  }

  /* ---- the voices' wave plays from the start side as it crosses the screen; the plan plots line by line ---- */
  function buildScrubs() {
    const kills = [];
    const band = document.querySelector('.wave-band');
    if (wave && band) {
      const W = { p: 0 };
      kills.push(ScrollTrigger.create({
        trigger: band, start: 'top 85%', end: 'bottom 30%', scrub: 0.6,
        animation: gsap.to(W, { p: 1, ease: 'none', paused: true, onUpdate: () => wave.style.setProperty('--p', W.p.toFixed(3)) }),
      }));
    }
    const plot = document.querySelector('.plot');
    if (plot) {
      const P = { plot: 0, dims: 0 };
      const pt = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => {
        plot.style.setProperty('--plot', P.plot.toFixed(3));
        plot.style.setProperty('--dims', P.dims.toFixed(3));
      } });
      pt.to(P, { plot: 1, duration: 0.7, ease: 'power1.inOut' }, 0).to(P, { dims: 1, duration: 0.45, ease: 'power1.inOut' }, 0.55);
      kills.push(ScrollTrigger.create({ trigger: plot, start: 'top 85%', end: 'center 40%', scrub: 0.6, animation: pt }));
    }
    return () => {
      kills.forEach((k) => k.kill());
      if (wave) wave.style.removeProperty('--p');
      if (plot) { plot.style.removeProperty('--plot'); plot.style.removeProperty('--dims'); }
    };
  }

  function goLive(isSheet) {
    live = true;
    root.classList.add('is-live');
    // the chapters ride on the film: moved into the stage, over the canvas and under the caption
    stage.insertBefore(chaptersEl, meta);
    resize();
    build();
    paint();
    const unM = buildMoments(isSheet);
    const unB = buildGrill(isSheet);
    const unS = buildScrubs();
    if (!loading) { loading = true; if (document.readyState === 'complete') loadFrames(); else addEventListener('load', loadFrames, { once: true }); }
    const onRefresh = () => resize();
    ScrollTrigger.addEventListener('refresh', onRefresh);
    ScrollTrigger.refresh();
    return () => {
      live = false;
      unM(); unB(); unS();
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      root.classList.remove('is-live');
      story.appendChild(chaptersEl);
      Object.assign(S, S0);
      stage.style.removeProperty('--wipe');
      stage.removeAttribute('data-tone');
      [heroCopy, hero, scrim, linesOver, dim, edge, tags, chScrim, chaptersEl, rail, meta, ...chapters].forEach((el) => el.removeAttribute('style'));
      chapters.forEach((c) => c.classList.remove('is-shown'));
      rail.classList.remove('show');
      railItems.forEach((li) => li.classList.remove('on'));
      mSec && mSec.classList.remove('is-flow', 'is-on');
      last.clear();
      past = false;
      tl = null;
    };
  }

  /* ---- live or static: reduced motion, the sheet layout and the accessibility panel's "stop animations" ---- */
  // a11y.js loads after this file, so the saved choice is read here directly (the same key as js/a11y.js)
  let still = false;
  try { still = !!JSON.parse(localStorage.getItem('kft-a11y') || '{}').still; } catch (e) { /* private mode */ }
  let mm = null;
  const setup = () => {
    if (mm) mm.revert();
    mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', sheet: SHEET_MQ }, ({ conditions }) => {
      if (!conditions.motion || still) return;
      return goLive(conditions.sheet);
    });
  };
  setup();
  document.addEventListener('a11y:still', (e) => {
    if (!!e.detail === still) return;
    still = !!e.detail;
    setup();
  });
})();
