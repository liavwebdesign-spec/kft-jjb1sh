/* KFT · "your turn" (the meeting of 3.11.2026): one picture in layers with the words behind its beams, like the clock on a locked
   phone. The picture holds still and only the words drift. It rises as a window on the white, opens to the whole screen
   and closes again on the white, where "from your chair" starts. Without GSAP, with reduced motion or with "stop animations"
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
    const S = { inset: 1, y: 0 };
    const paint = () => {
      frame.style.setProperty('--t-in', S.inset.toFixed(4));
      frame.style.setProperty('--t-y', S.y.toFixed(4));
      // the header reads the sky once the picture has reached the top of the screen
      theme(S.inset < 0.1 ? 'night' : 'paper');
    };
    // about one screen on the way in, one and a half whole, a little under one on the way out
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: paint });
    tl.to(S, { y: 1, duration: 3 }, 0)
      .to(S, { inset: 0, duration: 1, ease: 'power2.inOut' }, 0)
      .to(S, { inset: 1, duration: 0.7, ease: 'power2.inOut' }, 2.3);
    const st = ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom bottom', scrub: 0.6, animation: tl });
    paint();
    ScrollTrigger.refresh();
    return () => {
      st.kill();
      tl.kill();
      sec.classList.remove('t-live');
      frame.style.removeProperty('--t-in');
      frame.style.removeProperty('--t-y');
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
