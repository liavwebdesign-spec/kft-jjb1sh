/* KFT · the home page (2.11.2026): the hero's film, the big letters into the about section and the architects' plan.
   The hero is one slow film of one kitchen in a loop; its still frame is the poster and what "stop animations" leaves
   (Liav, 2.11.2026: "למחוק את כפתור הפליי"). The team's film left the about section the same day.
   The kitchens' carousel is js/kitchens.js, the process js/process.js and "from your chair" js/yours.js.
   The letters KFT are cut out of the white page, the camera flying through the stem of the T into the photo (MV:g156, 40vh).
   Without GSAP, with reduced motion or with "stop animations" on, the page stays the static version: real text and
   still pictures. ?h in the address shows the headline directions for the meeting. */
(() => {
  const root = document.documentElement;
  const SVGNS = 'http://www.w3.org/2000/svg';
  // phones, and tablets held upright (the same query as the sheet layout in the CSS)
  const SHEET_MQ = '(max-width: 767px), (max-width: 1023px) and (orientation: portrait)';
  const quiet = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('a11y-still');

  /* ---- the headline directions, only with ?h in the address: KFT picks the words, this shows them in place ---- */
  const HEADS = [
    ['הערב הכי טוב בבית', 'קורה בחוץ.'],
    ['מטבח חוץ', 'שנבנה סביבך.'],
    ['מהחלום,', 'עד הערב הראשון בחוץ.'],
    ['אבן, אש,', 'ואתה.'],
  ];
  const pick = document.querySelector('.h-pick');
  if (pick && new URLSearchParams(location.search).has('h')) {
    const lns = [...document.querySelectorAll('#hero-h .ln')];
    const btns = [...pick.querySelectorAll('button')];
    pick.hidden = false;
    btns.forEach((b) => b.addEventListener('click', () => {
      const h = HEADS[+b.dataset.h];
      if (!h || lns.length < 2) return;
      lns[0].textContent = h[0];
      lns[1].textContent = h[1];
      btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    }));
  }

  /* ---- the film: it plays for everyone, reduced motion too; "stop animations" in the accessibility panel stops it
     (motion.md 2א), and film() still takes a pause button if one comes back. It is fetched only near the screen and pauses
     out of sight; its size is picked by the screen. No GSAP needed ---- */
  // a11y.js loads after this file, so the saved choice is read here directly (the same key as js/a11y.js)
  let still = false;
  try { still = !!JSON.parse(localStorage.getItem('kft-a11y') || '{}').still; } catch (e) { /* private mode */ }
  const films = [];
  const film = (v, btn, watch, pickSrc, margin) => {
    if (!v || !watch) return null;
    let off = still, seen = false;
    const sync = () => {
      if (seen && !off) {
        const src = pickSrc();
        if (v.dataset.cur !== src) { v.dataset.cur = src; v.src = src; v.load(); }
        const p = v.play(); if (p) p.catch(() => {});
      } else v.pause();
      if (btn) {
        btn.classList.toggle('off', off);
        btn.setAttribute('aria-label', off ? 'הפעלת הסרטון' : 'עצירת הסרטון');
      }
    };
    v.addEventListener('playing', () => v.classList.add('on'));
    if (btn) btn.addEventListener('click', () => { off = !off; sync(); });
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); }, { rootMargin: margin }).observe(watch);
    if (btn) btn.hidden = false;
    const f = { set: (s) => { off = s; sync(); }, sync };
    films.push(f);
    return f;
  };
  const hvVid = document.querySelector('.hv-vid');
  const heroFilm = film(hvVid, null, hvVid && hvVid.closest('.hero'), () => {
    if (matchMedia(SHEET_MQ).matches) return hvVid.dataset.tall;
    return innerWidth * (devicePixelRatio || 1) > 1500 ? hvVid.dataset.wide : hvVid.dataset.mid;
  }, '0px');
  // a tablet turned on its side changes the film's size
  if (heroFilm) matchMedia(SHEET_MQ).addEventListener('change', heroFilm.sync);
  // only a change of "stop animations" reaches the films: the panel sends its state again on every other change,
  // and that must not undo a film the visitor paused with its own button
  let filmsStill = still;
  document.addEventListener('a11y:still', (e) => {
    if (!!e.detail === filmsStill) return;
    filmsStill = !!e.detail;
    films.forEach((f) => f.set(filmsStill));
  });

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---- the letters, the way into the about section: KFT is cut out of the white page, a kitchen photo behind it. On the
     way in its outline draws and the letters open; pinned, the camera flies through the stem of the T until the photo
     fills the screen, and the photo ends on a hard line on the black below ---- */
  const bfScene = document.querySelector('.bf-scene');
  const bfPin = bfScene && bfScene.querySelector('.bf-pin');
  const bfSvg = bfScene && bfScene.querySelector('.bf-cut');
  const bfImg = bfScene && bfScene.querySelector('img');
  const BF_FONT = "500 100px 'PM'";

  // the stem of the T: where it starts and how wide it is at 100px, read off the drawn letter, because a font's T is not its I
  const measureT = () => {
    const cv = document.createElement('canvas');
    cv.width = 400; cv.height = 300;
    const x = cv.getContext('2d', { willReadFrequently: true });
    x.font = BF_FONT.replace('100px', '200px');
    x.direction = 'ltr'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#000';
    x.fillText('T', 40, 260);
    const cap = x.measureText('T').actualBoundingBoxAscent;
    const row = x.getImageData(0, Math.round(260 - cap * 0.3), 400, 1).data;
    let a = -1, b = -1;
    for (let i = 0; i < 400; i++) if (row[i * 4 + 3] > 127) { if (a < 0) a = i; b = i; }
    return { left: (a - 40) / 2, width: (b - a + 1) / 2, cap: cap / 2 };
  };


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
      const c = document.createElement('canvas').getContext('2d');
      c.font = BF_FONT;
      c.direction = 'ltr'; c.textAlign = 'left';
      const T = measureT();
      const wide100 = c.measureText('KFT').width;
      const fs = Math.min((W * 0.86) / wide100, (H * 0.62) / T.cap) * 100;
      const k = fs / 100;
      const cap = T.cap * k;
      bfSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      bfSvg.textContent = '';
      const defs = make('defs', {}, bfSvg);
      const mask = make('mask', { id: 'bf-m', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);
      make('rect', { x: -W, y: -H, width: W * 3, height: H * 3, fill: '#fff' }, mask);
      const gm = make('g', {}, mask);
      make('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff', mask: 'url(#bf-m)' }, bfSvg);
      const go = make('g', { class: 'bf-o' }, bfSvg);
      const base = H / 2 + cap / 2;
      // centred on the ink, not on the advance: the letters' side bearings are not equal
      const ink = c.measureText('KFT');
      const a = { x: W / 2 - ((ink.actualBoundingBoxRight - ink.actualBoundingBoxLeft) / 2 - ink.width / 2) * k, y: base, 'text-anchor': 'middle', direction: 'ltr', 'font-size': fs.toFixed(1) };
      const tm = make('text', { ...a, fill: '#000' }, gm);
      tm.textContent = 'KFT';
      const to = make('text', { ...a, class: 'bf-out', 'stroke-dasharray': (fs * 4).toFixed(0) }, go);
      to.textContent = 'KFT';
      const texts = [{ tm, to }];
      // the stem of the T: its cell from the laid-out text, its ink from the measure
      const ext = tm.getExtentOfChar(2);
      const inkL = ext.x + T.left * k, inkW = T.width * k;
      const A = { x: inkL + inkW / 2, y: base - cap * 0.35 };
      // the same stem as a plain rect: huge scaled glyphs can drop out of a mask, a rect never does
      const stem = make('rect', { x: inkL.toFixed(2), y: (base - cap * 0.8).toFixed(2), width: inkW.toFixed(2), height: (cap * 0.8).toFixed(2), fill: '#000' }, gm);
      Z = { W, H, A, C: { x: W / 2, y: H / 2 }, sEnd: Math.max((W * 1.2) / inkW, (H * 0.6) / (cap * 0.35)), fs, gm, go, texts, stem };
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
      bfPin.style.setProperty('--bf-fade', Math.max(0, (z - 0.55) / 0.45).toFixed(3));
    }
    const run = () => document.fonts.load(BF_FONT).then(layout, layout);
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
      bfPin.style.removeProperty('--bf-fade');
    };
  }

  /* ---- the logo behind "about" comes toward the reader with the scroll; its slow drift (css/site.css) runs only on screen ---- */
  function buildMark() {
    const mark = document.querySelector('.ab-mark');
    if (!mark) return () => {};
    const box = mark.parentNode;
    const tw = gsap.fromTo(mark, { yPercent: 16, scale: 0.82, rotation: -5 }, {
      yPercent: -16, scale: 1.18, rotation: 5, ease: 'none',
      scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: 0.6, toggleClass: { targets: box, className: 'is-on' } },
    });
    // gsap's matchMedia has already reverted the tween by the time this runs
    return () => {
      gsap.set(mark, { clearProps: 'all' });
      box.classList.remove('is-on');
    };
  }

  /* ---- the architects' plan plots line by line, then its measures ---- */
  function buildPlot() {
    const plot = document.querySelector('.plot');
    if (!plot) return () => {};
    const P = { plot: 0, dims: 0 };
    const pt = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => {
      plot.style.setProperty('--plot', P.plot.toFixed(3));
      plot.style.setProperty('--dims', P.dims.toFixed(3));
    } });
    pt.to(P, { plot: 1, duration: 0.7, ease: 'power1.inOut' }, 0).to(P, { dims: 1, duration: 0.45, ease: 'power1.inOut' }, 0.55);
    const st = ScrollTrigger.create({ trigger: plot, start: 'top 85%', end: 'center 40%', scrub: 0.6, animation: pt });
    return () => {
      st.kill(); pt.kill();
      plot.style.removeProperty('--plot'); plot.style.removeProperty('--dims');
    };
  }

  function goLive(isSheet) {
    root.classList.add('is-live');
    const un = [buildGrill(isSheet), buildMark(), buildPlot()];
    ScrollTrigger.refresh();
    return () => {
      un.forEach((f) => f());
      root.classList.remove('is-live');
    };
  }

  /* ---- live or static: reduced motion, the sheet layout and the accessibility panel's "stop animations" ---- */
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
