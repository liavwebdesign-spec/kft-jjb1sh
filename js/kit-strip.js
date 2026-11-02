/* KFT · the kitchens' strip, after MV:g65 (Liav, 2.11.2026). Without motion (reduced motion, "stop animations", no GSAP) it
   stays what the HTML is: a row to swipe, each card with its own caption. Live, the stage pins and the vertical scroll carries
   the strip sideways; the kitchen in the centre grows and sharpens and the rest recede.
   Next is always to the left, the page reads right to left, so the strip moves to a positive x. */
(() => {
  const kit = document.querySelector('.kit');
  const rail = kit && kit.querySelector('.kit-rail');
  if (!rail || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const view = kit.querySelector('.kit-view');
  const cards = [...rail.children];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let still = false;
  try { still = !!JSON.parse(localStorage.getItem('kft-a11y') || '{}').still; } catch (e) { /* private mode */ }

  let tween = null;
  const dist = () => rail.scrollWidth - view.clientWidth;

  // the falloff is measured in cards and not in half screens, or the next card is almost as large and nothing holds the eye
  const paint = () => {
    if (!tween) return; // the scrub can still tick once after the strip went back to a plain row
    const box = view.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    const unit = Math.abs(cards[1].offsetLeft - cards[0].offsetLeft) || cards[0].offsetWidth || 1;
    cards.forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = Math.min(1, Math.abs(r.left + r.width / 2 - mid) / (unit * 1.7)); // 0 in the centre, 1 about two cards away
      const f = 1 - d * d;
      // written directly: a gsap.set here can land inside another script's matchMedia during a refresh, and its revert would put these back
      el.style.transform = `scale(${(0.84 + f * 0.24).toFixed(4)})`;
      el.style.opacity = (0.5 + f * 0.5).toFixed(3);
      el.style.filter = `blur(${((1 - f) * 2.4).toFixed(2)}px)`;
      el.style.zIndex = Math.round(f * 10);
    });
  };

  const setLive = (on) => {
    if (on === !!tween) return;
    kit.classList.toggle('k-live', on);
    if (on) {
      rail.removeAttribute('tabindex'); // the page's own scroll moves it now
      rail.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
      tween = gsap.fromTo(rail, { x: () => -dist() }, {
        x: 0, ease: 'none', onUpdate: paint,
        scrollTrigger: { trigger: kit, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true, onRefresh: paint },
      });
      paint();
    } else {
      const was = tween;
      tween = null;
      was.scrollTrigger.kill();
      was.kill();
      gsap.set(rail, { clearProps: 'all' });
      cards.forEach((el) => el.removeAttribute('style'));
      rail.setAttribute('tabindex', '0');
    }
    ScrollTrigger.refresh();
  };

  const decide = () => setLive(!reduce.matches && !still);
  document.addEventListener('a11y:still', (e) => { still = !!e.detail; decide(); });
  reduce.addEventListener('change', decide);
  decide();
})();
