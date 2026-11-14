/* Chair-only plan. Built from GL_STEPS (assets/js/steps.js) so it always matches the live steps.
   Session blocks (Mersin local time) + gaps inside a block are shown as BUFFER. */
(function () {
  const DATES = { 1: '2026-11-15', 2: '2026-11-16', 3: '2026-11-17', 4: '2026-11-18' };
  const NAMES = { 1: 'Day 1 · Teambuilding', 2: 'Day 2 · CW I', 3: 'Day 3 · CW II', 4: 'Day 4 · GA (Toroslar Campus)' };
  const BLOCKS = {
    1: [['11:00', '12:30', 'Block A · "I" phase'], ['13:30', '15:00', 'Block B · "You" phase'], ['15:15', '17:15', 'Block C · "Conflict" + "We"']],
    2: [['09:00', '11:00', 'Block 1'], ['11:15', '13:15', 'Block 2'], ['14:15', '16:15', 'Block 3'], ['16:45', '18:15', 'Block 4 · low energy']],
    3: [['09:00', '11:00', 'Block 1'], ['11:15', '13:15', 'Block 2'], ['14:15', '16:15', 'Block 3 · finish the reso'], ['16:45', '18:15', 'Block 4 · GA prep']],
    4: [['08:00', '18:00', 'General Assembly']]
  };
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const plan = {};
  [1, 2, 3, 4].forEach(d => {
    const steps = GL_STEPS.map((s, i) => ({ ...s, i })).filter(s => s.d === d);
    const used = new Set();
    const blocks = BLOCKS[d].map(([s, e, t]) => {
      const S = toMin(s), E = toMin(e);
      const inBlock = steps.filter(x => !used.has(x.i) && toMin(x.t) >= S && toMin(x.t) < E);
      inBlock.forEach(x => used.add(x.i));
      const items = [];
      let cur = inBlock.length ? Math.min(S, toMin(inBlock[0].t)) : S;
      inBlock.forEach(x => {
        const st = toMin(x.t);
        if (st > cur) items.push([fmt(cur), '⏱ BUFFER', st - cur]);
        const k = GL_KINDS[x.k] || {};
        items.push([x.t, `${k.ic || ''} ${x.title}${x.ia ? ' 📊' : ''}`, x.m, x.i]);
        cur = Math.max(cur, st + x.m);
      });
      if (d !== 4 && cur < E) items.push([fmt(cur), '⏱ BUFFER', E - cur]);
      return { s, e, t, items };
    }).filter(b => b.items.length);
    const left = steps.filter(x => !used.has(x.i));
    if (left.length) blocks.push({ s: left[0].t, e: '', t: 'Other', items: left.map(x => [x.t, x.title, x.m, x.i]) });
    plan[DATES[d]] = { name: NAMES[d], blocks };
  });
  window.GL_PLAN = plan;
  window.GL_CUT = ['Blind Animal Game (−10)', 'Line Game (−15)', 'Explain it like I’m 5 → 10 min (−10)', '2930 method, Day 2 (−20; Backpacker’s is enough)', 'Expert groups → 20 min (−10)', 'Merge Rotation 5 into 4, Day 3 (−30)'];
  window.GL_NEVER = ['Golden Rules + Flag', 'Two Truths and a Lie', 'Data Centre Dilemma + debrief', 'Before Day 2: the video', 'Grid Crisis', 'Aim statement', 'Bank / Hospital / Graveyard', 'Reso check'];
})();
