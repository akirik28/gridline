/* Gridline live alerts — full-screen takeover controlled by the chair.
   Delegates: subscribe + render. Chair page reuses GLAlert.render() for previews. */
(function () {
  const C = window.GRIDLINE;
  const M = window.Motion || {};
  const KINDS = {
    gather: { tag: 'Chair calling', title: 'Gather in the middle', body: 'Leave your laptop. Bring your energy.', ac: '#3df2ff' },
    break:  { tag: 'Break is over', title: 'Back to your seats', body: 'Committee work resumes now.', ac: '#ffe14d' },
    phones: { tag: 'Focus mode', title: 'Phones down. Eyes up.', body: '', ac: '#ff3d7f' },
    custom: { tag: 'Message from your chair', title: '', body: '', ac: '#4dffa6' },
    lock:   { tag: 'Screen locked', title: 'Eyes on the chair', body: 'This screen unlocks when your chair says so.', ac: '#9b7bff' }
  };
  let el, lastSeq = -1, audio;

  function build() {
    el = document.createElement('div');
    el.className = 'gl-alert'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-live', 'assertive');
    el.innerHTML = '<div class="ga-bg"></div><div class="ga-ring"></div><div class="ga-ring"></div><div class="ga-ring"></div>' +
      '<div class="ga-inner"><div class="ga-tag"></div><h2 class="ga-title"></h2><div class="ga-time"></div><p class="ga-body"></p></div>' +
      '<div class="ga-foot">GRIDLINE · ITRE · CONTROLLED BY YOUR CHAIR</div>';
    // block every interaction underneath
    ['click', 'touchmove', 'wheel', 'keydown'].forEach(ev => el.addEventListener(ev, e => { if (ev !== 'keydown') e.preventDefault(); }, { passive: false }));
    document.body.append(el);
  }

  function render(s, opt = {}) {
    if (!el) build();
    const k = KINDS[s.kind] || KINDS.custom;
    if (!s.active) { hide(); return; }
    el.style.setProperty('--ac', k.ac);
    el.querySelector('.ga-tag').textContent = k.tag;
    const title = (s.title || k.title || 'Attention').trim();
    const tEl = el.querySelector('.ga-title');
    tEl.textContent = title;
    const words = window.FX ? FX.split(tEl, 'words') : [];
    const timeEl = el.querySelector('.ga-time');
    timeEl.textContent = s.meet_time ? s.meet_time : '';
    timeEl.style.display = s.meet_time ? '' : 'none';
    const body = (s.body || k.body || '').trim();
    el.querySelector('.ga-body').textContent = body;
    const wasOn = el.classList.contains('on');
    el.classList.add('on');
    document.documentElement.style.overflow = 'hidden';
    if (M.animate) {
      if (!wasOn) M.animate(el, { opacity: [0, 1], clipPath: ['circle(0% at 50% 50%)', 'circle(150% at 50% 50%)'] }, { duration: .8, ease: [.7, 0, .2, 1] });
      M.animate(words, { y: ['110%', '0%'], opacity: [0, 1], rotate: [6, 0] }, { delay: M.stagger(.08, { startDelay: .35 }), duration: .7, ease: [.2, .8, .2, 1] });
      M.animate(el.querySelector('.ga-tag'), { opacity: [0, 1], letterSpacing: ['.9em', '.3em'] }, { duration: 1, delay: .2 });
      if (s.meet_time) M.animate(timeEl, { scale: [.6, 1], opacity: [0, 1] }, { type: 'spring', bounce: .45, delay: .7 });
      M.animate(el.querySelector('.ga-body'), { opacity: [0, 1], y: [20, 0] }, { delay: .9, duration: .6 });
    }
    if (!opt.silent) play(s.kind);
    if (navigator.vibrate) try { navigator.vibrate([180, 80, 180]); } catch (e) {}
  }

  function hide() {
    if (!el || !el.classList.contains('on')) return;
    const done = () => { el.classList.remove('on'); document.documentElement.style.overflow = ''; };
    if (M.animate) M.animate(el, { opacity: [1, 0], clipPath: ['circle(150% at 50% 50%)', 'circle(0% at 50% 50%)'] }, { duration: .6, ease: [.7, 0, .2, 1] }).then(done);
    else done();
    if (window.FX) FX.zap('up');
  }

  function play(kind) {
    if (window.FX) FX.zap('up');
    const src = C.voice[kind];
    if (!src) return;
    try {
      audio = audio || new Audio();
      audio.src = (window.GL_BASE || '') + src; audio.currentTime = 0;
      setTimeout(() => audio.play().catch(() => {}), 420);
    } catch (e) {}
  }

  async function fetchNow(sb) {
    const { data } = await sb.from(C.table).select('*').eq('id', 1).maybeSingle();
    if (data) apply(data);
  }
  function apply(s) {
    if (typeof window.GL_onRow === 'function') { try { window.GL_onRow(s); } catch (e) { console.error(e); } }
    if (s.seq === lastSeq) return;
    const first = lastSeq === -1; lastSeq = s.seq;
    render(s, { silent: first && !window.GL_AUDIO_OK });
  }

  function listen() {
    if (!window.supabase) return;
    const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: false } });
    fetchNow(sb);
    sb.channel('gridline-alert')
      .on('postgres_changes', { event: '*', schema: 'public', table: C.table }, p => p.new && apply(p.new))
      .subscribe();
    // safety net: poll every 8 s and when the tab comes back
    setInterval(() => fetchNow(sb), 8000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) fetchNow(sb); });
    addEventListener('online', () => fetchNow(sb));
  }

  window.GLAlert = { render, hide, listen, KINDS, unlockAudio() {
    window.GL_AUDIO_OK = true;
    try { audio = audio || new Audio(); audio.muted = true; audio.src = (window.GL_BASE || '') + C.voice.custom; audio.play().then(() => { audio.pause(); audio.muted = false; }).catch(() => { audio.muted = false; }); } catch (e) {}
    if (window.FX) try { FX.audio().resume(); } catch (e) {}
  } };
})();
