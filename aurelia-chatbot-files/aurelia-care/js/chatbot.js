/* Aurelia Care Hospital: "Ask Aurelia" chat assistant.
   Demo mode: runs fully in the browser (rules + the site's own data in window.AC), so it works on GitHub Pages.
   Real mode: set window.AURELIA_CHAT_API = 'https://your-server/api/chat' before this script. The widget then sends
   {message, history} to that URL and shows the {reply} it returns. If the call fails it falls back to the rules below.
   All hospital details here are sample data. This assistant gives general information only, never medical advice. */
(function () {
  'use strict';
  var AC = window.AC || { depts: [], docs: [], pkgs: [] };
  var API = window.AURELIA_CHAT_API || '';
  var KEY = 'aurelia_chat_v1';
  var EM = '+91 00000 00000', AP = '+91 00000 00001';

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inr(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
    function deptName(slug) { var d = AC.depts.filter(function (x) { return x.slug === slug; })[0]; return d ? d.name : slug; }
  function docsOf(slug) { return AC.docs.filter(function (d) { return d.dept === slug; }); }
  function today() { return new Date().toLocaleDateString('en-US', { weekday: 'short' }); }
  function a(href, text) { return '<a href="' + href + '">' + text + '</a>'; }
  function docLine(d) { return '<li><b>' + esc(d.name) + '</b>, ' + esc(d.spec) + '<br><small>Days: ' + d.days.join(', ') + ' &middot; ' + a('appointment.html?doctor=' + d.id, 'Book') + '</small></li>'; }

  /* ---------- knowledge ---------- */
  var SYMPTOMS = [
    [/chest|heart|palpitat|blood pressure|\bbp\b|cholesterol/, 'cardiology'],
    [/knee|joint|bone|fractur|back pain|spine|sprain|shoulder|sports|arthritis/, 'orthopaedics'],
    [/headache|migraine|seizure|\bfits\b|numb(ness)?\b|dizz|memory|nerve|stroke|tremor/, 'neurology'],
    [/child|baby|infant|kid|newborn|vaccin|toddler|paediatric|pediatric/, 'paediatrics'],
    [/pregnan|period|fertility|gynae|gyne|delivery|maternity|pcos|menopause/, 'gynaecology-maternity'],
    [/hernia|appendix|gallbladder|gall stone|piles|surgery|lump/, 'general-surgery'],
    [/stomach|acidity|liver|digest|gas\b|ulcer|vomit|diarrh|constipat|jaundice|abdominal/, 'gastroenterology']
  ];
  var RED = /can.?t breathe|cannot breathe|difficulty breathing|severe chest|unconscious|stroke|heavy bleeding|accident|poison|suicid|overdose|collapsed|not breathing/;

  var INTENTS = [
    { re: /^(hi|hello|hey|namaste|vanakkam|good (morning|afternoon|evening))\b/, f: greet },
    { re: /thank|thanks|nandri/, f: function () { return 'You are welcome! Anything else I can help with?'; } },
    { re: /visit(ing)?|visitor/, f: visiting },
    { re: /package|heart care|health check|check.?up|full body|executive|senior citizen|women.{0,3}wellness|screening/, f: packages },
    { re: /room|tariff|\bbed\b|ward|suite|stay|admission|admit|bill estimate/, f: rooms },
    { re: /insurance|cashless|claim|tpa|mediclaim|billing|\bbill\b/, f: insurance },
    { re: /emergenc|ambulance|\bicu\b|critical|urgent/, f: emergency },
    { re: /(who|which).*(available|doctor).*(today|now)|available today|today.*doctor|doctors? (in|on) (today|now)/, f: availableToday },
    { re: /hour|timing|\bopen\b|close|opd|when are you|sunday|what time/, f: hours },
    { re: /where|address|location|direction|park|reach|find you|map/, f: location },
    { re: /record|report|discharge|certificate/, f: records },
    { re: /phone|call|contact|number|email|whatsapp|extension|\bext\b/, f: contact },
    { re: /price|fee|cost|charge|how much|consultation/, f: fees },
    { re: /book|appointment|schedule|slot|reserve|see a doctor|consult/, f: book },
    { re: /department|speciali|which doctor|services/, f: departments },
    { re: /doctor|dr\.?\b|specialist|consultant|surgeon/, f: doctors }
  ];
  var DEPTKEY = [
    [/cardio/, 'cardiology'], [/ortho/, 'orthopaedics'], [/neuro/, 'neurology'], [/p(a)?ediat/, 'paediatrics'],
    [/gyn(a)?e|maternity|obstet/, 'gynaecology-maternity'], [/general surgery|surgeon/, 'general-surgery'], [/gastro/, 'gastroenterology']
  ];
  /* these must win over the department / symptom match */
  var FIRST = [/package|heart care|health check|check.?up|full body|executive|senior citizen|women.{0,3}wellness|screening/, /visit(ing)?|visitor/, /\bwards?\b|room|tariff|suite|insurance|cashless|\bbill\b/];

  /* ---------- answers ---------- */
  function greet() { return 'Hello! I am <b>Ask Aurelia</b>, the virtual assistant of Aurelia Care Hospital. I can help with doctors, timings, health packages, room charges and booking.'; }
  function emergency() {
    return '<div class="ac-red"><b>Emergency care is open 24x7.</b><br>Call <a href="tel:' + EM.replace(/\s/g, '') + '">' + EM + '</a> or come straight to the emergency entrance on the east side. In a real emergency, do not wait for chat.</div>';
  }
  function hours() { return '<b>OPD:</b> Mon to Sat, 8 am to 8 pm.<br><b>Emergency and ICU:</b> 24x7.<br><b>Sunday:</b> emergency only.<br>Today is ' + new Date().toLocaleDateString('en-US', { weekday: 'long' }) + '.'; }
  function location() { return '45 Lake Road, Kodambakkam, Chennai 600024. Five minutes from the Kodambakkam flyover. Free parking for patients in the basement and rear lot. The emergency entrance is on the east side. ' + a('contact.html', 'See contact page'); }
  function visiting() { return '<b>Visiting hours</b><ul><li>General wards: 11 am to 1 pm and 5 pm to 7 pm</li><li>ICU: 12 noon to 12:30 pm and 6 pm to 6:30 pm</li><li>Maternity: 4 pm to 7 pm</li></ul>Two visitors at a time, please. ' + a('patients.html', 'Patient guide'); }
  function packages() {
    var li = AC.pkgs.map(function (p) { return '<li><b>' + esc(p.name) + '</b>: ' + inr(p.price) + ' &middot; ' + a('appointment.html?package=' + p.slug, 'Book') + '</li>'; }).join('');
    return '<b>Health packages</b> (sample prices)<ul>' + li + '</ul>' + a('packages.html', 'Compare packages');
  }
  function rooms() { return '<b>Daily room charges</b> (sample)<ul><li>General ward: ' + inr(1500) + '</li><li>Semi-private: ' + inr(3000) + '</li><li>Private room: ' + inr(5000) + '</li><li>Suite: ' + inr(9000) + '</li><li>ICU: ' + inr(12000) + '</li></ul>Doctor, nursing and procedure fees are extra. Try the ' + a('patients.html#estimator', 'bill estimator') + ' for a rough range.'; }
  function insurance() { return 'Yes, we offer <b>cashless treatment</b> with most major insurers and TPAs. Bring your insurance card and photo ID at admission, and our insurance desk sends the pre-authorisation request. If there is a gap, we tell you before treatment starts. ' + a('patients.html', 'More in the patient guide'); }
  function records() { return 'Ask at the medical records desk with your photo ID. Reports are ready within two working days, and recent ones are also sent to your phone.'; }
  function contact() {
    return '<b>Appointments:</b> <a href="tel:' + AP.replace(/\s/g, '') + '">' + AP + '</a><br><b>Emergency:</b> <a href="tel:' + EM.replace(/\s/g, '') + '">' + EM + '</a><br><b>Email:</b> care@aurelia.example<br>' + a('contact.html', 'Contact page');
  }
  function fees() { return 'Consultation fees are confirmed by the appointments desk when you book. Health package prices start at ' + inr(Math.min.apply(null, AC.pkgs.map(function (p) { return p.price; }))) + '. Ask me about packages or room charges.'; }
  function book() { return 'You can book in under two minutes: ' + a('appointment.html', '<b>Book an appointment</b>') + '. Tell me the department or a doctor and I will open the form with it already chosen.'; }
  function departments() { return '<b>Departments</b><ul>' + AC.depts.map(function (d) { return '<li>' + esc(d.name) + '</li>'; }).join('') + '</ul>Tell me a department or a problem and I will show the doctors.'; }
  function doctors() { return 'We have ' + AC.docs.length + ' doctors across ' + AC.depts.length + ' departments. Tell me a department (for example, cardiology) or ' + a('doctors.html', 'see all doctors') + '.'; }
  function availableToday() {
    var t = today();
    if (t === 'Sun') return 'Today is Sunday, so OPD is closed. <b>Emergency care is open 24x7.</b> Our emergency head, Dr. Suresh Babu, is on duty every day.';
    var l = AC.docs.filter(function (d) { return d.days.indexOf(t) > -1; });
    return '<b>Doctors in clinic today (' + t + ')</b><ul>' + l.map(docLine).join('') + '</ul>';
  }
  function doctorsForDept(slug) {
    var l = docsOf(slug);
    return '<b>' + esc(deptName(slug)) + '</b><ul>' + l.map(docLine).join('') + '</ul>';
  }

  /* ---------- reply engine ---------- */
  function localReply(text) {
    var t = text.toLowerCase().trim();
    if (RED.test(t)) return { html: emergency() + '<br>I can also share the hospital address if you need it.', chips: ['Address', 'Contact numbers'] };

    var i, m;
    /* a doctor by name */
    for (i = 0; i < AC.docs.length; i++) {
      var last = AC.docs[i].name.toLowerCase().replace('dr. ', '');
      var first = last.split(' ')[0];
      if (t.indexOf(last) > -1 || (first.length > 3 && new RegExp('\\b' + first + '\\b').test(t))) {
        var d = AC.docs[i];
        return { html: '<b>' + esc(d.name) + '</b><br>' + esc(d.spec) + ', ' + esc(deptName(d.dept)) + '.<br>Available: ' + d.days.join(', ') + '.<br>' + a('appointment.html?doctor=' + d.id, 'Book with ' + esc(d.name)), chips: ['Doctors available today', 'Health packages'] };
      }
    }
    /* package, visiting, rooms and insurance questions go to their own answers first */
    var skip = FIRST.some(function (r) { return r.test(t); });
    /* a department by name */
    if (!skip) for (i = 0; i < DEPTKEY.length; i++) {
      if (DEPTKEY[i][0].test(t)) return { html: doctorsForDept(DEPTKEY[i][1]), chips: ['Doctors available today', 'OPD timings'] };
    }
    /* a symptom */
    if (!skip) for (i = 0; i < SYMPTOMS.length; i++) {
      if (SYMPTOMS[i][0].test(t)) {
        return { html: 'For this, the right department is usually <b>' + esc(deptName(SYMPTOMS[i][1])) + '</b>. <small>I cannot give medical advice, and only a doctor can tell you what is wrong.</small><br>' + doctorsForDept(SYMPTOMS[i][1]), chips: ['Book an appointment', 'Emergency'] };
      }
    }
    /* intents */
    for (i = 0; i < INTENTS.length; i++) {
      m = INTENTS[i];
      if (m.re.test(t)) return { html: m.f(), chips: followUps(m.f) };
    }
    return { html: 'I am not sure about that one. I can help with <b>doctors, timings, packages, room charges, insurance and booking</b>. For anything else, call <a href="tel:' + AP.replace(/\s/g, '') + '">' + AP + '</a>.', chips: ['Doctors available today', 'Health packages', 'OPD timings'] };
  }
  function followUps(f) {
    if (f === hours || f === location || f === visiting) return ['Book an appointment', 'Contact numbers'];
    if (f === packages || f === rooms || f === fees) return ['Book an appointment', 'Insurance'];
    if (f === greet) return ['Doctors available today', 'Health packages', 'OPD timings'];
    return ['Book an appointment', 'OPD timings'];
  }

  /* ---------- storage ---------- */
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(h) { try { sessionStorage.setItem(KEY, JSON.stringify(h.slice(-30))); } catch (e) {} }

  /* ---------- UI ---------- */
  var css = '.ac-launch{position:fixed;left:18px;bottom:18px;z-index:9998;display:flex;align-items:center;gap:10px;background:#0A7E8C;color:#fff;border:0;border-radius:999px;padding:13px 18px 13px 14px;font:700 15px/1 "Public Sans",system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(11,37,69,.28)}' +
    '.ac-launch:hover{background:#075F6B}.ac-launch svg{width:22px;height:22px}' +
    '.ac-win{position:fixed;left:18px;bottom:18px;z-index:9999;width:370px;max-width:calc(100vw - 24px);height:min(560px,calc(100vh - 36px));background:#fff;border-radius:20px;box-shadow:0 14px 44px rgba(11,37,69,.34);display:none;flex-direction:column;overflow:hidden;font:15px/1.5 "Public Sans",system-ui,sans-serif;color:#0B2545}' +
    '.ac-win.open{display:flex}' +
    '.ac-head{background:#0A7E8C;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}' +
    '.ac-av{width:34px;height:34px;border-radius:50%;background:#fff;color:#0A7E8C;display:grid;place-items:center;font-weight:800}' +
    '.ac-head b{display:block;font-size:15px;line-height:1.2}.ac-head small{opacity:.85;font-size:12px}' +
    '.ac-x{margin-left:auto;background:rgba(255,255,255,.18);color:#fff;border:0;border-radius:50%;width:30px;height:30px;font-size:18px;cursor:pointer}' +
    '.ac-log{flex:1;overflow-y:auto;padding:14px;background:#F7FBFC;display:flex;flex-direction:column;gap:10px}' +
    '.ac-m{max-width:88%;padding:10px 13px;border-radius:16px;word-wrap:break-word}' +
    '.ac-m.bot{background:#fff;border:1px solid rgba(11,37,69,.12);border-bottom-left-radius:4px;align-self:flex-start}' +
    '.ac-m.me{background:#0A7E8C;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}' +
    '.ac-m ul{margin:6px 0 4px;padding-left:18px}.ac-m li{margin:0 0 5px}.ac-m a{color:#075F6B;font-weight:700}.ac-m.me a{color:#fff}' +
    '.ac-m small{color:#4B5F73}.ac-red{background:#FFE6E2;border:1px solid #D63E2F;border-radius:10px;padding:8px 10px;color:#7a1d14}.ac-red a{color:#7a1d14}' +
    '.ac-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 14px 10px;background:#F7FBFC}' +
    '.ac-chip{background:#fff;border:1px solid #0A7E8C;color:#075F6B;border-radius:999px;padding:6px 12px;font:600 13px "Public Sans",system-ui,sans-serif;cursor:pointer}' +
    '.ac-chip:hover{background:#0A7E8C;color:#fff}' +
    '.ac-form{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(11,37,69,.12);background:#fff}' +
    '.ac-form input{flex:1;border:1px solid rgba(11,37,69,.25);border-radius:999px;padding:10px 14px;font:15px "Public Sans",system-ui,sans-serif;min-width:0}' +
    '.ac-form button{background:#0A7E8C;color:#fff;border:0;border-radius:999px;padding:0 16px;font:700 14px "Public Sans",system-ui,sans-serif;cursor:pointer}' +
    '.ac-note{font-size:11.5px;color:#4B5F73;text-align:center;padding:0 12px 8px;background:#fff}' +
    '.ac-dots span{display:inline-block;width:7px;height:7px;margin:0 2px;border-radius:50%;background:#7aa;animation:acb 1s infinite}.ac-dots span:nth-child(2){animation-delay:.15s}.ac-dots span:nth-child(3){animation-delay:.3s}' +
    '@keyframes acb{0%,80%,100%{opacity:.25}40%{opacity:1}}' +
    '@media(max-width:480px){.ac-win{left:0;bottom:0;width:100vw;max-width:100vw;height:100dvh;border-radius:0}.ac-launch span{display:none}.ac-launch{padding:14px}}' +
    '@media(prefers-reduced-motion:reduce){.ac-dots span{animation:none}}';

  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var launch = document.createElement('button');
  launch.className = 'ac-launch'; launch.type = 'button'; launch.setAttribute('aria-label', 'Open chat assistant');
  launch.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg><span>Ask Aurelia</span>';

  var win = document.createElement('div');
  win.className = 'ac-win'; win.setAttribute('role', 'dialog'); win.setAttribute('aria-label', 'Ask Aurelia chat assistant');
  win.innerHTML = '<div class="ac-head"><div class="ac-av">A</div><div><b>Ask Aurelia</b><small>Virtual assistant &middot; Aurelia Care Hospital</small></div><button class="ac-x" type="button" aria-label="Close chat">&times;</button></div>' +
    '<div class="ac-log" role="log" aria-live="polite"></div><div class="ac-chips"></div>' +
    '<form class="ac-form"><input type="text" aria-label="Type your question" placeholder="Ask about doctors, timings, packages…" maxlength="200" autocomplete="off"><button type="submit">Send</button></form>' +
    '<div class="ac-note">General information only, not medical advice. Sample hospital and sample data.</div>';

  document.body.appendChild(launch); document.body.appendChild(win);
  var log = win.querySelector('.ac-log'), chipsEl = win.querySelector('.ac-chips'), form = win.querySelector('form'), input = form.querySelector('input');
  var hist = load();

  function add(who, html, store) {
    var d = document.createElement('div'); d.className = 'ac-m ' + who; d.innerHTML = html; log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    if (store !== false) { hist.push({ w: who, h: html }); save(hist); }
    return d;
  }
  function setChips(list) {
    chipsEl.innerHTML = '';
    (list || []).slice(0, 4).forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ac-chip'; b.textContent = c;
      b.addEventListener('click', function () { ask(c); }); chipsEl.appendChild(b);
    });
  }
  function ask(text) {
    text = text.trim(); if (!text) return;
    add('me', esc(text)); input.value = ''; setChips([]);
    var typing = add('bot', '<span class="ac-dots"><span></span><span></span><span></span></span>', false);
    var started = Date.now();
    function finish(res) {
      var wait = Math.max(0, 550 - (Date.now() - started));
      setTimeout(function () { typing.remove(); add('bot', res.html); setChips(res.chips); }, wait);
    }
    if (API) {
      var ctrl = window.AbortController ? new AbortController() : null;
      var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl ? ctrl.signal : undefined, body: JSON.stringify({ message: text, history: hist.slice(-10) }) })
        .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
        .then(function (j) { clearTimeout(to); finish({ html: esc(j.reply || '').replace(/\n/g, '<br>'), chips: ['Book an appointment', 'OPD timings'] }); })
        .catch(function () { clearTimeout(to); finish(localReply(text)); });
    } else finish(localReply(text));
  }

  function open() {
    win.classList.add('open'); launch.style.display = 'none';
    if (!log.children.length) {
      if (hist.length) hist.forEach(function (m) { add(m.w, m.h, false); });
      else { add('bot', greet()); setChips(['Doctors available today', 'Health packages', 'OPD timings', 'Book an appointment']); }
    }
    setTimeout(function () { input.focus(); }, 50);
  }
  function close() { win.classList.remove('open'); launch.style.display = ''; launch.focus(); }
  launch.addEventListener('click', open);
  win.querySelector('.ac-x').addEventListener('click', close);
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && win.classList.contains('open')) close(); });
})();
