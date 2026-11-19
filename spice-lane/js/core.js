/* Food court business logic. Store-agnostic: the same file runs in the Node server (SQLite)
   and in the portfolio demo (browser storage). All money is whole rupees. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.FoodCore = factory(); })(this, function () {
  'use strict';
  const TZ = 330; // India Standard Time, minutes
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* table name -> columns (id is added automatically) */
  const SCHEMA = {
    shops: ['name', 'cuisine', 'emoji', 'color', 'blurb', 'open', 'pin', 'deleted'],
    items: ['shop_id', 'name', 'descr', 'price', 'veg', 'cat', 'emoji', 'stock', 'available', 'deleted'],
    orders: ['code', 'token', 'created', 'name', 'phone', 'mode', 'tbl', 'subtotal', 'discount', 'total', 'coupon', 'offer_title', 'method'],
    order_shops: ['order_id', 'shop_id', 'status', 'subtotal', 'discount', 'total', 'updated', 'note'],
    order_items: ['order_id', 'os_id', 'shop_id', 'item_id', 'name', 'price', 'qty'],
    offers: ['code', 'title', 'kind', 'value', 'min_order', 'max_discount', 'shop_id', 'auto', 'active', 'ends'],
    settings: ['v'],
  };
  const TEXT_ID = { settings: true };

  const parts = ms => { const d = new Date(ms + TZ * 60000); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), dow: d.getUTCDay() }; };
  const istMidnight = (y, m, d) => Date.UTC(y, m, d) - TZ * 60000;
  const dayKey = ms => { const p = parts(ms); return p.y + '-' + String(p.m + 1).padStart(2, '0') + '-' + String(p.d).padStart(2, '0'); };
  const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
  const int = v => { const n = parseInt(v, 10); return isNaN(n) ? null : n; };
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const luhn = s => { let sum = 0, alt = false; for (let i = s.length - 1; i >= 0; i--) { let n = +s[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; } return sum % 10 === 0; };
  const isAvail = it => it.available === 1 && (it.stock === null || it.stock === undefined || it.stock > 0);
  const ACTIVE = ['new', 'preparing', 'ready'];
  const NEXT = { new: ['preparing', 'ready', 'cancelled'], preparing: ['ready', 'cancelled'], ready: ['collected', 'cancelled'] };

  function createApp(store, env) {
    const sessions = {}, fails = {};
    const err = (status, msg, extra) => ({ status, json: Object.assign({ error: msg }, extra || {}) });
    const ok = (json, extra) => Object.assign({ status: 200, json }, extra || {});

    /* ---------- seed ---------- */
    function seed(S, opts) {
      opts = opts || {};
      if (store.all('shops').length) return false;
      store.tx(() => {
        S.shops.forEach(sh => {
          const row = store.insert('shops', { id: sh.id, name: sh.name, cuisine: sh.cuisine, emoji: sh.emoji, color: sh.color, blurb: sh.blurb, open: 1, pin: env.hashPin(sh.pin), deleted: 0 });
          sh.items.forEach(i => store.insert('items', { shop_id: row.id, name: i[0], descr: i[1], price: i[2], veg: i[3], cat: i[4], emoji: i[5], stock: i[6], available: 1, deleted: 0 }));
        });
        S.offers.forEach(o => store.insert('offers', o));
        store.insert('settings', { id: 'owner_pass', v: env.hashPin(opts.ownerPassword || S.ownerPassword) });
        store.insert('settings', { id: 'court_name', v: S.court.name });
        store.insert('settings', { id: 'court_tagline', v: S.court.tagline });
        store.insert('settings', { id: 'court_hours', v: S.court.hours });
        if (opts.history) history(opts.history === true ? 365 : opts.history);
      });
      return true;
    }
    function history(days) {
      let a = 42; const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const shops = store.all('shops'), items = store.all('items'), names = ['Aarav', 'Diya', 'Karthik', 'Meena', 'Rohan', 'Priya', 'Arjun', 'Sneha', 'Vikram', 'Anjali', 'Suresh', 'Lakshmi', 'Ibrahim', 'Fatima', 'Joseph', 'Nisha'];
      const hw = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 8, 14, 16, 10, 5, 4, 6, 10, 14, 10, 5, 0];
      const hsum = hw.reduce((x, y) => x + y, 0);
      const pickHour = () => { let r = rnd() * hsum; for (let h = 0; h < 24; h++) { r -= hw[h]; if (r <= 0) return h; } return 13; };
      const now = env.now(), t = parts(now); let tokenCount = {};
      for (let back = days; back >= 0; back--) {
        const dayMs = istMidnight(t.y, t.m, t.d) - back * 864e5, p = parts(dayMs + 12 * 36e5);
        let n = back > 60 ? 3 + Math.floor(rnd() * 4) : (p.dow === 0 || p.dow === 6 ? 38 + Math.floor(rnd() * 20) : 22 + Math.floor(rnd() * 16));
        if (back < 60) n = Math.round(n * (0.85 + (60 - back) / 400));
        for (let k = 0; k < n; k++) {
          const hour = pickHour(), ms = dayMs + hour * 36e5 + Math.floor(rnd() * 60) * 6e4;
          if (ms > now - 20 * 6e4) continue;
          const nShops = rnd() < .7 ? 1 : rnd() < .85 ? 2 : 3, chosen = [];
          while (chosen.length < nShops) { const s = shops[Math.floor(rnd() * shops.length)]; if (chosen.indexOf(s) < 0) chosen.push(s); }
          const lines = [];
          chosen.forEach(s => {
            const its = items.filter(i => i.shop_id === s.id), nItems = 1 + Math.floor(rnd() * 3), used = [];
            for (let q = 0; q < nItems; q++) { const idx = Math.floor(Math.pow(rnd(), 1.6) * its.length), it = its[idx]; if (used.indexOf(it) > -1) continue; used.push(it); lines.push({ shop: s, item: it, qty: 1 + (rnd() < .3 ? 1 : 0) }); }
          });
          const sub = lines.reduce((x, l) => x + l.item.price * l.qty, 0);
          const disc = sub >= 500 ? Math.min(150, Math.round(sub * .1)) : 0;
          const dk = dayKey(ms); tokenCount[dk] = (tokenCount[dk] || 0) + 1;
          const nm = names[Math.floor(rnd() * names.length)];
          const order = store.insert('orders', { code: 'H' + String(1e5 + Math.floor(rnd() * 9e5)), token: tokenCount[dk], created: new Date(ms).toISOString(), name: nm, phone: '98' + String(1e7 + Math.floor(rnd() * 9e7)), mode: rnd() < .55 ? 'dine' : 'take', tbl: '', subtotal: sub, discount: disc, total: sub - disc, coupon: '', offer_title: disc ? '10% off orders of ₹500+' : '', method: rnd() < .72 ? 'upi' : 'card' });
          chosen.forEach(s => {
            const ls = lines.filter(l => l.shop === s), ssub = ls.reduce((x, l) => x + l.item.price * l.qty, 0), sd = disc ? Math.round(disc * ssub / sub) : 0;
            const os = store.insert('order_shops', { order_id: order.id, shop_id: s.id, status: rnd() < .015 ? 'cancelled' : 'collected', subtotal: ssub, discount: sd, total: ssub - sd, updated: new Date(ms + 15 * 6e4).toISOString(), note: '' });
            ls.forEach(l => store.insert('order_items', { order_id: order.id, os_id: os.id, shop_id: s.id, item_id: l.item.id, name: l.item.name, price: l.item.price, qty: l.qty }));
          });
        }
      }
    }
    const setting = k => { const r = store.get('settings', k); return r ? r.v : ''; };
    function setOwnerPassword(pw) { const r = store.get('settings', 'owner_pass'); const h = env.hashPin(pw); if (r) store.update('settings', 'owner_pass', { v: h }); else store.insert('settings', { id: 'owner_pass', v: h }); }

    /* ---------- menu + quote ---------- */
    const offerLive = o => o.active === 1 && (!o.ends || o.ends >= dayKey(env.now()));
    function publicItem(it) { return { id: it.id, name: it.name, desc: it.descr, price: it.price, veg: it.veg, cat: it.cat, emoji: it.emoji, available: isAvail(it), left: it.stock !== null && it.stock !== undefined && it.stock > 0 && it.stock <= 5 ? it.stock : null }; }
    function menu() {
      const items = store.all('items').filter(i => !i.deleted);
      const shops = store.all('shops').filter(s => !s.deleted).map(s => ({ id: s.id, name: s.name, cuisine: s.cuisine, emoji: s.emoji, color: s.color, blurb: s.blurb, open: s.open === 1, items: items.filter(i => i.shop_id === s.id).map(publicItem) }));
      const offers = store.all('offers').filter(offerLive).map(o => ({ id: o.id, code: o.auto ? '' : o.code, title: o.title, auto: !!o.auto, min: o.min_order, shop_id: o.shop_id }));
      return { court: { name: setting('court_name'), tagline: setting('court_tagline'), hours: setting('court_hours') }, shops, offers, now: env.now() };
    }
    function quote(input, coupon) {
      const problems = [];
      if (!Array.isArray(input) || !input.length) return { ok: false, problems: [{ msg: 'Your cart is empty.' }] };
      const merged = {};
      input.slice(0, 60).forEach(l => { const id = int(l && l.id), q = int(l && l.qty); if (id && q > 0) merged[id] = Math.min(20, (merged[id] || 0) + q); });
      const lines = [], by = {}; let subtotal = 0;
      Object.keys(merged).forEach(id => {
        const it = store.get('items', +id), qty = merged[id];
        if (!it || it.deleted) { problems.push({ id: +id, msg: 'An item is no longer on the menu.' }); return; }
        const sh = store.get('shops', it.shop_id);
        if (!sh || sh.deleted || sh.open !== 1) { problems.push({ id: it.id, msg: (sh ? sh.name : 'That shop') + ' is closed right now.' }); return; }
        if (!isAvail(it)) { problems.push({ id: it.id, msg: it.name + ' just sold out.' }); return; }
        if (it.stock !== null && qty > it.stock) { problems.push({ id: it.id, msg: 'Only ' + it.stock + ' of ' + it.name + ' left.', left: it.stock }); return; }
        lines.push({ id: it.id, shop_id: sh.id, shop: sh.name, name: it.name, price: it.price, qty, emoji: it.emoji, veg: it.veg });
        subtotal += it.price * qty;
        const b = by[sh.id] = by[sh.id] || { shop_id: sh.id, name: sh.name, sub: 0, disc: 0, total: 0 };
        b.sub += it.price * qty;
      });
      if (problems.length) return { ok: false, problems };
      const cc = str(coupon, 20).toUpperCase(); let couponMsg = '', best = null, codeKnown = false;
      store.all('offers').filter(offerLive).forEach(o => {
        const isC = !o.auto && o.code && o.code.toUpperCase() === cc;
        if (isC) codeKnown = true;
        if (!o.auto && !isC) return;
        const elig = o.shop_id ? (by[o.shop_id] ? by[o.shop_id].sub : 0) : subtotal;
        if (elig <= 0) { if (isC) { const s = store.get('shops', o.shop_id); couponMsg = cc + ' only works at ' + (s ? s.name : 'one shop') + '.'; } return; }
        if (elig < o.min_order) { if (isC) couponMsg = 'Add ' + inr(o.min_order - elig) + ' more to use ' + cc + '.'; return; }
        let d = o.kind === 'percent' ? Math.round(elig * o.value / 100) : o.value;
        if (o.max_discount > 0) d = Math.min(d, o.max_discount);
        d = Math.min(d, elig);
        if (!best || d > best.d) best = { o, d, elig };
      });
      if (cc && !codeKnown) couponMsg = 'That coupon code is not valid.';
      const discount = best ? best.d : 0;
      if (best) {
        const targets = best.o.shop_id ? [by[best.o.shop_id]] : Object.keys(by).map(k => by[k]), base = targets.reduce((x, s) => x + s.sub, 0);
        let left = discount; targets.forEach((s, i) => { const share = i === targets.length - 1 ? left : Math.round(discount * s.sub / base); s.disc = share; left -= share; });
      }
      Object.keys(by).forEach(k => { by[k].total = by[k].sub - by[k].disc; });
      const applied = best ? { id: best.o.id, title: best.o.title, code: best.o.auto ? '' : best.o.code, auto: !!best.o.auto } : null;
      return { ok: true, problems: [], lines, subtotal, discount, total: subtotal - discount, offer: applied, couponMsg: applied && applied.code ? '' : couponMsg, byShop: Object.keys(by).map(k => by[k]) };
    }

    /* ---------- orders ---------- */
    function payCheck(m) {
      if (!m || !m.type) return 'Choose a payment method.';
      if (m.type === 'upi') { const u = str(m.upi, 60); if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(u)) return 'Enter a valid UPI ID like name@bank.'; if (/@fail$/i.test(u)) return 'Payment declined by the bank (test mode).'; return null; }
      if (m.type === 'card') {
        const n = str(m.number, 30).replace(/\s/g, ''); if (!/^\d{13,19}$/.test(n) || !luhn(n)) return 'Enter a valid card number.';
        const e = /^(\d{2})\s*\/\s*(\d{2})$/.exec(str(m.exp, 7)); const p = parts(env.now());
        if (!e || +e[1] < 1 || +e[1] > 12 || (2000 + +e[2]) * 12 + +e[1] < p.y * 12 + p.m + 1) return 'Enter a valid expiry date (MM/YY).';
        if (!/^\d{3,4}$/.test(str(m.cvv, 4))) return 'Enter the 3-digit CVV.';
        if (n === '4000000000000002') return 'Card declined (test card).';
        return null;
      }
      return 'Choose a payment method.';
    }
    function codeUnique() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for (let t = 0; t < 50; t++) { let c = ''; for (let i = 0; i < 6; i++) c += A[Math.floor(env.rand() * A.length)]; if (!store.where('orders', { code: c }).length) return c; } return 'X' + Date.now().toString(36).slice(-5).toUpperCase(); }
    function placeOrder(b) {
      const name = str(b.name, 60), phone = str(b.phone, 16), mode = b.mode === 'take' ? 'take' : 'dine', tbl = str(b.table, 6);
      if (name.length < 2) return err(400, 'Enter your name.');
      if (!/^\+?[0-9 ]{10,14}$/.test(phone)) return err(400, 'Enter a 10-digit mobile number.');
      if (mode === 'dine' && !tbl) return err(400, 'Enter your table number, or choose Takeaway.');
      const q = quote(b.items, b.coupon);
      if (!q.ok) return err(409, 'Some items changed while you were ordering.', { problems: q.problems });
      const pe = payCheck(b.pay); if (pe) return err(402, pe);
      let out;
      store.tx(() => {
        const now = env.now(), tk = store.all('orders').filter(o => dayKey(Date.parse(o.created)) === dayKey(now)).length + 1;
        const o = store.insert('orders', { code: codeUnique(), token: tk, created: new Date(now).toISOString(), name, phone, mode, tbl: mode === 'dine' ? tbl : '', subtotal: q.subtotal, discount: q.discount, total: q.total, coupon: q.offer && q.offer.code ? q.offer.code : '', offer_title: q.offer ? q.offer.title : '', method: b.pay.type });
        q.byShop.forEach(s => {
          const os = store.insert('order_shops', { order_id: o.id, shop_id: s.shop_id, status: 'new', subtotal: s.sub, discount: s.disc, total: s.total, updated: new Date(now).toISOString(), note: '' });
          q.lines.filter(l => l.shop_id === s.shop_id).forEach(l => {
            store.insert('order_items', { order_id: o.id, os_id: os.id, shop_id: s.shop_id, item_id: l.id, name: l.name, price: l.price, qty: l.qty });
            const it = store.get('items', l.id); if (it.stock !== null && it.stock !== undefined) store.update('items', l.id, { stock: it.stock - l.qty });
          });
        });
        out = o;
      });
      return { status: 201, json: { ok: true, code: out.code, token: out.token, total: out.total } };
    }
    function orderView(o) {
      const oss = store.where('order_shops', { order_id: o.id }), its = store.where('order_items', { order_id: o.id });
      const shops = oss.map(os => { const s = store.get('shops', os.shop_id) || {}; return { shop_id: os.shop_id, name: s.name, emoji: s.emoji, color: s.color, status: os.status, note: os.note, total: os.total, items: its.filter(i => i.os_id === os.id).map(i => ({ name: i.name, qty: i.qty, price: i.price })) }; });
      const live = shops.filter(s => s.status !== 'cancelled'); let overall = 'cancelled';
      if (live.length) overall = live.every(s => s.status === 'collected') ? 'collected' : live.every(s => s.status === 'ready' || s.status === 'collected') ? 'ready' : live.some(s => s.status !== 'new') ? 'preparing' : 'new';
      const refund = shops.filter(s => s.status === 'cancelled').reduce((x, s) => x + s.total, 0);
      return { code: o.code, token: o.token, created: o.created, name: o.name, mode: o.mode, table: o.tbl, subtotal: o.subtotal, discount: o.discount, total: o.total, offer: o.offer_title, method: o.method, overall, refund, shops };
    }
    function shopTickets(shopId) {
      const cut = env.now() - 6 * 36e5;
      return store.where('order_shops', { shop_id: shopId }).filter(os => ACTIVE.indexOf(os.status) > -1 || Date.parse(os.updated) > cut).map(os => {
        const o = store.get('orders', os.order_id), its = store.where('order_items', { os_id: os.id });
        return { id: os.id, status: os.status, note: os.note, total: os.total, updated: os.updated, token: o.token, name: o.name, mode: o.mode, table: o.tbl, created: o.created, items: its.map(i => ({ name: i.name, qty: i.qty })) };
      }).sort((a, b) => ACTIVE.indexOf(a.status) > -1 && ACTIVE.indexOf(b.status) > -1 ? Date.parse(a.created) - Date.parse(b.created) : Date.parse(b.updated) - Date.parse(a.updated));
    }
    function setStatus(osId, status, note, shopScope) {
      const os = store.get('order_shops', osId);
      if (!os || (shopScope && os.shop_id !== shopScope)) return err(404, 'Order not found.');
      if (!(NEXT[os.status] || []).includes(status)) return err(400, 'That order is already ' + os.status + '.');
      if (status === 'cancelled' && str(note, 140).length < 3) return err(400, 'Give a short reason, so the customer knows.');
      store.tx(() => {
        if (status === 'cancelled') store.where('order_items', { os_id: os.id }).forEach(i => { const it = store.get('items', i.item_id); if (it && it.stock !== null && it.stock !== undefined) store.update('items', it.id, { stock: it.stock + i.qty }); });
        store.update('order_shops', os.id, { status, updated: new Date(env.now()).toISOString(), note: status === 'cancelled' ? str(note, 140) : os.note });
      });
      return ok({ ok: true });
    }

    /* ---------- items ---------- */
    function itemFields(b, partial) {
      const f = {};
      if (!partial || 'name' in b) { f.name = str(b.name, 50); if (f.name.length < 2) return { e: 'Item name is too short.' }; }
      if ('desc' in b) f.descr = str(b.desc, 90);
      if (!partial || 'price' in b) { const p = int(b.price); if (!(p >= 1 && p <= 5000)) return { e: 'Price must be between ₹1 and ₹5,000.' }; f.price = p; }
      if (!partial || 'veg' in b) f.veg = b.veg ? 1 : 0;
      if (!partial || 'cat' in b) f.cat = str(b.cat, 24) || 'Menu';
      if (!partial || 'emoji' in b) f.emoji = str(b.emoji, 8) || '🍽️';
      if ('stock' in b) { if (b.stock === null || b.stock === '') f.stock = null; else { const s = int(b.stock); if (!(s >= 0 && s <= 9999)) return { e: 'Stock must be a number from 0 to 9999, or empty for unlimited.' }; f.stock = s; } }
      else if (!partial) f.stock = null;
      if ('available' in b) f.available = b.available ? 1 : 0; else if (!partial) f.available = 1;
      return { f };
    }
    function staffItem(it) { return { id: it.id, shop_id: it.shop_id, name: it.name, desc: it.descr, price: it.price, veg: it.veg, cat: it.cat, emoji: it.emoji, stock: it.stock, available: it.available === 1, status: itemStatus(it) }; }
    function itemStatus(it) { if (it.available !== 1 || it.stock === 0) return 'out'; if (it.stock !== null && it.stock !== undefined && it.stock <= 5) return 'low'; return it.stock === null || it.stock === undefined ? 'open' : 'ok'; }
    const editItem = (id, b, scope) => { const it = store.get('items', id); if (!it || it.deleted || (scope && it.shop_id !== scope)) return err(404, 'Item not found.'); const r = itemFields(b, true); if (r.e) return err(400, r.e); store.update('items', id, r.f); return ok({ ok: true, item: staffItem(store.get('items', id)) }); };
    const addItem = (shopId, b) => { const sh = store.get('shops', shopId); if (!sh || sh.deleted) return err(404, 'Shop not found.'); const r = itemFields(b, false); if (r.e) return err(400, r.e); r.f.shop_id = shopId; r.f.deleted = 0; const row = store.insert('items', r.f); return { status: 201, json: { ok: true, item: staffItem(row) } }; };
    const dropItem = (id, scope) => { const it = store.get('items', id); if (!it || it.deleted || (scope && it.shop_id !== scope)) return err(404, 'Item not found.'); store.update('items', id, { deleted: 1 }); return ok({ ok: true }); };

    /* ---------- stats ---------- */
    function stats(period) {
      const now = env.now(), t = parts(now); let start, end, pstart, n, label, idx;
      if (period === 'day') { start = istMidnight(t.y, t.m, t.d); end = start + 864e5; pstart = start - 864e5; n = 24; idx = ms => Math.floor((ms - start) / 36e5); label = i => (i % 12 || 12) + (i < 12 ? 'am' : 'pm'); }
      else if (period === 'week' || period === 'month') { const L = period === 'week' ? 7 : 30; n = L; end = istMidnight(t.y, t.m, t.d) + 864e5; start = end - L * 864e5; pstart = start - L * 864e5; idx = ms => Math.floor((ms - start) / 864e5); label = i => { const p = parts(start + i * 864e5 + 12 * 36e5); return period === 'week' ? DOW[p.dow] + ' ' + p.d : p.d + ' ' + MONTHS[p.m]; }; }
      else { period = 'year'; n = 12; const m0 = t.y * 12 + t.m - 11; start = istMidnight(Math.floor(m0 / 12), m0 % 12, 1); end = istMidnight(t.y, t.m + 1, 1); const pm = m0 - 12; pstart = istMidnight(Math.floor(pm / 12), pm % 12, 1); idx = ms => { const p = parts(ms); return p.y * 12 + p.m - m0; }; label = i => MONTHS[(m0 + i) % 12]; }
      const orders = {}; store.all('orders').forEach(o => { orders[o.id] = o; });
      const series = []; for (let i = 0; i < n; i++) series.push({ label: label(i), revenue: 0, orders: 0, _o: {} });
      const shopName = {}; store.all('shops').forEach(s => { shopName[s.id] = s; });
      const byShop = {}, byPay = {}, byHour = Array.from({ length: 24 }, (_, h) => ({ h, revenue: 0 })), winOs = {}, seen = {}, prevSeen = {};
      let rev = 0, cnt = 0, itemsSold = 0, prevRev = 0, prevCnt = 0, canc = 0, cancAmt = 0;
      store.all('order_shops').forEach(os => {
        const o = orders[os.order_id]; if (!o) return; const ms = Date.parse(o.created);
        if (ms >= pstart && ms < start) { if (os.status !== 'cancelled') { prevRev += os.total; prevSeen[o.id] = 1; } return; }
        if (ms < start || ms >= end) return;
        if (os.status === 'cancelled') { canc++; cancAmt += os.total; return; }
        const i = idx(ms); if (i < 0 || i >= n) return;
        rev += os.total; seen[o.id] = 1; series[i].revenue += os.total; series[i]._o[o.id] = 1;
        const sh = shopName[os.shop_id] || { name: 'Shop ' + os.shop_id, color: '#999', emoji: '' };
        const b = byShop[os.shop_id] = byShop[os.shop_id] || { id: os.shop_id, name: sh.name, emoji: sh.emoji, color: sh.color, revenue: 0, orders: 0 };
        b.revenue += os.total; b.orders++;
        byPay[o.method] = (byPay[o.method] || 0) + os.total;
        byHour[parts(ms).h].revenue += os.total; winOs[os.id] = os.shop_id;
      });
      cnt = Object.keys(seen).length; prevCnt = Object.keys(prevSeen).length; series.forEach(s => { s.orders = Object.keys(s._o).length; delete s._o; });
      const top = {};
      store.all('order_items').forEach(it => { if (!(it.os_id in winOs)) return; const k = it.shop_id + ':' + it.name; const r = top[k] = top[k] || { name: it.name, shop: (shopName[it.shop_id] || {}).name, qty: 0, revenue: 0 }; r.qty += it.qty; r.revenue += it.qty * it.price; itemsSold += it.qty; });
      return { period, revenue: rev, orders: cnt, avg: cnt ? Math.round(rev / cnt) : 0, items: itemsSold, prev: { revenue: prevRev, orders: prevCnt }, series,
        byShop: Object.keys(byShop).map(k => byShop[k]).sort((a, b) => b.revenue - a.revenue), topItems: Object.keys(top).map(k => top[k]).sort((a, b) => b.qty - a.qty).slice(0, 10),
        byPayment: Object.keys(byPay).map(k => ({ method: k, revenue: byPay[k] })), byHour, cancelled: { count: canc, amount: cancAmt }, from: new Date(start).toISOString(), to: new Date(end).toISOString() };
    }
    function stockReport() {
      const shops = {}; store.all('shops').forEach(s => { shops[s.id] = s; });
      const cut = env.now() - 7 * 864e5, orders = {}; store.all('orders').forEach(o => { orders[o.id] = Date.parse(o.created); });
      const live = {}; store.all('order_shops').forEach(os => { if (os.status !== 'cancelled' && orders[os.order_id] >= cut) live[os.id] = 1; });
      const sold = {}; store.all('order_items').forEach(i => { if (live[i.os_id]) sold[i.item_id] = (sold[i.item_id] || 0) + i.qty; });
      return store.all('items').filter(i => !i.deleted && shops[i.shop_id] && !shops[i.shop_id].deleted).map(i => Object.assign(staffItem(i), { shop: shops[i.shop_id].name, sold7: sold[i.id] || 0 }));
    }

    /* ---------- offers ---------- */
    function offerFields(b) {
      const o = {}; o.title = str(b.title, 90); if (o.title.length < 5) return { e: 'Give the offer a clear title (at least 5 letters).' };
      o.kind = b.kind === 'flat' ? 'flat' : 'percent'; o.value = int(b.value);
      if (!(o.value >= 1 && o.value <= (o.kind === 'percent' ? 90 : 5000))) return { e: o.kind === 'percent' ? 'Percent must be between 1 and 90.' : 'Flat amount must be between ₹1 and ₹5,000.' };
      o.min_order = int(b.min_order) || 0; o.max_discount = int(b.max_discount) || 0; if (o.min_order < 0 || o.min_order > 100000 || o.max_discount < 0) return { e: 'Check minimum order and maximum discount.' };
      o.auto = b.auto ? 1 : 0; o.active = b.active === false || b.active === 0 ? 0 : 1;
      if (b.shop_id) { const s = store.get('shops', int(b.shop_id)); if (!s || s.deleted) return { e: 'Choose a valid shop, or all shops.' }; o.shop_id = s.id; } else o.shop_id = null;
      o.ends = b.ends ? str(b.ends, 10) : null; if (o.ends && !/^\d{4}-\d{2}-\d{2}$/.test(o.ends)) return { e: 'Use a valid end date.' };
      if (o.auto) o.code = ''; else { o.code = str(b.code, 16).toUpperCase(); if (!/^[A-Z0-9]{3,16}$/.test(o.code)) return { e: 'Coupon code: 3 to 16 letters or numbers.' }; }
      return { o };
    }
    const codeTaken = (code, selfId) => code && store.all('offers').some(x => x.code && x.code.toUpperCase() === code && x.id !== selfId);

    /* ---------- auth ---------- */
    function lock(key) { const f = fails[key]; return f && f.until > env.now(); }
    function fail(key) { const f = fails[key] = fails[key] || { n: 0, until: 0 }; f.n++; if (f.n >= 8) { f.until = env.now() + 5 * 6e4; f.n = 0; } }
    function login(role, key, okPass) { if (lock(key)) return err(429, 'Too many wrong attempts. Try again in a few minutes.'); if (!okPass) { fail(key); return err(401, role === 'owner' ? 'Wrong password.' : 'Wrong PIN.'); } fails[key] = { n: 0, until: 0 }; return null; }
    const session = tok => { const s = tok && sessions[tok]; if (!s) return null; if (s.exp < env.now()) { delete sessions[tok]; return null; } return s; };
    const csvq = v => { let s = String(v == null ? '' : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };

    /* ---------- router ---------- */
    function handle(req) {
      const m = req.method, p = req.path, q = req.query || {}, b = req.body || {}; let mm;
      try {
        if (p === '/api/menu' && m === 'GET') return ok(menu());
        if (p === '/api/quote' && m === 'POST') { const r = quote(b.items, b.coupon); return ok(r); }
        if (p === '/api/order' && m === 'POST') return placeOrder(b);
        if ((mm = p.match(/^\/api\/order\/([A-Za-z0-9]{4,8})$/)) && m === 'GET') { const o = store.where('orders', { code: mm[1].toUpperCase() })[0]; return o ? ok(orderView(o)) : err(404, 'We could not find that order.'); }
        if (p === '/api/shop/login' && m === 'POST') {
          const sh = store.get('shops', int(b.shop)); if (!sh || sh.deleted) return err(401, 'Choose your shop.');
          const bad = login('shop', 'shop' + sh.id, env.checkPin(str(b.pin, 12), sh.pin)); if (bad) return bad;
          const tok = env.newToken(); sessions[tok] = { role: 'shop', shop: sh.id, exp: env.now() + 12 * 36e5 };
          return ok({ ok: true, shop: { id: sh.id, name: sh.name, emoji: sh.emoji, open: sh.open === 1 } }, { setToken: tok });
        }
        if (p === '/api/owner/login' && m === 'POST') {
          const bad = login('owner', 'owner', env.checkPin(str(b.password, 80), setting('owner_pass'))); if (bad) return bad;
          const tok = env.newToken(); sessions[tok] = { role: 'owner', exp: env.now() + 12 * 36e5 }; return ok({ ok: true }, { setToken: tok });
        }
        if (p === '/api/logout' && m === 'POST') { delete sessions[req.token]; return ok({ ok: true }, { setToken: null }); }
        if (p === '/api/shops' && m === 'GET') return ok(store.all('shops').filter(s => !s.deleted).map(s => ({ id: s.id, name: s.name, emoji: s.emoji })));

        const S = session(req.token);
        if (p.indexOf('/api/shop/') === 0) {
          if (!S || S.role !== 'shop') return err(401, 'Please log in.');
          const sid = S.shop, sh = store.get('shops', sid);
          if (p === '/api/shop/me') return ok({ id: sh.id, name: sh.name, emoji: sh.emoji, open: sh.open === 1 });
          if (p === '/api/shop/orders' && m === 'GET') return ok({ tickets: shopTickets(sid), now: env.now() });
          if ((mm = p.match(/^\/api\/shop\/orders\/(\d+)$/)) && m === 'PATCH') return setStatus(+mm[1], str(b.status, 12), b.note, sid);
          if (p === '/api/shop/menu' && m === 'GET') return ok(store.where('items', { shop_id: sid }).filter(i => !i.deleted).map(staffItem));
          if (p === '/api/shop/items' && m === 'POST') return addItem(sid, b);
          if ((mm = p.match(/^\/api\/shop\/items\/(\d+)$/))) { if (m === 'PATCH') return editItem(+mm[1], b, sid); if (m === 'DELETE') return dropItem(+mm[1], sid); }
          if (p === '/api/shop/open' && m === 'PUT') { store.update('shops', sid, { open: b.open ? 1 : 0 }); return ok({ ok: true, open: !!b.open }); }
          if (p === '/api/shop/stats' && m === 'GET') {
            const td = dayKey(env.now()); let rev = 0, cnt = 0; const orders = {}; store.all('orders').forEach(o => { orders[o.id] = o; });
            store.where('order_shops', { shop_id: sid }).forEach(os => { const o = orders[os.order_id]; if (o && os.status !== 'cancelled' && dayKey(Date.parse(o.created)) === td) { rev += os.total; cnt++; } });
            return ok({ revenue: rev, orders: cnt });
          }
        }
        if (p.indexOf('/api/owner/') === 0) {
          if (!S || S.role !== 'owner') return err(401, 'Please log in.');
          if (p === '/api/owner/stats' && m === 'GET') return ok(stats(q.period));
          if (p === '/api/owner/stock' && m === 'GET') return ok(stockReport());
          if (p === '/api/owner/items' && m === 'POST') return addItem(int(b.shop_id), b);
          if ((mm = p.match(/^\/api\/owner\/items\/(\d+)$/))) { if (m === 'PATCH') return editItem(+mm[1], b, null); if (m === 'DELETE') return dropItem(+mm[1], null); }
          if (p === '/api/owner/orders' && m === 'GET') return ok(store.all('orders').sort((a, c) => Date.parse(c.created) - Date.parse(a.created)).slice(0, 60).map(orderView));
          if ((mm = p.match(/^\/api\/owner\/orders\/(\d+)\/cancel$/)) && m === 'POST') {
            const os = store.where('order_shops', { order_id: +mm[1] }); let last = null;
            os.filter(x => ACTIVE.indexOf(x.status) > -1).forEach(x => { last = setStatus(x.id, 'cancelled', b.note || 'Cancelled by the owner', null); }); return last || err(400, 'Nothing to cancel.');
          }
          if (p === '/api/owner/orders.csv' && m === 'GET') {
            const cols = ['code', 'token', 'created_ist', 'name', 'phone', 'mode', 'table', 'subtotal', 'discount', 'total', 'method', 'coupon'];
            const rows = store.all('orders').sort((a, c) => Date.parse(c.created) - Date.parse(a.created)).map(o => { const pp = parts(Date.parse(o.created)); return [o.code, o.token, pp.y + '-' + String(pp.m + 1).padStart(2, '0') + '-' + String(pp.d).padStart(2, '0') + ' ' + String(pp.h).padStart(2, '0') + ':00', o.name, o.phone, o.mode, o.tbl, o.subtotal, o.discount, o.total, o.method, o.coupon]; });
            return { status: 200, csv: [cols.join(',')].concat(rows.map(r => r.map(csvq).join(','))).join('\n'), filename: 'orders.csv' };
          }
          if (p === '/api/owner/offers' && m === 'GET') return ok(store.all('offers'));
          if (p === '/api/owner/offers' && m === 'POST') { const r = offerFields(b); if (r.e) return err(400, r.e); if (codeTaken(r.o.code, 0)) return err(400, 'That coupon code is already used.'); return { status: 201, json: { ok: true, offer: store.insert('offers', r.o) } }; }
          if ((mm = p.match(/^\/api\/owner\/offers\/(\d+)$/))) {
            const id = +mm[1], cur = store.get('offers', id); if (!cur) return err(404, 'Offer not found.');
            if (m === 'PUT') { const r = offerFields(b); if (r.e) return err(400, r.e); if (codeTaken(r.o.code, id)) return err(400, 'That coupon code is already used.'); store.update('offers', id, r.o); return ok({ ok: true }); }
            if (m === 'PATCH') { store.update('offers', id, { active: b.active ? 1 : 0 }); return ok({ ok: true }); }
            if (m === 'DELETE') { store.remove('offers', id); return ok({ ok: true }); }
          }
          if (p === '/api/owner/shops' && m === 'GET') {
            const td = dayKey(env.now()), orders = {}; store.all('orders').forEach(o => { orders[o.id] = o; }); const today = {};
            store.all('order_shops').forEach(os => { const o = orders[os.order_id]; if (o && os.status !== 'cancelled' && dayKey(Date.parse(o.created)) === td) { today[os.shop_id] = (today[os.shop_id] || 0) + os.total; } });
            return ok(store.all('shops').filter(s => !s.deleted).map(s => ({ id: s.id, name: s.name, cuisine: s.cuisine, emoji: s.emoji, color: s.color, open: s.open === 1, items: store.where('items', { shop_id: s.id }).filter(i => !i.deleted).length, today: today[s.id] || 0 })));
          }
          if (p === '/api/owner/shops' && m === 'POST') {
            const name = str(b.name, 40), pin = str(b.pin, 4); if (name.length < 2) return err(400, 'Enter the shop name.'); if (!/^\d{4}$/.test(pin)) return err(400, 'Staff PIN must be 4 digits.');
            const row = store.insert('shops', { name, cuisine: str(b.cuisine, 30) || 'Food', emoji: str(b.emoji, 8) || '🍽️', color: /^#[0-9a-fA-F]{6}$/.test(b.color || '') ? b.color : '#FF9F1C', blurb: str(b.blurb, 90), open: 1, pin: env.hashPin(pin), deleted: 0 }); return { status: 201, json: { ok: true, id: row.id } };
          }
          if ((mm = p.match(/^\/api\/owner\/shops\/(\d+)$/))) {
            const id = +mm[1], sh = store.get('shops', id); if (!sh || sh.deleted) return err(404, 'Shop not found.');
            if (m === 'PATCH') {
              const f = {}; if ('name' in b) { f.name = str(b.name, 40); if (f.name.length < 2) return err(400, 'Enter the shop name.'); } if ('cuisine' in b) f.cuisine = str(b.cuisine, 30); if ('emoji' in b) f.emoji = str(b.emoji, 8) || sh.emoji; if ('open' in b) f.open = b.open ? 1 : 0;
              if (b.pin) { if (!/^\d{4}$/.test(String(b.pin))) return err(400, 'Staff PIN must be 4 digits.'); f.pin = env.hashPin(String(b.pin)); } store.update('shops', id, f); return ok({ ok: true });
            }
            if (m === 'DELETE') { store.update('shops', id, { deleted: 1, open: 0 }); return ok({ ok: true }); }
          }
          if (p === '/api/owner/password' && m === 'PUT') {
            if (!env.checkPin(str(b.current, 80), setting('owner_pass'))) return err(400, 'Current password is wrong.'); if (str(b.next, 80).length < 6) return err(400, 'New password needs at least 6 characters.');
            setOwnerPassword(str(b.next, 80)); return ok({ ok: true });
          }
        }
        return err(404, 'Not found');
      } catch (e) { if (e && e.status) return e; throw e; }
    }
    return { handle, seed, setOwnerPassword, stats, menu };
  }
  return { createApp, SCHEMA, TEXT_ID, dayKey, parts };
});
