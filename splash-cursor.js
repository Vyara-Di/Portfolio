/* =====================================================================
   Splash cursor — vanilla JS port of the React Bits SplashCursor
   (WebGL2 fluid simulation: pointer drops ink and momentum into a
   full-screen velocity/dye field; clicks burst).

   Same shaders and solver as the component; React hooks replaced by a
   plain start()/stop() pair. Props are in OPTS below — these are the
   ones you chose:  rainbow off · size 2.1 · force 0.45 · swirl 0 ·
   trail 1.15 · colorSpeed 0.55 · momentum 2.4 · shading 1 · glow 0 ·
   quality high · clickSplash · intro.

   It is a fixed, pointer-events:none overlay, so it never blocks clicks.
   ===================================================================== */
(function(){
  'use strict';
  if (window.__splashCursor) return;
  window.__splashCursor = true;

  /* ---- your props ---- */
  const OPTS = {
    colors: ['#4f8cff', '#2dd4bf', '#ffd166'],   // component default palette
    rainbow: false,
    colorSpeed: 0.55,
    intensity: 1,
    size: 2.1,
    force: 0.45,
    swirl: 0,
    trail: 1.15,
    momentum: 2.4,
    shading: 1,
    glow: 0,
    quality: 'high',
    clickSplash: true,
    intro: true,
    contained: false,
    theme: 'dark',
    zIndex: 50
  };

  const QUALITY = {
    low: { sim: 64, dye: 512, iterations: 10 },
    medium: { sim: 96, dye: 1024, iterations: 16 },
    high: { sim: 128, dye: 1440, iterations: 20 }
  };
  const BLOOM_RESOLUTION = 256, BLOOM_ITERATIONS = 4, BLOOM_THRESHOLD = 0.3, BLOOM_KNEE = 0.7;

  const bail = why => console.info('[splash] not starting: ' + why);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return bail('reduced motion is on');

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const parseColor = value => {
    let hex = String(value).replace('#', '').trim();
    if (hex.length === 3) hex = [...hex].map(c => c + c).join('');
    const n = parseInt(hex.slice(0, 6), 16);
    if (Number.isNaN(n)) return [1, 1, 1];
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const hsv = (h, s, v) => {
    const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    const k = ((i % 6) + 6) % 6;
    if (k === 0) return [v, t, p]; if (k === 1) return [q, v, p]; if (k === 2) return [p, v, t];
    if (k === 3) return [p, q, v]; if (k === 4) return [t, p, v]; return [v, p, q];
  };

  const S = {
    palette: (Array.isArray(OPTS.colors) && OPTS.colors.length ? OPTS.colors : ['#ffffff']).map(parseColor),
    rainbow: OPTS.rainbow,
    colorSpeed: Math.max(0, OPTS.colorSpeed),
    intensity: Math.max(0, OPTS.intensity),
    size: Math.max(0.05, OPTS.size),
    force: Math.max(0, OPTS.force),
    swirl: Math.max(0, OPTS.swirl),
    trail: Math.max(0.05, OPTS.trail),
    momentum: Math.max(0.05, OPTS.momentum),
    shading: clamp(OPTS.shading, 0, 1),
    glow: clamp(OPTS.glow, 0, 1),
    quality: QUALITY[OPTS.quality] ? OPTS.quality : 'high',
    clickSplash: OPTS.clickSplash,
    contained: OPTS.contained,
    light: OPTS.theme === 'light'
  };

  /* ---- shaders ---- */
  const VERTEX = `#version 300 es
precision highp float;
in vec2 aPosition;
uniform vec2 texelSize;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

  const HEADER = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 outColor;
`;

  const SHADERS = {
    copy: `uniform sampler2D uTexture;
void main() {
  outColor = texture(uTexture, vUv);
}`,
    clear: `uniform sampler2D uTexture;
uniform float value;
void main() {
  outColor = value * texture(uTexture, vUv);
}`,
    splat: `uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 pointA;
uniform vec2 pointB;
uniform float radius;
void main() {
  vec2 scale = vec2(aspectRatio, 1.0);
  vec2 pa = (vUv - pointA) * scale;
  vec2 ba = (pointB - pointA) * scale;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-9), 0.0, 1.0);
  vec2 d = pa - ba * h;
  vec3 base = texture(uTarget, vUv).xyz;
  outColor = vec4(base + exp(-dot(d, d) / radius) * color, 1.0);
}`,
    burst: `uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec2 point;
uniform float radius;
uniform float strength;
uniform float seed;
void main() {
  vec2 d = (vUv - point) * vec2(aspectRatio, 1.0);
  float distance = length(d);
  vec2 direction = d / max(distance, 0.00001);
  float angle = atan(d.y, d.x);
  float petals = 0.78 + 0.22 * sin(angle * 5.0 + seed) * sin(angle * 3.0 - seed * 1.7);
  vec2 twist = vec2(-direction.y, direction.x) * 0.3 * sin(angle * 4.0 + seed * 2.3);
  float falloff = exp(-dot(d, d) / radius) * distance / sqrt(radius);
  outColor = vec4(texture(uTarget, vUv).xy + (direction * petals + twist) * falloff * strength, 0.0, 1.0);
}`,
    crown: `uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec2 point;
uniform float radius;
uniform vec3 colorA;
uniform vec3 colorB;
uniform float seed;
void main() {
  vec2 d = (vUv - point) * vec2(aspectRatio, 1.0);
  vec3 ink = exp(-dot(d, d) / (radius * 0.45)) * colorA;
  for (int i = 0; i < 7; i++) {
    float index = float(i);
    float angle = seed + index * 0.8975979 + sin(seed * 3.0 + index * 1.9) * 0.35;
    float reach = sqrt(radius) * (0.75 + 0.45 * fract(sin(seed * 7.1 + index * 3.7) * 43.7));
    float drop = radius * (0.08 + 0.12 * fract(sin(seed * 2.9 + index * 5.3) * 31.9));
    vec2 q = d - vec2(cos(angle), sin(angle)) * reach;
    ink += exp(-dot(q, q) / drop) * mix(colorA, colorB, fract(index * 0.37 + 0.2));
  }
  outColor = vec4(texture(uTarget, vUv).xyz + ink, 1.0);
}`,
    advection: `uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main() {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
  outColor = texture(uSource, coord) / (1.0 + dissipation * dt);
}`,
    divergence: `uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x;
  if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y;
  if (vB.y < 0.0) B = -C.y;
  outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
    curl: `uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
    vorticity: `uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main() {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture(uVelocity, vUv).xy + force * dt;
  outColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);
}`,
    pressure: `uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  outColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
}`,
    gradient: `uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy - vec2(R - L, T - B);
  outColor = vec4(velocity, 0.0, 1.0);
}`,
    prefilter: `uniform sampler2D uTexture;
uniform vec3 curve;
uniform float threshold;
void main() {
  vec3 c = texture(uTexture, vUv).rgb;
  float br = max(c.r, max(c.g, c.b));
  float rq = clamp(br - curve.x, 0.0, curve.y);
  rq = curve.z * rq * rq;
  c *= max(rq, br - threshold) / max(br, 0.0001);
  outColor = vec4(c, 0.0);
}`,
    blur: `uniform sampler2D uTexture;
uniform float intensity;
void main() {
  vec4 sum = texture(uTexture, vL) + texture(uTexture, vR) + texture(uTexture, vT) + texture(uTexture, vB);
  outColor = sum * 0.25 * intensity;
}`,
    display: `uniform sampler2D uTexture;
uniform sampler2D uBloom;
uniform vec2 texelSize;
uniform float shading;
uniform float bloom;
uniform float light;
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
void main() {
  vec3 c = texture(uTexture, vUv).rgb;
  if (shading > 0.0) {
    float dx = length(texture(uTexture, vR).rgb) - length(texture(uTexture, vL).rgb);
    float dy = length(texture(uTexture, vT).rgb) - length(texture(uTexture, vB).rgb);
    vec3 n = normalize(vec3(dx, dy, length(texelSize)));
    c *= mix(1.0, clamp(n.z + 0.7, 0.7, 1.0), shading);
  }
  if (bloom > 0.0) {
    c += max(texture(uBloom, vUv).rgb, 0.0) * bloom;
  }
  c = max(c, 0.0);
  float peak = max(c.r, max(c.g, c.b));
  float grain = (hash(gl_FragCoord.xy) - 0.5) / 255.0 * smoothstep(0.0, 0.03, peak);
  if (light > 0.5) {
    vec3 transmit = exp(-2.4 * c);
    float low = min(transmit.r, min(transmit.g, transmit.b));
    float alpha = clamp(1.0 - low + grain, 0.0, 1.0);
    outColor = vec4(min(transmit - low, vec3(alpha)), alpha);
  } else {
    c = max(c + grain, 0.0);
    float alpha = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
    outColor = vec4(min(c, vec3(alpha)), alpha);
  }
}`
  };

  /* ---- DOM: fixed full-screen, click-through ---- */
  const css = document.createElement('style');
  css.textContent = '.splash-cursor{position:fixed;inset:0;pointer-events:none}' +
                    '.splash-cursor[data-contained]{position:absolute}' +
                    '.splash-cursor__canvas{display:block;width:100%;height:100%}';
  document.head.appendChild(css);
  const root = document.createElement('div');
  root.className = 'splash-cursor';
  root.style.zIndex = String(OPTS.zIndex);
  root.setAttribute('aria-hidden', 'true');
  if (OPTS.contained) root.setAttribute('data-contained', '');
  const canvas = document.createElement('canvas');
  canvas.className = 'splash-cursor__canvas';
  root.appendChild(canvas);
  document.body.appendChild(root);

  let introPending = OPTS.intro;     // the opening sweep plays once, after the site's own intro has finished
  let stop = null;

  /* the site has its own loader / page curtain — wait for it so the sweep isn't hidden underneath */
  function siteReady(){
    const i = document.querySelector('.intro');
    if (i){ const cs = getComputedStyle(i); if (cs.display !== 'none' && parseFloat(cs.opacity) > 0.05) return false; }
    const pt = document.querySelector('.pt');
    if (pt && getComputedStyle(pt).display !== 'none' && !document.documentElement.classList.contains('pt-done')) return false;
    return true;
  }

  function start(){
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
    if (!gl){ bail('WebGL2 unavailable in this browser'); return null; }
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('EXT_color_buffer_half_float');

    const renderable = (internal, format) => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, 4, 4, 0, format, gl.HALF_FLOAT, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fbo); gl.deleteTexture(texture);
      return complete;
    };
    const rgba = { internal: gl.RGBA16F, format: gl.RGBA };
    if (!renderable(rgba.internal, rgba.format)){ bail('float render targets unsupported on this GPU'); return null; }
    const rg = renderable(gl.RG16F, gl.RG) ? { internal: gl.RG16F, format: gl.RG } : rgba;
    const r = renderable(gl.R16F, gl.RED) ? { internal: gl.R16F, format: gl.RED } : rg;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.warn('[splash] shader', gl.getShaderInfoLog(shader));
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    const programs = {};
    let broken = false;
    Object.entries(SHADERS).forEach(([name, body]) => {
      const fragment = compile(gl.FRAGMENT_SHADER, HEADER + body);
      const program = gl.createProgram();
      gl.attachShader(program, vertex); gl.attachShader(program, fragment);
      gl.bindAttribLocation(program, 0, 'aPosition');
      gl.linkProgram(program); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)){ broken = true; console.warn('[splash] link ' + name, gl.getProgramInfoLog(program)); }
      const uniforms = {};
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++){ const info = gl.getActiveUniform(program, i); if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name); }
      programs[name] = { program, uniforms };
    });
    gl.deleteShader(vertex);

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const targets = new Set();
    let disposed = false, lost = false;

    const release = () => {
      if (gl.isContextLost()) return;
      targets.forEach(t => { gl.deleteFramebuffer(t.fbo); gl.deleteTexture(t.texture); });
      targets.clear();
      Object.values(programs).forEach(item => gl.deleteProgram(item.program));
      gl.deleteBuffer(buffer); gl.deleteVertexArray(vao);
    };
    if (broken){ release(); bail('shader failed to link (see warning above)'); return null; }

    const use = name => { const item = programs[name]; gl.useProgram(item.program); return item.uniforms; };

    const blit = target => {
      if (target){ gl.viewport(0, 0, target.width, target.height); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
      else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const createTarget = (width, height, format, filter) => {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, format.internal, width, height, 0, format.format, gl.HALF_FLOAT, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const target = {
        texture, fbo, width, height, texelX: 1 / width, texelY: 1 / height,
        attach: unit => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture); return unit; }
      };
      targets.add(target);
      return target;
    };
    const destroyTarget = target => { if (!target) return; gl.deleteFramebuffer(target.fbo); gl.deleteTexture(target.texture); targets.delete(target); };
    const reshape = (target, width, height, format) => {
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, format.internal, width, height, 0, format.format, gl.HALF_FLOAT, null);
      target.width = width; target.height = height; target.texelX = 1 / width; target.texelY = 1 / height;
    };
    const createDouble = (width, height, format, filter) => {
      const pair = {
        read: createTarget(width, height, format, filter), write: createTarget(width, height, format, filter),
        width, height, texelX: 1 / width, texelY: 1 / height,
        swap: () => { const c = pair.read; pair.read = pair.write; pair.write = c; }
      };
      return pair;
    };
    const resizeDouble = (pair, width, height, format, filter, keep) => {
      if (keep){
        const next = createTarget(width, height, format, filter);
        const u = use('copy');
        gl.uniform1i(u.uTexture, pair.read.attach(0));
        blit(next);
        destroyTarget(pair.read);
        pair.read = next;
      } else reshape(pair.read, width, height, format);
      reshape(pair.write, width, height, format);
      pair.width = width; pair.height = height; pair.texelX = 1 / width; pair.texelY = 1 / height;
    };

    const resolution = base => {
      const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
      const aspect = Math.max(width, height) / Math.max(1, Math.min(width, height));
      const short = Math.round(base), long = Math.round(base * aspect);
      return width > height ? { width: long, height: short } : { width: short, height: long };
    };
    const fit = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * ratio)), height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width; canvas.height = height;
    };
    const sizes = () => {
      const q = QUALITY[S.quality];
      const shortSide = Math.min(gl.drawingBufferWidth, gl.drawingBufferHeight);
      return { sim: resolution(q.sim), ink: resolution(Math.max(q.sim, Math.min(q.dye, shortSide))) };
    };

    fit();
    const initial = sizes();
    const dye = createDouble(initial.ink.width, initial.ink.height, rgba, gl.LINEAR);
    const velocity = createDouble(initial.sim.width, initial.sim.height, rg, gl.LINEAR);
    const pressure = createDouble(initial.sim.width, initial.sim.height, r, gl.NEAREST);
    const divergence = createTarget(initial.sim.width, initial.sim.height, r, gl.NEAREST);
    const curl = createTarget(initial.sim.width, initial.sim.height, r, gl.NEAREST);
    let bloom = null, bloomChain = [];

    const dropBloom = () => { destroyTarget(bloom); bloomChain.forEach(destroyTarget); bloom = null; bloomChain = []; };
    const ensureBloom = () => {
      if (bloom) return bloom;
      const size = resolution(BLOOM_RESOLUTION);
      const created = createTarget(size.width, size.height, rgba, gl.LINEAR);
      for (let i = 0; i < BLOOM_ITERATIONS; i++){
        const w = size.width >> (i + 1), h = size.height >> (i + 1);
        if (w < 2 || h < 2) break;
        bloomChain.push(createTarget(w, h, rgba, gl.LINEAR));
      }
      bloom = created;
      return created;
    };

    const resize = () => {
      fit();
      const next = sizes();
      if (dye.width !== next.ink.width || dye.height !== next.ink.height) resizeDouble(dye, next.ink.width, next.ink.height, rgba, gl.LINEAR, true);
      if (velocity.width !== next.sim.width || velocity.height !== next.sim.height){
        resizeDouble(velocity, next.sim.width, next.sim.height, rg, gl.LINEAR, true);
        resizeDouble(pressure, next.sim.width, next.sim.height, r, gl.NEAREST, false);
        reshape(divergence, next.sim.width, next.sim.height, r);
        reshape(curl, next.sim.width, next.sim.height, r);
      }
      const glowSize = resolution(BLOOM_RESOLUTION);
      if (bloom && (bloom.width !== glowSize.width || bloom.height !== glowSize.height)) dropBloom();
    };

    const radiusFor = scale => {
      const aspect = canvas.width / canvas.height;
      return ((0.2 * S.size * scale) / 100) * (aspect > 1 ? aspect : 1);
    };

    const splat = (ax, ay, bx, by, vx, vy, color, radius) => {
      const u = use('splat');
      gl.uniform1i(u.uTarget, velocity.read.attach(0));
      gl.uniform1f(u.aspectRatio, canvas.width / canvas.height);
      gl.uniform2f(u.pointA, ax, ay); gl.uniform2f(u.pointB, bx, by);
      gl.uniform3f(u.color, vx, vy, 0); gl.uniform1f(u.radius, radius);
      blit(velocity.write); velocity.swap();
      gl.uniform1i(u.uTarget, dye.read.attach(0));
      gl.uniform3f(u.color, color[0], color[1], color[2]);
      blit(dye.write); dye.swap();
    };

    const colorAt = (offset, now) => {
      const phase = (((offset + (now / 1000) * S.colorSpeed * 0.6) % 1) + 1) % 1;
      if (S.rainbow) return hsv(phase, 1, 1);
      const palette = S.palette;
      if (palette.length === 1) return palette[0];
      const position = phase * palette.length;
      const from = palette[Math.floor(position) % palette.length], to = palette[(Math.floor(position) + 1) % palette.length];
      const t = position - Math.floor(position), blend = t * t * (3 - 2 * t);
      return [from[0] + (to[0] - from[0]) * blend, from[1] + (to[1] - from[1]) * blend, from[2] + (to[2] - from[2]) * blend];
    };
    const inkFor = (color, amount) => color.map(ch => (S.light ? 1 - ch : ch) * amount);

    const flush = (pointer, dt, now) => {
      const aspect = canvas.width / canvas.height;
      const length = Math.hypot((pointer.x - pointer.px) * aspect, pointer.y - pointer.py);
      if (length > 0.35){ pointer.px = pointer.x; pointer.py = pointer.y; return; }
      let dx = pointer.x - pointer.px, dy = pointer.y - pointer.py;
      if (aspect < 1) dx *= aspect; else dy /= aspect;
      const radius = radiusFor(1);
      const spread = 1 + length / (1.77 * Math.sqrt(radius));
      const push = (6000 * S.force) / Math.sqrt(spread);
      const amount = (0.15 * S.intensity * Math.min(dt * 60, 1)) / Math.sqrt(spread);
      const color = inkFor(colorAt(pointer.offset, now), amount);
      splat(pointer.px, pointer.py, pointer.x, pointer.y, dx * push, dy * push, color, radius);
      pointer.px = pointer.x; pointer.py = pointer.y;
    };

    const burst = (x, y, now) => {
      const seed = Math.random() * Math.PI * 2, aspect = canvas.width / canvas.height;
      let u = use('burst');
      gl.uniform1i(u.uTarget, velocity.read.attach(0));
      gl.uniform1f(u.aspectRatio, aspect); gl.uniform2f(u.point, x, y);
      gl.uniform1f(u.radius, radiusFor(3)); gl.uniform1f(u.strength, 1100 * S.force); gl.uniform1f(u.seed, seed);
      blit(velocity.write); velocity.swap();
      const offset = Math.random(), amount = 1.6 * S.intensity;
      const first = inkFor(colorAt(offset, now), amount), second = inkFor(colorAt(offset + 0.3, now), amount);
      u = use('crown');
      gl.uniform1i(u.uTarget, dye.read.attach(0));
      gl.uniform1f(u.aspectRatio, aspect); gl.uniform2f(u.point, x, y); gl.uniform1f(u.radius, radiusFor(1.6));
      gl.uniform3f(u.colorA, first[0], first[1], first[2]); gl.uniform3f(u.colorB, second[0], second[1], second[2]);
      gl.uniform1f(u.seed, seed);
      blit(dye.write); dye.swap();
    };

    const step = dt => {
      const iterations = QUALITY[S.quality].iterations;
      gl.disable(gl.BLEND);

      let u = use('curl');
      gl.uniform2f(u.texelSize, velocity.texelX, velocity.texelY);
      gl.uniform1i(u.uVelocity, velocity.read.attach(0));
      blit(curl);

      u = use('vorticity');
      gl.uniform2f(u.texelSize, velocity.texelX, velocity.texelY);
      gl.uniform1i(u.uVelocity, velocity.read.attach(0));
      gl.uniform1i(u.uCurl, curl.attach(1));
      gl.uniform1f(u.curl, S.swirl); gl.uniform1f(u.dt, dt);
      blit(velocity.write); velocity.swap();

      u = use('divergence');
      gl.uniform2f(u.texelSize, velocity.texelX, velocity.texelY);
      gl.uniform1i(u.uVelocity, velocity.read.attach(0));
      blit(divergence);

      u = use('clear');
      gl.uniform1i(u.uTexture, pressure.read.attach(0)); gl.uniform1f(u.value, 0.1);
      blit(pressure.write); pressure.swap();

      u = use('pressure');
      gl.uniform2f(u.texelSize, velocity.texelX, velocity.texelY);
      gl.uniform1i(u.uDivergence, divergence.attach(0));
      for (let i = 0; i < iterations; i++){
        gl.uniform1i(u.uPressure, pressure.read.attach(1));
        blit(pressure.write); pressure.swap();
      }

      u = use('gradient');
      gl.uniform2f(u.texelSize, velocity.texelX, velocity.texelY);
      gl.uniform1i(u.uPressure, pressure.read.attach(0));
      gl.uniform1i(u.uVelocity, velocity.read.attach(1));
      blit(velocity.write); velocity.swap();

      u = use('advection');
      gl.uniform2f(u.texelSize, velocity.texelX, velocity.texelY);
      gl.uniform1i(u.uVelocity, velocity.read.attach(0));
      gl.uniform1i(u.uSource, velocity.read.attach(0));
      gl.uniform1f(u.dt, dt); gl.uniform1f(u.dissipation, 2 / S.momentum);
      blit(velocity.write); velocity.swap();

      gl.uniform1i(u.uVelocity, velocity.read.attach(0));
      gl.uniform1i(u.uSource, dye.read.attach(1));
      gl.uniform1f(u.dissipation, 3.5 / S.trail);
      blit(dye.write); dye.swap();
    };

    const applyBloom = amount => {
      const base = ensureBloom();
      if (!bloomChain.length) return;
      gl.disable(gl.BLEND);
      let u = use('prefilter');
      const knee = BLOOM_THRESHOLD * BLOOM_KNEE + 0.0001;
      gl.uniform3f(u.curve, BLOOM_THRESHOLD - knee, knee * 2, 0.25 / knee);
      gl.uniform1f(u.threshold, BLOOM_THRESHOLD);
      gl.uniform1i(u.uTexture, dye.read.attach(0));
      blit(base);
      u = use('blur');
      gl.uniform1f(u.intensity, 1);
      let last = base;
      bloomChain.forEach(target => {
        gl.uniform2f(u.texelSize, last.texelX, last.texelY);
        gl.uniform1i(u.uTexture, last.attach(0));
        blit(target); last = target;
      });
      gl.blendFunc(gl.ONE, gl.ONE); gl.enable(gl.BLEND);
      for (let i = bloomChain.length - 2; i >= 0; i--){
        const target = bloomChain[i];
        gl.uniform2f(u.texelSize, last.texelX, last.texelY);
        gl.uniform1i(u.uTexture, last.attach(0));
        blit(target); last = target;
      }
      gl.disable(gl.BLEND);
      gl.uniform1f(u.intensity, amount);
      gl.uniform2f(u.texelSize, last.texelX, last.texelY);
      gl.uniform1i(u.uTexture, last.attach(0));
      blit(base);
    };

    const render = () => {
      if (S.glow > 0) applyBloom(2 * S.glow);
      gl.disable(gl.BLEND);
      const u = use('display');
      gl.uniform2f(u.texelSize, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
      gl.uniform1i(u.uTexture, dye.read.attach(0));
      gl.uniform1i(u.uBloom, (bloom || dye.read).attach(1));
      gl.uniform1f(u.shading, S.shading);
      gl.uniform1f(u.bloom, S.glow > 0 ? 1 : 0);
      gl.uniform1f(u.light, S.light ? 1 : 0);
      blit(null);
    };

    const clearScreen = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    };

    const pointers = new Map(), bursts = [];
    const introPointer = { x: 0, y: 0, px: 0, py: 0, ready: false, moved: false, offset: Math.random() };
    let introStart = -1, raf = 0, last = 0, lastActivity = performance.now();

    const advanceIntro = now => {
      if (introStart < 0) return;
      const progress = (now - introStart) / 1100;
      if (progress < 0) return;
      const t = Math.min(progress, 1), eased = t * t * (3 - 2 * t);
      const x = 0.2 + 0.6 * eased, y = 0.5 + 0.12 * Math.sin(eased * Math.PI * 2);
      if (!introPointer.ready){ introPointer.x = introPointer.px = x; introPointer.y = introPointer.py = y; introPointer.ready = true; }
      else { introPointer.x = x; introPointer.y = y; introPointer.moved = true; }
      if (t >= 1) introStart = -1;
      lastActivity = now;
    };

    const frame = now => {
      raf = 0;
      if (disposed || lost) return;
      const dt = clamp((now - last) / 1000, 0, 1 / 60);
      last = now;
      resize();
      advanceIntro(now);
      if (introPointer.moved){ introPointer.moved = false; flush(introPointer, dt, now); }
      pointers.forEach(p => { if (!p.moved) return; p.moved = false; flush(p, dt, now); });
      bursts.splice(0).forEach(pt => burst(pt.x, pt.y, now));
      step(dt);
      render();
      const quiet = (2.2 * S.trail + 0.4) * 1000;
      if (introStart >= 0 || now - lastActivity < quiet) raf = requestAnimationFrame(frame);
      else clearScreen();
    };

    const wake = () => {
      lastActivity = performance.now();
      if (raf || disposed || lost) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const locate = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const x = (clientX - rect.left) / rect.width, y = 1 - (clientY - rect.top) / rect.height;
      if (S.contained && (x < 0 || x > 1 || y < 0 || y > 1)) return null;
      return { x, y };
    };
    const track = (id, clientX, clientY) => {
      const point = locate(clientX, clientY);
      let pointer = pointers.get(id);
      if (!point){ if (pointer) pointer.ready = false; return; }
      if (!pointer){ pointer = { x: 0, y: 0, px: 0, py: 0, ready: false, moved: false, offset: Math.random() }; pointers.set(id, pointer); }
      if (!pointer.ready){ pointer.x = pointer.px = point.x; pointer.y = pointer.py = point.y; pointer.ready = true; return; }
      pointer.x = point.x; pointer.y = point.y; pointer.moved = true;
      wake();
    };
    const press = (clientX, clientY) => {
      if (!S.clickSplash) return;
      const point = locate(clientX, clientY);
      if (!point) return;
      bursts.push(point); wake();
    };

    const onPointerMove = e => { if (e.pointerType !== 'touch') track('p' + e.pointerId, e.clientX, e.clientY); };
    const onPointerDown = e => { if (e.pointerType !== 'touch') press(e.clientX, e.clientY); };
    const onTouchStart = e => Array.from(e.changedTouches).forEach(t => { pointers.delete('t' + t.identifier); track('t' + t.identifier, t.clientX, t.clientY); press(t.clientX, t.clientY); });
    const onTouchMove = e => Array.from(e.changedTouches).forEach(t => track('t' + t.identifier, t.clientX, t.clientY));
    const onTouchEnd = e => Array.from(e.changedTouches).forEach(t => pointers.delete('t' + t.identifier));
    const onLeave = () => pointers.forEach(p => { p.ready = false; });
    const onLost = e => { e.preventDefault(); lost = true; cancelAnimationFrame(raf); raf = 0; };
    const onRestored = () => { if (stop) stop(); stop = start(); };

    addEventListener('pointermove', onPointerMove, { passive: true });
    addEventListener('pointerdown', onPointerDown, { passive: true });
    addEventListener('touchstart', onTouchStart, { passive: true });
    addEventListener('touchmove', onTouchMove, { passive: true });
    addEventListener('touchend', onTouchEnd, { passive: true });
    addEventListener('touchcancel', onTouchEnd, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    resize();

    /* opening sweep — once, when the site's own loader has cleared */
    if (introPending){
      introPending = false;
      let tries = 0;
      const arm = () => {
        if (disposed) return;
        if (!siteReady() && tries++ < 70) return setTimeout(arm, 150);
        introStart = performance.now() + 150; wake();
      };
      arm();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onPointerMove);
      removeEventListener('pointerdown', onPointerDown);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
      removeEventListener('touchend', onTouchEnd);
      removeEventListener('touchcancel', onTouchEnd);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      release();
    };
  }

  stop = start();
  if (stop) console.info('[splash] ready — move the pointer');
})();
