/* KFT · sketch B: the moves beside the signature.
   The story: three chapters on one pinned stage (MV:g150), the plan drawn line after line on the way in.
   Projects: a spotlight that goes to each material in one project (our own, not from the vault), and rows whose picture changes (MV:h8).
   BLUE FIRE: blue flames and embers rising from one burner line under the name (MV:b102), on one canvas.
   The footer: the KFT mark rises out of its edge (MV:g236).
   Without GSAP every chapter of the story stands with its own picture and the footer stands still; with reduced motion or "stop animations"
   nothing is pinned, nothing loops, and every part shows its final state. */
(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  let still = false;
  try { still = !!JSON.parse(localStorage.getItem('kft-a11y') || '{}').still; } catch (e) { /* private mode */ }
  const quiet = () => !motion.matches || still;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---- the story: every chapter is always open. Wide with motion, they share one pinned stage and the scroll lights
     one chapter after the other; a phone with motion opens each picture out of its line as it comes up ---- */
  const story = document.querySelector('.story');
  if (story) {
    const items = [...story.querySelectorAll('.st-item')];
    const bars = items.map((it) => it.querySelector('.st-bar i'));
    const imgs = [...story.querySelectorAll('.st-img')];
    const edge = story.querySelector('.st-edge');
    const plan = story.querySelector('.plan');
    const n = items.length;
    let cur = 0;
    // live: the stage is on the screen. A jump past it (a link, the scroll bar) only sets the chapter, without the opening
    const show = (i, live = true) => {
      if (i === cur) return;
      const prev = cur; cur = i;
      story.classList.toggle('st-snap', !live);
      items.forEach((it, k) => it.classList.toggle('on', k === i));
      // the picture before stays under the new one while it opens, so it opens over a picture and not over a hole
      imgs.forEach((im, k) => { im.classList.toggle('on', k === i); im.classList.toggle('was', live && k === prev); });
      if (live && edge) { edge.classList.remove('go'); void edge.offsetWidth; edge.classList.add('go'); }
    };
    // once the new picture is open, the one under it goes
    imgs.forEach((im) => im.addEventListener('transitionend', (e) => {
      if (e.target === im && e.propertyName === 'clip-path' && im.classList.contains('on')) imgs.forEach((o) => o.classList.remove('was'));
    }));
    const setDraw = (v) => { if (plan) plan.style.setProperty('--draw', v.toFixed(3)); };

    if (hasGsap) {
      let mm = null;
      const setup = () => {
        if (mm) mm.revert();
        mm = gsap.matchMedia();
        mm.add({ wide: '(min-width: 1024px)', motion: '(prefers-reduced-motion: no-preference)' }, ({ conditions }) => {
          if (!conditions.motion || still) return;
          const kills = [];
          let pinST = null;
          if (conditions.wide) {
            story.classList.add('st-stage');
            pinST = ScrollTrigger.create({
              trigger: story.querySelector('.st-pin'), start: 'center center', end: '+=' + n * 36 + '%', pin: true, anticipatePin: 1,
              onUpdate: (self) => {
                const p = self.progress * n;
                show(Math.min(n - 1, Math.floor(p)), self.isActive);
                bars.forEach((b, k) => gsap.set(b, { scaleX: clamp(p - k), transition: 'none' }));
              },
            });
            kills.push(pinST);
          } else {
            story.classList.add('st-reveal');
            imgs.forEach((im) => im.classList.remove('on', 'was'));
            // a picture clipped shut never counts as intersecting, so its own place on the page opens it
            // not once: a trigger that kills itself leaves the list, and a refresh mid-page would then measure the wrong ones
            imgs.forEach((im) => kills.push(ScrollTrigger.create({ trigger: im, start: 'top 88%', onEnter: () => im.classList.add('on') })));
          }
          // the plan draws itself on the way in, finished by the end of its own chapter
          if (plan) {
            setDraw(0);
            kills.push(ScrollTrigger.create({
              trigger: conditions.wide ? story : plan, start: 'top 80%',
              end: conditions.wide ? () => pinST.start + (pinST.end - pinST.start) / n * 0.8 : 'center 45%',
              scrub: 0.6, onUpdate: (self) => setDraw(self.progress),
            }));
          }
          return () => {
            kills.forEach((k) => k.kill());
            story.classList.remove('st-stage', 'st-reveal', 'st-snap');
            cur = 0;
            items.forEach((it, k) => it.classList.toggle('on', k === 0));
            imgs.forEach((im, k) => { im.classList.toggle('on', k === 0); im.classList.remove('was', 'lit-done'); });
            gsap.set(bars, { clearProps: 'transform,transition' });
            setDraw(1);
          };
        });
      };
      setup();
      document.addEventListener('a11y:still', (e) => { if (!!e.detail === still) return; still = !!e.detail; setup(); });
    }
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

  /* ---- BLUE FIRE: one burner line under the name, blue tongues of flame and cream embers rising from it, all drawn on
     the canvas (b102, with its glow and flicker painted in the canvas too, so nothing on the page is written per frame).
     A press makes a burst. It runs only while on screen; still, it is one frame ---- */
  const bf = document.querySelector('.bf-top');
  if (bf) {
    const art = bf.querySelector('.bf-art'), cv = art.querySelector('.bf-cv'), ctx = cv.getContext('2d');
    let W = 0, H = 0, BY = 0, JETS = [], P = [], MAXE = 90, MAXF = 26, SC = 1, ember = null, flame = null;
    let running = false, vis = false, raf = 0, last = 0, T = 0, boost = 0, boostAt = 0, ae = 0, af = 0;
    const SPR = 64;
    const R = (a, b) => a + Math.random() * (b - a);
    const sprite = (stops) => {
      const c = document.createElement('canvas'); c.width = c.height = SPR;
      const g = c.getContext('2d'), gr = g.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
      stops.forEach(([o, col]) => gr.addColorStop(o, col));
      g.fillStyle = gr; g.fillRect(0, 0, SPR, SPR);
      return c;
    };
    const makeSprites = () => {
      ember = sprite([[0, 'rgba(255,246,228,1)'], [0.16, 'rgba(250,232,200,.92)'], [0.4, 'rgba(232,201,154,.62)'], [1, 'rgba(232,201,154,0)']]);
      flame = sprite([[0, 'rgba(226,238,255,1)'], [0.18, 'rgba(150,190,255,.9)'], [0.45, 'rgba(70,120,255,.5)'], [1, 'rgba(40,80,230,0)']]);
    };
    const spawnEmber = (x, y, burst) => {
      const j = JETS.length ? JETS[(Math.random() * JETS.length) | 0] : W / 2;
      return { k: 0, x: x != null ? x : j + R(-0.03, 0.03) * W, y: y != null ? y : BY - R(0, 4),
        vx: burst ? R(-70, 70) : R(-12, 12), vy: -(burst ? R(60, 190) : R(30, 100)), s: R(2, 4.4) * SC * (burst ? 1.1 : 1),
        age: 0, life: R(1.6, 3.6), wob: R(0, 6.28), wf: R(1, 2.4), wa: R(6, 20) };
    };
    const spawnFlame = () => {
      const j = JETS.length ? JETS[(Math.random() * JETS.length) | 0] : W / 2;
      return { k: 1, x: j + R(-0.006, 0.006) * W, y: BY - R(0, 3), vx: R(-6, 6), vy: -R(40, 90), s: R(14, 30) * SC,
        age: 0, life: R(0.35, 0.7), wob: R(0, 6.28), wf: R(2, 4), wa: R(3, 8) };
    };
    const step = (dt) => {
      T += dt;
      ae += dt * (MAXE / 3); af += dt * (MAXF / 0.5);
      let ne = 0, nf = 0;
      for (let i = 0; i < P.length; i++) { if (P[i].k) nf++; else ne++; }
      while (ae >= 1) { ae--; if (ne < MAXE) { P.push(spawnEmber()); ne++; } }
      while (af >= 1) { af--; if (nf < MAXF) { P.push(spawnFlame()); nf++; } }
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]; p.age += dt;
        if (p.age >= p.life) { P.splice(i, 1); continue; }
        p.x += (p.vx + Math.sin(p.wob + p.age * p.wf) * p.wa) * dt; p.y += p.vy * dt;
      }
      if (boost > 0) boost = Math.max(0, boost - dt * 2.2);
    };
    const paint = () => {
      ctx.clearRect(0, 0, W, H);
      // the flicker: three slow sines, a soft breathing under 2Hz, never a flash
      const g = Math.min(1, 0.8 + 0.1 * Math.sin(T * 5.3) + 0.06 * Math.sin(T * 9.1 + 1.7) + 0.04 * Math.sin(T * 12.6) + boost * 0.25);
      const x0 = JETS[0] - 12, x1 = JETS[JETS.length - 1] + 12;
      ctx.globalCompositeOperation = 'lighter';
      // the glow of the burner on the dark, then the burner line itself
      const halo = ctx.createLinearGradient(0, BY - 60 * SC, 0, BY + 30 * SC);
      halo.addColorStop(0, 'rgba(60,110,255,0)'); halo.addColorStop(0.66, `rgba(60,110,255,${(0.16 * g).toFixed(3)})`); halo.addColorStop(1, 'rgba(60,110,255,0)');
      ctx.fillStyle = halo; ctx.fillRect(x0, BY - 60 * SC, x1 - x0, 90 * SC);
      for (let i = 0; i < P.length; i++) {
        const p = P[i], t = p.age / p.life;
        let a, s;
        if (p.k) { a = (1 - t) * 0.55 * g; s = p.s * (1 - 0.45 * t); ctx.globalAlpha = a; ctx.drawImage(flame, p.x - s / 2, p.y - s * 0.8, s, s * 1.6); }
        else { a = Math.min(1, t * 8) * Math.pow(1 - t, 1.2) * 0.95; s = p.s * 6 * (1 - 0.4 * t); ctx.globalAlpha = a; ctx.drawImage(ember, p.x - s / 2, p.y - s / 2, s, s); }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const line = ctx.createLinearGradient(x0, 0, x1, 0);
      line.addColorStop(0, 'rgba(120,160,255,0)'); line.addColorStop(0.08, `rgba(160,195,255,${(0.75 * g).toFixed(3)})`);
      line.addColorStop(0.92, `rgba(160,195,255,${(0.75 * g).toFixed(3)})`); line.addColorStop(1, 'rgba(120,160,255,0)');
      ctx.fillStyle = line; ctx.fillRect(x0, BY, x1 - x0, 1.5);
    };
    const build = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1), r = art.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const small = W < 600;
      MAXE = small ? 36 : 90; MAXF = small ? 14 : 30; SC = small ? 0.8 : 1;
      BY = Math.round(H * 0.88);
      const J = small ? 8 : 18, gut = parseFloat(getComputedStyle(bf.closest('.bf')).paddingInlineStart) || 24;
      JETS = Array.from({ length: J }, (_, j) => gut + (W - 2 * gut) * (j / (J - 1)));
      if (!ember) makeSprites();
      // warm up: the first frame already has its flames and embers
      P = []; for (let i = 0; i < 150; i++) step(0.02);
      paint();
    };
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      step(dt); paint();
      raf = running ? requestAnimationFrame(loop) : 0;
    };
    const sync = () => {
      running = !quiet() && vis && !document.hidden;
      if (running && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    };
    bf.addEventListener('pointerdown', (e) => {
      const now = performance.now();
      if (quiet() || now - boostAt < 350 || !W) return;
      boostAt = now; boost = 1;
      const r = art.getBoundingClientRect(), x = e.clientX - r.left, y = clamp(e.clientY - r.top, 0, BY);
      for (let i = 0; i < (W < 600 ? 14 : 26); i++) P.push(spawnEmber(x, y, true));
    });
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('a11y:still', (e) => { still = !!e.detail; sync(); });
    new ResizeObserver(build).observe(art);
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; sync(); }, { rootMargin: '10% 0px' }).observe(bf);
    build();
  }

  /* ---- the footer: the columns come up and the mark rises out of the edge, once, as the footer arrives ---- */
  const ft = document.querySelector('.ft');
  if (ft && hasGsap) {
    const mark = ft.querySelector('.ft-mark img');
    const cols = [...ft.querySelectorAll('.ft-cols > *')];
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      if (still) return;
      gsap.set(mark, { yPercent: 42, scale: 0.92, transformOrigin: '50% 100%' });
      gsap.set(cols, { y: 20, opacity: 0 });
      const st = ScrollTrigger.create({ trigger: ft, start: 'top 85%', once: true, onEnter: () => {
        gsap.to(cols, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.07 });
        gsap.to(mark, { yPercent: 0, scale: 1, duration: 1.4, ease: 'power3.out', delay: 0.15 });
      } });
      return () => { st.kill(); gsap.killTweensOf(cols.concat([mark])); gsap.set(cols.concat([mark]), { clearProps: 'all' }); };
    });
  }

  if (hasGsap) addEventListener('load', () => ScrollTrigger.refresh());
  root.classList.add('moves-on');
})();
