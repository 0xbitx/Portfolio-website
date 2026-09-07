(function () {
  'use strict';

  // ===========================================================================
  //  Floating astronaut engine (supports N astronauts sharing one cursor/rocks)
  //  Refactored from the original single-astronaut inline script so the pink
  //  "girl" astronaut interacts exactly like the boy one.
  // ===========================================================================

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function setLimbTransform(node, angleDeg, pivotX, pivotY) {
    if (!node) return;
    node.setAttribute(
      'transform',
      'rotate(' + angleDeg.toFixed(2) + ' ' + pivotX + ' ' + pivotY + ')'
    );
  }

  function randomYapDelay() {
    var secs = [5, 10, 15, 20, 30];
    return secs[Math.floor(Math.random() * secs.length)] * 1000;
  }

  function randomPullHappyDelay() {
    var secs = [2, 4, 5, 6, 7];
    return secs[Math.floor(Math.random() * secs.length)] * 1000;
  }

  // -------------------------------------------------------------------------
  // Message pools (shared across instances — each instance tracks its own
  // "last message" so two astronauts never repeat each other's tail)
  // -------------------------------------------------------------------------
  var letGoMessages = [
    'Whoa, I slipped!', 'I lost my grip!', 'Come back here!', 'Weeeeee!',
    'Ano ba yan!', 'Sige na nga', 'Haysss.', 'Wait, I still need you!',
    'Ugh, not again...', 'Hanep na yan!', 'Ayoko na!', 'Ow, my string!',
    'Come baaack!', 'Taray mo naman!', 'Bakit mo ko binitawan?', 'Aray ko!',
    'Di ako makahinga dito!', 'Sige na nga mauna kana!', 'Nagmamadali???'
  ];
  var grabMessages = [
    'Gotcha!', 'Holding on tight!', 'This is my ride!', 'Nice, I caught it!',
    'Now we\'re connected.', 'Alright, let\'s go!', 'Got it!', 'Beam me up!',
    'Here we go!', 'Secured!', 'I\'m not letting go.', 'Yey!', 'Yohooo!'
  ];
  var yapMessages = [
    'So... you come here often?', 'Is it just me, or is space really quiet?',
    'I wonder if Mars has wifi...', 'Did I leave the oven on?',
    'Houston, can you hear me?', 'I could really go for some halo-halo right now.',
    'Gravity is just a suggestion, right?', 'Am I floating or is the world moving?',
    'One small step... wait, already did that.', 'I think I saw a shooting star.',
    'Do aliens get lonely too?', 'Should I wave at the satellites?',
    'This helmet is getting a bit stuffy.', 'I miss the sound of rain.',
    'Is anyone else out here?', 'Ang lamig dito, grabe...',
    'Space pizza would be nice right now.', 'Note to self: don\'t float too far.',
    'The stars are brighter than my future.', 'Parang biglang bumagal lahat...',
    'Imagine if I had pockets up here.', 'I should have packed more snacks.',
    'Zero gravity... zero problems.', 'Is that a UFO or am I dreaming?',
    'Kumusta naman dito sa space?', 'I\'m basically a shooting star, right?',
    'Somebody\'s gotta clean this debris.', 'Me, myself, and the void.'
  ];
  var pullMessages = [
    'Whoa, easy there!', 'Careful! I\'m attached to that!', 'You\'re gonna snap it!',
    'Hey, don\'t yank me!', 'Too hard! Slow down!', 'The string is stretching!',
    'Aray! Stop pulling!', 'Gently, please!', 'Dahan-dahan lang!', 'My arm! My arm!',
    'You\'re stretching me thin!', 'Ease up a bit!', 'Careful, it might break!',
    'Sakto lang, pre!', 'Hala, mabibitawan ko na!', 'Baka maputol yan!',
    'Kalmahan mo lang!', 'Wag biglaan, dahan-dahan!', 'Nako po!', 'Sobrang kapit na to!'
  ];
  var pullHappyMessages = [
    'Yohooo!', 'Hahaha this is fun!', 'Wheee!', 'Faster! Faster!', 'I love this!',
    'Yey, weee!', 'Spin me around!', 'Hahaha again!', 'This is the best!',
    'Yeyyy, let\'s go!', 'Sige pa! (more!)', 'Woooohooo!', 'Haha, masaya to!',
    'Don\'t stop!', 'I\'m dizzy but happy!', 'Sobrang saya!', 'Tuloy mo lang!',
    'Nakakahilo na pero go!', 'Grabeng saya neto!', 'Bilis pa! Bilis!', 'Wahahaha!',
    'Isa pa!', 'Ang saya-saya!', 'Unli saya to!', 'Ang galing mo!',
    'Hindi ako magsasawa!', 'Rampa na!', 'Buwis buhay pero worth it!'
  ];
  var hurtSmall = [
    'Ow! Stubbed a toe on that.', 'Tink! A pebble.', 'That little one tickled.',
    'Barely felt it.', 'Ow, my pinky!'
  ];
  var hurtMedium = [
    'Ouch! That rock hurt!', 'Aray! Ang sakit!', 'Ow ow ow!', 'Watch out!',
    'That asteroid got me!', 'Nako!', 'My helmet!', 'Aray ko po!', 'Ba\'t may bato dito?!'
  ];
  var hurtLarge = [
    'OUCH!!! THAT WAS HUGE!!', 'GRAVE! ANG LAKI NG TAMA!!', 'I\'M SEEING STARS!!',
    'That BODY-SLAMMED me!!', 'Totaled!!! I\'m done!', 'HEEEELP! Big rock!!',
    'YARI TALAGA AKO!!', 'LAKAS NG TAMA!!!'
  ];
  var nearAsteroidSmall = [
    'Oh, a tiny rock.', 'Just a pebble, no biggie.', 'That little one can\'t hurt.',
    'Small rock spotted.', 'Meh, just a speck.'
  ];
  var nearAsteroidMedium = [
    'Whoa, that asteroid is close!', 'Incoming asteroid!', 'Better dodge this one...',
    'Rock spotted!', 'Watch out for that asteroid!', 'Don\'t hit that!'
  ];
  var nearAsteroidLarge = [
    'OH NO, HUGE ASTEROID!!', 'DODGE! DODGE! DODGE!', 'ANG LAKI NITO! (IT\'S HUGE!)',
    'That thing is MASSIVE!', 'We\'re doomed!!!', 'Grab something!!',
    'LORD HAVE MERCY!', 'RUN! I mean FLOAT AWAY!'
  ];
  var chainGrabMessages = [
    'Grab my hand!', 'Hold on tight!', 'Don\'t let go!', 'We\'re a chain now!',
    'I got you!', 'Together we float!', 'No one drifts alone!'
  ];
  var chainReleaseMessages = [
    'You slipped away!', 'My hand!', 'We broke apart!', 'Come back!',
    'I lost you!', 'The chain snapped!'
  ];
  var handHoldMessages = [
    'Hold my hand tighter!', 'Your hand feels warm.', 'Don\'t let go, ok?',
    'This is nice.', 'We\'re holding hands!', 'Floating together is better.',
    'I\'ve got you.', 'Hand in hand!', 'Let\'s drift together.',
    'You\'re not alone up here.', 'Kalabit! (holding hands)', 'Ang cute natin magkahawak kamay!'
  ];

  // ===========================================================================
  //  Shared resources: cursor circle canvas + alien ship + floating rocks
  // ===========================================================================
  var canvas = document.getElementById('cursor-circle');
  var ctx = canvas ? canvas.getContext('2d') : null;
  var ship = document.getElementById('cursor-ship');
  var dpr = 1;

  function resizeCanvas() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  if (canvas) {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
  }

  // The cursor circle position + velocity, in viewport coords (trails the mouse)
  var ring = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    fx: window.innerWidth / 2,
    fy: window.innerHeight / 2
  };
  var mouse = { x: ring.x, y: ring.y, lastT: performance.now() };
  var cursorSpeed = 0;
  window.addEventListener('mousemove', function (e) {
    var nowMs = performance.now();
    var dms = nowMs - mouse.lastT;
    if (dms > 0) {
      var dx = e.clientX - mouse.x;
      var dy = e.clientY - mouse.y;
      var instSpeed = Math.sqrt(dx * dx + dy * dy) / (dms / 1000);
      cursorSpeed += (instSpeed - cursorSpeed) * 0.3;
      mouse.lastT = nowMs;
    }
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // Floating space rocks
  var rocks = [];
  var rockContainer = document.createElement('div');
  rockContainer.id = 'space-rocks';
  document.body.appendChild(rockContainer);

  var asteroidSVGs = [
    '<svg viewBox="0 0 100 100"><path d="M22 74 L10 42 Q12 18 48 12 Q82 14 88 44 L78 74 Q52 86 24 78 Z" fill="#9aa0b2" stroke="#4f5468" stroke-width="3"/><ellipse cx="48" cy="38" rx="14" ry="10" fill="#6b7186"/><ellipse cx="48" cy="38" rx="11" ry="7" fill="#575c70"/><circle cx="70" cy="60" r="7" fill="#6b7186"/><circle cx="34" cy="62" r="5" fill="#b7bcc9"/></svg>',
    '<svg viewBox="0 0 100 100"><path d="M18 66 L8 40 L22 16 Q48 6 74 20 L88 48 L70 80 Q40 88 20 70 Z" fill="#b08d5e" stroke="#6b5236" stroke-width="3"/><path d="M30 56 L26 34 Q50 24 74 40 L70 60 Q50 70 32 62 Z" fill="#4a3a28" opacity="0.5"/><circle cx="44" cy="34" r="6" fill="#cfae82"/><circle cx="66" cy="54" r="5" fill="#5d4630"/></svg>',
    '<svg viewBox="0 0 100 100"><path d="M24 72 L12 44 Q16 20 50 14 Q82 18 86 46 L72 76 Q48 86 26 78 Z" fill="#c98a63" stroke="#7a4a30" stroke-width="3"/><ellipse cx="40" cy="42" rx="12" ry="9" fill="#8a5638"/><circle cx="66" cy="58" r="6" fill="#a4673f"/><circle cx="28" cy="60" r="4" fill="#e0ad86"/></svg>',
    '<svg viewBox="0 0 100 100"><path d="M20 70 L10 44 Q16 20 50 14 Q82 18 86 46 L74 72 Q50 84 24 76 Z" fill="#7fa0a6" stroke="#456068" stroke-width="3"/><ellipse cx="52" cy="36" rx="13" ry="9" fill="#566f75"/><circle cx="70" cy="60" r="6" fill="#5f7a80"/><circle cx="32" cy="58" r="4" fill="#a9c2c6"/></svg>',
    '<svg viewBox="0 0 100 100"><path d="M24 76 L8 40 L20 14 Q50 4 80 18 L90 48 L72 80 Q46 90 24 78 Z" fill="#6b7078" stroke="#3a3e46" stroke-width="3"/><ellipse cx="44" cy="38" rx="12" ry="8" fill="#3f434b"/><circle cx="66" cy="56" r="7" fill="#4b5058"/><circle cx="34" cy="62" r="5" fill="#8b9098"/><circle cx="60" cy="72" r="4" fill="#2e3238"/></svg>',
    '<svg viewBox="0 0 100 100"><path d="M20 68 L10 40 Q14 16 48 10 Q82 14 88 42 L76 72 Q50 84 22 74 Z" fill="#9d8bb5" stroke="#5b4a72" stroke-width="3"/><ellipse cx="42" cy="40" rx="13" ry="9" fill="#6f5c8b"/><circle cx="68" cy="58" r="6" fill="#705f8c"/><circle cx="30" cy="58" r="4" fill="#bcabc9"/><circle cx="56" cy="22" r="4" fill="#7c6a99"/></svg>'
  ];
  var usedShapes = [];

  function makeRock() {
    var el = document.createElement('div');
    el.className = 'space-rock';
    var sizes = [80, 110, 140, 180];
    var s = sizes[Math.floor(Math.random() * sizes.length)];

    if (usedShapes.length >= asteroidSVGs.length) usedShapes = [];
    var shapeIdx;
    do {
      shapeIdx = Math.floor(Math.random() * asteroidSVGs.length);
    } while (usedShapes.indexOf(shapeIdx) !== -1);
    usedShapes.push(shapeIdx);

    el.innerHTML =
      '<span class="rock-inner" style="width:' + s + 'px;height:' + s + 'px;">' + asteroidSVGs[shapeIdx] + '</span>';
    rockContainer.appendChild(el);

    var docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, window.innerHeight);
    var sizeFactor = 180 / s;
    var rock = {
      el: el,
      size: s,
      x: Math.random() * window.innerWidth,
      y: Math.random() * docHeight,
      vx: (Math.random() - 0.5) * 50 * sizeFactor,
      vy: (Math.random() - 0.5) * 50 * sizeFactor,
      angle: Math.random() * 360,
      va: (Math.random() - 0.5) * 90 * sizeFactor
    };
    el.style.transform =
      'translate(' + rock.x + 'px, ' + (rock.y - window.scrollY) + 'px) ' +
      'translate(-50%, -50%) ' +
      'rotate(' + rock.angle + 'deg)';
    return rock;
  }

  var ROCK_COUNT = 12;
  for (var rk = 0; rk < ROCK_COUNT; rk++) {
    rocks.push(makeRock());
  }

  // All active astronaut instances (for shared render + collision loops)
  var astronauts = [];

  // ===========================================================================
  //  Shared render: rope(s) from gripping hands -> cursor, and the alien ship
  // ===========================================================================
  function drawRing(nowSec) {
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    var maxGrip = 0;
    for (var ai = 0; ai < astronauts.length; ai++) {
      if (astronauts[ai].getGrip() > maxGrip) maxGrip = astronauts[ai].getGrip();
    }

    var tt = nowSec || 0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw a braided rope from point A to point B (with sag + traveling wave).
    function drawRope(aX, aY, bX, bY, alpha) {
      var ddx = bX - aX;
      var ddy = bY - aY;
      var dlen = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      var ux = ddx / dlen;
      var uy = ddy / dlen;
      var px = -uy;
      var py = ux;

      var gvx = 0, gvy = 1;
      var gperp = px * gvx + py * gvy;
      if (gperp < 0) { px = -px; py = -py; gperp = -gperp; }

      var N = 60;
      function stringPoint(s) {
        var sag = gperp * dlen * 0.16 * Math.sin(Math.PI * s);
        var wave = Math.sin(s * Math.PI * 3 - tt * 4) * (dlen * 0.05) * Math.sin(Math.PI * s);
        var x = aX + ddx * s + px * (sag + wave);
        var y = aY + ddy * s + py * (sag + wave);
        return { x: x, y: y };
      }

      var ropeBase = 'rgba(255, 255, 255, ' + alpha + ')';
      var ropeDark = 'rgba(200, 205, 215, ' + alpha + ')';
      var ropeLit  = 'rgba(255, 255, 255, ' + alpha + ')';

      ctx.beginPath();
      for (var i = 0; i <= N; i++) {
        var p = stringPoint(i / N);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = ropeBase;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      for (var k = 0; k <= N; k++) {
        var sk = k / N;
        var pk = stringPoint(sk);
        var twist = Math.sin(sk * Math.PI * 10 - tt * 6) * 1.6;
        var bx = pk.x + px * twist;
        var by = pk.y + py * twist;
        if (k === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      }
      ctx.strokeStyle = ropeLit;
      ctx.lineWidth = 0.7;
      ctx.stroke();

      ctx.beginPath();
      for (var m = 0; m <= N; m++) {
        var sm = m / N;
        var pm = stringPoint(sm);
        var twist2 = Math.sin(sm * Math.PI * 10 - tt * 6 + Math.PI) * 1.6;
        var cx2 = pm.x + px * twist2;
        var cy2 = pm.y + py * twist2;
        if (m === 0) ctx.moveTo(cx2, cy2);
        else ctx.lineTo(cx2, cy2);
      }
      ctx.strokeStyle = ropeDark;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Draw a tether (string) from each gripping astronaut's hand to the ring.
    for (var a = 0; a < astronauts.length; a++) {
      var astro = astronauts[a];
      var grip = astro.getGrip();
      if (grip <= 0.05) continue;

      var hnd = astro.activeHandPosition();
      var alpha = (grip * 0.9).toFixed(2);
      drawRope(hnd.x, hnd.y, ring.x, ring.y, alpha);
    }

    // Hand-to-hand chains hold hands directly (no rope between astronauts) —
    // the pin constraint in each linked astronaut's step() keeps the hands
    // physically joined, so there is nothing to draw here.

    // position the cartoon alien ship at the ring
    if (ship) {
      var shipScale = 1 + maxGrip * 0.4;
      ship.style.transform =
        'translate(' + ring.x + 'px, ' + ring.y + 'px) ' +
        'translate(-50%, -50%) ' +
        'scale(' + shipScale.toFixed(3) + ')';
    }
  }

  // ===========================================================================
  //  Shared collision: floating rocks vs every astronaut
  // ===========================================================================
  function updateRocks(dt) {
    var docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, window.innerHeight);
    var scrollY = window.scrollY || 0;

    var maxGrip = 0;
    for (var g = 0; g < astronauts.length; g++) {
      if (astronauts[g].getGrip() > maxGrip) maxGrip = astronauts[g].getGrip();
    }

    for (var ri = 0; ri < rocks.length; ri++) {
      var r = rocks[ri];
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      var pad = r.size / 2;
      if (r.x < pad) { r.x = pad; r.vx = Math.abs(r.vx) * 0.6; }
      if (r.x > window.innerWidth - pad) { r.x = window.innerWidth - pad; r.vx = -Math.abs(r.vx) * 0.6; }
      if (r.y < pad) { r.y = pad; r.vy = Math.abs(r.vy) * 0.6; }
      if (r.y > docHeight - pad) { r.y = docHeight - pad; r.vy = -Math.abs(r.vy) * 0.6; }

      // bump with the alien ship (cursor)
      var shipR = 30 + maxGrip * 8;
      var dShip = Math.hypot(r.x - ring.x, (r.y - scrollY) - ring.y);
      if (dShip < shipR + r.size / 2) {
        var nx = (r.x - ring.x) / (dShip || 1);
        var ny = ((r.y - scrollY) - ring.y) / (dShip || 1);
        var pushForce = 70 * (90 / r.size);
        r.vx += nx * pushForce;
        r.vy += ny * pushForce;
        r.x = ring.x + nx * (shipR + r.size / 2);
        r.y = (ring.y + scrollY) + ny * (shipR + r.size / 2);
      }

      // bump against other page elements
      var bumpSel = 'header, .gh-icon, .icon-one, .term-titlebar, .term-dock, .about-figure';
      var bumpEls = document.querySelectorAll(bumpSel);
      for (var bi = 0; bi < bumpEls.length; bi++) {
        var be = bumpEls[bi];
        if (be === r.el || be.closest('.space-rock')) continue;
        var br = be.getBoundingClientRect();
        if (br.width === 0 || br.height === 0) continue;
        var elLeft = br.left;
        var elRight = br.right;
        var elTop = br.top + scrollY;
        var elBottom = br.bottom + scrollY;
        var cx2 = Math.max(elLeft, Math.min(r.x, elRight));
        var cy2 = Math.max(elTop, Math.min(r.y, elBottom));
        var dx2 = r.x - cx2;
        var dy2 = r.y - cy2;
        var d2 = Math.hypot(dx2, dy2);
        if (d2 < r.size / 2) {
          var nx2 = dx2 / (d2 || 1);
          var ny2 = dy2 / (d2 || 1);
          var bounceForce = 60 * (90 / r.size);
          r.x += nx2 * (r.size / 2 - d2 + 1);
          r.y += ny2 * (r.size / 2 - d2 + 1);
          r.vx += nx2 * bounceForce;
          r.vy += ny2 * bounceForce;
        }
      }

      // collide with every astronaut
      for (var ai = 0; ai < astronauts.length; ai++) {
        var astro = astronauts[ai];
        var state = astro.state;
        var size = astro.size;

        // The astronaut's visible body is only a fraction of its div width:
        // the SVG spans 120 viewBox units but the suit body is ~70 units wide,
        // and the whole SVG renders at 0.70 of the div. True body radius in px
        // is therefore ~size * 0.20, not size * 0.5. This keeps rock bumps
        // from triggering while the rock is still visually far away.
        var astroR = size * 0.20;
        var nearR = astroR + r.size * 0.9;
        var dAstro = Math.hypot(r.x - state.x, (r.y - scrollY) - state.y);

        if (dAstro < nearR && dAstro >= astroR + r.size / 2) {
          astro.maybeNearAsteroid(r.size);
        }

        if (dAstro < astroR + r.size / 2) {
          var ax2 = (state.x - r.x) / (dAstro || 1);
          var ay2 = (state.y - (r.y - scrollY)) / (dAstro || 1);
          var mass = r.size * r.size;
          var rockSpeed = Math.hypot(r.vx, r.vy);
          var impact = clamp(0.00002 * mass * (2 + rockSpeed), 0, 3);

          state.vx += ax2 * impact * 60;
          state.vy += ay2 * impact * 60;

          var hitHeight = state.y - (r.y - scrollY);
          var lever = (r.x - state.x);
          var spinTorque = -lever * impact * 0.5 + hitHeight * impact * 0.2;
          state.va += clamp(spinTorque, -60, 60);

          var rockReaction = (90 / r.size) * (impact * 40 + 30);
          r.vx -= ax2 * rockReaction;
          r.vy -= ay2 * rockReaction;

          astro.maybeHurt(r.size);
        }
      }

      r.angle += r.va * dt;
      r.el.style.transform =
        'translate(' + r.x + 'px, ' + (r.y - scrollY) + 'px) ' +
        'translate(-50%, -50%) ' +
        'rotate(' + r.angle.toFixed(2) + 'deg)';
    }
  }

  // ===========================================================================
  //  Astronaut factory
  // ===========================================================================
  function createAstronaut(cfg) {
    var el = cfg.el;
    if (!el) return null;

    var size = el.getBoundingClientRect().width || 90;

    // The SVG renders at 70% of the astronaut div width, so the viewBox (120
    // units wide) maps to (size * 0.70) px. This is the true px-per-viewBox-unit
    // scale used to convert arm/shoulder offsets to screen px.
    var SC = size * 0.70 / 120;

    var w = window.innerWidth;
    var h = window.innerHeight;

    var state = {
      x: cfg.x !== undefined ? cfg.x : w * 0.72,
      y: cfg.y !== undefined ? cfg.y : h * 0.38,
      vx: 0,
      vy: 0,
      angle: (Math.random() - 0.5) * 12,
      va: 0
    };

    var leftArm = el.querySelector('.left-arm');
    var rightArm = el.querySelector('.right-arm');
    var leftLeg = el.querySelector('.left-leg');
    var rightLeg = el.querySelector('.right-leg');

    var rightHand = el.querySelector('.arm.right-arm circle[id$="hand"], .arm.right-arm .hand')
      || el.querySelector('.right-arm circle');
    var leftHand = el.querySelector('.arm.left-arm circle[id$="hand"], .arm.left-arm .hand')
      || el.querySelector('.left-arm circle');

    // wander phases per axis
    var phases = {
      x: Math.random() * Math.PI * 2,
      y: Math.random() * Math.PI * 2,
      a: Math.random() * Math.PI * 2
    };
    var limbPhase = {};

    var hover = false;
    var hoverT = 0;
    el.addEventListener('mouseenter', function () { hover = true; });
    el.addEventListener('mouseleave', function () { hover = false; });

    var SLOW_SPEED = 220;
    var FAST_SPEED = 900;
    var TOUCH_RADIUS = 28;
    var grip = 0;
    var holdSide = 'right';
    var STRING_LEN = size * 0.55;

    // ---- hand-to-hand chain state (holds onto another astronaut) ----
    var chainPartner = null;        // other astronaut (interface) held / holding
    var chainRole = 'none';         // 'none' | 'anchor' (on alien) | 'linked'
    var linkSide = 'left';          // this astronaut's hand that holds the partner
    var linkGrip = 0;               // 0 released .. 1 holding tight
    var linkTarget = false;         // master requests link formation
    var wasLinkHolding = false;
    var freeSide = 1;               // +1 = free hand on right, -1 = left (explicitly set toward partner)

    // speech bubble (each astronaut associates with its own via data-bubble)
    var bubbleId = el.getAttribute('data-bubble');
    var bubble = bubbleId ? document.getElementById(bubbleId) : null;
    var bubbleText = bubble ? bubble.querySelector('.astro-bubble-svg text') : null;

    var sections = [
      { id: 's-home',       msg: 'Welcome aboard!' },
      { id: 's-about',      msg: 'Hey, I\'m 0xbit — nice to meet you!' },
      { id: 's-experience', msg: 'Been tinkering with Linux for years...' },
      { id: 's-projects',   msg: 'Check out my offensive security tools!' },
      { id: 's-services',   msg: 'Here\'s what I can build for you.' },
      { id: 's-skills',     msg: 'These are my favourite toys.' }
    ];
    var currentMessage = '';
    var bubbleTimer = null;

    // Track the last actually-shown bubble so (a) two different triggers never
    // repeat the exact same line back-to-back, and (b) reactions that happen at
    // nearly the same moment are staggered by a split-second instead of firing
    // together.
    var lastShownText = '';
    var lastShownAt = 0;
    var pendingShowMsg = null;
    var pendingShowTimer = null;

    var navDwellEl = null;
    var navDwellStart = 0;
    var navDwellMsgShown = false;
    var navClicked = false;
    var navHandAnim = 0;
    var wasHolding = false;
    var welcomeShown = false;
    var infoDwellStart = 0;
    var currentSectionId = '';
    var sectionEnterTime = 0;
    var sectionMsgShown = false;
    var minDwellBtn = null;
    var minDwellStart = 0;
    var minDone = false;
    var nextYapTime = 0;
    var wasPulled = false;
    var nextPullHappyTime = 0;
    var wasPullHappy = false;

    var lastLetGoMsg = '';
    var letGoMessageTime = 0;
    var lastGrabMsg = '';
    var grabMessageTime = 0;
    var lastYapMsg = '';
    var yapMessageTime = 0;
    var lastPullMsg = '';
    var pullMessageTime = 0;
    var lastPullHappyMsg = '';
    var pullHappyMessageTime = 0;
    var lastHurtMsg = '';
    var hurtMessageTime = 0;
    var lastNearAsteroidMsg = '';
    var nearAsteroidMessageTime = 0;
    var lastChainMsg = '';
    var chainMessageTime = 0;
    var lastHandHoldMsg = '';
    var handHoldMessageTime = 0;
    var nextHandHoldTime = 0;

    function hideBubble() {
      if (bubble) bubble.classList.remove('show');
    }

    function showBubble(msg) {
      if (!bubble || !bubbleText) return;
      renderBubble(msg);
    }

    // Actually renders the text into the bubble (no stagger logic here).
    function renderBubble(msg) {
      lastShownText = msg;
      lastShownAt = performance.now();
      bubbleText.textContent = msg;

      try {
        var svg = bubble.querySelector('.astro-bubble-svg');
        var body = svg.querySelector('.astro-bubble-body');
        var text = bubbleText;
        var textW, tlen;
        try { textW = text.getComputedTextLength(); } catch (e) { textW = 0; }
        if (!textW || textW <= 0) textW = msg.length * 10;

        var pad = 38;
        var bodyW = Math.max(135, textW + pad);
        var svgW = bodyW + 28;
        body.setAttribute('width', bodyW);
        svg.setAttribute('viewBox', '0 0 ' + svgW + ' 70');
        svg.style.width = svgW + 'px';
        bubble.style.width = svgW + 'px';
        text.setAttribute('x', 14 + bodyW / 2);
        text.setAttribute('y', 29);
      } catch (e) {}

      bubble.classList.add('show');
      if (bubbleTimer) clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(hideBubble, 2600);
    }

    // Queue a bubble with a tiny random stagger (~80–350ms) so two reactions
    // that would otherwise land on the same frame don't fire simultaneously.
    function queueShowBubble(msg) {
      var delay = 80 + Math.random() * 270;
      if (pendingShowTimer) clearTimeout(pendingShowTimer);
      pendingShowMsg = msg;
      pendingShowTimer = setTimeout(function () {
        pendingShowTimer = null;
        if (pendingShowMsg === msg) {
          renderBubble(msg);
          pendingShowMsg = null;
        }
      }, delay);
    }

    function pickNoRepeat(pool, last) {
      var pick = pool[Math.floor(Math.random() * pool.length)];
      var guard = 0;
      while ((pick === last || pick === lastShownText) && pool.length > 1 && guard < 20) {
        pick = pool[Math.floor(Math.random() * pool.length)];
        guard++;
      }
      return pick;
    }

    function showLetGoMessage() {
      var pick = pickNoRepeat(letGoMessages, lastLetGoMsg);
      lastLetGoMsg = pick;
      currentMessage = pick;
      letGoMessageTime = performance.now();
      queueShowBubble(pick);
    }
    function showGrabMessage() {
      var pick = pickNoRepeat(grabMessages, lastGrabMsg);
      lastGrabMsg = pick;
      currentMessage = pick;
      grabMessageTime = performance.now();
      queueShowBubble(pick);
    }
    function showYapMessage() {
      var pick = pickNoRepeat(yapMessages, lastYapMsg);
      lastYapMsg = pick;
      currentMessage = pick;
      yapMessageTime = performance.now();
      queueShowBubble(pick);
    }
    function showPullMessage() {
      var pick = pickNoRepeat(pullMessages, lastPullMsg);
      lastPullMsg = pick;
      currentMessage = pick;
      pullMessageTime = performance.now();
      queueShowBubble(pick);
    }
    function showPullHappyMessage() {
      var pick = pickNoRepeat(pullHappyMessages, lastPullHappyMsg);
      lastPullHappyMsg = pick;
      currentMessage = pick;
      pullHappyMessageTime = performance.now();
      queueShowBubble(pick);
    }
    function showHurtMessage(rockSize) {
      var pool = rockSize >= 160 ? hurtLarge : (rockSize >= 120 ? hurtMedium : hurtSmall);
      var pick = pickNoRepeat(pool, lastHurtMsg);
      lastHurtMsg = pick;
      currentMessage = pick;
      hurtMessageTime = performance.now();
      queueShowBubble(pick);
    }
    function showNearAsteroidMessage(rockSize) {
      var pool = rockSize >= 160 ? nearAsteroidLarge : (rockSize >= 120 ? nearAsteroidMedium : nearAsteroidSmall);
      var pick = pickNoRepeat(pool, lastNearAsteroidMsg);
      lastNearAsteroidMsg = pick;
      currentMessage = pick;
      nearAsteroidMessageTime = performance.now();
      queueShowBubble(pick);
    }
    function showChainGrabMessage() {
      var pick = pickNoRepeat(chainGrabMessages, lastChainMsg);
      lastChainMsg = pick;
      currentMessage = pick;
      chainMessageTime = performance.now();
      queueShowBubble(pick);
    }
    function showChainReleaseMessage() {
      var pick = pickNoRepeat(chainReleaseMessages, lastChainMsg);
      lastChainMsg = pick;
      currentMessage = pick;
      chainMessageTime = performance.now();
      queueShowBubble(pick);
    }
    function showHandHoldMessage() {
      var pick = pickNoRepeat(handHoldMessages, lastHandHoldMsg);
      lastHandHoldMsg = pick;
      currentMessage = pick;
      handHoldMessageTime = performance.now();
      queueShowBubble(pick);
    }

    function handPosition() {
      if (rightHand) {
        var hb = rightHand.getBoundingClientRect();
        return { x: hb.left + hb.width / 2, y: hb.top + hb.height / 2 };
      }
      return { x: state.x, y: state.y };
    }
    function leftHandPosition() {
      if (leftHand) {
        var hb = leftHand.getBoundingClientRect();
        return { x: hb.left + hb.width / 2, y: hb.top + hb.height / 2 };
      }
      return handPosition();
    }
    function physicsHandPosition() {
      var angRad = state.angle * Math.PI / 180;
      var cosA = Math.cos(angRad), sinA = Math.sin(angRad);
      var baseOX = holdSide === 'left' ? -size * 0.3 : size * 0.3;
      var baseOY = -size * 0.55;
      var hx = state.x + baseOX * cosA - baseOY * sinA;
      var hy = state.y + baseOX * sinA + baseOY * cosA;
      return { x: hx, y: hy };
    }
    function activeHandPosition() {
      if (holdSide === 'left') return leftHandPosition();
      return handPosition();
    }
    // The hand the partner grabs (free hand). Uses freeSide (set toward the
    // partner) so it's consistent with the clasp, independent of cursor position.
    function freeHandPosition() {
      if (freeSide === 1) return handPosition();
      return leftHandPosition();
    }
    // Deterministic free-hand point computed purely from body state (position +
    // angle), with no DOM read. Used as the pivot for the hand-hold pendulum so
    // there's no read-render feedback loop (which caused shaking).
    function deterministicFreeHand() {
      // Free-hand side points toward the partner (set during connectLink), so the
      // clasp direction is consistent regardless of which astronaut is the anchor.
      var ox = freeSide * size * 0.30;
      var oy = -size * 0.10;
      return {
        x: state.x + ox,
        y: state.y + oy
      };
    }
    // The hand this astronaut uses to hold a partner.
    function linkHandPosition() {
      if (linkSide === 'left') return leftHandPosition();
      return handPosition();
    }
    function oppositeSide(side) {
      return side === 'left' ? 'right' : 'left';
    }

    function aimArmAtTarget(targetEl, progress) {
      if (!rightArm || !targetEl) return;
      var tr = targetEl.getBoundingClientRect();
      var tX = tr.left + tr.width / 2;
      var tY = tr.top + tr.height / 2;
      var rCx = tX - state.x;
      var rCy = tY - state.y;
      var bAng = -state.angle * Math.PI / 180;
      var bcos = Math.cos(bAng), bsin = Math.sin(bAng);
      var lx = rCx * bcos - rCy * bsin;
      var ly = rCx * bsin + rCy * bcos;
      var sc = SC;
      var shX = (87 - 60) * sc;
      var shY = (52 - 70) * sc;
      var dirX = lx - shX;
      var dirY = ly - shY;
      var aimDeg = Math.atan2(dirX, dirY) * 180 / Math.PI;
      setLimbTransform(rightArm, clamp(-aimDeg * progress, -130, 130), 87, 52);
    }

    function handleNavDwell() {
      if (navClicked || !navDwellEl) return;
      var elapsed = performance.now() - navDwellStart;
      var DWELL_MS = 2000;
      var ANIM_MS = 500;
      if (elapsed >= DWELL_MS) {
        navHandAnim = Math.min(1, (elapsed - DWELL_MS) / ANIM_MS);
        aimArmAtTarget(navDwellEl, navHandAnim);
        if (navHandAnim >= 1) {
          navClicked = true;
          var href = navDwellEl.getAttribute('href');
          if (href) {
            if (href.charAt(0) === '#') {
              var target = document.querySelector(href);
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.location.href = href;
            }
          } else {
            navDwellEl.click();
          }
        }
      }
    }

    function handleMinDwell() {
      if (minDone || !minDwellBtn) return;
      var elapsed = performance.now() - minDwellStart;
      if (elapsed >= 2000) {
        minDone = true;
        minDwellBtn.click();
        setTimeout(function () {
          currentMessage = 'Oops!';
          queueShowBubble('Oops!');
        }, 350);
      }
    }

    function updateBubble() {
      if (!bubble || !bubbleText) return;

      var ax = state.x;
      var ay = state.y;
      var msg = '';

      var isInAnySection = false;
      for (var si0 = 0; si0 < sections.length; si0++) {
        var sec0 = document.getElementById(sections[si0].id);
        if (!sec0) continue;
        var r0 = sec0.getBoundingClientRect();
        if (ax >= r0.left && ax <= r0.right && ay >= r0.top && ay <= r0.bottom) {
          isInAnySection = true;
          break;
        }
      }

      var infoEl = document.getElementById('visitor-info');
      if (infoEl) {
        var infoRect = infoEl.getBoundingClientRect();
        var infoCX = infoRect.left + infoRect.width / 2;
        var infoCY = infoRect.top + infoRect.height / 2;
        var dInfo = Math.hypot(ax - infoCX, ay - infoCY);
        if (dInfo < 180) {
          if (infoDwellStart === 0) infoDwellStart = performance.now();
          var infoElapsed = performance.now() - infoDwellStart;
          if (infoElapsed >= 6000) msg = 'then zoom in on the page';
          else if (infoElapsed >= 3000) msg = 'you want to see?';
          else msg = 'Wow, I see your IP here';
        } else {
          infoDwellStart = 0;
        }
      }

      if (!msg) {
        var ghEls = document.querySelectorAll('.gh-icon, .icon-one');
        for (var gi = 0; gi < ghEls.length; gi++) {
          var ghRect = ghEls[gi].getBoundingClientRect();
          if (ghRect.width === 0 && ghRect.height === 0) continue;
          var ghCX = ghRect.left + ghRect.width / 2;
          var ghCY = ghRect.top + ghRect.height / 2;
          if (Math.hypot(ax - ghCX, ay - ghCY) < 120) {
            msg = 'By the way, here is my blog';
            break;
          }
        }
      }

      if (!msg) {
        var aboutPhoto = document.getElementById('about-photo');
        if (aboutPhoto) {
          var apRect = aboutPhoto.getBoundingClientRect();
          var apCX = apRect.left + apRect.width / 2;
          var apCY = apRect.top + apRect.height / 2;
          if (Math.hypot(ax - apCX, ay - apCY) < 160) {
            msg = 'I miss this girl';
          }
        }
      }

      if (!msg) {
        var serviceMsgs = [
          'Yup, I do hardware hacking too.',
          'Yes, I make malware but I\'m not a criminal!',
          'I have TikTok at 0xbit.'
        ];
        var svcCards = document.querySelectorAll('#services .service-link article');
        for (var sv = 0; sv < svcCards.length; sv++) {
          var svRect = svcCards[sv].getBoundingClientRect();
          if (svRect.width === 0 && svRect.height === 0) continue;
          var svCX = svRect.left + svRect.width / 2;
          var svCY = svRect.top + svRect.height / 2;
          if (Math.hypot(ax - svCX, ay - svCY) < 160) {
            msg = serviceMsgs[sv] || 'Interesting!';
            break;
          }
        }
      }

      if (!msg) {
        var navLinks = document.querySelectorAll('header .nav-list li a');
        var foundBtn = null;
        var bestD = 130;
        for (var ni = 0; ni < navLinks.length; ni++) {
          var nRect = navLinks[ni].getBoundingClientRect();
          if (nRect.width === 0 && nRect.height === 0) continue;
          var nCX = nRect.left + nRect.width / 2;
          var nCY = nRect.top + nRect.height / 2;
          var dN = Math.hypot(ax - nCX, ay - nCY);
          if (dN < bestD) { bestD = dN; foundBtn = navLinks[ni]; }
        }
        if (foundBtn) {
          if (!navClicked) {
            var btnName = (foundBtn.textContent || '').trim() || 'menu';
            msg = 'Don\'t let me click that ' + btnName + ' button';
          }
          if (navDwellEl !== foundBtn) {
            navDwellEl = foundBtn;
            navDwellStart = performance.now();
            navDwellMsgShown = false;
          }
        } else {
          navDwellEl = null;
          navDwellStart = 0;
          navClicked = false;
          navHandAnim = 0;
        }
      }

      if (!msg) {
        var minBtns = document.querySelectorAll('.term-dot-min');
        var foundMin = null;
        var minBestD = 60;
        for (var mi = 0; mi < minBtns.length; mi++) {
          var mRect = minBtns[mi].getBoundingClientRect();
          if (mRect.width === 0 && mRect.height === 0) continue;
          var mCX = mRect.left + mRect.width / 2;
          var mCY = mRect.top + mRect.height / 2;
          var dMin = Math.hypot(ax - mCX, ay - mCY);
          if (dMin < minBestD) { minBestD = dMin; foundMin = minBtns[mi]; }
        }
        if (foundMin) {
          if (!minDone) msg = 'Don\'t let me minimize this window';
          if (minDwellBtn !== foundMin) {
            minDwellBtn = foundMin;
            minDwellStart = performance.now();
            minDone = false;
          }
        } else {
          minDwellBtn = null;
          minDwellStart = 0;
          minDone = false;
        }
      }

      if (!msg) {
        var inSection = null;
        for (var si = 0; si < sections.length; si++) {
          var sec = document.getElementById(sections[si].id);
          if (!sec) continue;
          var r = sec.getBoundingClientRect();
          if (ax >= r.left && ax <= r.right && ay >= r.top && ay <= r.bottom) {
            inSection = sections[si];
            break;
          }
        }
        if (inSection) {
          if (inSection.id !== currentSectionId) {
            currentSectionId = inSection.id;
            sectionEnterTime = performance.now();
            sectionMsgShown = false;
          }
          var sectionElapsed = performance.now() - sectionEnterTime;
          if (sectionElapsed >= 1000 && !sectionMsgShown) {
            if (inSection.id === 's-home' && welcomeShown) {
              msg = '';
            } else {
              msg = inSection.msg;
              if (inSection.id === 's-home') welcomeShown = true;
            }
            sectionMsgShown = true;
          }
        } else {
          currentSectionId = '';
          sectionEnterTime = 0;
          sectionMsgShown = false;
        }
      }

      var scale = SC;
      var helmetX = state.x;
      var helmetY = state.y - 38 * scale;
      var upOffset = -10;
      var tailX = 22;
      var tailY = 68;
      if (bubble) {
        bubble.style.transform = 'translate(' + (helmetX - tailX) + 'px, ' + (helmetY - tailY + upOffset) + 'px)';
      }

      if ((grabMessageTime && (performance.now() - grabMessageTime) < 1500) ||
          (letGoMessageTime && (performance.now() - letGoMessageTime) < 1500) ||
          (yapMessageTime && (performance.now() - yapMessageTime) < 2500) ||
          (pullMessageTime && (performance.now() - pullMessageTime) < 2500) ||
          (pullHappyMessageTime && (performance.now() - pullHappyMessageTime) < 1500) ||
          (hurtMessageTime && (performance.now() - hurtMessageTime) < 2000) ||
          (nearAsteroidMessageTime && (performance.now() - nearAsteroidMessageTime) < 2500) ||
          (chainMessageTime && (performance.now() - chainMessageTime) < 2000) ||
          (handHoldMessageTime && (performance.now() - handHoldMessageTime) < 2500)) {
        return;
      }

      if (msg && msg !== currentMessage) {
        // avoid echoing the exact same line the bubble just showed
        if (msg === lastShownText) {
          currentMessage = msg;
        } else {
          currentMessage = msg;
          queueShowBubble(msg);
        }
      } else if (!msg && !isInAnySection) {
        currentMessage = '';
        if (bubbleTimer) clearTimeout(bubbleTimer);
        hideBubble();
      }
    }

    // Per-astronaut physics step (shared master loop calls this each frame)
    function step(now, t, dt) {
      // grab detection. Only update the hold side while NOT already gripping, so
      // a small cursor wiggle can't flip the hand mid-hold (which teleports the
      // chained partner when the free-hand side swaps).
      if (grip <= 0.02) {
        holdSide = mouse.x < state.x ? 'left' : 'right';
        // If we're linked to a partner, the string must use our FREE hand — the
        // one not holding the partner — so both connections can coexist.
        if (chainRole === 'linked' || chainRole === 'anchor') {
          holdSide = (linkSide === 'left') ? 'right' : 'left';
        }
      }
      var hnd = activeHandPosition();
      var gdist = Math.hypot(hnd.x - ring.x, hnd.y - ring.y);
      var nearHand = gdist < TOUCH_RADIUS;

      var targetGrip;
      if (cursorSpeed > FAST_SPEED) {
        targetGrip = 0;
      } else if (nearHand) {
        targetGrip = 1;
      } else if (grip > 0.5) {
        targetGrip = 1;
      } else {
        targetGrip = 0;
      }
      grip += (targetGrip - grip) * clamp(dt * 10, 0, 1);

      if (!wasHolding && grip >= 0.5) showGrabMessage();
      if (wasHolding && grip < 0.5) showLetGoMessage();
      wasHolding = grip >= 0.5;

      // ---- hand-to-hand link to a partner (other astronaut) ----
      // The master sets `linkTarget` + `chainPartner` + `linkSide` each frame
      // when a chain should form; `step` ramps `linkGrip` and applies physics.
      var linkGoal = linkTarget && chainPartner ? 1 : 0;
      linkGrip += (linkGoal - linkGrip) * clamp(dt * 10, 0, 1);

      if (!wasLinkHolding && linkGrip >= 0.5) showChainGrabMessage();
      if (wasLinkHolding && linkGrip < 0.5) showChainReleaseMessage();
      wasLinkHolding = linkGrip >= 0.5;

      // occasional "holding hands" chatter while holding a partner's hand
      if (wasLinkHolding) {
        if (nextHandHoldTime === 0) {
          nextHandHoldTime = now + randomYapDelay();
        } else if (now >= nextHandHoldTime) {
          showHandHoldMessage();
          nextHandHoldTime = now + randomYapDelay();
        }
      } else {
        nextHandHoldTime = 0;
      }

      // idle yapping
      if (!wasHolding && grip <= 0.02 && !wasLinkHolding) {
        if (nextYapTime === 0) {
          nextYapTime = now + randomYapDelay();
        } else if (now >= nextYapTime) {
          showYapMessage();
          nextYapTime = now + randomYapDelay();
        }
      } else {
        nextYapTime = 0;
      }

      // low-frequency gentle acceleration
      var axw = Math.sin(t * 0.23 + phases.x) * 0.12
              + Math.sin(t * 0.11 + phases.x * 1.7) * 0.05;
      var ay = Math.cos(t * 0.19 + phases.y) * 0.10
              + Math.sin(t * 0.13 + phases.y * 1.3) * 0.04;

      // idle: follow the cursor (skip while linked to a partner)
      if (grip <= 0.02 && chainRole !== 'linked') {
        var mx = mouse.x;
        var my = mouse.y;
        var followDx = mx - state.x;
        var followDy = my - state.y;
        var followDist = Math.sqrt(followDx * followDx + followDy * followDy) || 1;
        var followK = 0.12;
        axw += followDx * followK;
        ay += followDy * followK;
        state.vx *= (1 - 2.5 * dt);
        state.vy *= (1 - 2.5 * dt);
        if (followDist < 40) {
          axw *= 0.2;
          ay *= 0.2;
        }
      }

      // holding: rigid-body pendulum on the string
      if (grip > 0.02) {
        var angRad = state.angle * Math.PI / 180;
        var cosA = Math.cos(angRad), sinA = Math.sin(angRad);
        var baseOX = holdSide === 'left' ? -size * 0.3 : size * 0.3;
        var baseOY = -size * 0.55;
        var handX = state.x + baseOX * cosA - baseOY * sinA;
        var handY = state.y + baseOX * sinA + baseOY * cosA;

        var sx = ring.x - handX;
        var sy = ring.y - handY;
        var slen = Math.sqrt(sx * sx + sy * sy) || 0.0001;
        var nx = sx / slen;
        var ny = sy / slen;

        var restLen = STRING_LEN;
        var excess = slen - restLen;
        var tension = grip * excess * 0.6;
        if (tension < 0) tension = 0;

        var isPulled = excess > STRING_LEN * 1.6;
        if (isPulled && !wasPulled &&
            (!pullMessageTime || (performance.now() - pullMessageTime) > 2500)) {
          showPullMessage();
        }
        wasPulled = isPulled;

        if (isPulled) {
          if (nextPullHappyTime === 0) {
            nextPullHappyTime = performance.now() + randomPullHappyDelay();
          } else if (performance.now() >= nextPullHappyTime) {
            showPullHappyMessage();
            nextPullHappyTime = performance.now() + randomPullHappyDelay();
          }
        } else {
          nextPullHappyTime = 0;
        }

        var fx = nx * tension;
        var fy = ny * tension;
        state.vx += fx * dt;
        state.vy += fy * dt;

        var rx = handX - state.x;
        var ry = handY - state.y;
        var torque = (rx * fy - ry * fx);
        state.va += torque * 0.004 * dt;

        state.vy += 12 * dt;
        state.vx *= (1 - 1.8 * dt);
        state.vy *= (1 - 1.8 * dt);
      }

      // linked to a partner: the hand-hold coupling happens at the end of
      // step() (after the arm reach) so it uses the freshly-reached hand.

      // hover nudge
      if (hover && chainRole !== 'linked') {
        hoverT = Math.min(1, hoverT + dt * 3);
        var away = hoverT;
        axw += Math.sin(t * 2.2) * 0.6 * away;
        ay += Math.cos(t * 1.9) * 0.5 * away;
      } else {
        hoverT = Math.max(0, hoverT - dt * 2);
      }

      // while hand-holding, drop independent acceleration so the pin that
      // joins the hands is the sole source of motion (plus gravity).
      if (chainRole === 'linked') {
        axw = 0;
        ay = 0;
      }

      // integrate
      state.vx += axw * dt;
      state.vy += ay * dt;
      state.vx *= (1 - 0.06 * dt);
      state.vy *= (1 - 0.06 * dt);

      var maxSpeed = (grip > 0.3 || chainRole === 'linked') ? 900 : 400;
      var sp = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
      if (sp > maxSpeed) {
        state.vx *= maxSpeed / sp;
        state.vy *= maxSpeed / sp;
      }

      // While hand-holding, the pendulum at the end of step() is the single
      // authority for position + angle, so skip the free-flight integration here
      // (prevents two competing writers from causing shaking).
      if (chainRole !== 'linked') {
        state.x += state.vx * dt;
        state.y += state.vy * dt;
      }

      var pad = size * 0.9;
      if (state.x < pad) { state.x = pad; state.vx = Math.abs(state.vx) * 0.4; }
      if (state.x > w - pad) { state.x = w - pad; state.vx = -Math.abs(state.vx) * 0.4; }
      if (state.y < pad) { state.y = pad; state.vy = Math.abs(state.vy) * 0.4; }
      if (state.y > h - pad) { state.y = h - pad; state.vy = -Math.abs(state.vy) * 0.4; }

      // rotation
      if (chainRole === 'linked' && linkGrip > 0.02) {
        // angle is owned by the pendulum at the end of step(); do nothing here
      } else if (grip > 0.02) {
        state.va *= (1 - 1.5 * dt);
        state.angle += state.va * dt;
        state.angle = clamp(state.angle, -140, 140);
        state.va = clamp(state.va, -40, 40);
      } else {
        var angAccel = state.vx * 0.0016 + Math.sin(t * 0.18 + phases.a) * 0.4;
        state.va += angAccel * dt;
        state.va *= (1 - 0.15 * dt);
        state.angle += state.va * dt;
        state.angle = clamp(state.angle, -28, 28);
        state.va = clamp(state.va, -12, 12);
      }

      // limb animation
      var speedRatio = clamp(sp / 28, 0, 2.5);
      limbPhase.a1 = limbPhase.a1 || Math.random() * Math.PI * 2;
      limbPhase.a2 = limbPhase.a2 || Math.random() * Math.PI * 2;
      limbPhase.l1 = limbPhase.l1 || Math.random() * Math.PI * 2;
      limbPhase.l2 = limbPhase.l2 || Math.random() * Math.PI * 2;

      var amp = 1 + hoverT * 0.5 + speedRatio * 0.3 + grip * 0.15;
      var la = (Math.sin(t * 0.9  + limbPhase.a1) * 0.6 + Math.sin(t * 0.23 + limbPhase.a1 * 1.7) * 0.4) * amp;
      var ra = (Math.sin(t * 1.1  + limbPhase.a2) * 0.6 + Math.sin(t * 0.27 + limbPhase.a2 * 1.3) * 0.4) * amp;
      var ll = (Math.sin(t * 0.7  + limbPhase.l1) * 0.45 + Math.sin(t * 0.19 + limbPhase.l1 * 2.1) * 0.35) * amp;
      var rl = (Math.sin(t * 0.85 + limbPhase.l2) * 0.45 + Math.sin(t * 0.22 + limbPhase.l2 * 1.9) * 0.35) * amp;

      if (leftArm)  setLimbTransform(leftArm,  la * 34, 33, 52);
      if (rightArm) setLimbTransform(rightArm, ra * 34, 87, 52);
      if (leftLeg)  setLimbTransform(leftLeg,  ll * 22, 52, 84);
      if (rightLeg) setLimbTransform(rightLeg, rl * 22, 68, 84);

      // reach the active hand toward the ring
      if (grip > 0.02) {
        var ringCx = ring.x - state.x;
        var ringCy = ring.y - state.y;
        var bAng = -state.angle * Math.PI / 180;
        var bcos = Math.cos(bAng), bsin = Math.sin(bAng);
        var lx = ringCx * bcos - ringCy * bsin;
        var ly = ringCx * bsin + ringCy * bcos;
        var sc = SC;
        var shX, shY;
        if (holdSide === 'left') {
          shX = (33 - 60) * sc;
          shY = (52 - 70) * sc;
        } else {
          shX = (87 - 60) * sc;
          shY = (52 - 70) * sc;
        }
        var dirX = lx - shX;
        var dirY = ly - shY;
        var aimDeg = Math.atan2(dirX, dirY) * 180 / Math.PI;

        if (holdSide === 'left') {
          setLimbTransform(leftArm, clamp(-aimDeg * grip, -120, 120), 33, 52);
        } else {
          setLimbTransform(rightArm, clamp(-aimDeg * grip, -120, 120), 87, 52);
        }
      }

      // reach the clasp hand toward the partner. The linked astronaut extends
      // its arm to the anchor's free hand (the pivot it hangs from); the anchor
      // extends its free arm toward the linked astronaut's body.
      if (chainPartner && linkGrip > 0.05) {
        var tgtX, tgtY, mySide;
        if (chainRole === 'linked') {
          var fh = chainPartner.freeHandPosition();
          tgtX = fh.x; tgtY = fh.y;
          mySide = linkSide;
        } else if (chainRole === 'anchor') {
          // The anchor extends its free arm toward the linked astronaut's BODY
          // (not its hand, which is pinned to the anchor's own free hand and
          // would create a circular, direction-flipping feedback loop).
          tgtX = chainPartner.state.x;
          tgtY = chainPartner.state.y;
          mySide = (freeSide === 1) ? 'right' : 'left';
        }
        if (mySide) {
          var lrCx = tgtX - state.x;
          var lrCy = tgtY - state.y;
          var lbAng = -state.angle * Math.PI / 180;
          var lbcos = Math.cos(lbAng), lbsin = Math.sin(lbAng);
          var llx = lrCx * lbcos - lrCy * lbsin;
          var lly = lrCx * lbsin + lrCy * lbcos;
          var lsc = SC;
          var lshX, lshY;
          if (mySide === 'left') { lshX = (33 - 60) * lsc; lshY = (52 - 70) * lsc; }
          else { lshX = (87 - 60) * lsc; lshY = (52 - 70) * lsc; }
          var ldirX = llx - lshX;
          var ldirY = lly - lshY;
          var laimDeg = Math.atan2(ldirX, ldirY) * 180 / Math.PI;
          if (mySide === 'left') {
            setLimbTransform(leftArm, clamp(-laimDeg * linkGrip, -175, 175), 33, 52);
          } else {
            setLimbTransform(rightArm, clamp(-laimDeg * linkGrip, -175, 175), 87, 52);
          }
        }
      }

      // holding hands: kinematic clasp using the actual rendered hand circles,
      // so the two circles physically touch. Read the real gap and shift the body
      // once per frame (no velocity/torque feedback -> no shake).
      if (chainRole === 'linked' && chainPartner && linkGrip > 0.02) {
        var P = chainPartner.freeHandPosition();   // anchor's rendered free-hand circle
        var H = linkHandPosition();                // this astronaut's rendered link-hand circle

        // shift the body so its rendered hand circle lands on the anchor's circle
        var gx = P.x - H.x;
        var gy = P.y - H.y;
        state.x += gx * linkGrip;
        state.y += gy * linkGrip;

        // zero velocity (kinematic pin; no momentum fight)
        state.vx = 0;
        state.vy = 0;

        // rotate toward the pull direction (toward the anchor) smoothly
        var pullAng = Math.atan2(P.x - state.x, P.y - state.y) * (180 / Math.PI);
        state.angle += (pullAng - state.angle) * clamp(dt * 5, 0, 1);
        state.va = 0;
      }

      syncTransform();

      handleNavDwell();
      handleMinDwell();
      updateBubble();
    }

    function syncTransform() {
      if (reduced.matches) {
        el.style.transform = 'translate(' + state.x + 'px, ' + state.y + 'px)';
      } else {
        el.style.transform =
          'translate(' + state.x + 'px, ' + state.y + 'px) ' +
          'translate(-50%, -50%) ' +
          'rotate(' + state.angle.toFixed(2) + 'deg)';
      }
    }

    // Public interface used by the shared loops
    return {
      el: el,
      state: state,
      size: size,
      getGrip: function () { return grip; },
      getHoldSide: function () { return holdSide; },
      activeHandPosition: activeHandPosition,
      freeHandPosition: freeHandPosition,
      linkHandPosition: linkHandPosition,
      deterministicFreeHand: deterministicFreeHand,
      getChainRole: function () { return chainRole; },
      getChainPartner: function () { return chainPartner; },
      getFreeSide: function () { return freeSide; },
      isLinked: function () { return chainRole === 'linked' || chainRole === 'anchor'; },
      // master controls the chain relationship; step() ramps linkGrip toward it
      connectLink: function (partner, role, side) {
        chainPartner = partner;
        chainRole = role;
        linkSide = side;
        // freeSide = +1 (right) / -1 (left) — the side this body's clasp hand
        // faces. For 'linked', it's the link hand; for 'anchor', the free hand
        // reached toward the partner.
        freeSide = (side === 'right') ? 1 : -1;
        linkTarget = true;
      },
      disconnectLink: function () {
        chainPartner = null;
        chainRole = 'none';
        linkTarget = false;
      },
      // Updates which hand holds the partner while already linked, so the
      // linked astronaut (C) can swap hands as it swings around the anchor.
      setLinkSide: function (side) {
        linkSide = side;
        freeSide = (side === 'right') ? 1 : -1;
      },
      maybeHurt: function (rockSize) {
        if (!hurtMessageTime || (performance.now() - hurtMessageTime) > 1500) {
          showHurtMessage(rockSize);
        }
      },
      maybeNearAsteroid: function (rockSize) {
        if (!nearAsteroidMessageTime || (performance.now() - nearAsteroidMessageTime) > 3500) {
          showNearAsteroidMessage(rockSize);
        }
      },
      step: step,
      syncTransform: syncTransform
    };
  }

  // ===========================================================================
  //  Bootstrap: instantiate all astronauts + shared master loop
  // ===========================================================================
  var boyEl = document.querySelector('.astronaut:not(.astronaut-girl)');
  var girlEl = document.querySelector('.astronaut-girl');

  if (boyEl) astronauts.push(createAstronaut({ el: boyEl, x: window.innerWidth * 0.72, y: window.innerHeight * 0.38 }));
  if (girlEl) astronauts.push(createAstronaut({ el: girlEl, x: window.innerWidth * 0.22, y: window.innerHeight - 80 }));

  if (astronauts.length === 0) return;

  var prev = performance.now();

  // Tracks the identity of the current string-holder (anchor) across frames so
  // we can detect when the string changes hands and re-form the link cleanly.
  var prevGripper = null;

  // Coordinate hand-to-hand chains.
  //  - The preferred "anchor" is whichever astronaut is attached to the alien
  //    (ring) via the string (grip > 0.5).
  //  - If nobody is holding the string, two floating astronauts can still link
  //    up: the first one becomes the anchor and the second hangs off it.
  //  - If another astronaut drifts close to the anchor's *free* hand, it
  //    grabs that hand (becoming "linked"), and uses its own outer hand
  //    (the one not doing the holding) as the visual hold.
  //  - A hard pull on the string releases the anchor (handled by step's grip)
  //    which cascades and severs the chain here; an over-stretched link also
  //    snaps on its own.
  function updateChainRelationships() {
    var anchor = null;
    for (var i = 0; i < astronauts.length; i++) {
      if (astronauts[i].getGrip() > 0.5) { anchor = astronauts[i]; break; }
    }

    // If the string-holder changed (a different astronaut grabbed the ring, or
    // the previous one let go), tear down ALL links so roles re-form cleanly
    // around whoever is now (or isn't) holding the string.
    if (anchor !== prevGripper) {
      for (var j = 0; j < astronauts.length; j++) {
        astronauts[j].disconnectLink();
      }
      prevGripper = anchor;
    }

    if (!anchor) {
      // No one is on the string. Allow two free-floating astronauts to hold
      // hands instead of refusing to link. The first (lowest index) becomes the
      // anchor; any other astronaut that drifts close links to it.
      if (astronauts.length >= 2) {
        anchor = astronauts[0];
      } else {
        // only one astronaut: nothing to hold hands with
        astronauts[0] && astronauts[0].disconnectLink();
        return;
      }
    }

    for (var k = 0; k < astronauts.length; k++) {
      var o = astronauts[k];
      if (o === anchor) continue;
      if (o.getGrip() > 0.5 && o !== anchor) continue; // another holds the string; skip linking it

      // proximity: measure center-to-center distance (freeSide isn't established
      // until after connectLink, so don't rely on deterministicFreeHand here).
      var d = Math.hypot(o.state.x - anchor.state.x, o.state.y - anchor.state.y);

      // link when close; once linked, hold until pulled far apart (snap threshold)
      if (d < anchor.size * 0.3 && !o.isLinked()) {
        // The anchor reaches with a free hand. If it's holding the string, the
        // free hand is the one NOT on the string. If it's just floating, aim the
        // hand toward the partner instead.
        var anchorSide;
        if (anchor.getGrip() > 0.5) {
          var anchorHold = anchor.getHoldSide();
          anchorSide = anchorHold === 'right' ? 'left' : 'right';
        } else {
          anchorSide = o.state.x > anchor.state.x ? 'right' : 'left';
        }

        var initialSide = oSideForFreeHand(anchor, o, anchorSide);
        // fallback if within the dead-zone at the moment of linking
        if (!initialSide) initialSide = anchor.state.x > o.state.x ? 'right' : 'left';
        o.connectLink(anchor, 'linked', initialSide);
        anchor.connectLink(o, 'anchor', anchorSide);
      } else if (o.isLinked() && d > o.size * 1.5) {
        // over-stretched: release the grasp (moved far apart)
        o.disconnectLink();
        anchor.disconnectLink();
      } else if (o.isLinked()) {
        // Still linked: let the partner swap hands as it swings around the
        // anchor, so the hold stays natural regardless of direction (aim its
        // hand at the anchor's free hand).
        var newSide = computeOSide(anchor, o);
        if (newSide) o.setLinkSide(newSide);
      }
    }
  }

  // Determines which hand the linked astronaut uses to hold the anchor's free
  // hand. Uses the anchor's committed free-hand side (stable once linked) rather
  // than re-deriving from its string hand, which can flip when the anchor floats.
  function computeOSide(anchor, o) {
    var freeSign = anchor.getFreeSide(); // +1 right, -1 left
    return oSideForFreeHand(anchor, o, freeSign === 1 ? 'right' : 'left');
  }

  // Given the anchor's free-hand side, pick which hand the partner (o) uses so
  // it can reach that free hand naturally.
  function oSideForFreeHand(anchor, o, anchorSide) {
    var freeSign = anchorSide === 'right' ? 1 : -1;
    var bFreeX = anchor.state.x + freeSign * anchor.size * 0.30;
    // dead-zone so the partner doesn't flicker hands when near the midpoint
    var zone = anchor.size * 0.12;
    if (bFreeX - o.state.x > zone) return 'right';
    if (bFreeX - o.state.x < -zone) return 'left';
    // within the dead-zone: keep the current hand (no swap)
    return null;
  }

  function masterTick(now) {
    var dt = clamp((now - prev) / 1000, 0, 0.05);
    prev = now;
    var t = now / 1000;

    // decay cursorSpeed when idle
    var idleMs = now - (mouse.lastT || now);
    if (idleMs > 60) cursorSpeed *= 0.92;

    // spring the ring toward the mouse (shared, once per frame)
    ring.ax = (mouse.x - ring.x) * 0.18;
    ring.ay = (mouse.y - ring.y) * 0.18;
    ring.vx = ring.ax;
    ring.vy = ring.ay;
    ring.x += ring.vx;
    ring.y += ring.vy;
    ring.x = clamp(ring.x, 0, window.innerWidth);
    ring.y = clamp(ring.y, 0, window.innerHeight);

    // resolve chain relationships before stepping physics
    updateChainRelationships();

    // each astronaut steps its own physics/limbs/bubble
    for (var i = 0; i < astronauts.length; i++) {
      astronauts[i].step(now, t, dt);
    }

    drawRing(t);
    updateRocks(dt);

    requestAnimationFrame(masterTick);
  }

  requestAnimationFrame(masterTick);
})();
