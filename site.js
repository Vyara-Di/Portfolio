(function(){

  /* 1 — console colophon */
  console.log(
    '%cVYARA DIMITROVA%c\nSet in Satoshi and IBM Plex Mono.\nInk #15130F on paper #F5F1E8. Orange #E5602B.\nSingle-file HTML/CSS, no build step. Printed on-screen, ' + new Date().getFullYear() + '.',
    'font-size:14px;font-weight:700;color:#E5602B;',
    'font-size:11px;color:#8C8468;line-height:1.6;'
  );

  /* 2 — hidden colophon panel, press "C" */
  function buildColophon(){
    if (document.getElementById('colophon')) return;
    const panel = document.createElement('div');
    panel.id = 'colophon';
    panel.className = 'colophon';
    panel.innerHTML =
      '<div class="colophon-inner">' +
        '<button class="colophon-close mono" id="colophonClose">Close ✕</button>' +
        '<div class="colophon-row"><span>Typefaces</span><span>Satoshi / IBM Plex Mono</span></div>' +
        '<div class="colophon-row"><span>Palette</span><span>Paper #F5F1E8 · Ink #15130F · Orange #E5602B</span></div>' +
        '<div class="colophon-row"><span>Built</span><span>Single-file HTML &amp; CSS, no build step</span></div>' +
        '<div class="colophon-row"><span>Printed</span><span>On-screen, ' + new Date().getFullYear() + '</span></div>' +
      '</div>';
    document.body.appendChild(panel);
    document.getElementById('colophonClose').addEventListener('click', closeColophon);
    requestAnimationFrame(() => panel.classList.add('open'));
  }
  function closeColophon(){
    const panel = document.getElementById('colophon');
    if (!panel) return;
    panel.classList.remove('open');
    setTimeout(() => panel.remove(), 500);
  }
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const panel = document.getElementById('colophon');
      if (panel && panel.classList.contains('open')) closeColophon();
      else buildColophon();
    }
    if (e.key === 'Escape') closeColophon();
  });

  /* 4 — ghost numeral revision flicker: 01 → 01A → 01B → 01 */
  document.querySelectorAll('.ghost-num').forEach((num) => {
    const base = num.textContent.trim();
    let animating = false;
    num.addEventListener('click', () => {
      if (animating) return;
      animating = true;
      const seq = [base + 'A', base + 'B', base];
      let i = 0;
      const step = () => {
        num.textContent = seq[i];
        i += 1;
        if (i < seq.length) setTimeout(step, 220);
        else animating = false;
      };
      step();
    });
  });

  /* 5 — tab-away title swap */
  const originalTitle = document.title;
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? 'Vyara - Designer' : originalTitle;
  });

  /* 6 — fast-scroll remark, only on pages that actually have plates */
  if (document.querySelector('.plate')) {
    let lastY = window.scrollY;
    let lastMouse = { x: window.innerWidth / 2, y: 100 };
    let cooldown = false;
    let ticking = false;

    document.addEventListener('mousemove', (e) => {
      lastMouse = { x: e.clientX, y: e.clientY };
    }, { passive: true });

    const tip = document.createElement('div');
    tip.className = 'scroll-tip mono';
    tip.textContent = 'slow down — plates are hand-set';
    document.body.appendChild(tip);

    function checkVelocity(){
      const currentY = window.scrollY;
      const delta = Math.abs(currentY - lastY);
      lastY = currentY;
      if (delta > 140 && !cooldown) {
        tip.style.left = lastMouse.x + 'px';
        tip.style.top = Math.max(lastMouse.y - 30, 60) + 'px';
        tip.classList.add('show');
        cooldown = true;
        setTimeout(() => tip.classList.remove('show'), 1400);
        setTimeout(() => { cooldown = false; }, 2600);
      }
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(checkVelocity); ticking = true; }
    }, { passive: true });
  }

  /* 7 — custom cursor: crosshair core + labeled trailing ring, desktop pointer only */
  if (!document.body.classList.contains('home') && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const dot = document.createElement('div'); dot.className = 'cursor-dot';
    const ring = document.createElement('div'); ring.className = 'cursor-ring';
    const label = document.createElement('span'); label.className = 'cr-label mono';
    ring.appendChild(label);
    document.body.append(dot, ring);
    document.body.classList.add('cursor-ready');

    let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px,${my}px,0) translate(-50%,-50%)`;
    }, { passive: true });

    (function trail(){
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
      requestAnimationFrame(trail);
    })();

    const hoverMap = [
      ['.plate', 'Zoom'],
      ['.rail a', 'Jump'],
      ['a[target="_blank"]', 'Open'],
      ['a, button, .ghost-num', ''],
    ];
    function matchLabel(target){
      for (const [sel, text] of hoverMap) {
        const hit = target.closest && target.closest(sel);
        if (hit) return text;
      }
      return null;
    }
    document.addEventListener('mouseover', (e) => {
      const text = matchLabel(e.target);
      if (text !== null) {
        ring.classList.add('hover');
        dot.classList.add('hover');
        label.textContent = text;
      }
    });
    document.addEventListener('mouseout', (e) => {
      const related = e.relatedTarget;
      const stillMatched = related && matchLabel(related) !== null;
      if (!stillMatched) {
        ring.classList.remove('hover');
        dot.classList.remove('hover');
        label.textContent = '';
      }
    });
  }

  /* 8 — kinetic headline: word-by-word mask reveal for anything marked data-kinetic */
  function kineticWrap(el){
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    let i = 0;
    const wrapped = lines.map((line) => {
      const words = line.trim().split(/\s+/).filter(Boolean);
      return words.map((w) => {
        const span = '<span class="kw"><span class="kw-inner" style="--i:' + i + '">' + w + '</span></span>';
        i += 1;
        return span;
      }).join(' ');
    }).join('<br>');
    el.innerHTML = wrapped;
    el.classList.add('kinetic');
  }
  const kineticEls = document.querySelectorAll('[data-kinetic]');
  kineticEls.forEach(kineticWrap);
  const kineticIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        kineticIo.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  kineticEls.forEach((el) => kineticIo.observe(el));
  

})();

/* =====================================================================
   PART 2 — page systems (shared helpers, project pages, home page)
   ===================================================================== */
(function(){
  var doc = document.documentElement, body = document.body;
  var isHome = body.classList.contains('home'), isProject = body.classList.contains('project');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return [].slice.call((r || document).querySelectorAll(s)); };
  var G = !!(window.gsap && window.ScrollTrigger && window.Lenis);
  function ready(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  /* images that fail to load simply disappear, leaving the textured placeholder */
  document.addEventListener('error', function(e){ if (e.target && e.target.tagName === 'IMG') e.target.style.display = 'none'; }, true);
  $$('img').forEach(function(i){ if (i.complete && i.naturalWidth === 0 && i.getAttribute('src')) i.style.display = 'none'; });

  /* liquid edge — a wavy polygon that rises through the screen.
     fromBottom=false: reveals from the top (curtain lifting); true: covers from the bottom */
  function wave(el, p, fromBottom){
    var base = (1 - p) * 112 - 6, amp = Math.sin(Math.PI * p) * 7, pts = [];
    for (var i = 20; i >= 0; i--) pts.push((i * 5) + '% ' + (base + amp * Math.sin(i * .55 + p * 7)).toFixed(2) + '%');
    el.style.clipPath = 'polygon(' + (fromBottom ? '0% 100%,100% 100%,' : '0% 0%,100% 0%,') + pts.join(',') + ')';
  }
  function getCurtain(){ var pt = $('.pt'); if (!pt){ pt = document.createElement('div'); pt.className = 'pt'; pt.setAttribute('aria-hidden', 'true'); body.appendChild(pt); } return pt; }
  /* leaving for another page: the same edge rises from the bottom and covers the screen */
  function bindLeave(pt){
    addEventListener('pageshow', function(e){ if (e.persisted){ pt.style.clipPath = isHome ? 'polygon(0 0,0 0,0 0)' : ''; doc.classList.add('pt-done'); } });
    document.addEventListener('click', function(e){
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      var h = a.getAttribute('href');
      if (!/^(index|project-[a-z-]+)\.html(#.*)?$/.test(h)) return;
      e.preventDefault();
      doc.classList.remove('pt-done'); pt.style.cssText += ';display:block;visibility:visible;animation:none';
      var q = { p: 0 };
      gsap.to(q, { p: 1, duration: 1, ease: 'power3.inOut', onUpdate: function(){ wave(pt, q.p, true); }, onComplete: function(){ location.href = h; } });
    });
  }
  function words(el, inline){
    (function walk(n){ [].slice.call(n.childNodes).forEach(function(c){
      if (c.nodeType === 3){ var f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(function(t){ if (!t) return; if (/^\s+$/.test(t)) f.appendChild(document.createTextNode(' ')); else { var w = document.createElement('span'); w.className = 'w'; if (inline) w.style.display = 'inline-block'; w.textContent = t; f.appendChild(w); } });
        c.replaceWith(f); }
      else if (c.nodeType === 1) walk(c); }); })(el);
    return $$('.w', el);
  }

  /* ---------------------------------------------------------------
     PROJECT PAGES
     --------------------------------------------------------------- */
  function projectPage(){
    /* reveal on scroll */
    var io = new IntersectionObserver(function(es){ es.forEach(function(en){ if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: 0.15 });
    $$('.reveal').forEach(function(el){ io.observe(el); });

    /* progress bar + nav state */
    var bar = $('#progressBar'), ticking = false;
    function upd(){
      var h = doc.scrollHeight - window.innerHeight, pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      if (bar) bar.style.width = pct + '%';
      var ring = $('.home-fab .pg'); if (ring) ring.style.strokeDashoffset = (163.36 * (1 - pct / 100)).toFixed(2);
      ticking = false;
    }
    window.addEventListener('scroll', function(){ if (!ticking){ requestAnimationFrame(upd); ticking = true; } }, { passive: true });
    upd();

    /* last project: tap the goodbye for a little shower of hearts */
    var endNote = $('.end-note');
    if (endNote){
      var pop = function(e){
        var r = endNote.getBoundingClientRect(), x = e.clientX ? e.clientX - r.left : r.width * .8, y = e.clientY ? e.clientY - r.top : r.height * .5;
        for (var i = 0; i < 10; i++){
          var h = document.createElement('span'); h.className = 'heart-pop'; h.textContent = '❤️';
          h.style.left = x + 'px'; h.style.top = y + 'px'; h.style.animationDelay = (i * 60) + 'ms';
          h.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); h.style.setProperty('--r', (Math.random() * 50 - 25) + 'deg');
          endNote.appendChild(h); setTimeout(function(n){ n.remove(); }, 2000, h);
        }
      };
      endNote.addEventListener('click', pop);
      endNote.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); pop(e); } });
    }

    /* lightbox */
    var lb = $('#lightbox'), lbPlate = $('#lightboxPlate'), lbLabel = $('#lightboxLabel'), lbClose = $('#lightboxClose');
    if (lb){
      var open = function(plate){
        var tex = [].slice.call(plate.classList).filter(function(c){ return /^c\d+$/.test(c); })[0];
        lbPlate.className = 'lightbox-plate' + (tex ? ' ' + tex : '');
        lbPlate.style.filter = plate.style.filter || '';
        $$('.plate-media', lbPlate).forEach(function(el){ el.remove(); });
        var media = $('.plate-media', plate);
        if (media){ var clone = media.cloneNode(true); lbPlate.insertBefore(clone, lbPlate.firstChild); }
        var label = $('.plate-label', plate); lbLabel.textContent = label ? label.textContent : '';
        lb.classList.add('open'); body.classList.add('lightbox-open');
      };
      var close = function(){ lb.classList.remove('open'); body.classList.remove('lightbox-open'); };
      $$('.plate').forEach(function(p){ p.addEventListener('click', function(){ open(p); }); });
      lbClose.addEventListener('click', close);
      lb.addEventListener('click', function(e){ if (e.target === lb) close(); });
      document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
    }

    /* chapters: text + media become a story layout (sticky text beside the images, or stacked for complex scenes) */
    $$('.scene').forEach(function(s){
      var txt = document.createElement('div'); txt.className = 'scene__txt'; var rest = [];
      [].slice.call(s.children).forEach(function(k){ if (/\b(eyebrow|lead-text|body-text)\b/.test(k.className)) txt.appendChild(k); else rest.push(k); });
      s.insertBefore(txt, s.firstChild);
      if (rest.length && rest.every(function(k){ return /\b(mosaic|plate|pull-quote)\b/.test(k.className); })){
        var m = document.createElement('div'); m.className = 'scene__media'; rest.forEach(function(k){ m.appendChild(k); }); s.appendChild(m); s.classList.add('scene--split');
      } else s.classList.add('scene--stack');
      var ey = $('.eyebrow', txt), n = ey && /\d+/.exec(ey.textContent);
      if (n){ var num = document.createElement('span'); num.className = 'scene__num'; num.setAttribute('aria-hidden', 'true'); num.textContent = n[0]; s.appendChild(num); }
    });

    /* side-rail thread tracker */
    if ($('#flows')){

/* Organic thread tracker
   - progress p runs 0 → n-1 continuously through the sections
   - the droplet is driven by an under-damped spring (it overshoots a touch and settles),
     the trailing blob follows it on a softer spring, the goo filter joins them
   - the line itself breathes: node positions and curve handles sway slowly, even when idle
   - droplet squashes/stretches with scroll speed                                             */
(function(){
  var rail   = document.getElementById('rail');
  var host   = document.getElementById('flows');
  var anchors = [].slice.call(host.querySelectorAll('a.fl-item')).filter(function(a){ return document.querySelector(a.getAttribute('href')); });
  var scenes  = anchors.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  var n = anchors.length; if (n < 2) return;

  var step = n > 5 ? 64 : n > 4 ? 72 : 80, pad = 22, H = (n-1)*step + pad*2;   // long track, a little tighter when there are many sections
  var CX = 20, A = 12;                                // centre line + arc width
  var amps = [-1, .9, -1.08, .86, -.96, 1.04, -1, .9]; // each arc a little different
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var y = function(i){ return pad + i*step; };
  var clamp = function(v,a,b){ return Math.min(b, Math.max(a, v)); };
  var lerp = function(a,b,u){ return a + (b-a)*u; };

  function mk(tag, cls, parent){ var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function mkS(tag, attrs, parent){ var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  var f = mk('div','flow',host); f.style.height = H+'px';
  var svg  = mkS('svg',{'class':'fl1-svg',width:40,height:H},f);
  var base = mkS('path',{'class':'base'},svg);
  var prog = mkS('path',{'class':'prog'},svg);
  var nodeEls = anchors.map(function(){ return mkS('circle',{'class':'node',r:3.5},svg); });
  var goo = mk('div','fl1-goo',f); goo.style.height = H+'px';
  var bLead = mk('i','',goo), bTrail = mk('i','',goo);
  bLead.style.width = bLead.style.height = '13px';
  bTrail.style.width = bTrail.style.height = '9px';
  anchors.forEach(function(a,i){ a.style.top = y(i)+'px'; f.appendChild(a); });
  host.classList.add('is-ready');
  var labs = anchors;
  var labIn = anchors.map(function(a){ return a.firstElementChild; });

  /* ---- geometry (cubic segments between nodes, recalculated each frame so the line can sway) ---- */
  var nodes = [], segs = [];
  function geometry(t){
    var i;
    nodes = [];
    for (i=0;i<n;i++) nodes.push({ x: CX + amps[i%amps.length]*A + Math.sin(t*0.0009 + i*1.7)*2.6, y: y(i) });
    segs = [];
    for (i=1;i<n;i++){
      var a = nodes[i-1], b = nodes[i];
      var hm = step*(0.5 + 0.09*Math.sin(t*0.0007 + i*2.1));
      var s1 = Math.sin(t*0.0011 + i*1.3)*4, s2 = Math.sin(t*0.0010 + i*2.2)*4;
      segs.push([a.x,a.y, a.x+s1,a.y+hm, b.x+s2,b.y-hm, b.x,b.y]);
    }
  }
  function bez(s,u){
    var p = segs[s], v = 1-u, a = v*v*v, b = 3*v*v*u, c = 3*v*u*u, d = u*u*u;
    return { x:a*p[0]+b*p[2]+c*p[4]+d*p[6], y:a*p[1]+b*p[3]+c*p[5]+d*p[7] };
  }
  function firstHalf(s,u){            // de Casteljau split → control points of the part up to u
    var p = segs[s];
    var x01=lerp(p[0],p[2],u), y01=lerp(p[1],p[3],u), x12=lerp(p[2],p[4],u), y12=lerp(p[3],p[5],u), x23=lerp(p[4],p[6],u), y23=lerp(p[5],p[7],u);
    var x012=lerp(x01,x12,u), y012=lerp(y01,y12,u), x123=lerp(x12,x23,u), y123=lerp(y12,y23,u);
    return [x01,y01,x012,y012,lerp(x012,x123,u),lerp(y012,y123,u)];
  }
  function C(p){ return ' C'+p[0].toFixed(2)+' '+p[1].toFixed(2)+' '+p[2].toFixed(2)+' '+p[3].toFixed(2)+' '+p[4].toFixed(2)+' '+p[5].toFixed(2); }

  /* ---- progress model ---- */
  var probe = 220, target = 0, cur = 0, vel = 0, cur2 = 0, vel2 = 0, last = performance.now(), lastNear = -1;
  function computeTarget(){
    var idx = 0;
    for (var k=0;k<scenes.length;k++){ if (scenes[k].getBoundingClientRect().top - probe <= 0) idx = k; }
    var r = scenes[idx].getBoundingClientRect();
    var p = idx + clamp((probe - r.top)/r.height, 0, 1);
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) p = n-1;
    return clamp(p, 0, n-1);
  }
  window.addEventListener('scroll', function(){ target = computeTarget(); }, { passive:true });
  window.addEventListener('resize', function(){ target = computeTarget(); });

  function frame(now){
    var dt = Math.min(40, now - last)/16.667; last = now;

    if (reduce){ cur = cur2 = target; vel = vel2 = 0; }
    else {
      vel  += (target - cur)*0.07*dt;  vel  *= Math.pow(0.74, dt);  cur  += vel*dt;   // lead: lively, slight overshoot
      vel2 += (cur - cur2)*0.04*dt;    vel2 *= Math.pow(0.80, dt);  cur2 += vel2*dt;  // trail: lazier, follows the lead
    }
    var cc = clamp(cur,0,n-1), c2 = clamp(cur2,0,n-1);
    var t  = reduce ? 0 : now;

    geometry(t);

    // base + progress paths
    var d = 'M'+nodes[0].x.toFixed(2)+' '+nodes[0].y.toFixed(2), i;
    for (i=0;i<segs.length;i++) d += C(segs[i].slice(2));
    base.setAttribute('d', d);
    var sg = Math.min(n-2, Math.floor(cc)), u = cc - sg;
    var pd = 'M'+nodes[0].x.toFixed(2)+' '+nodes[0].y.toFixed(2);
    for (i=0;i<sg;i++) pd += C(segs[i].slice(2));
    pd += C(firstHalf(sg,u));
    prog.setAttribute('d', pd);

    // nodes: grow a little as the droplet approaches, fill once passed
    nodeEls.forEach(function(c,k){
      var near = Math.max(0, 1 - Math.abs(cc - k));
      c.setAttribute('cx', nodes[k].x.toFixed(2)); c.setAttribute('cy', nodes[k].y.toFixed(2));
      c.setAttribute('r', (3.5 + 1.6*near).toFixed(2));
      c.classList.toggle('on', cc >= k - 0.02);
    });

    // droplets (squash & stretch with speed, gentle breathing + sideways wobble)
    var a = bez(sg, u);
    var sg2 = Math.min(n-2, Math.floor(c2)), b = bez(sg2, c2 - sg2);
    var st1 = reduce ? 0 : clamp(Math.abs(vel)*14, 0, .8);
    var st2 = reduce ? 0 : clamp(Math.abs(vel2)*10, 0, .6);
    var br  = reduce ? 1 : 1 + .07*Math.sin(now*0.005);
    var wob = reduce ? 0 : Math.sin(now*0.004)*(0.7 + st1*2);
    bLead.style.transform  = 'translate('+(a.x + wob - 6.5).toFixed(2)+'px,'+(a.y - 6.5).toFixed(2)+'px) scale('+(br*(1 - st1*.3)).toFixed(3)+','+(br*(1 + st1)).toFixed(3)+')';
    bTrail.style.transform = 'translate('+(b.x - wob*.6 - 4.5).toFixed(2)+'px,'+(b.y - 4.5).toFixed(2)+'px) scale('+(1 - st2*.25).toFixed(3)+','+(1 + st2).toFixed(3)+')';

    // labels
    labIn.forEach(function(el,k){
      var kk = Math.max(0, 1 - Math.abs(cc - k));
      el.style.opacity = (0.42 + 0.58*kk).toFixed(3);
      el.style.transform = 'translateX('+(kk*6).toFixed(2)+'px)';
      el.classList.toggle('on', kk > 0.5);
    });
    var near = Math.round(cc);
    if (near !== lastNear){
      labs.forEach(function(el,k){ if (k === near) el.setAttribute('aria-current','true'); else el.removeAttribute('aria-current'); });
      lastNear = near;
    }
    requestAnimationFrame(frame);
  }

  target = cur = cur2 = computeTarget();
  requestAnimationFrame(frame);
})();

}

    /* page opening, smooth scroll, scroll-driven motion */
    function release(){ doc.classList.add('pt-done'); }
    if (reduce || !G){ release(); var rr = $('#rail'); if (rr) rr.classList.add('on'); return; }
    ready(function(){
      gsap.registerPlugin(ScrollTrigger);
      var pt = getCurtain();
      var o = { p: 0 }; wave(pt, 0);
      gsap.to(o, { p: 1, duration: 1.3, delay: .1, ease: 'power3.inOut', onUpdate: function(){ wave(pt, o.p); }, onComplete: release });
      bindLeave(pt);

      var lenis = new Lenis({ lerp: .09 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function(t){ lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      new MutationObserver(function(){ body.classList.contains('lightbox-open') ? lenis.stop() : lenis.start(); }).observe(body, { attributes: true, attributeFilter: ['class'] });
      document.addEventListener('click', function(e){
        var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
        var t = $(a.getAttribute('href')); if (t){ e.preventDefault(); lenis.scrollTo(t, { offset: 0, duration: 1.6 }); }
      });

      /* hero drifts away */
      var hero = $('.detail-hero');
      if (hero){
        var st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
        gsap.to('.detail-hero .ghost-num', { yPercent: 28, ease: 'none', scrollTrigger: st });
        gsap.to('.detail-hero h1', { x: '-4vw', yPercent: -10, ease: 'none', scrollTrigger: st });
        gsap.to('.detail-hero .hero-sub,.detail-hero .eyebrow', { y: -34, opacity: 0, ease: 'none', scrollTrigger: st });
      }
      /* copy lights up word by word */
      $$('.lead-text,.body-text').forEach(function(p){
        var w = words(p, true); if (!w.length) return; gsap.set(w, { opacity: .18 });
        gsap.to(w, { opacity: 1, stagger: .06, ease: 'none', scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 58%', scrub: .4 } });
      });
      $$('.pull-quote p').forEach(function(p){ var w = words(p, true); gsap.from(w, { y: 26, opacity: 0, stagger: .06, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: p, start: 'top 85%' } }); });
      $$('.scene .eyebrow').forEach(function(e){ gsap.from(e, { x: -22, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: e, start: 'top 90%' } }); });
      /* plates: soft blob -> full frame, image drifts inside */
      $$('.plate').forEach(function(p){
        gsap.fromTo(p, { clipPath: 'inset(10% 8% 10% 8% round 44px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none', scrollTrigger: { trigger: p, start: 'top 94%', end: 'top 48%', scrub: .6 } });
        gsap.fromTo(p, { '--py': '-6%' }, { '--py': '6%', ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      /* chapters: each dome flattens as it arrives while the previous one recedes; numerals drift; thread shows only inside the story */
      var scs = $$('.scene'), pg0 = $('.project-pager'), rail = $('#rail');
      scs.forEach(function(s, i){
        var st = { trigger: s, start: 'top bottom', end: 'top top', scrub: true };
        gsap.fromTo(s, { '--rad': '9vw' }, { '--rad': '0vw', ease: 'none', scrollTrigger: st });
        gsap.to(i ? scs[i - 1] : hero, { y: '8vh', ease: 'none', scrollTrigger: st });
        var num = $('.scene__num', s); if (num) gsap.to(num, { yPercent: -22, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      if (scs.length && rail) ScrollTrigger.create({ trigger: scs[0], start: 'top 70%', endTrigger: pg0 || scs[scs.length - 1], end: 'top 85%', onToggle: function(x){ rail.classList.toggle('on', x.isActive); } });

      /* closing slab: dome flattens, content recedes */
      var pg = $('.project-pager'), lay = $('.detail-layout');
      if (pg){
        var s2 = { trigger: pg, start: 'top bottom', end: 'bottom bottom', scrub: true };
        gsap.fromTo(pg, { '--rad': '9vw' }, { '--rad': '0vw', ease: 'none', scrollTrigger: s2 });
        if (lay) gsap.to(lay, { y: '6vh', ease: 'none', scrollTrigger: s2 });
      }
    });
  }

  /* ---------------------------------------------------------------
     HOME PAGE
     --------------------------------------------------------------- */
  function homePage(){
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
  loadScript(THREE_BASE + '/build/three.min.js',
      'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu')
    .then(function(){ return loadScript(THREE_BASE + '/examples/js/loaders/GLTFLoader.js',
      'sha384-fljlqkjWlmSFjkESkQvm77heIZpoWmXEOzlCA7kOpGUH+95Zk0yGfQieWM2q136E'); })
    .then(initSculpture)
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

  /* mobile flag — drives a smaller sculpture and disables touch drag-to-rotate */
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
  loader.load('sculpture.glb', function(gltf){
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
  }, undefined, function(err){ console.warn('[sculpture] load failed', err); });

  /* resize */
  function resize(){
    var w = mount.clientWidth || window.innerWidth;
    var h = mount.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

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

    ready(function(){
var doc=document.documentElement,$=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(pointer:fine)').matches;
var P=[['LG Electronics','lg-electronics','Digital Design','2022–now','Systematised'],['My Market','my-market','Brand Identity','2021','Rebranded'],['Smart Point','smart-point','Brand Design','2021','Named'],['Reverto Winery','reverto-winery','Packaging','2021','Bottled'],['Crea Bakery','crea-bakery','Brand Identity','2022','Branded'],['Maynooth Furniture','maynooth-furniture','Web design','2021','Shipped']];
var works=$('#works');
P.forEach(function(p,i){var s=document.createElement('section');s.className='chap proj v'+'abc'[i%3];s.className+=' p'+(i+1);
 s.innerHTML='<a class="proj__st" href="project-'+p[1]+'.html" data-cursor="look" aria-label="'+p[0]+' — '+p[2]+', '+p[3]+'"><span class="proj__num d">0'+(i+1)+'</span><div class="proj__media"><img src="images/'+p[1]+'/card.jpg" alt="'+p[0]+' — '+p[2]+'" loading="'+(i<2?'eager':'lazy')+'"></div><h3 class="proj__t d">'+p[0].split(' ').map(function(w){return'<span class="ln"><span>'+w.split('').map(function(c){return'<span class="ci">'+c+'</span>'}).join('')+'</span></span>'}).join('')+'</h3><div class="proj__meta"><span class="mono o">'+p[4]+'</span><span class="mono">'+p[2]+' · '+p[3]+'</span><span class="mono cta">View case study →</span></div></a>';works.appendChild(s)});
function words(el){(function walk(n){[].slice.call(n.childNodes).forEach(function(c){if(c.nodeType===3){var f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(function(t){if(!t)return;if(/^\s+$/.test(t))f.appendChild(document.createTextNode(' '));else{var w=document.createElement('span');w.className='w';w.textContent=t;f.appendChild(w)}});c.replaceWith(f)}else if(c.nodeType===1)walk(c)})})(el);return $$('.w',el)}
/* live local time + copy email + mailto sentence */
(function(){var el=$('#local');function t(){try{el.textContent='It’s '+new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())+' in Frankfurt — I usually reply within a day.'}catch(e){}}t();setInterval(t,30000)})();
$('.mail').addEventListener('click',function(){var el=this;if(navigator.clipboard)navigator.clipboard.writeText('vyara.dmtrv@gmail.com').then(function(){var o=el.textContent;el.textContent='Copied ✓';setTimeout(function(){el.textContent=o},1400)},function(){})});
$$('.sent input[type=text],.sent input:not([type])').concat($$('.sent input[type=email]')).forEach(function(i){var f=function(){i.style.width=Math.max(i.value.length,i.placeholder.length)+1+'ch'};i.addEventListener('input',f);f()});
$('#form').addEventListener('submit',function(e){e.preventDefault();var t=($('input[name=t]:checked')||{}).value||'a project';
 location.href='mailto:vyara.dmtrv@gmail.com?subject='+encodeURIComponent('Project enquiry — '+t)+'&body='+encodeURIComponent('Hi Vyara,\n\nI\'m '+$('#fN').value+' and I\'d like to talk about '+t.toLowerCase()+'.\nYou can reach me at '+$('#fE').value+'.\n')});
/* old #project-name bookmarks → real pages */
var h=location.hash.slice(1);P.forEach(function(p){if(h&&p[0].toLowerCase().replace(/[^a-z0-9]+/g,'-')===h)location.replace('project-'+p[1]+'.html')});
if(!window.gsap||!window.ScrollTrigger||!window.Lenis){doc.classList.add('static');return}
gsap.registerPlugin(ScrollTrigger);var pt=getCurtain();bindLeave(pt);
if(reduce){doc.classList.add('static');return}
/* smooth scroll */
var lenis=new Lenis({lerp:.085});lenis.on('scroll',function(){ScrollTrigger.update();$('#bar').style.transform='scaleX('+(lenis.progress||0)+')'});
gsap.ticker.add(function(t){lenis.raf(t*1000)});gsap.ticker.lagSmoothing(0);
$$('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){var t=$(a.getAttribute('href'));if(t){e.preventDefault();lenis.scrollTo(t,{duration:1.7})}})});
/* cursor */
if(fine){var c=$('#cur'),cx=0,cy=0,tx_=0,ty=0;addEventListener('mousemove',function(e){tx_=e.clientX;ty=e.clientY;c.classList.add('on')});gsap.ticker.add(function(){cx+=(tx_-cx)*.2;cy+=(ty-cy)*.2;c.style.transform='translate('+cx+'px,'+cy+'px) translate(-50%,-50%)'});
 document.addEventListener('mouseover',function(e){c.classList.toggle('v',!!e.target.closest('[data-cursor="look"]'));c.classList.toggle('h',!e.target.closest('[data-cursor="look"]')&&!!e.target.closest('a,button,label'))})}
/* hero setup: words/chars */
var tang=$('#tang');tang.innerHTML=tang.textContent.split('').map(function(ch){return'<span class="ci">'+ch+'</span>'}).join('');
gsap.set('.hero h1 .ci',{yPercent:115,rotate:6});
function greet(){var h=new Date().getHours();return h<5?'Still up? Same.':h<12?'Good morning.':h<17?'Good afternoon.':h<22?'Good evening.':'Up late? Welcome in.'}
function sculpt(){var n=0,iv=setInterval(function(){if(window.__sculpture){clearInterval(iv);window.__sculpture.reveal(function(){})}else if(++n>40)clearInterval(iv)},200)}
function heroIn(){lenis.start();sculpt();gsap.timeline({defaults:{ease:'power4.out'}}).fromTo('#hero',{scale:1.07},{scale:1,duration:2.6,ease:'power3.out'},0).to('.hero h1 .ci',{yPercent:0,rotate:0,duration:1.5,stagger:.05},.1).from('.hero__top,.hero__sub,.hero__row a',{y:26,opacity:0,duration:1.1,stagger:.12},.6)}
var intro=$('#intro'),fast=false,cp={p:0};try{fast=sessionStorage.getItem('vd_intro')==='1';sessionStorage.setItem('vd_intro','1')}catch(e){}
intro.style.animation='none';
if(fast){intro.style.display='none';heroIn()}else{lenis.stop();gsap.set('#hero',{scale:1.07});var p=$('path',intro),L=p.getTotalLength();gsap.set(p,{strokeDasharray:L,strokeDashoffset:L});
 var itl=gsap.timeline().to(p,{strokeDashoffset:0,duration:1.6,ease:'power2.inOut'}).add(function(){$('#quip').textContent=greet()},1.65).to({},{duration:.7}).addLabel('lift')
  .to('#intro svg,#quip,#egg,#skip',{y:-40,opacity:0,duration:1,ease:'power2.in'},'lift')
  .to(cp,{p:1,duration:2,ease:'power3.inOut',onUpdate:function(){wave(intro,cp.p)}},'lift+=.2')
  .add(heroIn,'lift+=.8').set(intro,{display:'none'});
 gsap.from('#egg',{opacity:0,delay:.8});var em=['You found me. Hi.','Stop clicking.','I mean it.','Fine. You win. ♥'],ec=-1;$('#egg').addEventListener('click',function(){ec=Math.min(ec+1,3);$('#eggT').textContent=' '+em[ec]});
 $('#skip').addEventListener('click',function(){itl.timeScale(6)})}
/* chapters: dome flattens, previous chapter recedes */
var secs=$$('.chap');secs.forEach(function(s,i){var st={trigger:s,start:'top bottom',end:'top top',scrub:true};
 gsap.fromTo(s,{'--rad':'9vw'},{'--rad':'0vw',ease:'none',scrollTrigger:st});
 gsap.to(i?secs[i-1]:'#hero',{y:'8vh',ease:'none',scrollTrigger:st})});
gsap.to('.hero h1 .l',{x:'-14vw',ease:'none',scrollTrigger:{trigger:'#approach',start:'top bottom',end:'top top',scrub:true}});
gsap.to('.hero h1 .r',{x:'14vw',ease:'none',scrollTrigger:{trigger:'#approach',start:'top bottom',end:'top top',scrub:true}});
gsap.to('#heroSculpture',{scale:1.3,opacity:.2,ease:'none',scrollTrigger:{trigger:'#approach',start:'top bottom',end:'top top',scrub:true}});
/* manifesto: words light up as you read, thread draws itself */
var mw=words($('#manP'));gsap.set(mw,{opacity:.16});
gsap.to(mw,{opacity:1,stagger:.1,ease:'none',scrollTrigger:{trigger:'#man',start:'top 30%',end:'bottom bottom',scrub:.4}});
var th=$('#thread'),TL=th.getTotalLength();gsap.fromTo(th,{strokeDasharray:TL,strokeDashoffset:TL},{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'#man',start:'top 50%',end:'bottom bottom',scrub:.6}});
/* projects: each one is its own scene, scroll drives its motion; the next scene slides over it */
var mm=gsap.matchMedia();
mm.add('(min-width:900px)',function(){$$('.proj').forEach(function(s,i){var v='abc'[i%3],m=$('.proj__media',s),im=$('img',m),num=$('.proj__num',s),t=$('.proj__t',s),meta=$('.proj__meta',s),ch=$$('.ci',t);
 gsap.set(meta,{autoAlpha:0,y:20});gsap.set(im,{scale:1.35});
 var tl=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{trigger:s,start:'top 65%',end:'top -100%',scrub:.7}});
 if(v==='a'){gsap.set(m,{clipPath:'inset(27% 33% 27% 33% round 36%)'});tl.to(m,{clipPath:'inset(0% 0% 0% 0% round 0%)',duration:.6},0).to(im,{scale:1,duration:.7},0).to(t,{x:'5vw',duration:1},0).to(num,{xPercent:35,duration:1},0)}
 if(v==='b'){gsap.set(m,{clipPath:'inset(0% 0% 0% 100% round 28px)'});tl.to(m,{clipPath:'inset(0% 0% 0% 0% round 28px)',duration:.5},0).to(im,{scale:1.05,yPercent:8,duration:1},0).to(t,{x:'-6vw',duration:1},0).to(num,{y:'-12vh',duration:1},0)}
 if(v==='c'){gsap.set(m,{rotate:-9,scale:.65,y:'14vh'});tl.to(m,{rotate:0,scale:1,y:0,duration:.55},0).to(m,{rotate:1.5,duration:.45},.55).to(im,{scale:1,duration:.7},0).to(t,{x:'-7vw',duration:1},0).to(num,{y:'10vh',duration:1},0)}
 tl.to(meta,{autoAlpha:1,y:0,duration:.25,ease:'power2.out'},.5);
 gsap.from(ch,{yPercent:115,rotate:5,stagger:.035,duration:1.1,ease:'power4.out',scrollTrigger:{trigger:s,start:'top 55%',toggleActions:'play none none reverse'}})})});
mm.add('(max-width:899px)',function(){$$('.proj').forEach(function(s){gsap.from($$('.proj__num,.proj__media,.proj__t,.proj__meta',s),{y:50,opacity:0,stagger:.12,duration:1,ease:'power3.out',scrollTrigger:{trigger:s,start:'top 80%'}})})});
/* marquee: drifts, speeds up and skews with scroll velocity */
var W=['Identity','Typography','Motion','Packaging','Editorial','Caffeine','3D','Web','Rebrands','Strategy'],tr=['#mq1','#mq2'].map(function(s){return $(s)}),xs=[0,-50],dr=[-1,1];
tr.forEach(function(t,k){var s='<span>'+W.map(function(w){return'<b>'+w+'</b><i></i>'}).join('')+'</span>';t.innerHTML=s+s;if(k)W.reverse()});
gsap.ticker.add(function(){var v=lenis.velocity||0;tr.forEach(function(t,k){xs[k]=gsap.utils.wrap(-50,0,xs[k]+dr[k]*(.012+Math.abs(v)*.012));gsap.set(t,{xPercent:xs[k],skewX:gsap.utils.clamp(-4,4,-v*.2)})})});
/* about */
gsap.fromTo('.about__ph',{clipPath:'inset(14% 10% 14% 10%)',borderRadius:'50%'},{clipPath:'inset(0% 0% 0% 0%)',borderRadius:'8px',ease:'none',scrollTrigger:{trigger:'.about__ph',start:'top 90%',end:'top 30%',scrub:true}});
gsap.fromTo('.about__ph img',{yPercent:-6},{yPercent:6,ease:'none',scrollTrigger:{trigger:'.about__ph',start:'top bottom',end:'bottom top',scrub:true}});
$$('.about__lead,.about__now').forEach(function(p){gsap.from(words(p),{opacity:0,y:18,stagger:.015,duration:.9,ease:'power3.out',scrollTrigger:{trigger:p,start:'top 82%'}})});
$$('[data-n]').forEach(function(e){var o={v:0};gsap.to(o,{v:+e.dataset.n,duration:1.6,ease:'power2.out',onUpdate:function(){e.textContent=Math.round(o.v)},scrollTrigger:{trigger:e,start:'top 90%'}})});
gsap.from('.sent > *',{y:40,opacity:0,stagger:.12,duration:1,ease:'power3.out',scrollTrigger:{trigger:'#form',start:'top 80%'}});
gsap.from('.foot__brand,.foot__col,.foot__base',{y:34,opacity:0,stagger:.1,duration:1,ease:'power3.out',scrollTrigger:{trigger:'.foot',start:'top 85%'}});
});

  }

  if (isProject) projectPage();
  if (isHome) homePage();
})();
