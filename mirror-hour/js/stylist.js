(function () {
  var h = UI.h, $ = UI.$, api = UI.api, inr = UI.inr, ME = null, day = null, TODAY = null, services = [], timer = null, lastCount = -1, tab = 'day';
  var NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var ist = function () { var d = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 6e4); return d; };
  var add = function (dk, n) { var a = dk.split('-').map(Number), d = new Date(Date.UTC(a[0], a[1] - 1, a[2] + n)); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); };
  var dow = function (dk) { var a = dk.split('-').map(Number); return new Date(Date.UTC(a[0], a[1] - 1, a[2])).getUTCDay(); };
  var pretty = function (dk) { var a = dk.split('-').map(Number); return NAMES[dow(dk)] + ' ' + a[2] + '/' + a[1]; };
  var t12 = function (m) { var hh = Math.floor(m / 60), mm = m % 60; return (hh % 12 || 12) + ':' + String(mm).padStart(2, '0') + (hh < 12 ? ' am' : ' pm'); };
  var tmin = function (s) { var p = s.split(':'); return +p[0] * 60 + +p[1]; };
  UI.onAuthLost = function () { showLogin(); };
  UI.pwa();

  /* ---- login ---- */
  api('/api/stylists').then(function (l) { var s = $('#who'); l.forEach(function (x) { s.appendChild(h('option', { value: x.id, text: x.emoji + ' ' + x.name + ' · ' + x.role })); }); }).catch(UI.fail);
  $('#lf').addEventListener('submit', function (e) {
    e.preventDefault(); $('#lmsg').textContent = '';
    api('/api/stylist/login', 'POST', { stylist: +$('#who').value, pin: $('#pin').value }).then(boot).catch(function (er) { $('#lmsg').textContent = er.message; $('#pin').value = ''; });
  });
  function showLogin() { clearInterval(timer); $('#app').hidden = true; $('#login').hidden = false; $('#pin').value = ''; }
  $('#out').addEventListener('click', function () { api('/api/logout', 'POST', {}).then(showLogin); });
  function boot() {
    return Promise.all([api('/api/me'), api('/api/catalog')]).then(function (r) {
      ME = r[0]; services = r[1].services; TODAY = iso(ist()); day = TODAY;
      $('#login').hidden = true; $('#app').hidden = false; $('#me-e').textContent = ME.emoji; $('#me-n').textContent = ME.name; $('#me-r').textContent = ME.role;
      buildTabs(); setTab('day'); clearInterval(timer); timer = setInterval(function () { if (tab === 'day' && !document.hidden) loadDay(true); }, 8000);
    }).catch(function (e) { if (e.message !== 'login') showLogin(); });
  }

  /* ---- tabs ---- */
  var TABS = [['day', '📅', 'My day'], ['walk', '➕', 'Walk-in'], ['off', '🌴', 'Time off'], ['week', '🗓️', 'Week']];
  function buildTabs() {
    var d = $('#dtabs'), b = $('#bnav'); d.innerHTML = ''; b.innerHTML = '';
    TABS.forEach(function (t) {
      d.appendChild(h('button', { class: 'tab', role: 'tab', 'data-tab': t[0], text: t[2], onclick: function () { setTab(t[0]); } }));
      b.appendChild(h('button', { 'data-tab': t[0], onclick: function () { setTab(t[0]); } }, [h('i', { text: t[1] }), t[2]]));
    });
  }
  function setTab(t) {
    tab = t; ['day', 'walk', 'off', 'week'].forEach(function (x) { $('#p-' + x).hidden = x !== t; });
    UI.$$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === t); });
    if (t === 'day') loadDay(); if (t === 'walk') buildWalk(); if (t === 'off') loadOff(); if (t === 'week') loadWeek();
  }

  /* ---- my day ---- */
  $('#dprev').addEventListener('click', function () { day = add(day, -1); loadDay(); });
  $('#dnext').addEventListener('click', function () { day = add(day, 1); loadDay(); });
  $('#dtoday').addEventListener('click', function () { day = TODAY; loadDay(); });
  var STAT = { booked: 'Booked', arrived: 'Arrived', inservice: 'In service', done: 'Done', noshow: 'No-show', cancelled: 'Cancelled' };
  function loadDay(quiet) {
    if (!quiet) api('/api/me/stats').then(function (s) {
      var t = $('#tiles'); t.innerHTML = '';
      [[s.today.left, 'clients still to come'], [s.today.done, 'done today'], [inr(s.today.revenue), 'earned today'], [inr(s.month.revenue), 'last 30 days (' + s.month.done + ' clients)']].forEach(function (x) { t.appendChild(h('div', { class: 'tile' }, [h('b', { text: String(x[0]) }), h('span', { text: x[1] })])); });
    }).catch(UI.fail);
    api('/api/me/day?date=' + day).then(function (r) {
      $('#dlabel').textContent = (day === TODAY ? 'Today · ' : '') + pretty(day) + (ME.days.indexOf(dow(day)) < 0 ? ' · your day off' : '');
      var L = $('#dlist'); L.innerHTML = '';
      var live = r.bookings.filter(function (b) { return b.status !== 'cancelled'; }).length; if (lastCount >= 0 && day === TODAY && live > lastCount) UI.toast('New booking just came in'); if (day === TODAY) lastCount = live;
      r.timeoff.forEach(function (o) { L.appendChild(h('div', { class: 'slot noshow' }, [h('div', { class: 't', text: o.end - o.start >= 1440 ? 'Whole day off' : t12(o.start) + ' to ' + t12(o.end) }), h('div', { text: '🌴 Time off' + (o.note ? ' · ' + o.note : '') })])); });
      if (!r.bookings.length && !r.timeoff.length) L.appendChild(h('div', { class: 'empty', text: 'No bookings on this day.' }));
      r.bookings.forEach(function (b) { L.appendChild(card(b)); });
    }).catch(UI.fail);
  }
  function card(b) {
    var acts = [];
    function go(st, label, cls) { acts.push(h('button', { class: 'btn sm ' + (cls || ''), type: 'button', text: label, onclick: function () { api('/api/me/booking/' + b.id, 'PATCH', { status: st }).then(function () { loadDay(); }).catch(function (e) { UI.fail(e); loadDay(); }); } })); }
    if (b.status === 'booked') { go('arrived', 'Arrived'); go('inservice', 'Start service', 'pink'); go('noshow', 'No-show', 'ghost'); }
    if (b.status === 'arrived') { go('inservice', 'Start service', 'pink'); go('noshow', 'No-show', 'ghost'); }
    if (b.status === 'inservice') go('done', 'Mark done ✓', 'pink');
    return h('div', { class: 'slot ' + b.status }, [
      h('div', { class: 'row' }, [h('div', { class: 't', text: t12(b.start) + ' to ' + t12(b.start + b.mins) }), h('span', { class: 'pill ' + (b.status === 'done' ? 'ok' : b.status === 'cancelled' || b.status === 'noshow' ? 'out' : 'low'), text: STAT[b.status] })]),
      h('div', {}, [h('strong', { text: b.name }), ' · ', h('a', { href: 'tel:+91' + b.phone, text: b.phone })]),
      h('ul', {}, b.items.map(function (i) { return h('li', { text: i.name + ' (' + i.mins + ' min)' }); })),
      h('div', { style: 'color:var(--mut);font-size:.85rem', text: 'Bill ' + inr(b.total) + (b.deposit ? ' · ₹' + b.deposit + ' paid online' : '') + (b.source === 'walkin' ? ' · walk-in' : '') + (b.note ? ' · Note: ' + b.note : '') }),
      acts.length ? h('div', { class: 'acts', style: 'margin-top:8px' }, acts) : null]);
  }

  /* ---- walk-in ---- */
  var picked = {};
  function buildWalk() {
    var box = $('#wsv'); box.innerHTML = ''; picked = {};
    services.filter(function (s) { return ME.skills.indexOf(s.id) >= 0; }).forEach(function (s) {
      var c = h('input', { type: 'checkbox', onchange: function () { if (c.checked) picked[s.id] = 1; else delete picked[s.id]; loadTimes(); } });
      box.appendChild(h('label', {}, [c, ' ' + s.name + ' (' + s.mins + ' min)']));
    });
    $('#wmsg').textContent = ''; loadTimes();
  }
  function loadTimes() {
    var ids = Object.keys(picked), sel = $('#wt'); sel.innerHTML = '';
    if (!ids.length) { sel.appendChild(h('option', { value: '', text: 'Pick services first' })); return; }
    api('/api/slots?date=' + TODAY + '&services=' + ids.join(',') + '&stylist=' + ME.id).then(function (r) {
      var nowm = ist().getHours() * 60 + ist().getMinutes(), any = false;
      r.slots.forEach(function (s) { if (s.min >= nowm - 5 || true) { any = true; sel.appendChild(h('option', { value: s.t, text: t12(s.min) })); } });
      if (!any) sel.appendChild(h('option', { value: '', text: 'No free time left today' }));
    }).catch(function (e) { sel.appendChild(h('option', { value: '', text: e.message })); });
  }
  $('#wgo').addEventListener('click', function () {
    var ids = Object.keys(picked).map(Number); $('#wmsg').textContent = '';
    api('/api/me/walkin', 'POST', { name: $('#wn').value, phone: $('#wp').value, services: ids, date: TODAY, time: $('#wt').value }).then(function () { UI.toast('Walk-in added'); $('#wn').value = ''; $('#wp').value = ''; setTab('day'); }).catch(function (e) { $('#wmsg').textContent = e.message; loadTimes(); });
  });

  /* ---- time off ---- */
  $('#oa').addEventListener('change', function () { var p = $('#oa').value === '0'; $('#otw').hidden = !p; $('#otw2').hidden = !p; });
  function loadOff() {
    $('#od').value = $('#od').value || add(TODAY, 1); $('#od').min = TODAY; $('#omsg').textContent = '';
    var L = $('#olist'); L.innerHTML = ''; var n = 0, jobs = [];
    for (var i = 0; i < 15; i++) (function (dk) { jobs.push(api('/api/me/day?date=' + dk).then(function (r) { return r.timeoff.map(function (o) { return { o: o, dk: dk }; }); })); })(add(TODAY, i));
    Promise.all(jobs).then(function (rs) {
      rs.forEach(function (list) { list.forEach(function (x) { n++; L.appendChild(h('div', { class: 'offer' }, [h('div', {}, [h('b', { text: pretty(x.dk) + (x.o.end - x.o.start >= 1440 ? ' · whole day' : ' · ' + t12(x.o.start) + ' to ' + t12(x.o.end)) }), h('span', { style: 'color:var(--mut)', text: x.o.note || '' })]), h('button', { class: 'btn sm red', type: 'button', text: 'Remove', onclick: function () { api('/api/me/timeoff/' + x.o.id, 'DELETE').then(loadOff).catch(UI.fail); } })])); }); });
      if (!n) L.appendChild(h('div', { class: 'empty', text: 'No time off booked.' }));
    }).catch(UI.fail);
  }
  $('#ogo').addEventListener('click', function () {
    var all = $('#oa').value === '1', body = { date: $('#od').value, allday: all, note: $('#on').value }; if (!all) { body.start = tmin($('#os').value); body.end = tmin($('#oe').value); }
    api('/api/me/timeoff', 'POST', body).then(function () { UI.toast('Time blocked'); $('#on').value = ''; loadOff(); }).catch(function (e) { $('#omsg').textContent = e.message; });
  });

  /* ---- week ---- */
  function loadWeek() {
    api('/api/me/week').then(function (r) { var w = $('#wk'); w.innerHTML = ''; r.days.forEach(function (d) { w.appendChild(h('button', { class: 'tile', style: 'text-align:left;cursor:pointer;' + (d.working ? '' : 'opacity:.55'), onclick: function () { day = d.date; setTab('day'); } }, [h('b', { text: d.working ? d.count + (d.count === 1 ? ' client' : ' clients') : 'Off' }), h('span', { text: pretty(d.date) + (d.working && d.mins ? ' · ' + Math.round(d.mins / 60 * 10) / 10 + ' h booked' : '') })])); }); }).catch(UI.fail);
  }
  api('/api/me').then(boot).catch(function () { });
})();
