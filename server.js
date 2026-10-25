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
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = parseInt(process.env.PORT || '3000', 10);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const keysReady = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const razorpay = keysReady
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

// ---------- public config for the frontend ----------
app.get('/api/site-config', async function (req, res) {
  try {
    const cfg = await store.getConfig();
    const s = activeSeason(cfg);
    res.json({ keyId: process.env.RAZORPAY_KEY_ID || '', ready: keysReady, season: s, friends: friendsCard(s) });
  } catch (e) {
    console.error('site-config failed:', e.message);
    res.status(500).json({ error: 'Could not load site config.' });
  }
});

// ---------- lightweight visitor tracking ----------
app.post('/api/track', async function (req, res) {
  try {
    const ev = (req.body && req.body.event) || '';
    if (ev === 'visit') await store.incr('visits');
    else if (ev === 'preview') await store.incr('previews');
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
    const shareUrl = host ? (proto + '://' + host + '/letter.html#' + encodeShare(letter, season.key, cineTpl)) : '';

    let emailed = false;
    if (details.email) {
      try { await sendLetterEmail(details.email, season, letter, shareUrl); emailed = true; }
      catch (mailErr) { console.error('email failed:', mailErr && mailErr.message ? mailErr.message : mailErr); }
    }

    // record the sale
    try { await store.incr('purchases'); await store.incr('revenue', parseInt(season.pricePaise, 10) || 0); } catch (e) {}

    res.json({ ok: true, letter: letter, emailed: emailed, shareUrl: shareUrl });
  } catch (e) {
    console.error('verify failed:', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Something went wrong after payment. Your money is safe — contact support.' });
  }
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
    res.json({ stats: stats, config: cfg, storage: store.useRedis ? 'Upstash (persistent)' : 'local file (resets on restart)' });
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
async function sendLetterEmail(to, season, letter, shareUrl) {
  const t = getTransporter();
  if (!t) throw new Error('SMTP not configured');
  await t.sendMail({
    from: process.env.MAIL_FROM || ('North Pole Post <' + process.env.SMTP_USER + '>'),
    to: to,
    subject: (letter.emoji || '🎅') + ' A letter for ' + (letter.name || 'your child'),
    html: letterEmailHtml(season, letter, shareUrl)
  });
}

app.listen(PORT, function () {
  console.log('\n🎅 Letter shop running: http://localhost:' + PORT);
  console.log('   Razorpay: ' + (keysReady ? 'loaded ✅' : 'MISSING ❌ (add to .env)'));
  console.log('   Email: ' + (process.env.SMTP_USER ? 'configured ✅' : 'not set'));
  console.log('   Storage: ' + (store.useRedis ? 'Upstash ✅ (persistent)' : 'local file ⚠️ (resets on restart)'));
  console.log('   Admin: /admin.html  (password ' + (process.env.ADMIN_PASSWORD ? 'set ✅' : 'DEFAULT "changeme" ⚠️') + ')\n');
});
