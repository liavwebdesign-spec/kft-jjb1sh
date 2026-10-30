/* KFT · sketch B: the evenings, the page's signature (MV:g211 on the engine of the image-sequence-site template).
   One kitchen and one evening falling on it: 121 frames (Magnific, day to night on KFT's own render, no people) drawn
   on a canvas as the page scrolls, and the six moments coming up one after another beside it.
   The stage sticks for 200svh (css/site.css, .seq-on). It opens out of a line of light as it comes up (--open).
   Without this script, with reduced motion or with "stop animations", the section stays static: the night frame and
   all six lines. Nothing runs while the section is far from the screen, and nothing is written while it rests. */
(() => {
  const sec = document.querySelector('.ev');
  if (!sec) return;
  const stage = sec.querySelector('.ev-stage');
  const media = sec.querySelector('.ev-media');
  const canvas = sec.querySelector('.ev-cv');
  const ctx = canvas.getContext('2d', { alpha: false });
  const win = sec.querySelector('.ev-win');
  const list = sec.querySelector('.ev-list');
  const items = [...list.children];
  const N = 121, LAST = N - 1, GROUND = '#0E0D0B';
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  let still = false;
  try { still = !!JSON.parse(localStorage.getItem('kft-a11y') || '{}').still; } catch (e) { /* private mode */ }

  // wheel and trackpad glide a little behind the scroll; touch follows the finger exactly (the template's measured choice)
  const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const SMOOTH = TOUCH ? 1 : 0.1;
  const LOW_POWER = innerWidth < 900 || (navigator.deviceMemory && navigator.deviceMemory <= 2);

  /* ---- frames: three cuts of the same 121. hi 1280x712 and lo 640x356 for a wide stage, pt 560x667 for a tall one.
     Loaded four at a time, coarse to fine, so the whole evening is there early and fills in; decoded only near the
     frame on screen, so a phone never holds 121 decoded pictures. Never ImageBitmap (template, pitfalls) ---- */
  const pad = (n) => String(n).padStart(3, '0');
  let tier = '', frames = [], loaded = 0, gen = 0, decodeBusy = 0;
  const pickTier = (w, h) => (w / h < 1.1 ? 'pt' : LOW_POWER ? 'lo' : 'hi');
  function load(t) {
    tier = t; frames = new Array(N); loaded = 0;
    const me = ++gen;
    const order = [], seen = new Set();
    const push = (i) => { if (i >= 0 && i < N && !seen.has(i)) { seen.add(i); order.push(i); } };
    [0, LAST, 60].forEach(push);
    [8, 4, 2, 1].forEach((step) => { for (let i = 0; i < N; i += step) push(i); });
    let next = 0;
    const worker = () => {
      if (me !== gen || next >= order.length) return;
      const i = order[next++];
      const im = new Image();
      im.onload = () => { if (me !== gen) return; frames[i] = im; loaded++; if (Math.abs(i - shownIdx) < 6) ask(); worker(); };
      im.onerror = () => worker();
      im.src = `frames/${t}/${pad(i)}.webp`;
    };
    for (let w = 0; w < 4; w++) worker();
  }
  function warmDecode(from) {
    for (let i = Math.max(0, from - 6); i < Math.min(N, from + 40); i++) {
      if (decodeBusy >= 4) return;
      const im = frames[i];
      if (im && im.naturalWidth && !im.__warm) {
        im.__warm = 1; decodeBusy++;
        im.decode().catch(() => {}).then(() => { decodeBusy--; });
      }
    }
  }
  function frameFor(idx) {
    if (frames[idx]) return frames[idx];
    for (let d = 1; d < N; d++) {
      if (frames[idx - d]) return frames[idx - d];
      if (frames[idx + d]) return frames[idx + d];
    }
    return null;
  }

  /* ---- drawing: cover. On a wide stage the frame keeps its end side, so the kitchen sits clear of the words on the
     start side (fx 1 crops the far edge of the olive tree, not the grill); a tall stage is centred ---- */
  let cw = 0, ch = 0, fx = 0.5, lastImg = null, VH = 0, run = 1, winH = 0, centers = [];
  function draw(img) {
    const iw = img && (img.width || img.naturalWidth), ih = img && (img.height || img.naturalHeight);
    if (!iw || !ih) return;
    lastImg = img;
    const ir = iw / ih, cr = cw / ch;
    let dw, dh, dx, dy;
    if (cr > ir) { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) * 0.55; }
    else { dh = ch; dw = ch * ir; dy = 0; dx = (cw - dw) * fx; }
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  function measure() {
    const r = media.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // the frames are 1280 wide: past about 2200 backing pixels a sharper canvas only costs, it shows nothing more
    const dpr = Math.min(window.devicePixelRatio || 1, LOW_POWER ? 1.5 : 2, 2200 / r.width);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    cw = w; ch = h;
    fx = r.width / r.height > 1.1 && innerWidth >= 1024 ? 1 : 0.5;
    ctx.fillStyle = GROUND; ctx.fillRect(0, 0, cw, ch);
    lastImg = null;
    VH = stage.offsetHeight || innerHeight;
    run = Math.max(1, sec.offsetHeight - VH);
    winH = win.clientHeight;
    centers = items.map((it) => it.offsetTop + it.offsetHeight / 2);
    const t = pickTier(r.width, r.height);
    if (started && t !== tier) load(t);
    else if (!started) tier = t;
  }

  /* ---- the frame: everything comes from one smoothed scroll position, and only what changed is written ---- */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const last = new Map();
  const put = (k, v, fn) => { if (last.get(k) !== v) { last.set(k, v); fn(v); } };
  let live = false, near = false, started = false, viewY = scrollY, lastT = 0, raf = 0, shownIdx = 0;
  function render() {
    const rect = sec.getBoundingClientRect();
    const top = rect.top + (scrollY - viewY);
    // the line appears when the stage's middle reaches the foot of the screen and is fully open as the stage sticks
    put('open', clamp(1 - top / (VH * 0.5)).toFixed(3), (v) => {
      media.style.setProperty('--open', v);
      // the line is there only while it opens: below the screen before, and gone once the stage is open
      media.classList.toggle('ln-off', v <= 0 || v >= 1);
    });
    const p = clamp(-top / run);
    const idx = Math.round(clamp((p - 0.04) / 0.84) * LAST);
    const img = frameFor(idx);
    if (idx !== shownIdx) { shownIdx = idx; warmDecode(idx); }
    if (img && img !== lastImg) draw(img);
    if (!linesTl) lines(p);
  }
  // the six moments: each one holds while you read it, then the next comes up into its place. With GSAP they ride a
  // timeline scrubbed over the section, as in MV:g211; without it, the same smoothed scroll as the frames
  let linesTl = null;
  function lines(p) {
    const pos = clamp((p - 0.03) / 0.86) * (items.length - 1);
    const i = Math.min(items.length - 2, Math.floor(pos));
    const f = smooth(clamp((pos - i - 0.3) / 0.4));
    const at = i + f;
    const y = winH * 0.32 - (centers[i] + (centers[i + 1] - centers[i]) * f);
    put('y', y.toFixed(1), (v) => { list.style.transform = `translate3d(0, ${v}px, 0)`; });
    const on = Math.round(at);
    items.forEach((it, k) => {
      put(`o${k}`, clamp(1 - Math.abs(k - at) * 0.8, 0.18, 1).toFixed(2), (v) => { it.style.opacity = v; });
      put(`c${k}`, k === on, (v) => it.classList.toggle('on', v));
    });
  }
  function tick(t) {
    raf = 0;
    if (!live) return;
    const dt = Math.min(t - lastT || 16.667, 100); lastT = t;
    const k = 1 - Math.pow(1 - SMOOTH, dt / 16.667);
    const d = scrollY - viewY;
    if (Math.abs(d) > 0.08) viewY += d * k; else viewY = scrollY;
    render();
    if (viewY !== scrollY) raf = requestAnimationFrame(tick);
  }
  function ask() { if (live && near && !raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); } }

  /* ---- live or static ---- */
  function setLive(on) {
    if (on === live) return;
    live = on;
    sec.classList.toggle('seq-on', on);
    if (on) {
      measure();
      viewY = scrollY;
      if (near && !started) { started = true; load(tier); }
      if (window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        const o = { p: 0 };
        // made before the story's pin above it, so it is measured after that pin, or it would start a whole pin early
        linesTl = gsap.to(o, { p: 1, ease: 'none', onUpdate: () => lines(o.p),
          scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: TOUCH ? true : 0.2, invalidateOnRefresh: true, refreshPriority: -1 } });
        lines(clamp(-sec.getBoundingClientRect().top / run));
      }
      render();
    } else {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (linesTl) { linesTl.scrollTrigger.kill(); linesTl.kill(); linesTl = null; }
      last.clear();
      media.style.removeProperty('--open');
      media.classList.remove('ln-off');
      list.style.removeProperty('transform');
      items.forEach((it) => { it.style.removeProperty('opacity'); it.classList.remove('on'); });
    }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }
  const decide = () => setLive(motion.matches && !still);

  new IntersectionObserver((es) => {
    near = es[0].isIntersecting;
    if (near && live && !started) { started = true; load(tier); }
    ask();
  }, { rootMargin: '150% 0px' }).observe(sec);
  addEventListener('scroll', ask, { passive: true });
  // a phone's address bar comes and goes: only a real change of size measures again
  let rw = innerWidth, rh = innerHeight;
  addEventListener('resize', () => {
    const dw = Math.abs(innerWidth - rw), dh = Math.abs(innerHeight - rh);
    if (dw < 1 && dh < 160) return;
    rw = innerWidth; rh = innerHeight;
    if (live) { measure(); render(); }
  });
  // the story's pin above changes where this section starts; ScrollTrigger tells us when it has settled
  addEventListener('load', () => {
    if (window.ScrollTrigger) window.ScrollTrigger.addEventListener('refresh', () => { if (live) { measure(); render(); if (linesTl) lines(linesTl.progress()); } });
    if (live) { measure(); render(); }
  });
  if (motion.addEventListener) motion.addEventListener('change', decide);
  document.addEventListener('a11y:still', (e) => { still = !!e.detail; decide(); });
  decide();
})();
