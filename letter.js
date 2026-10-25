// letter.js — turns a built letter into (1) a self-contained shareable link and
// (2) a festive HTML email. The letter text itself is built in seasons.js.

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Pack the FINISHED letter (plus season key + chosen cinematic template) into a
// URL-safe string. Everything the share page needs is baked in, so old links keep
// working even after the season is switched in the admin.
function encodeShare(letter, seasonKey, cineTpl) {
  const payload = {
    n: letter.name, P: letter.paragraphs, dt: letter.date,
    em: letter.emoji, st: letter.senderTitle, sn: letter.senderName,
    dl: letter.dateline, bd: letter.badge,
    sk: seasonKey || 'christmas', ct: cineTpl || 'globe'
  };
  return Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Season-themed HTML email (dark & scary for Halloween). Includes the card image
// (as an inline cid attachment, when supplied) and a glowing link to the live card.
function letterEmailHtml(season, letter, shareUrl, hasImage) {
  const c = (season && season.colors) || {};
  const bg = c.deep || '#160f1f';
  const card = c.paper || '#211733';
  const ink = c.ink || '#f4ecff';
  const muted = c.muted || '#b6a8cc';
  const primary = c.primary || '#ff7a1a';
  const accent = c.accent || '#ff9e45';

  const body = letter.paragraphs.map(function (line) {
    return '<p style="margin:0 0 14px;font-size:18px;line-height:1.7;color:' + ink + ';font-family:Georgia,serif;">' + escapeHtml(line) + '</p>';
  }).join('');

  const img = hasImage
    ? '    <div style="text-align:center;padding:4px 18px 8px;"><img src="cid:cardimg" alt="Your card" width="520" style="max-width:100%;border-radius:14px;border:1px solid ' + accent + ';"></div>'
    : '';

  const btn = shareUrl ? [
    '    <div style="text-align:center;padding:12px 20px 26px;">',
    '      <a href="' + escapeHtml(shareUrl) + '" style="display:inline-block;background:' + primary + ';color:#1a0a00;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;font-size:16px;padding:15px 30px;border-radius:999px;box-shadow:0 0 22px ' + accent + ';">' + escapeHtml(letter.emoji || '🎃') + ' Open your card (with music)</a>',
    '      <div style="font-family:Arial,sans-serif;font-size:12px;color:' + muted + ';margin-top:10px;">Opens the full moving card — bats, scares &amp; sound 🦇</div>',
    '    </div>'
  ].join('\n') : '';

  return [
    '<div style="background:' + bg + ';padding:28px 12px;font-family:Arial,sans-serif;">',
    '  <div style="max-width:560px;margin:0 auto;background:' + card + ';border:1px solid ' + accent + ';border-radius:16px;overflow:hidden;">',
    '    <div style="text-align:center;padding:26px 24px 8px;">',
    '      <div style="font-size:42px;">' + escapeHtml(letter.emoji || '🎃') + '</div>',
    '      <div style="letter-spacing:2px;text-transform:uppercase;font-size:12px;color:' + primary + ';font-weight:bold;margin-top:6px;">' + escapeHtml(letter.senderTitle || '') + '</div>',
    '      <div style="font-size:11px;color:' + muted + ';letter-spacing:1px;">' + escapeHtml(letter.dateline || '') + ' &middot; ' + escapeHtml(letter.date || '') + '</div>',
    '    </div>',
    img,
    '    <div style="padding:14px 30px 6px;">' + body + '</div>',
    '    <div style="padding:0 30px 8px;">',
    '      <div style="font-size:26px;color:' + primary + ';font-family:\'Brush Script MT\',cursive;">' + escapeHtml(letter.senderName || '') + '</div>',
    '      <span style="display:inline-block;margin-top:10px;font-weight:bold;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:' + accent + ';border:1.5px solid ' + accent + ';border-radius:99px;padding:5px 12px;">✓ ' + escapeHtml(letter.badge || '') + '</span>',
    '    </div>',
    btn,
    '    <div style="background:' + primary + ';color:#1a0a00;text-align:center;padding:12px;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;">',
    '      ' + escapeHtml((season && season.brand) || 'Letter Shop') + ' · made with a little dark magic 🖤',
    '    </div>',
    '  </div>',
    '</div>'
  ].filter(Boolean).join('\n');
}

module.exports = { letterEmailHtml, encodeShare, escapeHtml };
