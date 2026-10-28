/* KFT · the story stage, BLUE FIRE, the evenings' drift and the architects' plan.
   One pinned stage and one master timeline on scroll (MV:g18), full screen all the way: the chapters ride on the film.
   The timeline runs 248 units over the .runway's 340vh of scroll (css/site.css), slow enough to watch each part.
   At its end the photo melts into the night ground at its foot, and the evenings start on the same night below it.
   The BLUE FIRE name is cut out of the white page, the camera flying through its I into the grill photo (MV:g156, 40vh).
   The story's own ground follows the film (white paper while the drawing shows, night over the photo and the dusk):
   it writes data-theme on the story and tells js/site.js, which turns the page's ground.
   Without GSAP, with reduced motion or with "stop animations" on, the page stays the static version: real text and still images.
   The oven's flicker is CSS only, so nothing here writes to the page while it is still. */
(() => {
  const root = document.documentElement;
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
  const veil = $('.rail-veil');
  const stFade = $('.st-fade');
  const tags = $('.plan-tags');
  const chScrim = $('.ch-scrim');
  const chaptersEl = $('.chapters');
  const chapters = [...chaptersEl.querySelectorAll('.chapter')];
  const PAPER = '#FFFFFF';
  const N = 210;
  const YARD = 60; // the first frame of the film: the same plan, chalked on the paving of the yard
  // phones, and tablets held upright (the same query as the sheet layout in the CSS)
  const SHEET_MQ = '(max-width: 767px), (max-width: 1023px) and (orientation: portrait)';
  const SVGNS = 'http://www.w3.org/2000/svg';
  // the plan's top edge in the last frames of the rise, as a share of the frame's height (measured on the frames)
  const PLAN_TOP = 0.143;
  const theme = (t) => { if (story.dataset.theme !== t) { story.dataset.theme = t; document.dispatchEvent(new Event('kft:theme')); } };

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
  let W = 0, H = 0, dpr = 1, lastKey = '', live = false, fx = 0.5, veilFoot = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(canvas.clientWidth * dpr);
    H = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    fx = (parseFloat(getComputedStyle(root).getPropertyValue('--fx')) || 50) / 100;
    veilFoot = veil.offsetTop + veil.offsetHeight;
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
    // as the camera rises the plan settles a little lower than it was drawn, so its top edge stays clear of the rail's
    // band; from the photo's own frame (none) to the finished plan (all), and back to none as the paper becomes the yard
    const settle = Math.max(0, (veilFoot - 12) * dpr - (r.y + PLAN_TOP * r.h));
    r.y += settle * (i < YARD ? i / (YARD - 1) : 1) * (1 - Math.min(1, S.yard));
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    if (over) { ctx.globalAlpha = Math.min(1, S.yard); ctx.drawImage(over, r.x, r.y, r.w, r.h); ctx.globalAlpha = 1; }
    // the plan's labels ride on the same rectangle as the drawing
    Object.assign(tags.style, { left: `${(r.x / dpr).toFixed(1)}px`, top: `${(r.y / dpr).toFixed(1)}px`, width: `${(r.w / dpr).toFixed(1)}px`, height: `${(r.h / dpr).toFixed(1)}px` });
  }

  /* ---- state, written by the timeline and painted in one place, and only what changed ---- */
  const S0 = { frame: 0, lines: 0, dim: 0, wipe: 0, edge: 0, tags: 0, yard: 0, photo: 1, scrim: 1, copy: 1, c0: 0, c1: 0, c2: 0, paper: 0, chs: 0, fade: 0 };
  const S = { ...S0 };
  const last = new Map();
  const put = (key, val, fn) => { if (last.get(key) !== val) { last.set(key, val); fn(val); } };
  let tl = null;
  // the rail comes in only once the drawing is whole paper under its veil, never while the photo is still being erased
  const RAIL_A = 80, RAIL_B = 240;
  let past = false;

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
    put('fade', S.fade.toFixed(3), (v) => { stFade.style.opacity = v; });
    put('pv', (1 - S.yard).toFixed(3), (v) => veil.style.setProperty('--pv', v));
    [S.c0, S.c1, S.c2].forEach((c, i) => put(`c${i}`, c.toFixed(3), (v) => {
      chapters[i].style.setProperty('--show', v);
      chapters[i].classList.toggle('is-shown', +v > 0.001);
    }));
    draw(false);
    // the photo shows at the start, until it is half erased, and again at the very end; the yard is a photo too, so
    // the rail takes its dark dress halfway through the paper becoming the yard, and keeps it to the end
    const photo = S.photo > 0.5 && S.wipe < 50;
    put('tone', photo || S.yard > 0.5 || S.chs > 0.5 || S.frame > 150 ? 'dark' : 'light', (v) => { stage.dataset.tone = v; theme(v === 'dark' ? 'night' : 'paper'); });
    put('rail', Math.max(0, Math.min(1, (p - RAIL_A) / (RAIL_B - 8 - RAIL_A))).toFixed(3), (v) => rail.style.setProperty('--rail', v));
    put('ch', p < RAIL_A || p > RAIL_B ? '' : p < 129 ? 'table' : p < 182 ? 'factory' : 'install', (ch) => {
      railItems.forEach((li) => li.classList.toggle('on', li.dataset.ch === ch));
      rail.classList.toggle('show', !!ch);
      veil.classList.toggle('show', !!ch);
    });
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
    // 6 · and the render gives way to the real photo it was matched to: the stools, the plants, the fire;
    // its foot melts into the night, where the evenings begin
    tl.to(S, { photo: 1, duration: 11, ease: 'power1.inOut' }, 233);
    tl.to(S, { fade: 1, duration: 10 }, 238);
    tl.set({}, {}, 248);
    ScrollTrigger.create({ trigger: pinZone, start: 'top top', end: 'bottom bottom', scrub: 0.8, animation: tl });
    ScrollTrigger.create({ trigger: pinZone, start: 'bottom top', onEnter: () => { past = true; paint(); }, onLeaveBack: () => { past = false; paint(); } });
  }

  /* ---- BLUE FIRE: the name is cut out of the white page, the grill photo behind it. On the way in its outline
     draws and the letters open; pinned, the camera flies through the I of FIRE until the photo fills the screen,
     and its foot melts into the night of the brand's page below ---- */
  const bfScene = document.querySelector('.bf-scene');
  const bfPin = bfScene && bfScene.querySelector('.bf-pin');
  const bfSvg = bfScene && bfScene.querySelector('.bf-cut');
  const bfImg = bfScene && bfScene.querySelector('img');
  const bfFade = bfScene && bfScene.querySelector('.bf-fade');

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
      if (bfFade) bfFade.style.opacity = Math.max(0, (z - 0.7) / 0.3).toFixed(3);
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
      [bfImg, bfSvg, bfFade].forEach((el) => el && el.removeAttribute('style'));
    };
  }

  /* ---- each evening drifts a little inside its own crop as it passes; the plan plots line by line ---- */
  function buildScrubs() {
    const kills = [];
    const mImgs = [...document.querySelectorAll('.m-ph img')];
    mImgs.forEach((img) => kills.push(ScrollTrigger.create({
      trigger: img.closest('.m-ph'), start: 'top bottom', end: 'bottom top', scrub: 0.6,
      animation: gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', paused: true }),
    })));
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
      if (mImgs.length) gsap.set(mImgs, { clearProps: 'transform' });
      if (plot) { plot.style.removeProperty('--plot'); plot.style.removeProperty('--dims'); }
    };
  }

  function goLive(isSheet) {
    live = true;
    root.classList.add('is-live');
    // the chapters ride on the film: moved into the stage, over the canvas and under the rail's veil
    stage.insertBefore(chaptersEl, veil);
    resize();
    build();
    paint();
    const unB = buildGrill(isSheet);
    const unS = buildScrubs();
    if (!loading) { loading = true; if (document.readyState === 'complete') loadFrames(); else addEventListener('load', loadFrames, { once: true }); }
    const onRefresh = () => resize();
    ScrollTrigger.addEventListener('refresh', onRefresh);
    ScrollTrigger.refresh();
    return () => {
      live = false;
      unB(); unS();
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      root.classList.remove('is-live');
      story.appendChild(chaptersEl);
      Object.assign(S, S0);
      stage.style.removeProperty('--wipe');
      stage.removeAttribute('data-tone');
      [heroCopy, hero, scrim, linesOver, dim, edge, tags, chScrim, chaptersEl, rail, stFade, veil, ...chapters].forEach((el) => el.removeAttribute('style'));
      chapters.forEach((c) => c.classList.remove('is-shown'));
      rail.classList.remove('show');
      veil.classList.remove('show');
      railItems.forEach((li) => li.classList.remove('on'));
      theme('night');
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
