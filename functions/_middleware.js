// Cloudflare Pages middleware: password gate for the whole site.
//
// Config (Cloudflare dashboard → Pages project → Settings → Variables and Secrets, type "Secret"):
//   SITE_PASSWORD  the shared password. Changing it signs everyone out.
// Fails closed: if SITE_PASSWORD is missing, every page returns 503.
//   GATE_OPEN      optional, plain variable. Exactly "1" turns the gate off (site public, still noindex).
//                  Any other value or unset = gate on. Pages applies variable changes on the next deployment.
// To remove the gate later, delete this file (or the whole functions/ folder) and push.

const COOKIE = '__Host-ai_gate';
const MAX_AGE = 60 * 60 * 24 * 30;                  // 30 days
const LOGIN = '/__login';
// Served without a session so the login page can be styled. Nothing sensitive lives here.
const PUBLIC = [/^\/assets\//, /^\/logos\//, /^\/robots\.txt$/];

const enc = new TextEncoder();

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time compare of two strings via HMAC digests (equal length, no early exit).
async function safeEqual(a, b) {
  const k = 'cmp';
  const [x, y] = await Promise.all([hmac(k, a), hmac(k, b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

// Session token: "<expiry>.<hmac(password, 'gate:'+expiry)>"
async function makeToken(pw) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  return `${exp}.${await hmac(pw, 'gate:' + exp)}`;
}
async function validToken(pw, token) {
  const m = /^(\d{10})\.([0-9a-f]{64})$/.exec(token || '');
  if (!m || Number(m[1]) < Date.now() / 1000) return false;
  return safeEqual(m[2], await hmac(pw, 'gate:' + m[1]));
}

function readCookie(req, name) {
  const h = req.headers.get('Cookie') || '';
  for (const part of h.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return null;
}

// Only same-site absolute paths; anything else falls back to "/".
function safeNext(v) {
  return typeof v === 'string' && /^\/(?!\/)[^\s\\]*$/.test(v) && !v.startsWith(LOGIN) ? v : '/';
}

const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function loginPage(next, failed, status = 200) {
  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Private preview · Artificial Integration</title>
<link rel="icon" type="image/png" href="/logos/ai-logo-192.png">
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="stylesheet" href="/assets/css/gate.css">
</head>
<body class="gate">
<main class="gate-card">
  <img src="/logos/ai-logo-192.png" alt="Artificial Integration" width="56" height="56">
  <span class="eyebrow">Private preview</span>
  <h1>Workstation<span class="dot">.</span></h1>
  <p class="muted">Enter the password to continue.</p>
  <form method="post" action="${LOGIN}">
    <input type="hidden" name="next" value="${esc(next)}">
    <label for="pw" class="skip">Password</label>
    <input id="pw" name="password" type="password" autocomplete="current-password" placeholder="Password" required autofocus>
    ${failed ? '<p class="gate-err" role="alert">That password isn\'t right.</p>' : ''}
    <button class="btn glow" type="submit">Enter <span class="arrow">→</span></button>
  </form>
  <p class="gate-foot"><a href="mailto:hello@artificialintegration.io">hello@artificialintegration.io</a></p>
</main>
</body>
</html>`;
  return new Response(html, { status, headers: noStore({ 'Content-Type': 'text/html; charset=utf-8' }) });
}

function noStore(h = {}) {
  return { ...h, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
}

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  const url = new URL(request.url);
  const path = url.pathname;

  // Never serve source of the gate itself or build tooling as static files.
  if (path.startsWith('/functions/') || path.startsWith('/tools/')) return new Response('Not found', { status: 404 });

  // Temporary public mode (e.g. partner review). Strict "1" so a typo keeps the gate on.
  if (env.GATE_OPEN === '1') {
    if (path === LOGIN || path === '/__logout') return new Response(null, { status: 303, headers: noStore({ Location: '/' }) });
    const res = await next();
    const out = new Response(res.body, res);
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');   // keep it out of search while open
    return out;
  }

  const pw = env.SITE_PASSWORD;
  if (!pw) {
    console.error('[gate] SITE_PASSWORD is not set; refusing to serve');
    return new Response('Site not configured', { status: 503, headers: noStore() });
  }

  if (PUBLIC.some(re => re.test(path))) return next();

  if (path === LOGIN) {
    if (request.method === 'POST') {
      let form;
      try { form = await request.formData(); } catch { return loginPage('/', true, 400); }
      const nextPath = safeNext(form.get('next'));
      const given = String(form.get('password') || '');
      if (given && await safeEqual(given, pw)) {
        return new Response(null, {
          status: 303,
          headers: noStore({
            Location: nextPath,
            'Set-Cookie': `${COOKIE}=${await makeToken(pw)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
          }),
        });
      }
      console.warn('[gate] failed login', request.headers.get('CF-Connecting-IP') || '');
      await new Promise(r => setTimeout(r, 600));        // slow down guessing
      return loginPage(nextPath, true, 401);
    }
    return loginPage(safeNext(url.searchParams.get('next')), false);
  }

  if (path === '/__logout') {
    return new Response(null, { status: 303, headers: noStore({ Location: LOGIN, 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` }) });
  }

  if (await validToken(pw, readCookie(request, COOKIE))) {
    const res = await next();
    // Authenticated pages must not be cached by shared caches or indexed while private.
    const out = new Response(res.body, res);
    out.headers.set('Cache-Control', 'private, no-store');
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return out;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Unauthorised', { status: 401, headers: noStore() });
  return new Response(null, { status: 302, headers: noStore({ Location: `${LOGIN}?next=${encodeURIComponent(path + url.search)}` }) });
}
