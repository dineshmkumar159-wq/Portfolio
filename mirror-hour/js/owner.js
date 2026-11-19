(function () {
  var h = UI.h, $ = UI.$, api = UI.api, inr = UI.inr, V = $('#view'), tab = 'over', period = 'week', cat = null, TODAY = null, bdate = null;
  var DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var iso = function (d) { return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); };
  var add = function (dk, n) { var a = dk.split('-').map(Number); return iso(new Date(Date.UTC(a[0], a[1] - 1, a[2] + n))); };
  var dow = function (dk) { var a = dk.split('-').map(Number); return new Date(Date.UTC(a[0], a[1] - 1, a[2])).getUTCDay(); };
  var t12 = function (m) { var hh = Math.floor(m / 60); return (hh % 12 || 12) + ':' + String(m % 60).padStart(2, '0') + (hh < 12 ? ' am' : ' pm'); };
  var hm = function (m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  var tmin = function (s) { var p = s.split(':'); return +p[0] * 60 + +p[1]; };
  UI.onAuthLost = showLogin; UI.pwa();
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#pw').value = ''; }
  $('#lf').addEventListener('submit', function (e) { e.preventDefault(); $('#lmsg').textContent = ''; api('/api/owner/login', 'POST', { password: $('#pw').value }).then(boot).catch(function (er) { $('#lmsg').textContent = er.message; }); });
  $('#out').addEventListener('click', function () { api('/api/logout', 'POST', {}).then(showLogin); });
  var TABS = [['over', '📊', 'Overview'], ['book', '📅', 'Bookings'], ['svc', '✂️', 'Services'], ['sty', '👩‍🎨', 'Stylists'], ['off', '🏷️', 'Offers'], ['cus', '👥', 'Customers'], ['set', '⚙️', 'Settings']];
  function boot() {
    return api('/api/catalog').then(function (c) { TODAY = iso(new Date(Date.now() + 330 * 6e4)); bdate = TODAY; $('#login').hidden = true; $('#app').hidden = false; build(); go(tab); }).catch(function () { showLogin(); });
  }
  function build() {
    var d = $('#dtabs'), b = $('#bnav'); d.innerHTML = ''; b.innerHTML = '';
    TABS.forEach(function (t) { d.appendChild(h('button', { class: 'tab', role: 'tab', 'data-tab': t[0], text: t[2], onclick: function () { go(t[0]); } })); b.appendChild(h('button', { 'data-tab': t[0], onclick: function () { go(t[0]); } }, [h('i', { text: t[1] }), t[2].slice(0, 8)])); });
  }
  function go(t) { tab = t; UI.$$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === t); }); V.innerHTML = ''; ({ over: over, book: book, svc: svc, sty: sty, off: off, cus: cus, set: sett })[t](); window.scrollTo(0, 0); }
  var pct = function (v) { return v == null ? '' : h('small', { class: v >= 0 ? 'up' : 'down', text: ' ' + (v >= 0 ? '▲' : '▼') + Math.abs(v) + '%' }); };
  function tile(v, l, ch) { return h('div', { class: 'tile' }, [h('b', {}, [String(v), ch ? pct(ch) : null]), h('span', { text: l })]); }
  function hbars(rows, color) { var mx = Math.max.apply(null, rows.map(function (r) { return r.v; })) || 1; return h('div', {}, rows.map(function (r) { return h('div', { class: 'hb' }, [h('span', { class: 'nm', text: r.n }), h('span', { class: 'tr' }, [h('span', { class: 'fl', style: 'display:block;height:100%;border-radius:99px;width:' + Math.max(2, r.v * 100 / mx) + '%;background:' + (r.c || color || 'var(--amber)') })]), h('span', { text: r.t })]); })); }
  function chart(series) {
    var W = 720, H = 220, pl = 46, pb = 26, pt = 8, n = series.length, mx = Math.max.apply(null, series.map(function (x) { return x.revenue; })) || 1, ns = 'http://www.w3.org/2000/svg';
    var raw = mx / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 2.5, 5, 10].map(function (k) { return k * mag; }).filter(function (s) { return s >= raw; })[0], top = Math.ceil(mx / step) * step, bw = (W - pl) / n;
    var svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Revenue chart'); svg.style.width = '100%';
    function el(t, a, txt) { var e = document.createElementNS(ns, t); for (var k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; svg.appendChild(e); }
    for (var v = 0; v <= top; v += step) { var y = H - pb - (v / top) * (H - pb - pt); el('line', { x1: pl, x2: W, y1: y, y2: y, stroke: 'rgba(255,255,255,.1)' }); el('text', { x: pl - 6, y: y + 4, 'text-anchor': 'end' }, v >= 1000 ? (v / 1000) + 'k' : v); }
    series.forEach(function (s, i) { var bh = (s.revenue / top) * (H - pb - pt), x = pl + i * bw + bw * .15; el('rect', { x: x, y: H - pb - bh, width: bw * .7, height: Math.max(bh, 0), rx: 4, fill: '#f2b48f' }); if (n <= 14 || i % Math.ceil(n / 10) === 0) el('text', { x: x + bw * .35, y: H - 8, 'text-anchor': 'middle' }, s.label); });
    return svg;
  }
  /* ---- overview ---- */
  function over() {
    var seg = h('div', { class: 'seg' }); [['day', 'Today'], ['week', '7 days'], ['month', '30 days'], ['year', '12 months']].forEach(function (p) { seg.appendChild(h('button', { type: 'button', 'aria-pressed': p[0] === period, text: p[1], onclick: function () { period = p[0]; go('over'); } })); });
    V.appendChild(h('div', { class: 'bar' }, [seg, h('a', { class: 'btn sm ghost', href: '/api/owner/bookings.csv', text: '⬇ Download all bookings (CSV)' })]));
    api('/api/owner/stats?period=' + period).then(function (s) {
      V.appendChild(h('div', { class: 'tiles' }, [tile(inr(s.revenue), 'revenue · ' + s.label, s.revChange), tile(s.bookings, 'services completed', s.bookChange), tile(inr(s.avg), 'average bill'), tile(s.lossRate + '%', 'cancelled or no-show (' + (s.cancelled + s.noshow) + ')'), tile(s.upcoming, 'upcoming bookings')]));
      V.appendChild(h('div', { class: 'card', style: 'margin-bottom:14px' }, [h('h2', { text: 'Revenue' }), chart(s.series)]));
      var g = h('div', { class: 'grid2' });
      g.appendChild(h('div', { class: 'card' }, [h('h2', { text: 'Revenue by stylist' }), hbars(s.byStylist.map(function (x) { return { n: x.emoji + ' ' + x.name, v: x.revenue, t: inr(x.revenue) + ' · ' + x.count }; }))]));
      g.appendChild(h('div', { class: 'card' }, [h('h2', { text: 'Top services' }), s.byService.length ? hbars(s.byService.map(function (x) { return { n: x.name, v: x.revenue, t: inr(x.revenue) + ' · ' + x.count }; }), 'var(--pink)') : h('div', { class: 'empty', text: 'Nothing completed yet.' })]));
      g.appendChild(h('div', { class: 'card' }, [h('h2', { text: 'Busiest hours' }), s.byHour.length ? hbars(s.byHour.map(function (x) { return { n: t12(x.h * 60), v: x.count, t: String(x.count), c: 'var(--cyan)' }; }), 'var(--cyan)') : h('div', { class: 'empty', text: 'No data.' })]));
      g.appendChild(h('div', { class: 'card' }, [h('h2', { text: 'Busiest days' }), hbars(s.byDow.map(function (c, i) { return { n: DN[i], v: c, t: String(c), c: 'var(--mint)' }; }))]));
      V.appendChild(g);
    }).catch(UI.fail);
  }
  /* ---- bookings ---- */
  var ST = { booked: 'Booked', arrived: 'Arrived', inservice: 'In service', done: 'Done', noshow: 'No-show', cancelled: 'Cancelled' };
  function book() {
    var lab = h('strong', { style: 'align-self:center' }); V.appendChild(h('div', { class: 'bar' }, [h('div', { class: 'seg' }, [h('button', { type: 'button', text: '←', 'aria-label': 'Previous day', onclick: function () { bdate = add(bdate, -1); go('book'); } }), h('button', { type: 'button', text: 'Today', onclick: function () { bdate = TODAY; go('book'); } }), h('button', { type: 'button', text: '→', 'aria-label': 'Next day', onclick: function () { bdate = add(bdate, 1); go('book'); } })]), lab]));
    var L = h('div'); V.appendChild(L);
    api('/api/owner/bookings?date=' + bdate).then(function (r) {
      lab.textContent = DN[dow(bdate)] + ' ' + bdate.split('-').reverse().join('/') + ' · ' + r.bookings.length + ' bookings';
      if (!r.bookings.length) L.appendChild(h('div', { class: 'empty', text: 'No bookings on this day.' }));
      r.bookings.forEach(function (b) {
        var acts = []; if (['booked', 'arrived'].indexOf(b.status) >= 0) acts.push(h('button', { class: 'btn sm red', type: 'button', text: 'Cancel', onclick: function () { var why = prompt('Reason for cancelling ' + b.name + '’s booking?'); if (!why) return; api('/api/owner/bookings/' + b.id, 'PATCH', { status: 'cancelled', reason: why }).then(function () { UI.toast('Cancelled'); go('book'); }).catch(UI.fail); } }));
        if (['booked', 'arrived'].indexOf(b.status) >= 0) acts.push(h('a', { class: 'btn sm ghost', target: '_blank', rel: 'noopener', href: 'https://wa.me/91' + b.phone + '?text=' + encodeURIComponent('Hi ' + b.name + ', this is Mirror Hour Salon. A quick reminder of your appointment on ' + b.date.split('-').reverse().join('/') + ' at ' + t12(b.start) + ' with ' + b.stylist.name + '. See you soon!'), text: 'WhatsApp reminder' }));
        L.appendChild(h('div', { class: 'slot ' + b.status }, [h('div', { class: 'row' }, [h('div', { class: 't', text: t12(b.start) + ' · ' + b.stylist.emoji + ' ' + b.stylist.name }), h('span', { class: 'pill ' + (b.status === 'done' ? 'ok' : b.status === 'cancelled' || b.status === 'noshow' ? 'out' : 'low'), text: ST[b.status] })]), h('div', {}, [h('strong', { text: b.name }), ' · ' + b.phone + ' · code ' + b.code]), h('div', { style: 'color:var(--mut)', text: b.items.map(function (i) { return i.name; }).join(' + ') + ' · ' + inr(b.total) + (b.deposit ? ' (₹' + b.deposit + ' deposit)' : '') + (b.reason ? ' · ' + b.reason : '') }), acts.length ? h('div', { class: 'acts', style: 'margin-top:8px' }, acts) : null]));
      });
    }).catch(UI.fail);
  }
  /* ---- services ---- */
  function svc() {
    var box = h('div'); V.appendChild(box);
    api('/api/owner/services').then(function (list) {
      var f = h('div', { class: 'card', style: 'margin-bottom:14px' }, [h('h2', { text: 'Add a service' }), h('div', { class: 'form' }, [fld('Name', 'sn'), fld('Category (Hair, Skin, Nails…)', 'sc'), fld('Price ₹', 'sp', 'number'), fld('Minutes', 'sm', 'number'), fld('Emoji', 'se')]), h('div', { id: 'smsg', class: 'msg' }), h('button', { class: 'btn', type: 'button', text: 'Add service', onclick: function () { api('/api/owner/services', 'POST', { name: $('#sn').value, cat: $('#sc').value || 'Hair', price: +$('#sp').value, mins: +$('#sm').value, emoji: $('#se').value }).then(function () { UI.toast('Service added'); go('svc'); }).catch(function (e) { $('#smsg').textContent = e.message; }); } })]);
      box.appendChild(f);
      var tb = h('tbody'); list.forEach(function (s) {
        var nm = h('input', { value: s.name }), pr = h('input', { type: 'number', value: s.price }), mi = h('input', { type: 'number', value: s.mins, step: 5 }), ac = h('input', { type: 'checkbox' }); ac.checked = !!s.active;
        var save = function () { api('/api/owner/services/' + s.id, 'PATCH', { name: nm.value, price: +pr.value, mins: +mi.value, active: ac.checked }).then(function () { UI.toast('Saved'); }).catch(UI.fail); };
        [nm, pr, mi].forEach(function (x) { x.addEventListener('change', save); }); ac.addEventListener('change', save);
        tb.appendChild(h('tr', {}, [h('td', {}, [h('span', { text: s.emoji + ' ' }), nm]), h('td', { text: s.cat }), h('td', {}, [pr]), h('td', {}, [mi]), h('td', {}, [h('label', { class: 'sw' }, [ac, h('span')])]), h('td', {}, [h('button', { class: 'btn sm red', type: 'button', text: 'Delete', onclick: function () { if (confirm('Delete ' + s.name + '? Past bookings keep their records.')) api('/api/owner/services/' + s.id, 'DELETE').then(function () { go('svc'); }).catch(UI.fail); } })])]));
      });
      box.appendChild(h('div', { class: 'tw' }, [h('table', {}, [h('thead', {}, [h('tr', {}, ['Service', 'Category', 'Price ₹', 'Minutes', 'Bookable', ''].map(function (x) { return h('th', { text: x }); }))]), tb])]));
    }).catch(UI.fail);
  }
  function fld(l, id, type, v) { return h('div', {}, [h('label', { for: id, text: l }), h('input', { id: id, type: type || 'text', value: v == null ? '' : v })]); }
  /* ---- stylists ---- */
  function sty() {
    Promise.all([api('/api/owner/stylists'), api('/api/owner/services')]).then(function (r) {
      var list = r[0], sv = r[1];
      V.appendChild(h('button', { class: 'btn', type: 'button', style: 'margin-bottom:14px', text: '+ Add a stylist', onclick: function () { edit(null); } }));
      list.forEach(function (s) {
        V.appendChild(h('div', { class: 'offer' + (s.active ? '' : ' off') }, [h('div', {}, [h('b', { text: s.emoji + ' ' + s.name + ' · ' + s.role }), h('span', { style: 'color:var(--mut)', text: s.days.map(function (d) { return DN[d]; }).join(', ') + ' · ' + t12(s.start) + ' to ' + t12(s.end) + ' · ' + s.skills.length + ' services' })]), h('div', { class: 'acts' }, [h('button', { class: 'btn sm', type: 'button', text: 'Edit', onclick: function () { edit(s); } }), h('button', { class: 'btn sm ghost', type: 'button', text: 'New PIN', onclick: function () { var p = prompt('New 4-digit PIN for ' + s.name); if (p) api('/api/owner/stylists/' + s.id + '/pin', 'PUT', { pin: p }).then(function () { UI.toast('PIN changed'); }).catch(UI.fail); } }), h('button', { class: 'btn sm ghost', type: 'button', text: s.active ? 'Pause' : 'Resume', onclick: function () { api('/api/owner/stylists/' + s.id, 'PATCH', { active: !s.active }).then(function () { go('sty'); }).catch(UI.fail); } }), h('button', { class: 'btn sm red', type: 'button', text: 'Remove', onclick: function () { if (confirm('Remove ' + s.name + '? Their past bookings stay in your reports.')) api('/api/owner/stylists/' + s.id, 'DELETE').then(function () { go('sty'); }).catch(UI.fail); } })])]));
      });
      function edit(s) {
        var days = h('div', { class: 'dows' }), sk = h('div', { class: 'dows' }), d = $('#dlg'), body = $('#dbody'), msg = h('div', { class: 'msg' });
        DN.forEach(function (n, i) { var c = h('input', { type: 'checkbox', value: i }); c.checked = s ? s.days.indexOf(i) >= 0 : i > 0 && i < 6; days.appendChild(h('label', {}, [c, ' ' + n])); });
        sv.forEach(function (x) { var c = h('input', { type: 'checkbox', value: x.id }); c.checked = s ? s.skills.indexOf(x.id) >= 0 : false; sk.appendChild(h('label', {}, [c, ' ' + x.name])); });
        body.innerHTML = ''; body.appendChild(h('h2', { text: s ? 'Edit ' + s.name : 'Add a stylist' }));
        body.appendChild(h('div', { class: 'form' }, [fld('Name', 'en', 'text', s && s.name), fld('Role', 'er', 'text', s && s.role), fld('Emoji', 'ee', 'text', s ? s.emoji : '✨'), fld('Starts', 'es', 'time', s ? hm(s.start) : '10:00'), fld('Ends', 'ee2', 'time', s ? hm(s.end) : '18:00')].concat(s ? [] : [fld('4-digit PIN', 'ep', 'text')])));
        body.appendChild(h('label', { text: 'Working days' })); body.appendChild(days); body.appendChild(h('label', { text: 'Services this stylist can do' })); body.appendChild(sk); body.appendChild(msg);
        body.appendChild(h('div', { class: 'acts', style: 'margin-top:12px' }, [h('button', { class: 'btn', type: 'button', text: 'Save', onclick: function () { var dd = UI.$$('input', days).filter(function (c) { return c.checked; }).map(function (c) { return +c.value; }), ss = UI.$$('input', sk).filter(function (c) { return c.checked; }).map(function (c) { return +c.value; }), b = { name: $('#en').value, role: $('#er').value, emoji: $('#ee').value, start: tmin($('#es').value), end: tmin($('#ee2').value), days: dd, skills: ss }; if (!s) b.pin = $('#ep').value; api(s ? '/api/owner/stylists/' + s.id : '/api/owner/stylists', s ? 'PATCH' : 'POST', b).then(function () { d.close(); UI.toast('Saved'); go('sty'); }).catch(function (e) { msg.textContent = e.message; }); } }), h('button', { class: 'btn ghost', type: 'button', text: 'Close', onclick: function () { d.close(); } })]));
        d.showModal();
      }
    }).catch(UI.fail);
  }
  /* ---- offers ---- */
  function off() {
    Promise.all([api('/api/owner/offers'), api('/api/owner/services')]).then(function (r) {
      var list = r[0], sv = r[1];
      V.appendChild(h('button', { class: 'btn', type: 'button', style: 'margin-bottom:14px', text: '+ New offer', onclick: function () { edit(null); } }));
      list.forEach(function (o) {
        var days = (o.days ? String(o.days).split(',').filter(Boolean).map(Number) : []), sn = o.service_id ? (sv.find(function (x) { return x.id === o.service_id; }) || {}).name : '';
        V.appendChild(h('div', { class: 'offer' + (o.active ? '' : ' off') }, [h('div', {}, [h('b', { text: o.title }), h('span', { style: 'color:var(--mut)', text: (o.kind === 'percent' ? o.value + '% off' : inr(o.value) + ' off') + (o.cap ? ' (max ' + inr(o.cap) + ')' : '') + (o.min ? ' · min ' + inr(o.min) : '') + (days.length ? ' · ' + days.map(function (d) { return DN[d]; }).join('/') : '') + (sn ? ' · only ' + sn : '') + (o.ends ? ' · until ' + o.ends : '') }), o.type === 'coupon' ? h('span', { class: 'code', text: o.code }) : h('span', { class: 'pill ok', text: 'Automatic' })]), h('div', { class: 'acts' }, [h('button', { class: 'btn sm', type: 'button', text: 'Edit', onclick: function () { edit(Object.assign({}, o, { days: days })); } }), h('button', { class: 'btn sm ghost', type: 'button', text: o.active ? 'Pause' : 'Resume', onclick: function () { api('/api/owner/offers/' + o.id, 'PATCH', { active: !o.active }).then(function () { go('off'); }).catch(UI.fail); } }), h('button', { class: 'btn sm red', type: 'button', text: 'Delete', onclick: function () { if (confirm('Delete this offer?')) api('/api/owner/offers/' + o.id, 'DELETE').then(function () { go('off'); }).catch(UI.fail); } })])]));
      });
      function edit(o) {
        var d = $('#dlg'), body = $('#dbody'), msg = h('div', { class: 'msg' }), days = h('div', { class: 'dows' }); DN.forEach(function (n, i) { var c = h('input', { type: 'checkbox', value: i }); c.checked = !!(o && o.days.indexOf(i) >= 0); days.appendChild(h('label', {}, [c, ' ' + n])); });
        var sel = h('select', { id: 'osv' }, [h('option', { value: 0, text: 'Any service' })].concat(sv.map(function (x) { return h('option', { value: x.id, text: x.name }); }))); if (o) sel.value = o.service_id;
        var tp = h('select', { id: 'oty' }, [h('option', { value: 'auto', text: 'Automatic (applies to everyone)' }), h('option', { value: 'coupon', text: 'Coupon code' })]); if (o) tp.value = o.type;
        var kd = h('select', { id: 'okd' }, [h('option', { value: 'percent', text: '% off' }), h('option', { value: 'flat', text: '₹ off' })]); if (o) kd.value = o.kind;
        body.innerHTML = ''; body.appendChild(h('h2', { text: o ? 'Edit offer' : 'New offer' }));
        body.appendChild(h('div', { class: 'form' }, [h('div', { class: 'full' }, [fld('Title customers will see', 'ot', 'text', o && o.title)]), h('div', {}, [h('label', { text: 'Type' }), tp]), fld('Code (coupons)', 'oc', 'text', o && o.code), h('div', {}, [h('label', { text: 'Discount' }), kd]), fld('Value', 'ov', 'number', o && o.value), fld('Maximum discount ₹ (0 = none)', 'ocap', 'number', o ? o.cap : 0), fld('Minimum bill ₹', 'omin', 'number', o ? o.min : 0), h('div', {}, [h('label', { text: 'Only for' }), sel]), fld('Ends on (optional)', 'oend', 'date', o && o.ends)]));
        body.appendChild(h('label', { text: 'Only on these days (leave all unticked for every day)' })); body.appendChild(days); body.appendChild(msg);
        body.appendChild(h('div', { class: 'acts', style: 'margin-top:12px' }, [h('button', { class: 'btn', type: 'button', text: 'Save offer', onclick: function () { var b = { title: $('#ot').value, type: $('#oty').value, code: $('#oc').value, kind: $('#okd').value, value: +$('#ov').value, cap: +$('#ocap').value, min: +$('#omin').value, service_id: +$('#osv').value, ends: $('#oend').value, days: UI.$$('input', days).filter(function (c) { return c.checked; }).map(function (c) { return +c.value; }) }; api(o ? '/api/owner/offers/' + o.id : '/api/owner/offers', o ? 'PATCH' : 'POST', b).then(function () { d.close(); UI.toast('Offer saved'); go('off'); }).catch(function (e) { msg.textContent = e.message; }); } }), h('button', { class: 'btn ghost', type: 'button', text: 'Close', onclick: function () { d.close(); } })]));
        d.showModal();
      }
    }).catch(UI.fail);
  }
  /* ---- customers ---- */
  function cus() {
    api('/api/owner/customers').then(function (l) {
      V.appendChild(h('p', { style: 'color:var(--mut)', text: 'Your 300 most recent customers. Tap WhatsApp to send a friendly nudge.' }));
      var tb = h('tbody'); l.forEach(function (c) { tb.appendChild(h('tr', {}, [h('td', { text: c.name }), h('td', { text: c.phone }), h('td', { text: String(c.visits) }), h('td', { text: inr(c.spent) }), h('td', { text: c.last || '-' }), h('td', { text: c.next || '-' }), h('td', {}, [h('a', { class: 'btn sm ghost', target: '_blank', rel: 'noopener', href: 'https://wa.me/91' + c.phone + '?text=' + encodeURIComponent('Hi ' + c.name.split(' ')[0] + ', it has been a while! Mirror Hour Salon has openings this week. Use code FIRST20 or GLOW200 for a treat. Book at our app any time.'), text: 'WhatsApp' })])])); });
      V.appendChild(h('div', { class: 'tw' }, [h('table', {}, [h('thead', {}, [h('tr', {}, ['Customer', 'Mobile', 'Visits', 'Spent', 'Last visit', 'Next booking', ''].map(function (x) { return h('th', { text: x }); }))]), tb])]));
    }).catch(UI.fail);
  }
  /* ---- settings ---- */
  function sett() {
    api('/api/catalog').then(function (c) {
      V.appendChild(h('div', { class: 'card', style: 'margin-bottom:14px' }, [h('h2', { text: 'Salon details' }), h('div', { class: 'form' }, [fld('Salon name', 'sa', 'text', c.salon.name), fld('Tagline', 'sb', 'text', c.salon.tagline), fld('Opening hours (text)', 'sc2', 'text', c.salon.hours), fld('Phone', 'sd', 'text', c.salon.phone), fld('Address', 'se2', 'text', c.salon.address), fld('Booking deposit ₹ (0 = none)', 'sf', 'number', c.deposit)]), h('div', { id: 'm1', class: 'msg' }), h('button', { class: 'btn', type: 'button', text: 'Save details', onclick: function () { api('/api/owner/settings', 'PUT', { name: $('#sa').value, tagline: $('#sb').value, hours: $('#sc2').value, phone: $('#sd').value, address: $('#se2').value, deposit: +$('#sf').value }).then(function () { UI.toast('Saved'); }).catch(function (e) { $('#m1').textContent = e.message; }); } })]));
      V.appendChild(h('div', { class: 'card' }, [h('h2', { text: 'Change owner password' }), h('div', { class: 'form' }, [fld('Current password', 'pc', 'password'), fld('New password (6+ characters)', 'pn', 'password')]), h('div', { id: 'm2', class: 'msg' }), h('button', { class: 'btn', type: 'button', text: 'Change password', onclick: function () { api('/api/owner/password', 'PUT', { current: $('#pc').value, next: $('#pn').value }).then(function () { UI.toast('Password changed'); $('#pc').value = ''; $('#pn').value = ''; $('#m2').textContent = ''; }).catch(function (e) { $('#m2').textContent = e.message; }); } })]));
    }).catch(UI.fail);
  }
  api('/api/owner/me').then(boot).catch(function () { });
})();
