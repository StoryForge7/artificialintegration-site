// Homepage film.
// Muted autoplay plays a ~10s silent teaser loop (about 1.7MB desktop / 0.7MB phone).
// "Watch with sound" swaps in the full 60s film with audio and controls; it only downloads then.
// When the full film ends, the teaser loop returns. Reduced motion: nothing autoplays.
// No-JS fallback: a <noscript> player with the full film and native controls. The main <video> has no src until this runs,
// so nothing downloads before we choose teaser vs full.
(() => {
  'use strict';
  const v = document.getElementById('ws-film');
  const btn = document.querySelector('.film-sound');
  if (!v || !btn) return;
  const attr = n => v.getAttribute('data-' + n); // dataset can't camelCase "-1080", so read the attributes directly
  const small = window.matchMedia('(max-width: 760px)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TEASER = attr(small ? 'teaser-720' : 'teaser-1080');
  const FULL = attr(small ? 'full-720' : 'full-1080');
  if (!TEASER || !FULL) return; // markup out of sync: leave the native player alone
  let withSound = false;
  const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); }; // autoplay can be refused; poster + button remain

  const teaserMode = () => {
    withSound = false;
    v.controls = false; v.muted = true; v.loop = true;
    v.preload = 'auto';
    v.src = TEASER; // a src attribute overrides the <source> children
    btn.hidden = false;
    if (!reduce) tryPlay();
  };

  btn.addEventListener('click', () => {
    withSound = true;
    btn.hidden = true;
    v.loop = false; v.muted = false; v.controls = true;
    v.src = FULL;
    tryPlay(); // inside the click, so audio is allowed
  });

  v.addEventListener('ended', () => { if (withSound) teaserMode(); });

  // Pause the teaser while it is off screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      if (withSound || reduce) return;
      if (e.isIntersecting) tryPlay(); else v.pause();
    }, { threshold: 0.15 }).observe(v);
  }

  teaserMode();
})();
