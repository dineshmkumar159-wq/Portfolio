/* Mirror Hour Salon: all the business rules in one file.
   The same code runs in the Node server (SQLite) and in the portfolio demo (browser storage). Money is whole rupees. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.SalonCore = f(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TZ = 330, STEP = 15, LEAD = 60, DAYS_AHEAD = 14, CANCEL_HRS = 2;
  const SCHEMA = {
    services: ['name', 'cat', 'descr', 'price', 'mins', 'emoji', 'active', 'deleted'],
    stylists: ['name', 'role', 'emoji', 'color', 'bio', 'pin', 'days', 'start', 'end', 'skills', 'active', 'deleted'],
    bookings: ['code', 'created', 'name', 'phone', 'stylist_id', 'date', 'start', 'mins', 'status', 'subtotal', 'discount', 'total', 'deposit', 'method', 'coupon', 'offer_title', 'reason', 'note', 'source'],
    booking_items: ['booking_id', 'service_id', 'name', 'price', 'mins'],
    offers: ['title', 'type', 'code', 'kind', 'value', 'cap', 'min', 'days', 'service_id', 'active', 'ends'],
    timeoff: ['stylist_id', 'date', 'start', 'end', 'note'],
    settings: ['v'],
  };
  const TEXT_ID = { settings: true };
  const pad = n => String(n).padStart(2, '0');
  const parts = ms => { const d = new Date(ms + TZ * 60000); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), dow: d.getUTCDay() }; };
  const dayKey = ms => { const p = parts(ms); return p.y + '-' + pad(p.m + 1) + '-' + pad(p.d); };
  const dkMs = dk => { const a = dk.split('-').map(Number); return Date.UTC(a[0], a[1] - 1, a[2]) - TZ * 60000; };
  const dkDow = dk => { const a = dk.split('-').map(Number); return new Date(Date.UTC(a[0], a[1] - 1, a[2])).getUTCDay(); };
  const addDays = (dk, n) => dayKey(dkMs(dk) + n * 864e5 + 12 * 36e5);
  const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && dayKey(dkMs(s) + 12 * 36e5) === s;
  const hhmm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const csvList = s => (s === '' || s == null) ? [] : String(s).split(',').map(Number);
  const nowMin = ms => { const p = parts(ms); return p.h * 60 + p.mi; };
  const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const num = v => (typeof v === 'number' && isFinite(v)) ? v : Number(v);
  const luhn = d => { let s = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; } return s % 10 === 0; };
  const cleanPhone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 12 && d.slice(0, 2) === '91') d = d.slice(2); if (d.length === 11 && d[0] === '0') d = d.slice(1); return /^[6-9]\d{9}$/.test(d) ? d : null; };
  const ERR = (status, error) => { const e = new Error(error); e.status = status; return e; };
  const OKST = { booked: ['arrived', 'inservice', 'done', 'noshow', 'cancelled'], arrived: ['inservice', 'done', 'noshow', 'cancelled'], inservice: ['done'] };

  function createApp(store, env) {
    const sessions = {}, fails = {};
    const setting = k => { const r = store.get('settings', k); return r ? r.v : ''; };
    const setSet = (k, v) => { if (store.get('settings', k)) store.update('settings', k, { v: String(v) }); else store.insert('settings', { id: k, v: String(v) }); };
    const svcPub = s => ({ id: s.id, name: s.name, cat: s.cat, descr: s.descr, price: s.price, mins: s.mins, emoji: s.emoji, active: s.active });
    const styPub = s => ({ id: s.id, name: s.name, role: s.role, emoji: s.emoji, color: s.color, bio: s.bio, days: csvList(s.days), start: s.start, end: s.end, skills: csvList(s.skills), active: s.active });

    /* ---------- seed ---------- */
    function seed(S, opts) {
      opts = opts || {};
      if (store.all('stylists').length) return false;
      store.tx(() => {
        const sal = S.salon; ['name', 'tagline', 'hours', 'phone', 'address'].forEach(k => setSet('salon_' + k, sal[k])); setSet('deposit', sal.deposit);
        S.services.forEach(s => store.insert('services', { id: s.id, name: s.name, cat: s.cat, descr: s.descr, price: s.price, mins: s.mins, emoji: s.emoji, active: 1, deleted: 0 }));
        S.stylists.forEach(s => store.insert('stylists', { id: s.id, name: s.name, role: s.role, emoji: s.emoji, color: s.color, bio: s.bio, pin: env.hashPin(s.pin), days: s.days.join(','), start: s.start, end: s.end, skills: s.skills.join(','), active: 1, deleted: 0 }));
        S.offers.forEach(o => store.insert('offers', { title: o.title, type: o.type, code: o.code || null, kind: o.kind, value: o.value, cap: o.cap || 0, min: o.min || 0, days: (o.days || []).join(','), service_id: o.service_id || 0, active: 1, ends: null }));
        setSet('owner_pass', env.hashPin(opts.ownerPassword || S.ownerPassword));
        if (opts.history) history(opts.history);
      });
      return true;
    }
    /* A believable year of bookings: busier on weekends, filled in order through each stylist's day. */
    function history(days) {
      let s = 20260101; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }, pick = a => a[Math.floor(rnd() * a.length)];
      const FN = ['Priya', 'Divya', 'Anjali', 'Kavya', 'Sneha', 'Ritu', 'Nisha', 'Pooja', 'Swathi', 'Harini', 'Meera', 'Deepa', 'Lavanya', 'Keerthi', 'Janani', 'Aarthi', 'Shalini', 'Gayathri', 'Rohit', 'Arun', 'Vikram', 'Suresh', 'Naveen', 'Manoj', 'Bala', 'Sathish', 'Ajay', 'Ramesh'];
      const LN = ['K', 'R', 'S', 'M', 'V', 'N', 'P', 'T'];
      const cust = []; for (let i = 0; i < 700; i++) cust.push({ name: pick(FN) + ' ' + pick(LN), phone: String(pick([6, 7, 8, 9]) * 1e9 + Math.floor(rnd() * 999999999)).slice(0, 10) });
      const svc = store.all('services'), sty = store.all('stylists'), now = env.now(), today = dayKey(now), nm = nowMin(now), W = [.8, .55, .7, .8, .95, 1.35, 1.5]; // Sun..Sat
      let seq = 0;
      for (let off = -days; off <= 6; off++) {
        const dk = addDays(today, off), dow = dkDow(dk), future = off > 0 || (off === 0);
        sty.forEach(st => {
          if (csvList(st.days).indexOf(dow) < 0) return;
          const skills = csvList(st.skills).map(id => svc.find(x => x.id === id)).filter(Boolean); if (!skills.length) return;
          const fill = (off > 0 ? Math.max(.1, .36 - off * .05) : (off < -3 ? .62 : .75)) * W[dow] * (.75 + rnd() * .5);
          let t = st.start + Math.floor(rnd() * 3) * STEP;
          while (t < st.end - 30) {
            if (rnd() > fill) { t += STEP * (1 + Math.floor(rnd() * 3)); continue; }
            const n = rnd() < .22 ? 2 : 1, chosen = []; for (let k = 0; k < n; k++) { const c = pick(skills); if (chosen.indexOf(c) < 0) chosen.push(c); }
            const mins = chosen.reduce((a, c) => a + c.mins, 0); if (t + mins > st.end) break;
            const sub = chosen.reduce((a, c) => a + c.price, 0), disc = rnd() < .18 ? Math.round(sub * .15) : 0, c = pick(cust);
            let status = 'booked';
            if (off < 0) status = rnd() < .06 ? 'cancelled' : rnd() < .05 ? 'noshow' : 'done';
            else if (off === 0) status = t + mins <= nm ? 'done' : t <= nm ? 'inservice' : 'booked';
            const created = new Date(dkMs(dk) + (t - 60 * (2 + Math.floor(rnd() * 70))) * 6e4).toISOString();
            const b = store.insert('bookings', { code: 'H' + String(++seq).padStart(5, '0'), created, name: c.name, phone: c.phone, stylist_id: st.id, date: dk, start: t, mins, status, subtotal: sub, discount: disc, total: sub - disc, deposit: off < 0 && status === 'cancelled' ? 0 : 100, method: pick(['upi', 'upi', 'card']), coupon: null, offer_title: disc ? 'Weekday treat' : null, reason: status === 'cancelled' ? 'Customer cancelled' : null, note: '', source: rnd() < .15 ? 'walkin' : 'online' });
            chosen.forEach(c2 => store.insert('booking_items', { booking_id: b.id, service_id: c2.id, name: c2.name, price: c2.price, mins: c2.mins }));
            t += mins + STEP * Math.floor(rnd() * 4);
          }
        });
      }
    }
    const setOwnerPassword = pw => setSet('owner_pass', env.hashPin(pw));

    /* ---------- availability ---------- */
    function totalMins(items) { return items.reduce((a, s) => a + s.mins, 0); }
    function busy(stId, dk) {
      const out = []; store.where('bookings', { stylist_id: stId, date: dk }).forEach(b => { if (b.status !== 'cancelled') out.push([b.start, b.start + b.mins]); });
      store.where('timeoff', { stylist_id: stId, date: dk }).forEach(o => out.push([o.start, o.end]));
      return out;
    }
    function freeStarts(st, dk, mins, lead, ignoreBooking) {
      const dow = dkDow(dk), res = [];
      if (!st.active || st.deleted || csvList(st.days).indexOf(dow) < 0) return res;
      const now = env.now(), today = dayKey(now), minStart = dk === today ? nowMin(now) + lead : (dk < today ? 1e9 : 0);
      const b = busy(st.id, dk).filter(x => !(ignoreBooking && x[2] === ignoreBooking));
      for (let t = st.start; t + mins <= st.end; t += STEP) { if (t < minStart) continue; if (b.some(x => t < x[1] && t + mins > x[0])) continue; res.push(t); }
      return res;
    }
    function pickServices(ids) {
      if (!Array.isArray(ids) || !ids.length || ids.length > 6) throw ERR(400, 'Choose between 1 and 6 services.');
      const seen = {}, out = []; ids.forEach(i => { i = +i; if (seen[i]) return; seen[i] = 1; const s = store.get('services', i); if (!s || !s.active || s.deleted) throw ERR(400, 'One of those services is not available.'); out.push(s); });
      return out;
    }
    function eligible(items, stId) {
      const need = items.map(s => s.id);
      return store.all('stylists').filter(st => st.active && !st.deleted && (!stId || st.id === stId) && need.every(id => csvList(st.skills).indexOf(id) >= 0));
    }
    function slots(q) {
      const dk = str(q.date, 10); if (!isDay(dk)) throw ERR(400, 'Choose a date.');
      const today = dayKey(env.now()); if (dk < today || dk > addDays(today, DAYS_AHEAD)) throw ERR(400, 'Choose a day in the next two weeks.');
      const items = pickServices(String(q.services || '').split(',').filter(Boolean).map(Number)), mins = totalMins(items);
      const stId = q.stylist && q.stylist !== 'any' ? +q.stylist : 0, sts = eligible(items, stId);
      const map = {}; sts.forEach(st => freeStarts(st, dk, mins, LEAD).forEach(t => { (map[t] = map[t] || []).push(st.id); }));
      return { date: dk, mins, stylists: sts.map(s => s.id), slots: Object.keys(map).map(Number).sort((a, b) => a - b).map(t => ({ min: t, t: hhmm(t), stylists: map[t] })) };
    }

    /* ---------- offers and prices ---------- */
    const offerLive = o => o.active === 1 && (!o.ends || o.ends >= dayKey(env.now()));
    function quote(b) {
      const items = pickServices(b.services), dk = isDay(str(b.date, 10)) ? str(b.date, 10) : dayKey(env.now()), dow = dkDow(dk);
      const subtotal = items.reduce((a, s) => a + s.price, 0), code = str(b.coupon, 20).toUpperCase(); let msg = '', best = null;
      store.all('offers').filter(offerLive).forEach(o => {
        if (o.type === 'coupon' && o.code !== code) return;
        const dys = csvList(o.days); if (dys.length && dys.indexOf(dow) < 0) { if (o.type === 'coupon') msg = 'That code is not valid on that day.'; return; }
        const base = o.service_id ? items.filter(s => s.id === o.service_id).reduce((a, s) => a + s.price, 0) : subtotal;
        if (o.service_id && !base) { if (o.type === 'coupon') msg = 'That code needs ' + ((store.get('services', o.service_id) || {}).name || 'a specific service') + ' in your booking.'; return; }
        if (subtotal < o.min) { if (o.type === 'coupon') msg = 'That code needs a total of ₹' + o.min + ' or more.'; return; }
        let d = o.kind === 'percent' ? Math.round(base * o.value / 100) : Math.min(o.value, base); if (o.cap > 0) d = Math.min(d, o.cap);
        if (d > 0 && (!best || d > best.d)) best = { d, o };
      });
      if (code && !best && !msg) msg = store.all('offers').some(o => o.type === 'coupon' && o.code === code && offerLive(o)) ? 'That code does not apply to this booking.' : 'That code is not valid.';
      const discount = best ? best.d : 0, total = subtotal - discount, dep = Math.min(+setting('deposit') || 0, total);
      return { items: items.map(svcPub), mins: totalMins(items), subtotal, discount, total, deposit: dep, balance: total - dep, offer: best ? best.o.title : null, coupon: best && best.o.type === 'coupon' ? best.o.code : null, message: msg };
    }

    /* ---------- test payment ---------- */
    function payTest(p, amount) {
      if (amount <= 0) return { method: 'none' };
      if (!p || typeof p !== 'object') throw ERR(400, 'Choose how to pay the deposit.');
      if (p.type === 'upi') {
        const u = str(p.upi, 60); if (!/^[\w.\-]{3,}@[a-z]{2,}$/i.test(u)) throw ERR(400, 'Enter a valid UPI ID like name@okbank.');
        if (/@fail$/i.test(u)) throw ERR(402, 'Payment declined by the test bank. Try another UPI ID.'); return { method: 'upi' };
      }
      if (p.type === 'card') {
        const d = String(p.number || '').replace(/\D/g, ''); if (d.length < 13 || d.length > 19 || !luhn(d)) throw ERR(400, 'That card number is not valid.');
        const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(str(p.exp, 7)); if (!m || +m[1] < 1 || +m[1] > 12) throw ERR(400, 'Enter the expiry as MM/YY.');
        const now = parts(env.now()); if (2000 + +m[2] < now.y || (2000 + +m[2] === now.y && +m[1] < now.m + 1)) throw ERR(400, 'That card has expired.');
        if (!/^\d{3,4}$/.test(str(p.cvv, 4))) throw ERR(400, 'Enter the 3 or 4 digit CVV.');
        if (d === '4000000000000002') throw ERR(402, 'Card declined by the test bank.'); return { method: 'card' };
      }
      throw ERR(400, 'Choose UPI or card.');
    }

    /* ---------- bookings ---------- */
    function codeUnique() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for (let t = 0; t < 50; t++) { let c = ''; for (let i = 0; i < 6; i++) c += A[Math.floor(env.rand() * A.length)]; if (!store.where('bookings', { code: c }).length) return c; } return 'X' + Date.now().toString(36).slice(-5).toUpperCase(); }
    function view(b, withPhone) {
      const sty = store.get('stylists', b.stylist_id) || {}, items = store.where('booking_items', { booking_id: b.id });
      const startMs = dkMs(b.date) + b.start * 6e4;
      return { id: b.id, code: b.code, name: b.name, phone: withPhone ? b.phone : undefined, date: b.date, start: b.start, time: hhmm(b.start), end: hhmm(b.start + b.mins), mins: b.mins, status: b.status, stylist: { id: sty.id, name: sty.name, emoji: sty.emoji, color: sty.color }, items: items.map(i => ({ id: i.service_id, name: i.name, price: i.price, mins: i.mins })), subtotal: b.subtotal, discount: b.discount, total: b.total, deposit: b.deposit, balance: b.total - b.deposit, coupon: b.coupon, offer: b.offer_title, note: b.note, source: b.source, reason: b.reason, created: b.created, canCancel: b.status === 'booked' && startMs - env.now() >= CANCEL_HRS * 36e5 };
    }
    function create(b, walkin, forStylist) {
      const items = pickServices(b.services), dk = str(b.date, 10), name = str(b.name, 60), phone = cleanPhone(b.phone);
      if (!isDay(dk)) throw ERR(400, 'Choose a date.'); const today = dayKey(env.now()); if (dk < today || dk > addDays(today, DAYS_AHEAD)) throw ERR(400, 'Choose a day in the next two weeks.');
      if (name.length < 2) throw ERR(400, 'Enter your name.'); if (!phone) throw ERR(400, 'Enter a 10-digit mobile number.');
      const t = typeof b.time === 'string' && /^\d{1,2}:\d{2}$/.test(b.time) ? +b.time.split(':')[0] * 60 + +b.time.split(':')[1] : num(b.time);
      if (!Number.isInteger(t) || t % STEP) throw ERR(400, 'Choose a time.');
      const mins = totalMins(items), lead = walkin ? 0 : LEAD; let stId = b.stylist && b.stylist !== 'any' ? +b.stylist : 0; if (forStylist) stId = forStylist;
      const q = quote({ services: items.map(s => s.id), coupon: walkin ? '' : b.coupon, date: dk }), pay = walkin ? { method: 'none' } : payTest(b.pay, q.deposit);
      return store.tx(() => {
        const cands = eligible(items, stId).filter(st => freeStarts(st, dk, mins, lead).indexOf(t) >= 0);
        if (!cands.length) throw ERR(409, 'That time was just taken. Please pick another slot.');
        cands.sort((a, c) => busy(a.id, dk).reduce((x, y) => x + y[1] - y[0], 0) - busy(c.id, dk).reduce((x, y) => x + y[1] - y[0], 0));
        const st = cands[0], row = store.insert('bookings', { code: codeUnique(), created: new Date(env.now()).toISOString(), name, phone, stylist_id: st.id, date: dk, start: t, mins, status: walkin ? 'arrived' : 'booked', subtotal: q.subtotal, discount: walkin ? 0 : q.discount, total: walkin ? q.subtotal : q.total, deposit: walkin ? 0 : q.deposit, method: pay.method, coupon: q.coupon, offer_title: walkin ? null : q.offer, reason: null, note: str(b.note, 200), source: walkin ? 'walkin' : 'online' });
        items.forEach(s => store.insert('booking_items', { booking_id: row.id, service_id: s.id, name: s.name, price: s.price, mins: s.mins }));
        return view(row, true);
      });
    }
    function setStatus(b, to, who, reason) {
      const ok = OKST[b.status] || []; if (ok.indexOf(to) < 0) throw ERR(409, 'This booking is already ' + b.status + '.');
      if (to === 'cancelled') { if (who !== 'owner') throw ERR(403, 'Only the owner can cancel here.'); if (!str(reason, 120)) throw ERR(400, 'Please give a reason.'); }
      store.update('bookings', b.id, to === 'cancelled' ? { status: to, reason: str(reason, 120), deposit: 0 } : { status: to });
    }

    /* ---------- stats ---------- */
    function range(period) {
      const now = env.now(), today = dayKey(now), p = parts(now);
      if (period === 'day') return { from: today, to: today, prevFrom: addDays(today, -1), prevTo: addDays(today, -1), kind: 'hour', label: 'Today' };
      if (period === 'week') return { from: addDays(today, -6), to: today, prevFrom: addDays(today, -13), prevTo: addDays(today, -7), kind: 'day', label: 'Last 7 days' };
      if (period === 'year') { const a = p.m - 11, y0 = p.y + Math.floor(a / 12), m0 = ((a % 12) + 12) % 12; return { from: y0 + '-' + pad(m0 + 1) + '-01', to: today, prevFrom: (y0 - 1) + '-' + pad(m0 + 1) + '-01', prevTo: addDays(y0 + '-' + pad(m0 + 1) + '-01', -1), kind: 'month', label: 'Last 12 months' }; }
      return { from: addDays(today, -29), to: today, prevFrom: addDays(today, -59), prevTo: addDays(today, -30), kind: 'day', label: 'Last 30 days' };
    }
    function sum(bs) { let rev = 0, n = 0; bs.forEach(b => { if (b.status === 'done') { rev += b.total; n++; } }); return { rev, n }; }
    function stats(period) {
      const R = range(period), all = store.all('bookings'), inR = (b, a, z) => b.date >= a && b.date <= z;
      const cur = all.filter(b => inR(b, R.from, R.to)), prev = all.filter(b => inR(b, R.prevFrom, R.prevTo)), c = sum(cur), pv = sum(prev);
      const done = cur.filter(b => b.status === 'done'), ids = {}; done.forEach(b => { ids[b.id] = 1; });
      const series = [];
      if (R.kind === 'hour') for (let h = 10; h <= 20; h++) { let r = 0, n = 0; done.forEach(b => { if (Math.floor(b.start / 60) === h) { r += b.total; n++; } }); series.push({ label: (h % 12 || 12) + (h < 12 ? 'a' : 'p'), revenue: r, count: n }); }
      else if (R.kind === 'day') { for (let d = R.from; d <= R.to; d = addDays(d, 1)) { let r = 0, n = 0; done.forEach(b => { if (b.date === d) { r += b.total; n++; } }); series.push({ label: d.slice(8) + '/' + d.slice(5, 7), revenue: r, count: n }); } }
      else { const mon = {}; done.forEach(b => { const k = b.date.slice(0, 7); (mon[k] = mon[k] || { r: 0, n: 0 }); mon[k].r += b.total; mon[k].n++; }); for (let d = R.from.slice(0, 7); d <= R.to.slice(0, 7); d = addDays(d + '-15', 31).slice(0, 7)) series.push({ label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+d.slice(5) - 1], revenue: (mon[d] || { r: 0 }).r, count: (mon[d] || { n: 0 }).n }); }
      const sty = {}; store.all('stylists').forEach(s => { sty[s.id] = { id: s.id, name: s.name, emoji: s.emoji, revenue: 0, count: 0, active: s.active && !s.deleted }; }); done.forEach(b => { if (sty[b.stylist_id]) { sty[b.stylist_id].revenue += b.total; sty[b.stylist_id].count++; } });
      const sv = {}; store.all('booking_items').forEach(i => { if (ids[i.booking_id]) { const x = (sv[i.service_id] = sv[i.service_id] || { name: i.name, count: 0, revenue: 0 }); x.count++; x.revenue += i.price; } });
      const hours = {}; done.forEach(b => { const h = Math.floor(b.start / 60); hours[h] = (hours[h] || 0) + 1; });
      const dows = [0, 0, 0, 0, 0, 0, 0]; done.forEach(b => { dows[dkDow(b.date)]++; });
      const canc = cur.filter(b => b.status === 'cancelled').length, nos = cur.filter(b => b.status === 'noshow').length, tot = cur.filter(b => b.status !== 'booked' && b.status !== 'arrived' && b.status !== 'inservice').length;
      const today = dayKey(env.now()), up = all.filter(b => b.date >= today && (b.status === 'booked' || b.status === 'arrived')).length;
      const pct = (a, b) => (b && prev.length >= cur.length * .35) ? Math.round((a - b) * 100 / b) : null;
      return { period, label: R.label, revenue: c.rev, bookings: c.n, avg: c.n ? Math.round(c.rev / c.n) : 0, cancelled: canc, noshow: nos, lossRate: tot ? Math.round((canc + nos) * 100 / tot) : 0, upcoming: up, revChange: pct(c.rev, pv.rev), bookChange: pct(c.n, pv.n), series, byStylist: Object.keys(sty).map(k => sty[k]).sort((a, b) => b.revenue - a.revenue), byService: Object.keys(sv).map(k => sv[k]).sort((a, b) => b.revenue - a.revenue).slice(0, 10), byHour: Object.keys(hours).map(h => ({ h: +h, count: hours[h] })).sort((a, b) => a.h - b.h), byDow: dows };
    }
    function customers() {
      const m = {}; store.all('bookings').forEach(b => { const c = (m[b.phone] = m[b.phone] || { phone: b.phone, name: b.name, visits: 0, spent: 0, last: '', next: '', noshow: 0 }); c.name = b.name; if (b.status === 'done') { c.visits++; c.spent += b.total; if (b.date > c.last) c.last = b.date; } if (b.status === 'noshow') c.noshow++; if ((b.status === 'booked' || b.status === 'arrived') && b.date >= dayKey(env.now()) && (!c.next || b.date < c.next)) c.next = b.date; });
      return Object.keys(m).map(k => m[k]).sort((a, b) => (b.last || '').localeCompare(a.last || '') || b.spent - a.spent).slice(0, 300);
    }

    /* ---------- auth ---------- */
    function login(kind, id, secret, key) {
      const f = fails[key] || { n: 0, until: 0 }; if (f.until > env.now()) throw ERR(429, 'Too many wrong attempts. Try again in a few minutes.');
      let ok = false; if (kind === 'owner') ok = env.checkPin(String(secret || ''), setting('owner_pass')); else { const s = store.get('stylists', +id); ok = !!(s && s.active && !s.deleted && env.checkPin(String(secret || ''), s.pin)); }
      if (!ok) { f.n++; if (f.n >= 8) { f.until = env.now() + 3e5; f.n = 0; } fails[key] = f; throw ERR(401, kind === 'owner' ? 'Wrong password.' : 'Wrong PIN.'); }
      delete fails[key]; const t = env.newToken(); sessions[t] = { role: kind, id: kind === 'owner' ? 0 : +id, exp: env.now() + 432e5 }; return t;
    }
    const who = t => { const s = t && sessions[t]; if (!s) return null; if (s.exp < env.now()) { delete sessions[t]; return null; } return s; };

    /* ---------- request router ---------- */
    function handle(req) {
      try { return route(req); } catch (e) { if (e.status) return { status: e.status, json: { error: e.message } }; throw e; }
    }
    function route(req) {
      const m = req.method, p = req.path, q = req.query || {}, b = req.body || {}, ses = who(req.token);
      const J = (j, status) => ({ status: status || 200, json: j }); let r;
      if (m === 'GET' && p === '/api/catalog') return J({ salon: { name: setting('salon_name'), tagline: setting('salon_tagline'), hours: setting('salon_hours'), phone: setting('salon_phone'), address: setting('salon_address') }, deposit: +setting('deposit') || 0, services: store.all('services').filter(s => s.active && !s.deleted).map(svcPub), stylists: store.all('stylists').filter(s => s.active && !s.deleted).map(styPub), offers: store.all('offers').filter(offerLive).map(o => ({ id: o.id, title: o.title, type: o.type, code: o.type === 'coupon' ? o.code : null, kind: o.kind, value: o.value, min: o.min, cap: o.cap, days: csvList(o.days), service_id: o.service_id, ends: o.ends })), now: env.now() });
      if (m === 'GET' && p === '/api/slots') return J(slots(q));
      if (m === 'POST' && p === '/api/quote') return J(quote(b));
      if (m === 'POST' && p === '/api/book') return J(create(b, false), 201);
      if ((r = /^\/api\/booking\/([A-Z0-9]{4,8})(\/cancel)?$/i.exec(p))) {
        const bk = store.where('bookings', { code: r[1].toUpperCase() })[0], ph = cleanPhone(q.phone || b.phone);
        if (!bk || !ph || bk.phone !== ph) return J({ error: 'We could not find that booking. Check the code and the mobile number.' }, 404);
        if (m === 'GET' && !r[2]) return J(view(bk, false));
        if (m === 'POST' && r[2]) { const v = view(bk, false); if (bk.status !== 'booked') throw ERR(409, 'This booking is already ' + bk.status + '.'); if (!v.canCancel) throw ERR(409, 'Cancellations close ' + CANCEL_HRS + ' hours before the appointment. Please call the salon.'); store.update('bookings', bk.id, { status: 'cancelled', reason: 'Cancelled by customer', deposit: bk.deposit }); return J(Object.assign(view(store.get('bookings', bk.id), false), { refund: bk.deposit })); }
      }
      if (m === 'GET' && p === '/api/stylists') return J(store.all('stylists').filter(s => s.active && !s.deleted).map(s => ({ id: s.id, name: s.name, emoji: s.emoji, role: s.role })));
      if (m === 'POST' && p === '/api/stylist/login') { const t = login('stylist', b.stylist, b.pin, 's' + b.stylist); return { status: 200, json: { ok: true }, setToken: t }; }
      if (m === 'POST' && p === '/api/owner/login') { const t = login('owner', 0, b.password, 'owner'); return { status: 200, json: { ok: true }, setToken: t }; }
      if (m === 'POST' && p === '/api/logout') { if (req.token) delete sessions[req.token]; return { status: 200, json: { ok: true }, setToken: null }; }
      if (!ses) return J({ error: 'Please log in.' }, 401);

      if (ses.role === 'stylist') {
        const me = store.get('stylists', ses.id), dayOf = dk => store.where('bookings', { stylist_id: me.id, date: dk }).sort((a, c) => a.start - c.start).map(x => view(x, true));
        if (m === 'GET' && p === '/api/me') return J({ id: me.id, name: me.name, role: me.role, emoji: me.emoji, color: me.color, days: csvList(me.days), start: me.start, end: me.end, skills: csvList(me.skills) });
        if (m === 'GET' && p === '/api/me/day') { const dk = isDay(q.date) ? q.date : dayKey(env.now()); return J({ date: dk, bookings: dayOf(dk), timeoff: store.where('timeoff', { stylist_id: me.id, date: dk }) }); }
        if (m === 'GET' && p === '/api/me/week') { const t0 = dayKey(env.now()), out = []; for (let i = 0; i < 7; i++) { const dk = addDays(t0, i), bs = store.where('bookings', { stylist_id: me.id, date: dk }).filter(x => x.status !== 'cancelled'); out.push({ date: dk, count: bs.length, mins: bs.reduce((a, x) => a + x.mins, 0), working: csvList(me.days).indexOf(dkDow(dk)) >= 0 }); } return J({ days: out }); }
        if (m === 'GET' && p === '/api/me/stats') { const t0 = dayKey(env.now()), mine = store.where('bookings', { stylist_id: me.id }); const td = mine.filter(x => x.date === t0), mo = mine.filter(x => x.date >= addDays(t0, -29) && x.date <= t0); return J({ today: { done: td.filter(x => x.status === 'done').length, left: td.filter(x => ['booked', 'arrived', 'inservice'].indexOf(x.status) >= 0).length, revenue: sum(td).rev }, month: { done: sum(mo).n, revenue: sum(mo).rev } }); }
        if ((r = /^\/api\/me\/booking\/(\d+)$/.exec(p)) && m === 'PATCH') { const bk = store.get('bookings', +r[1]); if (!bk || bk.stylist_id !== me.id) throw ERR(404, 'Not found.'); setStatus(bk, str(b.status, 12), 'stylist'); return J(view(store.get('bookings', bk.id), true)); }
        if (m === 'POST' && p === '/api/me/walkin') return J(create(b, true, me.id), 201);
        if (m === 'POST' && p === '/api/me/timeoff') { const dk = str(b.date, 10); if (!isDay(dk) || dk < dayKey(env.now())) throw ERR(400, 'Choose a date from today onwards.'); const s0 = b.allday ? 0 : num(b.start), e0 = b.allday ? 1440 : num(b.end); if (!(s0 >= 0 && e0 > s0 && e0 <= 1440)) throw ERR(400, 'The end time must be after the start time.'); const clash = store.where('bookings', { stylist_id: me.id, date: dk }).filter(x => ['booked', 'arrived', 'inservice'].indexOf(x.status) >= 0 && s0 < x.start + x.mins && e0 > x.start).length; if (clash) throw ERR(409, 'You already have ' + clash + ' booking(s) in that time. Ask the owner to move them first.'); return J(store.insert('timeoff', { stylist_id: me.id, date: dk, start: s0, end: e0, note: str(b.note, 80) }), 201); }
        if ((r = /^\/api\/me\/timeoff\/(\d+)$/.exec(p)) && m === 'DELETE') { const o = store.get('timeoff', +r[1]); if (!o || o.stylist_id !== me.id) throw ERR(404, 'Not found.'); store.remove('timeoff', o.id); return J({ ok: true }); }
        return J({ error: 'Not found.' }, 404);
      }

      /* owner */
      if (m === 'GET' && p === '/api/owner/stats') return J(stats(['day', 'week', 'month', 'year'].indexOf(q.period) >= 0 ? q.period : 'week'));
      if (m === 'GET' && p === '/api/owner/bookings') { const dk = isDay(q.date) ? q.date : dayKey(env.now()); return J({ date: dk, bookings: store.where('bookings', { date: dk }).sort((a, c) => a.start - c.start).map(x => view(x, true)) }); }
      if (m === 'GET' && p === '/api/owner/recent') return J(store.all('bookings').sort((a, c) => c.id - a.id).slice(0, 40).map(x => view(x, true)));
      if ((r = /^\/api\/owner\/bookings\/(\d+)$/.exec(p)) && m === 'PATCH') { const bk = store.get('bookings', +r[1]); if (!bk) throw ERR(404, 'Not found.'); setStatus(bk, str(b.status, 12), 'owner', b.reason); return J(view(store.get('bookings', bk.id), true)); }
      if (m === 'GET' && p === '/api/owner/bookings.csv') { const esc = v => { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }; const rows = [['Code', 'Date', 'Time', 'Customer', 'Phone', 'Stylist', 'Services', 'Status', 'Subtotal', 'Discount', 'Total', 'Deposit', 'Source']]; store.all('bookings').sort((a, c) => a.date.localeCompare(c.date) || a.start - c.start).forEach(x => { const v = view(x, true); rows.push([x.code, x.date, v.time, x.name, x.phone, v.stylist.name, v.items.map(i => i.name).join(' + '), x.status, x.subtotal, x.discount, x.total, x.deposit, x.source]); }); return { status: 200, csv: rows.map(a => a.map(esc).join(',')).join('\n'), filename: 'mirror-hour-bookings.csv' }; }
      if (m === 'GET' && p === '/api/owner/customers') return J(customers());
      if (m === 'GET' && p === '/api/owner/services') return J(store.all('services').filter(s => !s.deleted).map(svcPub));
      if (m === 'POST' && p === '/api/owner/services') { const d = svcIn(b); return J(svcPub(store.insert('services', Object.assign(d, { active: 1, deleted: 0 }))), 201); }
      if ((r = /^\/api\/owner\/services\/(\d+)$/.exec(p))) { const s = store.get('services', +r[1]); if (!s || s.deleted) throw ERR(404, 'Not found.'); if (m === 'PATCH') { store.update('services', s.id, svcIn(b, true)); return J(svcPub(store.get('services', s.id))); } if (m === 'DELETE') { store.update('services', s.id, { deleted: 1, active: 0 }); return J({ ok: true }); } }
      if (m === 'GET' && p === '/api/owner/stylists') return J(store.all('stylists').filter(s => !s.deleted).map(styPub));
      if (m === 'POST' && p === '/api/owner/stylists') { const d = styIn(b); const pin = str(b.pin, 4); if (!/^\d{4}$/.test(pin)) throw ERR(400, 'Give the new stylist a 4-digit PIN.'); const s = store.insert('stylists', Object.assign(d, { pin: env.hashPin(pin), active: 1, deleted: 0 })); return J(styPub(s), 201); }
      if ((r = /^\/api\/owner\/stylists\/(\d+)(\/pin)?$/.exec(p))) { const s = store.get('stylists', +r[1]); if (!s || s.deleted) throw ERR(404, 'Not found.'); if (r[2] && m === 'PUT') { const pin = str(b.pin, 4); if (!/^\d{4}$/.test(pin)) throw ERR(400, 'PIN must be 4 digits.'); store.update('stylists', s.id, { pin: env.hashPin(pin) }); return J({ ok: true }); } if (m === 'PATCH') { store.update('stylists', s.id, styIn(b, true)); return J(styPub(store.get('stylists', s.id))); } if (m === 'DELETE') { store.update('stylists', s.id, { deleted: 1, active: 0 }); return J({ ok: true }); } }
      if (m === 'GET' && p === '/api/owner/offers') return J(store.all('offers').map(o => Object.assign({}, o, { days: csvList(o.days) })));
      if (m === 'POST' && p === '/api/owner/offers') return J(store.insert('offers', Object.assign(offIn(b), { active: 1 })), 201);
      if ((r = /^\/api\/owner\/offers\/(\d+)$/.exec(p))) { const o = store.get('offers', +r[1]); if (!o) throw ERR(404, 'Not found.'); if (m === 'PATCH') { store.update('offers', o.id, b.active !== undefined && Object.keys(b).length === 1 ? { active: b.active ? 1 : 0 } : offIn(Object.assign({}, b, { id: o.id }))); return J({ ok: true }); } if (m === 'DELETE') { store.remove('offers', o.id); return J({ ok: true }); } }
      if (m === 'PUT' && p === '/api/owner/settings') { ['name', 'tagline', 'hours', 'phone', 'address'].forEach(k => { if (b[k] !== undefined) setSet('salon_' + k, str(b[k], 120)); }); if (b.deposit !== undefined) { const d = num(b.deposit); if (!(d >= 0 && d <= 5000)) throw ERR(400, 'Deposit must be between 0 and 5000.'); setSet('deposit', Math.round(d)); } return J({ ok: true }); }
      if (m === 'PUT' && p === '/api/owner/password') { if (!env.checkPin(String(b.current || ''), setting('owner_pass'))) throw ERR(400, 'Current password is wrong.'); const n = String(b.next || ''); if (n.length < 6) throw ERR(400, 'Use at least 6 characters.'); setOwnerPassword(n); return J({ ok: true }); }
      if (m === 'GET' && p === '/api/owner/me') return J({ ok: true });
      return J({ error: 'Not found.' }, 404);
    }
    function svcIn(b, part) {
      const o = {}, has = k => !part || b[k] !== undefined;
      if (has('name')) { o.name = str(b.name, 60); if (o.name.length < 2) throw ERR(400, 'Give the service a name.'); }
      if (has('cat')) o.cat = str(b.cat, 20) || 'Hair'; if (has('descr')) o.descr = str(b.descr, 140); if (has('emoji')) o.emoji = str(b.emoji, 4) || '✨';
      if (has('price')) { o.price = Math.round(num(b.price)); if (!(o.price >= 0 && o.price <= 100000)) throw ERR(400, 'Enter a price.'); }
      if (has('mins')) { o.mins = Math.round(num(b.mins)); if (!(o.mins >= 5 && o.mins <= 480 && o.mins % 5 === 0)) throw ERR(400, 'Minutes must be a multiple of 5, from 5 to 480.'); }
      if (b.active !== undefined) o.active = b.active ? 1 : 0; return o;
    }
    function styIn(b, part) {
      const o = {}, has = k => !part || b[k] !== undefined;
      if (has('name')) { o.name = str(b.name, 40); if (o.name.length < 2) throw ERR(400, 'Give the stylist a name.'); }
      if (has('role')) o.role = str(b.role, 50); if (has('emoji')) o.emoji = str(b.emoji, 4) || '✨'; if (has('color')) o.color = /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : '#c9577a'; if (has('bio')) o.bio = str(b.bio, 140);
      if (has('days')) { const d = (Array.isArray(b.days) ? b.days : []).map(Number).filter(x => x >= 0 && x <= 6); o.days = d.join(','); }
      if (has('start') || has('end')) { const s0 = b.start !== undefined ? num(b.start) : null, e0 = b.end !== undefined ? num(b.end) : null; if (s0 != null) { if (!(s0 >= 360 && s0 <= 1320 && s0 % STEP === 0)) throw ERR(400, 'Bad start time.'); o.start = s0; } if (e0 != null) { if (!(e0 > 360 && e0 <= 1380 && e0 % STEP === 0)) throw ERR(400, 'Bad end time.'); o.end = e0; } if (o.start != null && o.end != null && o.end <= o.start) throw ERR(400, 'End time must be after start time.'); }
      if (has('skills')) o.skills = (Array.isArray(b.skills) ? b.skills : []).map(Number).filter(Boolean).join(',');
      if (b.active !== undefined) o.active = b.active ? 1 : 0; return o;
    }
    function offIn(b) {
      const o = { title: str(b.title, 90), type: b.type === 'coupon' ? 'coupon' : 'auto', kind: b.kind === 'flat' ? 'flat' : 'percent', value: Math.round(num(b.value)), cap: Math.round(num(b.cap) || 0), min: Math.round(num(b.min) || 0), days: (Array.isArray(b.days) ? b.days : []).map(Number).filter(x => x >= 0 && x <= 6).join(','), service_id: Math.round(num(b.service_id) || 0), ends: isDay(str(b.ends, 10)) ? str(b.ends, 10) : null, code: null };
      if (o.title.length < 3) throw ERR(400, 'Give the offer a title.'); if (!(o.value > 0) || (o.kind === 'percent' && o.value > 90)) throw ERR(400, 'Enter a valid discount value.');
      if (o.type === 'coupon') { o.code = str(b.code, 20).toUpperCase().replace(/[^A-Z0-9]/g, ''); if (o.code.length < 4) throw ERR(400, 'Coupon codes need at least 4 letters or numbers.'); if (store.all('offers').some(x => x.code === o.code && String(x.id) !== String(b.id || ''))) throw ERR(409, 'That code already exists.'); } return o;
    }
    return { handle, seed, setOwnerPassword, stats, slots };
  }
  return { createApp, SCHEMA, TEXT_ID, dayKey, hhmm };
});
