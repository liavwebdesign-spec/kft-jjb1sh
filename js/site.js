/* KFT · the page's ground, the buttons' letters, header, menu, in-page links, mobile action bar, reveals and the lead
   form (proof: nothing is sent).
   The same file runs on the small pages (thanks, 404, accessibility), so every part checks that its elements exist. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const quiet = () => reduce.matches || root.classList.contains('a11y-still');

  /* ---- buttons: each letter in its own span, its twin drawn under it (css/site.css), so on hover the word rolls
     over letter by letter. The button keeps its words as its name, and the letters are hidden from screen readers ---- */
  const roll = (el, text) => {
    el.setAttribute('aria-label', text);
    const rb = document.createElement('span');
    rb.className = 'rb';
    rb.setAttribute('aria-hidden', 'true');
    [...text].forEach((ch, i) => {
      const c = document.createElement('span');
      c.className = 'rc';
      c.style.setProperty('--i', String(i));
      c.textContent = ch;
      rb.appendChild(c);
    });
    el.replaceChildren(rb);
  };
  document.querySelectorAll('.btn').forEach((b) => roll(b, b.textContent.trim()));

  /* ---- the ground (as on Liav's own site): one fixed layer per colour behind the page. The section that crosses the
     middle of the screen picks it, and the newest layer fades in over the last one. A beat later (FLIP) the header,
     the phone bar and the sections near the screen take the ground's colours (t-* on the body, th-* on the sections),
     so their words always match what is behind them. The story changes its own ground with the film (kft:theme) ---- */
  const bg = document.getElementById('bg');
  if (bg) {
    const layers = [...bg.children];
    const THEMES = layers.map((l) => l.dataset.t);
    const STAGE = {};
    layers.forEach((l) => { STAGE[l.dataset.t] = getComputedStyle(l).backgroundColor; });
    const FLIP = reduce.matches ? 0 : 200;
    let secs = [], cur = 'night', shown = 'night', z = 1, timer = 0, queued = false;
    const query = () => { secs = [...document.querySelectorAll('[data-theme]')]; };
    root.style.setProperty('--stage', STAGE[cur]);
    const paintSec = (s, t) => {
      if (s._t === t) return;
      s._t = t;
      THEMES.forEach((x) => s.classList.toggle(`th-${x}`, x === t));
    };
    const near = (r) => r.bottom > -innerHeight && r.top < innerHeight * 2;
    const sync = (rects) => secs.forEach((s, i) => { if (near(rects[i])) paintSec(s, shown); });
    const pick = () => {
      queued = false;
      if (!secs.length) return;
      const rects = secs.map((s) => s.getBoundingClientRect()), mid = innerHeight / 2;
      let t = cur;
      for (let i = 0; i < secs.length; i++) {
        if (rects[i].top <= mid && rects[i].bottom > mid) { t = secs[i].dataset.theme; break; }
      }
      if (rects[secs.length - 1].bottom <= mid) t = secs[secs.length - 1].dataset.theme;
      if (t !== cur) {
        cur = t;
        layers.forEach((l) => {
          const on = l.dataset.t === t;
          if (on) l.style.zIndex = String(++z);
          l.classList.toggle('on', on);
        });
        root.style.setProperty('--stage', STAGE[t]);
        clearTimeout(timer);
        timer = setTimeout(() => {
          shown = cur;
          THEMES.forEach((x) => document.body.classList.toggle(`t-${x}`, x === shown));
          sync(secs.map((s) => s.getBoundingClientRect()));
        }, FLIP);
      }
      sync(rects);
    };
    const ask = () => { if (!queued) { queued = true; requestAnimationFrame(pick); } };
    query();
    addEventListener('scroll', ask, { passive: true });
    addEventListener('resize', () => { query(); ask(); });
    addEventListener('load', ask);
    document.addEventListener('kft:theme', () => { query(); ask(); });
    pick();
  }

  /* ---- header: clear over the hero photo, the ground's own colour elsewhere, hides on the way down ---- */
  const hd = document.querySelector('.hd');
  const bar = document.querySelector('.bar');
  const overHero = !!document.querySelector('.hero');
  let lastY = scrollY, ticking = false, menuOpen = false, blocked = false, fieldFocus = false, wasClear = null;
  const onScroll = () => {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    // clear only while the hero's text is still far below it: the title never passes under a clear header
    const clear = overHero && y < vh * 0.25;
    if (hd && clear !== wasClear) {
      hd.dataset.tone = clear ? 'clear' : 'paper';
      hd.toggleAttribute('data-over-image', clear);
      wasClear = clear;
    }
    const down = y > lastY + 2, up = y < lastY - 2;
    if (hd) {
      if (y < 160 || up) hd.classList.remove('is-hidden');
      else if (down && !menuOpen) hd.classList.add('is-hidden');
    }
    lastY = y;
    if (bar) bar.classList.toggle('show', y > vh * 0.9 && !blocked && !fieldFocus && !menuOpen);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  if (hd) hd.addEventListener('focusin', () => hd.classList.remove('is-hidden'));

  /* ---- phone action bar: it steps aside while the form, the footer or a button for the same action is on screen, and
     while any other button passes behind it, so the same action never shows twice and the bar never covers a button ---- */
  if (bar) {
    const seen = new Map();
    const onSeen = (entries) => {
      entries.forEach((e) => seen.set(e.target, e.isIntersecting));
      blocked = [...seen.values()].some(Boolean);
      onScroll();
    };
    const zones = new IntersectionObserver(onSeen);
    ['#contact', '.ft'].forEach((s) => { const el = document.querySelector(s); if (el) zones.observe(el); });
    const twin = 'main a[href="#contact"], main a.wa';
    document.querySelectorAll(twin).forEach((b) => zones.observe(b));
    const band = new IntersectionObserver(onSeen, { rootMargin: '-84% 0px 0px 0px' });
    document.querySelectorAll('main .btn').forEach((b) => { if (!b.matches(twin)) band.observe(b); });
    const isField = (el) => el.matches('input, textarea, select');
    document.addEventListener('focusin', (e) => { if (isField(e.target)) { fieldFocus = true; onScroll(); } });
    document.addEventListener('focusout', (e) => { if (isField(e.target)) { fieldFocus = false; onScroll(); } });
  }
  onScroll();

  /* ---- full-screen menu ---- */
  const menu = document.getElementById('menu');
  const openBtn = document.querySelector('.hd-menu');
  if (menu && openBtn) {
    const closeBtn = menu.querySelector('.menu-close');
    const setMenu = (open) => {
      menuOpen = open;
      menu.hidden = !open;
      openBtn.setAttribute('aria-expanded', String(open));
      root.classList.toggle('lock', open);
      (open ? closeBtn : openBtn).focus();
      onScroll();
    };
    openBtn.addEventListener('click', () => setMenu(true));
    closeBtn.addEventListener('click', () => setMenu(false));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', (e) => {
      if (!menuOpen) return;
      if (e.key === 'Escape') setMenu(false);
      if (e.key === 'Tab') {
        const f = [...menu.querySelectorAll('a, button')];
        const first = f[0], end = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); }
        else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---- in-page links glide under the header (instant with reduced motion); from the keyboard the focus follows ---- */
  const hdSpace = () => (innerWidth < 768 ? 60 : 72) + 32;
  // our own glide, not scroll-behavior smooth: the native one stalled for a beat over the pinned scenes on the phone and
  // stopped short of the form (28.10.2026). The target is re-read every frame, so a pin that settles mid-way can't throw it off
  let glideId = 0;
  const glide = (t, toTop) => {
    const dest = () => Math.min(document.scrollingElement.scrollHeight - innerHeight,
      toTop ? 0 : Math.max(0, t.getBoundingClientRect().top + scrollY - hdSpace()));
    if (quiet()) { scrollTo(0, dest()); return; }
    const from = scrollY, dur = Math.min(1400, Math.max(600, Math.abs(dest() - from) * 0.12)), t0 = performance.now(), me = ++glideId;
    const stop = () => { glideId++; };
    addEventListener('wheel', stop, { once: true, passive: true });
    addEventListener('touchstart', stop, { once: true, passive: true });
    const step = (now) => {
      if (me !== glideId) return;
      const p = Math.min(1, (now - t0) / dur), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      scrollTo(0, from + (dest() - from) * e);
      if (p < 1) requestAnimationFrame(step);
      else { removeEventListener('wheel', stop); removeEventListener('touchstart', stop); }
    };
    requestAnimationFrame(step);
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = a.getAttribute('href').slice(1);
    e.preventDefault();
    const t = document.getElementById(id);
    if (!t) return;
    if (id === 'main') { t.focus({ preventScroll: true }); return; }
    glide(t, id === 'top');
    if (e.detail === 0) {
      if (!t.matches('a, button, input, [tabindex]')) t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
    }
  });

  /* ---- reveals, line first and then matter: a heading out of its line, a picture's frame and
     then the picture; 80-90ms stagger among siblings of the same kind ---- */
  const kinds = ['rv', 'rv-h', 'rv-img'];
  const rv = [...document.querySelectorAll('.rv, .rv-h, .rv-img')];
  rv.forEach((el) => {
    const k = kinds.find((c) => el.classList.contains(c));
    if (!k) return;
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains(k));
    el.style.setProperty('--i', String(Math.min(sibs.indexOf(el), 5)));
  });
  // a fully clipped heading never intersects, so headings are watched through their parent
  const watch = new Map();
  rv.forEach((el) => {
    const t = el.classList.contains('rv-h') ? el.parentElement : el;
    if (!watch.has(t)) watch.set(t, []);
    watch.get(t).push(el);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      watch.get(e.target).forEach((el) => el.classList.add('is-in'));
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  watch.forEach((_, t) => io.observe(t));
  // a picture still clipped shut never reaches the browser's own lazy loading, so its frame asks for it ahead
  const near = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
      near.unobserve(e.target);
    });
  }, { rootMargin: '1200px 0px' });
  document.querySelectorAll('.rv-img').forEach((el) => near.observe(el));

  /* ---- lead form: on success the first name goes to the thank-you page ---- */
  const form = document.getElementById('lead');
  if (!form) return;
  const submit = form.querySelector('[type="submit"]');
  const nameIn = form.elements.namedItem('name');
  const label = submit.getAttribute('aria-label') || submit.textContent.trim();
  const msg = {
    name: 'איך לקרוא לך?',
    telEmpty: 'לאיזה מספר לחזור אליך?',
    telBad: 'בדוק שהמספר מלא, כולל קידומת. למשל 0501234567.',
    pick: 'בחר אחת מהאפשרויות.',
  };
  const WA_FAIL = 'https://wa.me/?text=' + encodeURIComponent('היי, ניסיתי להשאיר פרטים באתר ואשמח שתחזרו אליי');
  let tried = false;
  const show = (id, text) => {
    const el = document.getElementById(id);
    el.textContent = text || '';
    el.hidden = !text;
    return !text;
  };
  const telDigits = (v) => {
    let d = v.replace(/\D/g, '');
    if (d.startsWith('972')) d = '0' + d.slice(3);
    return d;
  };
  function validate() {
    const name = nameIn.value.trim();
    const tel = telDigits(form.tel.value);
    const r = [];
    r.push(['f-name', show('e-name', name ? '' : msg.name)]);
    r.push(['f-tel', show('e-tel', !form.tel.value.trim() ? msg.telEmpty : tel.length < 9 || tel.length > 10 ? msg.telBad : '')]);
    r.push(['home', show('e-home', form.home.value ? '' : msg.pick)]);
    r.push(['stage', show('e-stage', form.stage.value ? '' : msg.pick)]);
    nameIn.setAttribute('aria-invalid', String(!r[0][1]));
    form.tel.setAttribute('aria-invalid', String(!r[1][1]));
    return r;
  }
  form.addEventListener('input', () => { if (tried) validate(); });
  form.addEventListener('change', () => { if (tried) validate(); });

  let fail = null;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    tried = true;
    const bad = validate().find(([, good]) => !good);
    if (bad) {
      const [id] = bad;
      (document.getElementById(id) || form.querySelector(`[name="${id}"]`)).focus();
      return;
    }
    submit.disabled = true;
    roll(submit, 'שולח...');
    // proof only: "?fail" in the address shows the failure state, otherwise the thank-you page
    setTimeout(() => {
      submit.disabled = false;
      roll(submit, label);
      if (location.search.includes('fail')) {
        if (!fail) {
          fail = document.createElement('div');
          fail.className = 'form-fail';
          fail.setAttribute('role', 'alert');
          fail.innerHTML = '<p>השליחה לא עברה. הפרטים שלך נשמרו כאן, אז אפשר לנסות שוב או לכתוב לנו בוואטסאפ.</p><div class="ctas"><button class="btn" type="submit">לנסות שוב</button><a class="btn b2 wa" rel="noopener">לכתוב בוואטסאפ</a></div>';
          fail.querySelector('a').href = WA_FAIL;
          fail.querySelectorAll('.btn').forEach((b) => roll(b, b.textContent.trim()));
          form.querySelector('.form-foot').before(fail);
        }
        return;
      }
      try { sessionStorage.setItem('kft-name', nameIn.value.trim().split(/\s+/)[0]); } catch (err) { /* private mode: the thank-you page greets without the name */ }
      location.href = form.getAttribute('action') || 'thanks.html';
    }, 900);
  });
})();
