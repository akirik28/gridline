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
    <p class="en-sub">Anonymous — only your chair sees the average.</p>
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
  chip.addEventListener('click', () => { chip.hidden = true; show(); });

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

  window.GL_onEnergy = row => {
    const nowOpen = !!row.energy_open, r = row.energy_round || 0;
    if (nowOpen && (r !== round || !open)) {
      round = r; open = true; sent = getSent(r);
      if (sent != null) { v = +sent; chip.hidden = false; } else { v = 50; chip.hidden = true; show(); }
    } else if (!nowOpen && open) { open = false; chip.hidden = true; hide(); }
  };
})();
