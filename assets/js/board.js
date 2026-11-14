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
  html.board .stage { max-width: none; padding: 4vh 5vw 6vh; }
  html.board .st-title { font-size: clamp(56px, 8vw, 150px); max-width: 18ch; }
  html.board .st-rules { max-width: 1100px; }
  html.board .st-rules li { font-size: clamp(20px, 2.1vw, 34px); }
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
  .bd-groups { display: grid; grid-template-columns: repeat(var(--n, 4), 1fr); gap: 2vw; width: 100%; max-width: 1700px; }
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
    if (mode === 'step') { ov.hidden = true; ov.innerHTML = ''; return; }
    ov.hidden = false;
    ({ timer, groups, qr, blank }[mode] || blank)();
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
    document.documentElement.classList.toggle('bd-en', o);
    eOpen = o; count();
  };
  setInterval(count, 3000);
})();
