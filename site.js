(function(){

  /* 1 — console colophon */
  console.log(
    '%cVYARA DIMITROVA%c\nSet in Satoshi, Urbanist, IBM Plex Mono.\nInk #15130F on paper #F5F1E8. Copper #C1602E.\nSingle-file HTML/CSS, no build step. Printed on-screen, ' + new Date().getFullYear() + '.',
    'font-size:14px;font-weight:700;color:#C1602E;',
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
        '<div class="colophon-row"><span>Typefaces</span><span>Satoshi / Urbanist / IBM Plex Mono</span></div>' +
        '<div class="colophon-row"><span>Palette</span><span>Paper #F5F1E8 · Ink #15130F · Copper #C1602E</span></div>' +
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

  /* 3 — crosshair registration mark: click for a quick colour-bar flash */
  document.querySelectorAll('.card-mark').forEach((mark) => {
    mark.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const card = mark.closest('.card');
      if (!card || card.classList.contains('bars')) return;
      card.classList.add('bars');
      setTimeout(() => card.classList.remove('bars'), 950);
    });
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
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
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
      ['.card', 'View'],
      ['.next-project', 'Next'],
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
  
    /* --- nav active state + scroll progress --- */
  var nav      = document.getElementById('nav');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('#navLinks a'));

  /* 9 — magnetic hover: small pull-toward-cursor nudge on nav links, CTAs */
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0)'; });
  });

})();
