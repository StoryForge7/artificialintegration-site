// Workstation home page: WebGL orb with orbiting tool ring, scripted call list,
// scroll-driven 3D app window, signal point-field, funnel staircase.
// No dependencies beyond orb.js. Every section degrades to static content.
import { createOrb } from './orb.js?v=92656b2d';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowPower = window.matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Run fn(visible) whenever el enters/leaves the viewport or the tab is hidden.
function whileVisible(el, fn) {
  let vis = false;
  const sync = () => fn(vis && !document.hidden);
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; sync(); }).observe(el);
  document.addEventListener('visibilitychange', sync);
}

// rAF-throttled scroll handler.
function onScrollFrame(fn) {
  let q = false;
  const run = () => { q = false; fn(); };
  window.addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(run); } }, { passive: true });
  window.addEventListener('resize', fn);
  fn();
}

/* ---------- 1. Orb + orbit ring ---------- */
const stage = document.querySelector('.hero-stage');
const canvas = document.getElementById('orb');
let orb = null;
if (canvas && !reduce) {
  try { orb = createOrb(canvas, { lowPower }); } catch (e) { console.warn('[ws] orb init failed', e); }
}
let px = 0, py = 0; // pointer, -1..1
window.addEventListener('pointermove', e => {
  px = (e.clientX / window.innerWidth) * 2 - 1; py = (e.clientY / window.innerHeight) * 2 - 1;
  orb?.setPointer(px, py);
}, { passive: true });

if (orb) {
  stage.classList.add('has-webgl');
  orb.setAmp(0.2);
  whileVisible(canvas, on => (on ? orb.start() : orb.stop()));
}

const chips = [...document.querySelectorAll('.orbit .oc')];
if (stage && chips.length) {
  let w = stage.clientWidth, h = stage.clientHeight;
  new ResizeObserver(() => { w = stage.clientWidth; h = stage.clientHeight; }).observe(stage);
  const n = chips.length;
  let raf = 0, t0 = performance.now(), tilt = 0;

  const place = now => {
    const t = reduce ? 0 : (now - t0) / 1000;
    tilt += ((0.30 + py * 0.10) - tilt) * 0.06;           // ring tilt eases toward pointer
    const rx = w * (w < 480 ? 0.40 : 0.47), ry = h * tilt, yOff = -h * 0.02;
    const spin = t * 0.16 + px * 0.25;
    for (let i = 0; i < n; i++) {
      const a = spin + (i / n) * Math.PI * 2;
      const depth = Math.sin(a);                           // +1 nearest the viewer
      const x = Math.cos(a) * rx, y = depth * ry + yOff;
      const s = 0.72 + 0.28 * (depth + 1) / 2;
      const el = chips[i];
      el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
      el.style.opacity = (0.35 + 0.65 * (depth + 1) / 2).toFixed(2);
      el.classList.toggle('front', depth > 0);
    }
  };
  const frame = now => { raf = requestAnimationFrame(frame); place(now); };
  if (reduce) place(0);
  else whileVisible(stage, on => { cancelAnimationFrame(raf); if (on) raf = requestAnimationFrame(frame); });
}

/* ---------- 2. Hero call list: lines tick on in sequence, loop ---------- */
const planLines = [...document.querySelectorAll('.plan-lines .pl')];
const planCount = document.querySelector('[data-plan-count]');
if (planLines.length) {
  const total = planLines.length;
  const show = k => {
    planLines.forEach((li, i) => li.classList.toggle('on', i < k));
    if (planCount) planCount.textContent = `${k} of ${total}`;
  };
  if (reduce) show(total);
  else {
    let running = false, visible = false;
    const loop = async () => {
      if (running) return; running = true;
      while (visible) {
        show(0); await sleep(500);
        for (let k = 1; k <= total && visible; k++) {
          show(k);
          if (orb) { orb.setAmp(0.75); setTimeout(() => orb.setAmp(0.2), 380); }
          await sleep(900);
        }
        await sleep(5200);
      }
      running = false;
    };
    whileVisible(document.querySelector('.plan-card'), on => { visible = on; if (on) loop(); });
  }
}

/* ---------- 3. Story: steps drive the sticky 3D app window ---------- */
const win = document.querySelector('.appwin');
const steps = document.querySelectorAll('#day .story-step');
if (win && steps.length) {
  const dots = document.querySelectorAll('#day .story-dots i');
  const setStep = n => {
    win.dataset.step = n;
    steps.forEach(s => s.classList.toggle('active', s.dataset.step === n));
    dots.forEach((d, i) => d.classList.toggle('on', String(i + 1) === n));
  };
  setStep('1');
  // On narrow screens the window is pinned at the top, so the reading line sits lower.
  const narrow = window.matchMedia('(max-width: 960px)').matches;
  const sio = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) setStep(e.target.dataset.step); });
  }, { rootMargin: narrow ? '-62% 0px -30% 0px' : '-45% 0px -45% 0px' });
  steps.forEach(s => sio.observe(s));
}

