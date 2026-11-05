/* KFT · from your chair, the previous version (1.11.2026), back on the page next to the current one so the two can be compared (Liav, 5.11.2026). A copy of js/yours.js as it was, on its own section (.yours-prev) and frames (make_*).
   One kitchen, from the designer's sketch to its first evening, played by the scroll.
   One pinned stage (.y-stage) over a run of scroll (.y-run, css/site.css), one canvas and 192 frames (frames/<tier>/make_*):
   0-30 the sketch fills into a white model, 31-110 the stone, the copper and the garden come onto it by day,
   111-191 the sun goes down and the lights come on. Four short beats ride on the film, and at its end the last frame
   gives way to the same picture as a photo (.y-stones), where the reader picks the stone himself.
   The stone pick works in both versions; without GSAP, with reduced motion or with "stop animations" on,
   the section stays static: the four beats as text, the night picture and the stones under it. */
(() => {
  const sec = document.querySelector('.yours-prev');
  if (!sec) return;
  const root = document.documentElement;
  const $ = (s) => sec.querySelector(s);
  const stage = $('.y-stage');
  const stonesEl = $('.y-stones');
  const imgs = [...stonesEl.querySelectorAll('img')];
  const btns = [...sec.querySelectorAll('.y-sw button')];
  const said = $('[data-said]');
  const baseAlt = imgs[0].alt;

  /* ---- the stone pick: the other three stones load once the section is near, and cross-fade on the same frame ---- */
  let stonesLoaded = false;
  const loadStones = () => {
    if (stonesLoaded) return;
    stonesLoaded = true;
    imgs.forEach((img) => { if (img.dataset.srcset) { img.srcset = img.dataset.srcset; img.removeAttribute('data-srcset'); } });
  };
  const pick = (stone, announce) => {
    loadStones();
    let label = '';
    btns.forEach((b) => {
      const on = b.dataset.stone === stone;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) label = b.textContent.trim();
    });
    imgs.forEach((img) => {
      const on = img.dataset.stone === stone;
      img.classList.toggle('on', on);
      img.alt = on ? (stone === 'green' ? baseAlt : `${baseAlt}. בקיר: ${label}`) : '';
    });
    if (announce && said) said.textContent = `נבחר: ${label}`;
  };
  btns.forEach((b) => b.addEventListener('click', () => pick(b.dataset.stone, true)));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { loadStones(); io.disconnect(); } }, { rootMargin: '100% 0px' });
    io.observe(stonesEl);
  } else loadStones();

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const canvas = $('.y-seq');
  const ctx = canvas.getContext('2d', { alpha: false });
  const head = $('.y-h');
  const beats = [...sec.querySelectorAll('.y-beats li')];
  const pickEl = $('.y-pick');
  const N = 192;
  const PAPER = getComputedStyle(root).getPropertyValue('--ground').trim();
  // the model is still white until the stone starts to flow onto it
  const COLOUR = 44;
  const SHEET_MQ = '(max-width: 767px), (max-width: 1023px) and (orientation: portrait)';
  const theme = (t) => { if (sec.dataset.theme !== t) { sec.dataset.theme = t; document.dispatchEvent(new Event('kft:theme')); } };

  /* ---- frames: the ends first, then every 8th, 4th, 2nd, so any scroll position has a near frame early ---- */
  const pad = (n) => String(n).padStart(3, '0');
  const frames = new Array(N);
  let loading = false;
  function loadFrames() {
    if (loading) return;
    loading = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tier = innerWidth >= 1024 && innerWidth * dpr > 1500 ? '1920' : '1280';
    const order = [];
    const seen = new Set();
    const push = (i) => { if (i >= 0 && i < N && !seen.has(i)) { seen.add(i); order.push(i); } };
    [0, 30, 45, 111, N - 1].forEach(push);
    [8, 4, 2, 1].forEach((step) => { for (let i = 0; i < N; i += step) push(i); });
    let next = 0;
    const worker = () => {
      if (next >= order.length) return;
      const i = order[next++];
      const img = new Image();
      img.decoding = 'async';
      img.src = `frames/${tier}/make_${pad(i)}.webp`;
      img.decode().then(() => { frames[i] = img; if (live && Math.abs(i - Math.round(S.frame)) < 3) draw(true); }).catch(() => {}).finally(worker);
    };
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

  /* ---- drawing: cover, on the same crop as the photo under it (--yfx) ---- */
  let W = 0, H = 0, lastKey = '', live = false, fx = 0.5;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(canvas.clientWidth * dpr);
    H = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    fx = (parseFloat(getComputedStyle(sec).getPropertyValue('--yfx')) || 50) / 100;
    lastKey = '';
    draw(true);
  }
  function draw(force) {
    if (!W || !H) return;
    const i = Math.max(0, Math.min(N - 1, Math.round(S.frame)));
    const img = nearest(i);
    const key = `${i}|${W}|${H}|${img ? img.src : ''}`;
    if (!force && key === lastKey) return;
    lastKey = key;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    if (!img) return;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(W / iw, H / ih);
    const w = iw * s, h = ih * s;
    ctx.drawImage(img, (W - w) * fx, (H - h) * 0.5, w, h);
  }

  /* ---- state, written by the timeline and painted in one place ---- */
  const S0 = { frame: 0, h: 1, b0: 0, b1: 0, b2: 0, b3: 0, stones: 0, pick: 0 };
  const S = { ...S0 };
  const last = new Map();
  const put = (key, val, fn) => { if (last.get(key) !== val) { last.set(key, val); fn(val); } };
  const show = (el, v) => {
    el.style.opacity = v;
    el.style.visibility = +v > 0.001 ? 'visible' : 'hidden';
    el.style.transform = `translateY(${((1 - v) * 14).toFixed(1)}px)`;
  };
  let tl = null;
  function paint() {
    put('h', S.h.toFixed(3), (v) => show(head, +v));
    [S.b0, S.b1, S.b2, S.b3].forEach((b, i) => put(`b${i}`, b.toFixed(3), (v) => show(beats[i], +v)));
    put('stones', S.stones.toFixed(3), (v) => { stonesEl.style.opacity = v; });
    put('pick', S.pick.toFixed(3), (v) => show(pickEl, +v));
    // the drawing and the white model are paper; from the stone on, the picture is dark enough for light words
    put('tone', S.frame < COLOUR ? 'light' : 'dark', (v) => { stage.dataset.tone = v; theme(v === 'dark' ? 'night' : 'paper'); });
    // the paper in the frames is warm and the page is pure white (Liav, 2.11.2026: "צבע רקע לבן מלא"), so the sketch and the white model are neutral until the stone comes
    put('paper', Math.max(0, Math.min(1, (COLOUR - S.frame) / 14)).toFixed(3), (v) => { canvas.style.filter = +v > 0 ? `grayscale(${v}) brightness(${(1 + 0.05 * v).toFixed(3)})` : ''; });
    draw(false);
  }
  function build() {
    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: paint });
    const beat = (k, a, b) => tl.to(S, { [k]: 1, duration: 4, ease: 'power2.out' }, a).to(S, { [k]: 0, duration: 3, ease: 'power2.in' }, b);
    // the title is already there while the stage rises into view
    tl.to(S, { h: 0, duration: 2.5, ease: 'power2.in' }, 9.5);
    // 01 · the sketch, line by line, and the model rises out of it
    beat('b0', 12, 28);
    tl.to(S, { frame: 30, duration: 16, ease: 'power1.inOut' }, 14);
    // 02 · the shape: where the grill stands, where the sink, the seats around the table
    beat('b1', 31, 42);
    tl.to(S, { frame: 45, duration: 10 }, 32);
    // 03 · the materials flow onto the model, and the garden grows around it
    beat('b2', 45, 61);
    tl.to(S, { frame: 111, duration: 17, ease: 'power1.inOut' }, 45);
    // 04 · the first evening: the sun goes down and the lights come on
    beat('b3', 64, 81);
    tl.to(S, { frame: N - 1, duration: 18, ease: 'power1.inOut' }, 64);
    // the last frame and the photo are the same picture, so the swap does not show; then the stone is his
    tl.to(S, { stones: 1, duration: 2 }, 83);
    tl.to(S, { pick: 1, duration: 5, ease: 'power2.out' }, 86);
    tl.set({}, {}, 100);
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.8, animation: tl });
  }

  function goLive() {
    live = true;
    sec.classList.add('y-live');
    resize();
    build();
    paint();
    const near = ScrollTrigger.create({ trigger: sec, start: 'top bottom+=150%', onEnter: () => { loadFrames(); loadStones(); } });
    const onRefresh = () => resize();
    ScrollTrigger.addEventListener('refresh', onRefresh);
    ScrollTrigger.refresh();
    return () => {
      live = false;
      near.kill();
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      sec.classList.remove('y-live');
      Object.assign(S, S0);
      stage.removeAttribute('data-tone');
      [head, pickEl, stonesEl, canvas, ...beats].forEach((el) => el.removeAttribute('style'));
      theme('night');
      last.clear();
      tl = null;
    };
  }

  // a11y.js loads after this file, so the saved choice is read here directly (the same key as js/a11y.js)
  let still = false;
  try { still = !!JSON.parse(localStorage.getItem('kft-a11y') || '{}').still; } catch (e) { /* private mode */ }
  let mm = null;
  const setup = () => {
    if (mm) mm.revert();
    mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', sheet: SHEET_MQ }, ({ conditions }) => {
      if (!conditions.motion || still) return;
      return goLive();
    });
  };
  setup();
  document.addEventListener('a11y:still', (e) => {
    if (!!e.detail === still) return;
    still = !!e.detail;
    setup();
  });
})();
