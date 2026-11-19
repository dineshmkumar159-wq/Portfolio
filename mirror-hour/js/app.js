(function () {
  var V = document.getElementById('view'), CAT = null, S = null, st = fresh(), QS = null, dp = null;
  var DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fresh() { return { step: 1, svc: [], stylist: 'any', date: null, time: null, name: '', phone: '', coupon: '', method: 'upi', note: '' }; }
  var inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
  var t12 = function (m) { var h = Math.floor(m / 60); return (h % 12 || 12) + ':' + String(m % 60).padStart(2, '0') + (h < 12 ? ' am' : ' pm'); };
  var iso = function (d) { return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); };
  var addDay = function (dk, n) { var a = dk.split('-').map(Number); return iso(new Date(Date.UTC(a[0], a[1] - 1, a[2] + n))); };
  var dowOf = function (dk) { var a = dk.split('-').map(Number); return new Date(Date.UTC(a[0], a[1] - 1, a[2])).getUTCDay(); };
  var nice = function (dk) { var a = dk.split('-').map(Number); return DN[dowOf(dk)] + ', ' + a[2] + ' ' + MN[a[1] - 1]; };
  function h(tag, a, kids) { var e = document.createElement(tag); for (var k in (a || {})) { var v = a[k]; if (v == null || v === false) continue; if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v; else if (k === 'style') e.setAttribute('style', v); else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); } (kids || []).forEach(function (c) { if (c == null || c === false) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
  function api(p, m, b) { return fetch(p, { method: m || 'GET', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || 'Something went wrong'); e.status = r.status; throw e; } return j; }); }); }
  var tt; function toast(t) { var e = document.getElementById('toast'); e.textContent = t; e.className = 'toast on'; clearTimeout(tt); tt = setTimeout(function () { e.className = 'toast'; }, 2600); }
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } return null; }
  var mine = function () { return ls('mh_bookings') || []; };
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .1 });
  function reveal() { V.querySelectorAll('.rv').forEach(function (e) { io.observe(e); }); setTimeout(function () { V.querySelectorAll('.rv').forEach(function (e) { if (e.getBoundingClientRect().top < innerHeight) e.classList.add('in'); }); }, 300); }
  function tilt(e, max) { if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return; e.addEventListener('pointermove', function (ev) { var r = e.getBoundingClientRect(); e.style.setProperty('--ry', (((ev.clientX - r.left) / r.width - .5) * max).toFixed(1) + 'deg'); e.style.setProperty('--rx', ((.5 - (ev.clientY - r.top) / r.height) * max).toFixed(1) + 'deg'); }); e.addEventListener('pointerleave', function () { e.style.setProperty('--rx', '0deg'); e.style.setProperty('--ry', '0deg'); }); }
  function offerText(o) { return o.kind === 'percent' ? o.value + '% off' : inr(o.value) + ' off'; }

  /* ---- catalog ---- */
  function load() { return api('/api/catalog').then(function (c) { S = c; CAT = CAT || c.services[0].cat; document.getElementById('f-addr').textContent = c.salon.address; document.getElementById('f-hours').textContent = 'Open ' + c.salon.hours; document.getElementById('f-phone').textContent = c.salon.phone; document.title = c.salon.name + ' · Book online'; }); }
  var today = function () { return iso(new Date((S ? S.now : Date.now()) + 330 * 6e4)); };

  /* ---- router ---- */
  function route() {
    var p = location.hash.replace(/^#/, '') || '/'; document.querySelectorAll('.links a').forEach(function (a) { a.classList.toggle('on', ('#' + p).indexOf(a.getAttribute('href')) === 0 && (a.dataset.r !== 'home' || p === '/')); });
    var go = function () { V.innerHTML = ''; if (p === '/book') wiz(); else if (p === '/mine') lookup(); else if (/^\/b\/[A-Z0-9]+/i.test(p)) viewBooking(p.split('/')[2]); else home(); window.scrollTo(0, 0); reveal(); };
    if (S) go(); else load().then(go).catch(function () { V.appendChild(h('div', { class: 'empty', text: 'Could not load the salon. Please refresh.' })); });
  }
  addEventListener('hashchange', route);

  /* ---- home ---- */
  function home() {
    var mir = h('div', { class: 'mirror' }, [h('div', { class: 'glass' }, [h('div', {}, ['Your best', h('br'), h('i', { text: 'hour' })])])]), ring = h('div', { class: 'ring' }, ['✂️', '💅', '💄', '🌸', '✨', '💇'].map(function (e, i) { return h('b', { style: '--i:' + i, text: e }); }));
    var stage = h('div', { class: 'stage3d' }, [h('div', { class: 'words' }, ['GLOW', 'STYLE', 'SHINE'].map(function (w) { return h('span', { text: w }); })), ring, mir]);
    if (matchMedia('(hover:hover) and (pointer:fine)').matches) { document.addEventListener('pointermove', function mv(e) { if (!document.body.contains(mir)) { document.removeEventListener('pointermove', mv); return; } mir.style.setProperty('--ry', ((e.clientX / innerWidth - .5) * 34) + 'deg'); mir.style.setProperty('--rx', ((.5 - e.clientY / innerHeight) * 16) + 'deg'); }); }
    var c = h('div', { class: 'in' });
    c.appendChild(h('div', { class: 'hero' }, [h('div', {}, [h('span', { class: 'eyebrow', text: 'Nungambakkam, Chennai · Hair, skin, nails & bridal' }), h('h1', {}, ['Look like the', h('em', { text: 'best hour of your day.' })]), h('p', { class: 'lead', text: 'Choose your services, your stylist and your time. Pay a small deposit and your chair is waiting. No phone calls.' }), h('div', { class: 'ctas' }, [h('a', { class: 'btn', href: '#/book', text: 'Book an appointment' }), h('a', { class: 'btn ghost', href: '#svc', onclick: function (e) { e.preventDefault(); document.getElementById('sv').scrollIntoView({ behavior: 'smooth' }); }, text: 'See the menu' })]), h('div', { class: 'facts' }, [h('span', { text: S.stylists.length + ' expert stylists' }), h('span', { text: 'Open ' + S.salon.hours }), h('span', { text: 'Book up to 14 days ahead' })])]), stage]));
    V.appendChild(c);
    /* offers */
    var off = h('section', { class: 's' }, [h('div', { class: 'in' }, [h('div', { class: 'rv' }, [h('span', { class: 'eyebrow', text: 'Offers' }), h('h2', { class: 't' }, ['Treats for ', h('em', { text: 'you' })]), h('p', { class: 'lead', text: 'Automatic offers apply when you book. For coupon codes, type the code on the last step.' })]), h('div', { class: 'grid', style: 'margin-top:26px' }, S.offers.map(function (o, i) { var days = o.days.length ? o.days.map(function (d) { return DN[d]; }).join(', ') : 'Every day'; var e = h('div', { class: 'offer rv tilt', style: '--d:' + i * .08 + 's' }, [h('b', { text: offerText(o) }), h('div', { text: o.title }), o.code ? h('span', { class: 'code', text: o.code }) : h('span', { class: 'code', style: 'background:var(--gold)', text: 'AUTOMATIC' }), h('span', { text: days + (o.min ? ' · bill ' + inr(o.min) + '+' : '') + (o.cap ? ' · up to ' + inr(o.cap) : '') })]); tilt(e, 8); return e; }))])]);
    V.appendChild(off);
    /* services */
    var cats = []; S.services.forEach(function (s) { if (cats.indexOf(s.cat) < 0) cats.push(s.cat); });
    var grid = h('div', { class: 'grid' }), tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Service categories' });
    function paint() { grid.innerHTML = ''; tabs.innerHTML = ''; cats.forEach(function (k) { tabs.appendChild(h('button', { type: 'button', 'aria-pressed': k === CAT, text: k, onclick: function () { CAT = k; paint(); } })); }); S.services.filter(function (s) { return s.cat === CAT; }).forEach(function (s) { var e = h('div', { class: 'card svc tilt' }, [h('div', { class: 'e', text: s.emoji }), h('h3', { text: s.name }), h('p', { text: s.descr }), h('div', { class: 'pr' }, [h('span', {}, [inr(s.price), ' ', h('small', { text: '· ' + s.mins + ' min' })]), h('button', { class: 'btn sm', type: 'button', text: 'Book', onclick: function () { st = fresh(); st.svc = [s.id]; st.step = 2; location.hash = '#/book'; } })])]); tilt(e, 9); grid.appendChild(e); }); }
    paint(); V.appendChild(h('section', { class: 's', id: 'sv' }, [h('div', { class: 'in' }, [h('div', { class: 'rv' }, [h('span', { class: 'eyebrow', text: 'The menu' }), h('h2', { class: 't' }, ['Services & ', h('em', { text: 'prices' })])]), tabs, grid])]));
    /* stylists */
    V.appendChild(h('section', { class: 's' }, [h('div', { class: 'in' }, [h('div', { class: 'rv' }, [h('span', { class: 'eyebrow', text: 'The team' }), h('h2', { class: 't' }, ['Meet your ', h('em', { text: 'stylist' })])]), h('div', { class: 'grid', style: 'margin-top:26px' }, S.stylists.map(function (s, i) { var e = h('div', { class: 'card sty rv tilt', style: '--d:' + i * .07 + 's;--c:' + s.color }, [h('div', { class: 'av', text: s.emoji }), h('h3', { text: s.name }), h('small', { text: s.role.toUpperCase() }), h('p', { text: s.bio }), h('button', { class: 'btn sm ghost', type: 'button', text: 'Book with ' + s.name, onclick: function () { st = fresh(); st.stylist = s.id; location.hash = '#/book'; } })]); tilt(e, 10); return e; }))])]));
    /* steps */
    V.appendChild(h('section', { class: 's' }, [h('div', { class: 'in' }, [h('div', { class: 'rv', style: 'margin-bottom:40px' }, [h('span', { class: 'eyebrow', text: 'How it works' }), h('h2', { class: 't' }, ['Booked in ', h('em', { text: 'one minute' })])]), h('div', { class: 'steps' }, [['Pick your services', 'Choose one or several. We add up the time and the price.'], ['Choose stylist and time', 'See only the times that are really free, with the stylist you like.'], ['Pay a small deposit', 'A ' + inr(S.deposit) + ' test-mode deposit holds your chair. Pay the rest at the salon.']].map(function (x, i) { return h('div', { class: 'card rv', style: '--d:' + i * .1 + 's' }, [h('h3', { text: x[0] }), h('p', { text: x[1] })]); })), h('div', { style: 'text-align:center;margin-top:34px' }, [h('a', { class: 'btn rose', href: '#/book', text: 'Start booking' })])])]));
  }

  /* ---- booking wizard ---- */
  var TITLES = ['Choose services', 'Choose your stylist', 'Pick a day and time', 'Your details'];
  function sel() { return S.services.filter(function (s) { return st.svc.indexOf(s.id) >= 0; }); }
  function totals() { var a = sel(); return { mins: a.reduce(function (x, s) { return x + s.mins; }, 0), price: a.reduce(function (x, s) { return x + s.price; }, 0) }; }
  function wiz() {
    var w = h('div', { class: 'in wiz' }); V.appendChild(w);
    w.appendChild(h('div', { class: 'prog' }, [1, 2, 3, 4].map(function (n) { return h('i', { class: n <= st.step ? 'on' : '' }); })));
    w.appendChild(h('span', { class: 'eyebrow', text: 'Step ' + st.step + ' of 4' })); w.appendChild(h('h1', { text: TITLES[st.step - 1] }));
    var body = h('div', { style: 'margin-top:16px' }); w.appendChild(body); var bar = h('div', { class: 'bar' }); document.body.appendChild(bar);
    var cleanup = function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }; window.addEventListener('hashchange', cleanup, { once: true });
    function footer(label, ok, next, sub) { var t = totals(); bar.innerHTML = ''; bar.appendChild(h('div', { class: 'in' }, [h('div', {}, [h('b', { text: st.svc.length ? inr(t.price) : '₹0' }), h('small', { text: st.svc.length ? t.mins + ' min · ' + st.svc.length + ' service' + (st.svc.length > 1 ? 's' : '') : 'Nothing chosen yet' })]), h('div', { style: 'display:flex;gap:8px' }, [st.step > 1 ? h('button', { class: 'btn ghost', type: 'button', text: 'Back', onclick: function () { st.step--; rerender(); } }) : null, h('button', { class: 'btn', type: 'button', text: label, disabled: !ok, onclick: next })])])); }
    function rerender() { cleanup(); V.innerHTML = ''; wiz(); window.scrollTo(0, 0); }
    if (st.step === 1) {
      var cats = []; S.services.forEach(function (s) { if (cats.indexOf(s.cat) < 0) cats.push(s.cat); });
      cats.forEach(function (k) { body.appendChild(h('div', { class: 'part', text: k })); var l = h('div', { class: 'list' }); S.services.filter(function (s) { return s.cat === k; }).forEach(function (s) { var on = st.svc.indexOf(s.id) >= 0; l.appendChild(h('button', { class: 'pick', type: 'button', 'aria-pressed': on, onclick: function () { var i = st.svc.indexOf(s.id); if (i >= 0) st.svc.splice(i, 1); else if (st.svc.length < 6) st.svc.push(s.id); st.time = null; rerenderKeep(); } }, [h('span', { class: 'ck', text: on ? '✓' : '' }), h('span', { class: 'e', text: s.emoji }), h('span', {}, [h('b', { text: s.name }), h('small', { text: s.mins + ' min · ' + s.descr })]), h('span', { class: 'p', text: inr(s.price) })])); }); body.appendChild(l); });
      var sy = window.scrollY; function rerenderKeep() { cleanup(); V.innerHTML = ''; wiz(); window.scrollTo(0, sy = window.scrollY || sy); }
      footer('Continue', st.svc.length > 0, function () { st.step = 2; rerender(); });
    }
    if (st.step === 2) {
      var okIds = S.stylists.filter(function (s) { return st.svc.every(function (id) { return s.skills.indexOf(id) >= 0; }); }).map(function (s) { return s.id; });
      if (st.stylist !== 'any' && okIds.indexOf(st.stylist) < 0) st.stylist = 'any';
      var l = h('div', { class: 'list' }); function opt(id, e, name, sub, color) { l.appendChild(h('button', { class: 'pick', type: 'button', 'aria-pressed': st.stylist === id, onclick: function () { st.stylist = id; st.time = null; rerender(); } }, [h('span', { class: 'e', text: e, style: color ? 'background:' + color + ';border-radius:50%;width:46px;height:46px;display:grid;place-items:center' : '' }), h('span', {}, [h('b', { text: name }), h('small', { text: sub })])])); }
      if (!okIds.length) body.appendChild(h('div', { class: 'note', text: 'No single stylist does all of those services together. Go back and book them as separate appointments.' })); else { opt('any', '✨', 'Any available stylist', 'Fastest. We pick the best match for your time.'); S.stylists.filter(function (s) { return okIds.indexOf(s.id) >= 0; }).forEach(function (s) { opt(s.id, s.emoji, s.name, s.role, s.color); }); }
      body.appendChild(l); footer('Continue', okIds.length > 0, function () { st.step = 3; rerender(); });
    }
    if (st.step === 3) {
      var t0 = today(), strip = h('div', { class: 'days', role: 'group', 'aria-label': 'Choose a day' }), grid = h('div'), info = h('div');
      if (!st.date) st.date = t0;
      for (var i = 0; i < 15; i++) (function (dk) { var a = dk.split('-').map(Number); strip.appendChild(h('button', { type: 'button', 'aria-pressed': st.date === dk, onclick: function () { st.date = dk; st.time = null; rerender(); } }, [h('small', { text: dk === t0 ? 'Today' : DN[dowOf(dk)] }), h('span', { text: a[2] + ' ' + MN[a[1] - 1] })])); })(addDay(t0, i));
      body.appendChild(strip); body.appendChild(info); body.appendChild(grid);
      api('/api/slots?date=' + st.date + '&services=' + st.svc.join(',') + '&stylist=' + st.stylist).then(function (r) {
        var sl = r.slots.filter(function (s) { return s.min % 30 === 0 || false; }); if (!sl.length) sl = r.slots;
        if (!sl.length) { grid.appendChild(h('div', { class: 'empty', text: 'No free times on this day for your services. Try another day or another stylist.' })); footer('Continue', false); return; }
        info.appendChild(h('p', { style: 'color:var(--mut);margin:4px 0 0', text: nice(st.date) + ' · your visit takes about ' + r.mins + ' minutes' }));
        [['Morning', 0, 720], ['Afternoon', 720, 1020], ['Evening', 1020, 1440]].forEach(function (g) { var ss = sl.filter(function (s) { return s.min >= g[1] && s.min < g[2]; }); if (!ss.length) return; grid.appendChild(h('div', { class: 'part', text: g[0] })); grid.appendChild(h('div', { class: 'slots' }, ss.map(function (s) { return h('button', { type: 'button', 'aria-pressed': st.time === s.min, text: t12(s.min), onclick: function () { st.time = s.min; st.pickedSty = s.stylists; grid.querySelectorAll('.slots button').forEach(function (b) { b.setAttribute('aria-pressed', b.textContent === t12(s.min)); }); footer('Continue', true, function () { st.step = 4; rerender(); }); } }); }))); });
        footer('Continue', st.time != null && sl.some(function (s) { return s.min === st.time; }), function () { st.step = 4; rerender(); });
      }).catch(function (e) { grid.appendChild(h('div', { class: 'empty', text: e.message })); footer('Continue', false); });
      footer('Continue', false);
    }
    if (st.step === 4) {
      var saved = ls('mh_me') || {}; st.name = st.name || saved.name || ''; st.phone = st.phone || saved.phone || '';
      var sum = h('div', { class: 'sum' }), err = h('div', { class: 'err', role: 'alert' }), cm = h('div', { style: 'font-size:.9rem;min-height:1.3em' });
      var nm = h('input', { id: 'nm', value: st.name, maxlength: 60, autocomplete: 'name' }), ph = h('input', { id: 'ph', value: st.phone, inputmode: 'numeric', maxlength: 14, autocomplete: 'tel' }), cp = h('input', { id: 'cp', value: st.coupon, maxlength: 20, placeholder: 'e.g. FIRST20', style: 'text-transform:uppercase' }), nt = h('input', { id: 'nt', value: st.note, maxlength: 200, placeholder: 'Anything we should know?' });
      var upi = h('input', { id: 'upi', placeholder: 'name@okbank', autocomplete: 'off' }), cn = h('input', { id: 'cn', inputmode: 'numeric', placeholder: '4242 4242 4242 4242', maxlength: 23, autocomplete: 'off' }), ce = h('input', { id: 'ce', placeholder: 'MM/YY', maxlength: 5 }), cv = h('input', { id: 'cv', inputmode: 'numeric', placeholder: 'CVV', maxlength: 4 });
      var payUpi = h('div', {}, [h('label', { for: 'upi', text: 'UPI ID' }), upi]), payCard = h('div', {}, [h('label', { for: 'cn', text: 'Card number' }), cn, h('div', { class: 'two' }, [h('div', {}, [h('label', { for: 'ce', text: 'Expiry' }), ce]), h('div', {}, [h('label', { for: 'cv', text: 'CVV' }), cv])])]);
      var methods = h('div', { class: 'pays' });
      function drawM() { methods.innerHTML = ''; [['upi', '📲 UPI'], ['card', '💳 Card']].forEach(function (m) { methods.appendChild(h('button', { type: 'button', 'aria-pressed': st.method === m[0], text: m[1], onclick: function () { st.method = m[0]; drawM(); } })); }); payUpi.hidden = st.method !== 'upi'; payCard.hidden = st.method !== 'card'; }
      var depBox = h('div');
      function quote() {
        st.coupon = cp.value.trim().toUpperCase();
        return api('/api/quote', 'POST', { services: st.svc, coupon: st.coupon, date: st.date }).then(function (q) {
          QS = q; sum.innerHTML = ''; q.items.forEach(function (i) { sum.appendChild(h('div', {}, [h('span', { text: i.name }), h('span', { text: inr(i.price) })])); });
          if (q.discount) sum.appendChild(h('div', { class: 'dis' }, [h('span', { text: q.offer || 'Offer' }), h('span', { text: '− ' + inr(q.discount) })]));
          sum.appendChild(h('div', { class: 'tot' }, [h('span', { text: 'Total' }), h('span', { text: inr(q.total) })]));
          sum.appendChild(h('div', {}, [h('span', { text: 'Deposit now (test mode)' }), h('span', { text: inr(q.deposit) })])); sum.appendChild(h('div', {}, [h('span', { text: 'Pay at the salon' }), h('span', { text: inr(q.balance) })]));
          cm.textContent = q.message || (q.coupon ? 'Code ' + q.coupon + ' applied.' : ''); cm.style.color = q.message ? 'var(--bad)' : 'var(--ok)'; depBox.hidden = q.deposit <= 0;
          footer(q.deposit > 0 ? 'Pay ' + inr(q.deposit) + ' & confirm' : 'Confirm booking', true, pay);
        }).catch(function (e) { err.textContent = e.message; });
      }
      body.appendChild(h('div', { class: 'card' }, [h('b', { text: nice(st.date) + ' at ' + t12(st.time) }), h('div', { style: 'color:var(--mut)', text: st.stylist === 'any' ? 'With the first available stylist' : 'With ' + (S.stylists.find(function (s) { return s.id === st.stylist; }) || {}).name })]));
      body.appendChild(h('div', { class: 'card', style: 'margin-top:14px' }, [h('div', { class: 'two' }, [h('div', {}, [h('label', { for: 'nm', text: 'Your name' }), nm]), h('div', {}, [h('label', { for: 'ph', text: 'Mobile number' }), ph])]), h('label', { for: 'nt', text: 'Note (optional)' }), nt, h('label', { for: 'cp', text: 'Coupon code' }), h('div', { style: 'display:flex;gap:8px' }, [cp, h('button', { class: 'btn ghost', type: 'button', text: 'Apply', onclick: quote })]), cm]));
      body.appendChild(h('div', { class: 'card', style: 'margin-top:14px' }, [h('h3', { text: 'Summary', style: 'font-size:1.6rem;margin-bottom:8px' }), sum]));
      depBox.appendChild(h('div', { class: 'card', style: 'margin-top:14px' }, [h('h3', { text: 'Pay the deposit', style: 'font-size:1.6rem;margin-bottom:8px' }), methods, payUpi, payCard, h('div', { class: 'note', html: null, text: 'Test mode: no real money moves. UPI name@okbank works, name@fail is declined. Card 4242 4242 4242 4242, any future date, any CVV. The deposit is refunded if you cancel at least 2 hours before.' })]));
      body.appendChild(depBox); body.appendChild(err); drawM(); quote();
      function pay() {
        err.textContent = ''; st.name = nm.value; st.phone = ph.value; st.note = nt.value; ls('mh_me', { name: st.name, phone: st.phone });
        var b = { name: st.name, phone: st.phone, services: st.svc, stylist: st.stylist === 'any' ? 'any' : st.stylist, date: st.date, time: st.time, coupon: st.coupon, note: st.note }; if (QS && QS.deposit > 0) b.pay = st.method === 'upi' ? { type: 'upi', upi: upi.value } : { type: 'card', number: cn.value, exp: ce.value, cvv: cv.value };
        bar.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        api('/api/book', 'POST', b).then(function (r) { var l = mine(); l.unshift({ code: r.code, phone: r.phone }); ls('mh_bookings', l.slice(0, 12)); st = fresh(); cleanup(); location.hash = '#/b/' + r.code + '?new=1'; ls('mh_phone_' + r.code, r.phone); }).catch(function (e) { err.textContent = e.message; bar.querySelectorAll('button').forEach(function (x) { x.disabled = false; }); if (e.status === 409) { st.step = 3; st.time = null; setTimeout(rerender, 1400); } });
      }
    }
  }

  /* ---- booking view / lookup ---- */
  function lookup() {
    var l = mine(), code = h('input', { id: 'lc', placeholder: 'e.g. JGL3ES', maxlength: 8, style: 'text-transform:uppercase' }), ph = h('input', { id: 'lp', inputmode: 'numeric', maxlength: 14, value: (ls('mh_me') || {}).phone || '' }), err = h('div', { class: 'err', role: 'alert' });
    V.appendChild(h('div', { class: 'in wiz' }, [h('span', { class: 'eyebrow', text: 'My booking' }), h('h1', { text: 'Find your appointment' }), h('div', { class: 'card', style: 'max-width:520px;margin-top:16px' }, [h('label', { for: 'lc', text: 'Booking code' }), code, h('label', { for: 'lp', text: 'Mobile number used to book' }), ph, err, h('button', { class: 'btn', type: 'button', style: 'margin-top:8px', text: 'Find booking', onclick: function () { if (!code.value.trim()) { err.textContent = 'Enter your booking code.'; return; } ls('mh_phone_' + code.value.trim().toUpperCase(), ph.value); location.hash = '#/b/' + code.value.trim().toUpperCase(); } })]), l.length ? h('div', { style: 'margin-top:26px' }, [h('h3', { text: 'Bookings from this phone', style: 'font-size:1.6rem;margin-bottom:10px' }), h('div', { class: 'list', style: 'max-width:520px' }, l.map(function (b) { return h('a', { class: 'pick', href: '#/b/' + b.code, style: 'text-decoration:none;color:inherit' }, [h('span', { class: 'e', text: '🪞' }), h('span', {}, [h('b', { text: b.code })])]); }))]) : null]));
  }
  function viewBooking(code) {
    code = code.split('?')[0].toUpperCase(); var isNew = location.hash.indexOf('new=1') > 0, ph = ls('mh_phone_' + code) || (mine().find(function (b) { return b.code === code; }) || {}).phone || '';
    var w = h('div', { class: 'in done' }); V.appendChild(w);
    if (!ph) { w.appendChild(h('div', { class: 'empty', text: 'Enter your mobile number to open this booking.' })); w.appendChild(h('a', { class: 'btn', href: '#/mine', text: 'Find my booking' })); return; }
    api('/api/booking/' + code + '?phone=' + encodeURIComponent(ph)).then(function (b) {
      var cancelled = b.status === 'cancelled';
      w.appendChild(h('div', { class: 'tick', style: cancelled ? 'background:linear-gradient(135deg,#e0728a,#c4384f)' : '', text: cancelled ? '✕' : '✓' }));
      w.appendChild(h('h1', { style: 'font-size:clamp(2rem,6vw,3.2rem);color:var(--plum)', text: cancelled ? 'Booking cancelled' : isNew ? 'You are booked!' : 'Your appointment' }));
      w.appendChild(h('p', { class: 'lead', style: 'margin:6px auto', text: cancelled ? 'We hope to see you another time.' : 'Show this code at the salon, or just give your name.' })); w.appendChild(h('div', { class: 'codebox', text: b.code }));
      var sum = h('div', { class: 'sum' }); b.items.forEach(function (i) { sum.appendChild(h('div', {}, [h('span', { text: i.name }), h('span', { text: inr(i.price) })])); }); if (b.discount) sum.appendChild(h('div', { class: 'dis' }, [h('span', { text: b.offer || 'Offer' }), h('span', { text: '− ' + inr(b.discount) })])); sum.appendChild(h('div', { class: 'tot' }, [h('span', { text: 'Total' }), h('span', { text: inr(b.total) })])); sum.appendChild(h('div', {}, [h('span', { text: 'Deposit paid' }), h('span', { text: inr(b.deposit) })])); sum.appendChild(h('div', {}, [h('span', { text: 'To pay at the salon' }), h('span', { text: inr(b.balance) })]));
      var t = h('div', { class: 'card ticket' }, [h('div', { class: 'status st-' + b.status, text: b.status === 'noshow' ? 'No-show' : b.status.charAt(0).toUpperCase() + b.status.slice(1) }), h('h3', { style: 'font-size:1.7rem;margin:8px 0 2px;color:var(--plum)', text: nice(b.date) + ' · ' + t12(b.start) }), h('div', { style: 'color:var(--mut)', text: 'With ' + b.stylist.emoji + ' ' + b.stylist.name + ' · about ' + b.mins + ' min · ' + b.name }), sum]); w.appendChild(t);
      var acts = h('div', { class: 'ctas', style: 'justify-content:center;margin-top:22px' }); w.appendChild(acts);
      if (!cancelled) { acts.appendChild(h('button', { class: 'btn ghost', type: 'button', text: '📅 Add to calendar', onclick: function () { var d = b.date.replace(/-/g, ''), f = function (m) { return String(Math.floor(m / 60)).padStart(2, '0') + String(m % 60).padStart(2, '0') + '00'; }; var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mirror Hour//EN', 'BEGIN:VEVENT', 'UID:' + b.code + '@mirrorhour', 'DTSTAMP:' + d + 'T000000Z', 'DTSTART;TZID=Asia/Kolkata:' + d + 'T' + f(b.start), 'DTEND;TZID=Asia/Kolkata:' + d + 'T' + f(b.start + b.mins), 'SUMMARY:Mirror Hour Salon: ' + b.items.map(function (i) { return i.name; }).join(' + '), 'LOCATION:' + S.salon.address, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'); var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'mirror-hour-' + b.code + '.ics'; document.body.appendChild(a); a.click(); a.remove(); } })); }
      if (b.canCancel) acts.appendChild(h('button', { class: 'btn ghost', type: 'button', text: 'Cancel booking', onclick: function () { if (!confirm('Cancel this appointment? Your deposit is refunded.')) return; api('/api/booking/' + code + '/cancel', 'POST', { phone: ph }).then(function () { toast('Cancelled. Deposit refunded.'); route(); }).catch(function (e) { toast(e.message); }); } }));
      else if (b.status === 'booked') w.appendChild(h('p', { style: 'color:var(--mut);margin-top:14px;font-size:.92rem', text: 'Cancellations close 2 hours before the appointment. Please call ' + S.salon.phone + '.' }));
      acts.appendChild(h('a', { class: 'btn', href: '#/book', text: 'Book another' }));
    }).catch(function (e) { w.appendChild(h('div', { class: 'empty', text: e.message })); w.appendChild(h('a', { class: 'btn', href: '#/mine', text: 'Try again' })); });
  }

  /* ---- install + service worker ---- */
  var ib = document.getElementById('inst'); addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); dp = e; ib.style.display = 'inline-flex'; }); ib.addEventListener('click', function () { if (dp) { dp.prompt(); dp = null; ib.style.display = 'none'; } });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
  route();
})();
