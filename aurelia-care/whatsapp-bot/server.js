/* Aurelia Care Hospital: WhatsApp Business Cloud API webhook (sample).
   Needs Node.js 18 or newer. No npm packages. Run: node server.js
   Flow: WhatsApp -> POST /webhook -> lib/bot-core.js finds the reply -> Graph API sends it back. */
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---- tiny .env loader (so no dotenv package is needed) ---- */
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach((l) => {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  });
} catch (e) { /* no .env file: use real environment variables */ }

const PORT = Number(process.env.PORT) || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || '';
const TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_ID = process.env.PHONE_NUMBER_ID || '';
const APP_SECRET = process.env.APP_SECRET || '';
const SITE = process.env.SITE_URL || '';
const GRAPH = process.env.GRAPH_VERSION || 'v21.0';
const DRY = !!process.env.DRY_RUN;

if (!DRY && (!TOKEN || !PHONE_ID || !APP_SECRET || !VERIFY_TOKEN)) {
  console.error('Missing settings. Fill VERIFY_TOKEN, WHATSAPP_TOKEN, PHONE_NUMBER_ID and APP_SECRET in .env (or set DRY_RUN=1 to test).');
  process.exit(1);
}

/* ---- load the shared answer engine and the hospital data ---- */
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'lib', 'data.js'), 'utf8'), ctx);
const bot = require('./lib/bot-core.js').create(ctx.window.AC, { site: SITE, tz: 'Asia/Kolkata' });

/* ---- safety helpers: ignore repeated deliveries and slow down spammers ---- */
const seen = new Set();
const hits = new Map();
function isDuplicate(id) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 5000) seen.delete(seen.values().next().value);
  return false;
}
function tooFast(from) {
  const now = Date.now(), arr = (hits.get(from) || []).filter((t) => now - t < 60000);
  arr.push(now); hits.set(from, arr);
  return arr.length > 20; // more than 20 messages a minute from one number
}

/* ---- sending ---- */
async function graphSend(payload) {
  if (DRY) { console.log('[DRY RUN] would send:', JSON.stringify(payload)); return; }
  const r = await fetch(`https://graph.facebook.com/${GRAPH}/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload })
  });
  if (!r.ok) console.error('WhatsApp send failed', r.status, await r.text());
}
async function sendReply(to, reply) {
  const buttons = (reply.buttons || []).slice(0, 3).map((t, i) => ({ type: 'reply', reply: { id: 'b' + i, title: String(t).slice(0, 20) } }));
  if (buttons.length && reply.text.length <= 1000) {
    return graphSend({ to, type: 'interactive', interactive: { type: 'button', body: { text: reply.text }, action: { buttons } } });
  }
  await graphSend({ to, type: 'text', text: { body: reply.text.slice(0, 4000), preview_url: false } });
  if (buttons.length) {
    await graphSend({ to, type: 'interactive', interactive: { type: 'button', body: { text: 'What else can I help with?' }, action: { buttons } } });
  }
}

/* ---- handle one incoming WhatsApp message ---- */
async function handleMessage(m) {
  if (isDuplicate(m.id) || tooFast(m.from)) return;
  let text = '';
  if (m.type === 'text') text = m.text && m.text.body;
  else if (m.type === 'interactive') {
    const i = m.interactive || {};
    text = (i.button_reply && i.button_reply.title) || (i.list_reply && i.list_reply.title) || '';
  } else {
    return sendReply(m.from, { text: 'Sorry, I can only read text messages. Please type your question, for example "doctors today" or "health packages".', buttons: ['Doctors today', 'Health packages', 'Book appointment'] });
  }
  return sendReply(m.from, bot.reply(text));
}

/* ---- HTTP server ---- */
function readBody(req, limit = 100000) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function validSignature(raw, header) {
  if (DRY && !APP_SECRET) return true;
  if (!header || !APP_SECRET) return false;
  const want = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(raw).digest('hex');
  const a = Buffer.from(want), b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/' || url.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('Aurelia WhatsApp bot is running'); }
  if (url.pathname !== '/webhook') { res.writeHead(404); return res.end(); }

  /* Meta checks your webhook once with a GET request */
  if (req.method === 'GET') {
    if (url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === VERIFY_TOKEN && VERIFY_TOKEN) {
      res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end(url.searchParams.get('hub.challenge') || '');
    }
    res.writeHead(403); return res.end();
  }

  if (req.method === 'POST') {
    let raw;
    try { raw = await readBody(req); } catch (e) { res.writeHead(413); return res.end(); }
    if (!validSignature(raw, req.headers['x-hub-signature-256'])) { res.writeHead(401); return res.end(); }
    res.writeHead(200); res.end(); // answer Meta quickly, then work
    try {
      const body = JSON.parse(raw.toString('utf8'));
      const jobs = [];
      ((body.entry) || []).forEach((e) => (e.changes || []).forEach((c) => ((c.value && c.value.messages) || []).forEach((m) => jobs.push(handleMessage(m)))));
      await Promise.all(jobs);
    } catch (e) { console.error('Could not process webhook:', e.message); }
    return;
  }
  res.writeHead(405); res.end();
});

server.listen(PORT, () => console.log(`Aurelia WhatsApp bot listening on port ${PORT}${DRY ? ' (DRY RUN: nothing is sent to WhatsApp)' : ''}`));
