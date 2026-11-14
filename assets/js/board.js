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
  html.board #step.two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); column-gap: 56px; align-items: start; }
  html.board .bd-left, html.board .bd-right { min-width: 0; position: relative; }
  html.board .st-title { font-size: 120px; max-width: 16ch; }
  html.board #step.two .st-title { font-size: 92px; }
  html.board .st-rules { max-width: none; }
  html.board .st-rules li { font-size: 30px; }
  html.board #step.two .st-rules li { font-size: 25px; }
  html.board .bd-right .st-content, html.board .bd-right .st-ia { margin-top: 0; }
  html.board .bd-right .st-ia { margin-top: 0 !important; }
  .bd-fit { transform-origin: 50% 50%; }
  html.board #step.two .st-art { display: none; }
  html.board .bd-right .st-content { margin-top: 0; padding-top: 0; border-top: 0; }
  html.board .bd-right .hero-title { font-size: 130px; margin-top: 0; }
  html.board .bd-right .hero-sub { font-size: 26px; } html.board .bd-right .hero-q { font-size: 40px; }
  html.board .bd-right .stat b { font-size: 42px; } html.board .bd-right .chair-card h3 { font-size: 32px; }
  html.board .bd-right .sec-title { font-size: 80px; } html.board .bd-right .sec-lead { font-size: 22px; } html.board .bd-right .h3 { font-size: 30px; }
  html.board .bd-right .topic-q { padding: 40px; } html.board .bd-right .topic-q p { font-size: 34px; }
  html.board .bd-right .fact-n { font-size: 64px; } html.board .bd-right .vc-placeholder h3 { font-size: 40px; }
  html.board .bd-right .conflict h3 { font-size: 28px; } html.board .bd-right .blackout b { font-size: 150px; }
  html.board .bd-right .cy-center b { font-size: 80px; } html.board .bd-right .lego-out { font-size: 24px; }
  html.board .bd-right .mq-track { font-size: 22px; } html.board .bd-right .game-hero, html.board .bd-right .lego, html.board .bd-right .check { padding: 32px; }
  html.board #step.two.wide { grid-template-columns: minmax(0, .8fr) minmax(0, 2fr); }
  html.board .bd-right.both { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); column-gap: 40px; align-items: start; }
  html.board .st-ia.multi { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 32px; align-items: start; }
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
  .bd-groups { display: grid; grid-template-columns: repeat(var(--n, 4), minmax(0, 1fr)); gap: 2vw; width: 92vw; max-width: 1700px; }
  .bd-col { padding: 2.4vh 1.6vw; border-radius: 26px; border: 2px solid var(--c); background: color-mix(in srgb, var(--c) 8%, #0b1020); box-shadow: 0 0 40px color-mix(in srgb, var(--c) 25%, transparent); }
  .bd-col h3 { margin: 0; display: flex; align-items: center; gap: 14px; font-size: clamp(24px, 2.6vw, 44px); }
  .bd-col h3 b { width: 1.6em; height: 1.6em; border-radius: 14px; display: grid; place-items: center; background: var(--c); color: #04060d; }
  .bd-col p { margin: 8px 0 16px; color: var(--ink-2); font-size: clamp(14px, 1.3vw, 20px); }
  .bd-card { margin-top: 10px; padding: 1.4vh 1vw; border-radius: 16px; background: rgba(255,255,255,.06); font-weight: 700; font-size: clamp(18px, 1.9vw, 32px); }
  .bd-qr { display: grid; grid-template-columns: auto auto; gap: 5vw; align-items: center; }
  .bd-qr .q { width: min(60vh, 42vw); aspect-ratio: 1; padding: 4%; border-radius: 32px; background: #fff; box-shadow: 0 0 0 3px var(--cyan), 0 0 90px rgba(61,242,255,.45); }
  .bd-qr .q svg { width: 100%; height: 100%; display: block; }
  .bd-qr h2 { margin: 12px 0 18px; font-size: clamp(48px, 7vw, 130px); line-height: .9; font-weight: 900; }
  .bd-qr .u { font: 500 clamp(20px, 2.4vw, 40px) var(--f-mono); padding: 14px 22px; border-radius: 18px; border: 1px solid var(--line-2); display: inline-block; }
  .bd-blank { text-align: center; }
  .bd-blank b { display: block; font-size: clamp(70px, 13vw, 240px); font-weight: 900; letter-spacing: .02em; background: linear-gradient(100deg, var(--cyan), var(--volt), var(--pink)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .bd-energy { position: fixed; z-index: 9100; left: 0; right: 0; bottom: 3vh; margin: 0 auto; width: fit-content; max-width: min(92vw, 1500px); box-sizing: border-box; display: flex; align-items: center; gap: 22px; padding: 2vh 3vw; border-radius: 999px; border: 3px solid transparent;
    background: linear-gradient(#0b1020, #0b1020) padding-box, linear-gradient(120deg, #ff3d7f, #ff9a3d, #ffe14d, #4dffa6, #3df2ff) border-box; box-shadow: 0 0 60px rgba(77,255,166,.35); font-size: clamp(18px, 2.2vw, 40px); font-weight: 800; line-height: 1.15; }
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
  const PAD = () => ({ x: Math.round(innerWidth * .04), top: Math.round(innerHeight * .045), bot: Math.round(innerHeight * (document.documentElement.classList.contains('bd-en') ? .17 : .05)) });
  function fitStep() {
    if (!ov.hidden) return;
    const has = [...right.children].some(e => !e.hidden && e.childElementCount);
    step.classList.toggle('two', has);
    const cE = $('#st-content'), iE = $('#st-ia');
    const cOn = cE && !cE.hidden && cE.childElementCount > 0, iOn = iE && !iE.hidden && iE.childElementCount > 0;
    const canMulti = iOn && iE.querySelectorAll(':scope > .ia-slot').length > 1, canBoth = cOn && iOn;
    const p = PAD(), W = innerWidth - 2 * p.x, H = innerHeight - p.top - p.bot;
    step.style.transform = 'none';
    // try the possible layouts and keep the one that needs the least shrinking
    const layouts = [[false, false]];
    if (canBoth) layouts.push([true, false]);
    if (canMulti) layouts.push([false, true]);
    let best = null;
    for (const [both, multi] of layouts) {
      right.classList.toggle('both', both); iE && iE.classList.toggle('multi', multi);
      step.classList.toggle('wide', both || multi);
      let w = W; step.style.width = w + 'px';
      let h = step.offsetHeight, sc = Math.min(1, H / h);
      if (sc < 1) { w = Math.min(W / sc, W * 1.9); step.style.width = w + 'px'; h = step.offsetHeight; sc = Math.min(1, H / h, W / w); }
      // anything sticking out sideways (long words, wide cards) counts too
      sc = Math.min(sc, W / Math.max(w, step.scrollWidth, left.scrollWidth + left.offsetLeft, right.scrollWidth + right.offsetLeft));
      if (!best || sc > best.sc + .01) best = { both, multi, w, sc };
    }
    right.classList.toggle('both', best.both); iE && iE.classList.toggle('multi', best.multi);
    step.classList.toggle('wide', best.both || best.multi);
    step.style.width = best.w + 'px';
    const sc = best.sc, w = best.w;
    step.style.transform = `translate(${Math.round((innerWidth - w * sc) / 2)}px, ${p.top}px) scale(${sc})`;
  }
  function fitOv() {
    const el = ov.firstElementChild; if (ov.hidden || !el) return;
    el.style.transform = 'none';
    const p = PAD(), W = innerWidth - 2 * p.x, H = innerHeight - p.top - p.bot;
    const sc = Math.min(1, W / el.offsetWidth, H / el.offsetHeight);
    el.style.transformOrigin = '50% 50%';
    el.style.transform = `translateY(${Math.round((p.top - p.bot) / 2)}px) scale(${sc})`;
  }
  let fitT = 0;
  const fit = () => { clearTimeout(fitT); fitT = setTimeout(() => { fitStep(); fitOv(); }, 60); };
  new MutationObserver(fit).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  addEventListener('resize', fit);
  setInterval(() => { fitStep(); fitOv(); }, 1500);
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
  function blank() { ov.innerHTML = '<div class="bd-blank"><div class="bd-k">ITRE · EYP Mersin 2026</div><b>GRIDLINE</b></div>'; }
  function apply(row) {
    if (!row) return;
    const same = row.mode === mode && JSON.stringify(row.data) === JSON.stringify(data);
    if (same) return;
    mode = row.mode; data = row.data || {};
    clearInterval(tInt); tInt = null;
    if (mode === 'step') { ov.hidden = true; ov.innerHTML = ''; setTimeout(fitStep, 50); return; }
    ov.hidden = false;
    ({ timer, groups, qr, blank }[mode] || blank)();
    requestAnimationFrame(fitOv); setTimeout(fitOv, 50);
    if (mode !== 'timer') animate(ov, { opacity: [0, 1] }, { duration: .4 });
  }
  window.GL_boardApply = apply; // handy for testing in the console
  async function pull() { const { data: row } = await sb.from('gridline_board').select('mode, data').eq('id', 1).maybeSingle(); apply(row); }
  sb.channel('gridline-board').on('postgres_changes', { event: '*', schema: 'public', table: 'gridline_board' }, p => p.new && apply(p.new)).subscribe();
  pull(); setInterval(pull, 8000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });

  /* ---------- energy prompt (count only) ---------- */
  let eOpen = false;
  async function count() { if (!eOpen) return; const { data: n } = await sb.rpc('gridline_energy_count'); if (typeof n === 'number') en.querySelector('span').textContent = `${n} sent`; }
  window.GL_onBoardEnergy = row => {
    const o = !!row.energy_open;
    if (o && !eOpen) { en.hidden = false; animate(en, { y: [80, 0], opacity: [0, 1] }, { type: 'spring', bounce: .35 }); }
    if (!o) en.hidden = true;
    document.documentElement.classList.toggle('bd-en', o); setTimeout(() => { fitStep(); fitOv(); }, 50);
    eOpen = o; count();
  };
  setInterval(count, 3000);
})();
