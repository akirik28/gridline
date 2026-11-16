/* Gridline content data */
window.GL_TERMS = [
  { t: 'Data centre', ic: '🏢', d: 'A building full of servers that store data and run software for the internet, the cloud and AI.', ex: 'Every Instagram reel you watch is served from a data centre somewhere.' },
  { t: 'Hyperscaler', ic: '🌐', d: 'A giant cloud company running huge data centres all over the world.', ex: 'Amazon Web Services, Microsoft Azure and Google Cloud.' },
  { t: 'AI training vs inference', ic: '🧠', d: 'Training = teaching a model once with enormous computing. Inference = using the model, every time someone asks it something.', ex: 'Building a chatbot is training; every question you type is inference.' },
  { t: 'PUE', ic: '📏', d: 'Power Usage Effectiveness: total energy of the site ÷ energy used by the computers. 1.0 would be perfect.', ex: 'PUE 1.5 = for every 1 kWh of computing, 0.5 kWh more goes to cooling, lights and losses.' },
  { t: 'The grid', ic: '⚡', d: 'The network of power lines, substations and operators that moves electricity from producers to users.', ex: 'A wind farm in the North Sea → high-voltage lines → your phone charger.' },
  { t: 'Grid congestion', ic: '🚦', d: 'When the cables are full: there is electricity, but no room to transport it to where it is needed.', ex: 'A traffic jam — but for electrons. New users have to wait years for a connection.' },
  { t: 'Renewable PPA', ic: '🤝', d: 'Power Purchase Agreement: a long contract where a company buys electricity directly from a wind or solar farm.', ex: 'A data centre agrees to buy a solar park’s output for 15 years.' },
  { t: 'Waste-heat reuse', ic: '♨️', d: 'Servers turn electricity into heat. Instead of wasting it, it can warm homes through district heating.', ex: 'In Stockholm and Helsinki, data-centre heat already warms homes.' },
  { t: 'WUE', ic: '💧', d: 'Water Usage Effectiveness: how much water a data centre uses per unit of IT energy, mostly for cooling.', ex: 'Evaporative cooling saves electricity but uses water — a big issue in dry summers.' },
  { t: 'Moratorium', ic: '⛔', d: 'A temporary stop. Here: a pause on connecting new data centres to the grid.', ex: 'The Dublin area has had a de facto pause on new data-centre connections.' },
  { t: 'Digital sovereignty', ic: '🇪🇺', d: 'The EU being able to run its own digital infrastructure without depending on other powers.', ex: 'Europe’s data stored and processed in Europe, under EU rules.' },
  { t: 'Energy Efficiency Directive', ic: '📜', d: 'EU law (recast 2023) to cut energy use. It made big data centres report their energy and water data.', ex: 'A 1 MW data centre in Spain must report its PUE and water use every year.' }
];

window.GL_VERBS = ['Calling upon', 'Encouraging', 'Urging', 'Requesting', 'Inviting', 'Supporting', 'Recommending', 'Advising', 'Suggesting', 'Welcoming', 'Emphasising', 'Further encouraging', 'Designating', 'Establishing', 'Asking', 'Strongly urging'];

window.GL_LEGO = {
  who: ['the European Commission', 'Member States', 'national grid operators', 'the European Parliament', 'data-centre operators', 'local authorities'],
  verb: ['Calling upon', 'Encouraging', 'Urging', 'Requesting', 'Inviting', 'Asking'],
  what: ['to publish energy and water data', 'to prioritise grid connections', 'to set a maximum PUE', 'to reuse waste heat', 'to sign renewable PPAs', 'to consult local residents'],
  how: ['through an EU-wide public database', 'by 2030', 'via EU funding programmes', 'with yearly independent audits', 'through binding legislation', 'in planning permits'],
  why: ['in order to protect grid stability', 'in order to meet the 2050 climate goal', 'in order to build public trust', 'in order to keep AI in Europe competitive', 'in order to lower household bills', 'in order to save water']
};
