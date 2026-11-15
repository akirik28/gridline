/* Gridline FX — animated power-grid background + interaction helpers (shared). */
(function () {
  const reduce = !window.GL_BOARD && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const FX = (window.FX = {});

  /* ---------- background grid with travelling energy pulses ---------- */
  FX.grid = function (canvas, opts = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cell = opts.cell || 56;
    let w, h, dpr, cols, rows, pulses = [], mx = -999, my = -999, t = 0, boost = 0;
    const colors = opts.colors || ['#3df2ff', '#ffe14d', '#9b7bff'];
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / cell) + 1; rows = Math.ceil(h / cell) + 1;
    }
    function spawn() {
      const horiz = Math.random() < .5;
      const p = {
        horiz, dir: Math.random() < .5 ? 1 : -1,
        lane: Math.floor(Math.random() * (horiz ? rows : cols)) * cell,
        pos: 0, speed: 2.2 + Math.random() * 4.5, len: 60 + Math.random() * 140,
        c: colors[Math.random() < .72 ? 0 : (Math.random() < .6 ? 1 : 2)], life: 1
      };
      p.pos = p.dir === 1 ? -p.len : (horiz ? w : h) + p.len;
      pulses.push(p);
    }
    function frame() {
      t++;
      ctx.clearRect(0, 0, w, h);
      // grid lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(110,140,255,0.07)';
      ctx.beginPath();
      for (let x = 0; x < cols; x++) { ctx.moveTo(x * cell + .5, 0); ctx.lineTo(x * cell + .5, h); }
      for (let y = 0; y < rows; y++) { ctx.moveTo(0, y * cell + .5); ctx.lineTo(w, y * cell + .5); }
      ctx.stroke();
      // nodes near the pointer light up
      if (mx > -900) {
        for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
          const nx = x * cell, ny = y * cell, d = Math.hypot(nx - mx, ny - my);
          if (d < 220) {
            const a = 1 - d / 220;
            ctx.fillStyle = `rgba(61,242,255,${a * .8})`;
            ctx.beginPath(); ctx.arc(nx, ny, 1.2 + a * 2.4, 0, 7); ctx.fill();
          }
        }
      }
      // pulses
      const want = (opts.density || 9) + boost;
      if (pulses.length < want && Math.random() < .25) spawn();
      ctx.lineCap = 'round';
      pulses = pulses.filter(p => {
        p.pos += p.speed * p.dir * (1 + boost * .08);
        const head = p.pos, tail = p.pos - p.len * p.dir;
        const g = p.horiz
          ? ctx.createLinearGradient(tail, 0, head, 0)
          : ctx.createLinearGradient(0, tail, 0, head);
        g.addColorStop(0, 'transparent'); g.addColorStop(1, p.c);
        ctx.strokeStyle = g; ctx.lineWidth = 2;
        ctx.shadowColor = p.c; ctx.shadowBlur = 12;
        ctx.beginPath();
        if (p.horiz) { ctx.moveTo(tail, p.lane + .5); ctx.lineTo(head, p.lane + .5); }
        else { ctx.moveTo(p.lane + .5, tail); ctx.lineTo(p.lane + .5, head); }
        ctx.stroke();
        ctx.shadowBlur = 0;
        const max = p.horiz ? w : h;
        return p.dir === 1 ? tail < max + 10 : tail > -10;
      });
      boost *= .985;
      if (!reduce) requestAnimationFrame(frame);
    }
    size(); addEventListener('resize', size);
    if (fine) addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    for (let i = 0; i < 6; i++) spawn();
    frame();
    return {
      surge(n = 14) { boost = n; for (let i = 0; i < n; i++) spawn(); },
      // recolour the main pulse colour (used for the live day's colour)
      tint(c) { if (c) { colors[0] = c; pulses.forEach(p => { if (Math.random() < .6) p.c = c; }); } }
    };
  };

  /* ---------- cursor glow (desktop) ---------- */
  FX.cursor = function () {
    if (!fine || reduce) return;
    const dot = document.createElement('div'); dot.className = 'cur-dot';
    const ring = document.createElement('div'); ring.className = 'cur-ring';
    document.body.append(ring, dot);
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px,${y}px)`; }, { passive: true });
    (function loop() { rx += (x - rx) * .16; ry += (y - ry) * .16; ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); })();
    document.addEventListener('pointerover', e => { ring.classList.toggle('big', !!e.target.closest('a,button,.tilt,[data-hover]')); });
  };

  /* ---------- tilt + spotlight cards ---------- */
  FX.tilt = function (sel = '.tilt') {
    if (!fine || reduce) return;
    document.querySelectorAll(sel).forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
        el.style.transform = `perspective(900px) rotateX(${(.5 - py) * 7}deg) rotateY(${(px - .5) * 9}deg) translateZ(0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  };

  /* ---------- magnetic buttons ---------- */
  FX.magnetic = function (sel = '.btn, .mag') {
    if (!fine || reduce) return;
    document.querySelectorAll(sel).forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  };

  /* ---------- split text into animatable spans ---------- */
  FX.split = function (el, mode = 'chars') {
    const text = el.textContent; el.setAttribute('aria-label', text); el.textContent = '';
    const out = [];
    text.split(/(\s+)/).forEach(word => {
      if (/^\s+$/.test(word)) { el.append(document.createTextNode(' ')); return; }
      const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
      if (mode === 'words') { w.textContent = word; out.push(w); }
      else for (const ch of word) { const c = document.createElement('span'); c.className = 'ch'; c.textContent = ch; w.append(c); out.push(c); }
      el.append(w);
    });
    return out;
  };

  /* ---------- scramble text (decoder effect) ---------- */
  FX.scramble = function (el, final, dur = 900) {
    const glyphs = '01#%&*+=<>/\\|ABCDEFGHJKLMNPQRSTUVWXYZ';
    const start = performance.now();
    final = final ?? el.dataset.final ?? el.textContent;
    el.dataset.final = final;
    (function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      let s = '';
      for (let i = 0; i < final.length; i++) {
        s += (i < p * final.length || final[i] === ' ') ? final[i] : glyphs[(Math.random() * glyphs.length) | 0];
      }
      el.textContent = s;
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  };

  /* ---------- WebAudio blips (no files needed) ---------- */
  let ac;
  FX.audio = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());
  FX.zap = function (kind = 'up') {
    try {
      const a = FX.audio(), o = a.createOscillator(), g = a.createGain(), now = a.currentTime;
      o.type = kind === 'down' ? 'sawtooth' : 'triangle';
      o.frequency.setValueAtTime(kind === 'down' ? 600 : 180, now);
      o.frequency.exponentialRampToValueAtTime(kind === 'down' ? 40 : 1400, now + (kind === 'down' ? 1.2 : .35));
      g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(.25, now + .03);
      g.gain.exponentialRampToValueAtTime(.0001, now + (kind === 'down' ? 1.3 : .45));
      o.connect(g).connect(a.destination); o.start(now); o.stop(now + 1.4);
    } catch (e) {}
  };
  FX.reduce = reduce; FX.fine = fine;
})();

