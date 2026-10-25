/* Cinematic letter engine — shared by index.html (preview) and letter.html.
   Cinematic.render(mount, letter, templateId, {watermark, theme:{c1,c2,accent,particle}})
   Cinematic.buildLetter(season, details)  -> letter object (client-side preview)
   Cinematic.themeForSeason(key)           -> {c1,c2,accent,particle}
   Cinematic.music.toggle()/start()/stop()/isPlaying()/onChange(fn)
   Cinematic.templates -> scene shapes */
(function () {
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  var TEMPLATES = [
    { id:'globe',    name:'Snow Globe', emoji:'🔮' },
    { id:'envelope', name:'Envelope',   emoji:'✉️' },
    { id:'stars',    name:'Night Sky',  emoji:'✨' },
    { id:'fire',     name:'Fireside',   emoji:'🔥' }
  ];

  var SEASON_THEMES = {
    halloween: { c1:'#3a1d5c', c2:'#0e0a18', accent:'#ff8a3d', particle:'bats' },
    christmas: { c1:'#2a4488', c2:'#0a1130', accent:'#ffd98a', particle:'snow' },
    newyear:   { c1:'#20306a', c2:'#06102a', accent:'#f0c860', particle:'confetti' }
  };
  var DEFAULT_THEME = SEASON_THEMES.christmas;

  function cardHTML(L) {
    var lines = (L.paragraphs || []).map(function (p, i) { return '<p style="--i:' + i + '">' + esc(p) + '</p>'; }).join('');
    return '' +
      '<div class="np"><div class="mark">' + esc(L.emoji || '🎅') + '</div><b>' + esc(L.senderTitle || 'Office of Santa Claus') + '</b>' +
      '<small>' + esc(L.dateline || 'North Pole') + ' · ' + esc(L.date || '') + '</small></div>' +
      '<div class="lbody">' + lines + '</div>' +
      '<div class="sign"><div class="santa">' + esc(L.senderName || 'Santa Claus') + '</div>' +
      '<span class="nice">✓ ' + esc(L.badge || 'On the Nice List') + '</span></div>';
  }

  /* ---------- particles (snow / stars / embers / bats / confetti) ---------- */
  var activeParticles = null;
  var CONFETTI_COLORS = ['#f0c860', '#e8b84b', '#ff7a1a', '#4fb286', '#6aa0ff', '#ff6b9d'];
  function createParticles(canvas, mode) {
    var ctx = canvas.getContext('2d'), raf, items = [], running = true;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    function size() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    function seed() {
      items = []; var w = canvas.width, h = canvas.height, n, i;
      if (mode === 'stars') n = Math.min(130, Math.round(w / 8));
      else if (mode === 'embers') n = 44;
      else if (mode === 'bats') n = Math.min(14, Math.round(w / 60));
      else if (mode === 'confetti') n = Math.min(90, Math.round(w / 9));
      else if (mode === 'snow') n = Math.min(120, Math.round(w / 8));
      else n = Math.min(60, Math.round(w / 16));
      for (i = 0; i < n; i++) {
        if (mode === 'stars') items.push({ x:Math.random()*w, y:Math.random()*h, r:Math.random()*1.6+0.3, tw:Math.random()*6.28, sp:Math.random()*0.045+0.01 });
        else if (mode === 'embers') items.push({ x:Math.random()*w, y:h+Math.random()*h, r:Math.random()*2+1, s:Math.random()*0.9+0.4, d:Math.random()*0.6-0.3, life:Math.random() });
        else if (mode === 'bats') items.push({ x:Math.random()*w, y:Math.random()*h, s:Math.random()*0.5+0.25, d:Math.random()*0.7-0.35, sz:Math.random()*14+16, ph:Math.random()*6.28 });
        else if (mode === 'confetti') items.push({ x:Math.random()*w, y:Math.random()*h-h, s:Math.random()*1.4+0.8, d:Math.random()*0.8-0.4, rot:Math.random()*6.28, vr:Math.random()*0.2-0.1, col:CONFETTI_COLORS[(Math.random()*CONFETTI_COLORS.length)|0], w:Math.random()*5+4, h:Math.random()*8+5 });
        else items.push({ x:Math.random()*w, y:Math.random()*h, r:Math.random()*2.6+0.8, s:Math.random()*0.6+0.25, d:Math.random()*0.7-0.35 });
      }
    }
    function draw() {
      var w = canvas.width, h = canvas.height, i, p; ctx.clearRect(0, 0, w, h);
      if (mode === 'stars') {
        for (i=0;i<items.length;i++){ p=items[i]; p.tw+=p.sp; var a=0.35+0.65*Math.abs(Math.sin(p.tw)); ctx.fillStyle='rgba(255,255,255,'+a+')'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.28); ctx.fill(); }
      } else if (mode === 'embers') {
        for (i=0;i<items.length;i++){ p=items[i]; ctx.fillStyle='rgba(255,'+Math.round(140+90*p.life)+',60,'+(0.5*p.life+0.15)+')'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.28); ctx.fill(); p.y-=p.s; p.x+=p.d; p.life-=0.008; if(p.y<0||p.life<=0){ p.y=h+5; p.x=Math.random()*w; p.life=1; } }
      } else if (mode === 'bats') {
        ctx.textAlign='center'; ctx.textBaseline='middle';
        for (i=0;i<items.length;i++){ p=items[i]; p.ph+=0.05; ctx.font=p.sz+'px serif'; ctx.globalAlpha=0.85; ctx.fillText('🦇', p.x, p.y+Math.sin(p.ph)*4); ctx.globalAlpha=1; p.y+=p.s; p.x+=p.d+Math.sin(p.ph)*0.4; if(p.y>h+10){ p.y=-10; p.x=Math.random()*w; } if(p.x<-20)p.x=w+10; if(p.x>w+20)p.x=-10; }
      } else if (mode === 'confetti') {
        for (i=0;i<items.length;i++){ p=items[i]; p.rot+=p.vr; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.col; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore(); p.y+=p.s; p.x+=p.d; if(p.y>h+10){ p.y=-10; p.x=Math.random()*w; } }
      } else {
        ctx.fillStyle='rgba(255,255,255,.82)';
        for (i=0;i<items.length;i++){ p=items[i]; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.28); ctx.fill(); p.y+=p.s; p.x+=p.d; if(p.y>h){ p.y=-5; p.x=Math.random()*w; } }
      }
      if (running) raf = requestAnimationFrame(draw);
    }
    size(); seed(); draw(); if (reduce) { running = false; cancelAnimationFrame(raf); }
    var onResize = function () { size(); seed(); };
    window.addEventListener('resize', onResize);
    return { stop: function () { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); } };
  }
  function startParticles(canvas, mode) { if (activeParticles) activeParticles.stop(); activeParticles = createParticles(canvas, mode); }

  /* ---------- render a scene ---------- */
  function render(mount, L, tplId, opts) {
    opts = opts || {};
    var theme = opts.theme || DEFAULT_THEME;
    var tpl = null;
    for (var i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].id === tplId) tpl = TEMPLATES[i];
    if (!tpl) tpl = TEMPLATES[0];

    var extra = '';
    if (tpl.id === 'envelope') extra = '<div class="env-flap"></div><div class="env-pocket"></div>';
    if (tpl.id === 'fire') extra = '<div class="fire"><i style="left:8%"></i><i style="left:28%;animation-delay:.3s"></i><i style="left:48%;animation-delay:.6s"></i><i style="left:68%;animation-delay:.2s"></i><i style="left:88%;animation-delay:.5s"></i></div>';

    mount.innerHTML =
      '<div class="cine" data-tpl="' + tpl.id + '">' +
        '<canvas class="cine-particles"></canvas>' +
        '<div class="cine-stage"><div class="cine-frame">' + extra + '<div class="card">' + cardHTML(L) + '</div></div></div>' +
        (opts.watermark ? '<div class="cine-watermark">Preview · tap Send to unlock</div>' : '') +
      '</div>';

    var cine = mount.querySelector('.cine');
    cine.style.setProperty('--accent', theme.accent || DEFAULT_THEME.accent);
    cine.style.setProperty('--cine-bg', 'radial-gradient(120% 95% at 50% 0%, ' + (theme.c1 || DEFAULT_THEME.c1) + ', ' + (theme.c2 || DEFAULT_THEME.c2) + ' 72%)');
    startParticles(cine.querySelector('.cine-particles'), theme.particle || 'snow');
    requestAnimationFrame(function () { requestAnimationFrame(function () { cine.classList.add('play'); }); });
    return tpl;
  }

  /* ---------- client-side letter builder (for the free preview) ---------- */
  function cap(s){ s=(s==null?'':String(s)).trim(); return s?s.charAt(0).toUpperCase()+s.slice(1):s; }
  function fill(str, d){ return String(str==null?'':str).replace(/\{name\}/g,d.name).replace(/\{age\}/g,d.age).replace(/\{city\}/g,d.city).replace(/\{deed\}/g,d.deed).replace(/\{cityLine\}/g,d.cityLine||''); }
  function buildLetter(season, details){
    details = details || {}; var Lt = (season && season.letter) || {};
    var d = { name:cap(details.name)||'Friend', age:(details.age==null?'':String(details.age)).trim(), city:cap(details.city), deed:(details.deed==null?'':String(details.deed)).trim() };
    var p=[]; p.push(fill(Lt.greeting,d)); p.push(fill(Lt.intro,d));
    p.push(d.deed?fill(Lt.deed,d):fill(Lt.noDeed,d));
    if(d.age && Lt.age) p.push(fill(Lt.age,d));
    var cityLine = d.city ? fill(Lt.cityLine,d) : '';
    p.push(fill(Lt.closing, Object.assign({},d,{cityLine:cityLine})));
    p.push(fill(Lt.signoff,d));
    var date=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
    return { name:d.name, paragraphs:p, date:date, emoji:season.emoji, senderName:season.senderName, senderTitle:season.senderTitle, dateline:season.dateline, badge:season.badge };
  }

  /* ---------- music: a different public-domain tune per season ---------- */
  var SEASON_TUNES = { halloween: 'horror', christmas: 'jingle', newyear: 'auld' };
  var N = { C3:130.81, D3:146.83, Eb3:155.56, E3:164.81, F3:174.61, G3:196, Ab3:207.65, A3:220, Bb3:233.08, B3:246.94,
            C4:261.63, Db4:277.18, D4:293.66, Eb4:311.13, E4:329.63, F4:349.23, G4:392.00, A4:440, B4:493.88, C5:523.25, D5:587.33 };
  var TUNES = {
    // Jingle Bells — bright triangle
    jingle: { beat:0.34, wave:'triangle', detune:0, drone:0, gain:0.15,
      notes:[[N.E4,1],[N.E4,1],[N.E4,2],[N.E4,1],[N.E4,1],[N.E4,2],[N.E4,1],[N.G4,1],[N.C4,1.5],[N.D4,0.5],[N.E4,3],
             [N.F4,1],[N.F4,1],[N.F4,1.5],[N.F4,0.5],[N.F4,1],[N.E4,1],[N.E4,0.5],[N.E4,0.5],[N.E4,1],[N.D4,1],[N.D4,1],[N.E4,1],[N.D4,2],[N.G4,2]] },
    // Eerie, slow, chromatic minor theme with a low drone — Halloween
    horror: { beat:0.5, wave:'sawtooth', detune:9, drone:55, gain:0.085,
      notes:[[N.D4,1.5],[N.Eb4,0.5],[N.D4,1],[N.Db4,1],[N.B3,2],
             [N.D4,1.5],[N.Eb4,0.5],[N.D4,1],[N.A3,1],[N.Bb3,2],
             [N.A3,1],[N.Bb3,1],[N.B3,1],[N.A3,1],[N.Ab3,2],
             [0,1],[N.D3,4]] },
    // Auld Lang Syne — warm triangle, New Year
    auld: { beat:0.42, wave:'triangle', detune:0, drone:0, gain:0.14,
      notes:[[N.C4,1],[N.F4,1.5],[N.F4,0.5],[N.F4,1],[N.A4,1],[N.G4,1.5],[N.F4,0.5],[N.G4,1],[N.A4,1],
             [N.F4,1.5],[N.F4,0.5],[N.A4,1],[N.C5,1],[N.D5,2],[N.D5,1],[N.C5,1],[N.A4,1],[N.F4,1],[N.G4,2]] }
  };
  var music = (function () {
    var actx=null, playing=false, timer=null, cb=null, tune=TUNES.jingle, audioEl=null, audioUrl=null;
    function once() {
      if (!actx) return; var beat=tune.beat, t=actx.currentTime+0.06, start=t;
      tune.notes.forEach(function (nd) {
        var f=nd[0], dur=nd[1]*beat;
        if (f>0) {
          (tune.detune ? [0, tune.detune] : [0]).forEach(function (dt) {
            var o=actx.createOscillator(), g=actx.createGain();
            o.type=tune.wave; o.frequency.value=f; if (dt) o.detune.value=dt;
            g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(tune.gain,t+0.03); g.gain.exponentialRampToValueAtTime(0.0001,t+dur*0.9);
            o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t+dur);
          });
        }
        t+=dur;
      });
      var total=t-start;
      if (tune.drone) {
        var od=actx.createOscillator(), gd=actx.createGain();
        od.type='sine'; od.frequency.value=tune.drone;
        gd.gain.setValueAtTime(0.0001,start); gd.gain.exponentialRampToValueAtTime(0.05,start+0.6);
        gd.gain.setValueAtTime(0.05, Math.max(start+0.7, start+total-0.6)); gd.gain.exponentialRampToValueAtTime(0.0001,start+total);
        od.connect(gd); gd.connect(actx.destination); od.start(start); od.stop(start+total+0.1);
      }
      timer=setTimeout(function () { if (playing) once(); }, (total+0.5)*1000);
    }
    function fire(){ if(cb) cb(playing); }
    function setAudio(url){
      audioUrl = url || null;
      if (audioUrl) {
        if (!audioEl) { audioEl = new Audio(); audioEl.loop = true; audioEl.preload = 'auto'; audioEl.volume = 0.5; }
        if (audioEl.getAttribute('data-src') !== audioUrl) { audioEl.src = audioUrl; audioEl.setAttribute('data-src', audioUrl); }
      }
    }
    function start(){
      try {
        if (audioUrl) {
          if (!audioEl) setAudio(audioUrl);
          var pr = audioEl.play();
          if (pr && pr.then) pr.then(function(){ playing=true; fire(); }).catch(function(){ playing=false; fire(); });
          else { playing=true; fire(); }
          return;
        }
        if (!actx) actx = new (window.AudioContext||window.webkitAudioContext)();
        if (actx.state==='suspended') actx.resume();
        if (!playing){ playing=true; once(); fire(); }
      } catch(e){}
    }
    function stop(){ playing=false; if (audioEl) { try{ audioEl.pause(); }catch(e){} } if (timer) clearTimeout(timer); fire(); }
    function toggle(){ playing?stop():start(); }
    function setSeason(key){ var name=SEASON_TUNES[key]; if(name && TUNES[name]) tune=TUNES[name]; }
    return { start:start, stop:stop, toggle:toggle, isPlaying:function(){return playing;}, onChange:function(f){cb=f;}, setSeason:setSeason, setAudio:setAudio };
  })();

  /* ---------- shareable card image (needs html2canvas on the page) ---------- */
  var DECOR_BY_SEASON = { halloween:['🎃','🕸️','👻','🕯️','🦇'], christmas:['🎄','🎁','⛄','🔔','❄️'], newyear:['🎆','🥂','🎉','🕛','✨'] };
  var PRIMARY_BY_SEASON = { halloween:'#ff7a1a', christmas:'#b23b32', newyear:'#c79a20' };
  function decorFor(k){ return DECOR_BY_SEASON[k] || DECOR_BY_SEASON.christmas; }
  function primaryFor(k){ return PRIMARY_BY_SEASON[k] || '#b23b32'; }

  function cardImage(L, look){
    return new Promise(function (resolve, reject) {
      if (!window.html2canvas) { reject(new Error('html2canvas not loaded')); return; }
      look = look || {};
      var primary = look.primary || '#b23b32';
      var decor = (look.decor || []).map(function (e) { return '<span style="margin:0 9px;font-size:34px">' + e + '</span>'; }).join('');
      var lines = (L.paragraphs || []).map(function (p) { return '<p style="margin:0 0 14px">' + esc(p) + '</p>'; }).join('');
      var node = document.createElement('div');
      node.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;';
      node.innerHTML =
        '<div style="width:720px;box-sizing:border-box;padding:46px;font-family:Nunito,Arial,sans-serif;background:linear-gradient(160deg,' + (look.c1 || '#2a4488') + ',' + (look.c2 || '#0a1130') + ')">' +
          '<div style="background:#fffaf1;border-radius:16px;border-top:8px solid ' + primary + ';padding:44px;box-shadow:0 24px 60px rgba(0,0,0,.4)">' +
            '<div style="text-align:center">' +
              '<div style="font-size:54px;line-height:1">' + esc(L.emoji || '🎅') + '</div>' +
              '<div style="font-family:Fraunces,Georgia,serif;letter-spacing:3px;text-transform:uppercase;font-size:13px;font-weight:700;color:' + primary + ';margin-top:6px">' + esc(L.senderTitle || '') + '</div>' +
              '<div style="font-size:12px;color:#6d6456;letter-spacing:1px;margin-top:2px">' + esc(L.dateline || '') + ' · ' + esc(L.date || '') + '</div>' +
            '</div>' +
            '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:25px;line-height:1.7;margin-top:24px;color:#2b2620">' + lines + '</div>' +
            '<div style="margin-top:22px">' +
              '<div style="font-size:36px;color:' + primary + ';font-family:Fraunces,cursive">' + esc(L.senderName || '') + '</div>' +
              '<span style="display:inline-block;margin-top:10px;font-weight:800;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#1c5a40;border:2px solid #1c5a40;border-radius:99px;padding:6px 14px">✓ ' + esc(L.badge || '') + '</span>' +
            '</div>' +
          '</div>' +
          '<div style="text-align:center;margin-top:20px">' + decor + '</div>' +
          '<div style="text-align:center;margin-top:8px;color:rgba(255,255,255,.9);font-weight:700;font-size:14px">Make your own free · ' + esc(location.host) + '</div>' +
        '</div>';
      document.body.appendChild(node);
      window.html2canvas(node.firstChild, { backgroundColor: null, scale: 2, useCORS: true, logging: false }).then(function (canvas) {
        canvas.toBlob(function (blob) { if (node.parentNode) document.body.removeChild(node); blob ? resolve(blob) : reject(new Error('toBlob failed')); }, 'image/jpeg', 0.92);
      }).catch(function (e) { if (node.parentNode) document.body.removeChild(node); reject(e); });
    });
  }

  function shareOrSave(blob, text, filename) {
    try {
      var f = new File([blob], filename || 'card.jpg', { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [f] }) && navigator.share) {
        return navigator.share({ files: [f], text: text || '' }).catch(function () {});
      }
    } catch (e) {}
    var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = filename || 'card.jpg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return Promise.resolve('saved');
  }

  window.Cinematic = {
    templates: TEMPLATES, render: render, music: music, buildLetter: buildLetter,
    particles: createParticles, cardImage: cardImage, shareOrSave: shareOrSave,
    decorFor: decorFor, primaryFor: primaryFor,
    themeForSeason: function (k) { return SEASON_THEMES[k] || DEFAULT_THEME; }
  };
})();
