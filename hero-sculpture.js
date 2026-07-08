(function(){
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mount  = document.getElementById('heroSculpture');
  var hint   = document.getElementById('sculptHint');
  if (!mount) return;

  /* ---- capability gate ----------------------------------------------------
     The 3D hero is pure decoration. Skip it (and its ~600 KB download) on
     reduced-motion, data-saver, low-memory / low-core devices, or where WebGL
     is unavailable. The hero still looks complete: the radial blob + kinetic
     headline render with zero JS cost. */
  var nav = navigator;
  function webglOK(){
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e){ return false; }
  }
  var lowPower = reduce
    || (nav.connection && nav.connection.saveData)
    || (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4)
    || (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2);
  if (lowPower || !webglOK()) return;

  /* ---- load Three.js + GLTFLoader on demand, then init -------------------- */
  function loadScript(src, sri){
    return new Promise(function(resolve, reject){
      var s = document.createElement('script');
      s.src = src; s.async = true;
      if (sri){ s.integrity = sri; s.crossOrigin = 'anonymous'; }
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  var THREE_BASE = 'https://cdn.jsdelivr.net/npm/three@0.128.0';
  /* Kick the model download off immediately, in parallel with the two library
     scripts, instead of waiting for both scripts to load first. On slower
     (mobile) connections this was the main cause of the sculpture appearing
     noticeably later than on desktop — three sequential round-trips instead
     of two happening at once. */
  var glbPromise = fetch('assets/sculpture.glb').then(function(r){
    if (!r.ok) throw new Error('sculpture.glb responded ' + r.status);
    return r.arrayBuffer();
  });
  loadScript(THREE_BASE + '/build/three.min.js',
      'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu')
    .then(function(){ return loadScript(THREE_BASE + '/examples/js/loaders/GLTFLoader.js',
      'sha384-fljlqkjWlmSFjkESkQvm77heIZpoWmXEOzlCA7kOpGUH+95Zk0yGfQieWM2q136E'); })
    .then(function(){ initSculpture(); })
    .catch(function(err){ console.warn('[sculpture] could not load Three.js', err); });

  function initSculpture(){
  if (typeof THREE === 'undefined') return;

  /* scene */
  var scene  = new THREE.Scene();
  var W = mount.clientWidth  || window.innerWidth;
  var H = mount.clientHeight || window.innerHeight;
  var camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
  camera.position.set(0, 0, 7);

  var renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  var dprCap = (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 8) ? 1.25 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
  renderer.setSize(W, H);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  mount.appendChild(renderer.domElement);

  /* environment (warm gradient PMREM for metallic reflections) */
  var pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  (function(){
    var envScene = new THREE.Scene();
    var geo = new THREE.SphereGeometry(20, 32, 16);
    var canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 64;
    var ctx = canvas.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0,   '#FFFFFF');
    g.addColorStop(0.45,'#FFF0E0');
    g.addColorStop(0.75,'#E8B89A');
    g.addColorStop(1,   '#7A5040');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 64);
    var tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    var mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide });
    envScene.add(new THREE.Mesh(geo, mat));
    var envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
  })();

  /* lights */
  scene.add(new THREE.AmbientLight(0xE9E1D4, 0.7));
  var kL = new THREE.DirectionalLight(0xFFF6EC, 1.4); kL.position.set(4, 6, 6);  scene.add(kL);
  var rL = new THREE.DirectionalLight(0xE5602B, 1.0); rL.position.set(-5, -2, 4); scene.add(rL);
  var fL = new THREE.DirectionalLight(0xC98A7D, 0.7); fL.position.set(0, -4, -5); scene.add(fL);

  /* mobile flag — drives a smaller sculpture and disables touch drag-to-rotate.
     Re-checked on resize (see below) so rotating a tablet across the 768px
     breakpoint updates the scale instead of freezing it at load time. */
  var isMobile = window.matchMedia('(max-width: 768px)').matches;

  /* group + scale tween state */
  var group = new THREE.Group(); scene.add(group);
  /* on mobile, shrink the sculpture ~45% so it doesn't crowd the headline */
  var ENTRY_SCALE = 0.17, FULL_SCALE = isMobile ? 0.55 : 1;
  var entryScale = ENTRY_SCALE;
  group.scale.setScalar(entryScale);

  /* rotation state */
  var rotY = 0.55, rotX = -0.18, targetRotY = 0.55, targetRotX = -0.18;
  var autoSpin = !reduce;

  /* load model */
  var loader = new THREE.GLTFLoader();
  function onModelReady(gltf){
    var model = gltf.scene;
    var box = new THREE.Box3().setFromObject(model);
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    var maxDim = Math.max(size.x, size.y, size.z);
    model.scale.setScalar(5.4 / maxDim);
    model.traverse(function(o){
      if (o.isMesh) {
        if (o.geometry && !o.geometry.attributes.normal) o.geometry.computeVertexNormals();
        o.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#E5602B'),
          metalness: 0.65, roughness: 0.28, envMapIntensity: 0.9,
          flatShading: false
        });
      }
    });
    group.add(model);
    if (hint) hint.classList.add('is-in');
  }
  /* by the time we get here the GLB fetch kicked off earlier has usually
     already resolved (or is very close to it) since it ran alongside the
     library script loads rather than after them */
  glbPromise.then(function(buffer){
    loader.parse(buffer, '', onModelReady, function(err){ console.warn('[sculpture] load failed', err); });
  }).catch(function(err){ console.warn('[sculpture] load failed', err); });

  /* resize — rAF-throttled so a raw flood of resize events (window drag,
     mobile browser chrome show/hide) doesn't resize the renderer and
     recompute the projection matrix on every single one */
  var resizePending = false;
  function resize(){
    var w = mount.clientWidth || window.innerWidth;
    var h = mount.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    /* re-check the breakpoint: a tablet rotated across 768px (or a desktop
       window resized past it) should pick up the correct target scale */
    var nowMobile = window.matchMedia('(max-width: 768px)').matches;
    if (nowMobile !== isMobile){
      isMobile = nowMobile;
      FULL_SCALE = isMobile ? 0.55 : 1;
    }
  }
  window.addEventListener('resize', function(){
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(function(){ resizePending = false; resize(); });
  });

  /* render loop — only runs while the sculpture is actually visible AND the
     tab is active. Scrolling past the hero or switching tabs fully stops
     the RAF loop (and all GPU work with it); scrolling back resumes it
     exactly where it left off. This is the single biggest cost-saver here,
     since the loop previously ran forever regardless of visibility. */
  var clock = new THREE.Clock();
  var rafId = null;
  var isVisible = true;   // optimistic until the observer reports otherwise
  var isTabActive = !document.hidden;

  function frame(){
    rafId = requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 0.05);
    if (autoSpin && !dragging) targetRotY += dt * 0.12;
    if (momentum && !dragging){
      targetRotY += velY; targetRotX += velX;
      targetRotX = Math.max(-0.9, Math.min(0.9, targetRotX));
      velY *= 0.94; velX *= 0.94;
      if (Math.abs(velY) < 0.0006 && Math.abs(velX) < 0.0006){
        momentum = false; velY = velX = 0; autoSpin = !reduce;
      }
    }
    rotY += (targetRotY - rotY) * 0.06;
    rotX += (targetRotX - rotX) * 0.06;
    group.rotation.y = rotY;
    group.rotation.x = rotX;
    if (entryScale > 0) group.scale.setScalar(entryScale);
    renderer.render(scene, camera);
  }
  function startLoop(){
    if (rafId === null){ clock.getDelta(); /* drop the idle gap */ rafId = requestAnimationFrame(frame); }
  }
  function stopLoop(){
    if (rafId !== null){ cancelAnimationFrame(rafId); rafId = null; }
  }
  function syncLoop(){
    if (isVisible && isTabActive) startLoop(); else stopLoop();
  }

  if ('IntersectionObserver' in window){
    var sculptIO = new IntersectionObserver(function(entries){
      isVisible = entries[0].isIntersecting;
      syncLoop();
    }, { threshold: 0, rootMargin: '200px' });
    sculptIO.observe(mount);
  }
  document.addEventListener('visibilitychange', function(){
    isTabActive = !document.hidden;
    syncLoop();
  });

  syncLoop();
  resize();

  /* drag to rotate */
  var dragging = false, lastX = 0, lastY = 0;
  var velY = 0, velX = 0, momentum = false;
  function clampVel(v){ return Math.max(-0.32, Math.min(0.32, v)); }
  /* touch axis lock: decide on first move whether the swipe is a vertical
     scroll (let the page scroll) or a horizontal drag (rotate the model) */
  var tStartX = 0, tStartY = 0, tAxis = null;
  function onDown(e){
    momentum = false; velY = velX = 0;
    if (e.touches){
      var t = e.touches[0];
      tStartX = lastX = t.clientX;
      tStartY = lastY = t.clientY;
      tAxis = null;       // undecided until the finger clearly moves
      dragging = false;   // don't rotate (or kill auto-spin) until it's horizontal
      return;
    }
    dragging = true; autoSpin = false; mount.classList.add('is-dragging');
    lastX = e.clientX; lastY = e.clientY;
  }
  function onMove(e){
    if (e.touches){
      var t = e.touches[0];
      if (tAxis === null){
        var dx = Math.abs(t.clientX - tStartX);
        var dy = Math.abs(t.clientY - tStartY);
        if (dx < 8 && dy < 8) return;        // wait for a clear direction
        if (dx > dy){                         // horizontal → rotate
          tAxis = 'h'; dragging = true; autoSpin = false; mount.classList.add('is-dragging');
        } else {                              // vertical → let the page scroll
          tAxis = 'v'; return;
        }
      }
      if (tAxis !== 'h') return;
      velY = clampVel((t.clientX - lastX) * 0.006);
      targetRotY += velY;   // horizontal rotation only
      lastX = t.clientX; lastY = t.clientY;
      return;
    }
    if (!dragging) return;
    velY = clampVel((e.clientX - lastX) * 0.006);
    velX = clampVel((e.clientY - lastY) * 0.006);
    targetRotY += velY;
    targetRotX += velX;
    targetRotX = Math.max(-0.9, Math.min(0.9, targetRotX));
    lastX = e.clientX; lastY = e.clientY;
  }
  function onUp(){
    if (dragging && (Math.abs(velY) > 0.0008 || Math.abs(velX) > 0.0008)) momentum = true;
    dragging = false; tAxis = null; mount.classList.remove('is-dragging');
  }

  /* attach: mouse drags on the mount, touch drags on the mount (with the
     axis-lock above so vertical swipes still scroll the page), and the
     move/up listeners live on window so a drag that leaves the canvas
     bounds doesn't get "stuck" mid-rotation */
  mount.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  /* Mobile: no drag-to-rotate. The sculpture keeps its gentle auto-spin, and
     vertical swipes scroll the page normally (touch-action:pan-y on the canvas).
     Touch drag listeners are only attached on non-mobile touch devices. */
  if (!isMobile){
    mount.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
  }
	

  /* cursor-follow tilt (desktop, not dragging) */
  if (window.matchMedia('(pointer:fine)').matches && !reduce){
    var hero = document.querySelector('.hero');
    hero.addEventListener('mousemove', function(e){
      if (dragging || momentum) return;
      var r = hero.getBoundingClientRect();
      targetRotY = 0.55 + ((e.clientX - r.left) / r.width  - 0.5) * 0.7;
      targetRotX = -0.18 - ((e.clientY - r.top)  / r.height - 0.5) * 0.4;
    });
    hero.addEventListener('mouseleave', function(){
      if (!dragging){ targetRotY = 0.55; targetRotX = -0.18; }
    });
  }

  /* expose scale-tween and loop control for the loader handoff */
  window.__sculpture = {
    startLoop: function(){ isVisible = true; syncLoop(); },
    reveal: function(onDone){
      if (reduce){ entryScale = FULL_SCALE; if (onDone) onDone(); return; }
      /* explosion: fast overshoot from the entry scale (0.17) then settle — 0.17 → ~1.2 → 1 */
      var dur = 1100, t0 = performance.now(), from = entryScale;
      function easeExplosion(t){
        /* very strong overshoot back-ease */
        var c1 = 2.2, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      }
      (function tick(now){
        var t = Math.min(1, (now - t0) / dur);
        entryScale = from + (FULL_SCALE - from) * easeExplosion(t);
        if (t < 1) requestAnimationFrame(tick);
        else { entryScale = FULL_SCALE; if (onDone) onDone(); }
      })(performance.now());
    }
  };
  } /* end initSculpture */
})();
