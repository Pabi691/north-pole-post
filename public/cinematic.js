/* Cinematic letter engine — shared by index.html (preview) and letter.html.
   window.Cinematic.render(mountEl, letter, templateId, {watermark})
   window.Cinematic.music.toggle()/start()/stop()/isPlaying()/onChange(fn)
   window.Cinematic.templates  -> [{id,name,...}] */
(function () {
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  var TEMPLATES = [
    { id:'globe',    name:'Snow Globe',   emoji:'🔮', particles:'snow-heavy' },
    { id:'envelope', name:'Envelope',     emoji:'✉️', particles:'snow-light' },
    { id:'stars',    name:'Starry Night', emoji:'✨', particles:'stars' },
    { id:'fire',     name:'Fireside',     emoji:'🔥', particles:'embers' }
  ];

  function cardHTML(L) {
    var lines = (L.paragraphs || []).map(function (p, i) {
      return '<p style="--i:' + i + '">' + esc(p) + '</p>';
    }).join('');
    return '' +
      '<div class="np"><div class="mark">🎅</div><b>Office of Santa Claus</b><small>North Pole · ' + esc(L.date || '') + '</small></div>' +
      '<div class="lbody">' + lines + '</div>' +
      '<div class="sign"><div class="santa">Santa Claus</div><span class="nice">✓ On the Nice List</span></div>';
  }

  /* ---------- particles ---------- */
  var activeParticles = null;
  function startParticles(canvas, mode) {
    if (activeParticles) { activeParticles.stop(); activeParticles = null; }
    var ctx = canvas.getContext('2d'), raf, items = [], running = true;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    function size() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    function seed() {
      items = []; var w = canvas.width, h = canvas.height, n;
      if (mode === 'stars') n = Math.min(130, Math.round(w / 8));
      else if (mode === 'embers') n = 44;
      else if (mode === 'snow-heavy') n = Math.min(120, Math.round(w / 8));
      else n = Math.min(60, Math.round(w / 16));
      for (var i = 0; i < n; i++) {
        if (mode === 'stars') items.push({ x: Math.random()*w, y: Math.random()*h, r: Math.random()*1.6+0.3, tw: Math.random()*6.28, sp: Math.random()*0.045+0.01 });
        else if (mode === 'embers') items.push({ x: Math.random()*w, y: h+Math.random()*h, r: Math.random()*2+1, s: Math.random()*0.9+0.4, d: Math.random()*0.6-0.3, life: Math.random() });
        else items.push({ x: Math.random()*w, y: Math.random()*h, r: Math.random()*2.6+0.8, s: Math.random()*0.6+0.25, d: Math.random()*0.7-0.35 });
      }
    }
    function draw() {
      var w = canvas.width, h = canvas.height, i, p; ctx.clearRect(0,0,w,h);
      if (mode === 'stars') {
        for (i=0;i<items.length;i++){ p=items[i]; p.tw+=p.sp; var a=0.35+0.65*Math.abs(Math.sin(p.tw)); ctx.fillStyle='rgba(255,255,255,'+a+')'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.28); ctx.fill(); }
      } else if (mode === 'embers') {
        for (i=0;i<items.length;i++){ p=items[i]; ctx.fillStyle='rgba(255,'+Math.round(140+90*p.life)+',60,'+(0.5*p.life+0.15)+')'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.28); ctx.fill(); p.y-=p.s; p.x+=p.d; p.life-=0.008; if(p.y<0||p.life<=0){ p.y=h+5; p.x=Math.random()*w; p.life=1; } }
      } else {
        ctx.fillStyle='rgba(255,255,255,.82)';
        for (i=0;i<items.length;i++){ p=items[i]; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.28); ctx.fill(); p.y+=p.s; p.x+=p.d; if(p.y>h){ p.y=-5; p.x=Math.random()*w; } }
      }
      if (running) raf = requestAnimationFrame(draw);
    }
    size(); seed(); draw(); if (reduce) { running = false; cancelAnimationFrame(raf); }
    var onResize = function () { size(); seed(); };
    window.addEventListener('resize', onResize);
    activeParticles = { stop: function () { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); } };
  }

  /* ---------- render a scene ---------- */
  function render(mount, L, tplId, opts) {
    opts = opts || {};
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
    startParticles(cine.querySelector('.cine-particles'), tpl.particles);
    requestAnimationFrame(function () { requestAnimationFrame(function () { cine.classList.add('play'); }); });
    return tpl;
  }

  /* ---------- music: gentle synth of "Jingle Bells" (public domain) ---------- */
  var music = (function () {
    var FREQ = { C:261.63, D:293.66, E:329.63, F:349.23, G:392.00, A:440, B:493.88 };
    var M = [['E',1],['E',1],['E',2],['E',1],['E',1],['E',2],['E',1],['G',1],['C',1.5],['D',0.5],['E',3],
             ['F',1],['F',1],['F',1.5],['F',0.5],['F',1],['E',1],['E',0.5],['E',0.5],['E',1],['D',1],['D',1],['E',1],['D',2],['G',2]];
    var actx = null, playing = false, timer = null, cb = null;
    function once() {
      if (!actx) return; var beat = 0.34, t = actx.currentTime + 0.06;
      M.forEach(function (nd) {
        var f = FREQ[nd[0]], dur = nd[1]*beat, o = actx.createOscillator(), g = actx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.15, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur*0.92);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur); t += dur;
      });
      timer = setTimeout(function () { if (playing) once(); }, (t - actx.currentTime + 0.5) * 1000);
    }
    function fire() { if (cb) cb(playing); }
    function start() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); if (!playing) { playing = true; once(); fire(); } } catch (e) {} }
    function stop() { playing = false; if (timer) clearTimeout(timer); fire(); }
    function toggle() { playing ? stop() : start(); }
    return { start: start, stop: stop, toggle: toggle, isPlaying: function () { return playing; }, onChange: function (f) { cb = f; } };
  })();

  window.Cinematic = { templates: TEMPLATES, render: render, music: music };
})();
