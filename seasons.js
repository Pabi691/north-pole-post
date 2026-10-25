// seasons.js — every season is a complete, editable "skin": branding, colours,
// the character, the letter wording, the cinematic look and the price.
// The admin panel edits these; the frontend just renders whatever is active.

const DEFAULT_ACTIVE = 'halloween';

const DEFAULT_SEASONS = {
  halloween: {
    key: 'halloween', label: 'Halloween', emoji: '🎃',
    brand: 'Hollow Post', tagline: 'est. the first frost',
    heroTitle: 'A spooky-sweet letter from a <em>Friendly Ghost</em>, just for your child.',
    heroSub: 'Add a name and a brave deed, then watch it come to life with music — free. Love it? Send it for a tiny price.',
    senderName: 'The Friendly Ghost 👻', senderTitle: 'Office of the Pumpkin King', dateline: 'Spooky Hollow',
    badge: 'On the Brave List', pricePaise: 1000,
    colors: { bg:'#15101f', paper:'#211733', ink:'#f4ecff', muted:'#b6a8cc', line:'#382a4e', primary:'#ff7a1a', secondary:'#8a4bd6', accent:'#ff9e45', deep:'#0c0816' },
    cine: { c1:'#3a1d5c', c2:'#0e0a18', accent:'#ff8a3d', particle:'bats' },
    letter: {
      greeting: 'Dear {name},',
      intro: 'All through the misty woods of Spooky Hollow, the ghosts and I have been watching — and {name}, you have impressed every last one of us.',
      deed: 'I heard that you {deed}. That is exactly the kind of courage and kindness that earns a place on our Brave List.',
      noDeed: 'You have been brave, kind and clever this year, and your name glows bright on our Brave List.',
      age: 'Turning {age} is a big deal, you know — big enough to carve your very own pumpkin, and still small enough to believe in a little magic.',
      cityLine: 'The bats already know the way to {city}. ',
      closing: '{cityLine}So on Halloween night, light your lantern, share your sweets, and keep your eyes open for a friendly wink from the dark.',
      signoff: 'Stay brave, {name}. Happy Halloween! 🎃'
    }
  },
  christmas: {
    key: 'christmas', label: 'Christmas', emoji: '🎅',
    brand: 'North Pole Post', tagline: 'est. the first snow',
    heroTitle: 'A cinematic letter from <em>Santa</em>, just for your child.',
    heroSub: 'Add a name and a good deed, then watch it come to life with music — free. Love it? Send it for a tiny price.',
    senderName: 'Santa Claus', senderTitle: 'Office of Santa Claus', dateline: 'North Pole',
    badge: 'On the Nice List', pricePaise: 1000,
    colors: { bg:'#f7f0e4', paper:'#fffaf1', ink:'#2b2620', muted:'#6d6456', line:'#e4d8c2', primary:'#b23b32', secondary:'#1c5a40', accent:'#bb8c2b', deep:'#123c2b' },
    cine: { c1:'#2a4488', c2:'#0a1130', accent:'#ffd98a', particle:'snow' },
    letter: {
      greeting: 'Dear {name},',
      intro: 'All the way up here at the North Pole, the elves and I have been keeping a close eye on you — and {name}, I am so proud of you.',
      deed: 'I heard that you {deed}. That is exactly the kind of kindness that makes your name shine on my Nice List.',
      noDeed: 'You have been kind, brave and helpful this year, and your name shines bright on my Nice List.',
      age: 'Turning {age} is a big deal, you know. Big enough to keep being wonderful, and still small enough to believe in a little Christmas magic.',
      cityLine: 'The reindeer already know the way to {city}. ',
      closing: '{cityLine}So on Christmas Eve, hang your stocking, leave out a biscuit or two, and get a good night’s sleep. I’ll do the rest.',
      signoff: 'Keep being you, {name}. Merry Christmas! 🎄'
    }
  },
  newyear: {
    key: 'newyear', label: 'Happy New Year', emoji: '🎆',
    brand: 'Midnight Wishes', tagline: 'est. the stroke of twelve',
    heroTitle: 'A dazzling New Year letter, written just for your child.',
    heroSub: 'Add a name and a proud moment, then watch it sparkle with music — free. Love it? Send it for a tiny price.',
    senderName: 'Father Time', senderTitle: 'Office of the New Year', dateline: 'The Edge of Midnight',
    badge: 'On the Bright List', pricePaise: 1000,
    colors: { bg:'#0b1733', paper:'#13224a', ink:'#f5f1e0', muted:'#aab3cf', line:'#2a3a63', primary:'#e8b84b', secondary:'#3a6ea5', accent:'#f0c860', deep:'#060f26' },
    cine: { c1:'#20306a', c2:'#06102a', accent:'#f0c860', particle:'confetti' },
    letter: {
      greeting: 'Dear {name},',
      intro: 'As the old year tiptoes away and a new one sparkles into view, I wanted to write to you, {name}, because you made this year brighter.',
      deed: 'I heard that you {deed}. That is exactly the kind of spark that lights up a whole new year.',
      noDeed: 'You have been kind, brave and bright this year, and your name shines on my Bright List.',
      age: 'Turning {age} is a wonderful thing — a brand new number for a brand new year of adventures.',
      cityLine: 'The fireworks are already being readied over {city}. ',
      closing: '{cityLine}So when the clock strikes twelve, make a wish, hug someone you love, and step boldly into all that is to come.',
      signoff: "Here's to you, {name}. Happy New Year! 🎆"
    }
  }
};

function cap(s) { s = (s == null ? '' : String(s)).trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function fill(str, d) {
  return String(str == null ? '' : str)
    .replace(/\{name\}/g, d.name).replace(/\{age\}/g, d.age)
    .replace(/\{city\}/g, d.city).replace(/\{deed\}/g, d.deed)
    .replace(/\{cityLine\}/g, d.cityLine || '');
}

// Build the letter from a season skin + the form details.
function buildLetter(season, details) {
  details = details || {};
  const d = {
    name: cap(details.name) || 'Friend',
    age: (details.age == null ? '' : String(details.age)).trim(),
    city: cap(details.city),
    deed: (details.deed == null ? '' : String(details.deed)).trim()
  };
  const L = season.letter || {};
  const p = [];
  p.push(fill(L.greeting, d));
  p.push(fill(L.intro, d));
  p.push(d.deed ? fill(L.deed, d) : fill(L.noDeed, d));
  if (d.age) p.push(fill(L.age, d));
  const cityLine = d.city ? fill(L.cityLine, d) : '';
  p.push(fill(L.closing, Object.assign({}, d, { cityLine: cityLine })));
  p.push(fill(L.signoff, d));

  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return {
    name: d.name, paragraphs: p, date: date,
    emoji: season.emoji, senderName: season.senderName, senderTitle: season.senderTitle,
    dateline: season.dateline, badge: season.badge
  };
}

function activeSeason(cfg) {
  if (cfg && cfg.seasons && cfg.seasons[cfg.active]) return cfg.seasons[cfg.active];
  return DEFAULT_SEASONS[DEFAULT_ACTIVE];
}

module.exports = { DEFAULT_SEASONS, DEFAULT_ACTIVE, buildLetter, activeSeason };
