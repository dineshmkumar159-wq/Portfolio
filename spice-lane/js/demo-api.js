/* Browser demo of the Spice Lane food court. Same business logic as the real server (core.js), but data lives in this browser's localStorage. */
(function () {
  var KEY = 'spicelane_demo_v1', TK = 'spicelane_demo_tok', db = null, SC = FoodCore.SCHEMA;
  function blank() { var d = { n: {} }; Object.keys(SC).forEach(function (t) { d[t] = []; d.n[t] = 0; }); return d; }
  try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
  var fresh = !db || !db.shops; if (fresh) db = blank();
  var inTx = false, dirty = false, saveT;
  function save() { dirty = true; clearTimeout(saveT); saveT = setTimeout(flush, 300); }
  function flush() { if (!dirty) return; dirty = false; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage full: demo keeps working in memory */ } }
  window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', flush);
  var cp = function (r) { return r ? JSON.parse(JSON.stringify(r)) : r; };
  var store = {
    all: function (t) { return db[t].map(cp); },
    where: function (t, f) { var k = Object.keys(f); return db[t].filter(function (r) { return k.every(function (c) { return r[c] === f[c]; }); }).map(cp); },
    get: function (t, id) { for (var i = 0; i < db[t].length; i++) if (db[t][i].id === id) return cp(db[t][i]); return undefined; },
    insert: function (t, row) { var r = {}; SC[t].forEach(function (c) { r[c] = row[c] === undefined ? null : row[c]; }); if ('id' in row) r.id = row.id; else r.id = ++db.n[t]; if (typeof r.id === 'number' && r.id > db.n[t]) db.n[t] = r.id; db[t].push(r); save(); return cp(r); },
    update: function (t, id, f) { for (var i = 0; i < db[t].length; i++) if (db[t][i].id === id) { Object.keys(f).forEach(function (c) { db[t][i][c] = f[c] === undefined ? null : f[c]; }); save(); return; } },
    remove: function (t, id) { db[t] = db[t].filter(function (r) { return r.id !== id; }); save(); },
    tx: function (fn) { if (inTx) return fn(); inTx = true; var snap = JSON.stringify(db); try { return fn(); } catch (e) { db = JSON.parse(snap); throw e; } finally { inTx = false; } }
  };
  var env = {
    now: function () { return Date.now(); }, rand: Math.random,
    hashPin: function (p) { return 'd:' + p; }, checkPin: function (p, h) { return h === 'd:' + p; },
    newToken: function () { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  };
  var app = FoodCore.createApp(store, env);
  if (app.seed(FoodSeed, { history: 365, ownerPassword: FoodSeed.ownerPassword })) flush();

  var realFetch = window.fetch.bind(window);
  window.fetch = function (url, opt) {
    var u = typeof url === 'string' ? url : url.url;
    if (u.indexOf('/api/') !== 0 && u.indexOf('/api/') < 0) return realFetch(url, opt);
    opt = opt || {};
    var a = document.createElement('a'); a.href = u;
    var path = a.pathname.replace(/^.*?(\/api\/)/, '/api/'), q = {};
    (a.search || '').replace(/^\?/, '').split('&').filter(Boolean).forEach(function (kv) { var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    var body = {}; try { body = opt.body ? JSON.parse(opt.body) : {}; } catch (e) { body = {}; }
    var token = null; try { token = sessionStorage.getItem(TK); } catch (e) { token = null; }
    return new Promise(function (res) {
      setTimeout(function () {
        var r;
        try { r = app.handle({ method: (opt.method || 'GET').toUpperCase(), path: path, query: q, body: body, token: token }); }
        catch (e) { r = { status: 500, json: { error: 'Demo error: ' + e.message } }; }
        if ('setToken' in r) { try { if (r.setToken) sessionStorage.setItem(TK, r.setToken); else sessionStorage.removeItem(TK); } catch (e) { } }
        if (r.csv != null) return res(new Response(r.csv, { status: r.status || 200, headers: { 'Content-Type': 'text/csv' } }));
        res(new Response(JSON.stringify(r.json || {}), { status: r.status || 200, headers: { 'Content-Type': 'application/json' } }));
      }, 120);
    });
  };
  /* CSV link: build the download in the browser */
  document.addEventListener('click', function (e) {
    var l = e.target.closest && e.target.closest('a[href$="orders.csv"]'); if (!l) return; e.preventDefault();
    window.fetch('/api/owner/orders.csv').then(function (r) { return r.text(); }).then(function (t) { var b = new Blob([t], { type: 'text/csv' }), x = document.createElement('a'); x.href = URL.createObjectURL(b); x.download = 'spice-lane-orders.csv'; document.body.appendChild(x); x.click(); x.remove(); });
  });
  /* demo hints on login screens + reset link */
  document.addEventListener('DOMContentLoaded', function () {
    var h = document.getElementById('demohint'); if (!h) return; h.hidden = false;
    var owner = /owner/.test(location.pathname);
    h.innerHTML = '<b>Demo mode.</b> ' + (owner ? 'Owner password: <b>' + FoodSeed.ownerPassword + '</b>.' : 'Pick a shop and use its PIN: Dosa Junction <b>1111</b>, Biryani Bazaar <b>2222</b>, Burger Barn <b>3333</b>, Pizza Piazza <b>4444</b>, Wok This Way <b>5555</b>, Chaat Corner <b>6666</b>, Tandoori Tales <b>7777</b>, Sweet Tooth <b>8888</b>, Juice Junction <b>9999</b>, Roll Republic <b>1010</b>, Filter Kaapi <b>1212</b>, Momo Mania <b>1313</b>.')+' Everything is saved in your browser only. <a href="#" id="demoreset">Reset demo data</a>';
    document.getElementById('demoreset').addEventListener('click', function (e) { e.preventDefault(); try { localStorage.removeItem(KEY); sessionStorage.removeItem(TK); } catch (x) { } location.reload(); });
  });
})();
