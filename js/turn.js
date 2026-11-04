/* KFT · "your turn" (the meeting of 3.11.2026): one picture in layers with the words behind its beams, like the clock on a locked
   phone. The words sit still in the picture. It rises whole over the end of the process, which holds under it and only creeps up,
   stays a while and closes as a window on the white, where "from your chair" starts. Without GSAP, with reduced motion or with "stop animations"
   on it stays the same layers in a frame. */
(() => {
  const sec = document.querySelector('.turn');
  if (!sec || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const frame = sec.querySelector('.t-frame');
  const SHEET_MQ = '(max-width: 767px), (max-width: 1023px) and (orientation: portrait)';
  const theme = (t) => { if (sec.dataset.theme !== t) { sec.dataset.theme = t; document.dispatchEvent(new Event('kft:theme')); } };

  function goLive() {
    sec.classList.add('t-live');
    const S = { inset: 0 };
    const paint = () => {
      frame.style.setProperty('--t-in', S.inset.toFixed(4));
      theme(S.inset < 0.1 ? 'night' : 'paper');
    };
    // once it covers the screen: a little over one screen whole, a little under one on the way out
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: paint });
    tl.to(S, { inset: 1, duration: 0.7, ease: 'power2.inOut' }, 1.3);
    const st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: tl });
    // the screen it rises over is pinned by the page itself; this is only its slow creep, the two layers' different speeds
    const under = document.querySelector('.proc .p-stage');
    const creep = under && gsap.fromTo(under, { yPercent: 0 }, {
      yPercent: -14, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top top', scrub: true },
    });
    // nothing is cut by the rising edge: the words and buttons of the last screen leave as it starts, only the photo stays under it
    const words = document.querySelectorAll('.proc .p-tod > *');
    if (words.length) gsap.fromTo(words, { autoAlpha: 1 }, {
      autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 88%', scrub: true },
    });
    paint();
    ScrollTrigger.refresh();
    return () => {
      st.kill();
      tl.kill();
      sec.classList.remove('t-live');
      frame.style.removeProperty('--t-in');
      // gsap's matchMedia has already reverted the creep by the time this runs
      if (under) gsap.set(under, { clearProps: 'transform' });
      theme('paper');
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
