/* Gridline — delegate app: one step at a time, unlocked live by the chair */
(function () {
  const { animate, stagger } = window.Motion;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const R = FX.reduce;
  const S = GL_STEPS, N = S.length;
  const bg = FX.grid($('#grid-bg'));
  FX.cursor();

  let live = -1, liveAt = Date.now(), view = 0, entered = false, cleanup = [];

  /* ================= splash ================= */
  const splash = $('#splash'), pct = $('#sp-pct');
  animate(0, 100, { duration: R ? 0 : 1.6, ease: [.3, 0, .2, 1], onUpdate: v => pct.textContent = String(Math.round(v)).padStart(3, '0') });
  animate('#plug', { scale: [0, 1], rotate: [-90, 0] }, { type: 'spring', bounce: .5, delay: .3 });
  function enter() {
    if (entered) return; entered = true;
    GLAlert.unlockAudio(); FX.zap('up'); bg && bg.surge(18);
    animate(splash, { clipPath: ['circle(150% at 50% 50%)', 'circle(0% at 50% 50%)'] }, { duration: .9, ease: [.7, 0, .2, 1] }).then(() => splash.remove());
    splash.classList.add('gone');
    render(view, { intro: true });
  }
  $('#plug').addEventListener('click', enter);

  /* ================= step rendering ================= */
  const pad = n => String(n).padStart(2, '0');
  function render(i, o = {}) {
    const prevView = view;
    view = Math.max(0, Math.min(i, Math.max(live, 0)));
    const st = S[view], day = GL_DAYS[st.d], kind = GL_KINDS[st.k];
    cleanup.forEach(f => f()); cleanup = [];
    document.documentElement.style.setProperty('--day', day.c);
    bg && bg.tint && bg.tint(day.c);
    if (entered && !o.intro && !o.quiet) FX.sweep(day.c, view >= prevView ? 1 : -1);
    $('#day-chip').textContent = day.label;
    $('#st-day').textContent = day.name;
    $('#st-time').textContent = st.t;
    $('#st-num').textContent = `STEP ${pad(view + 1)} / ${N}`;
    $('#step-count').textContent = `${pad(view + 1)}/${N}`;
    $('#st-kind').innerHTML = `<i>${kind.ic}</i>${kind.n}<em>${st.m} min</em>`;
    const title = $('#st-title'); title.textContent = st.title;
    const chars = FX.split(title, 'words');
    $('#st-rules').innerHTML = st.rules.map(r => `<li><span>${r}</span><i class="chg"></i></li>`).join('');
    // illustrated hero art for this kind of step
    let art = $('#st-art');
    if (!art) { art = document.createElement('div'); art.id = 'st-art'; art.className = 'st-art'; $('#st-kind').after(art); }
    cleanup.push(FX.art(art, st.k));
    $('#step').dataset.kind = st.k;
    const box = $('#st-content'); box.innerHTML = '';
    if (st.sec) { const tpl = document.getElementById(st.sec); if (tpl) box.append(tpl.content.cloneNode(true)); }
    box.hidden = !st.sec;
    navState(); timer();
    scrollTo({ top: 0, behavior: R ? 'auto' : 'smooth' });

    // entry choreography
    const card = $('#step');
    animate(card, { opacity: [0, 1] }, { duration: .3 });
    animate('.st-meta span', { opacity: [0, 1], y: [-12, 0] }, { delay: stagger(.06) });
    $$('.st-meta span').forEach((s, k) => k === 2 && FX.scramble(s, s.textContent, 600));
    animate('#st-kind', { opacity: [0, 1], x: [-30, 0], scale: [.8, 1] }, { type: 'spring', bounce: .5, delay: .1 });
    animate(chars, { y: ['110%', '0%'], opacity: [0, 1], rotate: [8, 0], filter: ['blur(10px)', 'blur(0px)'] }, { delay: stagger(.07, { startDelay: .15 }), duration: .75, ease: [.2, .8, .2, 1] });
    const lis = $$('#st-rules li');
    animate(lis, { opacity: [0, 1], x: [-40, 0] }, { delay: stagger(.12, { startDelay: .45 }), duration: .6, ease: [.2, .8, .2, 1] });
    lis.forEach((li, k) => {
      const t = setTimeout(() => {
        animate($('.chg', li), { scaleX: [0, 1], opacity: [1, 1, .35] }, { duration: .55, ease: [.6, 0, .2, 1] })
          .then(() => { li.classList.add('lit'); if (!R) animate(li, { boxShadow: ['0 0 0 1px var(--day), 0 0 34px color-mix(in srgb, var(--day) 35%, transparent)', '0 0 0 0 transparent'] }, { duration: .9 }); });
      }, 650 + k * 260);
      cleanup.push(() => clearTimeout(t));
    });
    animate('#st-timer', { opacity: [0, 1], scaleX: [.6, 1] }, { delay: .6, duration: .6 });
    if (st.sec) enhance(box);
    cleanup.push(GLIA.mount($('#st-ia'), view, st.ia));
    $$('#dr-list .dr-step').forEach(b => b.classList.toggle('cur', +b.dataset.i === view));
  }

  function navState() {
    $('#sn-prev').disabled = view <= 0;
    $('#sn-next').disabled = view >= live;
    $('#sn-live').classList.toggle('show', live >= 0 && view !== live);
    $('.stepnav').classList.toggle('one', live <= 0);
  }

  /* live timer bar for the current step */
  let tInt;
  function timer() {
    clearInterval(tInt);
    if (!$('#stt-fill .spark')) { const sp = document.createElement('i'); sp.className = 'spark'; $('#stt-fill').append(sp); }
    const st = S[view], bar = $('#st-timer');
    const isLive = view === live;
    bar.classList.toggle('done', !isLive);
    const paint = () => {
      if (!isLive) { $('#stt-fill').style.width = '100%'; $('#stt-txt').textContent = 'done ✓'; return; }
      const el = (Date.now() - liveAt) / 60000, p = Math.min(1, el / st.m), left = Math.max(0, Math.ceil(st.m - el));
      $('#stt-fill').style.width = (p * 100) + '%';
      $('#stt-txt').textContent = p >= 1 ? 'time’s up — wait for your chair' : `≈ ${left} min left`;
      bar.classList.toggle('late', p >= .85);
    };
    paint(); tInt = setInterval(paint, 5000);
  }

  /* ================= unlock fanfare ================= */
  function fanfare(n) {
    const u = $('#unlock');
    $('#unlock-n').textContent = pad(n + 1);
    u.classList.add('on');
    FX.zap('up'); bg && bg.surge(30);
    if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) {}
    animate(u, { clipPath: ['inset(50% 0 50% 0)', 'inset(0% 0 0% 0)'] }, { duration: .45, ease: [.7, 0, .2, 1] });
    animate('#unlock-n', { scale: [2.4, 1], opacity: [0, 1] }, { type: 'spring', bounce: .45, delay: .15 });
    FX.bolts(u, getComputedStyle(document.documentElement).getPropertyValue('--day').trim() || '#3df2ff', 6);
    animate('#unlock span', { letterSpacing: ['1.2em', '.4em'], opacity: [0, 1] }, { duration: .8 });
    return new Promise(res => setTimeout(() => {
      animate(u, { clipPath: ['inset(0% 0 0% 0)', 'inset(0 0 100% 0)'] }, { duration: .5, ease: [.7, 0, .2, 1] }).then(() => { u.classList.remove('on'); res(); });
    }, 1100));
  }

  /* ================= live state from the chair ================= */
  window.GL_onRow = async row => {
    const at = new Date(row.step_at).getTime();
    if (row.step === live) { if (at !== liveAt) { liveAt = at; timer(); } return; }
    const first = live === -1;
    const followed = view === live || first;
    live = Math.min(row.step, N - 1); liveAt = at;
    buildDrawer();
    if (first) { view = live; if (entered) render(view); else prefill(); return; }
    if (followed || view > live) {
      if (entered) await fanfare(live);
      render(live);
    } else navState();
  };
  function prefill() { /* behind the splash: show the live step quietly */ render(view); }

  /* ================= navigation ================= */
  $$('.sn-btn, .sn-live').forEach(b => b.addEventListener('pointerdown', e => FX.ripple(b, e)));
  $('#sn-prev').addEventListener('click', () => { if (view > 0) { FX.zap('up'); render(view - 1); } });
  $('#sn-next').addEventListener('click', () => { if (view < live) { FX.zap('up'); render(view + 1); } });
  $('#sn-live').addEventListener('click', () => { FX.zap('up'); render(live); });
  addEventListener('keydown', e => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowLeft') $('#sn-prev').click();
    if (e.key === 'ArrowRight') $('#sn-next').click();
  });

  /* drawer */
  const drawer = $('#drawer'), scrim = $('#scrim');
  function buildDrawer() {
    let html = '', lastD = 0;
    S.forEach((st, i) => {
      if (st.d !== lastD) { lastD = st.d; const d = GL_DAYS[st.d]; html += `<h4 class="mono" style="--c:${d.c}">${d.label} · ${d.name}</h4>`; }
      const open = i <= live;
      html += open
        ? `<button class="dr-step${i === live ? ' live' : ''}" data-i="${i}"><span class="mono">${pad(i + 1)}</span><b>${st.title}</b><em>${GL_KINDS[st.k].ic}</em></button>`
        : `<div class="dr-step locked"><span class="mono">${pad(i + 1)}</span><b>Locked</b><em>🔒</em></div>`;
    });
    $('#dr-list').innerHTML = html;
    $$('#dr-list button.dr-step').forEach(b => b.addEventListener('click', () => { closeDrawer(); render(+b.dataset.i); }));
  }
  function openDrawer() {
    drawer.classList.add('on'); scrim.classList.add('on'); $('#steps-btn').setAttribute('aria-expanded', 'true');
    animate(drawer, { x: ['100%', '0%'] }, { duration: .45, ease: [.2, .8, .2, 1] });
    animate('#dr-list > *', { opacity: [0, 1], x: [40, 0] }, { delay: stagger(.015) });
    const cur = $('#dr-list .live'); cur && setTimeout(() => cur.scrollIntoView({ block: 'center' }), 50);
  }
  function closeDrawer() {
    animate(drawer, { x: ['0%', '100%'] }, { duration: .35, ease: [.7, 0, .2, 1] }).then(() => drawer.classList.remove('on'));
    scrim.classList.remove('on'); $('#steps-btn').setAttribute('aria-expanded', 'false');
  }
  $('#steps-btn').addEventListener('click', () => drawer.classList.contains('on') ? closeDrawer() : openDrawer());
  $('#dr-x').addEventListener('click', closeDrawer); scrim.addEventListener('click', closeDrawer);

  /* ================= content enhancers (run on each render) ================= */
  function countUp(el) {
    animate(0, +el.dataset.count, { duration: 1.4, ease: [.2, .8, .2, 1], onUpdate: v => el.textContent = Math.round(v) });
  }
  function enhance(root) {
    const q = s => $$(s, root);
    // generic reveal of every top-level block, staggered
    animate([...root.children], { opacity: [0, 1], y: [50, 0], scale: [.97, 1] }, { delay: stagger(.12, { startDelay: .55 }), duration: .8, ease: [.2, .8, .2, 1] });
    q('.reveal-up').forEach(e => e.style.opacity = '');
    // welcome hero
    q('[data-hero]').forEach(h => {
      const ch = FX.split(h);
      animate(ch, { y: ['100%', '0%'], opacity: [0, 1], rotateX: [-80, 0] }, { delay: stagger(.06, { startDelay: .6 }), duration: .9, ease: [.2, .8, .2, 1] });
      setTimeout(() => animate(h, { opacity: [1, .3, 1, .6, 1], x: [0, -4, 3, 0] }, { duration: .4 }), 1700);
    });
    q('[data-count]').forEach(b => setTimeout(() => countUp(b), 900));
    // staggered groups
    const grp = (sel, kf, st = .08) => { const els = q(sel); if (els.length) animate(els, kf, { delay: stagger(st, { startDelay: .7 }), duration: .8, ease: [.2, .8, .2, 1] }); };
    grp('.stat', { opacity: [0, 1], y: [30, 0], scale: [.9, 1] });
    grp('.day', { opacity: [0, 1], y: [80, 0], rotate: [-4, 0] }, .12);
    grp('.conflict', { opacity: [0, 1], x: [-60, 0], clipPath: ['inset(0 100% 0 0 round 28px)', 'inset(0 0% 0 0 round 28px)'] }, .15);
    grp('.bhg-card', { opacity: [0, 1], x: [80, 0] }, .15);
    grp('.steps > div', { opacity: [0, 1], y: [30, 0], scale: [.8, 1] }, .1);
    grp('.eu-node', { opacity: [0, 1], scale: [.7, 1], y: [40, 0] }, .2);
    grp('.tool-card', { opacity: [0, 1], y: [40, 0], rotate: [3, 0] }, .08);
    grp('.fact', { opacity: [0, 1], y: [40, 0] }, .1);
    grp('.role', { opacity: [0, 1], y: [40, 0], rotate: [-3, 0] }, .1);
    grp('.ra', { opacity: [0, 1], y: [40, 0] }, .12);
    grp('.gl-seg', { opacity: [0, 1], scaleX: [0, 1] }, .15);
    grp('.ex-grid > div', { opacity: [0, 1], y: [30, 0] }, .1);
    // chain draws in
    q('.chain li').forEach((li, i) => { li.style.setProperty('--p', 0); setTimeout(() => animate(0, 1, { duration: .6, onUpdate: v => li.style.setProperty('--p', v) }), 900 + i * 350); });

    // program: live day status
    q('.day').forEach(d => {
      const [y, m, dd] = d.dataset.date.split('-').map(Number), now = new Date();
      const start = new Date(y, m - 1, dd, 9, 0), end = new Date(y, m - 1, dd, 18, 15);
      d.classList.toggle('is-now', now.getFullYear() === y && now.getMonth() === m - 1 && now.getDate() === dd);
      d.classList.toggle('is-past', now > new Date(y, m - 1, dd, 23, 59));
      $('.day-bar span', d).style.width = Math.max(0, Math.min(1, (now - start) / (end - start))) * 100 + '%';
    });

    // terms
    const tg = $('#terms-grid', root);
    if (tg) {
      tg.innerHTML = GL_TERMS.map((t, i) => `<button class="term" aria-label="${t.t}: flip for definition"><div class="term-in">
        <div class="term-f"><span class="ic">${t.ic}</span><div><span class="mono">TERM ${pad(i + 1)} · TAP</span><h4>${t.t}</h4></div></div>
        <div class="term-b"><p>${t.d}</p><p class="ex">${t.ex}</p></div></div></button>`).join('');
      $$('.term', tg).forEach(b => b.addEventListener('click', () => { b.classList.toggle('flip'); FX.zap('up'); }));
      animate($$('.term', tg), { opacity: [0, 1], scale: [.6, 1], rotateY: [-90, 0] }, { delay: stagger(.06, { startDelay: .7 }), duration: .7 });
    }
    // verbs
    const vb = $('#verbs', root);
    if (vb) { vb.innerHTML = GL_VERBS.map(v => `<span>${v}</span>`).join(''); animate($$('span', vb), { opacity: [0, 1], scale: [0, 1] }, { delay: stagger(.03, { startDelay: 1 }), type: 'spring', bounce: .4 }); }

    // video
    const vid = $('#to-player', root);
    if (vid) fetch('video/itre-to.mp4', { method: 'HEAD' }).then(r => {
      if (!r.ok) return;
      vid.src = 'video/itre-to.mp4';
      fetch('video/itre-to-poster.jpg', { method: 'HEAD' }).then(p => { if (p.ok) vid.poster = 'video/itre-to-poster.jpg'; });
      vid.closest('.vc-screen').classList.add('has-video');
    }).catch(() => {});

    // game demo
    const fill = $('#demo-fill', root), mw = $('#demo-mw', root);
    if (fill) {
      setTimeout(() => animate(0, 78, { duration: 2, ease: [.2, .8, .2, 1], onUpdate: v => { fill.style.width = v + '%'; mw.textContent = Math.round(v); } }), 900);
      $('#demo-btn', root).addEventListener('click', () => {
        const bo = $('#blackout');
        animate(+mw.textContent, 112, { duration: 1.1, ease: 'easeIn', onUpdate: v => { fill.style.width = Math.min(v, 100) + '%'; mw.textContent = Math.round(v); } }).then(() => {
          FX.zap('down'); bo.classList.add('on');
          animate(bo, { opacity: [1, .2, 1, 0, 1, .4, 1] }, { duration: .9 });
          animate('.blackout b', { scale: [1.4, 1], opacity: [0, 1] }, { type: 'spring', bounce: .5, delay: .5 });
          setTimeout(() => animate(bo, { opacity: [1, 0] }, { duration: .7 }).then(() => {
            bo.classList.remove('on'); bo.style.opacity = '';
            animate(112, 78, { duration: 1, onUpdate: v => { fill.style.width = Math.min(v, 100) + '%'; mw.textContent = Math.round(v); } });
          }), 2300);
        });
      });
    }

    // rotation cycle
    const run = $('#cy-run', root);
    if (run && !R) {
      const steps = q('.cy-step'), C = 2 * Math.PI * 150, parts = [10, 3, 20, 12], tot = 45;
      run.style.strokeDasharray = C; run.style.strokeDashoffset = C;
      let alive = true; cleanup.push(() => { alive = false; });
      (async function loop() {
        await new Promise(r => setTimeout(r, 900));
        while (alive) {
          let acc = 0;
          for (let i = 0; i < 4 && alive; i++) {
            steps.forEach((s, j) => s.classList.toggle('on', i === j));
            const from = C * (1 - acc / tot); acc += parts[i];
            await animate(run, { strokeDashoffset: [from, C * (1 - acc / tot)] }, { duration: .6 + parts[i] * .09, ease: 'linear' });
          }
          await new Promise(r => setTimeout(r, 600));
          if (!alive) break;
          await animate(run, { opacity: [1, 0] }, { duration: .4 });
          run.style.strokeDashoffset = C; run.style.opacity = 1;
        }
      })();
    }

    // Lego builder
    const lego = $('#lego', root);
    if (lego) {
      const L = GL_LEGO, pick = {}, colors = { verb: '#3df2ff', who: '#ffe14d', what: '#9b7bff', how: '#4dffa6', why: '#ff3d7f' };
      $$('.lego-col', lego).forEach(col => {
        const k = col.dataset.k;
        L[k].forEach((t, i) => {
          const b = document.createElement('button'); b.className = 'brick'; b.textContent = t; b.style.setProperty('--bc', colors[k]);
          b.addEventListener('click', () => { pick[k] = i; paint(k); FX.zap('up'); });
          col.append(b);
        });
      });
      const out = $('#lego-out', lego);
      const paint = changed => {
        $$('.lego-col', lego).forEach(col => $$('.brick', col).forEach((b, i) => b.classList.toggle('on', pick[col.dataset.k] === i)));
        out.innerHTML = ['verb', 'who', 'what', 'how', 'why'].map(k => pick[k] == null ? `<span class="muted">[${k}]</span>` : (k === 'verb' ? `<i>${L[k][pick[k]]}</i>` : L[k][pick[k]])).join(' ') + ';';
        if (changed) animate(out, { scale: [.98, 1] }, { duration: .4 });
      };
      const shuffle = () => {
        ['verb', 'who', 'what', 'how', 'why'].forEach(k => pick[k] = Math.floor(Math.random() * L[k].length));
        paint('verb');
        animate($$('.brick.on', lego), { y: [-14, 0], rotate: [-6, 0] }, { type: 'spring', bounce: .6, delay: stagger(.06) });
      };
      $('#lego-shuffle', lego).addEventListener('click', () => { shuffle(); FX.zap('up'); });
      shuffle();
    }

    // checklist (saved on this device)
    const cl = $('#checklist', root);
    if (cl) {
      const boxes = $$('input', cl);
      let saved = []; try { saved = JSON.parse(localStorage.getItem('gl-check') || '[]'); } catch (e) {}
      const upd = () => {
        const n = boxes.filter(b => b.checked).length;
        $('#check-fill', cl).style.width = (n / boxes.length * 100) + '%';
        $('#check-txt', cl).textContent = n === boxes.length ? 'All 12 done — ready to submit ⚡' : `${n} / ${boxes.length} done`;
        try { localStorage.setItem('gl-check', JSON.stringify(boxes.map(b => b.checked))); } catch (e) {}
      };
      boxes.forEach((b, i) => { b.checked = !!saved[i]; b.addEventListener('change', () => { upd(); if (b.checked) { FX.zap('up'); animate(b, { scale: [1.5, 1] }, { type: 'spring', bounce: .6 }); } }); });
      upd();
    }

    FX.tilt('#st-content .tilt'); FX.magnetic('#st-content .btn');
    microMotion(root);
  }

  /* ---------- extra micro-motion for content blocks ---------- */
  function microMotion(root) {
    const q = s => $$(s, root);
    // conflict beams tilt toward the pointer side
    q('.conflict').forEach(c => {
      const beam = $('.beam', c); if (!beam) return;
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width;
        beam.classList.add('held'); beam.style.rotate = ((px - .5) * 16).toFixed(1) + 'deg';
      });
      c.addEventListener('pointerleave', () => { beam.classList.remove('held'); beam.style.rotate = ''; });
    });
    // facts + stats: numbers pulse once they land
    q('.fact-n, .stat b').forEach((n, i) => { const t = setTimeout(() => animate(n, { scale: [1, 1.12, 1] }, { duration: .5 }), 2300 + i * 120); cleanup.push(() => clearTimeout(t)); });
    // Grid Crisis demo: sparks fly when the bar overloads
    const btn = $('#demo-btn', root);
    if (btn) btn.addEventListener('click', () => setTimeout(() => {
      const cap = $('.gh-cap', root); if (!cap) return;
      const r = cap.getBoundingClientRect();
      FX.sparks(r.left, r.top + r.height / 2, '#ff3d7f', 22);
    }, 1050));
    // verbs: a random one lights up every few seconds
    const verbs = q('.verb-cloud span');
    if (verbs.length && !R) {
      const iv = setInterval(() => { const v = verbs[Math.floor(Math.random() * verbs.length)]; v.classList.add('pop'); setTimeout(() => v.classList.remove('pop'), 900); }, 1400);
      cleanup.push(() => clearInterval(iv));
    }
    // lego bricks spark on click
    q('.brick').forEach(b => b.addEventListener('click', e => FX.sparks(e.clientX, e.clientY, getComputedStyle(b).getPropertyValue('--bc').trim(), 10)));
    // checklist: spark on tick
    q('#checklist input').forEach(b => b.addEventListener('change', () => { if (b.checked) { const r = b.getBoundingClientRect(); FX.sparks(r.left + 11, r.top + 11, '#4dffa6', 12); } }));
  }

  /* ================= boot ================= */
  buildDrawer();
  live = -1;
  GLAlert.listen();
  // offline / before the chair has connected: show step 1
  setTimeout(() => { if (live === -1) { live = 0; buildDrawer(); render(0); } }, 4000);
  const liveTxt = $('#live-txt'), liveChip = $('.live');
  function net() { const on = navigator.onLine; liveChip.classList.toggle('off', !on); liveTxt.textContent = on ? 'LIVE' : 'OFFLINE'; }
  addEventListener('online', net); addEventListener('offline', net); net();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
