/* KFT · the home page: the hero, the big letters into the about section, the picture beside the form and the way into the footer.
   On a wide screen the hero is a real photo that stays whole until it scrolls away (Liav, 4.11.2026: "תבטל את ההירו הקטן בגלילה"); on a phone it
   is one slow film in a loop, whose still frame is the poster and what "stop animations" leaves (Liav, 2.11.2026: "למחוק את כפתור הפליי").
   The process is js/process.js, "your turn" js/turn.js and "from your chair" js/yours.js.
   The logo is cut out of the white page, the camera flying through the stem of the T into the photo (MV:g156, 40vh).
   Without GSAP, with reduced motion or with "stop animations" on, the page stays the static version: real text and
   still pictures. ?h in the address shows the headline directions for the meeting, and ?p the hero's photo options. */
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

  /* ---- the hero's photo options, only with ?p in the address: KFT picks one, this shows them in place ---- */
  const HEROES = [
    ['img/hero-w1-1280.webp 1280w, img/hero-w1-1920.webp 1920w, img/hero-w1-2560.webp 2560w', 'בית עם בריכה בשעת אחר הצהריים: הבריכה בקדמת התמונה, ומעבר לה פרגולה לבנה על עמודי אבן, פינות ישיבה, שולחן אוכל ומטבח חוץ בקצה'],
    ['img/hero-w2-1280.webp 1280w, img/hero-w2-1600.webp 1450w', 'פינת אוכל לבנה מתחת לפרגולה לבנה עם דלתות זכוכית ומנורות קש, ובקצה מטבח לבן'],
    ['img/hero-w3-1280.webp 1280w, img/hero-w3-1920.webp 1920w, img/hero-w3-2560.webp 2560w', 'בית לבן עם פרגולה על עמודי אבן, מעבר לדשא ולבריכת שפה, ובקצה מטבח חוץ'],
    ['img/hero-w4-1280.webp 1280w, img/hero-w4-1450.webp 1450w', 'מטבח בקשת אבן בקצה חצר גדולה, ולפניו ספות עגולות, בריכה ובית אבן'],
    ['img/hero-w5-1280.webp 1280w, img/hero-w5-1616.webp 1616w', 'מטבח ארוך ואי באבן כהה, עם שורת גרילי נירוסטה, על רצפה בהירה מול הגינה ועצים'],
  ];
  const pPick = document.querySelector('.p-pick');
  const heroIm = document.querySelector('.hv-im');
  if (pPick && heroIm && new URLSearchParams(location.search).has('p')) {
    const btns = [...pPick.querySelectorAll('button')];
    pPick.hidden = false;
    btns.forEach((b) => b.addEventListener('click', () => {
      // the wide film is one more option here: the photo stays under it as the backup, and picking a photo takes the film off
      if (heroFilm) {
        if (b.dataset.film) hvVid.dataset.wide = b.dataset.film; else delete hvVid.dataset.wide;
        heroFilm.sync();
      }
      btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      if (b.dataset.film) { heroIm.closest('.hero').dataset.p = 'film'; return; }
      const h = HEROES[+b.dataset.p];
      if (!h) return;
      heroIm.srcset = h[0];
      heroIm.alt = h[1];
      heroIm.closest('.hero').dataset.p = b.dataset.p;
    }));
  }

  /* ---- the picture beside the form follows the kind of home picked in it. The others load once the form is near ---- */
  const homePics = [...document.querySelectorAll('.c-pics img')];
  if (homePics.length) {
    const loadPics = () => homePics.forEach((im) => { if (im.dataset.srcset) { im.srcset = im.dataset.srcset; im.removeAttribute('data-srcset'); } });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { loadPics(); io.disconnect(); } }, { rootMargin: '50% 0px' });
      io.observe(homePics[0].parentNode);
    } else loadPics();
    document.querySelectorAll('#lead input[name="home"]').forEach((input) => input.addEventListener('change', () => {
      loadPics();
      homePics.forEach((im) => im.classList.toggle('on', im.dataset.home === input.value));
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
      const src = pickSrc();
      // no film for this screen: the photo stays
      if (!src) { v.pause(); v.classList.remove('on'); } else if (seen && !off) {
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
  const heroFilm = film(hvVid, null, hvVid && hvVid.closest('.hero'), () => (matchMedia(SHEET_MQ).matches ? hvVid.dataset.tall : (hvVid.dataset.wide || '')), '0px');
  // a tablet turned on its side leaves the film for the photo
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

  /* ---- the letters, the way into the about section: the logo itself is cut out of the white page ("הלוגו עצמו"), a kitchen photo
     behind it. On the way in its outline draws and the letters open; pinned, the camera flies through the stem of the T until the
     photo fills the screen, and the photo ends on a hard line on the black below ---- */
  const bfScene = document.querySelector('.bf-scene');
  const bfPin = bfScene && bfScene.querySelector('.bf-pin');
  const bfSvg = bfScene && bfScene.querySelector('.bf-cut');
  const bfImg = bfScene && bfScene.querySelector('img');
  // assets/kft-mark.svg: what opens onto the photo (K, F, T and the kitchen on the K), the first three of them drawn in outline, and the kitchen's fine lines that stay on the page
  const LOGO_CUT = ['M151.51,261c-2.34-2.15-4.52-4.18-6.72-6.17l-28.28-25.68c-3-2.72-6-5.44-9-8.2a4.86,4.86,0,0,0-3.61-1.35q-47.36.06-94.72,0H6.41V174.39H293.58c.46,1.43.63,41.86.13,45.2H174.14L174,220c1.53,1.42,3,2.85,4.59,4.25L213.45,256q17.13,15.56,34.29,31.1,16,14.57,32,29.16c4.21,3.83,8.37,7.72,12.67,11.44a4.32,4.32,0,0,1,1.54,3.69q-.06,25,0,50.09,0,3.33,0,6.66c0,.56-.06,1.11-.12,2.12l-106.55-96.8-181,96.44V338.38Z', 'M426.68,61.36v46.76c-.79-.22-1.46-.39-2.12-.6-31.8-9.94-65.28,10.32-71.76,43.41a68.67,68.67,0,0,0-1.22,12.79c0,3.43,0,6.85,0,10.48h75v45.29c-4.92.29-9.91.09-14.9.13s-10.05,0-15.08,0H351.85c-.25.26-.31.3-.35.36a1.62,1.62,0,0,0-.1.18.8.8,0,0,0,0,.21c0,.14,0,.29,0,.43V221c0,.22,0,.43,0,.65v167c0,.07,0,.15,0,.22s0,.14,0,.21a1.55,1.55,0,0,1,0,.21,1.17,1.17,0,0,1-.06.2c-1.46.46-41.67.59-44.58.13,0-.66-.11-1.35-.11-2.05q0-117,.07-234.07a71.82,71.82,0,0,1,1.82-13.8,100.27,100.27,0,0,1,75.85-78c10.11-2.36,20.33-2.6,30.59-2C418.73,59.93,422.62,60.77,426.68,61.36Z', 'M439.16,65c3,1.28,5.7,2.34,8.32,3.55a99.7,99.7,0,0,1,31.13,22.72c1.26,1.35,2.37,2.85,3.64,4.19a5.85,5.85,0,0,1,1.62,4.43q-.08,35.79,0,71.58v2.76h75.88v45.36c-6.23.16-12.49,0-18.76.07s-12.74,0-19.11,0H484c-.06.88-.15,1.51-.15,2.13q0,25.69,0,51.38c0,4.5.07,9,.28,13.51.64,13.88,4.49,26.61,13.55,37.36a55.49,55.49,0,0,0,35.84,19.81,54.21,54.21,0,0,0,24.32-2.16c.58-.19,1.18-.32,1.92-.53v46.55c-1.1.26-2.17.55-3.26.76a101.27,101.27,0,0,1-26.64,1.22,91,91,0,0,1-24.38-5.33,98,98,0,0,1-34-20.6,99.85,99.85,0,0,1-27.32-42.59,103,103,0,0,1-4.9-25.19c-.07-1-.1-2-.1-3V65Z', 'M6.65,112.8H293.75V162.37H6.5V112.94a.15.15,0,0,1,.15-.15Z', 'M293.14,112.8H7.84l15.74-12.2H252.42l40.73,12.15C293.2,112.74,293.19,112.8,293.14,112.8Z', 'M7.11,112.73c.61-1.21,9.75-19.11,18.42-22.76,1.31-.39,88-.38,88-.38l-8.75,23.21H7.17S7.09,112.77,7.11,112.73Z', 'M105.29,112.8l11.1-8s1.4-15.4-3-15.2S105.29,112.8,105.29,112.8Z'];
  const LOGO_KEEP = ['M6.5,124.24H293.95V125.55H6.5Z', 'M104.63,112.8h1.31v47.78h-1.31Z', 'M173.79,112.8h1.31v47.78h-1.31Z', 'M220.49,112.8h1.31v47.78h-1.31Z', 'M256.55,124.9h1.31v35.68h-1.31Z', 'M23.26,123.15a4,4,0,1,1,4-4A4,4,0,0,1,23.26,123.15Zm0-6.59A2.64,2.64,0,1,0,26,119.2,2.69,2.69,0,0,0,23.26,116.56Z', 'M44.35,123.15a4,4,0,1,1,4-4A4,4,0,0,1,44.35,123.15Zm0-6.59a2.64,2.64,0,1,0,2.72,2.64A2.69,2.69,0,0,0,44.35,116.56Z', 'M65.43,123.15a4,4,0,1,1,4-4A4,4,0,0,1,65.43,123.15Zm0-6.59a2.64,2.64,0,1,0,2.73,2.64A2.7,2.7,0,0,0,65.43,116.56Z', 'M86.52,123.15a4,4,0,1,1,4-4A4,4,0,0,1,86.52,123.15Zm0-6.59a2.64,2.64,0,1,0,2.73,2.64A2.69,2.69,0,0,0,86.52,116.56Z', 'M293.14,113.45H7.37l-.32-.9.39-.3,15.9-12.32,229.27,0,41.27,12.31-.13,1.16ZM9.73,112.14H288.89l-36.57-10.9H23.79Z', 'M106.53,113.45H6.8l-.44-.66.16-.35c1-2,10-19.37,18.75-23.07,1.39-.42,72.6-.44,87.88-.44h.36l.82.5ZM8.16,112.14h97.47l6.93-21.9c-29.81,0-85.06.08-86.89.37C18.23,93.76,10.17,108.33,8.16,112.14Z', 'M105,113.15l-.31-.46c.63-3.93,4-23.55,8.71-23.76a2.42,2.42,0,0,1,1.9.8c2.81,2.94,1.91,13.88,1.8,15.12l0,.3Zm8.51-22.91h0c-2.53.12-5.62,11.91-7.21,21.09l9.56-6.89c.28-3.42.51-11.74-1.46-13.81A1.14,1.14,0,0,0,113.46,90.24Z'];
  const LOGO = { x: 6.41, y: 59, w: 553.6, h: 331, stem: { x: 439.16, y: 100, w: 44.7, h: 185 } };


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
      const k = Math.min((W * 0.86) / LOGO.w, (H * 0.62) / LOGO.h);
      const ox = W / 2 - (LOGO.x + LOGO.w / 2) * k, oy = H / 2 - (LOGO.y + LOGO.h / 2) * k;
      const place = `translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${k.toFixed(4)})`;
      bfSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      bfSvg.textContent = '';
      const defs = make('defs', {}, bfSvg);
      const mask = make('mask', { id: 'bf-m', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);
      make('rect', { x: -W, y: -H, width: W * 3, height: H * 3, fill: '#fff' }, mask);
      const gm = make('g', {}, mask);
      const gmIn = make('g', { transform: place }, gm);
      make('rect', { x: 0, y: 0, width: W, height: H, style: 'fill: var(--ground)', mask: 'url(#bf-m)' }, bfSvg);
      const go = make('g', { class: 'bf-o' }, bfSvg);
      const goIn = make('g', { transform: place }, go);
      const cuts = LOGO_CUT.map((d) => make('path', { d, fill: '#000' }, gmIn));
      LOGO_KEEP.forEach((d) => make('path', { d, fill: '#fff' }, gmIn));
      // the outline's dashes are measured on the screen (non-scaling-stroke), so each one is its own length at this size
      const outs = LOGO_CUT.slice(0, 4).map((d) => {
        const to = make('path', { d, class: 'bf-out' }, goIn);
        return { to, dash: to.getTotalLength() * k };
      });
      // the stem of the T as a plain rect: huge scaled shapes can drop out of a mask, a rect never does
      const stem = make('rect', { x: LOGO.stem.x, y: LOGO.stem.y, width: LOGO.stem.w, height: LOGO.stem.h, fill: '#000' }, gmIn);
      const A = { x: ox + (LOGO.stem.x + LOGO.stem.w / 2) * k, y: oy + (LOGO.stem.y + LOGO.stem.h / 2) * k };
      Z = { W, H, A, C: { x: W / 2, y: H / 2 }, sEnd: Math.max((W * 1.2) / (LOGO.stem.w * k), (H * 0.6) / (LOGO.stem.h / 2 * k)), gm, go, cuts, outs, stem };
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
      Z.outs.forEach((o) => {
        if (B.draw >= 1) { o.to.removeAttribute('stroke-dasharray'); o.to.removeAttribute('stroke-dashoffset'); return; }
        o.to.setAttribute('stroke-dasharray', o.dash.toFixed(1));
        o.to.setAttribute('stroke-dashoffset', (o.dash * (1 - B.draw)).toFixed(1));
      });
      Z.cuts.forEach((c) => c.setAttribute('fill-opacity', B.open.toFixed(3)));
      Z.stem.setAttribute('fill-opacity', B.open.toFixed(3));
      bfSvg.style.visibility = z > 0.995 ? 'hidden' : '';
      Z.go.setAttribute('opacity', Math.max(0, 1 - z / 0.3).toFixed(3));
      bfImg.style.transform = `scale(${(1.12 - 0.12 * z).toFixed(4)})`;
      bfPin.style.setProperty('--bf-fade', Math.max(0, (z - 0.55) / 0.45).toFixed(3));
    }
    const run = layout;
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
    const tw = gsap.fromTo(mark, { yPercent: 8, scale: 0.96, rotation: -1.5 }, {
      yPercent: -8, scale: 1.04, rotation: 1.5, ease: 'none',
      scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: 0.6, toggleClass: { targets: box, className: 'is-on' } },
    });
    // gsap's matchMedia has already reverted the tween by the time this runs
    return () => {
      gsap.set(mark, { clearProps: 'all' });
      box.classList.remove('is-on');
    };
  }

  /* ---- the way into the footer: the night kitchen rises whole over the form, the same move as "your turn" over the process.
     The form holds under it (position: sticky in css/site.css) and only creeps up. Then the photo dims for the closing line ---- */
  function buildGate() {
    const ft = document.querySelector('.ft');
    const ground = ft && ft.querySelector('.ft-ground');
    const top = ft && ft.querySelector('.ft-top');
    const contact = document.querySelector('.sec.contact');
    if (!ground || !top || !contact) return () => {};
    ft.classList.add('is-gate');
    root.classList.add('ft-rise');
    const theme = (t) => { if (ground.dataset.theme !== t) { ground.dataset.theme = t; document.dispatchEvent(new Event('kft:theme')); } };
    theme('night');
    // a form taller than the screen (the phone) holds only once its end has been read; an error line can make it taller
    const stick = () => contact.style.setProperty('--c-stick', `${Math.min(0, innerHeight - contact.offsetHeight)}px`);
    const ro = new ResizeObserver(stick);
    ro.observe(contact);
    stick();
    const holds = () => Math.min(contact.offsetHeight, innerHeight);
    const creep = gsap.fromTo(contact, { y: 0 }, {
      y: () => -0.14 * holds(), ease: 'none',
      scrollTrigger: { trigger: ft, start: () => `top ${holds()}px`, end: 'top top', scrub: true, invalidateOnRefresh: true },
    });
    const P = { d: 0 };
    const gt = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => ft.style.setProperty('--d', P.d.toFixed(3)) });
    // a moment with the lights on, and it dims while the line comes up
    gt.to(P, { d: 1, duration: 0.34 }, 0.66);
    const st = ScrollTrigger.create({ trigger: ft, start: 'top bottom', endTrigger: top, end: 'top 65%', scrub: 0.6, animation: gt });
    return () => {
      st.kill(); gt.kill();
      ro.disconnect();
      // gsap's matchMedia has already reverted the creep by the time this runs
      gsap.set(contact, { clearProps: 'transform' });
      contact.style.removeProperty('--c-stick');
      root.classList.remove('ft-rise');
      ft.classList.remove('is-gate');
      ft.style.removeProperty('--d');
      theme('paper');
    };
  }

  function goLive(isSheet) {
    root.classList.add('is-live');
    const un = [buildGrill(isSheet), buildMark(), buildGate()];
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
