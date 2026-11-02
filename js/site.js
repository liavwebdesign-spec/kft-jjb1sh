/* KFT · the buttons' letters, what the fixed parts stand on, header, menu, in-page links, mobile action bar, reveals and
   the lead form (proof: nothing is sent).
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

  /* ---- the ground: every section paints its own, black or white, and where two meet the line is hard. The header, the
     phone bar and the accessibility button have no ground of their own: each takes its colours from the section under
     its own line (data-ground), at once. The process and "from your chair" change theirs with the film (kft:theme) ---- */
  const hd = document.querySelector('.hd');
  const bar = document.querySelector('.bar');
  const fabs = document.querySelector('.fabs');
  const heroEl = document.querySelector('.hero');
  const secs = [...document.querySelectorAll('[data-theme]')];
  const groundAt = (y) => {
    let t = '';
    // the last match is the innermost, a section inside a section comes later in the page
    secs.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) t = s.dataset.theme; });
    return t;
  };
  const readers = [[hd, () => 36], [bar, () => innerHeight - 30], [fabs, () => innerHeight - 38]].filter((r) => r[0]);
  const paintGrounds = () => {
    if (!secs.length) return;
    readers.forEach(([el, y]) => {
      const t = groundAt(y());
      if (t && el.dataset.ground !== t) el.dataset.ground = t;
    });
  };
  document.addEventListener('kft:theme', paintGrounds);

  /* ---- header: lighter over the hero's film, its glass everywhere else, hides on the way down ---- */
  let lastY = scrollY, ticking = false, menuOpen = false, blocked = false, fieldFocus = false, wasOver = null;
  const onScroll = () => {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    const over = !!heroEl && heroEl.getBoundingClientRect().bottom > 72;
    if (hd && over !== wasOver) {
      hd.toggleAttribute('data-over-image', over);
      wasOver = over;
    }
    paintGrounds();
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
  addEventListener('load', onScroll);
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

  /* ---- the header's links: a pill slides under the link you point at and rests on the section you are in. It is a
     second, inverted copy of all the labels, and a clip opens only the part over that link, so only the letters inside
     the pill invert (MV:b55). offsetLeft is physical, so it reads the same right to left. Plain transitions: the small
     pages have no GSAP ---- */
  const nav = hd && hd.querySelector('.hd-nav');
  if (nav) {
    const links = [...nav.querySelectorAll('a')];
    const pill = document.createElement('span');
    pill.className = 'hd-ind';
    pill.setAttribute('aria-hidden', 'true');
    const copies = links.map((a) => { const s = document.createElement('span'); s.textContent = a.textContent; pill.appendChild(s); return s; });
    nav.appendChild(pill);
    let active = null, shown = null;
    const fit = () => links.forEach((a, i) => {
      const s = copies[i].style;
      s.left = `${a.offsetLeft}px`; s.top = `${a.offsetTop}px`; s.width = `${a.offsetWidth}px`; s.height = `${a.offsetHeight}px`;
    });
    const put = (a) => {
      const from = shown;
      shown = a;
      if (!a) { pill.style.opacity = '0'; return; }
      // out of nothing it appears in place, it only slides from another link
      if (!from) pill.style.transition = 'none';
      const end = nav.clientWidth - a.offsetLeft - a.offsetWidth, foot = nav.clientHeight - a.offsetTop - a.offsetHeight;
      pill.style.clipPath = `inset(${a.offsetTop}px ${end}px ${foot}px ${a.offsetLeft}px round 999px)`;
      if (!from) { void pill.offsetWidth; pill.style.transition = ''; }
      pill.style.opacity = '1';
    };
    const rest = () => put(active);
    links.forEach((a) => {
      a.addEventListener('mouseenter', () => put(a));
      a.addEventListener('focus', () => put(a));
    });
    nav.addEventListener('mouseleave', rest);
    nav.addEventListener('focusout', () => setTimeout(() => { if (!nav.contains(document.activeElement)) rest(); }, 0));
    const remeasure = () => { fit(); if (shown) { const a = shown; shown = null; put(a); } };
    addEventListener('resize', remeasure);
    remeasure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    // the section crossing the middle of the screen is the one you are in
    const marks = links.map((a) => {
      const id = (a.getAttribute('href') || '').split('#')[1];
      return [id && a.pathname === location.pathname ? document.getElementById(id) : null, a];
    }).filter((m) => m[0]);
    if (marks.length) {
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          const m = marks.find((x) => x[0] === e.target);
          if (e.isIntersecting) { active = m[1]; m[1].setAttribute('aria-current', 'true'); }
          else { m[1].removeAttribute('aria-current'); if (active === m[1]) active = null; }
        });
        if (!nav.matches(':hover') && !nav.contains(document.activeElement)) rest();
      }, { rootMargin: '-50% 0px -50% 0px' });
      marks.forEach((m) => io.observe(m[0]));
    }
  }

  /* ---- the menu under 1024: the capsule opens in place into its own card (MV:hd8). Escape, a link, a click outside or
     tabbing past its end all close it; from the keyboard the focus goes in with it ---- */
  const menu = document.getElementById('menu');
  const openBtn = document.querySelector('.hd-menu');
  if (menu && openBtn && hd) {
    const label = openBtn.querySelector('span');
    const inMenu = [...menu.querySelectorAll('a')];
    menu.querySelectorAll('.menu-nav a').forEach((a, i) => a.style.setProperty('--i', i));
    const setMenu = (open, keyboard) => {
      menuOpen = open;
      hd.classList.toggle('menu-open', open);
      openBtn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'סגירה' : 'תפריט';
      menu.inert = !open;
      root.classList.toggle('lock', open);
      if (open && keyboard) setTimeout(() => inMenu[0].focus({ preventScroll: true }), 120);
      onScroll();
    };
    setMenu(false);
    openBtn.addEventListener('click', (e) => setMenu(!menuOpen, e.detail === 0));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('click', (e) => { if (menuOpen && !hd.contains(e.target)) setMenu(false); });
    hd.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOpen) { setMenu(false); openBtn.focus(); }
    });
    let tabbing = false;
    hd.addEventListener('keydown', (e) => { if (e.key === 'Tab') { tabbing = true; setTimeout(() => { tabbing = false; }, 0); } });
    hd.addEventListener('focusout', (e) => {
      if (!menuOpen) return;
      const to = e.relatedTarget;
      if (to ? !hd.contains(to) : tabbing) setMenu(false);
    });
    // a tablet turned on its side has the links in the bar and no menu to leave open
    matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches && menuOpen) setMenu(false); });
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
  document.querySelectorAll('.rv-img, .more').forEach((el) => near.observe(el));

  /* ---- more projects: a row to swipe, and two arrows that move it one picture at a time. The page reads right to
     left, so "next" is to the left and scrollLeft runs negative ---- */
  const more = document.querySelector('.more');
  const moreNav = document.querySelector('.more-nav');
  if (more && moreNav) {
    const [back, next] = moreNav.children;
    const sync = () => {
      const max = more.scrollWidth - more.clientWidth, at = Math.abs(more.scrollLeft);
      moreNav.hidden = max < 2;
      back.setAttribute('aria-disabled', at < 2);
      next.setAttribute('aria-disabled', at > max - 2);
    };
    const step = (dir) => {
      const [a, b] = more.children;
      more.scrollBy({ left: dir * Math.abs(a.offsetLeft - b.offsetLeft), behavior: quiet() ? 'auto' : 'smooth' });
    };
    back.addEventListener('click', () => step(1));
    next.addEventListener('click', () => step(-1));
    more.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    sync();
  }

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
