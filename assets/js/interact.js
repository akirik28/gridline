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
  /* sequential deck (e.g. Speed Dating): only the chair moves the rounds; phones + board follow */
  function deckSync(ui, step, ia, o) {
    const cards = ia.cards, ctl = !!o.control;
    let k = -1;
    ui.n.hidden = true;
    ui.inp.innerHTML = `<div class="dk"><div class="dk-stack"><i></i><i></i><article class="dk-card"><span class="dk-no mono"></span><p class="dk-q"></p></article></div>
      ${ctl ? '<div class="dk-nav"><button class="btn ghost dk-prev">← Round</button><button class="btn solid dk-next">Next round →</button></div>' : '<p class="dk-wait mono">Your chair moves to the next question</p>'}</div>`;
    const card = $('.dk-card', ui.inp);
    const show = (pos, dir) => {
      pos = Math.max(0, Math.min(pos, cards.length - 1));
      if (pos === k) return; dir = dir || (pos > k ? 1 : -1); k = pos;
      $('.dk-no', card).textContent = `ROUND ${k + 1} / ${cards.length}`;
      $('.dk-q', card).textContent = cards[k];
      card.style.setProperty('--c', COLS[k % COLS.length]);
      if (ctl) { $('.dk-prev', ui.inp).disabled = k === 0; $('.dk-next', ui.inp).disabled = k >= cards.length - 1; }
      animate(card, { rotateY: [dir * 90, 0], opacity: [0, 1], x: [dir * 60, 0] }, { duration: .5, ease: [.2, .8, .2, 1] });
      if (!ctl && k > 0) { zap('up'); if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {} }
    };
    const stop = onAlert(a => show(a.deck_step === step ? a.deck_pos : 0));
    if (k < 0) show(0, 1);
    if (ctl) {
      const go = async d => {
        const want = Math.max(0, Math.min(k + d, cards.length - 1));
        const c = client(); if (!c) return;
        const { error } = await c.rpc('gridline_deck_set', { p_pin: o.pin || '', p_step: step, p_pos: want });
        if (error) { flash(ui.msg, 'Could not move the deck: ' + error.message, true); return; }
        zap(d > 0 ? 'up' : 'down'); show(want, d);
      };
      $('.dk-next', ui.inp).addEventListener('click', () => go(1));
      $('.dk-prev', ui.inp).addEventListener('click', () => go(-1));
    }
    return { local: true, stop };
  }
  function client() {
    if (sb || !window.supabase) return sb;
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: false } });
    let t;
    chan = sb.channel('gridline-resp')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gridline_resp' }, () => { clearTimeout(t); t = setTimeout(() => subs.forEach(f => f()), 250); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gridline_alert' }, p => { if (p.new) { lastAlert = p.new; aSubs.forEach(f => f(p.new)); } })
      .subscribe();
    const pullAlert = () => sb.from('gridline_alert').select('deck_step, deck_pos').eq('id', 1).maybeSingle().then(({ data }) => { if (data) { lastAlert = data; aSubs.forEach(f => f(data)); } });
    pullAlert(); setInterval(pullAlert, 6000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pullAlert(); });
    return sb;
  }
  let lastAlert = null; const aSubs = new Set();
  function onAlert(fn) { client(); aSubs.add(fn); if (lastAlert) fn(lastAlert); return () => aSubs.delete(fn); }
  // a widget key is the step index, or "step.slot" for a second widget on the same step
  const parse = k => { const [a, b] = String(k).split('.'); return { step: +a, slot: +(b || 0) }; };
  async function fetchRows(key) {
    const c = client(); if (!c) return [];
    const { step, slot } = parse(key);
    const { data } = await c.from('gridline_resp').select('device,value,at').eq('step', step).eq('slot', slot).order('at');
    return data || [];
  }
  async function respond(key, value) {
    const c = client(); if (!c) throw new Error('offline');
    const { step, slot } = parse(key);
    const { error } = await c.rpc('gridline_respond', { p_step: step, p_device: DEV, p_value: String(value), p_slot: slot });
    if (error) throw error;
  }
  async function clear(pin, step) {
    const c = client();
    const { data, error } = await c.rpc('gridline_clear_resp', { p_pin: pin, p_step: step });
    if (error) throw error; return data;
  }

  /* ---------- shared shell ---------- */
  const LABEL = { poll: 'LIVE POLL', scale: 'WHERE DO YOU STAND?', words: 'WORD CLOUD', quiz: 'TERMS QUIZ', deck: 'QUESTION DECK', secret: 'TOP SECRET', facts: 'WHO SAID IT?', ask: 'QUESTION WALL', speech: 'SPEECH TRAINER', rank: 'RANK IT', mark: 'KEY WORDS' };
  function shell(el, ia, proj) {
    el.innerHTML = `<div class="ia ia-${ia.type}${proj ? ' proj' : ''}">
      <div class="ia-head"><span class="ia-tag mono"><i class="ia-dot"></i>${esc(ia.tag || LABEL[ia.type])}</span><span class="ia-n mono" data-n>0 answers</span></div>
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

  /* ---------- DECK (local question cards) ---------- */
  function deck(ui, step, ia, proj, o = {}) {
    const cards = ia.cards, seq = ia.mode !== 'shuffle';
    if (seq) return deckSync(ui, step, ia, o);
    let k = 0, order = cards.map((_, i) => i);
    if (!seq) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    ui.n.hidden = true;
    ui.inp.innerHTML = `<div class="dk"><div class="dk-stack"><i></i><i></i><article class="dk-card"><span class="dk-no mono"></span><p class="dk-q"></p></article></div>
      <div class="dk-nav">${seq ? '<button class="btn ghost dk-prev">←</button>' : ''}<button class="btn solid dk-next">${seq ? 'Next round →' : 'Deal another 🃏'}</button></div></div>`;
    const card = $('.dk-card', ui.inp);
    const show = (dir = 1) => {
      $('.dk-no', card).textContent = seq ? `ROUND ${k + 1} / ${cards.length}` : `CARD ${k + 1}`;
      $('.dk-q', card).textContent = cards[order[k % order.length]];
      card.style.setProperty('--c', COLS[k % COLS.length]);
      if (seq) { $('.dk-prev', ui.inp).disabled = k === 0; $('.dk-next', ui.inp).disabled = k >= cards.length - 1; }
      animate(card, { rotateY: [dir * 90, 0], opacity: [0, 1], x: [dir * 60, 0] }, { duration: .5, ease: [.2, .8, .2, 1] });
    };
    $('.dk-next', ui.inp).addEventListener('click', e => { window.FX && FX.ripple && FX.ripple(e.currentTarget, e); zap('up'); k++; if (!seq && k % order.length === 0) order.reverse(); show(1); });
    seq && $('.dk-prev', ui.inp).addEventListener('click', () => { if (k) { zap('down'); k--; show(-1); } });
    show(1);
    return { local: true };
  }

  /* ---------- SECRET (balanced random role per phone) ---------- */
  function secret(ui, step, ia, proj) {
    let rows = [], asked = false;
    const it = ia.items, mineIdx = () => { const i = rows.findIndex(r => r.device === DEV); return i < 0 ? -1 : i % it.length; };
    if (!proj) {
      ui.inp.innerHTML = `<button class="btn solid big sc-get">Get my secret ${esc(ia.noun || 'card')} 🤫</button>`;
      $('.sc-get', ui.inp).addEventListener('click', async e => {
        if (asked) return; asked = true;
        try { await respond(step, 'in'); ui.refresh(); zap('up'); } catch (err) { asked = false; flash(ui.msg, err.message === 'step locked' ? 'This step is not open yet.' : 'Could not connect — try again.', true); }
      });
    }
    function paint() {
      const cnt = it.map(() => 0); rows.forEach((r, i) => cnt[i % it.length]++);
      ui.out.innerHTML = `<div class="sx-herds">${it.map((x, i) => `<span style="--c:${COLS[i % COLS.length]}"><b>${x.ic}</b>${proj ? esc(x.t) + ' ' : ''}<em class="mono">×${cnt[i]}</em></span>`).join('')}</div>`;
      count(ui.n, rows, 'player');
      if (proj) return;
      const m = mineIdx();
      if (m < 0) return;
      if (!$('.sx-card', ui.inp) || +$('.sx-card', ui.inp).dataset.m !== m) {
        const x = it[m];
        ui.inp.innerHTML = `<button class="sx-card" data-m="${m}" style="--c:${COLS[m % COLS.length]}"><span class="sx-cover"><b>🔒</b>Press &amp; hold to peek<small>don’t let anyone see!</small></span>
          <span class="sx-face"><b>${x.ic}</b><strong>${esc(x.t)}</strong><small>${esc(x.s || '')}</small></span></button>`;
        const c = $('.sx-card', ui.inp);
        const on = e => { e.preventDefault(); c.classList.add('peek'); if (navigator.vibrate) try { navigator.vibrate(30); } catch (er) {} };
        const off = () => c.classList.remove('peek');
        c.addEventListener('pointerdown', on); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => c.addEventListener(ev, off));
        c.addEventListener('contextmenu', e => e.preventDefault());
        animate(c, { scale: [.6, 1], rotate: [-6, 0], opacity: [0, 1] }, { type: 'spring', bounce: .45 });
      }
    }
    return { set(r) { rows = r; paint(); }, paint };
  }

  /* ---------- FACTS (anonymous, revealed one by one on the projector) ---------- */
  function facts(ui, step, ia, proj) {
    let rows = [], order = [], k = 0;
    if (!proj) {
      ui.inp.innerHTML = `<form class="wc-form tall"><textarea maxlength="${ia.max || 120}" rows="3" placeholder="${esc(ia.ph || 'Type here')}"></textarea><button class="btn solid">Into the hat 🎩</button></form>`;
      const f = $('form', ui.inp), t = $('textarea', f), mine = getMine(step);
      if (mine) t.value = mine;
      f.addEventListener('submit', async e => {
        e.preventDefault(); const v = t.value.trim(); if (v.length < 3) return;
        try { await respond(step, v); ui.refresh(); setMine(step, v); zap('up'); t.blur(); flash(ui.msg, 'In the hat ✓ — keep a straight face 😐'); }
        catch (err) { flash(ui.msg, err.message === 'step locked' ? 'This step is not open yet.' : 'Could not send — check your connection.', true); }
      });
    } else {
      ui.out.innerHTML = `<article class="fx-card"><span class="fx-no mono"></span><p class="fx-t"></p></article>
        <div class="dk-nav"><button class="btn ghost fx-prev">←</button><button class="btn solid fx-next">Next fact →</button></div>`;
      $('.fx-next', ui.out).addEventListener('click', () => { if (k < order.length - 1) { k++; zap('up'); paint(1); } });
      $('.fx-prev', ui.out).addEventListener('click', () => { if (k > 0) { k--; zap('down'); paint(-1); } });
    }
    function paint(dir) {
      count(ui.n, rows, 'fact');
      if (!proj) return;
      const devs = rows.map(r => r.device);
      order = order.filter(d => devs.includes(d));
      devs.filter(d => !order.includes(d)).forEach(d => order.splice(order.length ? k + 1 + Math.floor(Math.random() * (order.length - k)) : 0, 0, d));
      k = Math.min(k, Math.max(0, order.length - 1));
      const r = rows.find(x => x.device === order[k]);
      $('.fx-no', ui.out).textContent = order.length ? `FACT ${k + 1} / ${order.length}` : 'WAITING FOR FACTS…';
      $('.fx-t', ui.out).textContent = r ? r.value : 'Delegates type their weird fact on their phones.';
      $('.fx-prev', ui.out).disabled = k === 0; $('.fx-next', ui.out).disabled = k >= order.length - 1;
      if (dir) animate('.fx-card', { rotateX: [dir * 70, 0], opacity: [0, 1] }, { duration: .5, ease: [.2, .8, .2, 1] });
    }
    return { set(r) { rows = r; paint(); }, paint };
  }

  /* ---------- ASK (question wall) ---------- */
  function ask(ui, step, ia, proj) {
    let rows = [];
    if (!proj) {
      ui.inp.innerHTML = `<form class="wc-form tall"><textarea maxlength="${ia.max || 140}" rows="2" placeholder="${esc(ia.ph || 'Your question…')}"></textarea><button class="btn solid">${esc(ia.btn || 'Post ⚡')}</button></form>`;
      const f = $('form', ui.inp), t = $('textarea', f), mine = getMine(step);
      if (mine) t.value = mine;
      f.addEventListener('submit', async e => {
        e.preventDefault(); const v = t.value.trim(); if (v.length < 3) return;
        try { await respond(step, v); ui.refresh(); setMine(step, v); zap('up'); t.blur(); flash(ui.msg, 'Posted ✓ — edit and post again to change it'); }
        catch (err) { flash(ui.msg, err.message === 'step locked' ? 'This step is not open yet.' : 'Could not send — check your connection.', true); }
      });
    }
    const EMPTY = `<p class="wc-empty mono">${esc(ia.empty || 'No questions yet.')}</p>`;
    ui.out.innerHTML = `<div class="aw">${EMPTY}</div>`;
    function paint() {
      const aw = $('.aw', ui.out), have = new Map($$('.aw-q', aw).map(q => [q.dataset.d, q]));
      if (rows.length) $('.wc-empty', aw)?.remove(); else if (!$('.wc-empty', aw)) aw.innerHTML = EMPTY;
      [...rows].reverse().forEach((r, i) => {
        let q = have.get(r.device);
        if (!q) { q = document.createElement('div'); q.className = 'aw-q'; q.dataset.d = r.device; q.style.setProperty('--c', COLS[[...r.device].reduce((s, c) => s + c.charCodeAt(0), 0) % COLS.length]); aw.prepend(q); animate(q, { opacity: [0, 1], y: [-20, 0], scale: [.9, 1] }, { duration: .45 }); }
        q.textContent = r.value; q.classList.toggle('mine', r.device === DEV);
        have.delete(r.device);
      });
      have.forEach(q => q.remove());
      count(ui.n, rows, ia.noun || 'question');
    }
    return { set(r) { rows = r; paint(); }, paint };
  }

  /* ---------- RANK (tap the options in order; results = average position) ---------- */
  function rank(ui, step, ia, proj) {
    const N = ia.opts.length;
    let rows = [], order = [];
    const saved = getMine(step); if (saved) order = [...saved].map(Number).filter(i => i < N);
    ui.out.innerHTML = `<div class="rk-res">${ia.opts.map((o, i) => `<div class="rk-row" data-i="${i}" style="--c:${COLS[i % COLS.length]}"><div class="rk-fill"></div><b class="rk-pos mono">–</b><span class="rk-l">${esc(o)}<i class="rk-avg mono"></i></span></div>`).join('')}</div>`;
    if (!proj) {
      ui.inp.innerHTML = `<p class="rk-hint mono">${esc(ia.hint || 'Tap in order — first tap = number 1')}</p>
        <div class="rk-pick">${ia.opts.map((o, i) => `<button class="rk-btn" data-i="${i}" style="--c:${COLS[i % COLS.length]}"><b class="mono"></b><span>${esc(o)}</span></button>`).join('')}</div>
        <div class="rk-bar"><button class="btn ghost rk-reset">Reset</button><button class="btn solid rk-go" disabled>Lock in ⚡</button></div>`;
      const btns = $$('.rk-btn', ui.inp), go = $('.rk-go', ui.inp);
      const draw = () => {
        btns.forEach(b => { const k = order.indexOf(+b.dataset.i); b.classList.toggle('on', k >= 0); $('b', b).textContent = k >= 0 ? k + 1 : ''; });
        go.disabled = order.length < N;
        go.textContent = order.length < N ? `${N - order.length} to go…` : 'Lock in ⚡';
      };
      btns.forEach(b => b.addEventListener('click', e => {
        const i = +b.dataset.i, k = order.indexOf(i);
        if (k >= 0) order.splice(k); else { order.push(i); window.FX && FX.ripple && FX.ripple(b, e); animate(b, { scale: [.94, 1] }, { duration: .25 }); }
        if (order.length === N - 1) order.push(...[...Array(N).keys()].filter(x => !order.includes(x)));
        draw();
      }));
      $('.rk-reset', ui.inp).addEventListener('click', () => { order = []; draw(); });
      go.addEventListener('click', async e => {
        if (order.length < N) return;
        window.FX && FX.ripple && FX.ripple(go, e);
        const v = order.join('');
        try { await respond(step, v); ui.refresh(); setMine(step, v); zap('up'); flash(ui.msg, 'Ranking locked ✓ — change it and lock again any time'); }
        catch (err) { flash(ui.msg, err.message === 'step locked' ? 'This step is not open yet.' : 'Could not send — check your connection.', true); }
      });
      animate(btns, { opacity: [0, 1], x: [-24, 0] }, { delay: stagger(.06, { startDelay: .6 }) });
      draw();
    }
    function paint() {
      const valid = a => a.length === N && new Set(a).size === N && a.every(i => i >= 0 && i < N);
      const ok = rows.map(r => [...r.value].map(Number)).filter(valid);
      const mineRow = rows.find(r => r.device === DEV);
      ui.root.classList.toggle('voted', proj || !!mineRow);
      const sum = Array(N).fill(0), first = Array(N).fill(0);
      ok.forEach(a => a.forEach((opt, pos) => { sum[opt] += pos + 1; if (pos === 0) first[opt]++; }));
      const avg = sum.map(x => ok.length ? x / ok.length : 0);
      const sorted = [...Array(N).keys()].sort((a, b) => ok.length ? avg[a] - avg[b] : a - b);
      const els = $$('.rk-row', ui.out), before = new Map(els.map(el => [el, el.getBoundingClientRect().top]));
      els.forEach(el => {
        const i = +el.dataset.i, p = sorted.indexOf(i);
        el.style.order = p;
        $('.rk-pos', el).textContent = ok.length ? p + 1 : '–';
        $('.rk-fill', el).style.width = ok.length ? ((N - avg[i]) / (N - 1) * 100) + '%' : '0%';
        $('.rk-avg', el).textContent = ok.length ? `avg ${avg[i].toFixed(1)}${first[i] ? ` · ${first[i]}× #1` : ''}` : '';
        el.classList.toggle('top', ok.length > 0 && p === 0);
        el.classList.toggle('mine', !!mineRow && mineRow.value[0] === String(i));
      });
      els.forEach(el => { const d = before.get(el) - el.getBoundingClientRect().top; if (d && Math.abs(d) < 2000) animate(el, { y: [d, 0] }, { duration: .6, ease: [.2, .8, .2, 1] }); });
      count(ui.n, ok, 'ranking');
    }
    return { set(r) { rows = r; paint(); }, paint };
  }

  /* ---------- MARK (tap the key words — local; on the projector the chair marks live) ---------- */
  function mark(ui, step, ia, proj) {
    const key = 'gl-mark-' + step;
    let on = new Set(); try { on = new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch (e) {}
    let w = 0;
    ui.out.innerHTML = `<p class="mk-text">${ia.text.split(/(\s+)/).map(p => !p || /^\s+$/.test(p) ? p : `<span class="mk-w" data-w="${w++}">${esc(p)}</span>`).join('')}</p>
      <p class="mk-hint mono">${esc(ia.hint || 'Tap the key words to underline them')}</p>`;
    const words = $$('.mk-w', ui.out);
    const draw = () => { words.forEach(s => s.classList.toggle('on', on.has(+s.dataset.w))); ui.n.textContent = `${on.size} marked`; };
    words.forEach(s => s.addEventListener('click', () => {
      const i = +s.dataset.w; on.has(i) ? on.delete(i) : on.add(i);
      try { localStorage.setItem(key, JSON.stringify([...on])); } catch (e) {}
      if (on.has(i)) animate(s, { scale: [1.18, 1] }, { duration: .3 });
      draw();
    }));
    draw();
    return { local: true };
  }

  /* ---------- SPEECH (local practice timer) ---------- */
  function speech(ui, step, ia, proj) {
    const P = ia.presets; let cur = 0, left = P[0].s, run = false, last = 0, raf, warned = false, ended = false;
    ui.n.hidden = true;
    ui.inp.innerHTML = `<div class="sp-tabs">${P.map((p, i) => `<button class="sp-tab${i ? '' : ' on'}" data-i="${i}">${esc(p.n)}<small class="mono">${Math.floor(p.s / 60)}:${String(p.s % 60).padStart(2, '0')}</small></button>`).join('')}</div>
      <div class="sp-face"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" class="sp-bg"/><circle cx="100" cy="100" r="88" class="sp-arc"/></svg><div class="sp-t mono">0:00</div><div class="sp-tip mono"></div></div>
      <div class="dk-nav"><button class="btn ghost sp-reset">Reset</button><button class="btn solid sp-go">Start ▶</button></div>`;
    const arc = $('.sp-arc', ui.inp), C2 = 2 * Math.PI * 88; arc.style.strokeDasharray = C2;
    const fmt = v => (v < 0 ? '+' : '') + Math.floor(Math.abs(v) / 60) + ':' + String(Math.floor(Math.abs(v) % 60)).padStart(2, '0');
    function draw() {
      const tot = P[cur].s, face = $('.sp-face', ui.inp);
      $('.sp-t', ui.inp).textContent = fmt(Math.ceil(left));
      arc.style.strokeDashoffset = C2 * (1 - Math.max(0, left) / tot);
      face.classList.toggle('warn', left <= 30 && left > 0); face.classList.toggle('over', left <= 0);
      $('.sp-tip', ui.inp).textContent = left <= 0 ? 'TIME — wrap up now!' : left <= 30 ? 'last 30 seconds' : run ? (P[cur].tip || 'breathe · eye contact · slow down') : 'ready when you are';
    }
    function tick() {
      if (!run) return;
      const now = Date.now(); left -= (now - last) / 1000; last = now;
      if (left <= 30 && !warned) { warned = true; zap('down'); if (navigator.vibrate) try { navigator.vibrate(120); } catch (e) {} }
      if (left <= 0 && !ended) { ended = true; zap('down'); setTimeout(() => zap('down'), 300); if (navigator.vibrate) try { navigator.vibrate([200, 100, 200]); } catch (e) {} }
      draw();
    }
    const go = $('.sp-go', ui.inp);
    go.addEventListener('click', () => { run = !run; last = Date.now(); go.textContent = run ? 'Pause ❚❚' : 'Start ▶'; zap('up'); clearInterval(raf); if (run) raf = setInterval(tick, 200); draw(); });
    const reset = () => { run = false; clearInterval(raf); left = P[cur].s; warned = false; ended = false; go.textContent = 'Start ▶'; draw(); };
    $('.sp-reset', ui.inp).addEventListener('click', reset);
    $$('.sp-tab', ui.inp).forEach(b => b.addEventListener('click', () => { $$('.sp-tab', ui.inp).forEach(x => x.classList.toggle('on', x === b)); cur = +b.dataset.i; reset(); zap('up'); }));
    draw();
    return { local: true, stop: () => clearInterval(raf) };
  }

  const KINDS = { poll, scale, words, quiz, deck, secret, facts, ask, speech, rank, mark };

  function mountOne(el, step, ia, o) {
    const ui = shell(el, ia, !!o.projector);
    let alive = true, w;
    async function pull() { const r = await fetchRows(step).catch(() => null); if (alive && r && w && w.set) w.set(r); }
    ui.refresh = () => pull();
    w = KINDS[ia.type](ui, step, ia, !!o.projector, o);
    if (w.local) return () => { alive = false; w.stop && w.stop(); };
    pull(); subs.add(pull);
    const iv = setInterval(pull, 6000);
    const vis = () => { if (!document.hidden) pull(); };
    document.addEventListener('visibilitychange', vis);
    return () => { alive = false; subs.delete(pull); clearInterval(iv); document.removeEventListener('visibilitychange', vis); };
  }

  function mount(el, step, ia, o = {}) {
    const list = (Array.isArray(ia) ? ia : [ia]).filter(x => x && KINDS[x.type]);
    if (!list.length) { el.innerHTML = ''; el.hidden = true; return () => {}; }
    el.hidden = false; el.innerHTML = '';
    const stops = list.map((x, k) => { const d = document.createElement('div'); d.className = 'ia-slot'; el.append(d); return mountOne(d, k ? `${step}.${k}` : step, x, o); });
    return () => stops.forEach(f => f());
  }

  window.GLIA = { mount, clear, device: DEV };
})();
