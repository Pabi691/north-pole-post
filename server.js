// server.js — backend for the seasonal letter shop.
//  • /api/site-config  → the active season (theme, text, price) for the frontend
//  • /api/create-order, /api/verify → Razorpay payments (+ visitor/sales tracking)
//  • /api/track        → count visits & previews
//  • /api/admin/*      → password-protected admin: stats + edit/switch seasons

require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const Razorpay = require('razorpay');
const nodemailer = require('nodemailer');

const store = require('./store');
const { buildLetter, activeSeason, friendsCard } = require('./seasons');
const { letterEmailHtml, encodeShare } = require('./letter');

const app = express();
app.use(express.json({ limit: '4mb' }));  // room for the card image (base64) sent for the email
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: function (res, p) { if (p.endsWith('.html')) res.setHeader('Cache-Control', 'no-store'); }
}));

const PORT = parseInt(process.env.PORT || '3000', 10);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const FREE_LIMIT = parseInt(process.env.FREE_LIMIT || '10', 10);
function genCode() { const c = 'abcdefghijklmnopqrstuvwxyz0123456789'; let s = ''; for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
async function bump(field, by) { try { await store.incr(field, by || 1); await store.incrDaily(field, by || 1); } catch (e) {} }
const keysReady = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const razorpay = keysReady
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

// ---------- public config for the frontend ----------
app.get('/api/site-config', async function (req, res) {
  try {
    const cfg = await store.getConfig();
    const s = activeSeason(cfg);
    res.json({ keyId: process.env.RAZORPAY_KEY_ID || '', ready: keysReady, season: s, friends: friendsCard(s), free: !!cfg.free, freeLimit: FREE_LIMIT });
  } catch (e) {
    console.error('site-config failed:', e.message);
    res.status(500).json({ error: 'Could not load site config.' });
  }
});

// ---------- lightweight visitor tracking ----------
app.post('/api/track', async function (req, res) {
  try {
    const ev = (req.body && req.body.event) || '';
    if (ev === 'visit') await bump('visits');
    else if (ev === 'preview') await bump('previews');
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false }); }
});

// ---------- payments ----------
app.post('/api/create-order', async function (req, res) {
  if (!keysReady) return res.status(500).json({ error: 'Razorpay keys are not set yet. Add them to your .env file and restart.' });
  try {
    const cfg = await store.getConfig();
    const season = activeSeason(cfg);
    const amount = parseInt(season.pricePaise, 10) || 1000;
    const order = await razorpay.orders.create({ amount: amount, currency: 'INR', receipt: 'npp_' + Date.now(), notes: { season: season.key } });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (e) {
    console.error('create-order failed:', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Could not start the payment. Double-check your Razorpay keys.' });
  }
});

app.post('/api/verify', async function (req, res) {
  try {
    const b = req.body || {};
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = b;
    const details = b.details || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: 'Missing payment details.' });

    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex');
    const ok = expected.length === String(razorpay_signature).length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(razorpay_signature)));
    if (!ok) return res.status(400).json({ error: 'Payment could not be verified.' });

    const cfg = await store.getConfig();
    const season = activeSeason(cfg);
    const letter = buildLetter(season, details, details.mode);
    const cineTpl = details.template || 'globe';

    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const host = req.headers.host;
    const hash = encodeShare(letter, season.key, cineTpl);
    let p = '/letter.html#' + hash, code = null;  // fallback (long) link if storage is unavailable
    try { code = genCode(); await store.setCard(code, hash); p = '/c/' + code; } catch (e) {}
    const shareUrl = host ? (proto + '://' + host + p) : '';

    // Reply immediately — do NOT wait on email/stats (that was the slow part).
    res.json({ ok: true, letter: letter, emailed: Boolean(details.email), shareUrl: shareUrl });

    // Store image + record the sale + send the email, all in the background.
    const image = (req.body && req.body.image) || null;
    setImmediate(async function () {
      let imageUrl = '';
      if (image && code && host) { try { await store.setCardImage(code, image); imageUrl = proto + '://' + host + '/ci/' + code; } catch (e) {} }
      try {
        await bump('purchases'); await bump('revenue', parseInt(season.pricePaise, 10) || 0);
        let pay = null; try { pay = await razorpay.payments.fetch(razorpay_payment_id); } catch (e) {}
        await store.logTxn({
          t: Date.now(), type: 'paid', season: season.key,
          amount: parseInt(season.pricePaise, 10) || 0,
          name: String(details.name || '').slice(0, 40),
          device: String(details.device || '').slice(0, 20),
          pid: String(razorpay_payment_id || '').slice(0, 40),
          email: String((pay && pay.email) || details.email || '').slice(0, 80),
          contact: String((pay && pay.contact) || '').slice(0, 20),
          method: String((pay && pay.method) || '').slice(0, 16)
        });
      } catch (e) {}
      if (details.email) { try { await sendLetterEmail(details.email, season, letter, shareUrl, imageUrl); } catch (mailErr) { console.error('email failed:', mailErr && mailErr.message ? mailErr.message : mailErr); } }
    });
  } catch (e) {
    console.error('verify failed:', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Something went wrong after payment. Your money is safe — contact support.' });
  }
});

