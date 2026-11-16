/* Gridline — the projector board (open /board/ on the smartboard). It follows the live step automatically;
   the chair console can switch it to Timer / Groups / QR / Blank. Only public things ever appear here. */
(function () {
  if (!window.GL_BOARD) return;
  const C = window.GRIDLINE;
  const { animate, stagger } = window.Motion;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: false } });
  const JOIN = 'https://akirik28.github.io/gridline/';

  const st = document.createElement('style');
  st.textContent = `
  html.board .nav, html.board .stepnav, html.board .drawer, html.board .cur-dot, html.board .cur-ring { display: none !important; }
  html.board, html.board body { height: 100%; overflow: hidden !important; }
  html.board .stage { max-width: none; margin: 0; padding: 0; position: fixed; inset: 0; overflow: hidden; }
  html.board #step { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
  html.board .bd-left, html.board .bd-right { min-width: 0; position: relative; }
  html.board .st-content::before, html.board #st-timer { display: none !important; }
  /* page 1: title + rules, big */
  html.board #step.pg0 .bd-right { display: none; }
  html.board #to-video { display: none; } /* the topic video plays full-screen via the chair's 🎬 Video */
  html.board .st-art { position: relative; float: right; right: auto; top: auto; width: 330px; margin: 10px 0 24px 48px; }
  html.board .st-title, html.board .st-rules { position: relative; z-index: 1; }
  html.board .bd-left::after { content: ''; display: block; clear: both; }
  html.board .st-title { font-size: 120px; max-width: 16ch; }
  html.board .st-meta { font-size: 18px; } html.board .st-kind { font-size: 18px; padding: 10px 18px 10px 14px; } html.board .st-kind i { font-size: 24px; }
  html.board .st-rules { max-width: none; gap: 22px; margin-top: 48px; }
  html.board .st-rules li { font-size: 34px; padding: 22px 28px 22px 22px; grid-template-columns: 56px 1fr; gap: 22px; }
  html.board .st-rules li::before { width: 56px; height: 56px; font-size: 22px; border-radius: 16px; }
  /* page 2: small title on top, then the content / game */
  html.board #step.pg1 .st-rules, html.board #step.pg1 .st-art, html.board #step.pg1 .st-meta { display: none; }
  html.board #step.pg1 .st-title { font-size: 54px; max-width: none; margin-top: 10px; }
  html.board #step.pg1 .bd-right { margin-top: 40px; }
  html.board .bd-right .st-content, html.board .bd-right .st-ia { margin-top: 0 !important; padding-top: 0; border-top: 0; }
  html.board .bd-right .st-content + .st-ia:not([hidden]) { margin-top: 40px !important; }
  html.board .bd-right.both { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); column-gap: 56px; align-items: start; }
  html.board .bd-right.both .st-ia { margin-top: 0 !important; }
  html.board .st-ia.multi { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 40px; align-items: start; }
  /* template text sized in px (the page is scaled as a whole) */
  html.board .bd-right .hero-title { font-size: 150px; margin-top: 0; }
  html.board .bd-right .hero-sub { font-size: 28px; } html.board .bd-right .hero-q { font-size: 44px; }
  html.board .bd-right .stat b { font-size: 44px; } html.board .bd-right .chair-card h3 { font-size: 32px; }
  html.board .bd-right .sec-title { font-size: 80px; } html.board .bd-right .sec-lead { font-size: 22px; } html.board .bd-right .h3 { font-size: 30px; }
  html.board .bd-right .topic-q { padding: 40px; } html.board .bd-right .topic-q p { font-size: 34px; }
  html.board .bd-right .fact-n { font-size: 64px; } html.board .bd-right .vc-placeholder h3 { font-size: 40px; }
  html.board .bd-right .conflict h3 { font-size: 28px; } html.board .bd-right .blackout b { font-size: 150px; }
  html.board .bd-right .cy-center b { font-size: 80px; } html.board .bd-right .lego-out { font-size: 24px; }
  html.board .bd-right .mq-track { font-size: 22px; } html.board .bd-right .game-hero, html.board .bd-right .lego, html.board .bd-right .check { padding: 32px; }
  .bd-ov { position: fixed; inset: 0; z-index: 9000; display: grid; place-items: center; padding: 4vh 4vw; background: #04060d; }
  .bd-ov[hidden] { display: none; }
  .bd-ov::before { content: ''; position: absolute; inset: 0; background: radial-gradient(60% 50% at 50% 50%, rgba(61,242,255,.10), transparent 70%); pointer-events: none; }
  .bd-k { font: 500 clamp(14px, 1.4vw, 22px) var(--f-mono); letter-spacing: .3em; color: var(--cyan); text-transform: uppercase; text-align: center; }
  .bd-timer { position: relative; display: grid; place-items: center; width: min(78vh, 80vw); aspect-ratio: 1; }
  .bd-timer svg { position: absolute; inset: 0; transform: rotate(-90deg); }
  .bd-t { font: 800 clamp(80px, 18vh, 220px) var(--f-mono); letter-spacing: -.04em; }
  .bd-tl { margin-top: -2vh; }
  .bd-timer.warn .bd-t { color: var(--volt); } .bd-timer.done .bd-t { color: var(--pink); animation: bdBlink 1s steps(2) infinite; }
  @keyframes bdBlink { 50% { opacity: .3; } }
  .bd-groups { display: grid; grid-template-columns: repeat(var(--n, 4), minmax(0, 1fr)); gap: 32px; width: 1600px; }
  .bd-col { padding: 26px 24px; border-radius: 26px; border: 2px solid var(--c); background: color-mix(in srgb, var(--c) 8%, #0b1020); box-shadow: 0 0 40px color-mix(in srgb, var(--c) 25%, transparent); }
  .bd-col h3 { margin: 0; display: flex; align-items: center; gap: 14px; font-size: 44px; white-space: nowrap; }
  .bd-col h3 b { width: 1.6em; height: 1.6em; border-radius: 14px; display: grid; place-items: center; background: var(--c); color: #04060d; }
  .bd-col p { margin: 10px 0 18px; color: var(--ink-2); font-size: 22px; line-height: 1.25; }
  .bd-card { margin-top: 12px; padding: 16px 18px; border-radius: 16px; background: rgba(255,255,255,.06); font-weight: 700; font-size: 34px; line-height: 1.15; }
  .bd-qr { display: grid; grid-template-columns: auto auto; gap: 5vw; align-items: center; }
  .bd-qr .q { width: min(60vh, 42vw); aspect-ratio: 1; padding: 4%; border-radius: 32px; background: #fff; box-shadow: 0 0 0 3px var(--cyan), 0 0 90px rgba(61,242,255,.45); }
  .bd-qr .q svg { width: 100%; height: 100%; display: block; }
  .bd-qr h2 { margin: 12px 0 18px; font-size: clamp(48px, 7vw, 130px); line-height: .9; font-weight: 900; }
  .bd-qr .u { font: 500 clamp(20px, 2.4vw, 40px) var(--f-mono); padding: 14px 22px; border-radius: 18px; border: 1px solid var(--line-2); display: inline-block; }
  .bd-blank { text-align: center; }
  .bd-blank b { display: block; font-size: 240px; font-weight: 900; letter-spacing: .02em; background: linear-gradient(100deg, var(--cyan), var(--volt), var(--pink)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .bd-energy { position: fixed; z-index: 9100; left: 0; right: 0; bottom: 3vh; margin: 0 auto; width: fit-content; max-width: min(92vw, 1500px); box-sizing: border-box; display: flex; align-items: center; gap: 22px; padding: 2vh 3vw; border-radius: 999px; border: 3px solid transparent;
    background: linear-gradient(#0b1020, #0b1020) padding-box, linear-gradient(120deg, #ff3d7f, #ff9a3d, #ffe14d, #4dffa6, #3df2ff) border-box; box-shadow: 0 0 60px rgba(77,255,166,.35); font-size: 4.2vh; font-weight: 800; line-height: 1.15; }
  .bd-energy b { min-width: 0; }
  .bd-energy span { white-space: nowrap; }
  .bd-energy[hidden] { display: none; }
  html.bd-en .bd-ov { padding-bottom: 17vh; }
  html.bd-en .bd-qr .q { width: min(50vh, 38vw); }
  html.bd-en .bd-timer { width: min(64vh, 70vw); }
  html.bd-en.board .stage { padding-bottom: 18vh; }
  .bd-energy i { font-style: normal; font-size: 1.4em; }
  .bd-energy span { font-family: var(--f-mono); color: var(--green); }`;
  document.head.append(st);

  const ov = document.createElement('div'); ov.className = 'bd-ov'; ov.hidden = true;
  const en = document.createElement('div'); en.className = 'bd-energy'; en.hidden = true;
  en.innerHTML = '<i>🔋</i><b>Grab your phone — how charged are you?</b><span></span>';
  document.body.append(ov, en);

  /* ---------- fit everything to the screen ---------- */
  const step = $('#step');
  const left = document.createElement('div'), right = document.createElement('div');
  left.className = 'bd-left'; right.className = 'bd-right';
  ['#st-meta', '.st-meta', '#st-kind', '#st-title', '#st-rules', '#st-timer'].forEach(q => { const e = step.querySelector(q); if (e && e.parentNode === step) left.append(e); });
  ['#st-content', '#st-ia'].forEach(q => { const e = step.querySelector(q); if (e) right.append(e); });
  step.prepend(left); step.append(right);
  const PAD = () => ({ x: Math.round(innerWidth * .06), top: Math.round(innerHeight * .07), bot: Math.round(innerHeight * (document.documentElement.classList.contains('bd-en') ? .18 : .07)) });
  let page = 0, pageStep = -1;
  const BASE = 1600, MAXS = 3.2;
  function fitStep() {
    if (!ov.hidden) return;
    const cE = $('#st-content'), iE = $('#st-ia');
    const cOn = cE && !cE.hidden && cE.childElementCount > 0, iOn = iE && !iE.hidden && iE.childElementCount > 0;
    const p2 = page === 1 && pageStep === window.GL_liveStep && (cOn || iOn);
    step.classList.toggle('pg0', !p2); step.classList.toggle('pg1', p2);
    const canMulti = p2 && iOn && iE.querySelectorAll(':scope > .ia-slot').length > 1, canBoth = p2 && cOn && iOn;
    const p = PAD(), W = innerWidth - 2 * p.x, H = innerHeight - p.top - p.bot;
    step.style.transform = 'none';
    const layouts = [[false, false]];
    if (canBoth) layouts.push([true, false]);
    if (canMulti) layouts.push([false, true]);
    let best = null;
    for (const [both, multi] of layouts) {
      right.classList.toggle('both', both); iE && iE.classList.toggle('multi', multi);
      // lay the page out at a few canvas widths and keep the one that can be drawn biggest
      for (const k of [.62, .72, .82, .92, 1, 1.12, 1.25, 1.4, 1.6, 1.85, 2.1]) {
        const ww = Math.round(BASE * k); step.style.width = ww + 'px';
        const realW = Math.max(ww, step.scrollWidth, left.scrollWidth + left.offsetLeft, right.scrollWidth + right.offsetLeft);
        const hh = step.offsetHeight, sc = Math.min(MAXS, W / realW, H / hh);
        if (!best || sc > best.sc + .01) best = { both, multi, w: ww, sc, h: hh };
      }
    }
    right.classList.toggle('both', best.both); iE && iE.classList.toggle('multi', best.multi);
    step.style.width = best.w + 'px';
    const sc = best.sc, w = best.w;
    step.style.transform = `translate(${Math.round((innerWidth - w * sc) / 2)}px, ${Math.round(p.top + Math.max(0, (H - best.h * sc) / 2))}px) scale(${sc})`;
  }
  function fitOv() {
    const el = ov.firstElementChild; if (ov.hidden || !el) return;
    el.style.transform = 'none';
    const p = PAD(), W = innerWidth - 2 * p.x, H = innerHeight - p.top - p.bot;
    const sc = Math.min(MAXS, W / el.offsetWidth, H / el.offsetHeight);
    el.style.transformOrigin = '50% 50%';
    el.style.transform = `translateY(${Math.round((p.top - p.bot) / 2)}px) scale(${sc})`;
  }
  let fitT = 0;
  const fit = () => { clearTimeout(fitT); fitT = setTimeout(() => { fitStep(); fitOv(); }, 60); };
  new MutationObserver(fit).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  addEventListener('resize', fit);
  setInterval(() => { fitStep(); fitOv(); }, 3000);
  window.GL_boardFit = () => { fitStep(); fitOv(); };

  /* ---------- modes ---------- */
  let mode = 'step', data = {}, tInt = null;
  const fmt = s => { s = Math.max(0, Math.ceil(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  function timer() {
    const R = 180, CIRC = 2 * Math.PI * R;
    ov.innerHTML = `<div><div class="bd-timer" id="bd-timer"><svg viewBox="0 0 400 400"><circle cx="200" cy="200" r="${R}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="16"/>
      <circle id="bd-run" cx="200" cy="200" r="${R}" fill="none" stroke="var(--cyan)" stroke-width="16" stroke-linecap="round" stroke-dasharray="${CIRC}" style="filter:drop-shadow(0 0 14px var(--cyan))"/></svg>
      <div style="text-align:center"><div class="bd-t" id="bd-t"></div><div class="bd-k bd-tl">${esc(data.label || 'TIMER')}</div></div></div></div>`;
    const run = $('#bd-run', ov), t = $('#bd-t', ov), box = $('#bd-timer', ov);
    const tick = () => {
      const total = +data.total || 1, left = data.running ? (data.endAt - Date.now()) / 1000 : (+data.left || 0);
      t.textContent = fmt(left);
      run.style.strokeDashoffset = CIRC * (1 - Math.max(0, left) / total);
      run.style.stroke = left <= 0 ? 'var(--pink)' : left <= 120 ? 'var(--volt)' : 'var(--cyan)';
      box.classList.toggle('warn', left <= 120 && left > 0); box.classList.toggle('done', left <= 0);
    };
    tick(); tInt = setInterval(tick, 250);
  }
  function groups() {
    const g = Array.isArray(data.groups) ? data.groups : [];
    if (!g.length) { ov.innerHTML = '<div class="bd-k">Groups coming up…</div>'; return; }
    ov.innerHTML = `<div class="bd-groups" style="--n:${g.length}">${g.map(c => `<div class="bd-col" style="--c:${esc(c.c)}"><h3><b>${esc(c.L)}</b>Group ${esc(c.L)}</h3><p>${esc(c.t)}</p>${(c.names || []).map(n => `<div class="bd-card">${esc(n)}</div>`).join('')}</div>`).join('')}</div>`;
    animate(ov.querySelectorAll('.bd-col'), { opacity: [0, 1], y: [-40, 0] }, { delay: stagger(.08) });
    animate(ov.querySelectorAll('.bd-card'), { opacity: [0, 1], scale: [.4, 1] }, { delay: stagger(.05, { startDelay: .3 }) });
  }
  function qr() {
    let svg = '';
    if (window.qrcode) { const q = qrcode(0, 'M'); q.addData(JOIN); q.make(); const n = q.getModuleCount(); let r = ''; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`; svg = `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><g fill="#04060d">${r}</g></svg>`; }
    ov.innerHTML = `<div class="bd-qr"><div class="q">${svg}</div><div><div class="bd-k" style="text-align:left">ITRE · Gridline</div><h2>Scan to<br>plug in</h2><div class="u">akirik28.github.io/gridline</div></div></div>`;
  }
  /* VIDEO: the chair picks a video and plays / pauses / restarts it from the console */
  const VIDS = {
    water: ['video/water-energy.mp4?v=1', 'video/water-energy-poster.jpg?v=1'],
    eu: ['video/eu-basics.mp4?v=1', 'video/eu-basics-poster.jpg?v=1'],
    to: ['video/itre-to.mp4?v=3', 'video/itre-to-poster.jpg?v=3'],
    blackout: ['video/blackout.mp4?v=3', 'video/blackout-poster.jpg?v=1'],
  };
  const vCss = document.createElement('style');
  vCss.textContent = `.bd-vbox { position: absolute; left: 50%; top: 50%; margin: -450px 0 0 -800px; width: 1600px; height: 900px; }
  .bd-vbox video { width: 100%; height: 100%; border-radius: 18px; background: #000; box-shadow: 0 0 80px rgba(61,242,255,.25); }
  .bd-vplay { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 28px 56px; border-radius: 999px; border: 0; background: var(--cyan, #3df2ff); color: #04060d; font: 900 54px var(--f-sans, sans-serif); cursor: pointer; box-shadow: 0 0 60px rgba(61,242,255,.6); }
  .bd-vplay[hidden] { display: none; }`;
  document.head.append(vCss);
  function video() {
    const k = VIDS[data.v] ? data.v : 'water', it = VIDS[k];
    let v = ov.querySelector('video.bd-v');
    if (!v || v.dataset.k !== k) {
      ov.innerHTML = `<div class="bd-vbox"><video class="bd-v" data-k="${k}" playsinline controls preload="auto" poster="${it[1]}" src="${it[0]}"></video><button class="bd-vplay" hidden>▶ Tap to play</button></div>`;
      v = ov.querySelector('video.bd-v');
      const b = ov.querySelector('.bd-vplay');
      b.addEventListener('click', () => { v.play().then(() => { b.hidden = true; }).catch(() => {}); });
      v.addEventListener('play', () => { b.hidden = true; });
    }
    const b = ov.querySelector('.bd-vplay');
    const go = () => v.play().then(() => { b.hidden = true; }).catch(() => { b.hidden = false; });
    if (data.cmd === 'pause') v.pause();
    else if (data.cmd === 'restart') { v.currentTime = 0; go(); }
    else if (data.cmd === 'play') go();
  }
  /* CONFLICT: one of the 4 key conflicts (or all 4) as a post-it wall */
  const CFS = {
    A: ['#3df2ff', 'Competitiveness <i>vs</i> climate', 'More AI in Europe', 'Climate neutral by 2050', 'Should growth wait for clean energy — or the other way round?'],
    B: ['#ffe14d', 'The grid <i>&amp;</i> local people', 'Jobs, tax, investment', 'Power, water, land, noise', 'Who should be first in the queue for the grid?'],
    C: ['#ff3d7f', 'Transparency <i>vs</i> trade secrets', 'Public right to know', 'Company secrets', 'What exactly should be public, and to whom?'],
    D: ['#4dffa6', 'Voluntary <i>vs</i> binding', 'Industry pledges', 'Hard EU law', 'Carrot, stick — or both?'],
  };
  const cCss = document.createElement('style');
  cCss.textContent = `.bd-cbox { position: absolute; left: 50%; top: 50%; margin: -450px 0 0 -800px; width: 1600px; height: 900px; display: flex; flex-direction: column; text-align: left; }
  .bd-cf { flex: 1; display: flex; flex-direction: column; border: 3px solid var(--c); border-top-width: 26px; border-radius: 28px; background: rgba(255,255,255,.03); overflow: hidden; }
  .bd-cf-h { display: flex; align-items: center; gap: 36px; padding: 30px 40px 26px; border-bottom: 4px dashed rgba(255,255,255,.18); background: color-mix(in srgb, var(--c) 9%, transparent); }
  .bd-cf-l { flex: none; width: 150px; height: 150px; border-radius: 36px; background: var(--c); color: #04060d; display: grid; place-items: center; font: 900 112px/1 var(--f-sans, sans-serif); box-shadow: 0 0 50px color-mix(in srgb, var(--c) 55%, transparent); }
  .bd-cf-k { font: 500 20px var(--f-mono, monospace); letter-spacing: .25em; color: var(--c); }
  .bd-cf h2 { margin: 6px 0 0; font-size: 82px; line-height: 1; font-weight: 900; letter-spacing: -.02em; }
  .bd-cf h2 i { font-style: normal; color: var(--ink-2, #b6c0e3); font-weight: 700; }
  .bd-cf-b { display: flex; gap: 18px; align-items: center; margin-top: 18px; font: 700 28px var(--f-sans, sans-serif); }
  .bd-cf-b span { padding: 10px 22px; border-radius: 14px; border: 2px solid var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
  .bd-cf-q { margin: 16px 0 0; font: 600 28px var(--f-mono, monospace); color: var(--ink-2, #b6c0e3); }
  .bd-cf-z { flex: 1; display: grid; place-items: center; font: 800 40px var(--f-sans, sans-serif); color: rgba(255,255,255,.14); text-align: center; }
  .bd-cf-z small { display: block; margin-top: 10px; font: 500 20px var(--f-mono, monospace); letter-spacing: .2em; }
  .bd-call { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
  .bd-call .bd-cf-h { flex-direction: column; align-items: flex-start; gap: 16px; padding: 22px 24px 20px; min-height: 330px; }
  .bd-call .bd-cf-l { width: 96px; height: 96px; font-size: 70px; border-radius: 24px; }
  .bd-call h2 { font-size: 36px; }
  .bd-call .bd-cf-h > div { min-width: 0; width: 100%; }
  .bd-call .bd-cf-q { font-size: 20px; margin-top: 10px; }
  .bd-call .bd-cf-z { font-size: 26px; }`;
  document.head.append(cCss);
  function conflict() {
    const one = L => { const [col, t, a, b, q] = CFS[L]; return `<div class="bd-cf" style="--c:${col}"><div class="bd-cf-h"><div class="bd-cf-l">${L}</div><div><div class="bd-cf-k">KEY CONFLICT ${L}</div><h2>${t}</h2><div class="bd-cf-b"><span>${a}</span>⚖<span>${b}</span></div><p class="bd-cf-q">→ ${q}</p></div></div><div class="bd-cf-z"><div>Stick the problems here<small>DUPLICATES → STACK THEM</small></div></div></div>`; };
    const small = L => { const [col, t, , , q] = CFS[L]; return `<div class="bd-cf" style="--c:${col}"><div class="bd-cf-h"><div class="bd-cf-l">${L}</div><div><h2>${t}</h2><p class="bd-cf-q">→ ${q}</p></div></div><div class="bd-cf-z"><div>Post-its ↓</div></div></div>`; };
    const c = String(data.c || 'all').toUpperCase();
    ov.innerHTML = CFS[c] ? `<div class="bd-cbox">${one(c)}</div>` : `<div class="bd-cbox"><div class="bd-call">${'ABCD'.split('').map(small).join('')}</div></div>`;
    animate(ov.querySelectorAll('.bd-cf'), { opacity: [0, 1], y: [40, 0] }, { delay: stagger(.08) });
  }
  function blank() { ov.innerHTML = '<div class="bd-blank"><div class="bd-k">ITRE · EYP Mersin 2026</div><b>GRIDLINE</b></div>'; }
  function apply(row) {
    if (!row) return;
    const same = row.mode === mode && JSON.stringify(row.data) === JSON.stringify(data);
    if (same) return;
    mode = row.mode; data = row.data || {};
    clearInterval(tInt); tInt = null;
    if (mode !== 'video') { const ov_v = ov.querySelector('video.bd-v'); if (ov_v) { ov_v.pause(); ov.innerHTML = ''; } }
    if (mode === 'step') { page = +data.page || 0; pageStep = typeof data.step === 'number' ? data.step : -1; ov.hidden = true; ov.innerHTML = ''; setTimeout(fitStep, 50); return; }
    ov.hidden = false;
    const wasVid = !!ov.querySelector('video.bd-v') && mode === 'video';
    if (mode !== 'video') ov.innerHTML = '';
    ({ timer, groups, qr, blank, video, conflict }[mode] || blank)();
    requestAnimationFrame(fitOv); setTimeout(fitOv, 50);
    if (mode !== 'timer' && !wasVid) animate(ov, { opacity: [0, 1] }, { duration: .4 });
  }
  window.GL_boardApply = apply; // handy for testing in the console
  async function pull() { const { data: row } = await sb.from('gridline_board').select('mode, data').eq('id', 1).maybeSingle(); apply(row); }
  sb.channel('gridline-board').on('postgres_changes', { event: '*', schema: 'public', table: 'gridline_board' }, p => p.new && apply(p.new)).subscribe();
  pull(); setInterval(pull, 8000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });

  /* ---------- DEBRIEF: big happy full screen (count only, never answers) ---------- */
  const dbCss = document.createElement('style');
  dbCss.textContent = `
  .bd-db { position: fixed; inset: 0; z-index: 9200; display: grid; place-items: center; text-align: center; overflow: hidden;
    background: radial-gradient(70% 60% at 50% 45%, rgba(155,123,255,.28), transparent 70%), radial-gradient(50% 40% at 20% 80%, rgba(255,61,127,.22), transparent 70%), radial-gradient(50% 40% at 85% 20%, rgba(61,242,255,.22), transparent 70%), #04060d; }
  .bd-db[hidden] { display: none; }
  .bd-db h1 { margin: 0; font-size: min(14.5vw, 28vh); line-height: .9; font-weight: 900; font-stretch: 125%; letter-spacing: -.02em;
    background: linear-gradient(100deg, #ff3d7f, #ff9a3d, #ffe14d, #4dffa6, #3df2ff, #9b7bff, #ff3d7f); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
    animation: dbShift 4s linear infinite, dbBob 2.4s ease-in-out infinite; filter: drop-shadow(0 0 40px rgba(255,225,77,.35)); }
  @keyframes dbShift { to { background-position: 200% 0; } }
  @keyframes dbBob { 50% { transform: translateY(-2vh) rotate(-1.5deg); } }
  .bd-db .k { font: 500 3vh var(--f-mono); letter-spacing: .35em; color: var(--cyan); text-transform: uppercase; }
  .bd-db .q { margin: 3vh auto 0; max-width: 24ch; font-size: 7vh; font-weight: 800; line-height: 1.1; }
  .bd-db .n { margin-top: 3vh; display: inline-block; padding: 1.4vh 2.6vw; border-radius: 999px; font: 600 3.6vh var(--f-mono); color: #04060d; background: linear-gradient(90deg, #4dffa6, #3df2ff); box-shadow: 0 0 40px rgba(77,255,166,.45); }
  .bd-db .fl { position: absolute; font-size: 10vh; animation: dbFloat linear infinite; opacity: .5; z-index: 0; }
  .bd-db .n:empty { display: none; }
  @keyframes dbFloat { from { transform: translateY(110vh) rotate(0); } to { transform: translateY(-20vh) rotate(360deg); } }`;
  document.head.append(dbCss);
  const dbx = document.createElement('div'); dbx.className = 'bd-db'; dbx.hidden = true;
  const EMO = ['🤩', '🙂', '😐', '🗣', '💬', '⚡', '🎉', '💛', '🔋', '✨'];
  dbx.innerHTML = EMO.map((e, i) => `<span class="fl" style="left:${(i * 10 + 3) % 96}%;animation-duration:${9 + (i % 4) * 2.5}s;animation-delay:-${i * 1.3}s">${e}</span>`).join('') +
    '<div style="position:relative;z-index:1;padding:0 4vw"><div class="k">ITRE · time to talk</div><h1>DEBRIEF!</h1><div class="q"></div><div class="n"></div></div>';
  document.body.append(dbx);

  /* ---------- energy prompt (count only) ---------- */
  let eOpen = false, eKind = 'energy';
  async function count() {
    if (!eOpen) return;
    const { data: n } = await sb.rpc('gridline_energy_count');
    if (typeof n !== 'number') return;
    en.querySelector('span').textContent = `${n} sent`;
    dbx.querySelector('.n').textContent = `${n} answered on their phones`;
  }
  window.GL_onBoardEnergy = row => {
    const o = !!row.energy_open, k = row.energy_kind === 'debrief' ? 'debrief' : 'energy';
    if (o && k === 'debrief') {
      en.hidden = true;
      dbx.querySelector('.q').textContent = row.energy_q || 'How was today for you? Pick 1–5 on your phone.';
      if (dbx.hidden || eKind !== 'debrief') { dbx.hidden = false; animate(dbx.querySelector('h1'), { scale: [.3, 1.08, 1], opacity: [0, 1] }, { duration: .9 }); window.FX && FX.zap && FX.zap('up'); }
      eKind = k; eOpen = true; document.documentElement.classList.remove('bd-en'); count(); return;
    }
    dbx.hidden = true; eKind = k;
    if (o && !eOpen) { en.hidden = false; animate(en, { y: [80, 0], opacity: [0, 1] }, { type: 'spring', bounce: .35 }); }
    if (o) en.hidden = false;
    if (!o) en.hidden = true;
    document.documentElement.classList.toggle('bd-en', o); setTimeout(() => { fitStep(); fitOv(); }, 50);
    eOpen = o; count();
  };
  setInterval(count, 3000);
})();
