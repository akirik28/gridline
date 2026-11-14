/* Gridline — public config. The key below is Supabase's publishable (anon) key:
   it can only READ the alert row; writing needs the chair PIN (checked in the database). */
window.GRIDLINE = {
  supabaseUrl: 'https://injjkkulpcvinrglzhjd.supabase.co',
  supabaseKey: 'sb_publishable_ESPPnGFiTXokLqmql-zPTg_siER2Hjp',
  table: 'gridline_alert',
  voice: {
    gather: 'assets/audio/gather.mp3',
    break: 'assets/audio/break.mp3',
    phones: 'assets/audio/phones.mp3',
    custom: 'assets/audio/custom.mp3',
    lock: null
  }
};
