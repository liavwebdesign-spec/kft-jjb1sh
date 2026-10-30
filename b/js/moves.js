/* KFT · sketch B: the moves around the signature.
   The hero: as it scrolls away the photo leans in and the two lines of the title part (our own, on MV:h20).
   The story: three chapters on one track carried across by the scroll (MV:g01); each giant numeral fills with the red as
   its chapter arrives (MV:g278), and the plan draws itself on the way in.
   The stack: from the projects down, each card holds while the next one slides over it, and steps back into the dark (MV:g153).
   Projects: a spotlight that goes to each material in one project (our own, not from the vault), and rows whose picture changes (MV:h8).
   BLUE FIRE: the name itself burns. Its letters on one canvas, blue flames and embers rising from their tops, and the
   pointer heats them (MV:b102).
   Architects: the photo fills the card and draws back to make room for the words (MV:g223).
   The footer: the KFT mark rises out of its edge (MV:g236).
   Without GSAP every part stands in its final state; with reduced motion or "stop animations" nothing is pinned,
   nothing loops, and every part shows its final state. */
(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  let still = false;
  try { still = !!JSON.parse(localStorage.getItem('kft-a11y') || '{}').still; } catch (e) { /* private mode */ }
  const quiet = () => !motion.matches || still;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const hero = document.querySelector('.hero');
  const story = document.querySelector('.story');
  const cards = [...document.querySelectorAll('.stk-p')];
  const arch = document.querySelector('.arch-row');

  /* ---- everything that rides the scroll, made in page order: the hero, the story's pin, then the stack ---- */
  if (hasGsap) {
    let mm = null;
    const setup = () => {
      if (mm) mm.revert();
      mm = gsap.matchMedia();
      mm.add({ wide: '(min-width: 1024px)', motion: '(prefers-reduced-motion: no-preference)' }, ({ conditions }) => {
        if (!conditions.motion || still) return;
        const undo = [];

        /* the hero: the photo leans in and drops behind, the two lines part, the line and buttons fade */
        if (hero) {
          const lns = [...hero.querySelectorAll('h1 .ln')];
          const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
          tl.to(hero.querySelector('.hero-ph'), { scale: 1.12, yPercent: 10, ease: 'none', duration: 1 }, 0)
            .to(lns[0], { xPercent: 7, ease: 'none', duration: 1 }, 0)
            .to(lns[1], { xPercent: -7, ease: 'none', duration: 1 }, 0)
            .to(hero.querySelector('.hero-row'), { opacity: 0, y: -24, ease: 'none', duration: 0.6 }, 0);
        }

        /* the story */
        if (story) {
          const wrap = story.querySelector('.st-wrap'), track = story.querySelector('.st-track');
          const nums = [...story.querySelectorAll('.st-num')], bar = story.querySelector('.st-prog i');
          const plan = story.querySelector('.plan');
          const fill = (el, v) => el.style.setProperty('--f', v.toFixed(3));
          if (plan) plan.style.setProperty('--draw', 0);
          nums.forEach((el) => fill(el, 0));
          undo.push(() => { nums.forEach((el) => el.style.removeProperty('--f')); if (plan) plan.style.removeProperty('--draw'); });

          if (conditions.wide) {
            story.classList.add('st-on');
            undo.push(() => story.classList.remove('st-on'));
            const RUN = 1.4;
            const pw = () => wrap.clientWidth;
            // where the track stands, in chapters: 0 on the first, 2 on the last. Each numeral fills over the last
            // 60% of its chapter's way in; the first one fills as the story comes up to the pin
            const upd = () => {
              const pos = (gsap.getProperty(track, 'x') || 0) / pw();
              for (let i = 1; i < nums.length; i++) fill(nums[i], clamp((pos - i + 0.6) / 0.6));
              if (bar) bar.style.transform = `scaleX(${clamp(pos / (nums.length - 1)).toFixed(4)})`;
            };
            gsap.to({}, { scrollTrigger: { trigger: story, start: 'top 85%', end: 'top 15%', scrub: 0.4,
              onUpdate: (self) => fill(nums[0], self.progress) } });
            // the plan draws as the story comes up; made before the pin, which starts at the same place on the page
            if (plan) gsap.to({}, { scrollTrigger: { trigger: story, start: 'top 75%', end: 'top -30%', scrub: 0.6,
              onUpdate: (self) => plan.style.setProperty('--draw', self.progress.toFixed(3)) } });
            // a breath on each chapter, and a glide between them (x is positive in RTL: the track comes in from the end side)
            const tl = gsap.timeline({ onUpdate: upd, scrollTrigger: { trigger: wrap, start: 'top top', end: () => '+=' + RUN * innerHeight,
              pin: true, scrub: 0.5, anticipatePin: 1, invalidateOnRefresh: true } });
            tl.to({}, { duration: 0.2 })
              .to(track, { x: () => pw(), ease: 'power2.inOut', duration: 1 })
              .to({}, { duration: 0.3 })
              .to(track, { x: () => 2 * pw(), ease: 'power2.inOut', duration: 1 })
              .to({}, { duration: 0.2 });
            undo.push(() => { if (bar) bar.style.removeProperty('transform'); });
          } else {
            nums.forEach((el) => gsap.to({}, { scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 45%', scrub: 0.4,
              onUpdate: (self) => fill(el, self.progress) } }));
            if (plan) gsap.to({}, { scrollTrigger: { trigger: plan, start: 'top 80%', end: 'center 45%', scrub: 0.6,
              onUpdate: (self) => plan.style.setProperty('--draw', self.progress.toFixed(3)) } });
          }
        }

        /* the stack: made after the story's pin, so it is measured after it. Nothing is added to the page's length */
        if (conditions.wide) {
          cards.forEach((p, i) => {
            const next = cards[i + 1];
            if (!next) return;
            const card = p.querySelector('.stk-card');
            ScrollTrigger.create({ trigger: p, pin: true, pinSpacing: false, anticipatePin: 1, invalidateOnRefresh: true,
              start: () => (p.offsetHeight > innerHeight ? 'bottom bottom' : 'top top'), endTrigger: next, end: 'top top' });
            // once the next card has closed over it the card is out of sight, so it steps out of the page altogether
            gsap.fromTo(card, { '--sk-s': 1, '--sk-dim': 0 }, { '--sk-s': 0.92, '--sk-dim': 0.55, ease: 'none', immediateRender: false,
              scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: 0.4,
                onLeave: () => { card.style.opacity = '0'; }, onEnterBack: () => { card.style.removeProperty('opacity'); } } });
            undo.push(() => { card.style.removeProperty('--sk-s'); card.style.removeProperty('--sk-dim'); card.style.removeProperty('opacity'); });
          });
        }

        /* the architects: the photo draws back from the whole card to its place, and the words come into the room it leaves */
        if (arch && conditions.wide) {
          const ph = arch.querySelector('.arch-ph'), img = ph.querySelector('img'), copy = arch.querySelector('.arch-in');
          gsap.timeline({ scrollTrigger: { trigger: arch, start: 'top 85%', end: 'top 10%', scrub: 0.5 } })
            .fromTo(ph, { flexBasis: '100%' }, { flexBasis: '56%', ease: 'power1.inOut', duration: 1 }, 0)
            .fromTo(img, { scale: 1.08 }, { scale: 1, ease: 'none', duration: 1 }, 0)
            .fromTo(copy, { opacity: 0, x: 36 }, { opacity: 1, x: 0, ease: 'power2.out', duration: 0.55 }, 0.45);
        }

        return () => undo.forEach((f) => f());
      });
      // the story's pin is made before the triggers above it on the page are measured; put them back in page order
      ScrollTrigger.sort();
    };
    setup();
    document.addEventListener('a11y:still', (e) => { if (!!e.detail === still) return; still = !!e.detail; setup(); ScrollTrigger.refresh(); });
  }

  /* ---- the spotlight: the light comes on when the photo is well in view, and each material moves it.
     The words under the photo are the way in for everyone; the points on the photo are a shortcut for the pointer ---- */
  const spot = document.querySelector('[data-spot]');
  if (spot) {
    const dim = spot.querySelector('.spot-dim');
    const hs = [...spot.querySelectorAll('.hs')];
    const picks = [...spot.querySelectorAll('.pick')];
    const pick = (i) => {
      picks.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      hs.forEach((h, k) => h.classList.toggle('is-on', k === i));
      dim.style.setProperty('--lx', hs[i].dataset.x + '%');
      dim.style.setProperty('--ly', hs[i].dataset.y + '%');
    };
    const light = () => spot.classList.add('is-lit');
    picks.forEach((b, k) => b.addEventListener('click', () => { light(); pick(k); }));
    hs.forEach((h, k) => h.addEventListener('click', () => { light(); pick(k); }));
    pick(0);
    if (quiet()) light();
    else {
      const lo = new IntersectionObserver((es) => { if (es[0].isIntersecting) { light(); lo.disconnect(); } }, { threshold: 0.4 });
      lo.observe(spot.querySelector('.spot-ph'));
    }
  }

  /* ---- more projects: the picture beside the list follows the pointer and the keyboard focus ---- */
  const rowsEl = document.querySelector('.rows');
  if (rowsEl) {
    const vis = [...rowsEl.querySelectorAll('.rows-vis img')];
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const showRow = (i) => vis.forEach((im, k) => im.classList.toggle('on', k === i));
    rowsEl.querySelectorAll('.row-a').forEach((a, i) => {
      if (fine) a.addEventListener('mouseenter', () => showRow(i));
      a.addEventListener('focus', () => showRow(i));
    });
  }

  /* ---- BLUE FIRE: the name itself burns. The letters are drawn once into a layer of their own with a blue glow
     under them; blue tongues of flame and white embers rise from every upward edge of the letters, and the pointer
     heats the part it is over. All on one canvas (b102, the flicker painted in the canvas, nothing on the page written
     per frame). A press makes a burst. It runs only while on screen; still, it is one frame ---- */
  const bf = document.querySelector('.bf-top');
  if (bf) {
    const sec = bf.closest('.bf'), cv = bf.querySelector('.bf-cv'), ctx = cv.getContext('2d');
    const WORD = 'BLUE FIRE';
    let W = 0, H = 0, EDGE = [], P = [], MAXE = 90, MAXF = 60, SC = 1, ember = null, flame = null, word = null, glow = null;
    let running = false, vis = false, raf = 0, last = 0, T = 0, boost = 0, boostAt = 0, ae = 0, af = 0, heat = 0, hx = 0, ready = false;
    const SPR = 64;
    const R = (a, b) => a + Math.random() * (b - a);
    const layer = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const sprite = (stops) => {
      const c = layer(SPR, SPR), g = c.getContext('2d'), gr = g.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
      stops.forEach(([o, col]) => gr.addColorStop(o, col));
      g.fillStyle = gr; g.fillRect(0, 0, SPR, SPR);
      return c;
    };
    const makeSprites = () => {
      ember = sprite([[0, 'rgba(255,255,255,1)'], [0.16, 'rgba(224,234,255,.92)'], [0.42, 'rgba(140,176,255,.6)'], [1, 'rgba(90,130,255,0)']]);
      flame = sprite([[0, 'rgba(230,240,255,1)'], [0.18, 'rgba(150,190,255,.9)'], [0.45, 'rgba(70,120,255,.5)'], [1, 'rgba(40,80,230,0)']]);
    };
    // the letters: fitted to the width, one line when there is room and two when narrow, a little under the middle so
    // the fire has the screen above them to rise into
    const setWord = (g, dpr) => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.direction = 'ltr'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const two = W < 760;
      const rows = two ? ['BLUE', 'FIRE'] : [WORD];
      g.font = '700 100px GS, system-ui, sans-serif';
      const wide = Math.max(...rows.map((r) => g.measureText(r).width));
      const fs = Math.min((W * (two ? 0.8 : 0.86)) / wide * 100, H * (two ? 0.3 : 0.44));
      g.font = `700 ${fs.toFixed(1)}px GS, system-ui, sans-serif`;
      const cap = g.measureText('E').actualBoundingBoxAscent || fs * 0.72, lead = fs * 0.98;
      const first = H * 0.6 + cap / 2 - (rows.length - 1) * lead / 2;
      return rows.map((r, i) => [r, W / 2, first + i * lead]);
    };
    const build = () => {
      const r = bf.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1, 2400 / W);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const small = W < 600;
      MAXE = small ? 36 : 90; MAXF = small ? 26 : 64; SC = small ? 0.75 : Math.min(1.25, W / 1440);
      if (!ember) makeSprites();
      // the letters, white at the top and cooling to the flame's blue at the foot
      word = layer(cv.width, cv.height);
      const wg = word.getContext('2d');
      const rows = setWord(wg, dpr);
      const grad = wg.createLinearGradient(0, rows[0][2] - H * 0.25, 0, rows[rows.length - 1][2]);
      grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(0.6, '#EEF2FF'); grad.addColorStop(1, '#8FA9FF');
      wg.fillStyle = grad;
      rows.forEach(([t, x, y]) => wg.fillText(t, x, y));
      // the glow: only the shadow of the letters, drawn from far off the layer
      glow = layer(cv.width, cv.height);
      const gg = glow.getContext('2d');
      setWord(gg, dpr);
      gg.shadowColor = 'rgba(60,110,255,.95)'; gg.shadowBlur = 46 * dpr * SC; gg.shadowOffsetX = 10000 * dpr; gg.fillStyle = '#000';
      rows.forEach(([t, x, y]) => gg.fillText(t, x - 10000, y));
      // every upward edge of the letters, read from a mask at the page's own size
      const m = layer(Math.ceil(W), Math.ceil(H)), mg = m.getContext('2d');
      setWord(mg, 1); mg.fillStyle = '#000';
      rows.forEach(([t, x, y]) => mg.fillText(t, x, y));
      const data = mg.getImageData(0, 0, m.width, m.height).data, mw = m.width;
      EDGE = [];
      for (let x = 1; x < mw; x += 3) {
        for (let y = 1; y < m.height; y++) {
          if (data[(y * mw + x) * 4 + 3] > 140 && data[((y - 1) * mw + x) * 4 + 3] <= 140) EDGE.push([x, y]);
        }
      }
      // warm up: the first frame already has its flames and embers
      P = []; for (let i = 0; i < 160; i++) step(0.02);
      paint();
      ready = true;
      sec.classList.add('is-live');
      sec.querySelector('.bf-h').classList.add('sr-only');
    };
    const edgeAt = () => {
      if (!EDGE.length) return [W / 2, H / 2];
      // the heated part gets most of the new fire while the pointer is over it
      if (heat > 0.05 && Math.random() < heat * 0.7) {
        const near = EDGE.filter((e) => Math.abs(e[0] - hx) < 70 * SC);
        if (near.length) return near[(Math.random() * near.length) | 0];
      }
      return EDGE[(Math.random() * EDGE.length) | 0];
    };
    const spawnEmber = (x, y, burst) => {
      const e = x == null ? edgeAt() : null;
      return { k: 0, x: e ? e[0] + R(-3, 3) : x, y: e ? e[1] - R(0, 4) : y,
        vx: burst ? R(-80, 80) : R(-12, 12), vy: -(burst ? R(70, 210) : R(30, 100)), s: R(1.8, 4) * SC * (burst ? 1.1 : 1),
        age: 0, life: R(1.4, 3.4), wob: R(0, 6.28), wf: R(1, 2.4), wa: R(6, 20) };
    };
    const spawnFlame = () => {
      const e = edgeAt();
      return { k: 1, x: e[0] + R(-1.5, 1.5), y: e[1] + R(0, 3), vx: R(-5, 5), vy: -R(40, 96) * SC, s: R(16, 34) * SC,
        age: 0, life: R(0.3, 0.62), wob: R(0, 6.28), wf: R(2, 4), wa: R(2, 6) };
    };
    const step = (dt) => {
      T += dt;
      const hot = 1 + heat * 0.8 + boost;
      ae += dt * (MAXE / 3) * hot; af += dt * (MAXF / 0.45) * hot;
      let ne = 0, nf = 0;
      for (let i = 0; i < P.length; i++) { if (P[i].k) nf++; else ne++; }
      while (ae >= 1) { ae--; if (ne < MAXE * (1 + heat * 0.5)) { P.push(spawnEmber()); ne++; } }
      while (af >= 1) { af--; if (nf < MAXF * (1 + heat * 0.4)) { P.push(spawnFlame()); nf++; } }
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]; p.age += dt;
        if (p.age >= p.life) { P.splice(i, 1); continue; }
        p.x += (p.vx + Math.sin(p.wob + p.age * p.wf) * p.wa) * dt; p.y += p.vy * dt;
      }
      if (boost > 0) boost = Math.max(0, boost - dt * 2.2);
      if (heat > 0) heat = Math.max(0, heat - dt * 0.9);
    };
    const paint = () => {
      ctx.clearRect(0, 0, W, H);
      // the flicker: three slow sines, a soft breathing under 2Hz, never a flash
      const g = Math.min(1, 0.78 + 0.1 * Math.sin(T * 5.3) + 0.06 * Math.sin(T * 9.1 + 1.7) + 0.04 * Math.sin(T * 12.6) + boost * 0.25 + heat * 0.12);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * g; ctx.drawImage(glow, 0, 0, W, H);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(word, 0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < P.length; i++) {
        const p = P[i], t = p.age / p.life;
        let s;
        if (p.k) { ctx.globalAlpha = (1 - t) * 0.75 * g; s = p.s * (1 - 0.45 * t); ctx.drawImage(flame, p.x - s / 2, p.y - s * 1.1, s, s * 1.6); }
        else { ctx.globalAlpha = Math.min(1, t * 8) * Math.pow(1 - t, 1.2) * 0.95; s = p.s * 6 * (1 - 0.4 * t); ctx.drawImage(ember, p.x - s / 2, p.y - s / 2, s, s); }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      step(dt); paint();
      raf = running ? requestAnimationFrame(loop) : 0;
    };
    const sync = () => {
      running = ready && !quiet() && vis && !document.hidden;
      if (running && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    };
    bf.addEventListener('pointermove', (e) => {
      if (quiet() || !ready) return;
      const r = bf.getBoundingClientRect();
      hx = e.clientX - r.left; heat = Math.min(1, heat + 0.12);
    });
    bf.addEventListener('pointerdown', (e) => {
      const now = performance.now();
      if (quiet() || !ready || now - boostAt < 350) return;
      boostAt = now; boost = 1;
      const r = bf.getBoundingClientRect(), x = e.clientX - r.left, y = clamp(e.clientY - r.top, 0, H);
      for (let i = 0; i < (W < 600 ? 14 : 28); i++) P.push(spawnEmber(x, y, true));
    });
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('a11y:still', (e) => { still = !!e.detail; sync(); });
    let rt = 0, bw = 0, bh = 0;
    // a phone's address bar changes the height a little: only a real change of size draws the letters again
    new ResizeObserver(() => {
      const r = bf.getBoundingClientRect();
      if (Math.abs(r.width - bw) < 1 && Math.abs(r.height - bh) < 120) return;
      bw = r.width; bh = r.height;
      clearTimeout(rt); rt = setTimeout(() => { if (ready || document.fonts.check('700 40px GS')) { build(); sync(); } }, 120);
    }).observe(bf);
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; sync(); }, { rootMargin: '10% 0px' }).observe(bf);
    // the letters are drawn in Google Sans: wait for it, but never longer than three seconds
    Promise.race([document.fonts.load('700 100px GS'), new Promise((r) => setTimeout(r, 3000))])
      .catch(() => {}).then(() => { const r = bf.getBoundingClientRect(); bw = r.width; bh = r.height; build(); sync(); });
  }

  /* ---- the footer: the columns come up and the mark rises out of the edge, once, as the footer arrives ---- */
  const ft = document.querySelector('.ft');
  if (ft && hasGsap) {
    const mark = ft.querySelector('.ft-mark img');
    const cols = [...ft.querySelectorAll('.ft-cols > *')];
    let fm = null;
    // remade when "stop animations" changes, or the columns would wait for a tween the paused timeline never plays
    const foot = () => { if (fm) fm.revert(); fm = gsap.matchMedia(); fm.add('(prefers-reduced-motion: no-preference)', () => {
      if (still) return;
      gsap.set(mark, { yPercent: 42, scale: 0.92, transformOrigin: '50% 100%' });
      gsap.set(cols, { y: 20, opacity: 0 });
      const st = ScrollTrigger.create({ trigger: ft, start: 'top 85%', once: true, onEnter: () => {
        gsap.to(cols, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.07 });
        gsap.to(mark, { yPercent: 0, scale: 1, duration: 1.4, ease: 'power3.out', delay: 0.15 });
      } });
      return () => { st.kill(); gsap.killTweensOf(cols.concat([mark])); gsap.set(cols.concat([mark]), { clearProps: 'all' }); };
    }); };
    foot();
    // only when the setting really changes: the saved setting is announced once on load, and a remade trigger would
    // join the end of the list after the triggers below it on the page
    let footStill = still;
    document.addEventListener('a11y:still', () => { if (still === footStill) return; footStill = still; foot(); ScrollTrigger.sort(); });
  }

  if (hasGsap) addEventListener('load', () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
  root.classList.add('moves-on');
})();
