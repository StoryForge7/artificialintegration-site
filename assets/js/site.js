// Shared behaviour for every page. No dependencies.
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveal: [data-reveal] fades/rises in once. Optional data-delay (ms).
  const els = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const d = parseInt(e.target.dataset.delay || '0', 10);
        e.target.style.transitionDelay = d ? d + 'ms' : '';
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    els.forEach(el => io.observe(el));
  }

  // Header: dark variant while a [data-header-dark] section sits under it.
  const header = document.querySelector('.site-header');
  const darks = document.querySelectorAll('[data-header-dark]');
  if (header && darks.length) {
    // Dark when the section under the header's bottom edge is dark. Checked on scroll (cheap: a few rects).
    const check = () => {
      const y = header.offsetHeight;
      let dark = false;
      darks.forEach(d => { const r = d.getBoundingClientRect(); if (r.top <= y && r.bottom > y) dark = true; });
      header.classList.toggle('is-dark', dark);
    };
    let q = false;
    window.addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(() => { q = false; check(); }); } }, { passive: true });
    window.addEventListener('resize', check);
    check();
  }
  // Header: elevation once scrolled.
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // Count-up numbers: <span data-count="99" data-prefix="£">.
  const counters = document.querySelectorAll('[data-count]');
  const fmt = el => (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || '');
  if (reduce || !('IntersectionObserver' in window)) {
    counters.forEach(el => { el.textContent = fmt(el); });
  } else {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target, end = parseFloat(el.dataset.count), dur = 1200, t0 = performance.now();
        const tick = now => {
          const k = Math.min(1, (now - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
          el.textContent = (el.dataset.prefix || '') + v + (el.dataset.suffix || '');
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick); cio.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(el => cio.observe(el));
  }

  // Pointer tilt: [data-tilt] (fine pointers only).
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(el => {
      const max = parseFloat(el.dataset.tilt || '6');
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--rx', (-y * max).toFixed(2) + 'deg');
        el.style.setProperty('--ry', (x * max).toFixed(2) + 'deg');
        el.style.setProperty('--mx', ((x + 0.5) * 100).toFixed(1) + '%');
        el.style.setProperty('--my', ((y + 0.5) * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }
})();
