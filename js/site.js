/* KFT · header, menu, in-page links, mobile action bar, reveals, motion pause and the lead form (proof: nothing is sent).
   The same file runs on the small pages (thanks, 404, accessibility), so every part checks that its elements exist. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const quiet = () => reduce.matches || root.classList.contains('a11y-still');

  /* ---- header: clear over the hero photo, paper pill elsewhere, hides on the way down ---- */
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
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = a.getAttribute('href').slice(1);
    e.preventDefault();
    const t = document.getElementById(id);
    if (!t) return;
    if (id === 'main') { t.focus({ preventScroll: true }); return; }
    const top = id === 'top' ? 0 : Math.max(0, t.getBoundingClientRect().top + scrollY - hdSpace());
    scrollTo({ top, behavior: quiet() ? 'auto' : 'smooth' });
    if (e.detail === 0) {
      if (!t.matches('a, button, input, [tabindex]')) t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
    }
  });

  /* ---- pause motion (the oven's flicker, the scroll cue, the reveals) ---- */
  const pauseBtn = document.querySelector('.pause');
  if (pauseBtn) pauseBtn.addEventListener('click', () => {
    const paused = pauseBtn.getAttribute('aria-pressed') !== 'true';
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.textContent = paused ? 'הפעלת התנועה' : 'עצירת התנועה';
    root.classList.toggle('is-paused', paused);
    document.dispatchEvent(new CustomEvent('kft:pause', { detail: { paused } }));
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

  /* ---- the clients' voice messages: until the recordings arrive, a press runs the message's own clock, so the
     place shows how it will behave; the real file goes into an <audio> behind the same button ---- */
  const clock = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  document.querySelectorAll('.v-play').forEach((b) => {
    const time = b.parentElement.querySelector('.v-time');
    const [m, sec] = time.textContent.split(':').map(Number);
    const total = m * 60 + sec;
    let t = 0, timer = null;
    const stop = () => { clearInterval(timer); timer = null; b.setAttribute('aria-pressed', 'false'); time.textContent = clock(total); };
    b.addEventListener('click', () => {
      if (timer) { stop(); return; }
      b.setAttribute('aria-pressed', 'true');
      t = 0; time.textContent = clock(t);
      timer = setInterval(() => { t += 1; time.textContent = clock(t); if (t >= total) stop(); }, 1000);
    });
  });

  /* ---- lead form: on success the first name goes to the thank-you page ---- */
  const form = document.getElementById('lead');
  if (!form) return;
  const submit = form.querySelector('[type="submit"]');
  const nameIn = form.elements.namedItem('name');
  const label = submit.textContent;
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
    // proof only: "?fail" in the address shows the failure state, otherwise the thank-you page
    setTimeout(() => {
      submit.disabled = false;
      submit.textContent = label;
      if (location.search.includes('fail')) {
        if (!fail) {
          fail = document.createElement('div');
          fail.className = 'form-fail';
          fail.setAttribute('role', 'alert');
          fail.innerHTML = '<p>משהו השתבש בשליחה. הפרטים שלך עדיין כאן: נסה שוב, או כתוב לנו בוואטסאפ ונחזור אליך משם.</p><div class="ctas"><button class="btn b3" type="submit">לנסות שוב</button><a class="btn b2 wa" rel="noopener">לכתוב בוואטסאפ</a></div>';
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