// ---------- free unlock (only when Free Mode is ON in admin) ----------
app.post('/api/free-unlock', async function (req, res) {
  try {
    const cfg = await store.getConfig();
    if (!cfg.free) return res.status(403).json({ error: 'Free mode is off.' });
    const details = (req.body && req.body.details) || {};
    const device = String(details.device || '').slice(0, 64);
    if (device) {
      const already = await store.getDeviceCount(device);
      if (already >= FREE_LIMIT) return res.status(429).json({ error: 'Free limit reached for this device.', limitReached: true, used: already, limit: FREE_LIMIT });
    }
    const season = activeSeason(cfg);
    const letter = buildLetter(season, details, details.mode);
    const cineTpl = details.template || 'globe';
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const host = req.headers.host;
    const hash = encodeShare(letter, season.key, cineTpl);
    let p = '/letter.html#' + hash, code = null;  // fallback (long) link if storage is unavailable
    try { code = genCode(); await store.setCard(code, hash); p = '/c/' + code; } catch (e) {}
    const shareUrl = host ? (proto + '://' + host + p) : '';
    let used = 0;
    if (device) { try { used = await store.incrDevice(device); } catch (e) {} }

    // Reply immediately — email + stats run in the background.
    res.json({ ok: true, letter: letter, emailed: Boolean(details.email), shareUrl: shareUrl, used: used, limit: FREE_LIMIT });

    const image = (req.body && req.body.image) || null;
    setImmediate(async function () {
      let imageUrl = '';
      if (image && code && host) { try { await store.setCardImage(code, image); imageUrl = proto + '://' + host + '/ci/' + code; } catch (e) {} }
      try { await bump('freebies'); await store.logTxn({ t: Date.now(), type: 'free', season: season.key, amount: 0, name: String(details.name || '').slice(0, 40), device: device, email: String(details.email || '').slice(0, 80) }); } catch (e) {}
      if (details.email) { try { await sendLetterEmail(details.email, season, letter, shareUrl, imageUrl); } catch (e) { console.error('email failed:', e && e.message ? e.message : e); } }
    });
  } catch (e) {
    console.error('free-unlock failed:', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ---------- short card links ----------
app.get('/api/card/:code', async function (req, res) {
  try {
    const h = await store.getCard(String(req.params.code || '').slice(0, 16));
    if (!h) return res.status(404).json({ error: 'Card not found.' });
    res.json({ d: h });
  } catch (e) { res.status(500).json({ error: 'error' }); }
});
app.get('/c/:code', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'letter.html'));
});
app.get('/ci/:code', async function (req, res) {
  try {
    const b64 = await store.getCardImage(String(req.params.code || '').slice(0, 16));
    if (!b64) return res.status(404).end();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.end(Buffer.from(b64, 'base64'));
  } catch (e) { res.status(500).end(); }
});
app.post('/api/shorten', async function (req, res) {
  try {
    const hash = String((req.body && req.body.d) || '').slice(0, 6000);
    if (!hash) return res.status(400).json({ error: 'no data' });
    const code = genCode();
    await store.setCard(code, hash);
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const host = req.headers.host;
    res.json({ url: host ? (proto + '://' + host + '/c/' + code) : '' });
  } catch (e) { res.status(500).json({ error: 'error' }); }
});

// ---------- admin (password protected) ----------
function passwordOk(given) {
  const a = Buffer.from(String(given || '')), b = Buffer.from(String(ADMIN_PASSWORD));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function checkAdmin(req, res, next) {
  if (!passwordOk(req.headers['x-admin-password'])) return res.status(401).json({ error: 'Wrong password.' });
  next();
}

app.post('/api/admin/login', function (req, res) {
  res.json({ ok: passwordOk(req.body && req.body.password) });
});

app.get('/api/admin/data', checkAdmin, async function (req, res) {
  try {
    const stats = await store.getStats();
    const cfg = await store.getConfig();
    const devices = await store.listDevices();
    const daily = await store.getDaily(14);
    const txns = await store.listTxns(100);
    res.json({ stats: stats, config: cfg, devices: devices, daily: daily, txns: txns, freeLimit: FREE_LIMIT, ready: keysReady, storage: store.useRedis ? 'Upstash (persistent)' : 'local file (resets on restart)' });
  } catch (e) { res.status(500).json({ error: 'Could not load admin data.' }); }
});

app.post('/api/admin/config', checkAdmin, async function (req, res) {
  try {
    const cfg = req.body && req.body.config;
    if (!cfg || !cfg.seasons || !cfg.active || !cfg.seasons[cfg.active]) return res.status(400).json({ error: 'Invalid config.' });
    await store.saveConfig(cfg);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not save.' }); }
});

app.post('/api/admin/reset', checkAdmin, async function (req, res) {
  try { await store.resetAll(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: 'Could not reset.' }); }
});

app.post('/api/admin/test-email', checkAdmin, async function (req, res) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return res.json({ ok: false, error: 'SMTP_USER / SMTP_PASS are not set on the server.' });
  const to = (req.body && req.body.to) || process.env.SMTP_USER;
  try {
    const cfg = await store.getConfig();
    const season = activeSeason(cfg);
    const letter = buildLetter(season, { name: 'Test', deed: 'tried the test button' }, 'kids');
    await sendLetterEmail(to, season, letter, '', null);
    res.json({ ok: true, to: to });
  } catch (e) { res.json({ ok: false, error: (e && e.message) ? e.message : String(e) }); }
});

// ---------- email ----------
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com', port: port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporter;
}
function mailFrom() {
  const f = process.env.MAIL_FROM || process.env.SMTP_USER || 'Letter Shop';
  const m = String(f).match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: (m[1] || 'Letter Shop').replace(/"/g, ''), email: m[2] };
  return { name: 'Letter Shop', email: f };
}
async function sendViaBrevo(to, subject, html) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', 'accept': 'application/json' },
    body: JSON.stringify({ sender: mailFrom(), to: [{ email: to }], subject: subject, htmlContent: html })
  });
  if (!r.ok) { let t = ''; try { t = await r.text(); } catch (e) {} throw new Error('Brevo ' + r.status + ': ' + t.slice(0, 180)); }
}
async function sendLetterEmail(to, season, letter, shareUrl, imageUrl) {
  const subject = (letter.emoji || '🎃') + ' A card for ' + (letter.name || 'you');
  const html = letterEmailHtml(season, letter, shareUrl, imageUrl);
  if (process.env.BREVO_API_KEY) { await sendViaBrevo(to, subject, html); return; }   // HTTPS — never blocked by the host
  const t = getTransporter();
  if (!t) throw new Error('Email not set up (no BREVO_API_KEY and no SMTP).');
  await t.sendMail({ from: process.env.MAIL_FROM || ('Letter Shop <' + process.env.SMTP_USER + '>'), to: to, subject: subject, html: html });
}

app.listen(PORT, function () {
  console.log('\n🎅 Letter shop running: http://localhost:' + PORT);
  console.log('   Razorpay: ' + (keysReady ? 'loaded ✅' : 'MISSING ❌ (add to .env)'));
  console.log('   Email: ' + (process.env.BREVO_API_KEY ? 'Brevo HTTP ✅' : (process.env.SMTP_USER ? 'SMTP ⚠️ (may be blocked on cloud hosts)' : 'not set ❌')));
  console.log('   Storage: ' + (store.useRedis ? 'Upstash ✅ (persistent)' : 'local file ⚠️ (resets on restart)'));
  console.log('   Admin: /admin.html  (password ' + (process.env.ADMIN_PASSWORD ? 'set ✅' : 'DEFAULT "changeme" ⚠️') + ')\n');
});
