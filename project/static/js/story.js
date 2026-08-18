/* ===== STORY.JS — Main Story Engine ===== */

// Safe audio helper — never crashes even if AudioContext is locked
const SFX = {
  play(name) {
    try { if (window.Audio && Audio.SFX && Audio.SFX[name]) Audio.SFX[name](); } catch(e) {}
  },
  music(name) {
    try { if (window.Audio && Audio.crossfadeMusic) Audio.crossfadeMusic(name); } catch(e) {}
  },
};

const Story = (() => {

  // ── Canvas ──────────────────────────────────────────────────────────────────
  let canvas, ctx;

  let W = window.innerWidth;
  let H = window.innerHeight;
  let frameCount   = 0;
  let animId       = null;

  // ── Guide position ──────────────────────────────────────────────────────────
  let guideX       = 0;
  let guideY       = 0;
  let guideTargetX = 0;
  let moveCallback = null;
  let stepTimer    = 0;

  // ── Scene ───────────────────────────────────────────────────────────────────
  let currentScene  = 'black';
  let interactables = [];

  // ── Timeline ────────────────────────────────────────────────────────────────
  let activeYear = -1;   // was Story._activeYear — now a plain local variable

  // ── Boss ────────────────────────────────────────────────────────────────────
  let bossHP        = 100;
  let bossTasksDone = 0;
  const BOSS_TASKS  = ['EXAM', 'PROJECT', 'DEADLINE', 'PRESENTATION', 'FINAL PROJECT'];

  // ── Deadline ─────────────────────────────────────────────────────────────────
  let deadlineSecs   = 86399;
  let submitProgress = 0;
  let submitDone     = false;
  let deadlineInterv = null;

  // ── Door ─────────────────────────────────────────────────────────────────────
  let doorOpen  = 0;
  let doorLabel = '';

  // ── Memories ─────────────────────────────────────────────────────────────────
  const MEMORIES = [
    { id:'mem01', num:'#01', title:'THE FIRST DAY',
      content:'Ngày đầu tiên bước vào cổng trường.\nMọi thứ đều còn mới mẻ và hơi đáng sợ.' },
    { id:'mem02', num:'#02', title:'THE FIRST FRIEND',
      content:'"Bạn cũng không biết phòng học ở đâu à?"\nCâu nói đầu tiên. Người bạn đầu tiên.' },
    { id:'mem03', num:'#03', title:'THE FIRST PROJECT',
      content:'Bài tập nhóm đầu tiên. 3 giờ sáng.\nDeadline trong 2 tiếng. Vẫn kịp nộp.' },
    { id:'mem04', num:'#04', title:'THE LAST PRESENTATION',
      content:'Bài thuyết trình cuối cùng.\nTay run. Tim đập. Nhưng chúng ta đã làm được.' },
    { id:'mem05', num:'#05', title:'THE LAST DAY',
      content:'Ngày cuối cùng ngồi trong lớp.\nMọi thứ bỗng nhiên trở nên rất nhẹ nhàng.' },
  ];
  const foundMemories = new Set();

  // ── Timeline data ────────────────────────────────────────────────────────────
  const YEARS  = [
    { y:'2022', lbl:'THE BEGINNING',    line:'Mọi thứ bắt đầu.' },
    { y:'2023', lbl:'THE FRIENDSHIPS',  line:'Chúng ta bắt đầu có những người bạn.' },
    { y:'2024', lbl:'THE CHALLENGES',   line:'Những bài tập bắt đầu nhiều hơn.' },
    { y:'2025', lbl:'THE FINAL PUSH',   line:'Những ngày cuối cùng bắt đầu đến gần.' },
    { y:'2026', lbl:'THE LAST CHAPTER', line:'Và rồi... chúng ta ở đây.' },
  ];
  const YEAR_X = [0.12, 0.30, 0.50, 0.70, 0.88];

  // ═══════════════════════════════════════════════════════════════════════════
  //  RESIZE
  // ═══════════════════════════════════════════════════════════════════════════
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    if (canvas) { canvas.width = W; canvas.height = H; }
    guideY = H * 0.75;
  }
  window.addEventListener('resize', resize);

  // ═══════════════════════════════════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  function startLoop() {
    if (!canvas) {
      canvas = document.getElementById('game-canvas');
      ctx    = canvas.getContext('2d');
    }
    if (animId) cancelAnimationFrame(animId);
    function loop() {
      animId = requestAnimationFrame(loop);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
      frameCount++;
      Camera.update();
      render();
      updateMovement();
    }
    loop();
  }

  function stopLoop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    if (currentScene === 'black') {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, W, H);
      return;
    }

    switch (currentScene) {
      case 'hallway':    Renderer.drawHallway(ctx, W, H, frameCount);    break;
      case 'university': Renderer.drawUniversity(ctx, W, H, frameCount); break;
      case 'classroom':  Renderer.drawClassroom(ctx, W, H, frameCount);  break;
      case 'deadline':   Renderer.drawDeadline(ctx, W, H, frameCount);   break;
      case 'boss':       Renderer.drawBossScene(ctx, W, H, frameCount, bossHP); break;
      case 'graduation': Renderer.drawGraduation(ctx, W, H, frameCount); break;
      case 'final':      Renderer.drawFinalScene(ctx, W, H, frameCount); break;
      case 'timeline':
        Renderer.drawHallway(ctx, W, H, frameCount);
        drawTimeline();
        break;
    }

    // Door overlay
    if (doorOpen > 0 && doorOpen < 1) drawDoorOverlay();

    // Deadline HUD
    if (currentScene === 'deadline') drawDeadlineHUD();

    // Interactable hotspots
    drawHotspots();

    // Guide character
    Character.draw(ctx, guideX, guideY, frameCount);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SCENE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  function drawDoorOverlay() {
    const cx = W / 2, dw = 60, dh = 90;
    const x  = cx - dw / 2, y  = H * 0.38;
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(x - 4, y - 4, dw + 8, dh + 4);
    ctx.strokeStyle = '#6b0f1a';
    ctx.lineWidth   = 3;
    ctx.strokeRect(x - 4, y - 4, dw + 8, dh + 4);
    const visibleW = dw * (1 - Math.min(1, doorOpen));
    ctx.fillStyle = '#2a0000';
    ctx.fillRect(x, y, visibleW, dh);
    ctx.fillStyle = '#f0c040';
    ctx.fillRect(x + visibleW - 6, y + dh * 0.45, 5, 5);
    if (doorLabel) {
      ctx.fillStyle = '#f0c040';
      ctx.font = '8px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(doorLabel, cx, y - 12);
      ctx.textAlign = 'left';
    }
  }

  function drawTimeline() {
    const ly = H * 0.5;
    ctx.strokeStyle = '#6b0f1a';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(W * 0.08, ly);
    ctx.lineTo(W * 0.92, ly);
    ctx.stroke();

    YEARS.forEach((yr, i) => {
      const x  = W * YEAR_X[i];
      const on = activeYear === i;
      ctx.save();
      ctx.translate(x, ly);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = on ? '#f0c040' : '#6b0f1a';
      ctx.fillRect(-7, -7, 14, 14);
      if (on) {
        ctx.strokeStyle = '#f0c040';
        ctx.lineWidth   = 1.5;
        ctx.strokeRect(-11, -11, 22, 22);
      }
      ctx.restore();
      ctx.fillStyle   = on ? '#f0c040' : '#c0392b';
      ctx.font        = '7px "Press Start 2P"';
      ctx.textAlign   = 'center';
      ctx.fillText(yr.y, x, ly + 28);
      ctx.fillStyle   = on ? '#f0f0f0' : '#444444';
      ctx.font        = '5px "Press Start 2P"';
      ctx.fillText(yr.lbl, x, ly + 40);
    });
    ctx.textAlign = 'left';
  }

  function drawDeadlineHUD() {
    const cx = W / 2, cy = H * 0.28;
    const ts = [
      String(Math.floor(deadlineSecs / 3600)).padStart(2,'0'),
      String(Math.floor((deadlineSecs % 3600) / 60)).padStart(2,'0'),
      String(deadlineSecs % 60).padStart(2,'0'),
    ].join(':');

    ctx.fillStyle = '#050010';
    ctx.fillRect(cx - 130, cy - 54, 260, 84);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth   = 3;
    ctx.strokeRect(cx - 130, cy - 54, 260, 84);
    ctx.fillStyle = '#c0392b';
    ctx.font = '6px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ DEADLINE', cx, cy - 36);
    ctx.fillStyle = '#e74c3c';
    ctx.font = '26px "Press Start 2P"';
    ctx.fillText(ts, cx, cy + 8);

    if (submitProgress > 0) {
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(cx - 110, cy + 22, 220, 16);
      ctx.fillStyle = submitDone ? '#f0c040' : '#c0392b';
      ctx.fillRect(cx - 110, cy + 22, 220 * (submitProgress / 100), 16);
      ctx.fillStyle = '#f0f0f0';
      ctx.font = '5px "Press Start 2P"';
      ctx.fillText(submitDone ? 'SUBMISSION COMPLETE!' : `SUBMITTING... ${submitProgress}%`, cx, cy + 35);
    }
    ctx.textAlign = 'left';
  }

  function drawHotspots() {
    interactables.forEach(obj => {
      const glow = 0.6 + 0.4 * Math.sin(frameCount * 0.07 + obj.phase);
      const gr = ctx.createRadialGradient(obj.x, obj.y, 4, obj.x, obj.y, 30);
      gr.addColorStop(0, 'rgba(240,192,64,0.35)');
      gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = glow;
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.icon, obj.x, obj.y);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#f0c040';
      ctx.font = '6px "Press Start 2P"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('!', obj.x + 10, obj.y - 12);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MOVEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  function moveGuideTo(tx) {
    guideTargetX = tx;
    const dir  = tx > guideX;
    Character.setFacing(dir);
    const dist = Math.abs(tx - guideX);
    Character.setAnimation(dist > W * 0.25 ? Character.ANIM.RUN : Character.ANIM.WALK);
  }

  function updateMovement() {
    const dist = Math.abs(guideX - guideTargetX);
    if (dist > 3) {
      guideX += (guideTargetX - guideX) * (Character.getAnim() === Character.ANIM.RUN ? 0.10 : 0.06);
      stepTimer++;
      const rate = Character.getAnim() === Character.ANIM.RUN ? 14 : 20;
      if (stepTimer % rate === 0) SFX.play('footstep');
      if (Character.getAnim() === Character.ANIM.RUN) Camera.shake(0.8, 0.12);
    } else if ([Character.ANIM.WALK, Character.ANIM.RUN].includes(Character.getAnim())) {
      Character.setAnimation(Character.ANIM.IDLE);
      if (moveCallback) { const cb = moveCallback; moveCallback = null; cb(); }
    }
  }

  function waitForMove(tx) {
    return new Promise(resolve => {
      moveCallback = resolve;
      moveGuideTo(tx);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CANVAS CLICK
  // ═══════════════════════════════════════════════════════════════════════════
  function setupClick() {
    const cvs = document.getElementById('game-canvas');
    if (!cvs) return;
    cvs.addEventListener('click', async (e) => {
      const rect = cvs.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top)  * (H / rect.height);
      for (let i = 0; i < interactables.length; i++) {
        if (Math.hypot(mx - interactables[i].x, my - interactables[i].y) < 38) {
          const obj = interactables.splice(i, 1)[0];
          await handleHotspot(obj);
          break;
        }
      }
    });
  }

  async function handleHotspot(obj) {
    SFX.play('memoryFound');
    Particle.sparkGold(obj.x, obj.y);
    const specials = { coffee:'Mana +50.', book:'Có những thứ đọc đi đọc lại vẫn không nhớ.', clock:'WARNING: DEADLINE APPROACHING.' };
    if (specials[obj.id]) {
      await Dialogue.typeLine(specials[obj.id], 'GUIDE', true, 1800);
      Dialogue.hide();
    } else if (obj.id.startsWith('mem')) {
      await showMemory(obj.id);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MEMORY POPUP
  // ═══════════════════════════════════════════════════════════════════════════
  async function showMemory(id) {
    if (foundMemories.has(id)) return;
    foundMemories.add(id);
    const mem = MEMORIES.find(m => m.id === id);
    if (!mem) return;
    Utils.notify(`✦ MEMORY FOUND: ${mem.title}`);
    document.getElementById('mem-number').textContent  = `MEMORY ${mem.num}`;
    document.getElementById('mem-title').textContent   = mem.title;
    document.getElementById('mem-content').textContent = mem.content;
    const popup = document.getElementById('memory-popup');
    popup.classList.add('visible');
    return new Promise(resolve => {
      const yesBtn = document.getElementById('mem-yes');
      const noBtn  = document.getElementById('mem-no');
      const handle = async (ans) => {
        yesBtn.onclick = null; noBtn.onclick = null;
        popup.classList.remove('visible');
        fetch('/api/memory', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ session_id: window.SESSION_ID, memory_id: id, response: ans }) }).catch(()=>{});
        if (ans === 'yes') await Dialogue.typeLine('Mình cũng nhớ.', 'GUIDE', true, 1600);
        else {
          await Dialogue.typeLine('Không sao.', 'GUIDE', true, 1000);
          await Dialogue.typeLine('Có lẽ chúng ta nên tạo thêm một kỷ niệm mới.', 'GUIDE', true, 2000);
        }
        Dialogue.hide();
        resolve(ans);
      };
      yesBtn.onclick = () => handle('yes');
      noBtn.onclick  = () => handle('no');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  async function openDoor(label) {
    doorLabel = label;
    doorOpen  = 0;
    SFX.play('doorOpen');
    for (let t = 0; t <= 30; t++) {
      doorOpen = t / 30;
      await Utils.sleep(18);
    }
    doorOpen  = 0;
    doorLabel = '';
  }

  async function changeScene(name, opts = {}) {
    await Transition.crossFade(async () => {
      currentScene  = name;
      interactables = (opts.hotspots || []).map(h => ({
        ...h,
        x: typeof h.x === 'number' && h.x <= 1 ? W * h.x : h.x,
        y: typeof h.y === 'number' && h.y <= 1 ? H * h.y : h.y,
      }));
      if (opts.guideX !== undefined) { guideX = W * opts.guideX; guideTargetX = guideX; }
      if (opts.anim)  Character.setAnimation(opts.anim);
      if (opts.face !== undefined) Character.setFacing(opts.face);
    }, opts.fadeIn || 400, opts.hold || 60, opts.fadeOut || 600);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHAPTER 00 — THE BEGINNING (intro typewriter)
  // ═══════════════════════════════════════════════════════════════════════════
  async function ch00_Intro() {
    document.getElementById('intro-title-wrap').classList.remove('visible');
    const typeEl = document.getElementById('intro-typetext');
    const lines  = [
      'THERE IS ONE MORE STORY TO TELL.',
      'A STORY ABOUT FOUR YEARS.',
      'A STORY ABOUT MEMORIES.',
      'AND A STORY ABOUT THE DAY IT ALL ENDS.',
    ];

    await Utils.sleep(500);

    for (const line of lines) {
      typeEl.style.opacity = '0';
      typeEl.textContent   = '';
      await Utils.sleep(500);
      typeEl.style.transition = 'opacity 0.5s';
      typeEl.style.opacity    = '1';
      for (let i = 0; i <= line.length; i++) {
        typeEl.textContent = line.slice(0, i);
        await Utils.sleep(46);
      }
      await Utils.sleep(1400);
      typeEl.style.opacity = '0';
      await Utils.sleep(550);
    }

    typeEl.textContent = '';
    await Utils.sleep(200);
    document.getElementById('intro-title-wrap').classList.add('visible');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  START STORY
  // ═══════════════════════════════════════════════════════════════════════════
  async function startStory() {
    SFX.music('ambient');
    Particle.stopIntroPixels();

    // Fade to story screen
    const ov = document.getElementById('screen-overlay');
    ov.style.background    = '#0a0a0a';
    ov.style.transition    = 'opacity 0.5s';
    ov.style.opacity       = '1';
    ov.style.pointerEvents = 'none';
    await Utils.sleep(550);

    Utils.showScreen('screen-story');

    // Init canvas
    canvas = document.getElementById('game-canvas');
    ctx    = canvas.getContext('2d');
    resize();
    currentScene = 'hallway';
    guideX = guideTargetX = W * 0.5;
    guideY = H * 0.74;
    Character.setAnimation(Character.ANIM.IDLE);
    Character.setFacing(false);
    setupClick();
    startLoop();

    ov.style.transition    = 'opacity 0.8s';
    ov.style.opacity       = '0';
    ov.style.pointerEvents = 'none';
    await Utils.sleep(850);

    Transition.setChapterUI('00', 'THE BEGINNING');

    // Guide walks toward camera
    await Utils.sleep(1000);
    Character.setAnimation(Character.ANIM.WALK);
    await Utils.sleep(1600);
    Character.setAnimation(Character.ANIM.LOOK_AT_CAM);
    await Utils.sleep(500);

    await Dialogue.typeLine('Bạn đến rồi.', 'GUIDE');
    await Dialogue.typeLine('Mình đã chờ bạn khá lâu.', 'GUIDE');
    Character.setAnimation(Character.ANIM.POINT);
    await Dialogue.typeLine('Mình muốn cho bạn xem một thứ.', 'GUIDE');
    Character.setAnimation(Character.ANIM.TALK);
    await Dialogue.typeLine('Đi theo mình.', 'GUIDE', true, 1200);
    Dialogue.hide();

    Character.setFacing(true);
    await waitForMove(W * 0.7);
    await ch01_FirstDay();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHAPTER 01 — THE FIRST DAY
  // ═══════════════════════════════════════════════════════════════════════════
  async function ch01_FirstDay() {
    await Transition.showChapterCard('01', 'THE FIRST DAY');
    Transition.setChapterUI('01', 'THE FIRST DAY');
    SFX.music('school');

    await openDoor('2022');
    await changeScene('university', {
      guideX: 0.25, anim: Character.ANIM.IDLE, face: true,
      hotspots: [
        { x: 0.15, y: 0.58, icon:'📚', phase:0,   id:'mem01' },
        { x: 0.78, y: 0.56, icon:'🎒', phase:1.3, id:'mem02' },
      ],
    });

    await Dialogue.typeLine('Ngày đầu tiên...', 'GUIDE');
    await Dialogue.typeLine('Có lẽ lúc đó chẳng ai nghĩ rằng nơi này sẽ trở thành một phần ký ức lớn đến vậy.', 'GUIDE');
    Camera.zoomTo(1.06, 50);
    await Dialogue.typeLine('Lúc đó, chúng ta chỉ nghĩ rằng mình đang bắt đầu một chặng đường mới.', 'GUIDE');
    Camera.zoomTo(1, 60);
    moveGuideTo(W * 0.5);
    await Utils.sleep(600);
    await Dialogue.typeLine('Nhưng chúng ta chưa biết rằng chặng đường đó sẽ dài đến thế nào.', 'GUIDE', true, 2600);
    Dialogue.hide();
    await ch02_TheYears();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHAPTER 02 — THE YEARS
  // ═══════════════════════════════════════════════════════════════════════════
  async function ch02_TheYears() {
    await Transition.showChapterCard('02', 'THE YEARS');
    Transition.setChapterUI('02', 'THE YEARS');

    await changeScene('timeline', { guideX: 0.08, anim: Character.ANIM.IDLE, face: true });

    for (let i = 0; i < YEARS.length; i++) {
      activeYear = i;
      await waitForMove(W * YEAR_X[i]);
      Character.setAnimation(Character.ANIM.IDLE);
      Particle.sparkGold(W * YEAR_X[i], H * 0.5);
      SFX.play('achievement');
      await Dialogue.typeLine(YEARS[i].line, YEARS[i].y, true, 1600);
    }
    activeYear = -1;

    await Dialogue.typeLine('Nhưng trước khi đến đó...', 'GUIDE', true, 1800);
    await Dialogue.typeLine('Có một vài điều chúng ta nên nhớ lại.', 'GUIDE', true, 2000);
    Dialogue.hide();
    await ch03_Memories();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHAPTER 03 — THE MEMORIES
  // ═══════════════════════════════════════════════════════════════════════════
  async function ch03_Memories() {
    await Transition.showChapterCard('03', 'THE MEMORIES');
    Transition.setChapterUI('03', 'THE MEMORIES');
    SFX.music('memory');

    await changeScene('classroom', {
      guideX: 0.18, anim: Character.ANIM.IDLE, face: true,
      hotspots: [
        { x:0.14, y:0.55, icon:'💻', phase:0,   id:'mem03' },
        { x:0.55, y:0.58, icon:'☕', phase:0.9, id:'coffee' },
        { x:0.76, y:0.52, icon:'📖', phase:1.6, id:'book' },
      ],
    });

    moveGuideTo(W * 0.38);
    await Utils.sleep(900);
    Character.setAnimation(Character.ANIM.LOOK_AT_CAM);
    await Utils.sleep(600);
    await Dialogue.typeLine('Chắc bạn hiểu.', 'GUIDE', true, 1400);

    moveGuideTo(W * 0.5);
    await Utils.sleep(600);
    Character.setAnimation(Character.ANIM.SIT);
    await Utils.sleep(300);
    Character.setAnimation(Character.ANIM.TYPE);
    SFX.play('keyboard');

    await Dialogue.typeLine('Có những ngày chúng ta học cả ngày.', 'GUIDE');
    await Dialogue.typeLine('Có những ngày chúng ta chẳng muốn học gì cả.', 'GUIDE');
    Character.setAnimation(Character.ANIM.LOOK_AT_CAM);
    await Dialogue.typeLine('Nhưng cuối cùng...', 'GUIDE', true, 1400);
    Character.setAnimation(Character.ANIM.IDLE);
    await Dialogue.typeLine('...vẫn phải học.', 'GUIDE', true, 1400);
    Dialogue.hide();
    await ch_Deadline();
  }

  // ── DEADLINE SCENE ──────────────────────────────────────────────────────────
  async function ch_Deadline() {
    SFX.music('deadline');
    await changeScene('deadline', {
      guideX: 0.12, anim: Character.ANIM.IDLE, face: true,
      hotspots: [{ x:0.5, y:0.48, icon:'⏰', phase:0, id:'clock' }],
      fadeIn: 200, fadeOut: 400,
    });

    deadlineSecs = 86399; submitProgress = 0; submitDone = false;
    clearInterval(deadlineInterv);
    deadlineInterv = setInterval(() => { if (deadlineSecs > 0) deadlineSecs--; }, 70);
    Camera.shake(5, 0.25);

    Character.setAnimation(Character.ANIM.RUN);
    moveGuideTo(W * 0.42);
    await Utils.sleep(700);
    Character.setAnimation(Character.ANIM.LOOK_AT_CAM);
    await Dialogue.typeLine('Không còn nhiều thời gian.', 'GUIDE');
    Character.setAnimation(Character.ANIM.RUN);
    moveGuideTo(W * 0.5);
    Camera.shake(3, 0.2);
    await Utils.sleep(600);
    Character.setAnimation(Character.ANIM.SIT);
    await Utils.sleep(200);
    Character.setAnimation(Character.ANIM.TYPE);
    SFX.play('keyboard');

    for (let p = 0; p <= 100; p += 25) {
      submitProgress = p;
      SFX.play('keyboard');
      await Utils.sleep(380);
    }
    submitDone = true;
    clearInterval(deadlineInterv);
    SFX.play('achievement');
    Particle.sparkGold(W * 0.5, H * 0.55);
    Utils.notify('✓ SUBMISSION COMPLETE!');
    interactables = [];

    Character.setAnimation(Character.ANIM.LOOK_AT_CAM);
    await Utils.sleep(600);
    await Dialogue.typeLine('Thấy chưa?', 'GUIDE', true, 1200);
    await Dialogue.typeLine('Vẫn sống.', 'GUIDE', true, 1200);
    Dialogue.hide();
    await ch04_Friends();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHAPTER 04 — THE FRIENDS
  // ═══════════════════════════════════════════════════════════════════════════
  async function ch04_Friends() {
    await Transition.showChapterCard('04', 'THE FRIENDS');
    Transition.setChapterUI('04', 'THE FRIENDS');
    SFX.music('school');

    await changeScene('university', {
      guideX: 0.32, anim: Character.ANIM.IDLE, face: true,
      hotspots: [
        { x:0.16, y:0.59, icon:'📸', phase:0,   id:'mem04' },
        { x:0.84, y:0.57, icon:'🎭', phase:1.1, id:'mem05' },
      ],
    });

    moveGuideTo(W * 0.5);
    await Utils.sleep(900);
    Character.setAnimation(Character.ANIM.SIT);
    await Utils.sleep(300);

    await Dialogue.typeLine('Có những thứ không nằm trong giáo trình.', 'GUIDE');
    await Dialogue.typeLine('Không có trong bài kiểm tra.', 'GUIDE');
    Camera.zoomTo(1.1, 55);
    await Dialogue.typeLine('Nhưng lại là thứ chúng ta nhớ lâu nhất.', 'GUIDE', true, 2400);
    Camera.zoomTo(1, 70);
    Particle.sparkGold(W * 0.3, H * 0.65);
    Particle.sparkGold(W * 0.7, H * 0.65);
    Dialogue.hide();
    await ch05_HardPart();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHAPTER 05 — THE HARD PART
  // ═══════════════════════════════════════════════════════════════════════════
  async function ch05_HardPart() {
    await Transition.showChapterCard('05', 'THE HARD PART');
    Transition.setChapterUI('05', 'THE HARD PART');
    SFX.music('ambient');

    await changeScene('hallway', { guideX: 0.12, anim: Character.ANIM.IDLE, face: true });

    moveGuideTo(W * 0.45);
    await Utils.sleep(1200);
    await Dialogue.typeLine('Không phải ngày nào cũng dễ dàng.', 'GUIDE');
    moveGuideTo(W * 0.52);
    await Utils.sleep(400);
    await Dialogue.typeLine('Có những ngày chúng ta mệt.', 'GUIDE');
    await Dialogue.typeLine('Có những ngày chúng ta nghi ngờ bản thân.', 'GUIDE');

    Camera.zoomTo(1.12, 55);
    Character.setAnimation(Character.ANIM.LOOK_AT_CAM);
    await Dialogue.typeLine('Có những ngày chúng ta chỉ muốn bỏ cuộc.', 'GUIDE', true, 2200);
    Camera.zoomTo(1, 65);

    Character.setFacing(true);
    moveGuideTo(W * 0.72);
    await Utils.sleep(600);
    await Dialogue.typeLine('Nhưng rồi...', 'GUIDE', true, 1400);
    await Dialogue.typeLine('...chúng ta vẫn bước tiếp.', 'GUIDE', true, 1600);
    Dialogue.hide();
    await ch06_FinalBoss();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHAPTER 06 — THE FINAL BOSS
  // ═══════════════════════════════════════════════════════════════════════════
  async function ch06_FinalBoss() {
    await Transition.showChapterCard('06', 'THE FINAL BOSS');
    Transition.setChapterUI('06', 'THE FINAL BOSS');

    await changeScene('hallway', { guideX: 0.28, anim: Character.ANIM.IDLE, face: true });
    await waitForMove(W * 0.5);
    Character.setAnimation(Character.ANIM.LOOK_AT_CAM);
    await Dialogue.typeLine('Đây là thử thách cuối cùng.', 'GUIDE');
    await openDoor('FINAL YEAR');

    await changeScene('boss', { guideX: 0.5, anim: Character.ANIM.IDLE, face: false, fadeIn:500, fadeOut:0 });
    bossHP = 100; bossTasksDone = 0;
    SFX.music('boss');
    Camera.shake(6, 0.3);

    document.getElementById('boss-ui').classList.add('visible');
    updateBossUI();

    Character.setAnimation(Character.ANIM.LOOK_AT_CAM);
    await Dialogue.typeLine('Đừng lo.', 'GUIDE', true, 1200);
    await Dialogue.typeLine('Lần này...', 'GUIDE', true, 1200);
    await Dialogue.typeLine('Chúng ta sẽ cùng nhau vượt qua.', 'GUIDE', true, 1800);
    Dialogue.hide();
    await runBossBattle();
  }

  function updateBossUI() {
    const bar   = document.getElementById('boss-hp-bar');
    const txt   = document.getElementById('boss-hp-text');
    const tasks = document.getElementById('boss-tasks');
    if (bar) { bar.style.width = bossHP + '%'; bar.setAttribute('aria-valuenow', bossHP); }
    if (txt) txt.textContent = `HP: ${bossHP}%`;
    if (tasks) {
      tasks.innerHTML = BOSS_TASKS.map((t, i) => {
        const cls = i < bossTasksDone ? 'done' : i === bossTasksDone ? 'active' : '';
        const pfx = i < bossTasksDone ? '✓ ' : i === bossTasksDone ? '▶ ' : '  ';
        return `<div class="boss-task ${cls}">${pfx}${t}</div>`;
      }).join('');
    }
  }

  async function runBossBattle() {
    const hpSteps = [80, 60, 40, 20, 0];
    for (let i = 0; i < BOSS_TASKS.length; i++) {
      bossTasksDone = i;
      updateBossUI();
      Character.setAnimation(Character.ANIM.ATTACK);
      Camera.shake(6, 0.4); SFX.play('attack');
      await Utils.sleep(500);
      Character.setAnimation(Character.ANIM.DODGE);
      SFX.play('bossHit'); Camera.shake(4, 0.3);
      Particle.burstRed(W * 0.5, H * 0.32);
      await Utils.sleep(400);
      Character.setAnimation(Character.ANIM.ATTACK);
      Camera.shake(5, 0.35); SFX.play('attack');
      await Utils.sleep(500);
      bossHP = hpSteps[i];
      updateBossUI();
      Utils.notify(`${BOSS_TASKS[i]} ✓`, 1400);
      SFX.play('levelUp');
      await Utils.sleep(600);
    }

    bossTasksDone = 5; bossHP = 0; updateBossUI();
    SFX.play('bossDefeat');
    Particle.bossDefeat(W, H);
    Camera.shake(12, 0.6);
    await Utils.sleep(1400);

    document.getElementById('boss-ui').classList.remove('visible');
    Character.setAnimation(Character.ANIM.VICTORY);
    await Utils.sleep(900);
    await Dialogue.typeLine('Xong rồi.', 'GUIDE', true, 1400);
    await Dialogue.typeLine('Thật sự xong rồi.', 'GUIDE', true, 1800);
    Dialogue.hide();
    await ch_SilentWalk();
  }

  // ── SILENT CINEMATIC ────────────────────────────────────────────────────────
  async function ch_SilentWalk() {
    await changeScene('hallway', { guideX: 0.1, anim: Character.ANIM.IDLE, face: true, fadeIn:500, fadeOut:700 });
    SFX.music('memory');
    await waitForMove(W * 0.5);
    Character.setAnimation(Character.ANIM.IDLE);
    await Utils.sleep(700);
    Character.setAnimation(Character.ANIM.OPEN_DOOR);

    // White flash
    const ov = document.getElementById('screen-overlay');
    ov.style.background = '#ffffff'; ov.style.opacity = '1'; ov.style.transition = 'opacity 0.6s'; ov.style.pointerEvents = 'none';
    await Utils.sleep(700);
    ov.style.background = '#0a0a0a'; ov.style.transition = 'opacity 1.2s ease'; ov.style.opacity = '0';
    await ch07_Graduation();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHAPTER 07 — GRADUATION
  // ═══════════════════════════════════════════════════════════════════════════
  async function ch07_Graduation() {
    await Transition.showChapterCard('07', 'GRADUATION');
    Transition.setChapterUI('07', 'GRADUATION');
    SFX.music('graduation');

    await changeScene('graduation', { guideX: 0.08, anim: Character.ANIM.WALK, face: true, fadeIn:400, fadeOut:700 });
    await waitForMove(W * 0.5);
    Character.setAnimation(Character.ANIM.IDLE);
    Particle.sparkGold(W * 0.5, H * 0.65);

    Camera.zoomTo(1.08, 60);
    Character.setAnimation(Character.ANIM.LOOK_AT_CAM);
    await Dialogue.typeLine('Chúng ta đến cuối câu chuyện rồi.', 'GUIDE');
    await Dialogue.typeLine('Nhưng...', 'GUIDE', true, 1200);
    await Dialogue.typeLine('Đây không thực sự là kết thúc.', 'GUIDE', true, 2000);
    Camera.zoomTo(1, 70);
    Dialogue.hide();
    await Utils.sleep(600);

    Character.setAnimation(Character.ANIM.RECEIVE_DIPLOMA);
    await Utils.sleep(1200);
    Character.setHasDiploma(true);
    SFX.play('diplomaReceive');
    Particle.sparkGold(W * 0.5, H * 0.58);
    Utils.notify('🎓 DIPLOMA RECEIVED!');
    await Utils.sleep(800);

    Character.setAnimation(Character.ANIM.PUT_ON_CAP);
    await Utils.sleep(1000);
    Character.setHasCap(true);
    SFX.play('notification');
    Utils.notify('🎓 CAP ON!');
    await Utils.sleep(700);

    Character.setAnimation(Character.ANIM.VICTORY);
    Camera.zoomTo(1.15, 65);
    Particle.startConfetti();
    SFX.play('confetti');
    await Utils.sleep(1000);
    Utils.notify('🎓 GRADUATION COMPLETE!');

    await Utils.sleep(500);
    Character.setAnimation(Character.ANIM.THROW_CAP);
    Character.setHasCap(false);
    Character.throwCap(W * 0.5, H * 0.64);
    SFX.play('capThrow');
    Particle.sparkGold(W * 0.5, H * 0.45);
    Particle.launchRandomFireworks(W, H, 7, 3500);
    SFX.play('firework');
    Camera.zoomTo(1, 80);
    await Utils.sleep(1600);

    Character.setAnimation(Character.ANIM.CELEBRATE);
    await Dialogue.typeLine('Và mình muốn bạn có mặt ở đây.', 'GUIDE');
    await Dialogue.typeLine('Không chỉ với tư cách một người xem.', 'GUIDE');
    await Dialogue.typeLine('Mà là một phần của ngày hôm đó.', 'GUIDE', true, 2200);
    Dialogue.hide();
    await ch08_Invitation();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHAPTER 08 — THE INVITATION
  // ═══════════════════════════════════════════════════════════════════════════
  async function ch08_Invitation() {
    await Transition.showChapterCard('08', 'THE INVITATION');
    const ov = document.getElementById('screen-overlay');
    ov.style.background = '#0a0a0a'; ov.style.transition = 'opacity 0.8s'; ov.style.opacity = '1'; ov.style.pointerEvents = 'none';
    await Utils.sleep(900);

    stopLoop();
    Particle.stopConfetti();
    Transition.hideChapterUI();
    Dialogue.hide();
    Character.setHasDiploma(false);
    Character.setHasCap(false);

    Utils.showScreen('screen-invitation');
    ov.style.transition = 'opacity 1.2s ease'; ov.style.opacity = '0';
    loadGuestCounter();
    mountInvitationGuide();
  }

  async function loadGuestCounter() {
    try {
      const res    = await fetch('/api/guests');
      const guests = await res.json();
      const el     = document.getElementById('guest-counter');
      if (el && guests.length > 0) el.textContent = `✦ ${guests.length} NGƯỜI ĐÃ RSVP ✦`;
    } catch(_) {}
  }

  function mountInvitationGuide() {
    const wrap = document.getElementById('guide-invitation');
    if (!wrap || wrap.querySelector('canvas')) return;
    const c = document.createElement('canvas');
    c.width = 80; c.height = 100;
    wrap.appendChild(c);
    const gc = c.getContext('2d');
    let gf = 0, shown = false;
    Character.setAnimation(Character.ANIM.IDLE);
    function drawG() { gc.clearRect(0,0,80,100); Character.draw(gc,40,96,gf++); requestAnimationFrame(drawG); }
    drawG();
    setTimeout(async () => {
      if (shown) return; shown = true;
      await Dialogue.typeLine('Bạn vẫn còn ở đây à?', 'GUIDE', true, 1800);
      await Dialogue.typeLine('Mình nghĩ bạn nên xem phần cuối.', 'GUIDE', true, 2000);
      Character.setAnimation(Character.ANIM.POINT);
      Dialogue.hide();
      Character.setAnimation(Character.ANIM.IDLE);
    }, 3500);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  FINAL QUESTION
  // ═══════════════════════════════════════════════════════════════════════════
  async function showFinalQuestion() {
    Dialogue.hide();
    Utils.showScreen('screen-final-question');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  FINAL SCENE
  // ═══════════════════════════════════════════════════════════════════════════
  async function runFinalScene(attending) {
    SFX.music('final');
    const ov = document.getElementById('screen-overlay');
    ov.style.background = '#0a0a0a'; ov.style.transition = 'opacity 0.6s'; ov.style.opacity = '1'; ov.style.pointerEvents = 'none';
    await Utils.sleep(700);

    Utils.showScreen('screen-final');
    resize();
    currentScene = 'final';
    guideX = guideTargetX = W * 0.5;
    guideY = H * 0.72;
    Character.setAnimation(Character.ANIM.IDLE);
    startLoop();
    Particle.startConfetti();
    Particle.launchRandomFireworks(W, H, 10, 6000);
    SFX.play('confetti');

    ov.style.transition = 'opacity 1.2s'; ov.style.opacity = '0';

    const fin = document.getElementById('final-texts');
    fin.innerHTML = '';
    const add = async (text, cls, delay) => {
      await Utils.sleep(delay);
      const d = document.createElement('div');
      d.className = cls; d.textContent = text;
      fin.appendChild(d);
      requestAnimationFrame(() => d.classList.add('visible'));
    };

    if (attending) {
      SFX.play('rsvpConfirm');
      await add('QUEST ACCEPTED!', 'final-text gold big', 0);
      await add('RSVP CONFIRMED ✓', 'final-text gold', 700);
      await add('"Tuyệt. Hẹn gặp bạn ở Final Level."', 'final-text', 1400);
    } else {
      await add('RSVP SAVED', 'final-text gold', 0);
      await add('"Không sao. Dù thế nào..."', 'final-text', 800);
      await add('"Cảm ơn bạn đã đi cùng mình đến đây."', 'final-text', 1600);
    }
    await add('— — —', 'final-text', 2400);
    await add('THANK YOU', 'final-text big', 3400);
    await add('FOR BEING PART OF MY STORY.', 'final-text', 4100);
    await Utils.sleep(1600);
    Character.setAnimation(Character.ANIM.WAVE);
    await Utils.sleep(1800);
    Character.setAnimation(Character.ANIM.CELEBRATE);
    await add('THE STORY IS COMPLETE.', 'final-text', 500);
    await add('BUT THE NEXT CHAPTER', 'final-text', 1300);
    await add('IS JUST BEGINNING.', 'final-text red', 2100);
    await add('— — —', 'final-text', 2900);
    await add('GRADUATION · CLASS OF 2026', 'final-text gold', 3500);
    await add('🎓', 'final-text big', 4300);
    await Utils.sleep(4800);
    await endCredits();
  }

  async function endCredits() {
    Particle.stopConfetti();
    await Transition.fadeIn(800);
    stopLoop();
    const fin = document.getElementById('final-texts');
    fin.innerHTML = '';
    await Utils.sleep(300);
    await Transition.fadeOut(1000);
    const lines = [
      { t:'SEE YOU THERE.', c:'final-text big gold' },
      { t:'🎓', c:'final-text big', d:1400 },
      { t:'THE END.', c:'final-text big', d:2600 },
    ];
    for (const ln of lines) {
      await Utils.sleep(ln.d || 1200);
      const d = document.createElement('div');
      d.className = ln.c; d.textContent = ln.t;
      fin.appendChild(d);
      requestAnimationFrame(() => d.classList.add('visible'));
    }
    await Utils.sleep(2000);
    Particle.emit(W/2, H/2, 80, { colors:['#c0392b','#f0c040','#f0f0f0','#e74c3c'], maxSpeed:8, upward:true, life:90, gravity:0.1, spread: Math.PI*2 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════════════════════
  function init() {
    resize();
    try { Audio.init(); } catch(e) {}

    // Start intro pixel bg + typewriter
    Particle.startIntroPixels();
    ch00_Intro();

    // Intro buttons
    document.getElementById('btn-begin').addEventListener('click', () => {
      try { Audio.resume(); } catch(e) {}
      startStory();
    });
    document.getElementById('btn-view-invite').addEventListener('click', () => {
      try { Audio.resume(); } catch(e) {}
      Particle.stopIntroPixels();
      loadGuestCounter();
      mountInvitationGuide();
      Utils.showScreen('screen-invitation');
    });

    // HUD
    document.getElementById('btn-skip').addEventListener('click', () => {
      try { Dialogue.stopTyping(); } catch(e) {}
      stopLoop();
      Particle.stopAll();
      Transition.hideChapterUI();
      Dialogue.hide();
      const bui = document.getElementById('boss-ui');
      if (bui) bui.classList.remove('visible');
      loadGuestCounter();
      mountInvitationGuide();
      Utils.showScreen('screen-invitation');
    });
    document.getElementById('btn-sound').addEventListener('click', function() {
      try { const on = Audio.toggle(); this.textContent = on ? '♪ ON' : '♪ OFF'; } catch(e) {}
    });
    document.getElementById('btn-menu').addEventListener('click', () => {
      stopLoop(); Particle.stopAll(); Dialogue.hide(); Transition.hideChapterUI();
      const bui = document.getElementById('boss-ui'); if (bui) bui.classList.remove('visible');
      document.getElementById('intro-title-wrap').classList.add('visible');
      Particle.startIntroPixels();
      Utils.showScreen('screen-intro');
    });

    // Invitation
    document.getElementById('btn-rsvp-invite').addEventListener('click', () => {
      document.getElementById('rsvp-modal').classList.add('visible');
    });
    document.getElementById('btn-view-location').addEventListener('click', () => {
      const loc = document.getElementById('inv-location').textContent.trim();
      Utils.notify('📍 ' + (loc !== 'TBD' ? loc : 'Location TBA'));
    });
    document.getElementById('btn-view-memories').addEventListener('click', () => {
      Utils.notify(`💭 ${foundMemories.size}/${MEMORIES.length} memories found.`);
    });
    document.getElementById('btn-back-story').addEventListener('click', () => {
      stopLoop();
      document.getElementById('intro-title-wrap').classList.add('visible');
      Particle.startIntroPixels();
      Utils.showScreen('screen-intro');
    });

    // Final question
    document.getElementById('btn-ill-be-there').addEventListener('click', async () => {
      SFX.play('achievement');
      Particle.sparkGold(window.innerWidth/2, window.innerHeight/2);
      await runFinalScene(true);
    });
    document.getElementById('btn-let-know').addEventListener('click', async () => {
      SFX.play('notification');
      await runFinalScene(false);
    });
  }

  return { init, showFinalQuestion, stopLoop, startLoop };
})();

document.addEventListener('DOMContentLoaded', () => Story.init());
