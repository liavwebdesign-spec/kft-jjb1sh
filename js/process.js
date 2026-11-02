/* KFT · the process: one kitchen, the villa one, from the sketch to its first evening, built by the scroll.
   One pinned stage (.p-stage) over a run of scroll (.p-run, css/site.css), one canvas and 300 frames on one index:
   0-59 the sketch on paper (frames/<tier>/flight_059 back to flight_000: the front view draws itself, then the camera
   rises to the plan), 60-299 the yard (build_000-239, ../blender/kft_film.py with KFT_SLOW=1): the plan in chalk on the
   paving, then the parts one at a time (the cabinets, the stone wall, the fronts, the worktops, the sink, the grill,
   the oven, the shelf, the fridge), the sun going down and the lights coming on. Each part gets a tag where it lands
   (frames/build-tags.json, the same camera projected in Blender) and a tick in the list of what already stands.
   The last frame sits on the real photo (img/night_nofire), which takes over and drifts; there the reader picks the
   hour and lights the oven. In the corner a small plan of the kitchen draws itself along the way, and the four chapters
   under it jump to their place in the scroll. At the end the photo closes into a window behind one line across the screen,
   their other kitchens flip by in it, and the line stays with the button to book the meeting.
   The hour and the fire work in both versions; without GSAP, with reduced motion or with "stop animations" on,
   the section stays static: four chapters with a picture each, and the photo with the hour under them. */
