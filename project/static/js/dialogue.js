/* ===== DIALOGUE.JS — Dialogue & Typewriter system ===== */

const Dialogue = (() => {
  const box      = document.getElementById('dialogue-box');
  const speaker  = document.getElementById('dialogue-speaker');
  const textEl   = document.getElementById('dialogue-text');
  const choices  = document.getElementById('dialogue-choices');

  let typingInterval = null;
  let currentResolve = null;
  let isTyping = false;
  let currentText = '';
  let charIndex = 0;
  const TYPING_SPEED = 38; // ms per char

  // Show dialogue box
  function show(speakerName) {
    box.classList.add('visible');
    speaker.textContent = speakerName || 'GUIDE';
    choices.style.display = 'none';
    choices.innerHTML = '';
  }

  // Hide dialogue box
  function hide() {
    box.classList.remove('visible');
    stopTyping();
    choices.style.display = 'none';
    choices.innerHTML     = '';
    textEl.innerHTML      = '';
    const hint = document.getElementById('dlg-hint');
    if (hint) hint.style.display = 'none';
  }

  // Type text (returns promise that resolves when done or clicked)
  // If autoAdvance not specified → waits for click
  function typeLine(text, speakerName, autoAdvance = false, autoDelay = 0) {
    return new Promise(resolve => {
      stopTyping();
      show(speakerName);
      currentResolve = resolve;
      currentText    = text;
      charIndex      = 0;
      textEl.innerHTML = '';
      isTyping = true;

      typingInterval = setInterval(() => {
        if (charIndex < text.length) {
          charIndex++;
          // Play typing sound every 3 chars
          if (charIndex % 3 === 0 && typeof Audio !== 'undefined' && Audio.SFX) {
            Audio.SFX.dialogue();
          }
          textEl.innerHTML = text.slice(0, charIndex) +
            (charIndex < text.length ? '<span class="dialogue-cursor"></span>' : '');
        } else {
          stopTyping();
          textEl.innerHTML = text;
          isTyping = false;

          if (autoAdvance) {
            setTimeout(() => {
              if (currentResolve) { currentResolve(); currentResolve = null; }
            }, autoDelay || 1800);
          } else {
            textEl.innerHTML += '<span class="dialogue-cursor"></span>';
            const hint = document.getElementById('dlg-hint');
            if (hint) hint.style.display = 'block';
            box.addEventListener('click', advanceOnce);
          }
        }
      }, TYPING_SPEED);
    });
  }

  function advanceOnce() {
    box.removeEventListener('click', advanceOnce);
    const hint = document.getElementById('dlg-hint');
    if (hint) hint.style.display = 'none';
    textEl.innerHTML = currentText;
    if (currentResolve) { currentResolve(); currentResolve = null; }
  }

  function stopTyping() {
    if (typingInterval) { clearInterval(typingInterval); typingInterval = null; }
    box.removeEventListener('click', advanceOnce);
    isTyping = false;
  }

  // Show choices and return chosen value
  function showChoices(options) {
    return new Promise(resolve => {
      choices.style.display = 'flex';
      choices.innerHTML = '';
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'dialogue-choice';
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          choices.style.display = 'none';
          choices.innerHTML = '';
          resolve(opt.value);
        });
        choices.appendChild(btn);
      });
    });
  }

  // Run a sequence of lines
  async function runSequence(lines, defaultSpeaker = 'GUIDE') {
    for (const line of lines) {
      if (typeof line === 'string') {
        await typeLine(line, defaultSpeaker, true, 1800);
      } else {
        await typeLine(line.text, line.speaker || defaultSpeaker, line.auto !== false, line.delay || 1800);
      }
    }
  }

  // Typewriter for intro screen
  function typeIntro(text, elementId, speed = 60) {
    return new Promise(resolve => {
      const el = document.getElementById(elementId);
      if (!el) { resolve(); return; }
      el.style.opacity = '1';
      let i = 0;
      el.textContent = '';
      const iv = setInterval(() => {
        if (i < text.length) {
          el.textContent += text[i];
          i++;
        } else {
          clearInterval(iv);
          resolve();
        }
      }, speed);
    });
  }

  return {
    show,
    hide,
    typeLine,
    showChoices,
    runSequence,
    typeIntro,
    stopTyping,
    get isTyping() { return isTyping; },
  };
})();
