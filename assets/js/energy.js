/* Gridline — Energy meter. The chair opens it any time; every phone gets a half-circle gauge.
   Answers are anonymous and private: delegates never see results, only the chair console reads the average (PIN-checked RPC). */
(function () {
  const C = window.GRIDLINE;
  const { animate } = window.Motion;
  let DEV; try { DEV = localStorage.getItem('gl-dev'); } catch (e) {}
  if (!DEV) { DEV = 'd' + Math.random().toString(36).slice(2) + Date.now().toString(36); try { localStorage.setItem('gl-dev', DEV); } catch (e) {} }
  let sb = null;
  const client = () => sb || (sb = window.supabase && window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: false } }));
  const sentKey = r => 'gl-energy-' + r;
  const getSent = r => { try { return localStorage.getItem(sentKey(r)); } catch (e) { return null; } };

  const LEVELS = [[0, '🪫', 'Drained'], [20, '😮‍💨', 'Running low'], [40, '🙂', 'Doing okay'], [60, '😃', 'Charged'], [80, '⚡', 'Full power']];
  const level = v => LEVELS.filter(l => v >= l[0]).pop();
  const colour = v => v < 20 ? '#ff3d7f' : v < 40 ? '#ff9a3d' : v < 60 ? '#ffe14d' : v < 80 ? '#4dffa6' : '#3df2ff';

  const css = `
  .en-ov { position: fixed; inset: 0; z-index: 9400; display: grid; place-items: center; padding: 20px; background: rgba(2,4,10,.82); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
  .en-ov[hidden], .en-chip[hidden] { display: none; }
  .en-box { position: relative; overflow: hidden; width: min(440px, 100%); text-align: center; padding: 26px 22px 22px; border-radius: 28px; border: 2px solid transparent;
    background: radial-gradient(120% 70% at 50% 100%, color-mix(in srgb, var(--en-c) 28%, transparent), transparent 70%) padding-box, linear-gradient(#0b1020, #0b1020) padding-box, linear-gradient(120deg, #ff3d7f, #ff9a3d, #ffe14d, #4dffa6, #3df2ff, #9b7bff) border-box;
    box-shadow: 0 0 60px color-mix(in srgb, var(--en-c) 35%, transparent), 0 30px 80px rgba(0,0,0,.6); transition: box-shadow .3s; }
  .en-box::before { content: ''; position: absolute; inset: -40% -20% auto; height: 70%; background: conic-gradient(from 180deg, #ff3d7f33, #ff9a3d33, #ffe14d33, #4dffa633, #3df2ff33, #9b7bff33, #ff3d7f33); filter: blur(40px); pointer-events: none; }
  .en-box > * { position: relative; }
  .en-k { font: 500 12px var(--f-mono, monospace); letter-spacing: .28em; color: var(--cyan, #3df2ff); text-transform: uppercase; }
  .en-h { margin: 10px 0 4px; font-size: 28px; font-weight: 900; line-height: 1.1; background: linear-gradient(90deg, #ff3d7f, #ffe14d, #4dffa6, #3df2ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .en-sub { margin: 0 0 6px; color: var(--ink-2, #9aa6c0); font-size: 14px; }
  .en-g { width: 100%; touch-action: none; cursor: pointer; user-select: none; -webkit-user-select: none; }
  .en-g .trk { opacity: .16; }
  .en-g { overflow: visible; filter: drop-shadow(0 0 12px color-mix(in srgb, var(--en-c) 70%, transparent)); }
  .en-g .ndl { stroke: #fff; }
  .en-g .tick { fill: var(--ink-2, #9aa6c0); font: 500 9px var(--f-mono, monospace); }
  .en-read { margin-top: -6px; }
  .en-read b { display: block; font-size: 46px; line-height: 1; filter: drop-shadow(0 0 14px var(--en-c)); }
  .en-read span { display: block; margin-top: 6px; font-weight: 700; font-size: 18px; color: var(--en-c); }
  .en-go { width: 100%; margin-top: 18px; padding: 16px; border: 0; border-radius: 999px; font: 800 18px var(--f-sans, sans-serif); color: #04060d; background: linear-gradient(90deg, var(--en-c), color-mix(in srgb, var(--en-c) 55%, #fff)); box-shadow: 0 0 34px color-mix(in srgb, var(--en-c) 60%, transparent); }
  .en-msg { min-height: 18px; margin: 12px 0 0; font: 500 12px var(--f-mono, monospace); color: var(--ink-2, #9aa6c0); }
  .en-msg.bad { color: #ff3d7f; }
  .en-chip { position: fixed; z-index: 9300; right: 14px; top: 14px; padding: 10px 14px; border-radius: 999px; border: 2px solid transparent; background: linear-gradient(#0b1020, #0b1020) padding-box, linear-gradient(120deg, #ff3d7f, #ffe14d, #4dffa6, #3df2ff) border-box; color: var(--ink, #fff); font: 600 13px var(--f-sans, sans-serif); box-shadow: 0 8px 30px rgba(0,0,0,.5); }`;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);

  const R = 80, CX = 100, CY = 100, LEN = Math.PI * R;
  const pt = v => { const a = Math.PI * (1 - v / 100); return [CX + R * Math.cos(a), CY - R * Math.sin(a)]; };
  const ov = document.createElement('div');
  ov.className = 'en-ov'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Energy meter');
  ov.innerHTML = `<div class="en-box">
    <div class="en-k">🔋 Energy meter</div>
    <h2 class="en-h">How charged are you?</h2>
    <p class="en-sub">Only your chair sees this — never the big screen.</p>
    <svg class="en-g" viewBox="0 0 200 118" aria-hidden="true">
      <defs><linearGradient id="enGrad" x1="20" y1="0" x2="180" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ff3d7f"/><stop offset=".28" stop-color="#ff9a3d"/><stop offset=".52" stop-color="#ffe14d"/><stop offset=".76" stop-color="#4dffa6"/><stop offset="1" stop-color="#3df2ff"/></linearGradient></defs>
      <path class="trk" d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#enGrad)" stroke-width="18" stroke-linecap="round"/>
      <path class="val" d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#enGrad)" stroke-width="18" stroke-linecap="round" stroke-dasharray="${LEN}" stroke-dashoffset="${LEN}"/>
      ${[10, 30, 50, 70, 90].map(t => { const a = Math.PI * (1 - t / 100); return `<circle cx="${100 + 104 * Math.cos(a) * .8}" cy="${100 - 104 * Math.sin(a) * .8}" r="2.2" fill="${colour(t)}"/>`; }).join('')}
      <line class="ndl" x1="100" y1="100" x2="100" y2="30" stroke-width="3" stroke-linecap="round"/>
      <circle cx="100" cy="100" r="7" fill="#fff"/>
      <text x="8" y="117" font-size="13">🪫</text><text x="178" y="117" font-size="13">⚡</text>
    </svg>
    <div class="en-read"><b></b><span></span></div>
    <input type="range" min="0" max="100" value="50" aria-label="Your energy, 0 to 100" style="position:absolute;opacity:0;pointer-events:none;width:1px;height:1px">
    <button class="en-go">Send ⚡</button>
    <p class="en-msg mono"></p>
    <button class="en-who" type="button"></button>
  </div>`;
  const chip = document.createElement('button');
  chip.className = 'en-chip'; chip.hidden = true; chip.textContent = '🔋 Energy meter — sent ✓';
  document.body.append(ov, chip);

  const svg = ov.querySelector('svg'), val = svg.querySelector('.val'), ndl = svg.querySelector('.ndl'), rng = ov.querySelector('input'), msg = ov.querySelector('.en-msg'), go = ov.querySelector('.en-go');
  let v = 50, round = 0, open = false, sent = null;
  function draw() {
    const [x, y] = pt(v), c = colour(v), l = level(v);
    val.setAttribute('stroke-dashoffset', LEN * (1 - v / 100));
    ndl.setAttribute('x2', 100 + (x - 100) * .82); ndl.setAttribute('y2', 100 + (y - 100) * .82);
    ov.style.setProperty('--en-c', c);
    ov.querySelector('.en-read b').textContent = l[1];
    ov.querySelector('.en-read span').textContent = `${l[2]} · ${v}%`;
    rng.value = v;
  }
  function fromPointer(e) {
    const m = svg.getScreenCTM(); if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    let a = Math.atan2(CY - p.y, p.x - CX); if (a < 0) a = p.x < CX ? Math.PI : 0;
    v = Math.round(100 * (1 - a / Math.PI)); draw();
  }
  let drag = false;
  svg.addEventListener('pointerdown', e => { drag = true; svg.setPointerCapture(e.pointerId); fromPointer(e); });
  svg.addEventListener('pointermove', e => drag && fromPointer(e));
  svg.addEventListener('pointerup', () => { drag = false; if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {} });
  rng.addEventListener('input', () => { v = +rng.value; draw(); });

  go.addEventListener('click', async () => {
    const c = client(); if (!c) return;
    go.disabled = true;
    const { error } = await c.rpc('gridline_energy_vote', { p_round: round, p_device: DEV, p_value: v });
    go.disabled = false;
    if (error) { msg.classList.add('bad'); msg.textContent = /closed/.test(error.message) ? 'Your chair already closed the meter.' : 'Could not send — check your connection.'; return; }
    sent = String(v); try { localStorage.setItem(sentKey(round), sent); } catch (e) {}
    window.FX && FX.zap && FX.zap('up');
    msg.classList.remove('bad'); msg.textContent = 'Sent ✓ thank you!';
    setTimeout(() => { if (open) { hide(); chip.hidden = false; } }, 900);
  });
  chip.addEventListener('click', () => { chip.hidden = true; if (typeof dOpen !== 'undefined' && dOpen) { db.hidden = false; dPaint(); } else show(); });

  function show() {
    if (!ov.hidden) return;
    ov.hidden = false; msg.textContent = sent ? 'You already sent — move it and send again to change.' : '';
    draw();
    animate(ov, { opacity: [0, 1] }, { duration: .3 });
    animate(ov.querySelector('.en-box'), { y: [60, 0], scale: [.92, 1] }, { type: 'spring', bounce: .35 });
    window.FX && FX.zap && FX.zap('up');
    if (navigator.vibrate) try { navigator.vibrate([40, 40, 40]); } catch (e) {}
  }
  function hide() { if (ov.hidden) return; animate(ov, { opacity: [1, 0] }, { duration: .25 }).then(() => { ov.hidden = true; ov.style.opacity = ''; }); }

  /* ---------- who are you? (once per phone; only the chair ever sees the link) ---------- */
  const nmCss = document.createElement('style');
  nmCss.textContent = `
  .nm-ov { position: fixed; inset: 0; z-index: 9450; display: grid; place-items: center; padding: 18px; background: rgba(2,4,10,.86); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); overflow-y: auto; }
  .nm-ov[hidden] { display: none; }
  .nm-box { width: min(460px, 100%); padding: 24px 18px 18px; border-radius: 28px; text-align: center; border: 2px solid transparent;
    background: radial-gradient(120% 60% at 50% 0%, rgba(61,242,255,.16), transparent 70%) padding-box, linear-gradient(#0b1020, #0b1020) padding-box, linear-gradient(120deg, #ff3d7f, #ff9a3d, #ffe14d, #4dffa6, #3df2ff, #9b7bff) border-box; }
  .nm-box h2 { margin: 8px 0 4px; font-size: 26px; font-weight: 900; background: linear-gradient(90deg, #3df2ff, #4dffa6, #ffe14d); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .nm-box p { margin: 0 0 14px; color: var(--ink-2, #9aa6c0); font-size: 14px; }
  .nm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .nm-grid button { padding: 13px 10px; border-radius: 14px; border: 1px solid var(--c); background: color-mix(in srgb, var(--c) 10%, transparent); color: var(--ink, #fff); font: 700 15px var(--f-sans, sans-serif); }
  .nm-grid button:active { transform: scale(.97); background: color-mix(in srgb, var(--c) 30%, transparent); }
  .nm-skip { margin-top: 12px; background: none; border: 0; color: var(--ink-2, #9aa6c0); font: 500 12px var(--f-mono, monospace); text-decoration: underline; }
  .en-who { margin-top: 8px; background: none; border: 0; color: var(--ink-2, #9aa6c0); font: 500 12px var(--f-mono, monospace); }`;
  document.head.append(nmCss);
  const NCOL = ['#3df2ff', '#ffe14d', '#ff3d7f', '#4dffa6', '#9b7bff', '#ff9a3d'];
  const nm = document.createElement('div');
  nm.className = 'nm-ov'; nm.hidden = true; nm.setAttribute('role', 'dialog'); nm.setAttribute('aria-label', 'Who are you?');
  document.body.append(nm);
  let myName = null; try { myName = localStorage.getItem('gl-name'); } catch (e) {}
  const whoBtn = ov.querySelector('.en-who');
  const paintWho = () => { whoBtn.textContent = myName ? `Sending as ${myName} · change` : 'Tap to pick your name'; };
  paintWho();
  async function pickName() {
    const c = client(); if (!c) return;
    const { data } = await c.rpc('gridline_roster_names');
    if (!Array.isArray(data) || !data.length) return;
    nm.innerHTML = `<div class="nm-box"><div class="en-k">⚡ Plug in</div><h2>Who are you?</h2><p>Tap your name once. Only your chair sees it.</p>
      <div class="nm-grid">${data.map((n, i) => `<button type="button" style="--c:${NCOL[i % NCOL.length]}">${n.replace(/[&<>"']/g, '')}</button>`).join('')}</div>
      <button type="button" class="nm-skip">I’m not on the list</button></div>`;
    nm.hidden = false;
    animate(nm.querySelector('.nm-box'), { y: [40, 0], opacity: [0, 1] }, { duration: .4 });
    nm.querySelectorAll('.nm-grid button').forEach(b => b.addEventListener('click', async () => {
      const name = b.textContent;
      const { error } = await c.rpc('gridline_set_name', { p_device: DEV, p_name: name });
      if (error) { b.style.borderColor = '#ff3d7f'; return; }
      myName = name; try { localStorage.setItem('gl-name', name); } catch (e) {}
      window.FX && FX.zap && FX.zap('up');
      nm.hidden = true; paintWho();
    }));
    nm.querySelector('.nm-skip').addEventListener('click', () => { try { localStorage.setItem('gl-name-skip', '1'); } catch (e) {} nm.hidden = true; });
  }
  whoBtn.addEventListener('click', pickName);
  let skipped = null; try { skipped = localStorage.getItem('gl-name-skip'); } catch (e) {}
  if (!window.GL_BOARD && !myName && !skipped) pickName();

  /* ---------- debrief: 1–5, only the chair sees answers ---------- */
  const FACES = [['😫', 'Rough'], ['😕', 'Meh'], ['😐', 'Okay'], ['🙂', 'Good'], ['🤩', 'Amazing']];
  const dbCss = document.createElement('style');
  dbCss.textContent = `
  .db-faces { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 18px 0 6px; }
  .db-faces button { display: grid; justify-items: center; gap: 4px; padding: 12px 2px 10px; border-radius: 18px; border: 2px solid var(--line-2, #24304a); background: rgba(255,255,255,.03); color: var(--ink, #fff); font: 600 11px var(--f-mono, monospace); }
  .db-faces button i { font-style: normal; font-size: 34px; line-height: 1; transition: transform .2s; }
  .db-faces button b { font-size: 15px; }
  .db-faces button.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); box-shadow: 0 0 22px color-mix(in srgb, var(--c) 45%, transparent); }
  .db-faces button.on i { transform: scale(1.25); }
  .db-q { margin: 6px 0 0; font-size: 20px; font-weight: 800; }`;
  document.head.append(dbCss);
  const DCOL = ['#ff3d7f', '#ff9a3d', '#ffe14d', '#4dffa6', '#3df2ff'];
  const db = document.createElement('div');
  db.className = 'en-ov'; db.hidden = true; db.setAttribute('role', 'dialog'); db.setAttribute('aria-label', 'Debrief');
  db.innerHTML = `<div class="en-box">
    <div class="en-k">🗣 Debrief</div>
    <h2 class="en-h">Debrief time!</h2>
    <p class="db-q"></p>
    <div class="db-faces">${FACES.map((f, i) => `<button type="button" data-v="${i + 1}" style="--c:${DCOL[i]}"><i>${f[0]}</i><b>${i + 1}</b>${f[1]}</button>`).join('')}</div>
    <p class="en-sub">Only your chair sees this — never the big screen.</p>
    <button class="en-go" disabled>Pick 1–5</button>
    <p class="en-msg mono"></p>
  </div>`;
  document.body.append(db);
  let dPick = 0, dRound = 0, dOpen = false;
  const dGo = db.querySelector('.en-go'), dMsg = db.querySelector('.en-msg');
  const dPaint = () => {
    db.querySelectorAll('.db-faces button').forEach(b => b.classList.toggle('on', +b.dataset.v === dPick));
    db.style.setProperty('--en-c', dPick ? DCOL[dPick - 1] : '#3df2ff');
    dGo.disabled = !dPick; dGo.textContent = dPick ? 'Send ⚡' : 'Pick 1–5';
  };
  db.querySelectorAll('.db-faces button').forEach(b => b.addEventListener('click', () => { dPick = +b.dataset.v; dPaint(); if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {} }));
  dGo.addEventListener('click', async () => {
    const c = client(); if (!c || !dPick) return;
    dGo.disabled = true;
    const { error } = await c.rpc('gridline_energy_vote', { p_round: dRound, p_device: DEV, p_value: dPick });
    dGo.disabled = false;
    if (error) { dMsg.classList.add('bad'); dMsg.textContent = /closed/.test(error.message) ? 'Your chair already closed the debrief.' : 'Could not send — check your connection.'; return; }
    try { localStorage.setItem(sentKey(dRound), String(dPick)); } catch (e) {}
    window.FX && FX.zap && FX.zap('up');
    dMsg.classList.remove('bad'); dMsg.textContent = 'Sent ✓ thank you!';
    setTimeout(() => { if (dOpen) { db.hidden = true; chip.textContent = '🗣 Debrief — sent ✓'; chip.hidden = false; } }, 900);
  });
  function dShow(q) {
    db.querySelector('.db-q').textContent = q || 'How was today for you?';
    dMsg.textContent = ''; dPaint();
    if (!db.hidden) return;
    db.hidden = false;
    animate(db.querySelector('.en-box'), { y: [60, 0], scale: [.92, 1] }, { type: 'spring', bounce: .35 });
    window.FX && FX.zap && FX.zap('up');
    if (navigator.vibrate) try { navigator.vibrate([40, 40, 40]); } catch (e) {}
  }

  window.GL_onEnergy = row => {
    if (window.GL_BOARD) { window.GL_onBoardEnergy && window.GL_onBoardEnergy(row); return; }
    const kind = row.energy_kind === 'debrief' ? 'debrief' : 'energy';
    if (kind === 'debrief') {
      if (open) { open = false; hide(); }
      const r = row.energy_round || 0;
      if (row.energy_open && (r !== dRound || !dOpen)) {
        dRound = r; dOpen = true; const was = getSent(r);
        dPick = was ? +was : 0;
        if (was) { chip.textContent = '🗣 Debrief — sent ✓'; chip.hidden = false; } else { chip.hidden = true; dShow(row.energy_q); }
      } else if (!row.energy_open && dOpen) { dOpen = false; chip.hidden = true; db.hidden = true; }
      return;
    }
    if (dOpen) { dOpen = false; db.hidden = true; }
    chip.textContent = '🔋 Energy meter — sent ✓';
    const nowOpen = !!row.energy_open, r = row.energy_round || 0;
    if (nowOpen && (r !== round || !open)) {
      round = r; open = true; sent = getSent(r);
      if (sent != null) { v = +sent; chip.hidden = false; } else { v = 50; chip.hidden = true; show(); }
    } else if (!nowOpen && open) { open = false; chip.hidden = true; hide(); }
  };
})();
