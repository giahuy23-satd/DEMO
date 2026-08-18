/* ===== AUDIO.JS — Web Audio API procedural sound engine ===== */

const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = false;
  let currentMusic = null;
  let musicNodes = {};

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.7;
      masterGain.connect(ctx.destination);

      musicGain = ctx.createGain();
      musicGain.gain.value = 0.35;
      musicGain.connect(masterGain);

      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.65;
      sfxGain.connect(masterGain);
    } catch (e) {
      console.warn('Web Audio not available');
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setMuted(v) {
    muted = v;
    if (masterGain) masterGain.gain.value = v ? 0 : 0.7;
  }

  function toggle() {
    setMuted(!muted);
    return !muted;
  }

  // ---- Oscillator helpers ----
  function osc(freq, type, dur, vol = 0.3, delay = 0) {
    if (!ctx || muted) return;
    resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(sfxGain);
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime + delay);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    o.start(ctx.currentTime + delay);
    o.stop(ctx.currentTime + delay + dur + 0.05);
  }

  function noise(dur, vol = 0.15, delay = 0) {
    if (!ctx || muted) return;
    resume();
    const bufLen = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    src.connect(g); g.connect(sfxGain);
    g.gain.setValueAtTime(vol, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    src.start(ctx.currentTime + delay);
  }

  // ---- Sound effects ----
  const SFX = {
    footstep() {
      noise(0.04, 0.06);
      osc(80, 'sine', 0.04, 0.08);
    },
    doorOpen() {
      for (let i = 0; i < 8; i++) {
        osc(200 + i * 30, 'sawtooth', 0.05, 0.1, i * 0.04);
      }
      noise(0.3, 0.08, 0.1);
    },
    keyboard() {
      osc(800 + Math.random() * 200, 'square', 0.02, 0.04);
      noise(0.02, 0.05);
    },
    notification() {
      osc(880, 'square', 0.06, 0.15);
      osc(1100, 'square', 0.06, 0.12, 0.08);
    },
    achievement() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => osc(n, 'square', 0.12, 0.18, i * 0.1));
    },
    levelUp() {
      const notes = [392, 523, 659, 784, 1047];
      notes.forEach((n, i) => osc(n, 'square', 0.15, 0.2, i * 0.08));
    },
    attack() {
      osc(150, 'sawtooth', 0.08, 0.3);
      noise(0.1, 0.2);
    },
    bossHit() {
      osc(80, 'sawtooth', 0.15, 0.4);
      noise(0.15, 0.3);
      osc(40, 'sine', 0.2, 0.3, 0.05);
    },
    bossDefeat() {
      noise(0.5, 0.4);
      for (let i = 0; i < 6; i++) {
        osc(200 - i * 20, 'sawtooth', 0.12, 0.3, i * 0.07);
      }
    },
    confetti() {
      for (let i = 0; i < 5; i++) {
        osc(1200 + Math.random() * 400, 'sine', 0.08, 0.1, i * 0.05);
      }
    },
    firework() {
      osc(1800, 'sine', 0.03, 0.2);
      noise(0.3, 0.35, 0.04);
      for (let i = 0; i < 4; i++) {
        osc(800 + Math.random() * 400, 'sine', 0.12, 0.12, 0.05 + i * 0.04);
      }
    },
    dialogue() {
      osc(440 + Math.random() * 80, 'square', 0.015, 0.06);
    },
    memoryFound() {
      const notes = [523, 784, 1047, 1568];
      notes.forEach((n, i) => osc(n, 'sine', 0.2, 0.15, i * 0.09));
    },
    rsvpConfirm() {
      const notes = [523, 659, 784, 1047, 1318];
      notes.forEach((n, i) => osc(n, 'square', 0.14, 0.2, i * 0.09));
      setTimeout(() => SFX.confetti(), 600);
    },
    capThrow() {
      osc(600, 'sine', 0.12, 0.2);
      osc(900, 'sine', 0.1, 0.15, 0.08);
    },
    diplomaReceive() {
      const notes = [392, 493, 587, 698, 880];
      notes.forEach((n, i) => osc(n, 'square', 0.18, 0.15, i * 0.1));
    },
  };

  // ---- Procedural Music ----
  // Each "track" is a looping sequence of oscillator events
  let musicInterval = null;
  let beatCount = 0;

  const TRACKS = {
    // Ambient – opening
    ambient: {
      bpm: 60, play(beat) {
        if (beat % 16 === 0) osc(65, 'sine', 2, 0.08, 0);
        if (beat % 8  === 0) osc(98, 'sine', 1.5, 0.05, 0);
        if (beat % 12 === 4) osc(130, 'sine', 1, 0.04, 0);
        // Pad
        if (beat % 32 === 0) {
          [130, 164, 196].forEach((f, i) => osc(f, 'sine', 4, 0.04, i * 0.3));
        }
      },
    },
    // Pixel school theme
    school: {
      bpm: 120, play(beat) {
        const melody = [523, 587, 659, 698, 784, 698, 659, 587];
        if (beat % 2 === 0) osc(melody[Math.floor(beat / 2) % melody.length], 'square', 0.22, 0.09);
        if (beat % 8 === 0) osc(130, 'square', 0.15, 0.07);
        if (beat % 4 === 2) osc(196, 'square', 0.1, 0.05);
        // hi-hat
        if (beat % 2 === 1) noise(0.03, 0.04);
        // bass
        if (beat % 4 === 0) osc(65, 'sawtooth', 0.08, 0.1);
      },
    },
    // Memory / nostalgic
    memory: {
      bpm: 72, play(beat) {
        const mel = [392, 440, 494, 523, 494, 440, 392, 330];
        if (beat % 3 === 0) osc(mel[Math.floor(beat / 3) % mel.length], 'sine', 0.5, 0.07);
        if (beat % 12 === 0) osc(130, 'sine', 1.2, 0.06);
        if (beat % 6  === 3) osc(165, 'sine', 0.6, 0.04);
      },
    },
    // Deadline – fast, tense
    deadline: {
      bpm: 160, play(beat) {
        if (beat % 2 === 0) osc(220, 'sawtooth', 0.06, 0.12);
        if (beat % 4 === 2) osc(277, 'sawtooth', 0.05, 0.1);
        if (beat % 8 === 0) osc(110, 'sawtooth', 0.1, 0.15);
        if (beat % 2 === 1) noise(0.02, 0.08);
        if (beat % 16 === 8) osc(440, 'square', 0.04, 0.08);
      },
    },
    // Boss battle
    boss: {
      bpm: 140, play(beat) {
        const riff = [110, 0, 147, 0, 110, 0, 131, 123];
        const n = riff[beat % riff.length];
        if (n) osc(n, 'sawtooth', 0.12, 0.2);
        if (beat % 4 === 0) { osc(55, 'sawtooth', 0.1, 0.3); noise(0.06, 0.2); }
        if (beat % 4 === 2) noise(0.04, 0.15);
        if (beat % 8 === 4) osc(220, 'square', 0.06, 0.1);
      },
    },
    // Graduation – emotional
    graduation: {
      bpm: 90, play(beat) {
        const mel = [523, 659, 784, 880, 784, 659, 523, 440];
        if (beat % 2 === 0) osc(mel[Math.floor(beat / 2) % mel.length], 'sine', 0.4, 0.1);
        if (beat % 8 === 0) {
          [261, 329, 392].forEach((f, i) => osc(f, 'sine', 1.5, 0.05, i * 0.1));
        }
        if (beat % 4 === 2) osc(196, 'sine', 0.3, 0.06);
        // Bells
        if (beat % 16 === 0) osc(1046, 'sine', 0.5, 0.06);
        if (beat % 16 === 8) osc(880,  'sine', 0.5, 0.06);
      },
    },
    // Final / peaceful
    final: {
      bpm: 68, play(beat) {
        if (beat % 4 === 0) {
          [261, 329, 392, 523].forEach((f, i) => osc(f, 'sine', 2, 0.04, i * 0.15));
        }
        if (beat % 8 === 4) osc(196, 'sine', 1.5, 0.05);
        if (beat % 16 === 0) osc(1046, 'sine', 0.8, 0.04);
      },
    },
  };

  function playMusic(trackName) {
    if (currentMusic === trackName) return;
    stopMusic();
    currentMusic = trackName;
    const track = TRACKS[trackName];
    if (!track || muted || !ctx) return;
    beatCount = 0;
    const beatDur = 60000 / track.bpm;
    musicInterval = setInterval(() => {
      if (!muted && ctx) track.play(beatCount);
      beatCount++;
    }, beatDur);
  }

  function stopMusic() {
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
    currentMusic = null;
  }

  function crossfadeMusic(nextTrack, fadeDur = 1000) {
    stopMusic();
    setTimeout(() => playMusic(nextTrack), fadeDur * 0.5);
  }

  return {
    init,
    resume,
    toggle,
    setMuted,
    SFX,
    playMusic,
    stopMusic,
    crossfadeMusic,
    get muted() { return muted; },
  };
})();
