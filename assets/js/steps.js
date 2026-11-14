/* Gridline — the step-by-step programme. The chair unlocks one step at a time.
   kind: tb = teambuilding, en = energiser, cw = committee work, topic = learning, ga = general assembly
   sec: id of a <template> with extra content shown under the step. */
window.GL_DAYS = {
  1: { label: 'Day 1 · Sun 15 Nov', name: 'Teambuilding', c: '#3df2ff' },
  2: { label: 'Day 2 · Mon 16 Nov', name: 'Committee Work I', c: '#ffe14d' },
  3: { label: 'Day 3 · Tue 17 Nov', name: 'Committee Work II', c: '#9b7bff' },
  4: { label: 'Day 4 · Wed 18 Nov', name: 'General Assembly', c: '#4dffa6' }
};
window.GL_KINDS = {
  welcome: { n: 'Welcome', ic: '⚡' }, tb: { n: 'Teambuilding', ic: '🤝' }, en: { n: 'Energiser', ic: '🔋' },
  cw: { n: 'Committee work', ic: '🧩' }, topic: { n: 'Learn', ic: '📚' }, ga: { n: 'General Assembly', ic: '🏛' }
};
window.GL_STEPS = [
  // ---------- DAY 1 ----------
  { d: 1, t: '11:00', m: 10, k: 'welcome', title: 'Welcome to Gridline', rules: ['This is your committee hub for the next four days.', 'Keep it open — your chair unlocks every new step here.', 'Tap "plug in" so you can hear your chair’s calls.'], sec: 'tpl-welcome' },
  { d: 1, t: '11:10', m: 15, k: 'tb', title: 'Name + Adjective', rules: ['Say your name with an adjective that starts with the same letter — "Energetic Ece".', 'Before yours, repeat everyone who went before you.', 'Forget one? The whole committee helps.'] },
  { d: 1, t: '11:25', m: 10, k: 'tb', title: 'Interview', rules: ['Find a partner you don’t know.', '2 minutes: learn as much as you can about each other.', 'Then introduce your partner to the committee in 20 seconds.'] },
  { d: 1, t: '11:35', m: 10, k: 'welcome', title: 'Your four days', rules: ['Here is where we are going — from strangers to a resolution.', 'Every step of the journey unlocks right here.'], sec: 'tpl-program' },
  { d: 1, t: '11:45', m: 25, k: 'tb', title: 'Speed Dating', rules: ['Two lines, facing each other.', 'One question per round, 3 minutes to talk.', 'When the time is up, one line moves one seat. New partner, new question.'] },
  { d: 1, t: '12:10', m: 10, k: 'tb', title: 'Who said it?', rules: ['Write one weird fact about yourself on a piece of paper.', 'Your chair reads them out.', 'Guess who wrote it!'] },
  { d: 1, t: '13:30', m: 10, k: 'en', title: 'Hi Ha Ho', rules: ['Circle. "HI!" — hands together like a sword, point at someone.', 'They raise their sword: "HA!". Their two neighbours swing at them: "HO!".', 'Too slow or wrong move? You’re out. Last 3 win.'] },
  { d: 1, t: '13:40', m: 25, k: 'tb', title: 'Two Truths and a Lie', rules: ['Say three things about yourself.', 'Two are true. One is a lie.', 'Everyone votes for the lie. Best liar wins.'] },
  { d: 1, t: '14:05', m: 15, k: 'tb', title: 'Have You Ever…?', rules: ['Circle of chairs, one person in the middle (no chair).', 'They ask "Have you ever…?" — everyone who has, must change seats.', 'Whoever is left without a chair goes to the middle.'] },
  { d: 1, t: '14:20', m: 15, k: 'tb', title: 'The Line Game', rules: ['Line up by birthday — January 1st to December 31st.', 'No talking. At all.', 'Gestures, fingers, creativity — go.'] },
  { d: 1, t: '15:15', m: 35, k: 'tb', title: 'The Tesla Dilemma', rules: ['5 min: rank the options alone.', '15 min: agree on one ranking in your group.', '15 min: agree as a whole committee. Every voice counts.'] },
  { d: 1, t: '15:50', m: 20, k: 'tb', title: 'Debrief', rules: ['How did we communicate?', 'How did we decide — and who decided?', 'What will we do differently in committee work?'] },
  { d: 1, t: '16:10', m: 15, k: 'en', title: 'Ninja', rules: ['Circle, everyone in a ninja pose.', 'In turn, make ONE move to hit someone’s hand.', 'Lose both hands and you’re out.'] },
  { d: 1, t: '16:25', m: 10, k: 'tb', title: 'Blind Animal Game', rules: ['Your chair whispers you an animal.', 'Eyes closed. Only animal sounds.', 'Find your herd!'] },
  { d: 1, t: '16:35', m: 15, k: 'tb', title: 'Our Golden Rules', rules: ['Write one rule for our committee on a post-it.', 'We group similar ones and vote for 5–7.', 'Everyone signs the poster. It stays on the wall for 3 days.'] },
  { d: 1, t: '16:50', m: 10, k: 'tb', title: 'Today in one word', rules: ['One word for today. Just one.', 'See you at the Opening Ceremony — 17:45.', 'Tomorrow: we solve Europe’s power problem. ⚡'] },
  // ---------- DAY 2 ----------
  { d: 2, t: '09:00', m: 10, k: 'en', title: 'Just Dance', rules: ['Stand up. Follow the screen.', 'No one is watching (everyone is).', 'Wake up, Europe.'] },
  { d: 2, t: '09:10', m: 20, k: 'cw', title: 'How we work', rules: ['We write in small groups that change every round.', 'Every idea goes to the Bank, the Hospital or the Graveyard.', 'One round = 45 minutes.'], sec: 'tpl-work' },
  { d: 2, t: '09:30', m: 25, k: 'topic', title: 'The topic', rules: ['Watch the topic video together.', 'Write down one question while you watch.'], sec: 'tpl-topic' },
  { d: 2, t: '09:55', m: 20, k: 'topic', title: 'EU 101: who does what?', rules: ['Your resolution tells these institutions what to do.', 'Know who they are.'], sec: 'tpl-eu' },
  { d: 2, t: '10:15', m: 25, k: 'topic', title: 'Key terms', rules: ['Tap a card to flip it.', 'Every term comes with an example.'], sec: 'tpl-terms' },
  { d: 2, t: '11:15', m: 5, k: 'en', title: 'Pass the Pulse', rules: ['Circle, hold hands, eyes closed.', 'Squeeze the hand next to you — pass the pulse around.', 'We time it. Then we beat our record.'] },
  { d: 2, t: '11:20', m: 50, k: 'topic', title: 'Grid Crisis: Blackout', rules: ['One city. 100 MW. Four roles.', 'Negotiate in the open — then secretly write how much you draw.', 'Over capacity? Blackout. Everyone loses.'], sec: 'tpl-game' },
  { d: 2, t: '12:10', m: 30, k: 'topic', title: 'Expert groups', rules: ['Four random groups, one key conflict each.', 'Read it, understand it, own it.', 'Explain it to the committee in 2 minutes.'], sec: 'tpl-conflicts' },
  { d: 2, t: '12:55', m: 20, k: 'cw', title: 'Backpacker’s Brainstorming', rules: ['Your group starts with one question on a paper.', 'Write every problem you can think of — then the paper travels on.', 'Add to what others wrote. No idea is too small.'] },
  { d: 2, t: '14:15', m: 10, k: 'en', title: 'Buzzing Bees', rules: ['Buzz around the room like bees.', 'When your chair shouts a number, form a hive of exactly that many.', 'No hive? You’re out.'] },
  { d: 2, t: '14:25', m: 20, k: 'cw', title: 'The 2930 method', rules: ['Work in pairs: write problems for 9 minutes.', 'Papers travel in both directions.', 'Add to every paper that reaches you.'] },
  { d: 2, t: '14:45', m: 20, k: 'cw', title: 'Sort the problems', rules: ['Put every problem post-it under one of the 4 key conflicts.', 'Duplicates get stacked.', 'What’s missing?'] },
  { d: 2, t: '15:05', m: 45, k: 'cw', title: 'Rotation 1 · Problems', rules: ['New random groups.', 'Pick the problems that matter most and find a source for each.', 'Then: Bank, Hospital or Graveyard.'], sec: 'tpl-bhg' },
  { d: 2, t: '16:45', m: 5, k: 'en', title: 'Simon Says', rules: ['Only move when you hear "The Commission says…".', 'Move without it? You’re out.', 'Last one standing wins.'] },
  { d: 2, t: '16:50', m: 45, k: 'cw', title: 'Rotation 2 · Because', rules: ['New groups again.', 'Turn every problem into a sentence: "…is a problem because…".', 'Then: Bank, Hospital or Graveyard.'], sec: 'tpl-bhg' },
  { d: 2, t: '17:35', m: 25, k: 'cw', title: 'Aim statement', rules: ['All together: what should Europe look like if our resolution works?', '3–4 sentences.', 'This is our compass for tomorrow.'], sec: 'tpl-anatomy' },
  // ---------- DAY 3 ----------
  { d: 3, t: '09:00', m: 20, k: 'en', title: 'The Machine', rules: ['One person starts a movement and a sound.', 'Everyone adds a part until we are one big data-centre machine.', 'Then: we finish the aim statement.'] },
  { d: 3, t: '09:20', m: 20, k: 'cw', title: 'Who should do what?', rules: ['All together: brainstorm solutions.', 'Every solution needs a WHO.', 'Wild ideas welcome.'] },
  { d: 3, t: '09:40', m: 45, k: 'cw', title: 'Rotation 3 · Because → By', rules: ['Match every "because" with a "by".', 'Problem → solution, one by one.', 'Then: Bank, Hospital or Graveyard.'], sec: 'tpl-bhg' },
  { d: 3, t: '10:25', m: 10, k: 'cw', title: 'The Lego method', rules: ['Every clause is built from the same blocks.', 'Verb + who + what + how + in order to.', 'Play with the builder below.'], sec: 'tpl-lego' },
  { d: 3, t: '11:15', m: 5, k: 'en', title: 'Stand up if…', rules: ['Your chair reads a sentence.', 'Stand up if it’s true for you.', 'Fast. Honest. Fun.'] },
  { d: 3, t: '11:20', m: 45, k: 'cw', title: 'Rotation 4 · Operative clauses', rules: ['Write full operative clauses with the Lego blocks.', 'One clause per solution.', 'Then: Bank, Hospital or Graveyard.'], sec: 'tpl-lego' },
  { d: 3, t: '12:05', m: 45, k: 'cw', title: 'Rotation 5 · Hospital', rules: ['Fix every clause in the Hospital.', 'Add sub-clauses a), b), c) where needed.', 'Final Bank, Hospital or Graveyard.'], sec: 'tpl-bhg' },
  { d: 3, t: '14:15', m: 15, k: 'cw', title: 'Order the clauses', rules: ['From general to specific.', 'Read the whole resolution once, out loud.', 'Does it tell one story?'] },
  { d: 3, t: '14:30', m: 60, k: 'cw', title: 'Resolution typing', rules: ['2–3 people type.', 'Everyone else collects the source links.', 'Silence helps. Snacks help more.'] },
  { d: 3, t: '15:30', m: 30, k: 'cw', title: 'Final check', rules: ['Content, language, format.', 'Tick every box together.'], sec: 'tpl-check' },
  { d: 3, t: '16:45', m: 15, k: 'ga', title: 'How GA works', rules: ['Tomorrow we defend our resolution in front of everyone.', 'Here is the procedure.'], sec: 'tpl-ga' },
  { d: 3, t: '17:00', m: 40, k: 'ga', title: 'Speech prep', rules: ['Defence, summation, answers to likely questions.', 'Plus: questions for other committees.', 'Rehearse out loud. Twice.'] },
  { d: 3, t: '17:40', m: 20, k: 'tb', title: 'Final debrief', rules: ['What are you proud of?', 'What did you learn about yourself?', 'Say one thing to someone in this room.'] },
  // ---------- DAY 4 ----------
  { d: 4, t: '08:20', m: 30, k: 'ga', title: 'GA day', rules: ['Shuttle leaves at 08:20 — be early.', 'Speakers: laptop charged, speech printed.', 'GA opens 08:50 at Toroslar Campus.'], sec: 'tpl-ga' },
  { d: 4, t: '17:00', m: 30, k: 'ga', title: 'Thank you, ITRE', rules: ['Four days ago you were strangers.', 'Today you wrote EU policy together.', 'Keep the energy. ⚡'] }
];
