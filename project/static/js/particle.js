/* ===== PARTICLE.JS — Particles, confetti, fireworks ===== */

const Particle = (() => {
  // Lazy-init canvases after DOM ready
  let canvas = null, confettiCanvas = null;
  let ctx = null, cCtx = null;

  let particles      = [];
  let confettiPieces = [];
  let running        = false;
  let introBgActive  = false;
  let introBgPixels  = [];
  let introBgFrame   = 0;

  function getCtx() {
    if (!canvas) {
      canvas = document.getElementById('particles-canvas');
      if (canvas) ctx = canvas.getContext('2d');
    }
    if (!confettiCanvas) {
      confettiCanvas = document.getElementById('confetti-canvas');
      if (confettiCanvas) cCtx = confettiCanvas.getContext('2d');
    }
  }

  function resize() {
    getCtx();
    if (canvas)        { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    if (confettiCanvas){ confettiCanvas.width = window.innerWidth; confettiCanvas.height = window.innerHeight; }
  }
  window.addEventListener('resize', resize);

  // ---- Intro background drifting pixels ----
  function startIntroBg() {
    resize();
    const W = canvas ? canvas.width : window.innerWidth;
    const H = canvas ? canvas.height : window.innerHeight;
    introBgPixels = [];
    for (let i = 0; i < 45; i++) {
      introBgPixels.push({
        x:          Math.random() * W,
        y:          Math.random() * H,
        size:       Utils.randInt(2, 6),
        vx:         (Math.random() - 0.5) * 0.45,
        vy:         (Math.random() - 0.5) * 0.45,
        alpha:      Math.random() * 0.55 + 0.1,
        color:      Math.random() > 0.5 ? '#c0392b' : '#6b0f1a',
        pulseSpeed: Math.random() * 0.03 + 0.01,
        phase:      Math.random() * Math.PI * 2,
      });
    }
  }

  function updateIntroBg() {
    if (!introBgActive) return;
    getCtx();
    if (!ctx) { requestAnimationFrame(updateIntroBg); return; }
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    introBgFrame++;
    introBgPixels.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      const a = p.alpha * (0.6 + 0.4 * Math.sin(introBgFrame * p.pulseSpeed + p.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle   = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(updateIntroBg);
  }

  function startIntroPixels() {
    getCtx();
    startIntroBg();
    introBgActive = true;
    requestAnimationFrame(updateIntroBg);
  }

  function stopIntroPixels() {
    introBgActive = false;
    getCtx();
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ---- Generic particle emitter ----
  function emit(x, y, count, options = {}) {
    getCtx();
    for (let i = 0; i < count; i++) {
      const angle = (options.angle || 0) + (Math.random() - 0.5) * (options.spread || Math.PI * 2);
      const speed = Utils.randInt(options.minSpeed || 1, options.maxSpeed || 5);
      particles.push({
        x, y,
        vx:      Math.cos(angle) * speed,
        vy:      Math.sin(angle) * speed - (options.upward ? Utils.randInt(2, 6) : 0),
        size:    Utils.randInt(options.minSize || 2, options.maxSize || 6),
        color:   options.colors ? options.colors[Utils.randInt(0, options.colors.length - 1)] : '#c0392b',
        life:    options.life || 60,
        maxLife: options.life || 60,
        gravity: options.gravity !== undefined ? options.gravity : 0.15,
      });
    }
    if (!running) startLoop();
  }

  function burstRed(x, y) {
    emit(x, y, 20, { colors:['#c0392b','#e74c3c','#6b0f1a','#ff6b6b'], maxSpeed:8, upward:true, life:45, gravity:0.2 });
  }

  function sparkGold(x, y) {
    emit(x, y, 15, { colors:['#f0c040','#f0e080','#b8860b','#ffffff'], maxSpeed:5, upward:true, life:50, gravity:0.1 });
  }

  function bossDefeat(W, H) {
    for (let w = 0; w < 5; w++) {
      setTimeout(() => {
        const ox = W / 2 + (Math.random() - 0.5) * W * 0.5;
        const oy = H * 0.3  + (Math.random() - 0.5) * H * 0.2;
        emit(ox, oy, 30, { colors:['#c0392b','#e74c3c','#f0c040','#ffffff','#6b0f1a'], maxSpeed:12, upward:true, life:70, gravity:0.25 });
      }, w * 200);
    }
  }

  // ---- Confetti ----
  function startConfetti() {
    getCtx();
    confettiPieces = [];
    const W = confettiCanvas ? confettiCanvas.width : window.innerWidth;
    const colors = ['#c0392b','#e74c3c','#f0c040','#f0f0f0','#6b0f1a','#f0e080'];
    for (let i = 0; i < 160; i++) {
      confettiPieces.push({
        x:    Math.random() * W,
        y:    -Utils.randInt(10, 200),
        w:    Utils.randInt(4, 10),
        h:    Utils.randInt(4, 10),
        vx:   (Math.random() - 0.5) * 3,
        vy:   Utils.randInt(2, 5),
        rot:  Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.2,
        color: colors[Utils.randInt(0, colors.length - 1)],
      });
    }
    if (!running) startLoop();
  }

  function stopConfetti() {
    confettiPieces = [];
    getCtx();
    if (cCtx && confettiCanvas) cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }

  function launchFirework(x, y) {
    const colors = ['#f0c040','#c0392b','#e74c3c','#ffffff'];
    emit(x, y, 40, { colors, maxSpeed:10, life:55, gravity:0.2, spread: Math.PI * 2 });
    emit(x, y, 15, { colors:['#f0c040','#ffffff'], maxSpeed:3, life:30, gravity:0.05, minSize:1, maxSize:3 });
  }

  function launchRandomFireworks(W, H, count, duration) {
    let n = 0;
    const iv = setInterval(() => {
      if (n >= count) { clearInterval(iv); return; }
      launchFirework(W * (0.15 + Math.random() * 0.7), H * (0.1 + Math.random() * 0.35));
      n++;
    }, duration / count);
  }

  // ---- Main render loop ----
  function startLoop() {
    running = true;
    loop();
  }

  function loop() {
    if (!running) return;
    getCtx();
    if (!ctx) { running = false; return; }

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (cCtx && confettiCanvas) cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    // Generic particles
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.life--;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle   = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    });
    ctx.globalAlpha = 1;

    // Confetti
    if (cCtx && confettiCanvas) {
      const cW = confettiCanvas.width, cH = confettiCanvas.height;
      confettiPieces.forEach(c => {
        c.x += c.vx; c.y += c.vy; c.rot += c.rotV;
        if (c.y > cH + 20) { c.y = -10; c.x = Math.random() * cW; }
        cCtx.save();
        cCtx.translate(c.x, c.y);
        cCtx.rotate(c.rot);
        cCtx.fillStyle = c.color;
        cCtx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        cCtx.restore();
      });
    }

    if (particles.length > 0 || confettiPieces.length > 0) {
      requestAnimationFrame(loop);
    } else {
      running = false;
    }
  }

  function stopAll() {
    particles      = [];
    confettiPieces = [];
    introBgActive  = false;
    running        = false;
    getCtx();
    if (ctx && canvas)               ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (cCtx && confettiCanvas)      cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }

  return {
    startIntroPixels, stopIntroPixels,
    burstRed, sparkGold, bossDefeat,
    startConfetti, stopConfetti,
    launchFirework, launchRandomFireworks,
    stopAll, emit,
  };
})();
