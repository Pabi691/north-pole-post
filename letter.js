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

function letterEmailHtml(season, letter, shareUrl) {
  const c = (season && season.colors) || {};
  const primary = c.primary || '#b23b32';
  const secondary = c.secondary || '#1c5a40';
  const body = letter.paragraphs.map(function (line) {
    return '<p style="margin:0 0 14px;font-size:18px;line-height:1.7;color:#2b2620;">' + escapeHtml(line) + '</p>';
  }).join('');

  const shareBlock = shareUrl ? [
    '    <div style="text-align:center;padding:4px 30px 22px;">',
    '      <a href="' + escapeHtml(shareUrl) + '" style="display:inline-block;background:' + primary + ';color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;padding:13px 24px;border-radius:999px;">🎁 Open &amp; share this letter</a>',
    '      <div style="font-family:Arial,sans-serif;font-size:12px;color:#6d6456;margin-top:9px;">Send it on WhatsApp or Facebook — it opens with music and a cinematic scene 🎶</div>',
    '    </div>'
  ].join('\n') : '';

  return [
    '<div style="background:#f2eee6;padding:28px 12px;font-family:Georgia,\'Times New Roman\',serif;">',
    '  <div style="max-width:560px;margin:0 auto;background:#fffaf1;border:1px solid #e4d8c2;border-top:6px solid ' + primary + ';border-radius:8px;overflow:hidden;">',
    '    <div style="text-align:center;padding:26px 24px 8px;">',
    '      <div style="font-size:34px;">' + escapeHtml(letter.emoji || '🎅') + '</div>',
    '      <div style="font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;font-size:12px;color:' + primary + ';font-weight:bold;margin-top:4px;">' + escapeHtml(letter.senderTitle || '') + '</div>',
    '      <div style="font-family:Arial,sans-serif;font-size:11px;color:#6d6456;letter-spacing:1px;">' + escapeHtml(letter.dateline || '') + ' &middot; ' + escapeHtml(letter.date || '') + '</div>',
    '    </div>',
    '    <div style="padding:14px 30px 10px;">' + body + '</div>',
    '    <div style="padding:0 30px 20px;">',
    '      <div style="font-size:26px;color:' + primary + ';font-family:\'Brush Script MT\',cursive;">' + escapeHtml(letter.senderName || '') + '</div>',
    '      <div style="display:inline-block;margin-top:8px;font-family:Arial,sans-serif;font-weight:bold;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:' + secondary + ';border:1.5px solid ' + secondary + ';border-radius:99px;padding:5px 12px;">✓ ' + escapeHtml(letter.badge || '') + '</div>',
    '    </div>',
    shareBlock,
    '    <div style="background:' + secondary + ';color:#fff;text-align:center;padding:14px;font-family:Arial,sans-serif;font-size:12px;">',
    '      Made with love · ' + escapeHtml((season && season.brand) || 'North Pole Post'),
    '    </div>',
    '  </div>',
    '</div>'
  ].filter(Boolean).join('\n');
}

module.exports = { letterEmailHtml, encodeShare, escapeHtml };
