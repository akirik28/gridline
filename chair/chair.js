/* Gridline chair console */
(function () {
  const { animate, stagger } = window.Motion;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const C = window.GRIDLINE;
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: false } });
  const store = {
    get(k, d) { try { const v = localStorage.getItem('glc-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('glc-' + k, JSON.stringify(v)); } catch (e) {} }
  };
  const bg = FX.grid($('#grid-bg'), { density: 6 });
  let PIN = '';
  try { PIN = sessionStorage.getItem('glc-pin') || ''; } catch (e) {}

  /* ================= gate ================= */
  async function checkPin(p) {
    const { data, error } = await sb.rpc('gridline_check_pin', { p_pin: p });
    if (error) throw error;
    return data === true;
  }
  async function unlock() {
    $('#gate').remove();
    const app = $('#app'); app.hidden = false;
    FX.audio().resume?.();
    animate('.rail', { x: [-80, 0], opacity: [0, 1] }, { duration: .6, ease: [.2, .8, .2, 1] });
    animate('.tabs button', { x: [-30, 0], opacity: [0, 1] }, { delay: stagger(.05, { startDelay: .2 }) });
    showPane('steps');
    bg && bg.surge(20);
    watchState();
    // committee roster lives behind the PIN (not in the public source) — fill Groups if empty
    const gn = $('#g-names');
    if (!gn.value.trim()) sb.rpc('gridline_get_roster', { p_pin: PIN }).then(({ data }) => {
      if (data && !gn.value.trim()) { gn.value = data; gn.dispatchEvent(new Event('input')); }
    });
  }
  $('#gate-form').addEventListener('submit', async e => {
    e.preventDefault();
    const p = $('#pin').value.trim(), err = $('#gate-err');
    err.textContent = 'checking…';
    try {
      if (await checkPin(p)) { PIN = p; try { sessionStorage.setItem('glc-pin', p); } catch (e) {} FX.zap('up'); unlock(); }
      else { err.textContent = 'Wrong PIN'; animate('.gate-box', { x: [0, -12, 12, -8, 8, 0] }, { duration: .45 }); FX.zap('down'); }
    } catch (x) { err.textContent = 'No connection to the server — check internet.'; }
  });
  animate('.gate-box', { y: [40, 0], opacity: [0, 1], scale: [.95, 1] }, { type: 'spring', bounce: .4 });
  if (PIN) checkPin(PIN).then(ok => ok && unlock()).catch(() => {});

  /* ================= tabs ================= */
  function showPane(name) {
    $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    moveInk();
    $$('.pane').forEach(p => p.classList.toggle('on', p.dataset.pane === name));
    const pane = $(`.pane[data-pane="${name}"]`);
    const h = $('h1', pane);
    animate(h, { opacity: [0, 1], x: [-40, 0], filter: ['blur(8px)', 'blur(0px)'] }, { duration: .5 });
    animate($$(':scope > *:not(.p-head)', pane), { opacity: [0, 1], y: [24, 0] }, { delay: stagger(.06, { startDelay: .1 }), duration: .5 });
    store.set('tab', name);
    if (name === 'plan') renderPlan();
  }
  $$('.tabs button').forEach(b => b.addEventListener('click', () => { showPane(b.dataset.tab); FX.zap('up'); }));
  $$('[data-fs]').forEach(b => b.addEventListener('click', () => {
    const el = document.getElementById(b.dataset.fs);
    if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.().catch(() => {});
  }));

  /* ================= broadcast ================= */
  function soon(min = 5) {
    const d = new Date(Date.now() + min * 60000); d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
    return d.toTimeString().slice(0, 5);
  }
  $('#gather-time').value = soon(5);
  async function send(active, kind, title = '', body = '', meet = '') {
    const { data, error } = await sb.rpc('gridline_set_alert', { p_pin: PIN, p_active: active, p_kind: kind, p_title: title, p_body: body, p_meet: meet });
    if (error) { alert('Could not send: ' + (error.message || error)); return null; }
    paintState(data);
    return data;
  }
  $$('.preset').forEach(p => $('.send', p).addEventListener('click', async () => {
    const k = p.dataset.kind;
    let title = '', body = '', meet = '';
    if (k === 'gather') meet = $('#gather-time').value;
    if (k === 'custom') {
      title = $('#c-title').value.trim(); body = $('#c-body').value.trim(); meet = $('#c-time').value;
      if (!title) { $('#c-title').focus(); animate('#c-title', { x: [0, -8, 8, 0] }, { duration: .3 }); return; }
    }
    const r = await send(true, k, title, body, meet);
    if (r) { p.classList.remove('sent'); void p.offsetWidth; p.classList.add('sent'); FX.zap('up'); bg && bg.surge(24); }
  }));
  $('#release').addEventListener('click', async () => { if (await send(false, 'custom')) { FX.zap('up'); } });

  function paintState(s) {
    if (!s) return;
    paintSteps(s);
    const card = $('#status-card'), on = !!s.active, k = GLAlert.KINDS[s.kind] || GLAlert.KINDS.custom;
    card.classList.toggle('live', on);
    $('#release').disabled = !on;
    $('#st-title').textContent = on ? (s.title || k.title) + (s.meet_time ? ' · ' + s.meet_time : '') : 'Nothing — screens are free';
    $('#st-meta').textContent = on ? `${k.tag} · sent ${new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
    const rs = $('#r-state'); rs.classList.toggle('live', on); $('span', rs).textContent = on ? 'Screens LOCKED' : 'Screens free';
    animate('#st-title', { opacity: [0, 1], y: [10, 0] }, { duration: .4 });
  }
  async function watchState() {
    const { data } = await sb.from(C.table).select('*').eq('id', 1).maybeSingle();
    paintState(data);
    sb.channel('gridline-chair').on('postgres_changes', { event: '*', schema: 'public', table: C.table }, p => p.new && paintState(p.new)).subscribe();
  }


  /* ================= live steps ================= */
  const ST = GL_STEPS, pad2 = n => String(n).padStart(2, '0');
  let curStep = 0, stepAt = Date.now(), busy = false;
  function paintSteps(s) {
    if (s.step == null) return;
    if (typeof s.ia_open === 'number' && window.GL_iaOpen) setTimeout(() => GL_iaOpen(s.ia_open), 0);
    const changed = s.step !== curStep;
    curStep = Math.min(s.step, ST.length - 1); stepAt = new Date(s.step_at).getTime();
    const st = ST[curStep], d = GL_DAYS[st.d];
    $('#ls-meta').textContent = `On every screen now · Step ${pad2(curStep + 1)}/${ST.length} · ${d.label}`;
    $('#ls-title').textContent = st.title;
    window.GL_curStep = curStep; window.GL_paintBpage && GL_paintBpage(); window.GL_paintStart && GL_paintStart();
    if (changed && window.GL_onStepChanged) GL_onStepChanged();
    $('#ls-prev').disabled = curStep <= 0;
    $('#ls-next').disabled = curStep >= ST.length - 1;
    const nx = ST[curStep + 1];
    $('#ls-up').innerHTML = nx ? `Next up: <b>${pad2(curStep + 2)} · ${nx.title}</b> · ${GL_DAYS[nx.d].label} ${nx.t} · ${nx.m} min` : 'This is the last step.';
    since();
    let html = '', lastD = 0;
    ST.forEach((x, i) => {
      if (x.d !== lastD) { lastD = x.d; html += `<h4 style="--c:${GL_DAYS[x.d].c}">${GL_DAYS[x.d].label} · ${GL_DAYS[x.d].name}</h4>`; }
      html += `<button class="ls-row${i < curStep ? ' done' : ''}${i === curStep ? ' live' : ''}" data-i="${i}"><span class="mono">${pad2(i + 1)}</span><span class="mono">${x.t}</span><b>${GL_KINDS[x.k].ic} ${x.title}${x.ia ? ' <i class="ls-iab">📊</i>' : ''}</b><em>${x.m}'</em><span class="go">${i === curStep ? '● LIVE' : 'JUMP →'}</span></button>`;
    });
    $('#ls-list').innerHTML = html;
    mountIa(changed);
    if (changed) animate('#ls-now', { scale: [.97, 1], boxShadow: ['0 0 80px rgba(255,225,77,.5)', '0 0 40px rgba(255,225,77,.08)'] }, { duration: .6 });
  }
  let iaStop = () => {}, iaFor = -1;
  function mountIa(force) {
    if (!force && iaFor === curStep) return;
    iaFor = curStep; iaStop();
    const st = ST[curStep], wrap = $('#ls-ia-wrap');
    wrap.hidden = !st.ia;
    iaStop = window.GLIA ? GLIA.mount($('#ls-ia'), curStep, st.ia, { projector: true, control: true, pin: PIN }) : () => {};
    paintGo();
  }
  // games stay hidden on phones + board until the chair starts them
  let iaOpenNow = -1;
  function paintGo() {
    window.GL_paintStart && setTimeout(GL_paintStart, 0); window.GL_paintBpage && setTimeout(GL_paintBpage, 0); const on = iaOpenNow >= curStep; const b = $('#ls-ia-go'); b.textContent = on ? '■ Hide game' : '▶ Start game'; b.classList.toggle('green', !on); b.classList.toggle('pink', on); $('#ls-ia-wrap').classList.toggle('waiting', !on); }
  window.GL_iaOpen = v => { iaOpenNow = v; paintGo(); };
  window.GL_iaOn = () => iaOpenNow >= curStep;
  $('#ls-ia-go').addEventListener('click', async () => {
    const on = iaOpenNow >= curStep;
    const { data, error } = await sb.rpc('gridline_ia_set', { p_pin: PIN, p_step: curStep, p_on: !on });
    if (error) { alert('Could not change the game: ' + error.message); return; }
    iaOpenNow = data; paintGo(); FX.zap(on ? 'down' : 'up');
    if (!on && window.GL_boardPage) GL_boardPage(1); // game starts -> board shows the game page
  });
  $('#ls-ia-clear').addEventListener('click', async () => {
    if (!confirm('Delete all answers for this step? (e.g. new round of Two Truths and a Lie)')) return;
    try { const n = await GLIA.clear(PIN, curStep); FX.zap('down'); $('#ls-ia-clear').textContent = `Cleared ${n} ✓`; setTimeout(() => $('#ls-ia-clear').textContent = 'Clear answers', 1800); }
    catch (e) { alert('Could not clear: ' + e.message); }
  });
  $('#ls-ia-full').addEventListener('click', () => {
    const w = $('#ls-ia-wrap');
    if (document.fullscreenElement) document.exitFullscreen(); else (w.requestFullscreen || w.webkitRequestFullscreen).call(w);
  });
  function since() {
    const m = Math.floor((Date.now() - stepAt) / 60000), st = ST[curStep];
    $('#ls-since').textContent = `opened ${m} min ago · planned ${st.m} min${m >= st.m ? ' · ⏰ over time' : ''}`;
  }
  setInterval(since, 20000);
  async function goStep(i) {
    if (busy) return; busy = true;
    const { data, error } = await sb.rpc('gridline_set_step', { p_pin: PIN, p_step: i });
    busy = false;
    if (error) { alert('Could not change step: ' + (error.message || error)); return; }
    FX.zap('up'); bg && bg.surge(24);
    paintState(data);
    const row = $(`.ls-row[data-i="${i}"]`); row && row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  $('#ls-next').addEventListener('click', () => goStep(curStep + 1));
  $('#ls-prev').addEventListener('click', () => { if (confirm('Go back one step? Delegates will lose access to the current step until you unlock it again.')) goStep(curStep - 1); });
  $('#ls-list').addEventListener('click', e => {
    const b = e.target.closest('.ls-row'); if (!b) return;
    const i = +b.dataset.i; if (i === curStep) return;
    if (i > curStep + 1 && !confirm(`Jump to step ${pad2(i + 1)}? Everything up to it unlocks.`)) return;
    if (i < curStep && !confirm(`Go back to step ${pad2(i + 1)}? Later steps lock again.`)) return;
    goStep(i);
  });
  addEventListener('keydown', e => {
    if (!$('.pane[data-pane="steps"]').classList.contains('on') || e.target.closest('input,textarea,select')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); $('#ls-next').click(); }
  });

  /* ================= timer ================= */
  const tRun = $('#t-run'), tTime = $('#t-time'), tBox = $('#timer'), CIRC = 2 * Math.PI * 180;
  tRun.style.strokeDasharray = CIRC;
  let total = 20 * 60, left = total, endAt = 0, running = false, warned = false;
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function draw() {
    tTime.textContent = fmt(left);
    tRun.style.strokeDashoffset = CIRC * (1 - left / total);
    tBox.classList.toggle('warn', left <= 120 && left > 0);
    tBox.classList.toggle('done', left <= 0);
  }
  function tick() {
    if (!running) return;
    left = (endAt - Date.now()) / 1000;
    if (left <= 120 && !warned) { warned = true; beep(3); animate('#timer', { scale: [1, 1.04, 1] }, { duration: .6 }); }
    if (left <= 0) { left = 0; running = false; $('#t-go').textContent = 'Start'; $('#t-sub').textContent = "time's up"; beep(6); animate('#timer', { scale: [1, 1.08, 1] }, { duration: .5, repeat: 3 }); }
    draw();
    if (running) requestAnimationFrame(tick);
  }
  function beep(n) { for (let i = 0; i < n; i++) setTimeout(() => FX.zap(i % 2 ? 'up' : 'down'), i * 380); }
  function setPreset(btn) {
    $$('#t-presets button').forEach(b => b.classList.toggle('on', b === btn));
    total = left = +btn.dataset.m * 60; running = false; warned = false;
    $('#t-label').textContent = btn.dataset.l; $('#t-go').textContent = 'Start'; $('#t-sub').textContent = 'ready';
    draw(); animate('#t-time', { scale: [.8, 1], opacity: [0, 1] }, { type: 'spring', bounce: .5 });
  }
  $$('#t-presets button').forEach(b => b.addEventListener('click', () => setPreset(b)));
  $('#t-go').addEventListener('click', () => {
    if (running) { running = false; left = (endAt - Date.now()) / 1000; $('#t-go').textContent = 'Resume'; $('#t-sub').textContent = 'paused'; return; }
    if (left <= 0) left = total;
    endAt = Date.now() + left * 1000; running = true; $('#t-go').textContent = 'Pause'; $('#t-sub').textContent = 'running';
    FX.zap('up'); tick();
  });
  $('#t-reset').addEventListener('click', () => setPreset($('#t-presets .on')));
  window.GL_timerData = () => ({ label: $('#t-label').textContent, total, left: running ? (endAt - Date.now()) / 1000 : left, endAt, running });
  ['#t-go', '#t-reset'].forEach(s => $(s).addEventListener('click', () => window.GL_boardSync && GL_boardSync('timer')));
  $$('#t-presets button').forEach(b => b.addEventListener('click', () => window.GL_boardSync && GL_boardSync('timer')));
  $('#t-plus').addEventListener('click', () => { total += 60; left += 60; endAt += 60000; if (left > 120) warned = false; draw(); });
  draw();

  /* ================= groups ================= */
  const CONF = [
    { L: 'A', t: 'Competitiveness vs climate', c: '#3df2ff' }, { L: 'B', t: 'The grid & local people', c: '#ffe14d' },
    { L: 'C', t: 'Transparency vs trade secrets', c: '#ff3d7f' }, { L: 'D', t: 'Voluntary vs binding', c: '#4dffa6' }];
  const names = $('#g-names');
  names.value = store.get('names', '');
  function list() { return names.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean); }
  function rule() {
    const n = list().length;
    $('#g-rule').textContent = !n ? 'Add the delegate names first.' :
      n <= 8 ? `${n} delegates → 3 groups (D merges into C)` : n <= 12 ? `${n} delegates → 4 groups` : `${n} delegates → 4 groups + a timekeeper each`;
  }
  names.addEventListener('input', () => { store.set('names', names.value); rule(); });
  rule();
  $('#g-shuffle').addEventListener('click', () => {
    const ppl = list();
    if (!ppl.length) { names.focus(); animate(names, { x: [0, -10, 10, 0] }, { duration: .3 }); return; }
    for (let i = ppl.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ppl[i], ppl[j]] = [ppl[j], ppl[i]]; }
    const g = ppl.length <= 8 ? 3 : 4;
    const conf = g === 3 ? [CONF[0], CONF[1], { ...CONF[2], t: 'Transparency + voluntary vs binding' }] : CONF;
    const out = $('#groups-out'); out.style.setProperty('--n', g);
    const cols = conf.map(() => []);
    ppl.forEach((p, i) => cols[i % g].push(p));
    out.innerHTML = conf.map((c, i) => `<div class="g-col" style="--c:${c.c}"><h3><b>${c.L}</b>Group ${c.L}</h3><p>${c.t}</p>${cols[i].map((p, j) =>
      `<div class="g-card">${esc(p)}${ppl.length >= 13 && j === 0 ? '<em>⏱ TIMEKEEPER</em>' : ''}</div>`).join('')}</div>`).join('');
    animate($$('.g-col', out), { opacity: [0, 1], y: [-40, 0], rotate: [-4, 0] }, { delay: stagger(.08), type: 'spring', bounce: .4 });
    const cards = $$('.g-card', out);
    cards.forEach((c, i) => animate(c, { opacity: [0, 1], scale: [.3, 1], y: [-120, 0], rotate: [Math.random() * 40 - 20, 0] },
      { delay: .2 + i * .05, type: 'spring', bounce: .45 }));
    FX.zap('up'); bg && bg.surge(20);
    window.GL_lastGroups = conf.map((c, i) => ({ L: c.L, t: c.t, c: c.c, names: cols[i] }));
    window.GL_boardSync && GL_boardSync('groups');
  });
  function esc(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* ================= board ================= */
  let notes = store.get('notes', []), round = store.get('round', 1);
  function saveBoard() { store.set('notes', notes); store.set('round', round); }
  function renderBoard(flashId) {
    $$('.col').forEach(col => {
      const k = col.dataset.col, items = notes.filter(n => n.col === k);
      $('.n', col).textContent = items.length;
      $('.drop', col).innerHTML = items.map(n => `<div class="note" data-id="${n.id}">${esc(n.text)}<small>GROUP ${n.grp} · R${n.r}</small><button class="x" aria-label="Delete">×</button></div>`).join('');
    });
    $('#b-round').textContent = 'Round ' + round;
    if (flashId) { const el = $(`.note[data-id="${flashId}"]`); el && animate(el, { scale: [1.15, 1], boxShadow: ['0 0 40px rgba(61,242,255,.8)', '0 0 0 rgba(0,0,0,0)'] }, { type: 'spring', bounce: .5 }); }
  }
  $('#b-add').addEventListener('submit', e => {
    e.preventDefault();
    const t = $('#b-text').value.trim(); if (!t) return;
    const n = { id: Date.now().toString(36), text: t, grp: $('#b-grp').value, col: 'inbox', r: round };
    notes.push(n); saveBoard(); renderBoard(n.id); $('#b-text').value = ''; FX.zap('up');
  });
  $('#board').addEventListener('click', e => {
    const x = e.target.closest('.x'); if (!x) return;
    const id = x.closest('.note').dataset.id; notes = notes.filter(n => n.id !== id); saveBoard(); renderBoard();
  });
  // pointer drag (mouse + touch)
  let drag = null;
  $('#board').addEventListener('pointerdown', e => {
    const note = e.target.closest('.note'); if (!note || e.target.closest('.x')) return;
    e.preventDefault();
    const r = note.getBoundingClientRect();
    const ghost = note.cloneNode(true); ghost.classList.add('drag'); ghost.style.width = r.width + 'px';
    document.body.append(ghost);
    drag = { id: note.dataset.id, ghost, ox: e.clientX - r.left, oy: e.clientY - r.top, src: note };
    note.style.opacity = .25; move(e);
  });
  function move(e) {
    if (!drag) return;
    drag.ghost.style.left = (e.clientX - drag.ox) + 'px'; drag.ghost.style.top = (e.clientY - drag.oy) + 'px';
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.col');
    $$('.col').forEach(c => c.classList.toggle('over', c === under));
  }
  addEventListener('pointermove', move);
  addEventListener('pointerup', e => {
    if (!drag) return;
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.col');
    drag.ghost.remove(); drag.src.style.opacity = '';
    $$('.col').forEach(c => c.classList.remove('over'));
    if (under) {
      const n = notes.find(n => n.id === drag.id);
      if (n && n.col !== under.dataset.col) {
        n.col = under.dataset.col; saveBoard(); renderBoard(n.id);
        FX.zap(n.col === 'grave' ? 'down' : 'up');
      }
    }
    drag = null;
  });
  $('#b-next').addEventListener('click', () => {
    round++; notes.forEach(n => { if (n.col === 'hosp') { n.col = 'inbox'; n.r = round; } }); saveBoard(); renderBoard();
    animate('.col.inbox .note', { x: [200, 0], opacity: [0, 1] }, { delay: stagger(.05) });
  });
  $('#b-clear').addEventListener('click', () => { if (confirm('Clear every note on this board?')) { notes = []; round = 1; saveBoard(); renderBoard(); } });
  renderBoard();

  /* ================= grid crisis ================= */
  const ROLES = [{ k: 't', n: 'TechNova', c: '#3df2ff' }, { k: 'c', n: 'The City', c: '#ffe14d' }, { k: 'g', n: 'Grid Operator', c: '#9b7bff' }, { k: 'n', n: 'Climate NGO', c: '#4dffa6' }];
  let gc = store.get('gc', { round: 1, cap: 100, s: { t: 0, c: 0, g: 0, n: 0 } });
  const SCALE = 160; // MW shown across the full bar
  function saveGc() { store.set('gc', gc); }
  function paintGc() {
    $('#gc-r').textContent = gc.round; $('#gc-capv').textContent = gc.cap;
    $('#gc-line').style.left = (gc.cap / SCALE * 100) + '%';
    $('#gc-score').innerHTML = ROLES.map(r => `<div class="sc" style="--c:${r.c}"><h4>${r.n}</h4><div class="pts">${gc.s[r.k]}<small>🍬</small></div><div class="ctl"><button data-k="${r.k}" data-d="-1">−</button><button data-k="${r.k}" data-d="1">+</button></div></div>`).join('');
  }
  $('#gc-score').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    gc.s[b.dataset.k] = Math.max(0, gc.s[b.dataset.k] + +b.dataset.d); saveGc(); paintGc();
    const pts = $(`.sc button[data-k="${b.dataset.k}"]`).closest('.sc').querySelector('.pts');
    animate(pts, { scale: [1.35, 1] }, { type: 'spring', bounce: .6 });
  });
  $$('.gc-events button').forEach(b => b.addEventListener('click', () => {
    gc.cap = b.hasAttribute('data-reset') ? 100 : Math.max(20, gc.cap + +b.dataset.d); saveGc(); paintGc();
    animate('#gc-capv', { scale: [1.6, 1], color: [+b.dataset.d < 0 ? '#ff3d7f' : '#4dffa6', '#ffe14d'] }, { duration: .7 });
    FX.zap(+b.dataset.d < 0 ? 'down' : 'up');
  }));
  function setBar(t, c) {
    $('#gc-t').style.width = (Math.min(t, SCALE) / SCALE * 100) + '%';
    $('#gc-c').style.width = (Math.min(c, Math.max(0, SCALE - t)) / SCALE * 100) + '%';
  }
  $('#gc-reveal').addEventListener('click', async () => {
    const t = Math.max(0, +$('#gc-tin').value || 0), c = Math.max(0, +$('#gc-cin').value || 0), tot = t + c;
    $$('.gc-in input').forEach(i => i.classList.add('shown'));
    $('#gc-bar').classList.remove('over');
    setBar(0, 0);
    await animate(0, t, { duration: 1.1, ease: [.3, 0, .2, 1], onUpdate: v => { setBar(v, 0); $('#gc-read').textContent = Math.round(v) + ' MW'; } });
    await animate(0, c, { duration: 1.1, ease: [.3, 0, .2, 1], onUpdate: v => { setBar(t, v); $('#gc-read').textContent = Math.round(t + v) + ' MW'; } });
    if (tot > gc.cap) {
      $('#gc-bar').classList.add('over');
      FX.zap('down');
      const bo = $('#gc-blackout'); bo.classList.add('on');
      animate(bo, { opacity: [1, .1, 1, 0, 1, .3, 1] }, { duration: 1 });
      animate('#gc-blackout b', { scale: [2, 1], opacity: [0, 1], letterSpacing: ['.4em', '0em'] }, { delay: .6, type: 'spring', bounce: .4 });
      bo.onclick = () => animate(bo, { opacity: [1, 0] }, { duration: .4 }).then(() => { bo.classList.remove('on'); bo.style.opacity = ''; });
    } else {
      FX.zap('up'); bg && bg.surge(26);
      animate('#gc-read', { scale: [1.3, 1], color: ['#4dffa6', '#eaf0ff'] }, { duration: .8 });
    }
  });
  $('#gc-next').addEventListener('click', () => {
    gc.round++; saveGc(); paintGc(); setBar(0, 0); $('#gc-read').textContent = '0 MW';
    $$('.gc-in input').forEach(i => { i.value = ''; i.classList.remove('shown'); });
    animate('#gc-r', { y: [-30, 0], opacity: [0, 1] }, { type: 'spring', bounce: .5 });
  });
  $('#gc-new').addEventListener('click', () => { if (confirm('Start a new game? Scores reset.')) { gc = { round: 1, cap: 100, s: { t: 0, c: 0, g: 0, n: 0 } }; saveGc(); paintGc(); setBar(0, 0); } });
  paintGc();

  /* ================= plan ================= */
  const days = Object.keys(GL_PLAN);
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  let planDay = days.includes(todayKey()) ? todayKey() : days[0];
  $('#pl-days').innerHTML = days.map(d => `<button data-d="${d}">${GL_PLAN[d].name}</button>`).join('');
  $$('#pl-days button').forEach(b => b.addEventListener('click', () => { planDay = b.dataset.d; renderPlan(true); }));
  $('#pl-cut').innerHTML = GL_CUT.map(x => `<li>${x}</li>`).join('');
  $('#pl-never').innerHTML = GL_NEVER.map(x => `<li>${x}</li>`).join('');
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  function renderPlan(anim) {
    $$('#pl-days button').forEach(b => b.classList.toggle('on', b.dataset.d === planDay));
    const isToday = planDay === todayKey(), now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
    let nowItem = null;
    $('#pl-blocks').innerHTML = GL_PLAN[planDay].blocks.map(b => `<div class="blk"><h3>${b.t}<span>${b.s}–${b.e}</span></h3><ol>${b.items.map(([t, txt, d]) => {
      let cls = txt.includes('BUFFER') ? 'buf' : '';
      if (isToday && /\d/.test(t)) {
        const st = toMin(t), en = st + (d || 0);
        if (nm >= st && nm < en) { cls += ' now'; nowItem = { t, txt, left: en - nm }; } else if (nm >= en && d) cls += ' past';
      }
      return `<li class="${cls}"><span class="mono">${t}</span><span>${txt}</span><em>${d ? d + "'" : ''}</em></li>`;
    }).join('')}</ol></div>`).join('');
    $('#pl-now').innerHTML = nowItem ? `<div class="now-card"><span class="mono">NOW · ${nowItem.t}</span><b>${nowItem.txt}</b><span class="mono">${nowItem.left} min left</span></div>` : '';
    $('#pl-sub').textContent = (isToday ? 'Today · ' : '') + GL_PLAN[planDay].name + ' — only you can see this.';
    if (anim) animate('.blk', { opacity: [0, 1], y: [20, 0] }, { delay: stagger(.06) });
  }
  setInterval(() => { if ($('.pane[data-pane="plan"]').classList.contains('on')) renderPlan(); }, 30000);

  /* ================= motion layer ================= */
  // sliding ink behind the active tab
  const ink = document.createElement('span'); ink.className = 'tab-ink'; $('#tabs').prepend(ink);
  function moveInk() {
    const on = $('.tabs button.on'); if (!on) return;
    const t = $('#tabs').getBoundingClientRect(), r = on.getBoundingClientRect();
    animate(ink, { x: r.left - t.left + $('#tabs').scrollLeft, y: r.top - t.top, width: r.width, height: r.height, opacity: 1 }, { type: 'spring', bounce: .25, duration: .5 });
  }
  addEventListener('resize', () => moveInk());
  $$('.tabs button').forEach(b => b.addEventListener('pointerdown', e => FX.ripple(b, e)));

  // "Unlock next": press and hold to charge, then it fires (keyboard → instant)
  const nx = $('#ls-next');
  const charge = document.createElement('span'); charge.className = 'charge'; nx.prepend(charge);
  nx.insertAdjacentHTML('beforeend', '<small class="hold mono">hold</small>');
  let holdAnim = null, firedAt = 0;
  // real pointer clicks are swallowed (the hold fires instead); programmatic clicks (detail 0) pass
  nx.addEventListener('click', e => {
    if (e.detail > 0) { e.stopImmediatePropagation(); e.preventDefault(); if (!holdAnim && Date.now() - firedAt > 1200) animate(nx, { x: [0, -6, 6, -3, 0] }, { duration: .35 }); }
  }, true);
  nx.addEventListener('pointerdown', e => {
    if (nx.disabled) return;
    FX.zap('up');
    holdAnim = animate(charge, { scaleX: [0, 1] }, { duration: .6, ease: 'linear' });
    holdAnim.then(() => {
      if (!holdAnim) return;
      holdAnim = null;
      const r = nx.getBoundingClientRect();
      FX.sparks(r.left + r.width / 2, r.top + r.height / 2, '#ffe14d', 26);
      FX.ripple(nx, e, '#ffe14d');
      animate(charge, { opacity: [1, 0] }, { duration: .4 }).then(() => { charge.style.transform = 'scaleX(0)'; charge.style.opacity = 1; });
      firedAt = Date.now(); nx.click();
    });
  });
  const cancelHold = () => { if (holdAnim) { holdAnim.stop(); holdAnim = null; animate(charge, { scaleX: 0 }, { duration: .25 }); } };
  nx.addEventListener('pointerup', cancelHold); nx.addEventListener('pointerleave', cancelHold); nx.addEventListener('pointercancel', cancelHold);

  // broadcast: ripple + sparks from the send button
  $$('.preset .send').forEach(b => b.addEventListener('pointerdown', e => {
    const p = b.closest('.preset'), c = getComputedStyle(p).getPropertyValue('--c').trim();
    FX.ripple(p, e, c); FX.sparks(e.clientX, e.clientY, c, 16);
  }));
  $('#release').addEventListener('pointerdown', e => FX.ripple($('#release'), e, '#4dffa6'));

  // live step card: a slow scanning beam
  const lsNow = $('#ls-now'); if (lsNow) lsNow.insertAdjacentHTML('beforeend', '<i class="scanbeam"></i>');

  // grid crisis: sparks on reveal / blackout + flicker of the capacity line
  $('#gc-reveal').addEventListener('click', () => setTimeout(() => {
    const l = $('#gc-line').getBoundingClientRect(); FX.sparks(l.left, l.top + l.height / 2, '#ff3d7f', 24);
  }, 2250));

  // timer: digits tick
  let lastSec = '';
  setInterval(() => {
    const t = $('#t-time'); if (!t || t.textContent === lastSec) return; lastSec = t.textContent;
    if ($('.pane[data-pane="timer"]').classList.contains('on')) animate(t, { opacity: [.55, 1] }, { duration: .25 });
  }, 250);

  // group cards: spark when they land
  $('#g-shuffle').addEventListener('click', () => setTimeout(() => {
    $$('.g-card').forEach((c, i) => setTimeout(() => { const r = c.getBoundingClientRect(); FX.sparks(r.left + 12, r.top + r.height / 2, '#3df2ff', 4); }, i * 50));
  }, 450));
  requestAnimationFrame(moveInk);

  FX.magnetic('.btn');
})();

