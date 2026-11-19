/* Aurelia Care Hospital: shared chat brain (plain text, WhatsApp formatting).
   Used by the browser demo (whatsapp.html) and by the Node WhatsApp server (whatsapp-bot/).
   AureliaBot.reply(text, data, opts) -> { text: 'string with *bold*', buttons: ['Label', ...up to 3] }
   data = { depts: [...], docs: [...], pkgs: [...] } (same shape as js/data.js)
   opts = { site: 'https://.../aurelia-care/', tz: 'Asia/Kolkata' }
   Rule-based and offline. Sample hospital, sample data, general information only (never medical advice). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AureliaBot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var EM = '+91 00000 00000', AP = '+91 00000 00001';

  function inr(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  function weekday(tz, long) { return new Date().toLocaleDateString('en-US', { weekday: long ? 'long' : 'short', timeZone: tz }); }

  var SYMPTOMS = [
    [/chest|heart|palpitat|blood pressure|\bbp\b|cholesterol/, 'cardiology'],
    [/knee|joint|bone|fractur|back pain|spine|sprain|shoulder|sports|arthritis/, 'orthopaedics'],
    [/headache|migraine|seizure|\bfits\b|numb(ness)?\b|dizz|memory|nerve|stroke|tremor/, 'neurology'],
    [/child|baby|infant|kid|newborn|vaccin|toddler|paediatric|pediatric/, 'paediatrics'],
    [/pregnan|period|fertility|gynae|gyne|delivery|maternity|pcos|menopause/, 'gynaecology-maternity'],
    [/hernia|appendix|gallbladder|gall stone|piles|surgery|lump/, 'general-surgery'],
    [/stomach|acidity|liver|digest|gas\b|ulcer|vomit|diarrh|constipat|jaundice|abdominal/, 'gastroenterology']
  ];
  var DEPTKEY = [
    [/cardio/, 'cardiology'], [/ortho/, 'orthopaedics'], [/neuro/, 'neurology'], [/p(a)?ediat/, 'paediatrics'],
    [/gyn(a)?e|maternity|obstet/, 'gynaecology-maternity'], [/general surgery|surgeon/, 'general-surgery'], [/gastro/, 'gastroenterology']
  ];
  var RED = /can.?t breathe|cannot breathe|difficulty breathing|severe chest|unconscious|stroke|heavy bleeding|accident|poison|suicid|overdose|collapsed|not breathing/;
  var FIRST = /package|heart care|health check|check.?up|full body|executive|senior citizen|women.{0,3}wellness|screening|visit(ing)?|visitor|\bwards?\b|room|tariff|suite|insurance|cashless|\bbill\b/;

  function create(data, opts) {
    opts = opts || {};
    var site = opts.site || '';
    var tz = opts.tz || 'Asia/Kolkata';
    var D = data || { depts: [], docs: [], pkgs: [] };

    function deptName(slug) { var d = D.depts.filter(function (x) { return x.slug === slug; })[0]; return d ? d.name : slug; }
    function docsOf(slug) { return D.docs.filter(function (d) { return d.dept === slug; }); }
    function link(path) { return site + path; }

    var CHIPS = { menu: ['Doctors today', 'Health packages', 'Book appointment'] };

    function greet() { return { text: 'Hello! 👋 I am the virtual assistant of *Aurelia Care Hospital*, Chennai.\n\nI can help with doctors, timings, health packages, room charges and booking. What do you need?', buttons: CHIPS.menu }; }
    function emergency() { return { text: '🚨 *Emergency care is open 24x7.*\nCall *' + EM + '* or come straight to the emergency entrance on the east side.\n\nIn a real emergency, please do not wait for chat.', buttons: ['Hospital address', 'Contact numbers'] }; }
    function hours() { return { text: '*OPD:* Mon to Sat, 8 am to 8 pm\n*Emergency and ICU:* 24x7\n*Sunday:* emergency only\n\nToday is ' + weekday(tz, true) + '.', buttons: ['Book appointment', 'Doctors today'] }; }
    function location() { return { text: '📍 *Aurelia Care Hospital*\n45 Lake Road, Kodambakkam, Chennai 600024\nFive minutes from the Kodambakkam flyover.\n\nFree parking for patients in the basement and rear lot. The emergency entrance is on the east side.', buttons: ['OPD timings', 'Book appointment'] }; }
    function visiting() { return { text: '*Visiting hours*\n• General wards: 11 am to 1 pm and 5 pm to 7 pm\n• ICU: 12 noon to 12:30 pm and 6 pm to 6:30 pm\n• Maternity: 4 pm to 7 pm\n\nTwo visitors at a time, please.', buttons: ['OPD timings', 'Contact numbers'] }; }
    function packages() {
      var l = D.pkgs.map(function (p) { return '• *' + p.name + '*: ' + inr(p.price); }).join('\n');
      return { text: '*Health packages* (sample prices)\n' + l + '\n\nBook one here: ' + link('appointment.html'), buttons: ['Book appointment', 'Room charges'] };
    }
    function rooms() { return { text: '*Daily room charges* (sample)\n• General ward: ' + inr(1500) + '\n• Semi-private: ' + inr(3000) + '\n• Private room: ' + inr(5000) + '\n• Suite: ' + inr(9000) + '\n• ICU: ' + inr(12000) + '\n\nDoctor, nursing and procedure fees are extra.', buttons: ['Insurance', 'Book appointment'] }; }
    function insurance() { return { text: 'Yes, we offer *cashless treatment* with most major insurers and TPAs.\n\nBring your insurance card and photo ID at admission, and our insurance desk sends the pre-authorisation request. If there is a gap, we tell you before treatment starts.', buttons: ['Room charges', 'Contact numbers'] }; }
    function records() { return { text: 'Ask at the medical records desk with your photo ID. Reports are ready within two working days, and recent ones are also sent to your phone.', buttons: ['Contact numbers', 'OPD timings'] }; }
    function contact() { return { text: '*Appointments:* ' + AP + '\n*Emergency:* ' + EM + '\n*Email:* care@aurelia.example', buttons: ['Book appointment', 'Hospital address'] }; }
    function fees() { return { text: 'Consultation fees are confirmed by the appointments desk when you book. Health packages start at ' + inr(Math.min.apply(null, D.pkgs.map(function (p) { return p.price; }))) + '.', buttons: ['Health packages', 'Room charges'] }; }
    function book() { return { text: 'You can book in under two minutes:\n' + link('appointment.html') + '\n\nOr tell me a department (for example, cardiology) and I will show the doctors.', buttons: ['Doctors today', 'Health packages'] }; }
    function departments() { return { text: '*Departments*\n' + D.depts.map(function (d) { return '• ' + d.name; }).join('\n') + '\n\nTell me a department or a problem and I will show the doctors.', buttons: ['Doctors today', 'Book appointment'] }; }
    function doctors() { return { text: 'We have ' + D.docs.length + ' doctors across ' + D.depts.length + ' departments. Tell me a department (for example, orthopaedics), or see everyone: ' + link('doctors.html'), buttons: ['Doctors today', 'Book appointment'] }; }
    function thanks() { return { text: 'You are welcome! 😊 Anything else I can help with?', buttons: CHIPS.menu }; }
    function docLine(d) { return '• *' + d.name + '*, ' + d.spec + '\n   Days: ' + d.days.join(', ') + '\n   Book: ' + link('appointment.html?doctor=' + d.id); }
    function deptList(slug, note) {
      return { text: (note ? note + '\n\n' : '') + '*' + deptName(slug) + '*\n' + docsOf(slug).map(docLine).join('\n'), buttons: ['Doctors today', 'OPD timings'] };
    }
    function availableToday() {
      var t = weekday(tz, false);
      if (t === 'Sun') return { text: 'Today is Sunday, so OPD is closed.\n\n*Emergency care is open 24x7.* Our emergency head, Dr. Suresh Babu, is on duty every day.', buttons: ['Emergency', 'OPD timings'] };
      var l = D.docs.filter(function (d) { return d.days.indexOf(t) > -1; });
      return { text: '*Doctors in clinic today (' + t + ')*\n' + l.map(function (d) { return '• *' + d.name + '*, ' + d.spec + '\n   Book: ' + link('appointment.html?doctor=' + d.id); }).join('\n'), buttons: ['Book appointment', 'OPD timings'] };
    }

    var INTENTS = [
      [/^(hi|hello|hey|hii+|namaste|vanakkam|good (morning|afternoon|evening))\b|^menu$|^start$/, greet],
      [/thank|thanks|nandri/, thanks],
      [/visit(ing)?|visitor/, visiting],
      [/package|heart care|health check|check.?up|full body|executive|senior citizen|women.{0,3}wellness|screening/, packages],
      [/room|tariff|\bbed\b|ward|suite|stay|admission|admit|bill estimate/, rooms],
      [/insurance|cashless|claim|tpa|mediclaim|billing|\bbill\b/, insurance],
      [/emergenc|ambulance|\bicu\b|critical|urgent/, emergency],
      [/(who|which).*(available|doctor).*(today|now)|available today|today.*doctor|doctors? (in|on) (today|now)|doctors today/, availableToday],
      [/hour|timing|\bopen\b|close|opd|when are you|sunday|what time/, hours],
      [/where|address|location|direction|park|reach|find you|map/, location],
      [/record|report|discharge|certificate/, records],
      [/phone|call|contact|number|email|whatsapp|extension|\bext\b/, contact],
      [/price|fee|cost|charge|how much|consultation/, fees],
      [/book|appointment|schedule|slot|reserve|see a doctor|consult/, book],
      [/department|speciali|which doctor|services/, departments],
      [/doctor|dr\.?\b|specialist|consultant|surgeon/, doctors]
    ];

    function reply(text) {
      var t = String(text || '').toLowerCase().trim().slice(0, 300), i;
      if (!t) return greet();
      if (RED.test(t)) return emergency();
      for (i = 0; i < D.docs.length; i++) {
        var last = D.docs[i].name.toLowerCase().replace('dr. ', ''), first = last.split(' ')[0];
        if (t.indexOf(last) > -1 || (first.length > 3 && new RegExp('\\b' + first + '\\b').test(t))) {
          var d = D.docs[i];
          return { text: '*' + d.name + '*\n' + d.spec + ', ' + deptName(d.dept) + '\nAvailable: ' + d.days.join(', ') + '\nBook: ' + link('appointment.html?doctor=' + d.id), buttons: ['Doctors today', 'OPD timings'] };
        }
      }
      var skip = FIRST.test(t);
      if (!skip) {
        for (i = 0; i < DEPTKEY.length; i++) if (DEPTKEY[i][0].test(t)) return deptList(DEPTKEY[i][1]);
        for (i = 0; i < SYMPTOMS.length; i++) if (SYMPTOMS[i][0].test(t)) return deptList(SYMPTOMS[i][1], 'For this, the right department is usually *' + deptName(SYMPTOMS[i][1]) + '*. I cannot give medical advice; only a doctor can tell you what is wrong.');
      }
      for (i = 0; i < INTENTS.length; i++) if (INTENTS[i][0].test(t)) return INTENTS[i][1]();
      return { text: 'Sorry, I am not sure about that. 🙏 I can help with *doctors, timings, packages, room charges, insurance and booking*.\n\nFor anything else, call ' + AP + '.', buttons: CHIPS.menu };
    }
    return { reply: reply, greet: greet };
  }

  return { create: create };
});
