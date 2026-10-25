// letter.js — the Santa letter is written HERE, on the server, so a visitor
// can never fake it by editing the page. The browser only displays what this
// returns after a verified payment.

function cap(s) {
  s = (s == null ? '' : String(s)).trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Build the personalised letter from the form details.
function buildLetter(d) {
  d = d || {};
  const name = cap(d.name) || 'Friend';
  const age = (d.age == null ? '' : String(d.age)).trim();
  const city = cap(d.city);
  const deed = (d.deed == null ? '' : String(d.deed)).trim();

  const p = [];
  p.push('Dear ' + name + ',');
  p.push('All the way up here at the North Pole, the elves and I have been keeping a close eye on you — and ' + name + ', I am so proud of you.');
  if (deed) {
    p.push('I heard that you ' + deed + '. That is exactly the kind of kindness that makes your name shine on my Nice List.');
  } else {
    p.push('You have been kind, brave and helpful this year, and your name shines bright on my Nice List.');
  }
  if (age) {
    p.push('Turning ' + age + ' is a big deal, you know. Big enough to keep being wonderful, and still small enough to believe in a little Christmas magic.');
  }
  p.push((city ? 'The reindeer already know the way to ' + city + '. ' : '') +
    'So on Christmas Eve, hang your stocking, leave out a biscuit or two, and get a good night’s sleep. I’ll do the rest.');
  p.push('Keep being you, ' + name + '. Merry Christmas! 🎄');

  const refCode = 'SANTA-' + (name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'FRIEND') + '99';
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return { name, paragraphs: p, refCode, date };
}

// Pack the letter details into a short, URL-safe string for the shareable link.
// The share page (letter.html) decodes this — no database needed.
function encodeShare(details, dateStr) {
  const payload = {
    n: (details && details.name) || '',
    a: (details && details.age) || '',
    c: (details && details.city) || '',
    d: (details && details.deed) || '',
    t: (details && details.template) || '',
    dt: dateStr || ''
  };
  return Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// A festive HTML email version of the same letter.
function letterEmailHtml(details, letter, shareUrl) {
  const body = letter.paragraphs
    .map(function (line) {
      return '<p style="margin:0 0 14px;font-size:18px;line-height:1.7;color:#2b2620;">' + escapeHtml(line) + '</p>';
    })
    .join('');

  const shareBlock = shareUrl
    ? [
        '    <div style="text-align:center;padding:4px 30px 22px;">',
        '      <a href="' + escapeHtml(shareUrl) + '" style="display:inline-block;background:#b23b32;color:#fff6ea;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;padding:13px 24px;border-radius:999px;">🎁 Open &amp; share this letter</a>',
        '      <div style="font-family:Arial,sans-serif;font-size:12px;color:#6d6456;margin-top:9px;">Send it on WhatsApp or Facebook — it opens with music and a festive theme 🎶</div>',
        '    </div>'
      ].join('\n')
    : '';

  return [
    '<div style="background:#f7f0e4;padding:28px 12px;font-family:Georgia,\'Times New Roman\',serif;">',
    '  <div style="max-width:560px;margin:0 auto;background:#fffaf1;border:1px solid #e4d8c2;border-top:6px solid #b23b32;border-radius:8px;overflow:hidden;">',
    '    <div style="text-align:center;padding:26px 24px 8px;">',
    '      <div style="font-size:34px;">🎅</div>',
    '      <div style="font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;font-size:12px;color:#b23b32;font-weight:bold;margin-top:4px;">Office of Santa Claus</div>',
    '      <div style="font-family:Arial,sans-serif;font-size:11px;color:#6d6456;letter-spacing:1px;">North Pole &middot; ' + escapeHtml(letter.date) + '</div>',
    '    </div>',
    '    <div style="padding:14px 30px 10px;">' + body + '</div>',
    '    <div style="padding:0 30px 20px;">',
    '      <div style="font-size:26px;color:#b23b32;font-family:\'Brush Script MT\',cursive;">Santa Claus</div>',
    '      <div style="display:inline-block;margin-top:8px;font-family:Arial,sans-serif;font-weight:bold;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#1c5a40;border:1.5px solid #1c5a40;border-radius:99px;padding:5px 12px;">✓ On the Nice List</div>',
    '    </div>',
    shareBlock,
    '    <div style="background:#1c5a40;color:#eef7f0;text-align:center;padding:14px;font-family:Arial,sans-serif;font-size:12px;">',
    '      Share the magic with code <b>' + escapeHtml(letter.refCode) + '</b> &mdash; your friends get ₹20 off.',
    '    </div>',
    '  </div>',
    '</div>'
  ].filter(Boolean).join('\n');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { buildLetter, letterEmailHtml, encodeShare };
