/* =====================================================================
   Vyara Dimitrova — site interactions
   (loader, cursor, magnetic buttons, scroll reveals, nav, lightbox,
   case-study reveals/parallax, design mode, contact clock, marquee)

   Project copy/markup now lives directly in each page's HTML (index.html
   for the work cards, projects/*.html for each case study). This file
   only contains the shared behaviour — nothing here builds page content.
   ===================================================================== */
(function(){
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = window.matchMedia('(pointer:fine)').matches;

  /* ---------------------------------------------------------------------------
     MEDIA OPTIMISATION (one place, reused everywhere)

       enhanceImages()  · adds decoding="async" + lazy loading to every image.
                          When MEDIA.cdn is set, rewrites each jpg into a
                          responsive srcset served through a format-negotiating
                          CDN (Cloudflare Images / imgix / Cloudinary …). Leave
                          cdn:'' and everything serves the original jpg as-is.

       enhanceVideos()  · never preloads; loads + plays a clip only when it is
                          near the viewport and pauses it once scrolled away.
  --------------------------------------------------------------------------- */
  var MEDIA = {
    cdn: '',                            // e.g. 'https://cdn.yoursite.com' — '' = serve local jpg/mp4 as-is
    widths: [480, 768, 1200, 1800]      // responsive widths requested from the CDN
  };

  function cdnUrl(path, w){
    return MEDIA.cdn.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '') +
           '?format=auto&width=' + w;
  }

  function enhanceImages(root){
    if (!root) return;
    root.querySelectorAll('img:not([data-enh])').forEach(function(img){
      img.setAttribute('data-enh', '');
      img.decoding = 'async';
      if (!img.hasAttribute('loading')) img.loading = 'lazy';
      /* a missing file hides itself instead of rendering a broken-image icon;
         the container keeps its sand background so the grid stays composed */
      img.addEventListener('error', function(){ img.style.visibility = 'hidden'; }, { once: true });
      var src = img.getAttribute('src');
      if (MEDIA.cdn && src && src.indexOf('http') !== 0){
        img.srcset = MEDIA.widths.map(function(w){
          return cdnUrl(src, w) + ' ' + w + 'w';
        }).join(', ');
        if (!img.getAttribute('sizes')) img.sizes = '(max-width:700px) 92vw, 1200px';
        img.src = cdnUrl(src, MEDIA.widths[MEDIA.widths.length - 1]);
      }
    });
  }

  var videoIO = null;
  function enhanceVideos(root){
    if (!root) return;
    if (!('IntersectionObserver' in window)){
      root.querySelectorAll('video[data-src]').forEach(function(v){
        if (!v.src){ v.src = v.dataset.src; v.load(); }
      });
      return;
    }
    if (!videoIO){
      videoIO = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          var v = en.target;
          if (en.isIntersecting){
            if (!v.src && v.dataset.src){ v.src = v.dataset.src; v.load(); }
            var p = v.play(); if (p && p.catch) p.catch(function(){});
          } else if (!v.paused){
            v.pause();
          }
        });
      }, { rootMargin: '0px', threshold: 0.01 });
    }
    root.querySelectorAll('video:not([data-vlazy])').forEach(function(v){
      v.setAttribute('data-vlazy', '');
      if (v.getAttribute('src') && !v.dataset.src){
        v.dataset.src = v.getAttribute('src');
        v.removeAttribute('src');
      }
      v.preload = 'none';
      videoIO.observe(v);
    });
  }

  /* --- loader: sketched mark + settling accent + two-phrase colophon --- */
  var loader     = document.getElementById('loader');
  var phraseEl   = document.getElementById('loaderPhraseText');
  var ruleEl     = document.getElementById('loaderRule');
  var innerEl    = document.getElementById('loaderInner');
  var sigEl      = document.getElementById('loaderSig');
  var skipBtn    = document.getElementById('loaderSkip');

  var PHRASE_ONE = 'Prototyping warm welcome\u2026';

  /* time-aware greeting — the phrase the mark settles into once drawn */
  function greeting(){
    var h = new Date().getHours();
    if (h < 5)  return 'Still up? Same.';
    if (h < 12) return 'Good morning.';
    if (h < 17) return 'Good afternoon.';
    if (h < 22) return 'Good evening.';
    return 'Up late? Welcome in.';
  }

  /* Seen the full intro already this session? Skip straight to the fast
     (reduced-motion-style) reveal, on every page, so browsing from page to
     page doesn't replay the curtain each time. */
  var SEEN_KEY = 'vd_intro_seen';
  var skipIntro = false;
  try { skipIntro = sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e){ /* storage blocked — fall back to full intro */ }
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e){}

  var fastIntro = reduce || skipIntro || !loader;

  var sigShapeEl = document.getElementById('sigShape');
  var sigPen     = document.getElementById('sigPen');
  var sigAccent  = document.getElementById('sigAccent');
  var SIG_LEN = 0;
  if (sigShapeEl){
    try { SIG_LEN = sigShapeEl.getTotalLength(); } catch (e){ SIG_LEN = 1101; }
  }
  var ACC_SEG = Math.max(60, SIG_LEN * 0.08); /* length of the lit orange tip */

  if (sigPen){
    sigPen.style.transition = 'none';
    sigPen.style.strokeDasharray  = SIG_LEN;
    sigPen.style.strokeDashoffset = SIG_LEN;
  }
  if (sigAccent){
    sigAccent.style.strokeDasharray  = ACC_SEG + ' ' + SIG_LEN;
    sigAccent.style.strokeDashoffset = ACC_SEG;
  }

  var SIG_DUR = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sig-draw-ms')) || 1900;
  var sigDrawDone = false;

  function sigLock(){
    sigDrawDone = true;
    if (sigPen){
      sigPen.style.transition = 'stroke-width .9s var(--ease-io)';
      sigPen.style.strokeDashoffset = 0;
    }
    if (sigAccent){
      sigAccent.style.transition = 'opacity .7s var(--ease)';
      sigAccent.style.opacity = '0';
    }
    if (sigEl){ sigEl.classList.remove('is-drawing'); sigEl.classList.add('is-locked'); }
  }

  function runSignature(){
    if (!sigEl || !sigPen){ return; }
    sigEl.classList.add('is-drawing');
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        if (sigDrawDone) return;
        sigPen.style.transition = 'stroke-dashoffset ' + SIG_DUR + 'ms var(--ease-io)';
        sigPen.style.strokeDashoffset = 0;
        if (sigAccent){
          sigAccent.style.opacity = '.9';
          sigAccent.style.transition = 'stroke-dashoffset ' + SIG_DUR + 'ms var(--ease-io), opacity .4s var(--ease)';
          sigAccent.style.strokeDashoffset = -(SIG_LEN - ACC_SEG);
        }
      });
    });
    setTimeout(function(){ if (!sigDrawDone) sigLock(); }, SIG_DUR);
  }

  function sigSweep(){
    if (!sigAccent || reduce) return;
    sigAccent.style.transition = 'none';
    sigAccent.style.strokeDashoffset = ACC_SEG;
    sigAccent.style.opacity = '0';
    void sigAccent.getBoundingClientRect();
    sigAccent.style.transition = 'stroke-dashoffset 1.3s var(--ease-io), opacity .45s var(--ease)';
    sigAccent.style.opacity = '.55';
    sigAccent.style.strokeDashoffset = -(SIG_LEN - ACC_SEG);
    setTimeout(function(){ if (sigAccent) sigAccent.style.opacity = '0'; }, 950);
  }
  var sweepTimer = null;

  function phraseIn(){ if (phraseEl) phraseEl.classList.add('is-in'); }
  function ruleIn(){ if (ruleEl) ruleEl.classList.add('is-in'); }
  function phraseSwap(){
    if (!phraseEl) return;
    phraseEl.classList.remove('is-in');
    phraseEl.classList.add('is-out');
    setTimeout(function(){
      phraseEl.textContent = greeting();
      phraseEl.classList.remove('is-out');
      void phraseEl.getBoundingClientRect();
      phraseEl.classList.add('is-in');
    }, 500);
  }

  var LOGO_START_DELAY = 500;

  if (!fastIntro){
    setTimeout(runSignature, LOGO_START_DELAY);
    setTimeout(phraseIn, LOGO_START_DELAY + 550);
    setTimeout(ruleIn,   LOGO_START_DELAY + 900);
    setTimeout(phraseSwap, LOGO_START_DELAY + SIG_DUR + 500);
    setTimeout(sigSweep, LOGO_START_DELAY + SIG_DUR + 1050);
    setTimeout(function(){ sweepTimer = setInterval(sigSweep, 4600); }, LOGO_START_DELAY);
  } else if (sigEl){
    sigLock();
    if (phraseEl){ phraseEl.textContent = greeting(); phraseEl.classList.add('is-in'); }
    ruleIn();
  }

  (function(){
    if (reduce || !innerEl || !window.matchMedia || !matchMedia('(pointer:fine)').matches) return;
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false, dead = false;
    function tick(){
      if (dead) return;
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      innerEl.style.setProperty('--px', cx.toFixed(4));
      innerEl.style.setProperty('--py', cy.toFixed(4));
      if (Math.abs(tx - cx) > .001 || Math.abs(ty - cy) > .001){ requestAnimationFrame(tick); }
      else { running = false; }
    }
    function onMove(e){
      if (dead) return;
      tx = (e.clientX / window.innerWidth  - .5) * 2;
      ty = (e.clientY / window.innerHeight - .5) * 2;
      if (!running){ running = true; requestAnimationFrame(tick); }
    }
    loader.addEventListener('pointermove', onMove);
    window.__loaderParallaxStop = function(){ dead = true; loader.removeEventListener('pointermove', onMove); };
  })();

  var revealed = false;
  function revealOnce(){ if (revealed) return; revealed = true; revealHero(); }
  if (skipBtn){
    if (fastIntro){
      skipBtn.style.display = 'none';
    } else {
      skipBtn.addEventListener('click', revealOnce);
    }
  }
  document.addEventListener('keydown', function(e){
    if (!fastIntro && (e.key === 'Escape' || e.key === 'Enter') && document.body.classList.contains('is-locked')){
      revealOnce();
    }
  });

  setTimeout(revealOnce, !loader ? 0 : (fastIntro ? 200 : LOGO_START_DELAY + 3600));

  function revealHero(){
    if (skipBtn){ skipBtn.removeEventListener('click', revealOnce); }
    if (sweepTimer){ clearInterval(sweepTimer); sweepTimer = null; }
    if (window.__loaderParallaxStop) window.__loaderParallaxStop();

    var nav       = document.getElementById('nav');
    var heroTop   = document.querySelector('.hero__top');
    var wordLeft  = document.getElementById('wordLeft');
    var wordRight = document.getElementById('wordRight');
    var hint      = document.getElementById('sculptHint');

    function revealCopy(){
      setTimeout(function(){
        if (nav) nav.classList.add('is-in');
        /* case-study pages have no hero — this is where their content reveals instead */
        if (proj){ proj.classList.add('is-open'); initCaseStudyReveals(); }
        kickReveals();
      }, 0);
      setTimeout(function(){ if (heroTop) heroTop.classList.add('is-in'); }, 120);
      setTimeout(function(){ if (wordLeft) wordLeft.classList.add('is-in'); }, 200);
      setTimeout(function(){ if (wordRight) wordRight.classList.add('is-in'); },340);
      setTimeout(function(){
        if (hint) hint.classList.add('is-in');
      }, 460);
    }

    if (sigEl && !sigEl.classList.contains('is-locked')) sigLock();

    document.body.classList.remove('is-locked');

    var revealFn = window.__sculpture ? window.__sculpture.reveal : function(cb){ cb && cb(); };

    if (!loader){
      /* no loading curtain on this page at all — reveal straight away */
      revealFn(function(){});
      revealCopy();
      return;
    }

    if (fastIntro){
      loader.classList.add('is-leaving');
      revealFn(function(){});
      revealCopy();
      setTimeout(function(){ loader.classList.add('is-gone'); }, 400);
      return;
    }

    loader.classList.add('is-leaving');
    setTimeout(function(){ revealFn(function(){}); }, 350);
    setTimeout(revealCopy, 700);
    setTimeout(function(){ loader.classList.add('is-gone'); }, 1300);
  }

  /* --- work card motion: fixed/randomised tilt + offset per card (homepage) ---
     Card content itself now lives directly in the HTML (see index.html#cards);
     this only layers on the tilted, hand-placed look. */
  (function(){
    var cardsWrap = document.getElementById('cards');
    if (!cardsWrap) return;
    var cards = cardsWrap.querySelectorAll('.card');
    function rnd(a, b){ return a + Math.random() * (b - a); }
    var fixedRot = { 0: -4, 1: 5, 2: -5, 3: 3, 4: -4, 5: 4 };
    cards.forEach(function(card, i){
      var rot = (fixedRot[i] !== undefined) ? fixedRot[i] : rnd(-6, 6);
      card.style.setProperty('--rot', rot.toFixed(2) + 'deg');
      card.style.setProperty('--ox',  rnd(-18, 18).toFixed(0) + 'px');
      card.style.setProperty('--oy',  rnd(-24, 38).toFixed(0) + 'px');
      card.style.setProperty('--sc',  rnd(0.94, 1.04).toFixed(3));
    });
  })();

  /* upgrade cards + any static page imagery (studio portrait, etc.) */
  enhanceImages(document.body);

  /* --- case-study page: scroll reveals, parallax, zoomable lightbox triggers ---
     (only relevant on /projects/*.html pages, where #proj holds the static
     case-study markup; no-ops harmlessly everywhere else) */
  var proj        = document.getElementById('proj');
  var projParallax = [];
  var projIO = null;

  function onProjScroll(){
    projParallax.forEach(function(img){
      var parent = img.parentElement;
      var r = parent.getBoundingClientRect();
      var vh  = proj.clientHeight;
      var pct = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.transform = 'translateY(' + (pct * -40).toFixed(1) + 'px)';
    });
  }
  if (proj) proj.addEventListener('scroll', onProjScroll, { passive: true });

  function initCaseStudyReveals(){
    if (!proj) return;
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        var els = proj.querySelectorAll('.proj__reveal,.proj__img--fly,.bento--fly,.bento--blur,.bento--clip,.proj__video--clip,.proj__quote-word,.proj__step--domino,.proj__print-full,.proj__video-reel,.proj__reflection-visual,.proj__reflection-accent');
        if (projIO) projIO.disconnect();
        projIO = new IntersectionObserver(function(entries){
          entries.forEach(function(en){
            if (en.isIntersecting){
              en.target.classList.add('is-vis');

              var isContainer = en.target.classList.contains('proj__bento')
                || en.target.classList.contains('proj__pkg-row')
                || en.target.classList.contains('proj__spread');
              if (isContainer) {
                en.target.querySelectorAll('.bento--clip').forEach(function(child){
                  child.classList.add('is-vis');
                });
              }
              if (en.target.classList.contains('proj__reflection-visual')) {
                en.target.querySelectorAll('.bento--blur').forEach(function(child){
                  child.classList.add('is-vis');
                });
              }

              projIO.unobserve(en.target);
            }
          });
        }, { root: proj, threshold: 0.05, rootMargin: '0px 0px 0px 0px' });

        els.forEach(function(el){
          var target = el.classList.contains('bento--clip') ? el.parentElement : el;
          projIO.observe(target);
        });

        projParallax = [];
        var pxEls = proj.querySelectorAll('.proj__parallax img');
        pxEls.forEach(function(img){ projParallax.push(img); });

        enhanceImages(proj);
        enhanceVideos(proj);

        proj.querySelectorAll('[data-zoomable]').forEach(function(el){
          el.style.cursor = 'zoom-in';
          el.addEventListener('click', function(e){
            var img = el.querySelector('img');
            if (!img) return;
            openLightbox(img.src, img.alt);
          });
        });
      });
    });
  }

  /* --- lightbox (fullscreen image viewer) --- */
  var lightbox      = document.getElementById('lightbox');
  var lightboxImg   = document.getElementById('lightboxImg');
  var lightboxClose = lightbox ? lightbox.querySelector('.lightbox__close') : null;

  var lbPrevFocus = null;
  function openLightbox(src, alt){
    if (!lightbox) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || 'Enlarged case study image';
    lightbox.setAttribute('aria-hidden', 'false');
    lbPrevFocus = document.activeElement;
    requestAnimationFrame(function(){
      lightbox.classList.add('is-open');
      if (lightboxClose) lightboxClose.focus({ preventScroll: true });
    });
  }
  function closeLightbox(){
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    setTimeout(function(){ lightboxImg.removeAttribute('src'); }, 500);
    if (lbPrevFocus && lbPrevFocus.focus) lbPrevFocus.focus({ preventScroll: true });
    lbPrevFocus = null;
  }

  /* focus trap: while the lightbox (or, on a case-study page, the page's own
     dialog-styled wrapper) is open, Tab cycles inside it */
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Tab') return;
    var container = (lightbox && lightbox.classList.contains('is-open')) ? lightbox
                  : ((proj && proj.classList.contains('is-open')) ? proj : null);
    if (!container) return;
    var f = Array.prototype.slice.call(
      container.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')
    ).filter(function(el){ return el.getClientRects().length > 0; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (!container.contains(document.activeElement)){
      e.preventDefault(); first.focus(); return;
    }
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });
  if (lightbox){
    lightbox.addEventListener('click', function(e){
      if (e.target === lightbox || e.target === lightboxClose || e.target.closest('.lightbox__close')){
        closeLightbox();
      }
    });
  }

  /* escape key closes the lightbox */
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && lightbox && lightbox.classList.contains('is-open')){
      closeLightbox();
    }
  });

  /* --- marquee --- */
  var mq = document.getElementById('marquee');
  if (mq){
    var mqWords = ['Identity','Typography','Motion','Packaging','Editorial','Caffeine','3D','Web','Rebrands','Wayfinding','Strategy'];
    function mqSpan(){
      var sp = document.createElement('span');
      mqWords.forEach(function(w){
        var b = document.createElement('b'); b.textContent = w; sp.appendChild(b);
        var dot = document.createElement('i'); sp.appendChild(dot);
      });
      return sp;
    }
    mq.appendChild(mqSpan()); mq.appendChild(mqSpan());
  }

  /* --- evergreen copyright year --- */
  var copyYearEl = document.getElementById('copyYear');
  if (copyYearEl) copyYearEl.textContent = new Date().getFullYear();

  /* --- nav active state + scroll progress --- */
  var nav      = document.getElementById('nav');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('#navLinks a'));
  var progressEl = document.getElementById('progress');

  var navSecOffsets = [];
  function refreshNavOffsets(){
    navSecOffsets = navLinks.map(function(l){
      var sec = l.dataset.sec === 'top' ? 'top' : l.dataset.sec;
      var el  = sec ? document.getElementById(sec) : null;
      return { link: l, top: el ? el.offsetTop : 0 };
    });
  }
  function onScroll(){
    var y = window.scrollY;
    if (y > 40) nav.classList.add('is-stuck'); else nav.classList.remove('is-stuck');
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (progressEl) progressEl.style.transform = 'scaleX(' + (h > 0 ? (y / h) : 0).toFixed(4) + ')';
    var mid = y + window.innerHeight * 0.42;
    var cur = navSecOffsets[0] ? navSecOffsets[0].link : navLinks[0];
    navSecOffsets.forEach(function(s){ if (mid >= s.top) cur = s.link; });
    navLinks.forEach(function(l){ l.classList.toggle('is-cur', l === cur); });
  }
  var scrollPending = false;
  window.addEventListener('scroll', function(){
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(function(){ scrollPending = false; onScroll(); });
  }, { passive: true });
  var navResizePending = false;
  window.addEventListener('resize', function(){
    if (navResizePending) return;
    navResizePending = true;
    requestAnimationFrame(function(){ navResizePending = false; refreshNavOffsets(); });
  }, { passive: true });
  refreshNavOffsets();
  onScroll();
  window.addEventListener('load', refreshNavOffsets);

  /* --- scroll reveal (IntersectionObserver) --- */
  var io = null;
  function kickReveals(){
    var els = document.querySelectorAll('.reveal:not(.in)');
    if (reduce || !('IntersectionObserver' in window)){
      els.forEach(function(e){ e.classList.add('in'); }); return;
    }
    io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function(e){ io.observe(e); });
  }

  /* --- magnetic buttons / tags --- */
  if (fine && !reduce){
    document.querySelectorAll('[data-magnetic]').forEach(function(el){
      el.addEventListener('mousemove', function(e){
        var r  = el.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width  / 2);
        var my = e.clientY - (r.top  + r.height / 2);
        el.style.transform = 'translate(' + (mx * 0.28).toFixed(1) + 'px,' + (my * 0.4).toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
    });
  }

  /* --- custom cursor --- */
  if (fine && !reduce){
    var cur = document.getElementById('cursor');
    var ct  = cur.querySelector('.cursor__t');
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy, on = false;
    var curRunning = false, curRafId = null;
    function curTick(){
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      if (Math.abs(tx - cx) > .05 || Math.abs(ty - cy) > .05){
        curRafId = requestAnimationFrame(curTick);
      } else {
        curRunning = false; curRafId = null;
      }
    }
    window.addEventListener('mousemove', function(e){
      tx = e.clientX; ty = e.clientY;
      if (!on){ on = true; cur.classList.add('is-on'); }
      if (!curRunning){ curRunning = true; curRafId = requestAnimationFrame(curTick); }
    });
    document.addEventListener('mouseover', function(e){
      if (e.target.closest('[data-cursor="look"]')){
        cur.classList.add('is-view'); cur.classList.remove('is-hover'); ct.textContent = 'View'; return;
      }
      if (e.target.closest('[data-cursor="mode"]')){
        cur.classList.add('is-hint'); cur.classList.remove('is-hover'); ct.textContent = 'Design mode'; return;
      }
      if (e.target.closest('[data-cursor],a,button')) cur.classList.add('is-hover');
    });
    document.addEventListener('mouseout', function(e){
      if (e.target.closest('[data-cursor="look"]')){ cur.classList.remove('is-view'); ct.textContent = ''; }
      else if (e.target.closest('[data-cursor="mode"]')){ cur.classList.remove('is-hint'); ct.textContent = ''; }
      else if (e.target.closest('[data-cursor],a,button')) cur.classList.remove('is-hover');
    });
    document.documentElement.addEventListener('mouseleave', function(){
      cur.classList.remove('is-on'); on = false;
    });
  }

  /* --- DESIGN MODE --- */
  (function(){
    function toggle(){ document.body.classList.toggle('design-mode'); }
    var orange = document.querySelector('.hero__word .o');
    if (orange){
      orange.setAttribute('data-cursor','mode');
      orange.addEventListener('click', toggle);
    }
    var badge = document.getElementById('dmBadge');
    if (badge) badge.addEventListener('click', toggle);
    var lastG = 0;
    document.addEventListener('keydown', function(e){
      if (e.key!=='g'&&e.key!=='G') return;
      var t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)) return;
      var now = Date.now();
      if (now - lastG < 450){ toggle(); lastG = 0; } else { lastG = now; }
    });
  })();

  /* --- LIVE LOCAL TIME + visitor offset (Contact) --- */
  (function(){
    var el = document.getElementById('contactLocal');
    if (!el) return;
    var MY_TZ='Europe/Berlin', MY_CITY='Frankfurt', fmt;
    try { fmt=new Intl.DateTimeFormat('en-GB',{timeZone:MY_TZ,hour:'2-digit',minute:'2-digit',hour12:false}); } catch(e){ fmt=null; }
    function tzOffsetHours(tz){
      var now=new Date();
      var p=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour12:false,year:'numeric',month:'2-digit',
        day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(now)
        .reduce(function(a,x){ a[x.type]=x.value; return a; },{});
      var asUTC=Date.UTC(p.year,p.month-1,p.day,p.hour==='24'?0:p.hour,p.minute,p.second);
      return Math.round((asUTC-now.getTime())/3600000);
    }
    var rel='';
    try {
      var diff=tzOffsetHours(MY_TZ)-(-new Date().getTimezoneOffset()/60);
      if(diff!==0){ var ah=Math.abs(diff),unit=ah===1?'hour':'hours';
        rel=' ('+ah+' '+unit+(diff>0?' ahead of you':' behind you')+')'; }
    } catch(e){}
    function tick(){
      var t=''; try{ if(fmt) t=fmt.format(new Date()); } catch(e){}
      if(!t){ el.textContent=''; return; }
      el.innerHTML='<i></i> It\u2019s <b>'+t+'</b> in '+MY_CITY+rel+' \u2014 I usually reply within a day.';
    }
    tick(); setInterval(tick,30000);
  })();

})();
