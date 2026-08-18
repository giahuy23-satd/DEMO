/* ===== UTILS.JS — Shared helpers ===== */

const Utils = (() => {
  // Show / hide a screen
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  // Fade overlay in then run callback, then fade out
  function fadeTransition(cb, duration = 400) {
    const overlay = document.getElementById('screen-overlay');
    overlay.classList.add('fade-in');
    overlay.style.transition = `opacity ${duration}ms ease`;
    setTimeout(() => {
      if (cb) cb();
      overlay.classList.remove('fade-in');
      overlay.classList.add('fade-out');
      overlay.style.transition = `opacity ${duration * 1.5}ms ease`;
      setTimeout(() => overlay.classList.remove('fade-out'), duration * 1.5);
    }, duration);
  }

  // Show a floating notification
  function notify(msg, duration = 2200) {
    const el = document.getElementById('notification');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), duration);
  }

  // Shake the screen
  function shakeScreen() {
    const app = document.getElementById('app');
    app.classList.add('shake');
    setTimeout(() => app.classList.remove('shake'), 600);
  }

  // Sleep helper
  function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  // Random integer between a and b (inclusive)
  function randInt(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  // Linear interpolation
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Clamp
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // Generate session id
  function sessionId() {
    return 'sess_' + Math.random().toString(36).slice(2, 11);
  }

  // Ease in-out quad
  function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  return { showScreen, fadeTransition, notify, shakeScreen, sleep, randInt, lerp, clamp, sessionId, easeInOut };
})();

// Global session id
window.SESSION_ID = Utils.sessionId();