(() => {
  const sec = document.querySelector('.proc');
  if (!sec) return;
  const root = document.documentElement;
  const $ = (s) => sec.querySelector(s);
  const $$ = (s) => [...sec.querySelectorAll(s)];
  const stage = $('.p-stage');

  /* ---- the photo: the hour and the fire. The other pictures load once the section is near ---- */
  const real = $('.p-real');
  const ph = $('.p-ph');
  const shots = $$('.p-ph img[data-time]');
  const flame = $('.p-flame');
  const flips = $$('.p-flip img');
  const timeBtns = $$('.p-times button');
  const fireBtn = $('.p-fire');
  const said = $('[data-said]');
  const baseAlt = shots[0].alt;
  const HOURS = { day: 'בצהריים', dusk: 'בשקיעה', night: 'בערב' };
  let photosLoaded = false;
  const loadPhotos = () => {
    if (photosLoaded) return;
    photosLoaded = true;
    [...shots, flame, ...flips].forEach((img) => { if (img.dataset.srcset) { img.srcset = img.dataset.srcset; img.removeAttribute('data-srcset'); } });
  };
  let hour = 'night';
  let lit = false;
  const setPhoto = (h, fire, announce) => {
    loadPhotos();
    hour = h;
    lit = fire && h === 'night';
    timeBtns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.time === h ? 'true' : 'false'));
    fireBtn.setAttribute('aria-pressed', lit ? 'true' : 'false');
    shots.forEach((img) => {
      const on = img.dataset.time === h;
      img.classList.toggle('on', on);
      img.alt = on ? baseAlt.replace('בערב', HOURS[h]) + (lit ? ', ואש בטאבון' : '') : '';
    });
    flame.classList.toggle('on', lit);
    if (announce && said) said.textContent = `${HOURS[h]}${lit ? ', עם אש בטאבון' : ''}`;
  };
  timeBtns.forEach((b) => b.addEventListener('click', () => setPhoto(b.dataset.time, lit, true)));
  // the fire is an evening thing: lighting it by day brings the evening with it
  fireBtn.addEventListener('click', () => setPhoto(lit ? hour : 'night', !lit, true));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { loadPhotos(); io.disconnect(); } }, { rootMargin: '100% 0px' });
    io.observe(real);
  } else loadPhotos();

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const canvas = $('.p-seq');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scrim = $('.p-scrim');
  const copy = $('.p-copy');
  const head = $('.p-h');
  const steps = $$('.p-step');
  const build = $('.p-build');
  const parts = $$('.p-build li');
  const tod = $('.p-tod');
  const rail = $('.p-rail');
  const chBtns = $$('.p-rail button');
  const plan = $('.p-plan');
  const pen = $('.p-pen');
  const lines = $$('.p-plan path').map((el) => { const [a, b] = el.dataset.at.split(' ').map(Number); return { el, a, b, len: 0, last: '' }; });
  const tagsEl = $('.p-tags');
  const turn = $('.p-turn');
  const turnW = $('.p-tw');
  const go = $('.p-go');
  const FLIGHT = 60;
  const BUILD = 240;
  const N = FLIGHT + BUILD;
  const SHEET_MQ = '(max-width: 767px), (max-width: 1023px) and (orientation: portrait)';
  // the frame in the build where each part has landed, from PLAN in kft_film.py (KFT_SLOW): t x 239
  const LAND = { shell: 41, wall: 80, fronts: 108, tops: 129, sink: 143, grill: 160, oven: 172, shelf: 189, fridge: 196, light: 205 };
  const TAGS = [['shell', 'ארונות'], ['wall', 'קיר אבן'], ['fronts', 'חזיתות'], ['tops', 'שיש'], ['sink', 'כיור'],
    ['grill', 'גריל', 'dn'], ['oven', 'טאבון'], ['shelf', 'מדף'], ['fridge', 'מקרר']];
  // where each chapter starts on the timeline (0-100), for its jump; 100-146 is the way out: the photo closes, the kitchens flip, the line and the button hold
  const CH = [0, 22, 37, 75];
  const TOTAL = 146;
  // the last line of the plan is done when the lights come on in the film; then the oven turns red
  const LIT_AT = 79;
  // after the sun has gone, the picture is dark enough for light words
  const DARK_AT = 185;
  const theme = (t) => { if (sec.dataset.theme !== t) { sec.dataset.theme = t; document.dispatchEvent(new Event('kft:theme')); } };

  /* ---- frames: a few anchors first, then every 8th, 4th, 2nd, so any scroll position has a near frame early ---- */
  const pad = (n) => String(n).padStart(3, '0');
  const src = (g, tier) => (g < FLIGHT ? `frames/${tier}/flight_${pad(FLIGHT - 1 - g)}.webp` : `frames/${tier}/build_${pad(g - FLIGHT)}.webp`);
  const frames = new Array(N);
  let loading = false;
  let anchors = null;
  function loadFrames() {
    if (loading) return;
    loading = true;
    fetch('frames/build-tags.json').then((r) => (r.ok ? r.json() : null)).then((d) => { anchors = d && d.tags; }).catch(() => {});
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tier = innerWidth >= 1024 && innerWidth * dpr > 1500 ? '1920' : '1280';
    const order = [];
    const seen = new Set();
    const push = (i) => { if (i >= 0 && i < N && !seen.has(i)) { seen.add(i); order.push(i); } };
    [0, FLIGHT - 1, FLIGHT, 100, 140, 180, 220, 260, N - 1].forEach(push);
    [8, 4, 2, 1].forEach((step) => { for (let i = 0; i < N; i += step) push(i); });
    let next = 0;
    const worker = () => {
      if (next >= order.length) return;
      const i = order[next++];
      const img = new Image();
      img.decoding = 'async';
      img.src = src(i, tier);
      // draw(false) repaints only when the nearest loaded frame changed, so an empty or far stand-in is replaced as soon as a closer one arrives
      img.decode().then(() => { frames[i] = img; if (live) draw(false); }).catch(() => {}).finally(worker);
    };
    for (let w = 0; w < 4; w++) worker();
  }
  // the nearest loaded frame on the same side of the paper/yard line, so the sketch never shows a frame of the yard
  function nearest(i) {
    const lo = i < FLIGHT ? 0 : FLIGHT;
    const hi = i < FLIGHT ? FLIGHT - 1 : N - 1;
    if (frames[i]) return frames[i];
    for (let d = 1; d < N; d++) {
      if (i - d >= lo && frames[i - d]) return frames[i - d];
      if (i + d <= hi && frames[i + d]) return frames[i + d];
      if (i - d < lo && i + d > hi) break;
    }
    return null;
  }

  /* ---- drawing: cover, centred; the tags use the same box ---- */
  let W = 0, H = 0, dpr = 1, lastKey = '', live = false;
  const box = { x: 0, y: 0, w: 0, h: 0 };
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(canvas.clientWidth * dpr);
    H = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const s = Math.max(W / 1920, H / 1282);
    box.w = 1920 * s; box.h = 1282 * s; box.x = (W - box.w) / 2; box.y = (H - box.h) / 2;
    lastKey = '';
    draw(true);
    tagsAt(-1);
  }
  const blit = (img) => ctx.drawImage(img, box.x, box.y, box.w, box.h);
  function draw(force) {
    if (!W || !H) return;
    const i = Math.max(0, Math.min(N - 1, Math.round(S.g)));
    const img = nearest(i);
    const yard = S.x > 0.001 && i < FLIGHT ? nearest(FLIGHT) : null;
    const key = `${i}|${W}|${H}|${img ? img.src : ''}|${S.sketch.toFixed(3)}|${S.pre.toFixed(3)}|${S.x.toFixed(3)}|${yard ? 1 : 0}`;
    if (!force && key === lastKey) return;
    lastKey = key;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);
    if (!img) return;
    const drawn = Math.max(S.sketch, S.pre);
    if (i === 0 && drawn < 1) {
      // the front view draws itself, from the start side (right) towards the end, like a hand on paper
      const edge = W * (1 - drawn);
      ctx.save();
      ctx.beginPath();
      ctx.rect(edge, 0, W - edge, H);
      ctx.clip();
      blit(img);
      ctx.restore();
    } else blit(img);
    if (yard) {
      // the plan on paper and the same plan in chalk on the paving: the paper gives way to the yard
      ctx.globalAlpha = S.x;
      blit(yard);
      ctx.globalAlpha = 1;
    }
  }

  /* ---- the tags: one per part, from a little before it lands until it has settled ---- */
  const tagEls = TAGS.map(([k, label, dir]) => {
    const el = document.createElement('div');
    el.className = `p-tag${dir ? ` ${dir}` : ''}`;
    el.innerHTML = '<i></i><b></b><span></span>';
    el.querySelector('span').textContent = label;
    tagsEl.appendChild(el);
    return { k, el, last: '' };
  });
  function tagsAt(f) {
    const fi = Math.max(0, Math.min(BUILD - 1, Math.round(f)));
    tagEls.forEach((t) => {
      const L = LAND[t.k];
      // in from a little before it lands, out soon after, so two neighbours rarely share the picture
      const a = Math.min(1, Math.max(0, (f - (L - 12)) / 9));
      const b = Math.min(1, Math.max(0, (L + 26 - f) / 8));
      const p = anchors && anchors[t.k] && anchors[t.k][fi];
      const v = p && S.photo < 0.05 ? Math.min(a, b) : 0;
      const x = p ? (box.x + p[0] * box.w) / dpr : 0;
      const y = p ? (box.y + p[1] * box.h) / dpr : 0;
      const key = v > 0.001 ? `${v.toFixed(2)}|${x.toFixed(1)}|${y.toFixed(1)}` : '0';
      if (key === t.last) return;
      t.last = key;
      t.el.style.opacity = v;
      t.el.style.visibility = v > 0.001 ? 'visible' : 'hidden';
      if (v > 0.001) t.el.style.transform = `translate(${x.toFixed(1)}px, ${(y + (1 - v) * 8).toFixed(1)}px)`;
    });
  }

  /* ---- state, written by the timeline and painted in one place ---- */
  // the title is already there and the sketch already started while the stage rises into view, so the page never shows an empty white screen
  const S0 = { g: 0, sketch: 0, pre: 0, x: 0, h: 1, b0: 0, b1: 0, b2: 0, b3: 0, build: 0, photo: 0, drift: 0, pick: 0, close: 0, rail: 1, flip: 0, go: 0 };
  const S = { ...S0 };
  const last = new Map();
  const put = (key, val, fn) => { if (last.get(key) !== val) { last.set(key, val); fn(val); } };
  const show = (el, v) => {
    el.style.opacity = v;
    el.style.visibility = +v > 0.001 ? 'visible' : 'hidden';
    el.style.transform = `translateY(${((1 - v) * 14).toFixed(1)}px)`;
  };
  let tl = null;
  let st = null;
  // each line of the plan by its own stretch of the timeline; the pen rides on the one being drawn
  function drawPlan(p) {
    let at = null;
    lines.forEach((l) => {
      const v = Math.max(0, Math.min(1, (p - l.a) / (l.b - l.a)));
      const key = v.toFixed(3);
      if (key !== l.last) { l.last = key; l.el.style.strokeDashoffset = 1 - v; }
      if (v > 0 && v < 1) at = { l, v };
    });
    const tip = at ? at.l.el.getPointAtLength((at.l.len || (at.l.len = at.l.el.getTotalLength())) * at.v) : null;
    if (tip) { pen.setAttribute('cx', tip.x.toFixed(1)); pen.setAttribute('cy', tip.y.toFixed(1)); }
    put('pen', !!tip, (v) => { pen.style.opacity = v ? 1 : 0; });
    put('lit', p >= LIT_AT, (v) => plan.classList.toggle('lit', v));
  }
  function paint() {
    put('h', S.h.toFixed(3), (v) => show(head, +v));
    [S.b0, S.b1, S.b2, S.b3].forEach((b, i) => put(`b${i}`, b.toFixed(3), (v) => show(steps[i], +v)));
    put('build', S.build.toFixed(3), (v) => { build.style.opacity = v; });
    put('photo', S.photo.toFixed(3), (v) => { real.style.opacity = v; scrim.style.opacity = (1 - v).toFixed(3); });
    put('plate', (1 - S.x).toFixed(3), (v) => { copy.style.setProperty('--plate', v); scrim.style.setProperty('--yard', (1 - v).toFixed(3)); });
    put('drift', S.drift.toFixed(4), (v) => { ph.style.setProperty('--drift', (1 + 0.06 * v).toFixed(4)); });
    put('pick', S.pick.toFixed(3), (v) => show(tod, +v));
    put('close', S.close.toFixed(4), (v) => {
      stage.style.setProperty('--close', v);
      canvas.style.visibility = +v > 0 ? 'hidden' : '';
      const on = Math.min(1, v * 6);
      [turn, turnW].forEach((el) => {
        el.style.opacity = on;
        el.style.visibility = on > 0.001 ? 'visible' : 'hidden';
      });
    });
    put('rail', S.rail.toFixed(3), (v) => { rail.style.opacity = v; rail.style.visibility = +v > 0.001 ? 'visible' : 'hidden'; });
    // a hard cut from kitchen to kitchen, each one settling a little; the ones before it stay under it until the next has loaded
    const shown = Math.min(flips.length, Math.floor(S.flip));
    put('flip', shown, (n) => flips.forEach((im, k) => { im.style.opacity = k < n ? 1 : 0; }));
    if (shown > 0) put('flipz', (shown < flips.length ? 1.08 - 0.08 * (S.flip % 1) : 1).toFixed(4), (v) => { flips[shown - 1].style.transform = `scale(${v})`; });
    put('go', S.go.toFixed(3), (v) => show(go, +v));
    const f = S.g - FLIGHT;
    // the header turns dark once the white has cleared the top of the screen, and back as soon as the photo starts closing
    put('tone', (f >= DARK_AT || S.photo > 0.5) && S.close < 0.04 ? 'dark' : 'light', (v) => { stage.dataset.tone = v; theme(v === 'dark' ? 'night' : 'paper'); });
    parts.forEach((li) => put(`p-${li.dataset.part}`, f >= LAND[li.dataset.part] - 4, (on) => li.classList.toggle('on', on)));
    const p = tl ? tl.time() : 0;
    let ch = 0;
    CH.forEach((c, i) => { if (p >= c) ch = i; });
    put('ch', ch, (c) => chBtns.forEach((b, i) => { b.classList.toggle('on', i <= c); if (i === c) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }));
    drawPlan(p);
    tagsAt(f);
    draw(false);
  }
  function build_() {
    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: paint });
    const beat = (k, a, b) => tl.to(S, { [k]: 1, duration: 3, ease: 'power2.out' }, a).to(S, { [k]: 0, duration: 2.5, ease: 'power2.in' }, b);
    // the title is gone before the first chapter comes in, the two never sit on top of each other
    tl.to(S, { h: 0, duration: 2, ease: 'power2.in' }, 8.5);
    // 01 · the planning: the front view draws itself, then the camera rises to the plan
    tl.to(S, { sketch: 1, duration: 8, ease: 'power1.inOut' }, 1);
    beat('b0', 10.5, 19.5);
    tl.to(S, { g: FLIGHT - 1, duration: 10, ease: 'power1.inOut' }, 11);
    // 02 · the making: the plan lands on the paving, and the first cabinets rise out of it
    tl.to(S, { x: 1, duration: 3 }, 21);
    tl.set(S, { g: FLIGHT }, 24);
    beat('b1', 22.5, 35);
    tl.to(S, { build: 1, duration: 3 }, 26);
    tl.to(S, { g: N - 1, duration: 63 }, 25);
    // 03 · the fitting, part after part (the tags and the list carry it); 04 · the sun goes down, the lights come on
    beat('b2', 37.5, 72);
    beat('b3', 75.5, 85);
    tl.to(S, { build: 0, duration: 3 }, 84);
    tl.to(S, { rail: 0, duration: 3 }, 85);
    // the last frame and the photo are the same picture, so the swap does not show; then it drifts, and the hour is his
    tl.to(S, { photo: 1, duration: 3 }, 88);
    tl.to(S, { drift: 1, duration: 11, ease: 'power1.out' }, 89);
    tl.to(S, { pick: 1, duration: 4, ease: 'power2.out' }, 92);
    // the way out: the photo, at the hour he chose, closes into a window on the white page the next section starts from;
    // the kitchens flip fast and slow down to the last one, the button comes, and the white carries on into the next section
    tl.to(S, { pick: 0, duration: 2, ease: 'power2.in' }, 105);
    tl.to(S, { close: 1, duration: 10, ease: 'power2.inOut' }, 106);
    tl.to(S, { flip: flips.length, duration: 22, ease: 'power2.out' }, 115.5);
    tl.to(S, { go: 1, duration: 4, ease: 'power2.out' }, 134);
    tl.set({}, {}, TOTAL);
    st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.8, animation: tl });
  }
  // the rail: each chapter jumps to its own place in the scroll
  const jump = (i) => {
    if (!st) return;
    const y = st.start + (st.end - st.start) * ((CH[i] + (i ? 1.5 : 0)) / TOTAL);
    window.scrollTo({ top: Math.round(y) + 1, behavior: 'smooth' });
  };
  chBtns.forEach((b, i) => b.addEventListener('click', () => jump(i)));

  function goLive() {
    live = true;
    sec.classList.add('p-live');
    resize();
    build_();
    paint();
    const near = ScrollTrigger.create({ trigger: sec, start: 'top bottom+=150%', onEnter: () => { loadFrames(); loadPhotos(); } });
    const rising = ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'top top', onUpdate: (s) => { S.pre = s.progress * 0.3; draw(false); } });
    const onRefresh = () => resize();
    ScrollTrigger.addEventListener('refresh', onRefresh);
    ScrollTrigger.refresh();
    return () => {
      live = false;
      near.kill();
      rising.kill();
      if (st) st.kill();
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      sec.classList.remove('p-live');
      Object.assign(S, S0);
      stage.removeAttribute('data-tone');
      [head, tod, build, real, scrim, copy, turn, turnW, go, canvas, rail, pen, ...flips, ...steps].forEach((el) => el.removeAttribute('style'));
      lines.forEach((l) => { l.el.removeAttribute('style'); l.last = ''; });
      plan.classList.remove('lit');
      ph.style.removeProperty('--drift');
      stage.style.removeProperty('--close');
      parts.forEach((li) => li.classList.remove('on'));
      tagEls.forEach((t) => { t.el.removeAttribute('style'); t.last = ''; });
      theme('paper');
      last.clear();
      tl = null;
      st = null;
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
