// WebGL "voice orb": raymarched noise-displaced sphere + emitted sound rings.
// No dependencies. Returns a controller, or null if WebGL is unavailable.

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;   // -1..1
uniform float uAmp;     // 0..1 speech envelope
uniform int   uSteps;

const vec3 DEEP   = vec3(0.780, 0.330, 0.160);   // shadow side: burnt orange, never black
const vec3 ACCENT = vec3(0.890, 0.420, 0.247);   // brand #E36B3F
const vec3 PEACH  = vec3(1.000, 0.760, 0.620);
const vec3 WARM   = vec3(1.000, 0.960, 0.920);

// --- noise (iq value noise) ---
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                 mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                 mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++){ s += a * noise(p); p *= 2.01; a *= 0.5; } return s; }

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float map(vec3 p){
  p.xz *= rot(uTime * 0.15 + uMouse.x * 0.6);
  p.yz *= rot(uMouse.y * 0.4);
  // low-frequency, smooth displacement: reads as liquid, not rock
  float n = fbm(p * 1.05 + vec3(0.0, uTime * 0.30, uTime * 0.18));
  float w = sin(p.y * 3.0 + uTime * 2.2) * sin(p.x * 2.5 - uTime * 1.7) * 0.5 + 0.5;
  float r = 1.0 + (n - 0.5) * 0.22 + w * uAmp * 0.10;
  return (length(p) - r) * 0.75;
}

vec3 normalAt(vec3 p){
  vec2 e = vec2(0.01, 0.0);
  return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx)));
}

void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
  vec3 ro = vec3(0.0, 0.0, 4.2);
  vec3 rd = normalize(vec3(uv, -1.9));

  float t = 0.0; float hit = 0.0; float dmin = 1e3;
  for (int i = 0; i < 96; i++){
    if (i >= uSteps) break;
    float d = map(ro + rd * t);
    dmin = min(dmin, d);
    if (d < 0.001){ hit = 1.0; break; }
    t += d;
    if (t > 6.0) break;
  }

  vec4 col = vec4(0.0);
  if (hit > 0.5){
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p);
    vec3 l = normalize(vec3(-0.6, 0.8, 0.7));
    float dif = clamp(dot(n, l), 0.0, 1.0);
    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.2);
    float spec = pow(clamp(dot(reflect(-l, n), -rd), 0.0, 1.0), 64.0);
    float spec2 = pow(clamp(dot(reflect(-normalize(vec3(0.7,0.3,0.6)), n), -rd), 0.0, 1.0), 24.0);
    float back = clamp(dot(n, normalize(vec3(0.5, -0.6, -0.4))), 0.0, 1.0);
    // Soft, luminous body: lit side peach, shadow side burnt orange, glowing rim.
    float wrap = clamp(dot(n, l) * 0.5 + 0.5, 0.0, 1.0);          // wrapped diffuse = no hard terminator
    vec3 c = mix(DEEP, ACCENT, smoothstep(0.0, 0.6, wrap));
    c = mix(c, PEACH, smoothstep(0.55, 1.0, wrap));
    c += PEACH * back * 0.25;                                       // subsurface-ish bounce
    c = mix(c, WARM, fres * (0.45 + uAmp * 0.3));                   // light rim, not a dark halo
    c += WARM * spec * 0.9 + PEACH * spec2 * 0.3;
    col = vec4(c, 1.0);
  } else {
    // sound rings + glow, drawn where the ray misses. R = projected orb radius in uv.
    const float R = 0.47;
    float r = length(uv);
    float edge = smoothstep(1.0, 0.72, r);           // fade to 0 before canvas edge
    float a = 0.0;
    for (int k = 0; k < 3; k++){
      float ph = fract(uTime * 0.25 + float(k) / 3.0);
      float rr = R * (1.08 + ph * 0.95);
      float ring = smoothstep(0.006, 0.0, abs(r - rr));
      a += ring * (1.0 - ph) * (0.35 + uAmp * 0.65);
    }
    float glow = exp(-max(r - R, 0.0) * 7.0) * (0.30 + uAmp * 0.35);
    float fringe = smoothstep(0.035, 0.0, dmin) * 0.9;   // soft silhouette, hides aliasing
    a = clamp((a * 0.6 + glow) * edge + fringe, 0.0, 1.0);
    col = vec4(ACCENT * a, a); // premultiplied
  }
  gl_FragColor = col;
}`;

export function createOrb(canvas, { lowPower = false } = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[orb] shader:', gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('[orb] link:', gl.getProgramInfoLog(prog)); return null; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW); // single full-screen triangle
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = name => gl.getUniformLocation(prog, name);
  const uRes = u('uRes'), uTime = u('uTime'), uMouse = u('uMouse'), uAmp = u('uAmp'), uSteps = u('uSteps');
  gl.uniform1i(uSteps, lowPower ? 48 : 80);

  // Cap pixel count: shader cost scales with fragments.
  const maxDpr = lowPower ? 1 : 1.5;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    gl.uniform2f(uRes, w, h);
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  let running = false, raf = 0, t0 = performance.now();
  let amp = 0, ampTarget = 0.15, mx = 0, my = 0, tmx = 0, tmy = 0;

  const frame = now => {
    raf = requestAnimationFrame(frame);
    amp += (ampTarget - amp) * 0.12;
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    gl.uniform1f(uTime, (now - t0) / 1000);
    gl.uniform1f(uAmp, amp);
    gl.uniform2f(uMouse, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); stop(); canvas.dataset.lost = '1'; });

  function start(){ if (!running){ running = true; raf = requestAnimationFrame(frame); } }
  function stop(){ running = false; cancelAnimationFrame(raf); }

  return {
    start, stop,
    setAmp(v){ ampTarget = Math.max(0, Math.min(1, v)); },
    setPointer(x, y){ tmx = x; tmy = y; },
    destroy(){ stop(); ro.disconnect(); gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}
