/* ===== TRANSITION.JS — Chapter transitions + pixel dissolve ===== */

const Transition = (() => {
  const overlay = document.getElementById('screen-overlay');

  // Simple fade-in / fade-out
  function fadeIn(duration = 400) {
    return new Promise(resolve => {
      overlay.style.transition = `opacity ${duration}ms ease`;
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'all';
      setTimeout(resolve, duration);
    });
  }

  function fadeOut(duration = 600) {
    return new Promise(resolve => {
      overlay.style.transition = `opacity ${duration}ms ease`;
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      setTimeout(resolve, duration);
    });
  }

  // Fade to black, run callback, fade back
  async function crossFade(cb, fadeInDur = 400, holdDur = 100, fadeOutDur = 600) {
    await fadeIn(fadeInDur);
    await Utils.sleep(holdDur);
    if (cb) await cb();
    await Utils.sleep(80);
    await fadeOut(fadeOutDur);
  }

  // Pixel dissolve transition (using a separate canvas layered on top)
  function pixelDissolve(canvas, duration, cb) {
    if (!canvas) { if (cb) cb(); return; }
    Camera.startDissolve(canvas, duration, cb);
  }

  // Chapter card flash
  function showChapterCard(num, title) {
    return new Promise(resolve => {
      // Build a temporary chapter card
      const card = document.createElement('div');
      card.style.cssText = `
        position: fixed; inset: 0; z-index: 8000;
        background: #0a0a0a;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 16px; opacity: 0;
        transition: opacity 0.4s ease;
        font-family: 'Press Start 2P', monospace;
      `;
      card.innerHTML = `
        <div style="font-size:8px;color:#c0392b;letter-spacing:4px;">CHAPTER ${String(num).padStart(2,'0')}</div>
        <div style="font-size:14px;color:#f0f0f0;letter-spacing:3px;text-align:center;">${title}</div>
        <div style="width:120px;height:2px;background:#6b0f1a;margin-top:8px;"></div>
      `;
      document.body.appendChild(card);
      setTimeout(() => { card.style.opacity = '1'; }, 30);
      setTimeout(() => {
        card.style.transition = 'opacity 0.6s ease';
        card.style.opacity = '0';
        setTimeout(() => { card.remove(); resolve(); }, 700);
      }, 1200);
    });
  }

  // Update chapter UI
  function setChapterUI(num, title) {
    const ui = document.getElementById('chapter-ui');
    const lbl = document.getElementById('ui-chapter-label');
    const ttl = document.getElementById('ui-chapter-title');
    if (lbl) lbl.textContent = `CHAPTER ${String(num).padStart(2,'0')}`;
    if (ttl) ttl.textContent = title;
    if (ui) ui.classList.add('visible');
  }

  function hideChapterUI() {
    const ui = document.getElementById('chapter-ui');
    if (ui) ui.classList.remove('visible');
  }

  return {
    fadeIn,
    fadeOut,
    crossFade,
    pixelDissolve,
    showChapterCard,
    setChapterUI,
    hideChapterUI,
  };
})();
