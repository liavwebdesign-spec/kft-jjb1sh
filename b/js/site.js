/* KFT · sketch B: header, menu, in-page links, mobile action bar, reveals and the lead form (nothing is sent).
   The same file runs on the small pages (thanks, 404, accessibility, soon), so every part checks that its elements exist. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let still = false;
  try { still = !!JSON.parse(localStorage.getItem('kft-a11y') || '{}').still; } catch (e) { /* private mode */ }
  document.addEventListener('a11y:still', (e) => { still = !!e.detail; });
  const quiet = () => reduce.matches || still;

  /* ---- header: clear while it sits over the hero photo, the night's colour once the photo has gone under it,
     away on the way down and back on the way up (headroom) ---- */
  const hd = document.querySelector('.hd');
  const bar = document.querySelector('.bar');
  const frame = document.querySelector('.hero-frame');
  let lastY = scrollY, ticking = false, menuOpen = false, blocked = false, fieldFocus = false, wasSolid = null;
  const onScroll = () => {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    // solid as soon as the title below the photo could pass under it; on the small pages, always
    const solid = !frame || frame.getBoundingClientRect().bottom < (hd ? hd.offsetHeight : 72) + 8;
    if (hd && solid !== wasSolid) { hd.classList.toggle('is-solid', solid); wasSolid = solid; }
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

  /* ---- in-page links glide under the header (instant with reduced motion); from the keyboard the focus follows.
     Our own glide, not scroll-behavior smooth: the native one stalls over pinned scenes (sketch A, 28.10.2026).
     The target is re-read every frame, so a pin that settles on the way can't throw it off ---- */
  const hdSpace = () => (innerWidth < 768 ? 60 : 72) + 32;
  let glideId = 0;
  const glideTo = (dest) => {
    const max = () => document.scrollingElement.scrollHeight - innerHeight;
    if (quiet()) { scrollTo(0, Math.min(max(), dest())); return; }
    const from = scrollY, dur = Math.min(1400, Math.max(600, Math.abs(dest() - from) * 0.12)), t0 = performance.now(), me = ++glideId;
    const stop = () => { glideId++; };
    addEventListener('wheel', stop, { once: true, passive: true });
    addEventListener('touchstart', stop, { once: true, passive: true });
    const step = (now) => {
      if (me !== glideId) return;
      const p = Math.min(1, (now - t0) / dur), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      scrollTo(0, from + (Math.min(max(), dest()) - from) * e);
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
    glideTo(() => (id === 'top' ? 0 : Math.max(0, t.getBoundingClientRect().top + scrollY - hdSpace())));
    if (e.detail === 0) {
      if (!t.matches('a, button, input, [tabindex]')) t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
    }
  });

  /* ---- reveals, only with motion: words rise, a heading rises out of its line, a picture opens out of a line of light,
     the closer's line draws; an 80ms stagger among siblings of the same kind ---- */
  const kinds = ['rv', 'rv-h', 'lit', 'closer-rule'];
  const rv = [...document.querySelectorAll('.rv, .rv-h, .lit, .closer-rule')];
  // a picture still clipped shut may never reach the browser's own lazy loading, so its frame asks for it ahead
  const near = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
      near.unobserve(e.target);
    });
  }, { rootMargin: '1200px 0px' });
  document.querySelectorAll('.lit, .st-img, .ev-media').forEach((el) => near.observe(el));
  if (rv.length && !quiet()) {
    rv.forEach((el) => {
      const k = kinds.find((c) => el.classList.contains(c));
      const sibs = [...el.parentElement.children].filter((c) => c.classList.contains(k));
      el.style.setProperty('--i', String(Math.min(sibs.indexOf(el), 5)));
    });
    // a clipped element may not count as intersecting, so every reveal is watched through its parent
    const watch = new Map();
    rv.forEach((el) => {
      const t = el.classList.contains('rv') ? el : el.parentElement;
      if (!watch.has(t)) watch.set(t, []);
      watch.get(t).push(el);
    });
    // anything already past the top of the screen (a reload half way down) is simply shown
    const vh = innerHeight;
    watch.forEach((els, t) => { if (t.getBoundingClientRect().bottom < vh * 0.2) els.forEach((el) => el.classList.add('is-in')); });
    root.classList.add('rv-on');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        watch.get(e.target).forEach((el) => el.classList.add('is-in'));
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });
    watch.forEach((_, t) => io.observe(t));
    // a picture's line of light leaves once it has opened the picture
    document.addEventListener('animationend', (e) => { if (e.animationName === 'lit-line') e.target.classList.add('lit-done'); });
    // "stop animations" from the panel: everything shows at once
    document.addEventListener('a11y:still', (e) => { if (e.detail) rv.forEach((el) => el.classList.add('is-in')); });
  }

  /* ---- lead form: on success the first name goes to the thank-you page ---- */
  const form = document.getElementById('lead');
  if (!form) return;
  const submit = form.querySelector('[type="submit"]');
  const nameIn = form.elements.namedItem('name');
  const label = submit.textContent.trim();
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
    submit.textContent = 'שולח...';
    // sketch only: "?fail" in the address shows the failure state, otherwise the thank-you page
    setTimeout(() => {
      submit.disabled = false;
      submit.textContent = label;
      if (location.search.includes('fail')) {
        if (!fail) {
          fail = document.createElement('div');
          fail.className = 'form-fail';
          fail.setAttribute('role', 'alert');
          fail.innerHTML = '<p>השליחה לא עברה. הפרטים שלך נשמרו כאן, אז אפשר לנסות שוב או לכתוב לנו בוואטסאפ.</p><div class="ctas"><button class="btn" type="submit">לנסות שוב</button><a class="btn b2 wa" rel="noopener">לכתוב בוואטסאפ</a></div>';
          fail.querySelector('a').href = WA_FAIL;
          form.querySelector('.form-foot').before(fail);
        }
        return;
      }
      try { sessionStorage.setItem('kft-name', nameIn.value.trim().split(/\s+/)[0]); } catch (err) { /* private mode: the thank-you page greets without the name */ }
      location.href = form.getAttribute('action') || 'thanks.html';
    }, 900);
  });
})();
