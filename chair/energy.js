/* Chair — Energy meter control. Results are private: blurred until you hold 👁, never part of the projector view. */
(function () {
  const C = window.GRIDLINE;
  const $ = (s, r = document) => r.querySelector(s);
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: false } });
  const pin = () => { try { return sessionStorage.getItem('glc-pin') || ''; } catch (e) { return ''; } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hm = t => t ? new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  const day = t => new Date(t).toLocaleDateString('en-GB', { weekday: 'short' });
  const colour = v => v < 25 ? '#ff3d7f' : v < 50 ? '#ff9a3d' : v < 75 ? '#ffe14d' : '#4dffa6';
  const R = 80, LEN = Math.PI * R;

  let open = false, round = 0, rounds = [], busy = false;

  async function state() {
    const { data } = await sb.from(C.table).select('energy_open, energy_round').eq('id', 1).maybeSingle();
    if (data) { open = !!data.energy_open; round = data.energy_round || 0; }
  }
  async function stats() {
    if (!pin()) return;
    const { data, error } = await sb.rpc('gridline_energy_stats', { p_pin: pin() });
    if (!error && Array.isArray(data)) rounds = data;
  }
  async function refresh() { await Promise.all([state(), stats()]); paint(); }

  function paint() {
    const cur = rounds.find(r => r.id === round) || null;
    const last = open ? cur : rounds[0];
    $('#en-state').textContent = open ? `Open on every phone · since ${hm(cur && cur.opened_at)}` : 'Closed — phones are free';
    $('#en-state').classList.toggle('on', open);
    $('#en-open').hidden = open; $('#en-close').hidden = !open; $('#en-label').disabled = open;
    $('#en-n').textContent = last ? `${last.n} answer${last.n === 1 ? '' : 's'}` : '0 answers';
    $('#en-which').textContent = last ? (open ? 'This round' : `Last round · ${day(last.opened_at)} ${hm(last.opened_at)}${last.label ? ' · ' + last.label : ''}`) : 'No rounds yet';
    const v = last && last.n ? last.avg : null;
    const val = $('#en-arc');
    val.setAttribute('stroke-dashoffset', v == null ? LEN : LEN * (1 - v / 100));
    val.setAttribute('stroke', v == null ? 'transparent' : 'url(#enGradC)');
    $('#en-avg').textContent = v == null ? '—' : v + '%';
    const bins = last ? last.bins : [0, 0, 0, 0, 0], mx = Math.max(1, ...bins);
    $('#en-bins').innerHTML = bins.map((b, i) => `<div><i style="height:${b / mx * 100}%;background:${colour(i * 20 + 10)}"></i><b class="mono">${b}</b></div>`).join('');
    $('#en-hist').innerHTML = rounds.length ? rounds.map(r => `<tr><td class="mono">${day(r.opened_at)} ${hm(r.opened_at)}</td><td>${esc(r.label || '—')}</td><td class="mono">${r.n}</td><td class="mono priv"><b style="color:${r.n ? colour(r.avg) : 'inherit'}">${r.n ? r.avg + '%' : '—'}</b></td></tr>`).join('') : '<tr><td colspan="4" class="muted">Nothing recorded yet.</td></tr>';
    const badge = $('#r-energy');
    if (badge) { badge.hidden = !open; badge.querySelector('b').textContent = cur ? cur.n : 0; }
  }

  async function set(o) {
    if (busy) return; busy = true;
    const { error } = await sb.rpc('gridline_energy_set', { p_pin: pin(), p_open: o, p_label: $('#en-label').value });
    busy = false;
    if (error) { alert('Could not change the meter: ' + error.message); return; }
    window.FX && FX.zap && FX.zap(o ? 'up' : 'down');
    if (!o) $('#en-label').value = '';
    refresh();
  }
  $('#en-open').addEventListener('click', () => set(true));
  $('#en-close').addEventListener('click', () => set(false));

  // privacy: results are blurred; hold 👁 (or Space) to peek
  const box = $('#en-pane');
  const peek = on => box.classList.toggle('peek', on);
  const eye = $('#en-peek');
  eye.addEventListener('pointerdown', e => { e.preventDefault(); peek(true); });
  ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(ev => eye.addEventListener(ev, () => peek(false)));
  addEventListener('blur', () => peek(false));

  refresh();
  setInterval(() => { if (!document.hidden && (open || box.closest('.pane.on'))) refresh(); }, 4000);
  setInterval(() => { if (!document.hidden) state().then(paint); }, 15000);
})();
