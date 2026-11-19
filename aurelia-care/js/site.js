(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var AC = window.AC || { depts: [], docs: [], pkgs: [] };
  /* Put the hospital's number here with country code, no plus (e.g. '914412345678'). Empty opens WhatsApp's chat picker. */
  var WHATSAPP_NUMBER = '';
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function wa(m) { return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(m); }
  function inr(v) { return '₹' + Math.round(v).toLocaleString('en-IN'); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function deptName(slug) { var d = AC.depts.filter(function (x) { return x.slug === slug; })[0]; return d ? d.name : ''; }
  function params() { var o = {}; (location.search || '').replace(/^\?/, '').split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); o[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); }); return o; }

  /* WhatsApp links */
  $$('a.wa').forEach(function (a) { a.href = wa('Hello Aurelia Care Hospital, I have a question.'); });


  /* live data from the server (doctor days / active, package prices) */
  (function () {
    var ALLD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    $$('.doc[data-doc]').forEach(function (c) {
      var d = AC.docs.filter(function (x) { return x.id === c.getAttribute('data-doc'); })[0];
      if (!d) { c.parentNode.removeChild(c); return; }
      c.setAttribute('data-days', d.days.join(' '));
      var box = $('.days', c); if (!box) return; box.textContent = '';
      ALLD.forEach(function (x) { box.appendChild(el('span', d.days.indexOf(x) > -1 ? '' : 'off', x)); });
      if (d.days.indexOf('Sun') > -1) box.appendChild(el('span', '', 'Sun'));
    });
    $$('[data-pkg]').forEach(function (c) {
      var p = AC.pkgs.filter(function (x) { return x.slug === c.getAttribute('data-pkg'); })[0], pr = $('.price', c);
      if (p && pr) { pr.textContent = inr(p.price) + ' '; pr.appendChild(el('small', '', 'one-time')); }
    });
    $$('[data-pkprice]').forEach(function (c) { var p = AC.pkgs.filter(function (x) { return x.slug === c.getAttribute('data-pkprice'); })[0]; if (p) c.textContent = inr(p.price); });
    $$('[data-minprice]').forEach(function (c) { if (AC.pkgs.length) c.textContent = inr(Math.min.apply(null, AC.pkgs.map(function (p) { return p.price; }))); });
  })();

  /* mobile menu */
  var burger = $('.burger'), nav = $('nav.main');
  if (burger && nav) {
    burger.addEventListener('click', function () { var o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o ? 'true' : 'false'); burger.setAttribute('aria-label', o ? 'Close menu' : 'Open menu'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.focus(); } });
  }

  /* reveal on scroll */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window && !calm) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach(function (n) { io.observe(n); });
  } else rv.forEach(function (n) { n.classList.add('in'); });

  /* counters */
  function count(e) {
    var to = +e.getAttribute('data-c'), suf = e.getAttribute('data-s') || '', t0 = null;
    if (calm) { e.textContent = to.toLocaleString('en-IN') + suf; return; }
    function st(t) { if (!t0) t0 = t; var p = Math.min((t - t0) / 1600, 1); e.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en-IN') + suf; if (p < 1) requestAnimationFrame(st); }
    requestAnimationFrame(st);
  }
  var cs = $$('[data-c]');
  if ('IntersectionObserver' in window) { var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { count(e.target); io2.unobserve(e.target); } }); }, { threshold: .6 }); cs.forEach(function (c) { io2.observe(c); }); } else cs.forEach(count);

  /* 3D DNA helix */
  var hx = $('#helix');
  if (hx) { for (var i = 0; i < 23; i++) { var r = el('div', 'rung'); r.style.setProperty('--i', i); r.innerHTML = '<span class="bar"></span><span class="ball a"></span><span class="ball b"></span>'; hx.appendChild(r); } }

  /* pointer parallax in hero */
  var hero = $('.hero');
  if (hero && fine && !calm) {
    var fws = $('#fws'), tilt = $('#tilt');
    hero.addEventListener('pointermove', function (e) {
      var b = hero.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
      if (fws) { fws.style.setProperty('--mx', (x * 36).toFixed(1)); fws.style.setProperty('--my', (y * 36).toFixed(1)); }
      if (tilt) tilt.style.setProperty('--px', (8 + y * -16).toFixed(1) + 'deg');
    });
  }

  /* 3D tilt cards */
  if (fine && !calm) $$('.dept').forEach(function (c) {
    c.addEventListener('pointermove', function (e) { var b = c.getBoundingClientRect(); c.style.setProperty('--ry', (((e.clientX - b.left) / b.width - .5) * 10).toFixed(1) + 'deg'); c.style.setProperty('--rx', (-((e.clientY - b.top) / b.height - .5) * 10).toFixed(1) + 'deg'); });
    c.addEventListener('pointerleave', function () { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  });

  /* ---------- Doctors: search + filters ---------- */
  var docGrid = $('#doc-grid');
  if (docGrid) {
    var cards = $$('.doc-item', docGrid), q = $('#d-q'), dsel = $('#d-dept'), dayBar = $('#d-days'), cnt = $('#d-count'), empty = $('#d-empty'), day = '';
    var p0 = params(); if (p0.dept) dsel.value = p0.dept;
    function filt() {
      var term = q.value.trim().toLowerCase(), n = 0;
      cards.forEach(function (c) {
        var ok = (!dsel.value || c.dataset.dept === dsel.value) && (!day || c.dataset.days.indexOf(day) > -1) && (!term || c.dataset.search.indexOf(term) > -1);
        c.hidden = !ok; if (ok) n++;
      });
      cnt.textContent = n + (n === 1 ? ' doctor' : ' doctors') + ' found'; empty.hidden = n !== 0;
    }
    q.addEventListener('input', filt); dsel.addEventListener('change', filt);
    ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function (d) {
      var b = el('button', '', d || 'Any day'); b.type = 'button'; b.setAttribute('aria-pressed', d === '' ? 'true' : 'false');
      b.addEventListener('click', function () { day = d; $$('button', dayBar).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); filt(); });
      dayBar.appendChild(b);
    });
    filt();
  }

  /* ---------- Departments: search ---------- */
  var dq = $('#dp-q');
  if (dq) {
    var items = $$('.dp-item'), dc = $('#dp-count');
    dq.addEventListener('input', function () { var t = dq.value.trim().toLowerCase(), n = 0; items.forEach(function (c) { var ok = !t || c.dataset.search.indexOf(t) > -1; c.hidden = !ok; if (ok) n++; }); dc.textContent = n + (n === 1 ? ' department' : ' departments'); });
    var h = (location.hash || '').replace('#', ''); if (h) { var t = document.getElementById(h); if (t && t.tagName === 'DETAILS') t.open = true; }
  }

  /* ---------- Packages: highlight a column ---------- */
  var cmp = $('#cmp');
  if (cmp) {
    var pb = $('#pk-pick'); var cols = $$('th[data-pk]', cmp);
    pb && $$('button', pb).forEach(function (b) {
      b.addEventListener('click', function () {
        var slug = b.dataset.pk;
        $$('button', pb).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $$('th, td', cmp).forEach(function (c) { c.classList.remove('hl'); });
        if (!slug) return;
        var idx = cols.map(function (c) { return c.dataset.pk; }).indexOf(slug) + 1;
        $$('tr', cmp).forEach(function (tr) { var c = tr.children[idx]; if (c) c.classList.add('hl'); });
      });
    });
  }

  /* ---------- Appointment flow ---------- */
  var bf = $('#book');
  if (bf) {
    var S = { step: 1, dept: '', doc: '', kind: 'consult', pkg: '', date: '', time: '', name: '', age: '', phone: '', email: '', note: '' };
    var P = params();
    var panels = $$('.step-panel', bf), stepper = $$('#stepper li');
    var dSel = $('#a-dept'), docSel = $('#a-doc'), pkgSel = $('#a-pkg'), pkgWrap = $('#a-pkg-wrap'), docWrap = $('#a-doc-wrap'), deptWrap = $('#a-dept-wrap');
    AC.depts.forEach(function (d) { var o = el('option', '', d.name); o.value = d.slug; dSel.appendChild(o); });
    AC.pkgs.forEach(function (p) { var o = el('option', '', p.name + ' (' + inr(p.price) + ')'); o.value = p.slug; pkgSel.appendChild(o); });
    function fillDocs() {
      docSel.textContent = ''; var a = el('option', '', 'Any available doctor'); a.value = ''; docSel.appendChild(a);
      AC.docs.filter(function (d) { return !S.dept || d.dept === S.dept; }).forEach(function (d) { var o = el('option', '', d.name + ' (' + d.spec + ')'); o.value = d.id; docSel.appendChild(o); });
      docSel.value = S.doc;
    }
    function docById(id) { return AC.docs.filter(function (d) { return d.id === id; })[0]; }
    function pkgBySlug(s) { return AC.pkgs.filter(function (p) { return p.slug === s; })[0]; }
    if (P.package && pkgBySlug(P.package)) { S.kind = 'package'; S.pkg = P.package; }
    if (P.doctor && docById(P.doctor)) { S.doc = P.doctor; S.dept = docById(P.doctor).dept; }
    else if (P.dept) S.dept = P.dept;
    dSel.value = S.dept; fillDocs(); pkgSel.value = S.pkg;
    $$('input[name=kind]').forEach(function (r) { r.checked = r.value === S.kind; r.addEventListener('change', function () { S.kind = r.value; kindUI(); sum(); }); });
    function kindUI() { var pk = S.kind === 'package'; pkgWrap.hidden = !pk; docWrap.hidden = pk; deptWrap.hidden = pk; }
    kindUI();
    dSel.addEventListener('change', function () { S.dept = dSel.value; S.doc = ''; fillDocs(); drawDays(); sum(); });
    docSel.addEventListener('change', function () { S.doc = docSel.value; if (S.doc) { S.dept = docById(S.doc).dept; dSel.value = S.dept; } drawDays(); sum(); });
    pkgSel.addEventListener('change', function () { S.pkg = pkgSel.value; sum(); });

    /* dates and slots */
    var DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var dayBox = $('#a-days'), slotBox = $('#a-slots');
    function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function okDay(d) {
      if (d.getDay() === 0 && S.kind !== 'package') { var doc0 = S.doc && docById(S.doc); if (!(doc0 && doc0.days.indexOf('Sun') > -1) && S.dept !== 'emergency-critical-care') return false; }
      if (S.kind === 'consult' && S.doc) return docById(S.doc).days.indexOf(DN[d.getDay()]) > -1;
      return true;
    }
    function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
    function drawDays() {
      dayBox.textContent = ''; var t = new Date(); t.setHours(0, 0, 0, 0); var firstOk = '';
      for (var i = 0; i < 14; i++) {
        var d = new Date(t); d.setDate(t.getDate() + i);
        var b = el('button'); b.type = 'button'; b.innerHTML = '<span></span><b></b><span></span>';
        b.children[0].textContent = DN[d.getDay()]; b.children[1].textContent = d.getDate(); b.children[2].textContent = MN[d.getMonth()];
        b.dataset.date = iso(d); b.setAttribute('aria-label', DN[d.getDay()] + ' ' + d.getDate() + ' ' + MN[d.getMonth()]);
        if (!okDay(d)) b.disabled = true; else if (!firstOk) firstOk = iso(d);
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () { S.date = this.dataset.date; S.time = ''; $('#a-dt-e').textContent = ''; mark(); drawSlots(); sum(); });
        dayBox.appendChild(b);
      }
      var cur = $$('button', dayBox).filter(function (b) { return b.dataset.date === S.date && !b.disabled; })[0];
      if (!cur) { S.date = ''; S.time = ''; }
      mark(); drawSlots();
    }
    function mark() { $$('button', dayBox).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.date === S.date ? 'true' : 'false'); }); }
    function resKey() { if (S.kind === 'package') return 'pkg:' + S.pkg; if (S.doc) return S.doc; if (S.dept) return 'dept:' + S.dept; return 'any'; }
    var slotTok = 0;
    function drawSlots() {
      slotBox.textContent = '';
      if (!S.date) { slotBox.appendChild(el('p', '', 'Choose a day to see available times.')); return; }
      [['Morning', ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30']], ['Afternoon', ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']]].forEach(function (g) {
        slotBox.appendChild(el('div', 'slot-h', g[0])); var w = el('div', 'slots');
        g[1].forEach(function (s) {
          var b = el('button', '', s); b.type = 'button'; b.setAttribute('aria-pressed', S.time === s ? 'true' : 'false');
          if (hash(S.date + s + (S.doc || S.dept || S.pkg)) % 5 === 0) b.disabled = true;
          b.addEventListener('click', function () { S.time = s; $('#a-dt-e').textContent = ''; $$('button', slotBox).forEach(function (x) { x.setAttribute('aria-pressed', x.textContent === s && !x.disabled ? 'true' : 'false'); }); sum(); });
          w.appendChild(b);
        }); slotBox.appendChild(w);
      });
      /* real availability from the server (falls back to the sample pattern above if there is no server) */
      var tok = ++slotTok, url = '/api/slots?res=' + encodeURIComponent(resKey()) + '&date=' + encodeURIComponent(S.date);
      try {
        fetch(url).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (j) {
          if (tok !== slotTok) return;
          $$('.slots button', slotBox).forEach(function (b) { b.disabled = j.taken.indexOf(b.textContent) > -1; });
          if (S.time && j.taken.indexOf(S.time) > -1) { S.time = ''; sum(); $('#a-dt-e').textContent = 'That time was just taken. Please choose another.'; }
          $$('.slots button', slotBox).forEach(function (b) { b.setAttribute('aria-pressed', b.textContent === S.time && !b.disabled ? 'true' : 'false'); });
        }).catch(function () {});
      } catch (x) {}
    }
    drawDays();

    function dLabel(s) { if (!s) return ''; var d = new Date(s + 'T00:00:00'); return DN[d.getDay()] + ', ' + d.getDate() + ' ' + MN[d.getMonth()] + ' ' + d.getFullYear(); }
    function what() { if (S.kind === 'package') { var p = pkgBySlug(S.pkg); return p ? p.name : 'Health package'; } var d = S.doc && docById(S.doc); return d ? d.name + ', ' + d.spec : (S.dept ? deptName(S.dept) + ', any doctor' : 'Any available doctor'); }
    function sum() {
      var s = $('#sum'); s.textContent = '';
      function row(a, b) { var dt = el('dt', '', a), dd = el('dd', '', b || 'Not chosen yet'); s.appendChild(dt); s.appendChild(dd); }
      row('Visit', what()); row('Day', dLabel(S.date)); row('Time', S.time); row('Patient', S.name);
    }
    sum();

    function go(n) {
      S.step = n; panels.forEach(function (p, i) { p.hidden = i !== n - 1; });
      stepper.forEach(function (li, i) { li.classList.toggle('done', i < n - 1); if (i === n - 1) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      var h = $('h2', panels[n - 1]); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      var top = $('#book-top'); if (top && !calm) top.scrollIntoView({ behavior: 'smooth', block: 'start' }); else if (top) top.scrollIntoView();
    }
    function err(id, msg) { var i = document.getElementById(id), e = document.getElementById(id + '-e'); if (i) i.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (e) e.textContent = msg || ''; return !msg; }
    $$('[data-next]').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = S.step;
        if (n === 1) { if (S.kind === 'package' && !S.pkg) { err('a-pkg', 'Choose a package.'); return; } err('a-pkg', ''); go(2); }
        else if (n === 2) { var m = $('#a-dt-e'); if (!S.date || !S.time) { m.textContent = !S.date ? 'Choose a day.' : 'Choose a time.'; return; } m.textContent = ''; go(3); }
        else if (n === 3) {
          S.name = $('#a-name').value.trim(); S.age = $('#a-age').value.trim(); S.phone = $('#a-phone').value.trim(); S.email = $('#a-email').value.trim(); S.note = $('#a-note').value.trim();
          var ok = true;
          ok = err('a-name', S.name ? '' : 'Enter the patient’s name.') && ok;
          ok = err('a-age', (+S.age > 0 && +S.age < 120) ? '' : 'Enter an age from 1 to 119.') && ok;
          ok = err('a-phone', S.phone.replace(/\D/g, '').length >= 8 ? '' : 'Enter a phone number we can call.') && ok;
          ok = err('a-email', (!S.email || /^\S+@\S+\.\S+$/.test(S.email)) ? '' : 'Enter a valid email or leave it empty.') && ok;
          if (!ok) return; sum(); review(); go(4);
        }
      });
    });
    $$('[data-prev]').forEach(function (b) { b.addEventListener('click', function () { go(Math.max(1, S.step - 1)); }); });
    function review() {
      var r = $('#review'); r.textContent = '';
      [['Visit', what()], ['Day', dLabel(S.date)], ['Time', S.time], ['Patient', S.name + ', ' + S.age + ' yrs'], ['Phone', S.phone], ['Email', S.email || 'Not given'], ['Notes', S.note || 'None']].forEach(function (x) { var d = el('div', 'rl'); d.appendChild(el('span', '', x[0])); d.appendChild(el('strong', '', x[1])); r.appendChild(d); });
    }
    function finish(ref) {
      $('#ref').textContent = ref;
      var msg = 'Hello Aurelia Care Hospital, I requested an appointment (ref ' + ref + '): ' + what() + ' on ' + dLabel(S.date) + ' at ' + S.time + '. Patient: ' + S.name + ', ' + S.age + ' yrs, phone ' + S.phone + '.';
      $('#a-wa').href = wa(msg);
      panels.forEach(function (p) { p.hidden = true; }); $('#step-done').hidden = false; $('aside.summary').hidden = true; bf.style.gridTemplateColumns = '1fr'; bf.style.maxWidth = '760px'; bf.style.marginInline = 'auto';
      stepper.forEach(function (li) { li.classList.add('done'); li.removeAttribute('aria-current'); });
      var h = $('#step-done h2'); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true });
      var top = $('#book-top'); if (top) top.scrollIntoView();
    }
    var cbtn = $('#confirm'), cerrBox = document.createElement('p');
    cerrBox.setAttribute('role', 'alert'); cerrBox.style.cssText = 'color:var(--coral);font-weight:700;margin:10px 0 0'; cbtn.parentNode.appendChild(cerrBox);
    cbtn.addEventListener('click', function () {
      cerrBox.textContent = ''; cbtn.disabled = true;
      var payload = { kind: S.kind, dept: S.dept, doctor: S.doc, pkg: S.pkg, date: S.date, time: S.time, name: S.name, age: S.age, phone: S.phone, email: S.email, note: S.note };
      var offline = function () { finish('ACH-' + (10000 + Math.floor(Math.random() * 89999))); };
      var p;
      try { p = fetch('/api/appointment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (x) { cbtn.disabled = false; offline(); return; }
      p.then(function (r) {
        if (r.status === 404 || r.status === 405 || r.status === 501) { offline(); return; }   /* no server behind this site: sample mode */
        return r.json().then(function (j) {
          if (r.ok) { finish(j.ref); return; }
          if (r.status === 409) { S.time = ''; sum(); go(2); $('#a-dt-e').textContent = 'Sorry, that time was just booked. Please choose another.'; drawSlots(); return; }
          cerrBox.textContent = j.error || 'Something went wrong. Please try again.';
        });
      }).catch(function () { offline(); }).then(function () { cbtn.disabled = false; });
    });
  }

  /* ---------- Bill estimator ---------- */
  var est = $('#est-form');
  if (est) {
    var ROOMS = { general: ['General ward', 1500], semi: ['Semi-private room', 3000], priv: ['Private room', 5000], suite: ['Suite', 9000] }, ICU = 12000, PROC = { none: ['No procedure', 0], minor: ['Minor procedure', 25000], major: ['Major surgery', 120000] };
    function calc() {
      var rm = ROOMS[$('#e-room').value], d = Math.max(0, Math.min(30, +$('#e-days').value || 0)), ic = Math.max(0, Math.min(10, +$('#e-icu').value || 0)), pr = PROC[$('#e-proc').value];
      var room = rm[1] * d, icu = ICU * ic, sub = room + icu + pr[1], low = sub, high = sub * 1.15;
      var box = $('#e-lines'); box.textContent = '';
      [[rm[0] + ' x ' + d + ' day' + (d === 1 ? '' : 's'), inr(room)], ['ICU x ' + ic + ' day' + (ic === 1 ? '' : 's'), inr(icu)], [pr[0], inr(pr[1])]].forEach(function (x) { var r = el('div', 'rl'); r.appendChild(el('span', '', x[0])); r.appendChild(el('span', '', x[1])); box.appendChild(r); });
      $('#e-total').textContent = sub ? inr(low) + ' to ' + inr(high) : '₹0';
    }
    ['e-room', 'e-days', 'e-icu', 'e-proc'].forEach(function (id) { var n = document.getElementById(id); n.addEventListener('input', calc); n.addEventListener('change', calc); });
    calc();
  }

  /* ---------- Contact form ---------- */
  var cf = $('#contact-form');
  if (cf) {
    function cerr(id, m) { var i = document.getElementById(id); i.setAttribute('aria-invalid', m ? 'true' : 'false'); document.getElementById(id + '-e').textContent = m || ''; return !m; }
    var rules = [['c-name', function (v) { return v.trim() ? '' : 'Enter your name.'; }], ['c-phone', function (v) { return v.replace(/\D/g, '').length >= 8 ? '' : 'Enter a phone number we can call.'; }], ['c-msg', function (v) { return v.trim().length >= 5 ? '' : 'Tell us a little about what you need.'; }]];
    rules.forEach(function (r) { document.getElementById(r[0]).addEventListener('input', function () { cerr(r[0], r[1](this.value)); }); });
    cf.addEventListener('submit', function (e) {
      e.preventDefault(); var ok = true;
      rules.forEach(function (r) { if (!cerr(r[0], r[1](document.getElementById(r[0]).value))) ok = false; });
      var st = $('#c-status'); if (!ok) { st.hidden = true; return; }
      var link = wa('Hello Aurelia Care Hospital. Topic: ' + $('#c-topic').value + '. ' + $('#c-msg').value.trim() + ' (Name: ' + $('#c-name').value.trim() + ', phone: ' + $('#c-phone').value.trim() + ')');
      st.textContent = 'Opening WhatsApp with your message. '; var a = el('a', '', 'If it did not open, tap here.'); a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.style.color = 'inherit'; a.style.textDecoration = 'underline'; st.appendChild(a); st.hidden = false;
      window.open(link, '_blank', 'noopener');
      try { fetch('/api/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: $('#c-name').value.trim(), phone: $('#c-phone').value.trim(), topic: $('#c-topic').value, msg: $('#c-msg').value.trim() }) }).then(function (r) { if (r.ok) { var n = el('span', '', ' Your message has also been saved with our team.'); st.appendChild(n); } }).catch(function () {}); } catch (x) {}
    });
  }
})();
