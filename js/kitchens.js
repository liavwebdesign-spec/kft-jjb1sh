/* KFT · the kitchens' carousel. Without motion (reduced motion, "stop animations", no GSAP) it stays what the HTML is: a row
   to swipe, each card with its own caption. Live, the cards take their place from one number, S.pos, moved by dragging with
   inertia, the arrows, the keyboard, a click on a card or a sideways swipe; the kitchen in the centre names itself under the
   stage. Nothing advances on its own and nothing counts. Three ways to place them, for Liav to choose, all on the same engine:
   A (default) the arc, after MV:g151 · B (?k=b) the cylinder, after MV:g198; on a phone it falls to the arc · C (?k=c) a row
   whose pictures glide inside their frames, after MV:css35.
   Next is always to the left, the page reads right to left. */
(() => {
  const kit = document.querySelector('.kit');
  const rail = kit && kit.querySelector('.kit-rail');
  if (!rail) return;
  const cards = [...rail.children];
  const n = cards.length;
  const imgs = cards.map((c) => c.querySelector('.kit-im img'));
  const shades = cards.map((c) => c.querySelector('.kit-im'));
  const cap = kit.querySelector('.kit-cap');
  const arrows = [...kit.querySelectorAll('.kit-arr')];
  const asked = new URLSearchParams(location.search).get('k');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let still = false;
  try { still = !!JSON.parse(localStorage.getItem('kft-a11y') || '{}').still; } catch (e) { /* private mode */ }

  const S = { pos: 0 };
  const wrap = (v) => { v = ((v % n) + n) % n; return v > n / 2 ? v - n : v; };
  let live = false, kind = 'a', W = 0, cw = 0, ch = 0, R = 0, step = 0, vis = 0, active = -1, heightSet = 0;

  /* ---- the three placements ---- */
  const place = {
    a: { // the arc: a wheel seen from its top, the centre card a little larger
      measure() {
        R = Math.max(W * 0.95, cw * 4.2);
        step = (cw + (W < 768 ? cw * 0.1 : Math.max(24, cw * 0.3))) / R;
        // a card is shown from where its inner foot can reach the screen, so it never lights up out of sight
        vis = 1;
        for (let f = 1; f < n / 2; f += 0.05) {
          const b = f * step;
          if (R * Math.sin(b) - (cw / 2) * Math.cos(b) - ch * Math.sin(b) > W / 2) break;
          vis = f;
        }
        // as tall as what can be seen of the neighbours: their far corners run off the screen, so measure where the edge leaves it
        const sin = Math.sin(step), cos = Math.cos(step);
        const footX = R * sin - ch * sin, footY = R * (1 - cos) + ch * cos;
        const corner = footY + (cw / 2) * sin;
        return Math.max(ch * 1.07, Math.min(corner, footY + (W / 2 - footX) * (sin / cos)));
      },
      card(c, i, rel) {
        const a = rel * step, far = Math.abs(rel);
        const s = 1 + 0.07 * Math.max(0, 1 - far);
        c.style.transform = `translate(${(-Math.sin(a) * R).toFixed(1)}px, ${(R * (1 - Math.cos(a))).toFixed(1)}px) rotate(${(-a * 57.2958).toFixed(2)}deg) scale(${s.toFixed(3)})`;
        c.style.transformOrigin = '50% 0';
        c.style.opacity = far > vis ? 0 : 1;
        c.style.zIndex = 100 - Math.round(far * 10);
      },
      drag: () => step * R,
    },
    b: { // the cylinder: the same row wrapped around a drum that turns, the sides turning away into shade
      measure() {
        const pitch = cw + 12;
        R = (n * pitch) / (Math.PI * 2);
        step = (Math.PI * 2) / n;
        return ch * 1.04;
      },
      card(c, i, rel) {
        const al = -rel * step, far = Math.abs(al);
        c.style.transform = `translate3d(${(Math.sin(al) * R).toFixed(1)}px, 0, ${((Math.cos(al) - 1) * R).toFixed(1)}px) rotateY(${(al * 57.2958).toFixed(2)}deg)`;
        c.style.opacity = far > 1.75 ? 0 : 1;
        c.style.zIndex = 100 - Math.round(far * 10);
        shades[i].style.setProperty('--sh', (0.75 * (1 - Math.max(0.2, Math.cos(al)))).toFixed(3));
      },
      drag: () => step * R,
    },
    c: { // the glide: a straight row, and inside each frame the picture travels against the movement
      measure() {
        step = cw + Math.max(12, cw * 0.03);
        return ch;
      },
      card(c, i, rel) {
        c.style.transform = `translateX(${(-rel * step).toFixed(1)}px)`;
        c.style.opacity = 1;
        imgs[i].style.transform = `translateX(${(Math.max(-1, Math.min(1, rel)) * -11.5).toFixed(2)}%)`;
      },
      drag: () => step,
    },
  };

  const render = () => {
    cards.forEach((c, i) => place[kind].card(c, i, wrap(i - S.pos)));
    const now = ((Math.round(S.pos) % n) + n) % n;
    if (now !== active) {
      active = now;
      const f = cards[now].querySelector('figcaption');
      if (cap && f) {
        cap.innerHTML = f.innerHTML;
        cap.classList.remove('swap');
        void cap.offsetWidth;
        cap.classList.add('swap');
      }
    }
  };

  const measure = () => {
    W = rail.offsetWidth;
    cw = cards[0].offsetWidth;
    ch = cards[0].querySelector('.kit-im').offsetHeight;
    // the catalogue's own note on the cylinder: a plain row on a phone. Here it falls to the arc
    kind = asked === 'c' ? 'c' : asked === 'b' && W >= 768 ? 'b' : 'a';
    kit.classList.toggle('k-b', kind === 'b');
    kit.classList.toggle('k-c', kind === 'c');
    if (kind === 'c') ch = cards[0].querySelector('.kit-im').offsetHeight;
    const h = Math.ceil(place[kind].measure());
    rail.style.height = `${h}px`;
    render();
    if (Math.abs(h - heightSet) > 1) {
      heightSet = h;
      // the page below got shorter or longer: the pinned sections have to know where they start
      if (window.ScrollTrigger && document.readyState === 'complete') ScrollTrigger.refresh();
    }
  };

  /* ---- moving: every way in ends on a whole card ---- */
  const go = (target, dur = 0.9, ease = 'power3.inOut') => {
    gsap.to(S, { pos: target, duration: dur, ease, overwrite: true, onUpdate: render, onComplete: render });
  };
  const nudge = (d) => { if (live) go(Math.round(S.pos) + d); else rail.scrollBy({ left: -d * (cards[0].offsetWidth + 16), behavior: reduce.matches || still ? 'auto' : 'smooth' }); };
  arrows.forEach((b) => b.addEventListener('click', () => nudge(+b.dataset.d)));
  rail.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nudge(-1); }
  });

  let drag = null;
  rail.addEventListener('pointerdown', (e) => {
    if (!live || e.button !== 0) return;
    gsap.killTweensOf(S);
    drag = { x0: e.clientX, y0: e.clientY, p0: S.pos, lx: e.clientX, lt: performance.now(), v: 0, moved: false, card: e.target.closest('.kit-c') };
    rail.setPointerCapture(e.pointerId);
  });
  rail.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved) {
      // a finger going up and down is the page's, not the carousel's
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { drag = null; go(Math.round(S.pos), 0.5, 'power3.out'); return; }
      if (Math.abs(dx) < 4) return;
      drag.moved = true;
      rail.classList.add('grabbing');
    }
    const t = performance.now();
    drag.v = (e.clientX - drag.lx) / Math.max(1, t - drag.lt);
    drag.lx = e.clientX; drag.lt = t;
    S.pos = drag.p0 + dx / place[kind].drag();
    render();
  });
  const release = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    rail.classList.remove('grabbing');
    if (!d.moved) {
      if (d.card) go(Math.round(S.pos + wrap(cards.indexOf(d.card) - S.pos)));
      return;
    }
    go(Math.round(S.pos + (d.v * 260) / place[kind].drag()), 0.7, 'power3.out');
  };
  rail.addEventListener('pointerup', release);
  rail.addEventListener('pointercancel', release);
  // a sideways swipe on a trackpad; the wheel going up and down stays the page's
  let wheelEnd = 0;
  rail.addEventListener('wheel', (e) => {
    if (!live || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    gsap.killTweensOf(S);
    S.pos -= e.deltaX / place[kind].drag();
    render();
    clearTimeout(wheelEnd);
    wheelEnd = setTimeout(() => go(Math.round(S.pos), 0.6, 'power3.out'), 120);
  }, { passive: false });

  /* ---- live or the plain row ---- */
  const ro = new ResizeObserver(() => { if (live) measure(); });
  const setLive = (on) => {
    if (on === live) return;
    live = on;
    kit.classList.toggle('k-live', on);
    if (on) {
      imgs.forEach((img) => { img.loading = 'eager'; });
      active = -1;
      measure();
      ro.observe(rail);
      return;
    }
    gsap.killTweensOf(S);
    ro.disconnect();
    kit.classList.remove('k-b', 'k-c');
    rail.removeAttribute('style');
    cards.forEach((c, i) => { c.removeAttribute('style'); imgs[i].style.transform = ''; shades[i].style.removeProperty('--sh'); });
    heightSet = 0;
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  };
  const decide = () => setLive(!!window.gsap && !reduce.matches && !still);
  document.addEventListener('a11y:still', (e) => { still = !!e.detail; decide(); });
  reduce.addEventListener('change', decide);
  decide();
  addEventListener('load', () => { if (live) { measure(); if (window.ScrollTrigger) ScrollTrigger.refresh(); } });
})();