/* ================= board (projector link) control ================= */
(function () {
  const C = window.GRIDLINE, $ = (s, r = document) => r.querySelector(s);
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: false } });
  const pin = () => { try { return sessionStorage.getItem('glc-pin') || ''; } catch (e) { return ''; } };
  let mode = 'step';
  const paint = () => document.querySelectorAll('#rb-seg button').forEach(b => b.classList.toggle('on', b.dataset.bm === mode));
  let vid = { v: 'water', cmd: 'pause', n: 0 };
  const payload = m => m === 'video' ? vid : m === 'step' ? { page: 0, step: window.GL_curStep } : m === 'timer' ? (window.GL_timerData ? GL_timerData() : {}) : m === 'groups' ? { groups: window.GL_lastGroups || [] } : {};
  async function set(m) {
    const { error } = await sb.rpc('gridline_set_board', { p_pin: pin(), p_mode: m, p_data: payload(m) });
    if (error) { alert('Could not change the board: ' + error.message); return; }
    mode = m; paint();
    const vp = document.getElementById('rb-vid'); if (vp) vp.hidden = m !== 'video';
    document.querySelectorAll('#rb-vid [data-v]').forEach(b => b.classList.toggle('on', m === 'video' && b.dataset.v === vid.v));
  }
  // called by the timer / groups panes: only pushes if that thing is what the board shows
  window.GL_boardSync = m => { if (mode === m) set(m); };
  // ▶ Start on every step: phone games open (board -> game page); other steps get a big countdown on the board
  let tStep = -1, dbStep = -1, dbIdx = -1;
  // unlocking the next step brings the board back from a step timer
  window.GL_onStepChanged = () => { if (mode === 'timer' && tStep >= 0 && tStep !== window.GL_curStep) { set('step'); tStep = -1; } };
  window.GL_paintStart = () => {
    const st = GL_STEPS[window.GL_curStep], b = $('#ls-start'); if (!st || !b) return;
    const on = st.ia ? !!(window.GL_iaOn && GL_iaOn()) : (mode === 'timer' && tStep === window.GL_curStep);
    if (st.debrief) {
      const n = st.debrief.length, i = dbStep === window.GL_curStep ? dbIdx : -1;
      b.textContent = i < 0 ? `🗣 Start debrief · 1/${n}` : i < n - 1 ? `Next question · ${i + 2}/${n} →` : '■ Close debrief';
      b.classList.toggle('green', i < n - 1); b.classList.toggle('pink', i >= n - 1); return;
    }
    b.textContent = st.ia ? (on ? '■ Hide game' : '▶ Start game') : (on ? '■ Stop timer' : `▶ Start · ${st.m} min on board`);
    b.classList.toggle('green', !on); b.classList.toggle('pink', on);
  };
  $('#ls-start').addEventListener('click', async () => {
    const st = GL_STEPS[window.GL_curStep]; if (!st) return;
    if (st.debrief) {
      if (dbStep !== window.GL_curStep) { dbStep = window.GL_curStep; dbIdx = -1; }
      if (dbIdx >= st.debrief.length - 1) { window.GL_meterClose && await GL_meterClose(); dbIdx = -1; dbStep = -1; GL_paintStart(); return; }
      dbIdx++; window.GL_debriefAsk && await GL_debriefAsk(st.debrief[dbIdx]); GL_paintStart(); return;
    }
    if (st.ia) { $('#ls-ia-go').click(); return; }
    if (mode === 'timer' && tStep === window.GL_curStep) { await set('step'); tStep = -1; GL_paintStart(); return; }
    const secs = st.m * 60;
    const { error } = await sb.rpc('gridline_set_board', { p_pin: pin(), p_mode: 'timer', p_data: { label: st.title.toUpperCase(), total: secs, left: secs, endAt: Date.now() + secs * 1000, running: true, step: window.GL_curStep } });
    if (error) { alert('Could not start: ' + error.message); return; }
    mode = 'timer'; tStep = window.GL_curStep; paint(); GL_paintStart(); window.FX && FX.zap && FX.zap('up');
  });
  // two board pages per step: 0 = title + rules, 1 = content / game
  let bpage = 0, bstep = -1;
  const curPage = () => (mode === 'step' && bstep === window.GL_curStep) ? bpage : 0;
  window.GL_paintBpage = () => {
    const b = $('#ls-bpage'); if (!b) return;
    const st = GL_STEPS[window.GL_curStep]; b.hidden = !(st && (st.sec || (st.ia && window.GL_iaOn && GL_iaOn())));
    b.textContent = curPage() === 1 ? '📺 Board: ← Rules' : '📺 Board: Continue →';
  };
  window.GL_boardPage = async n => {
    const { error } = await sb.rpc('gridline_set_board', { p_pin: pin(), p_mode: 'step', p_data: { page: n, step: window.GL_curStep } });
    if (error) { alert('Could not change the board: ' + error.message); return; }
    mode = 'step'; bpage = n; bstep = window.GL_curStep; paint(); GL_paintBpage();
  };
  $('#ls-bpage').addEventListener('click', () => { GL_boardPage(curPage() === 1 ? 0 : 1); window.FX && FX.zap && FX.zap('up'); });
  document.querySelectorAll('#rb-seg button').forEach(b => b.addEventListener('click', () => { set(b.dataset.bm); window.FX && FX.zap && FX.zap('up'); }));
  // 🎬 video on the board: pick one (it starts playing), then ▶ ⏸ ⟲
  document.querySelectorAll('#rb-vid [data-v]').forEach(b => b.addEventListener('click', () => { vid = { v: b.dataset.v, cmd: 'play', n: Date.now() }; set('video'); }));
  document.querySelectorAll('#rb-vid [data-c]').forEach(b => b.addEventListener('click', () => { vid = { ...vid, cmd: b.dataset.c, n: Date.now() }; set('video'); }));
  const take = d => { if (!d) return; mode = d.mode; tStep = d.mode === 'timer' && d.data && typeof d.data.step === 'number' ? d.data.step : -1; bpage = +(d.data && d.data.page) || 0; bstep = d.data && typeof d.data.step === 'number' ? d.data.step : -1; paint(); window.GL_paintBpage && GL_paintBpage(); window.GL_paintStart && GL_paintStart(); };
  sb.from('gridline_board').select('mode, data').eq('id', 1).maybeSingle().then(({ data }) => take(data));
  sb.channel('chair-board').on('postgres_changes', { event: '*', schema: 'public', table: 'gridline_board' }, p => take(p.new)).subscribe();
})();
