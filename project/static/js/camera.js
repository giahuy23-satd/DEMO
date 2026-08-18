/* ===== CAMERA.JS — POV Camera system ===== */

const Camera = (() => {
  let x = 0, y = 0;
  let targetX = 0, targetY = 0;
  let zoom = 1, targetZoom = 1;
  let shakeX = 0, shakeY = 0;
  let shakeDecay = 0;
  let shakeIntensity = 0;

  // Pan settings
  let panDuration = 0, panTimer = 0;
  let panFromX = 0, panFromY = 0;
  let panToX = 0, panToY = 0;
  let panCallback = null;

  // Zoom settings  (renamed internals to avoid conflict with exported zoomTo fn)
  let zoomDuration = 0, zoomTimer = 0;
  let zoomFromVal = 1, zoomToVal = 1;
  let zoomCallback = null;

  // Dissolve
  let dissolvePixels = [];
  let dissolveCanvas = null;
  let dissolveCtx    = null;

  // ---- update every frame ----
  function update() {
    x    = Utils.lerp(x,    targetX,   0.08);
    y    = Utils.lerp(y,    targetY,   0.08);
    zoom = Utils.lerp(zoom, targetZoom, 0.06);

    // Pan animation
    if (panTimer < panDuration) {
      panTimer++;
      const t = Utils.easeInOut(panTimer / panDuration);
      targetX = Utils.lerp(panFromX, panToX, t);
      targetY = Utils.lerp(panFromY, panToY, t);
      if (panTimer >= panDuration && panCallback) {
        panCallback(); panCallback = null;
      }
    }

    // Zoom animation
    if (zoomTimer < zoomDuration) {
      zoomTimer++;
      const t = Utils.easeInOut(zoomTimer / zoomDuration);
      targetZoom = Utils.lerp(zoomFromVal, zoomToVal, t);
      if (zoomTimer >= zoomDuration && zoomCallback) {
        zoomCallback(); zoomCallback = null;
      }
    }

    // Screen shake
    if (shakeIntensity > 0) {
      shakeX = (Math.random() * 2 - 1) * shakeIntensity;
      shakeY = (Math.random() * 2 - 1) * shakeIntensity;
      shakeIntensity = Math.max(0, shakeIntensity - shakeDecay);
    } else {
      shakeX = 0; shakeY = 0;
    }
  }

  // Apply camera transform to canvas ctx
  function apply(ctx, W, H) {
    ctx.save();
    const cx = W / 2, cy = H / 2;
    ctx.translate(cx + shakeX, cy + shakeY);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx - x, -cy - y);
  }

  function restore(ctx) { ctx.restore(); }

  // Smooth pan to world position
  function panTo(toX, toY, duration, cb) {
    panFromX = targetX; panFromY = targetY;
    panToX = toX; panToY = toY;
    panDuration = duration;
    panTimer = 0;
    panCallback = cb || null;
  }

  // Smooth zoom — accepts frames as duration
  function zoomTo(z, duration, cb) {
    zoomFromVal = targetZoom;
    zoomToVal   = z;
    zoomDuration = duration;
    zoomTimer    = 0;
    zoomCallback = cb || null;
  }

  function shake(intensity, decay) {
    shakeIntensity = intensity;
    shakeDecay     = decay !== undefined ? decay : 0.5;
  }

  function reset() {
    x = 0; y = 0; targetX = 0; targetY = 0;
    zoom = 1; targetZoom = 1;
    shakeIntensity = 0;
    panTimer  = panDuration;
    zoomTimer = zoomDuration;
  }

  function setTarget(tx, ty) { targetX = tx; targetY = ty; }

  // ---- Pixel Dissolve (black-in) ----
  function startDissolve(canvas, duration, cb) {
    dissolveCanvas = canvas;
    dissolveCtx    = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const gs = 8;
    dissolvePixels = [];
    for (let px = 0; px < W; px += gs)
      for (let py = 0; py < H; py += gs)
        dissolvePixels.push({ x: px, y: py, w: gs, h: gs, delay: Math.random() });
    dissolvePixels.sort((a, b) => a.delay - b.delay);

    let t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      const prog = Math.min(1, (ts - t0) / duration);
      dissolveCtx.clearRect(0, 0, W, H);
      dissolvePixels.forEach(dp => {
        if (dp.delay <= prog) {
          dissolveCtx.fillStyle = '#0a0a0a';
          dissolveCtx.fillRect(dp.x, dp.y, dp.w, dp.h);
        }
      });
      if (prog < 1) requestAnimationFrame(step);
      else { if (cb) cb(); }
    }
    requestAnimationFrame(step);
  }

  // Reverse dissolve (black-out → reveal)
  function reverseDissolve(canvas, duration, cb) {
    dissolveCanvas = canvas;
    dissolveCtx    = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const gs = 8;
    dissolvePixels = [];
    for (let px = 0; px < W; px += gs)
      for (let py = 0; py < H; py += gs)
        dissolvePixels.push({ x: px, y: py, w: gs, h: gs, delay: Math.random() });

    let t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      const prog = Math.min(1, (ts - t0) / duration);
      dissolveCtx.clearRect(0, 0, W, H);
      dissolveCtx.fillStyle = '#0a0a0a';
      dissolveCtx.fillRect(0, 0, W, H);
      dissolvePixels.forEach(dp => {
        if (dp.delay > prog) dissolveCtx.clearRect(dp.x, dp.y, dp.w, dp.h);
      });
      if (prog < 1) requestAnimationFrame(step);
      else { dissolveCtx.clearRect(0, 0, W, H); if (cb) cb(); }
    }
    requestAnimationFrame(step);
  }

  return {
    update, apply, restore,
    panTo, zoomTo, shake, reset, setTarget,
    startDissolve, reverseDissolve,
    get x()    { return x; },
    get y()    { return y; },
    get zoom() { return zoom; },
  };
})();
