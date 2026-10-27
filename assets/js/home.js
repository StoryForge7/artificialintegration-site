// Home page: WebGL orb, scripted hero call, scroll-driven story phone, fanned cards.
import { createOrb } from './orb.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowPower = window.matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) <= 4;

/* ---------- 1. Orb ---------- */
const canvas = document.getElementById('orb');
const stage = document.querySelector('.hero-stage');
let orb = null;
if (canvas && !reduce) {
  try { orb = createOrb(canvas, { lowPower }); } catch (e) { console.warn('[orb] init failed', e); }
}
if (orb) {
  stage.classList.add('has-webgl');
  // Run only while visible and tab is active.
  let visible = true;
  const sync = () => (visible && !document.hidden ? orb.start() : orb.stop());
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pointermove', e => {
    orb.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });
}

/* ---------- 2. Hero call script ---------- */
// Lines reveal in sequence; orb "speaks" during AI lines.
const lines = [...document.querySelectorAll('.call-line')];
const summary = document.querySelector('.call-summary');
const clock = document.querySelector('[data-call-clock]');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function typeLine(li) {
  const target = li.querySelector('.txt');
  const full = target.dataset.text;
  li.classList.add('on');
  const isAi = li.classList.contains('ai');
  if (orb) orb.setAmp(isAi ? 0.85 : 0.3);
  let speak = null;
  if (orb && isAi) speak = setInterval(() => orb.setAmp(0.45 + Math.random() * 0.55), 110);
  for (let i = 1; i <= full.length; i++) { target.textContent = full.slice(0, i); await sleep(isAi ? 22 : 28); }
  clearInterval(speak);
  if (orb) orb.setAmp(0.15);
}

async function runCall() {
  if (!lines.length) return;
  lines.forEach(li => { li.querySelector('.txt').textContent = ''; li.classList.remove('on'); });
  summary?.classList.remove('on');
  let secs = 0;
  const tick = setInterval(() => { secs++; if (clock) clock.textContent = '00:' + String(secs).padStart(2, '0'); }, 1000);
  for (const li of lines) { await typeLine(li); await sleep(650); }
  clearInterval(tick);
  summary?.classList.add('on');
  await sleep(7000);
  runCall();
}

if (reduce) {
  lines.forEach(li => { li.classList.add('on'); li.querySelector('.txt').textContent = li.querySelector('.txt').dataset.text; });
  summary?.classList.add('on');
} else {
  // Start once the hero card is visible.
  const card = document.querySelector('.call-card');
  if (card) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); setTimeout(runCall, 600); } });
    io.observe(card);
  }
}

/* ---------- 3. Story: steps drive the sticky phone ---------- */
const phone = document.querySelector('.story-stage .phone');
const steps = document.querySelectorAll('.story-step');
if (phone && steps.length) {
  const setStep = n => {
    phone.dataset.step = n;
    steps.forEach(s => s.classList.toggle('active', s.dataset.step === n));
    document.querySelectorAll('.story-dots i').forEach((d, i) => d.classList.toggle('on', String(i + 1) === n));
  };
  setStep('1');
  const sio = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) setStep(e.target.dataset.step); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => sio.observe(s));
}

/* ---------- 4. Fanned notification cards: spread with scroll progress ---------- */
const fan = document.querySelector('.fan');
if (fan && !reduce) {
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = fan.getBoundingClientRect(), vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height * 0.4)));
    fan.style.setProperty('--p', p.toFixed(3));
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
} else if (fan) {
  fan.style.setProperty('--p', '1');
}
