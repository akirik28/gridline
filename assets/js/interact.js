/* Gridline — live interactions: poll, opinion scale, word cloud, terms quiz.
   Answers go to Supabase (public.gridline_resp) via the gridline_respond RPC; anonymous, one answer per device per step.
   GLIA.mount(el, stepIndex, ia, { projector }) → cleanup function. Used by the delegate app and the chair console. */
(function () {
  const C = window.GRIDLINE;
  const { animate, stagger } = window.Motion;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COLS = ['#3df2ff', '#ffe14d', '#ff3d7f', '#4dffa6', '#9b7bff', '#ff9a3d'];
  const zap = d => window.FX && FX.zap && FX.zap(d);

  /* ---------- device id (anonymous) ---------- */
  let DEV;
  try { DEV = localStorage.getItem('gl-dev'); } catch (e) {}
  if (!DEV) { DEV = 'd' + Math.random().toString(36).slice(2) + Date.now().toString(36); try { localStorage.setItem('gl-dev', DEV); } catch (e) {} }
  const mineKey = i => 'gl-ans-' + i;
  const getMine = i => { try { return localStorage.getItem(mineKey(i)); } catch (e) { return null; } };
  const setMine = (i, v) => { try { localStorage.setItem(mineKey(i), v); } catch (e) {} };

  /* ---------- data layer ---------- */
  let sb = null, chan = null;
  const subs = new Set();
  function client() {
    if (sb || !window.supabase) return sb;
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: false } });
    let t;
    chan = sb.channel('gridline-resp')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gridline_resp' }, () => { clearTimeout(t); t = setTimeout(() => subs.forEach(f => f()), 250); })
      .subscribe();
    return sb;
  }
  async function fetchRows(step) {
    const c = client(); if (!c) return [];
    const { data } = await c.from('gridline_resp').select('device,value,at').eq('step', step).order('at');
    return data || [];
  }
  async function respond(step, value) {
    const c = client(); if (!c) throw new Error('offline');
    const { error } = await c.rpc('gridline_respond', { p_step: step, p_device: DEV, p_value: String(value) });
    if (error) throw error;
  }
  async function clear(pin, step) {
    const c = client();
    const { data, error } = await c.rpc('gridline_clear_resp', { p_pin: pin, p_step: step });
    if (error) throw error; return data;
  }

  /* ---------- shared shell ---------- */
  const LABEL = { poll: 'LIVE POLL', scale: 'WHERE DO YOU STAND?', words: 'WORD CLOUD', quiz: 'TERMS QUIZ' };
  function shell(el, ia, proj) {
    el.innerHTML = `<div class="ia ia-${ia.type}${proj ? ' proj' : ''}">
      <div class="ia-head"><span class="ia-tag mono"><i class="ia-dot"></i>${LABEL[ia.type]}</span><span class="ia-n mono" data-n>0 answers</span></div>
      <h3 class="ia-q">${esc(ia.q)}</h3>
      <div class="ia-in" data-in></div>
      <div class="ia-out" data-out></div>
      <p class="ia-msg mono" data-msg></p>
    </div>`;
    const root = $('.ia', el);
    animate(root, { opacity: [0, 1], y: [40, 0], scale: [.96, 1] }, { duration: .7, delay: .5, ease: [.2, .8, .2, 1] });
    return { root, inp: $('[data-in]', root), out: $('[data-out]', root), n: $('[data-n]', root), msg: $('[data-msg]', root) };
  }
  function flash(msg, text, bad) { msg.textContent = text; msg.classList.toggle('bad', !!bad); animate(msg, { opacity: [0, 1], y: [6, 0] }, { duration: .3 }); }
  function count(n, rows, word = 'answer') { const k = rows.length; n.textContent = `${k} ${word}${k === 1 ? '' : 's'}`; }

  /* ---------- POLL ---------- */
  function poll(ui, step, ia, proj) {
    let mine = getMine(step), rows = [];
    ui.out.innerHTML = ia.opts.map((o, i) => `<div class="pl-row" style="--c:${COLS[i % COLS.length]}" data-i="${i}">
        <div class="pl-fill"></div><span class="pl-l">${esc(o)}</span><b class="pl-p mono">0%</b></div>`).join('');
    if (!proj) {
      ui.inp.innerHTML = ia.opts.map((o, i) => `<button class="pl-btn" style="--c:${COLS[i % COLS.length]}" data-i="${i}"><i>${String.fromCharCode(65 + i)}</i><span>${esc(o)}</span></button>`).join('');
      animate($$('.pl-btn', ui.inp), { opacity: [0, 1], x: [-30, 0] }, { delay: stagger(.07, { startDelay: .7 }) });
      const vote = async (b, e) => {
        window.FX && FX.ripple && FX.ripple(b, e);
        const v = b.dataset.i; if (v === mine) return;
        try { await respond(step, v); ui.refresh(); mine = v; setMine(step, v); zap('up'); paint(true); flash(ui.msg, 'Vote counted ✓ — tap another bar to change it'); }
        catch (err) { flash(ui.msg, err.message === 'step locked' ? 'This step is not open yet.' : 'Could not send — check your connection.', true); }
      };
      $$('.pl-btn', ui.inp).forEach(b => b.addEventListener('click', e => vote(b, e)));
      $$('.pl-row', ui.out).forEach(b => { b.setAttribute('role', 'button'); b.tabIndex = 0; b.addEventListener('click', e => vote(b, e)); });
    }
    function paint(anim) {
      const tot = rows.length, cnt = ia.opts.map(() => 0);
      rows.forEach(r => { const i = +r.value; if (cnt[i] != null) cnt[i]++; });
      const show = proj || mine != null;
      ui.root.classList.toggle('voted', show);
      const max = Math.max(1, ...cnt);
      $$('.pl-row', ui.out).forEach((row, i) => {
        const p = tot ? Math.round(cnt[i] / tot * 100) : 0;
        $('.pl-fill', row).style.width = (tot ? cnt[i] / (proj ? max : tot) * 100 : 0) + '%';
        $('.pl-p', row).textContent = proj ? `${cnt[i]} · ${p}%` : `${p}%`;
        row.classList.toggle('mine', String(i) === mine);
        row.classList.toggle('top', tot > 0 && cnt[i] === max);
      });
      $$('.pl-btn', ui.inp).forEach(b => b.classList.toggle('on', b.dataset.i === mine));
      count(ui.n, rows, 'vote');
      if (anim && show) animate($$('.pl-row', ui.out), { opacity: [.4, 1] }, { delay: stagger(.05) });
    }
    return { set(r) { rows = r; const m = r.find(x => x.device === DEV); mine = m ? m.value : null; paint(false); }, paint };
  }

  /* ---------- SCALE ---------- */
  function scale(ui, step, ia, proj) {
    let mine = getMine(step), rows = [];
    ui.out.innerHTML = `<div class="sc-track"><div class="sc-grad"></div><div class="sc-dots"></div><div class="sc-avg"><b class="mono">avg</b></div></div>
      <div class="sc-ends mono"><span>← ${esc(ia.l)}</span><span>${esc(ia.r)} →</span></div>`;
    if (!proj) {
      ui.inp.innerHTML = `<div class="sc-pick"><input type="range" min="0" max="100" value="${mine ?? 50}" aria-label="${esc(ia.q)}"><output class="mono"></output></div>
        <button class="btn solid sc-go">Lock in ⚡</button>`;
      const r = $('input', ui.inp), o = $('output', ui.inp);
      const lab = v => v < 20 ? ia.l : v > 80 ? ia.r : v < 42 ? 'Leaning ' + ia.l.toLowerCase() : v > 58 ? 'Leaning ' + ia.r.toLowerCase() : 'Right in the middle';
      const upd = () => { o.textContent = lab(+r.value); r.style.setProperty('--v', r.value + '%'); };
      r.addEventListener('input', upd); upd();
      $('.sc-go', ui.inp).addEventListener('click', async e => {
        window.FX && FX.ripple && FX.ripple(e.currentTarget, e);
        try { await respond(step, r.value); ui.refresh(); mine = r.value; setMine(step, mine); zap('up'); paint(); flash(ui.msg, 'Locked in ✓ — move it and lock again to change'); }
        catch (err) { flash(ui.msg, err.message === 'step locked' ? 'This step is not open yet.' : 'Could not send — check your connection.', true); }
      });
    }
    const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
    function paint() {
      const show = proj || mine != null;
      ui.root.classList.toggle('voted', show);
      const dots = $('.sc-dots', ui.out), have = new Map($$('.sc-dot', dots).map(d => [d.dataset.d, d]));
      rows.forEach(r => {
        let d = have.get(r.device);
        if (!d) { d = document.createElement('i'); d.className = 'sc-dot'; d.dataset.d = r.device; d.style.top = (12 + hash(r.device) % 76) + '%'; dots.append(d); animate(d, { scale: [0, 1.6, 1] }, { duration: .5 }); }
        d.style.left = (+r.value) + '%';
        d.classList.toggle('mine', r.device === DEV);
        have.delete(r.device);
      });
      have.forEach(d => d.remove());
      const avgEl = $('.sc-avg', ui.out);
      if (rows.length) { const a = rows.reduce((s, r) => s + +r.value, 0) / rows.length; avgEl.style.left = a + '%'; avgEl.hidden = false; }
      else avgEl.hidden = true;
      count(ui.n, rows);
    }
    return { set(r) { rows = r; const m = r.find(x => x.device === DEV); mine = m ? m.value : null; paint(); }, paint };
  }

  /* ---------- WORDS ---------- */
  function words(ui, step, ia, proj) {
    let rows = [];
    const max = ia.max || 20;
    ui.out.innerHTML = `<div class="wc"><p class="wc-empty mono">Waiting for the first word…</p></div>`;
    if (!proj) {
      ui.inp.innerHTML = `<form class="wc-form"><input maxlength="${max}" placeholder="${esc(ia.ph || 'Type here')}" autocomplete="off" autocapitalize="off" enterkeyhint="send"><button class="btn solid">Send ⚡</button></form>`;
      const f = $('form', ui.inp), inp = $('input', f), mine = getMine(step);
      if (mine) inp.value = mine;
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const v = inp.value.trim(); if (!v) return;
        if (!ia.multi && v.split(/\s+/).length > (ia.words || 1)) { flash(ui.msg, ia.words > 1 ? `Max ${ia.words} words.` : 'Just one word!', true); animate(inp, { x: [0, -8, 8, -4, 0] }, { duration: .35 }); return; }
        try { await respond(step, v); ui.refresh(); setMine(step, v); zap('up'); inp.blur(); flash(ui.msg, `“${v}” is on the wall ✓ — send again to replace it`); }
        catch (err) { flash(ui.msg, err.message === 'step locked' ? 'This step is not open yet.' : 'Could not send — check your connection.', true); }
      });
    }
    const norm = s => s.toLowerCase().replace(/[.!?,;:"“”]+/g, '').trim();
    function paint() {
      const wc = $('.wc', ui.out), m = new Map();
      rows.forEach(r => { const k = norm(r.value); if (!k) return; const e = m.get(k) || { t: r.value.replace(/[.!?,;]+$/, ''), n: 0, mine: false }; e.n++; if (r.device === DEV) e.mine = true; m.set(k, e); });
      $('.wc-empty', wc) && m.size && $('.wc-empty', wc).remove();
      if (!m.size && !$('.wc-empty', wc)) wc.innerHTML = '<p class="wc-empty mono">Waiting for the first word…</p>';
      const top = Math.max(1, ...[...m.values()].map(e => e.n));
      const have = new Map($$('.wc-w', wc).map(w => [w.dataset.k, w]));
      [...m.entries()].forEach(([k, e], i) => {
        let w = have.get(k);
        const isNew = !w;
        if (isNew) {
          w = document.createElement('span'); w.className = 'wc-w'; w.dataset.k = k; w.textContent = e.t;
          w.style.setProperty('--c', COLS[[...k].reduce((s, c) => s + c.charCodeAt(0), 0) % COLS.length]);
          w.style.setProperty('--r', ((k.length * 7) % 9 - 4) + 'deg');
          // insert at a random spot so the cloud doesn't read like a list
          const kids = $$('.wc-w', wc); const at = kids[Math.floor(Math.random() * (kids.length + 1))];
          at ? wc.insertBefore(w, at) : wc.append(w);
        }
        const f = (proj ? 1.4 : 1) * (1 + (e.n - 1) / Math.max(1, top - 1 || 1) * 1.8);
        w.style.setProperty('--s', (top === 1 ? 1 : f).toFixed(2));
        w.classList.toggle('mine', e.mine);
        w.dataset.n = e.n > 1 ? '×' + e.n : '';
        if (isNew) animate(w, { scale: [0, 1.25, 1], opacity: [0, 1], filter: ['blur(8px)', 'blur(0px)'] }, { duration: .6, ease: [.2, .8, .2, 1] });
        else if (+w.dataset.last !== e.n) animate(w, { scale: [1.35, 1] }, { type: 'spring', bounce: .5 });
        w.dataset.last = e.n;
        have.delete(k);
      });
      have.forEach(w => animate(w, { opacity: 0, scale: .5 }, { duration: .25 }).then(() => w.remove()));
      count(ui.n, rows, ia.words > 1 ? 'answer' : 'word');
    }
    return { set(r) { rows = r; paint(); }, paint };
  }

  /* ---------- QUIZ (terms) ---------- */
  function quiz(ui, step, ia, proj) {
    let rows = [], done = getMine(step) != null;
    const ROUNDS = ia.rounds || 6;
    ui.out.innerHTML = `<div class="qz-hist"></div><p class="qz-avg mono"></p>`;
    if (!proj) {
      const T = (window.GL_TERMS || []).slice();
      let order = [], k = 0, score = 0, lock = false;
      const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      const start = () => { order = shuffle(T.map((_, i) => i)).slice(0, ROUNDS); k = 0; score = 0; ui.root.classList.remove('voted'); q(); };
      const q = () => {
        const ans = order[k], opts = shuffle([ans, ...shuffle(T.map((_, i) => i).filter(i => i !== ans)).slice(0, 3)]);
        ui.inp.innerHTML = `<div class="qz-top mono"><span>Q ${k + 1}/${ROUNDS}</span><span class="qz-sc">⚡ ${score}</span></div>
          <div class="qz-bar"><i style="width:${k / ROUNDS * 100}%"></i></div>
          <p class="qz-def">${esc(T[ans].d)}</p>
          <div class="qz-opts">${opts.map(i => `<button class="qz-o" data-i="${i}"><span>${T[i].ic}</span>${esc(T[i].t)}</button>`).join('')}</div>`;
        animate('.qz-def', { opacity: [0, 1], y: [20, 0] }, { duration: .4 });
        animate($$('.qz-o', ui.inp), { opacity: [0, 1], scale: [.85, 1] }, { delay: stagger(.06, { startDelay: .15 }), type: 'spring', bounce: .4 });
        lock = false;
        $$('.qz-o', ui.inp).forEach(b => b.addEventListener('click', () => {
          if (lock) return; lock = true;
          const ok = +b.dataset.i === ans;
          b.classList.add(ok ? 'ok' : 'no');
          if (ok) { score++; zap('up'); animate(b, { scale: [1, 1.08, 1] }, { duration: .35 }); }
          else { zap('down'); animate(b, { x: [0, -10, 10, -6, 0] }, { duration: .4 }); $(`.qz-o[data-i="${ans}"]`, ui.inp).classList.add('ok'); if (navigator.vibrate) try { navigator.vibrate(80); } catch (e) {} }
          $('.qz-sc', ui.inp).textContent = '⚡ ' + score;
          setTimeout(() => { k++; k < ROUNDS ? q() : end(); }, ok ? 800 : 1700);
        }));
      };
      const end = async () => {
        const msg = score === ROUNDS ? 'Perfect grid. ⚡' : score >= ROUNDS - 2 ? 'Strong signal!' : score >= ROUNDS / 2 ? 'Half charged — flip the cards again.' : 'Low battery — back to the cards!';
        ui.inp.innerHTML = `<div class="qz-end"><b class="qz-big">${score}<small>/${ROUNDS}</small></b><p>${msg}</p><button class="btn ghost qz-again">Play again ↻</button></div>`;
        animate('.qz-big', { scale: [0, 1.2, 1], rotate: [-10, 0] }, { duration: .7 });
        window.FX && FX.bolts && score >= ROUNDS - 1 && FX.bolts(ui.root, '#ffe14d', 6);
        $('.qz-again', ui.inp).addEventListener('click', start);
        done = true; ui.root.classList.add('voted');
        try { await respond(step, score); ui.refresh(); setMine(step, score); } catch (e) { flash(ui.msg, 'Score not sent — you’re offline.', true); }
        paint();
      };
      if (!T.length) ui.inp.innerHTML = '<p class="mono muted">Quiz unavailable.</p>';
      else if (done) { ui.inp.innerHTML = `<div class="qz-end"><b class="qz-big">${getMine(step)}<small>/${ROUNDS}</small></b><p>Your score</p><button class="btn ghost qz-again">Play again ↻</button></div>`; $('.qz-again', ui.inp).addEventListener('click', start); }
      else { ui.inp.innerHTML = `<button class="btn solid big qz-start">Start the quiz ⚡</button><p class="mono muted">${ROUNDS} definitions · pick the right term · fastest fingers win nothing but glory</p>`; $('.qz-start', ui.inp).addEventListener('click', start); }
    }
    function paint() {
      ui.root.classList.toggle('voted', proj || done);
      rows = rows.filter(r => /^\d+$/.test(r.value) && +r.value <= ROUNDS);
      const h = Array(ROUNDS + 1).fill(0); rows.forEach(r => h[+r.value]++);
      const mx = Math.max(1, ...h), me = getMine(step);
      $('.qz-hist', ui.out).innerHTML = h.map((n, s) => `<div class="qz-col${String(s) === String(me) && !proj ? ' mine' : ''}"><i style="height:${n / mx * 100}%"><b class="mono">${n || ''}</b></i><span class="mono">${s}</span></div>`).join('');
      $('.qz-avg', ui.out).textContent = rows.length ? `Committee average: ${(rows.reduce((s, r) => s + +r.value, 0) / rows.length).toFixed(1)} / ${ROUNDS}` : 'No scores yet';
      count(ui.n, rows, 'score');
    }
    return { set(r) { rows = r; paint(); }, paint };
  }

  const KINDS = { poll, scale, words, quiz };

  function mount(el, step, ia, o = {}) {
    if (!ia || !KINDS[ia.type]) { el.innerHTML = ''; el.hidden = true; return () => {}; }
    el.hidden = false;
    const ui = shell(el, ia, !!o.projector);
    ui.refresh = () => pull();
    const w = KINDS[ia.type](ui, step, ia, !!o.projector);
    let alive = true;
    async function pull() { const r = await fetchRows(step).catch(() => null); if (alive && r) w.set(r); }
    pull(); subs.add(pull);
    const iv = setInterval(pull, 6000);
    const vis = () => { if (!document.hidden) pull(); };
    document.addEventListener('visibilitychange', vis);
    return () => { alive = false; subs.delete(pull); clearInterval(iv); document.removeEventListener('visibilitychange', vis); };
  }

  window.GLIA = { mount, clear, device: DEV };
})();