/* ---------- 4. Signals: rotating 3D point field with pings ---------- */
const sig = document.getElementById('signals');
const feed = [...document.querySelectorAll('.sig-feed .sf')];
if (sig) {
  const ctx = sig.getContext('2d');
  const N = lowPower ? 380 : 720;
  // Points on a slightly squashed sphere shell (Fibonacci lattice), jittered.
  const pts = Array.from({ length: N }, (_, i) => {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996323;
    const j = 0.92 + Math.random() * 0.16;
    return { x: Math.cos(a) * r * j, y: y * 0.9 * j, z: Math.sin(a) * r * j };
  });
  const pings = []; // { i, t0 }
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
    W = sig.clientWidth; H = sig.clientHeight;
    sig.width = Math.round(W * dpr); sig.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  new ResizeObserver(resize).observe(sig); resize();

  let raf = 0, t0 = performance.now(), lastPing = 0, feedIdx = 0;
  const draw = now => {
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    const R = Math.min(W, H) * 0.40, cx = W / 2, cy = H / 2;
    const ay = t * 0.18 + px * 0.4, ax = 0.35 + py * 0.15;
    const cy_ = Math.cos(ay), sy = Math.sin(ay), cx_ = Math.cos(ax), sx = Math.sin(ax);
    const proj = p => {
      const x1 = p.x * cy_ - p.z * sy, z1 = p.x * sy + p.z * cy_;
      const y2 = p.y * cx_ - z1 * sx, z2 = p.y * sx + z1 * cx_;
      const f = 2.6 / (2.6 - z2);
      return { X: cx + x1 * R * f, Y: cy + y2 * R * f, z: z2, f };
    };
    for (let i = 0; i < N; i++) {
      const q = proj(pts[i]);
      const k = (q.z + 1) / 2;                              // 0 back .. 1 front
      ctx.fillStyle = `rgba(250,250,247,${(0.10 + k * 0.55).toFixed(3)})`;
      const s = (0.6 + k * 1.3) * q.f;
      ctx.fillRect(q.X - s / 2, q.Y - s / 2, s, s);
    }
    // New ping every ~1.6 s on a front-facing point; advances the DOM feed.
    if (!reduce && now - lastPing > 1600) {
      lastPing = now;
      let i = 0, tries = 0;
      do { i = (Math.random() * N) | 0; tries++; } while (proj(pts[i]).z < 0.2 && tries < 40);
      pings.push({ i, t0: now });
      if (feed.length) {
        if (feedIdx < feed.length) feed[feedIdx++].classList.add('on');
        else { // rolling feed: oldest card leaves the top and re-enters at the bottom
          const box = feed[0].parentNode, first = box.firstElementChild;
          first.classList.remove('on'); box.appendChild(first);
          void first.offsetWidth; first.classList.add('on');
        }
      }
    }
    for (let k = pings.length - 1; k >= 0; k--) {
      const pg = pings[k], age = (now - pg.t0) / 1000;
      if (age > 2.4) { pings.splice(k, 1); continue; }
      const q = proj(pts[pg.i]);
      const a = Math.max(0, 1 - age / 2.4);
      ctx.strokeStyle = `rgba(227,107,63,${(a * 0.9).toFixed(3)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(q.X, q.Y, 4 + age * 26, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(240,138,93,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(q.X, q.Y, 3.5, 0, Math.PI * 2); ctx.fill();
      // thin line from the signal toward the feed (bottom-right)
      ctx.strokeStyle = `rgba(227,107,63,${(a * 0.35).toFixed(3)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(q.X, q.Y); ctx.lineTo(W * 0.92, H * 0.78); ctx.stroke();
    }
  };
  const frame = now => { raf = requestAnimationFrame(frame); draw(now); };
  if (reduce) { draw(performance.now()); feed.forEach(f => f.classList.add('on')); }
  else whileVisible(sig, on => { cancelAnimationFrame(raf); if (on) raf = requestAnimationFrame(frame); });
} else feed.forEach(f => f.classList.add('on'));

/* ---------- 5. Funnel staircase: spreads with scroll progress ---------- */
const stair = document.querySelector('.stair');
if (stair && !reduce) {
  onScrollFrame(() => {
    const r = stair.getBoundingClientRect(), vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)));
    stair.style.setProperty('--p', (1 - Math.pow(1 - p, 3)).toFixed(3)); // ease-out
  });
} else if (stair) stair.style.setProperty('--p', '1');
