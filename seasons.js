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

// Friends cards — a punchier, grown-up voice per season (not editable in admin for now).
const FRIENDS = {
  halloween: {
    emoji: '🖤', senderName: 'The Spirits of Spooky Hollow', senderTitle: 'A Midnight Summons', dateline: 'Spooky Hollow, after dark', badge: 'Certified Spooky',
    letter: {
      greeting: 'Hey {name},',
      intro: 'The candles flickered, the floorboards creaked, and your name drifted up from the dark — {name}, the spirits of Spooky Hollow have been talking about you.',
      deed: 'Word is that you {deed}. Honestly? Iconic. That is exactly the kind of mischief we love around here.',
      noDeed: 'Word is that you are the kind of legend every haunt needs — equal parts trouble and treasure.',
      age: '', cityLine: 'We will be drifting through {city} after dark. ',
      closing: '{cityLine}So grab a drink, light a candle, and if the lights flicker tonight… that is just us, saying hi. 👀',
      signoff: 'Stay spooky, {name}. Happy Halloween! 🎃🖤'
    }
  },
  christmas: {
    emoji: '🎄', senderName: 'An Old Friend at the North Pole', senderTitle: 'A Christmas Note', dateline: 'North Pole', badge: 'On the Good List',
    letter: {
      greeting: 'Hey {name},',
      intro: 'All the way from a snowbound little workshop, I wanted to send you a note, {name} — because the best part of this season is the people in it, and you are one of mine.',
      deed: 'Rumour has it you {deed}. Consider yourself firmly, permanently on the Good List.',
      noDeed: 'You have made this year warmer just by being you — firmly on the Good List, no questions asked.',
      age: '', cityLine: 'The sleigh route runs right over {city} this year. ',
      closing: '{cityLine}So pour something warm, steal the comfiest seat, and know that someone is thinking of you this Christmas.',
      signoff: 'Merry Christmas, {name}! 🎄'
    }
  },
  newyear: {
    emoji: '🥂', senderName: 'Father Time (and me)', senderTitle: 'A Midnight Toast', dateline: 'The Edge of Midnight', badge: 'Ready for Round Twelve',
    letter: {
      greeting: 'Hey {name},',
      intro: 'As the clock winds down on another year, {name}, I raised a glass to you — because you helped make this one worth remembering.',
      deed: 'This was the year you {deed}. Legendary. Here is to doing it all again, only louder.',
      noDeed: 'This was a big year, and you were a big part of what made it good. Here is to the next one.',
      age: '', cityLine: 'The fireworks over {city} are going to be unreal this year. ',
      closing: '{cityLine}So when midnight hits, make some noise, hug whoever is closest, and let us make the new year ridiculous — the good kind.',
      signoff: 'Happy New Year, {name}! 🥂'
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

// Build a letter from a "card" (a season skin, or a friends card) + the details.
function buildFromCard(card, details) {
  details = details || {};
  const d = {
    name: cap(details.name) || 'Friend',
    age: (details.age == null ? '' : String(details.age)).trim(),
    city: cap(details.city),
    deed: (details.deed == null ? '' : String(details.deed)).trim()
  };
  const L = card.letter || {};
  const p = [];
  p.push(fill(L.greeting, d));
  p.push(fill(L.intro, d));
  p.push(d.deed ? fill(L.deed, d) : fill(L.noDeed, d));
  if (d.age && L.age) p.push(fill(L.age, d));
  const cityLine = d.city ? fill(L.cityLine, d) : '';
  p.push(fill(L.closing, Object.assign({}, d, { cityLine: cityLine })));
  p.push(fill(L.signoff, d));

  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return {
    name: d.name, paragraphs: p, date: date,
    emoji: card.emoji, senderName: card.senderName, senderTitle: card.senderTitle,
    dateline: card.dateline, badge: card.badge
  };
}

function friendsCard(season) { return FRIENDS[(season && season.key)] || FRIENDS[DEFAULT_ACTIVE] || FRIENDS.halloween; }

// mode: 'kids' (default) uses the season's own letter; 'friends' uses the friends card.
function buildLetter(season, details, mode) {
  return buildFromCard(mode === 'friends' ? friendsCard(season) : season, details);
}

function activeSeason(cfg) {
  if (cfg && cfg.seasons && cfg.seasons[cfg.active]) return cfg.seasons[cfg.active];
  return DEFAULT_SEASONS[DEFAULT_ACTIVE];
}

module.exports = { DEFAULT_SEASONS, DEFAULT_ACTIVE, FRIENDS, buildLetter, friendsCard, activeSeason };