/* ===================================================================
   Gridline motion pack — illustrated SVG "hero art" per step kind,
   screen sweeps, spark bursts and charge-up helpers. Uses Motion.
   =================================================================== */
(function () {
  const FX = window.FX, M = window.Motion || {};
  const reduce = FX.reduce;
  const NS = 'http://www.w3.org/2000/svg';
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- SVG art per kind ---------- */
  const ART = {
    welcome: () => `
      <g class="a-rings"><circle cx="120" cy="100" r="34"/><circle cx="120" cy="100" r="58"/><circle cx="120" cy="100" r="82"/></g>
      <g class="a-orbit"><circle cx="120" cy="18" r="4"/><circle cx="202" cy="100" r="3"/><circle cx="62" cy="158" r="3.5"/></g>
      <path class="a-draw a-bolt" pathLength="1" d="M128 44 98 104h22l-8 52 34-66h-22z"/>`,
    en: () => `
      <rect class="a-draw" pathLength="1" x="46" y="58" width="132" height="84" rx="14"/>
      <rect class="a-fill" x="180" y="84" width="12" height="32" rx="4"/>
      ${[0, 1, 2, 3].map(i => `<rect class="a-cell" x="${56 + i * 30}" y="68" width="22" height="64" rx="6"/>`).join('')}
      <path class="a-bolt2" d="M126 40 104 92h18l-6 44 28-56h-18z"/>`,
    tb: () => {
      const pts = [[120, 26], [184, 62], [184, 138], [120, 174], [56, 138], [56, 62]];
      const lines = pts.map((p, i) => { const q = pts[(i + 1) % 6]; return `<path class="a-draw" pathLength="1" d="M${p[0]} ${p[1]}L${q[0]} ${q[1]}"/>`; }).join('')
        + pts.map(p => `<path class="a-draw a-thin" pathLength="1" d="M120 100L${p[0]} ${p[1]}"/>`).join('');
      const route = 'M' + pts.map(p => p.join(' ')).join('L') + 'Z';
      return lines + pts.map(p => `<circle class="a-node" cx="${p[0]}" cy="${p[1]}" r="9"/>`).join('') +
        `<circle class="a-node a-hub" cx="120" cy="100" r="14"/>
         <circle class="a-sig" r="5"><animateMotion dur="3.2s" repeatCount="indefinite" path="${route}"/></circle>
         <circle class="a-sig v" r="4"><animateMotion dur="2.4s" begin="1s" repeatCount="indefinite" path="M120 100L184 62L120 100L56 138L120 100"/></circle>`;
    },
    cw: () => {
      // 2x2 puzzle: squares with knobs
      const P = (x, y, k) => `<g class="a-piece" data-k="${k}"><rect x="${x}" y="${y}" width="58" height="58" rx="8"/></g>`;
      return P(63, 43, 0) + P(123, 43, 1) + P(63, 103, 2) + P(123, 103, 3) +
        `<g class="a-knobs"><circle cx="121" cy="72" r="9"/><circle cx="92" cy="101" r="9"/><circle cx="152" cy="101" r="9"/><circle cx="121" cy="132" r="9"/></g>
         <path class="a-draw a-check" pathLength="1" d="M98 100l16 16 30-34"/>`;
    },
    topic: () => {
      let s = '';
      [44, 100, 156].forEach((x, r) => {
        s += `<rect class="a-draw" pathLength="1" x="${x}" y="30" width="44" height="142" rx="6"/>`;
        for (let j = 0; j < 6; j++) {
          s += `<path class="a-slot" d="M${x + 6} ${44 + j * 21}h22"/>`;
          s += `<circle class="a-led" cx="${x + 36}" cy="${44 + j * 21}" r="3" style="animation-delay:${(Math.random() * 2).toFixed(2)}s;animation-duration:${(0.6 + Math.random() * 1.4).toFixed(2)}s"/>`;
        }
      });
      s += `<path class="a-air" d="M20 186 C60 176 90 196 120 186 S180 176 220 186"/>`;
      return s;
    },
    ga: () => {
      let s = '';
      const rows = [[46, 9], [66, 12], [86, 15], [106, 18]];
      rows.forEach(([r, n], ri) => {
        for (let i = 0; i < n; i++) {
          const a = Math.PI * (i / (n - 1)), x = 120 - Math.cos(a) * r * 1.0, y = 170 - Math.sin(a) * r * 1.2;
          s += `<circle class="a-seat" data-a="${(i / (n - 1)).toFixed(3)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${4 + ri * .5}"/>`;
        }
      });
      s += `<rect class="a-fill" x="104" y="166" width="32" height="16" rx="4"/><path class="a-draw" pathLength="1" d="M20 186H220"/>`;
      return s;
    }
  };

  FX.art = function (host, kind) {
    const stops = [];
    host.innerHTML = '';
    const key = ART[kind] ? kind : 'welcome';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 240 200'); svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('art', 'art-' + key);
    svg.innerHTML = ART[key]();
    host.append(svg);
    if (!M.animate) return () => {};
    const A = (t, k, o) => { const c = M.animate(t, k, o); stops.push(c); return c; };
    const q = s => [...svg.querySelectorAll(s)];
    const loop = { repeat: Infinity };
    // everything draws in
    A(q('.a-draw'), { strokeDashoffset: [1, 0] }, { duration: reduce ? 0 : 1.1, delay: M.stagger(.08, { startDelay: .2 }), ease: [.6, 0, .2, 1] });
    A(svg, { opacity: [0, 1], scale: [.85, 1] }, { duration: .6 });
    if (reduce) return () => stops.forEach(s => s.stop && s.stop());

    if (key === 'welcome') {
      q('.a-rings circle').forEach((c, i) => A(c, { scale: [.8, 1.25], opacity: [.9, 0] }, { ...loop, duration: 2.4, delay: i * .8, ease: 'easeOut' }));
      A(svg.querySelector('.a-orbit'), { rotate: [0, 360] }, { ...loop, duration: 14, ease: 'linear' });
      A(svg.querySelector('.a-bolt'), { fillOpacity: [0, 1, .6, 1] }, { duration: 1.2, delay: 1.1 });
    }
    if (key === 'en') {
      q('.a-cell').forEach((c, i) => A(c, { opacity: [.12, 1, 1, .12] }, { ...loop, duration: 2.6, times: [0, .15 + i * .12, .85, 1], delay: .9, ease: 'easeInOut' }));
      A(svg.querySelector('.a-bolt2'), { scale: [1, 1.18, 1], opacity: [.6, 1, .6] }, { ...loop, duration: 1.3, ease: 'easeInOut' });
    }
    if (key === 'tb') {
      A(q('.a-node'), { scale: [0, 1] }, { delay: M.stagger(.09, { startDelay: .5 }), type: 'spring', bounce: .6 });
      q('.a-node').forEach((n, i) => A(n, { opacity: [1, .45, 1] }, { ...loop, duration: 1.8, delay: 1.4 + i * .3 }));
    }
    if (key === 'cw') {
      const from = [[-70, -50], [70, -50], [-70, 50], [70, 50]];
      q('.a-piece').forEach((p, i) => A(p, { x: [from[i][0], 0], y: [from[i][1], 0], rotate: [rnd(-40, 40), 0], opacity: [0, 1] }, { delay: .25 + i * .14, type: 'spring', bounce: .45, duration: .9 }));
      A(svg.querySelector('.a-knobs'), { opacity: [0, 1] }, { delay: 1.1 });
      // one piece lifts and snaps back, forever
      const pcs = q('.a-piece');
      let k = 0, alive = true;
      stops.push({ stop() { alive = false; } });
      (async function wiggle() {
        await new Promise(r => setTimeout(r, 1800));
        while (alive) {
          const p = pcs[k++ % 4];
          await M.animate(p, { y: [0, -14, 0], rotate: [0, rnd(-8, 8), 0] }, { duration: .7, ease: 'easeInOut' });
          if (!alive) break;
          M.animate(svg.querySelector('.a-check'), { strokeDashoffset: [1, 0], opacity: [1, 1, 0] }, { duration: 1.1 });
          await new Promise(r => setTimeout(r, 1300));
        }
      })();
    }
    if (key === 'topic') {
      A(svg.querySelector('.a-air'), { strokeDashoffset: [0, -40] }, { ...loop, duration: 1.2, ease: 'linear' });
    }
    if (key === 'ga') {
      const seats = q('.a-seat');
      A(seats, { scale: [0, 1] }, { delay: M.stagger(.012, { startDelay: .3 }), type: 'spring', bounce: .5 });
      seats.forEach(s => A(s, { fillOpacity: [.15, 1, .15] }, { ...loop, duration: 2.8, delay: 1 + (+s.dataset.a) * 1.4, ease: 'easeInOut' }));
    }
    return () => stops.forEach(s => s && s.stop && s.stop());
  };

  /* ---------- full-screen electric sweep (step transitions) ---------- */
  FX.sweep = function (color = '#3df2ff', dir = 1) {
    if (reduce || !M.animate) return Promise.resolve();
    const el = document.createElement('div');
    el.className = 'fx-sweep';
    el.style.setProperty('--c', color);
    el.innerHTML = '<i></i><b></b>';
    document.body.append(el);
    const line = el.querySelector('i'), wash = el.querySelector('b');
    M.animate(wash, { opacity: [0, .5, 0] }, { duration: .55 });
    return M.animate(line, { x: dir > 0 ? ['-10vw', '110vw'] : ['110vw', '-10vw'] }, { duration: .55, ease: [.7, 0, .3, 1] })
      .then(() => el.remove());
  };

  /* ---------- crackling bolts across a fixed overlay ---------- */
  FX.bolts = function (host, color = '#3df2ff', n = 5) {
    if (reduce || !M.animate || !host) return;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('fx-bolts'); svg.style.setProperty('--c', color);
    for (let i = 0; i < n; i++) {
      let x = rnd(5, 95), y = 0, d = `M${x} ${y}`;
      while (y < 100) { y += rnd(6, 14); x += rnd(-8, 8); d += `L${x.toFixed(1)} ${Math.min(y, 100).toFixed(1)}`; }
      const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('pathLength', '1');
      svg.append(p);
      M.animate(p, { strokeDashoffset: [1, 0], opacity: [1, 1, 0] }, { duration: .5, delay: i * .07, ease: 'easeOut' });
    }
    host.append(svg);
    setTimeout(() => svg.remove(), 1200);
  };

  /* ---------- spark burst from a point (fixed coords) ---------- */
  FX.sparks = function (x, y, color = '#ffe14d', n = 14) {
    if (reduce || !M.animate) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.className = 'fx-spark'; s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.setProperty('--c', color);
      document.body.append(s);
      const a = rnd(0, Math.PI * 2), d = rnd(30, 110);
      M.animate(s, { x: [0, Math.cos(a) * d], y: [0, Math.sin(a) * d + 20], scale: [1, 0], opacity: [1, 0] }, { duration: rnd(.5, .9), ease: [.1, .7, .3, 1] })
        .then(() => s.remove());
    }
  };

  /* ---------- ripple inside an element ---------- */
  FX.ripple = function (el, e, color) {
    if (reduce || !M.animate || !el) return;
    const r = el.getBoundingClientRect();
    const x = (e && e.clientX ? e.clientX : r.left + r.width / 2) - r.left, y = (e && e.clientY ? e.clientY : r.top + r.height / 2) - r.top;
    const d = document.createElement('span'); d.className = 'fx-ripple';
    const size = Math.hypot(r.width, r.height) * 2;
    Object.assign(d.style, { left: x - size / 2 + 'px', top: y - size / 2 + 'px', width: size + 'px', height: size + 'px' });
    if (color) d.style.setProperty('--c', color);
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.append(d);
    M.animate(d, { scale: [0, 1], opacity: [.55, 0] }, { duration: .8, ease: 'easeOut' }).then(() => d.remove());
  };
})();
