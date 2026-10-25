// server.js — the small backend that keeps your money safe.
// It does three jobs:
//   1. Creates a Razorpay order (so the secret key never touches the browser).
//   2. Verifies the payment really happened (signature check).
//   3. Only THEN builds the letter and emails it to the parent.
//
// Start it with:  npm start   (then open http://localhost:3000)

require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const Razorpay = require('razorpay');
const nodemailer = require('nodemailer');
const { buildLetter, letterEmailHtml, encodeShare } = require('./letter');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = parseInt(process.env.PORT || '3000', 10);
const PRICE_PAISE = parseInt(process.env.PRICE_PAISE || '100', 10); // 100 paise = ₹1
const CURRENCY = 'INR';

const keysReady = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const razorpay = keysReady
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

// ---- The frontend asks for the public key + price on load ----
app.get('/api/config', function (req, res) {
  res.json({
    keyId: process.env.RAZORPAY_KEY_ID || '',
    pricePaise: PRICE_PAISE,
    currency: CURRENCY,
    ready: keysReady,
  });
});

// ---- Step 1: create an order ----
app.post('/api/create-order', async function (req, res) {
  if (!keysReady) {
    return res.status(500).json({ error: 'Razorpay keys are not set yet. Add them to your .env file and restart.' });
  }
  try {
    const order = await razorpay.orders.create({
      amount: PRICE_PAISE,
      currency: CURRENCY,
      receipt: 'npp_' + Date.now(),
      notes: { product: 'Letter from Santa' },
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (e) {
    console.error('create-order failed:', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Could not start the payment. Double-check your Razorpay keys.' });
  }
});

// ---- Step 2 + 3: verify the payment, then build + email the letter ----
app.post('/api/verify', async function (req, res) {
  try {
    const b = req.body || {};
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = b;
    const details = b.details || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details.' });
    }

    // Recreate the signature with our SECRET key. If it matches, the payment is genuine.
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    const ok =
      expected.length === String(razorpay_signature).length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(razorpay_signature)));

    if (!ok) {
      return res.status(400).json({ error: 'Payment could not be verified.' });
    }

    // Paid for real — now (and only now) create the letter.
    const letter = buildLetter(details);

    // Build the public shareable link (details packed into the URL — no database).
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const host = req.headers.host;
    const shareUrl = host ? (proto + '://' + host + '/letter.html#' + encodeShare(details, letter.date)) : '';

    // Try to email it. If email isn't set up, we still deliver on screen.
    let emailed = false;
    if (details.email) {
      try {
        await sendLetterEmail(details.email, details, letter, shareUrl);
        emailed = true;
      } catch (mailErr) {
        console.error('email failed:', mailErr && mailErr.message ? mailErr.message : mailErr);
      }
    }

    res.json({ ok: true, letter, emailed, shareUrl, paymentId: razorpay_payment_id });
  } catch (e) {
    console.error('verify failed:', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Something went wrong after payment. Your money is safe — contact support.' });
  }
});

// ---- Email helper ----
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: port === 465, // true for 465, false for 587
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function sendLetterEmail(to, details, letter, shareUrl) {
  const t = getTransporter();
  if (!t) throw new Error('SMTP not configured');
  await t.sendMail({
    from: process.env.MAIL_FROM || ('North Pole Post <' + process.env.SMTP_USER + '>'),
    to: to,
    subject: '🎅 A letter from Santa for ' + (letter.name || 'your child'),
    html: letterEmailHtml(details, letter, shareUrl),
  });
}

app.listen(PORT, function () {
  console.log('\n🎅 North Pole Post is running: http://localhost:' + PORT);
  console.log('   Razorpay keys: ' + (keysReady ? 'loaded ✅' : 'MISSING ❌  (add them to .env)'));
  console.log('   Email: ' + (process.env.SMTP_USER ? 'configured ✅' : 'not set (letters still show on screen)'));
  console.log('   Price: ₹' + (PRICE_PAISE / 100).toFixed(2) + '\n');
});
