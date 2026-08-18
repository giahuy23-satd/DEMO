/* ===== RENDERER.JS — Pixel art scene rendering on canvas ===== */

const Renderer = (() => {
  // Colour palette
  const C = {
    black:    '#0a0a0a',
    dark:     '#111111',
    redDark:  '#6b0f1a',
    red:      '#c0392b',
    redBright:'#e74c3c',
    white:    '#f0f0f0',
    gold:     '#f0c040',
    goldDark: '#b8860b',
    gray:     '#2a2a2a',
    grayMid:  '#444444',
    grayLight:'#888888',
    blue:     '#1a1a3a',
    sky:      '#0d0d1a',
    green:    '#1a3a1a',
    tan:      '#3a2a1a',
    floor:    '#1a0a0a',
    wall:     '#200c0c',
  };

  // ---- pixel helpers ----
  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // ---- SCENE: HALLWAY ----
  function drawHallway(ctx, W, H, frameCount) {
    ctx.clearRect(0, 0, W, H);
    // Background
    px(ctx, 0, 0, W, H, '#050202');

    const cx = W / 2;
    const vanishY = H * 0.42;
    const wallHeight = H * 0.7;

    // Left wall
    ctx.fillStyle = C.wall;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cx - 20, vanishY);
    ctx.lineTo(cx - 20, vanishY + 4);
    ctx.lineTo(0, wallHeight);
    ctx.closePath();
    ctx.fill();
    // Right wall
    ctx.fillStyle = C.wall;
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(cx + 20, vanishY);
    ctx.lineTo(cx + 20, vanishY + 4);
    ctx.lineTo(W, wallHeight);
    ctx.closePath();
    ctx.fill();
    // Ceiling
    ctx.fillStyle = '#0d0404';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W, 0);
    ctx.lineTo(cx + 20, vanishY); ctx.lineTo(cx - 20, vanishY);
    ctx.closePath(); ctx.fill();
    // Floor
    ctx.fillStyle = C.floor;
    ctx.beginPath();
    ctx.moveTo(0, wallHeight); ctx.lineTo(W, wallHeight);
    ctx.lineTo(cx + 20, vanishY + 4); ctx.lineTo(cx - 20, vanishY + 4);
    ctx.closePath(); ctx.fill();

    // Floor lines
    ctx.strokeStyle = '#2a0a0a';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const t  = i / 6;
      const fy = Utils.lerp(wallHeight, vanishY + 4, t);
      ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
    }

    // Wall light strips
    [0.18, 0.5, 0.82].forEach((p, idx) => {
      const lx = p * W;
      const brightness = 0.5 + 0.3 * Math.sin(frameCount * 0.03 + idx * 2);
      const wallSideX = lx < cx ? lx + 20 : lx - 20;
      const wallY = Utils.lerp(wallHeight * 0.25, vanishY + 20, 0.5);
      const grd = ctx.createRadialGradient(wallSideX, wallY, 0, wallSideX, wallY, 70);
      grd.addColorStop(0, `rgba(192,57,43,${brightness * 0.25})`);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(wallSideX - 70, wallY - 70, 140, 140);
    });

    // Skirting boards
    ctx.fillStyle = C.redDark;
    ctx.beginPath();
    ctx.moveTo(0, wallHeight - 8); ctx.lineTo(cx - 20, vanishY + 10);
    ctx.lineTo(cx - 20, vanishY + 14); ctx.lineTo(0, wallHeight);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W, wallHeight - 8); ctx.lineTo(cx + 20, vanishY + 10);
    ctx.lineTo(cx + 20, vanishY + 14); ctx.lineTo(W, wallHeight);
    ctx.closePath(); ctx.fill();

    // Walking NPC in background
    const npcX = ((frameCount * 1.2) % (W + 40)) - 20;
    drawNPC(ctx, npcX, vanishY + 30, frameCount, 0);
  }

  // ---- SCENE: UNIVERSITY EXTERIOR ----
  function drawUniversity(ctx, W, H, frameCount) {
    ctx.clearRect(0, 0, W, H);
    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    skyGrad.addColorStop(0, '#0d0d20');
    skyGrad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.55);

    // Ground
    px(ctx, 0, H * 0.55, W, H * 0.45, '#0a0a0a');
    px(ctx, 0, H * 0.55, W, 4, C.redDark);

    // Stars
    ctx.fillStyle = C.white;
    const stars = [[0.1,0.05],[0.25,0.12],[0.4,0.08],[0.6,0.04],[0.75,0.14],[0.85,0.07],[0.92,0.11],[0.15,0.2],[0.55,0.18],[0.78,0.22]];
    stars.forEach(([sx,sy]) => {
      const flicker = Math.sin(frameCount * 0.05 + sx * 50) > 0.6;
      if (!flicker) {
        ctx.fillStyle = 'rgba(240,240,240,0.8)';
        ctx.fillRect(sx*W, sy*H, 2, 2);
      }
    });

    // Main building
    drawBuilding(ctx, W * 0.2, H * 0.18, W * 0.6, H * 0.37, frameCount);

    // Trees
    drawTree(ctx, W * 0.08, H * 0.45, 24, frameCount);
    drawTree(ctx, W * 0.86, H * 0.43, 30, frameCount);
    drawTree(ctx, W * 0.14, H * 0.47, 18, frameCount);
    drawTree(ctx, W * 0.92, H * 0.46, 20, frameCount);

    // Bench left
    drawBench(ctx, W * 0.06, H * 0.56);
    // Bench right
    drawBench(ctx, W * 0.78, H * 0.56);

    // Ground path
    ctx.fillStyle = '#1a0808';
    ctx.fillRect(W * 0.38, H * 0.55, W * 0.24, H * 0.45);
    px(ctx, W * 0.38, H * 0.55, W * 0.24, 3, '#2a0a0a');

    // Streetlights
    drawStreetLight(ctx, W * 0.3, H * 0.35);
    drawStreetLight(ctx, W * 0.7, H * 0.35);

    // NPCs
    drawNPC(ctx, W * 0.22, H * 0.56, frameCount, 0);
    drawNPC(ctx, W * 0.65, H * 0.56, frameCount, 40);
    drawNPC(ctx, W * 0.72, H * 0.57, frameCount, 80);
  }

  function drawBuilding(ctx, x, y, w, h, fc) {
    // Main body
    px(ctx, x, y, w, h, '#150a0a');
    px(ctx, x, y, w, 4, C.redDark);

    // Windows
    const cols = 6, rows = 4;
    const wx = w / (cols + 1), wy = h / (rows + 1);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = Math.sin(fc * 0.01 + r * 3 + c * 7) > 0.3;
        const winColor = lit ? C.gold : C.redDark;
        const alpha = lit ? 0.8 : 0.3;
        ctx.fillStyle = winColor;
        ctx.globalAlpha = alpha;
        ctx.fillRect(x + wx * (c + 0.5), y + wy * (r + 0.5), wx * 0.5, wy * 0.5);
        ctx.globalAlpha = 1;
      }
    }

    // Entrance
    px(ctx, x + w * 0.42, y + h * 0.7, w * 0.16, h * 0.3, C.redDark);

    // Roof / top trim
    px(ctx, x - 4, y - 6, w + 8, 8, C.red);
    px(ctx, x + w * 0.1, y - 14, w * 0.8, 10, C.redDark);

    // BANNER text on building
    ctx.fillStyle = C.gold;
    ctx.font = '6px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('2022', x + w / 2, y + h * 0.12);
  }

  function drawTree(ctx, x, y, size, fc) {
    const sway = Math.sin(fc * 0.02 + x) * 1;
    // Trunk
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(x - 3 + sway, y - size * 0.4, 6, size * 0.4);
    // Canopy layers
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(x - size * 0.6 + sway, y - size * 1.2, size * 1.2, size * 0.5);
    ctx.fillRect(x - size * 0.45 + sway, y - size * 1.6, size * 0.9, size * 0.5);
    ctx.fillRect(x - size * 0.3 + sway, y - size * 2, size * 0.6, size * 0.5);
    // Highlight
    ctx.fillStyle = '#0f2a0f';
    ctx.fillRect(x - size * 0.15 + sway, y - size * 2, size * 0.3, size * 0.2);
  }

  function drawBench(ctx, x, y) {
    ctx.fillStyle = C.tan;
    ctx.fillRect(x, y, 30, 5);
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(x + 3, y + 5, 4, 8);
    ctx.fillRect(x + 23, y + 5, 4, 8);
  }

  function drawStreetLight(ctx, x, y) {
    // Pole
    ctx.fillStyle = C.grayMid;
    ctx.fillRect(x - 1, y, 2, 80);
    // Head
    ctx.fillStyle = C.gray;
    ctx.fillRect(x - 8, y - 4, 16, 6);
    // Light glow
    const grd = ctx.createRadialGradient(x, y, 0, x, y, 40);
    grd.addColorStop(0, 'rgba(240,192,64,0.2)');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 40, y - 40, 80, 80);
    ctx.fillStyle = C.gold;
    ctx.fillRect(x - 3, y - 2, 6, 3);
  }

  function drawNPC(ctx, x, y, fc, offset) {
    const bob = Math.sin(fc * 0.08 + offset) > 0 ? 0 : -1;
    // Body
    ctx.fillStyle = Utils.randInt(0, 1) ? C.red : C.grayMid;
    ctx.fillStyle = '#' + ['3a2a2a', '2a3a2a', '2a2a3a', '3a3a2a'][Math.floor(offset / 20) % 4];
    ctx.fillRect(x - 4, y - 20 + bob, 8, 12);
    // Head
    ctx.fillStyle = '#c8a070';
    ctx.fillRect(x - 3, y - 27 + bob, 6, 6);
    // Legs (walk anim)
    const legSwing = Math.sin(fc * 0.1 + offset) * 2;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - 4, y - 8 + bob, 3, 8 + legSwing);
    ctx.fillRect(x + 1, y - 8 + bob, 3, 8 - legSwing);
  }

  // ---- SCENE: CLASSROOM ----
  function drawClassroom(ctx, W, H, fc) {
    ctx.clearRect(0, 0, W, H);
    px(ctx, 0, 0, W, H, '#080810');
    // Floor
    px(ctx, 0, H * 0.68, W, H * 0.32, '#0d0d0d');
    px(ctx, 0, H * 0.68, W, 3, C.redDark);

    // Blackboard
    px(ctx, W * 0.1, H * 0.08, W * 0.8, H * 0.3, '#0a1a0a');
    px(ctx, W * 0.1, H * 0.08, W * 0.8, 4, '#1a3a1a');
    px(ctx, W * 0.1, H * 0.38, W * 0.8, 4, '#1a3a1a');

    // Board content
    ctx.fillStyle = 'rgba(240,240,240,0.5)';
    ctx.font = '7px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText('DEADLINE: TOMORROW', W * 0.14, H * 0.22);
    ctx.fillStyle = 'rgba(231,76,60,0.6)';
    ctx.fillText('PROJECT DUE', W * 0.14, H * 0.31);

    // Desks
    const deskPositions = [0.1, 0.28, 0.46, 0.64, 0.82];
    deskPositions.forEach((dp, i) => {
      drawDesk(ctx, W * dp, H * 0.62, i, fc);
    });
  }

  function drawDesk(ctx, x, y, idx, fc) {
    // Desk surface
    ctx.fillStyle = '#1a1000';
    ctx.fillRect(x, y, 42, 6);
    ctx.fillStyle = '#2a1800';
    ctx.fillRect(x, y + 6, 4, 12);
    ctx.fillRect(x + 38, y + 6, 4, 12);

    // Chair
    ctx.fillStyle = '#150a00';
    ctx.fillRect(x + 4, y + 20, 34, 4);

    // NPC at desk
    const actions = ['study', 'sleep', 'laptop', 'write', 'study'];
    const action = actions[idx % actions.length];
    const bob = Math.sin(fc * 0.05 + idx) > 0 ? 0 : -1;

    // Head
    ctx.fillStyle = '#c8a070';
    ctx.fillRect(x + 15, y - 22 + bob, 8, 8);
    // Body
    ctx.fillStyle = ['#3a2a2a','#2a3a2a','#2a2a3a','#3a3a2a','#3a2a3a'][idx];
    ctx.fillRect(x + 14, y - 14 + bob, 10, 10);

    if (action === 'sleep') {
      // Head on desk
      ctx.fillStyle = '#c8a070';
      ctx.fillRect(x + 14, y - 4, 10, 8);
      ctx.fillStyle = C.white;
      ctx.font = '5px serif';
      ctx.textAlign = 'center';
      ctx.fillText('z z z', x + 22, y - 6);
    } else if (action === 'laptop') {
      ctx.fillStyle = C.gray;
      ctx.fillRect(x + 12, y - 5, 16, 2);
      ctx.fillStyle = '#1a3a4a';
      ctx.fillRect(x + 12, y - 10, 16, 6);
    } else if (action === 'write') {
      ctx.fillStyle = C.white;
      ctx.fillRect(x + 10, y - 2, 14, 10);
    }
  }

  // ---- SCENE: DEADLINE ----
  function drawDeadline(ctx, W, H, fc) {
    ctx.clearRect(0, 0, W, H);
    // Dark room
    px(ctx, 0, 0, W, H, '#020005');
    // Flickering lights
    const flicker = Math.sin(fc * 0.3) > 0.7 ? 0.05 : 0;
    px(ctx, 0, 0, W, H, `rgba(50,0,0,${flicker})`);

    // Desk
    px(ctx, W * 0.2, H * 0.62, W * 0.6, 10, '#1a1000');
    px(ctx, W * 0.2, H * 0.62, W * 0.6, 3, '#2a2000');

    // Laptop on desk
    const lx = W * 0.38, ly = H * 0.48;
    px(ctx, lx, ly, W * 0.24, H * 0.16, '#0a0a12');
    px(ctx, lx + 4, ly + 4, W * 0.24 - 8, H * 0.16 - 8, '#0a1a2a');
    // Screen glow
    const grd = ctx.createRadialGradient(lx + W*0.12, ly + H*0.08, 5, lx + W*0.12, ly + H*0.08, 80);
    grd.addColorStop(0, 'rgba(0,80,140,0.3)');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(lx - 40, ly - 40, W*0.24 + 80, H*0.16 + 80);

    // Papers flying
    for (let i = 0; i < 6; i++) {
      const px2 = (W * 0.3) + Math.sin(fc * 0.04 + i * 1.5) * 80;
      const py2 = (H * 0.2) + Math.cos(fc * 0.06 + i * 2.1) * 60 + i * 20;
      const rot = Math.sin(fc * 0.05 + i) * 0.3;
      ctx.save();
      ctx.translate(px2, py2);
      ctx.rotate(rot);
      ctx.fillStyle = C.white;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(-10, -7, 20, 14);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // ---- SCENE: BOSS ----
  function drawBossScene(ctx, W, H, fc, hp) {
    ctx.clearRect(0, 0, W, H);
    px(ctx, 0, 0, W, H, '#050005');
    // Red tint
    px(ctx, 0, 0, W, H, `rgba(80,0,0,${0.2 + 0.1 * Math.sin(fc * 0.05)})`);

    // Floor
    px(ctx, 0, H * 0.72, W, H * 0.28, '#0a0005');
    px(ctx, 0, H * 0.72, W, 3, C.red);

    // Boss
    if (hp > 0) {
      drawBossEntity(ctx, W / 2, H * 0.32, fc, hp);
    }

    // Battle particles
    for (let i = 0; i < 8; i++) {
      const bx = W * (0.1 + 0.8 * ((i * 137.5 + fc * 0.5) % 1));
      const by = H * (0.1 + 0.6 * ((i * 83.7 + fc * 0.3) % 1));
      ctx.fillStyle = i % 2 === 0 ? C.red : C.redDark;
      ctx.globalAlpha = 0.4 * Math.abs(Math.sin(fc * 0.1 + i));
      ctx.fillRect(bx, by, 4, 4);
      ctx.globalAlpha = 1;
    }
  }

  function drawBossEntity(ctx, cx, cy, fc, hp) {
    const hpRatio = hp / 100;
    const size = 80 + 30 * hpRatio;
    const sway = Math.sin(fc * 0.04) * 6;
    const bob = Math.sin(fc * 0.06) * 8;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.6 + 10, size * 0.5, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx + sway, cy + bob);

    // Main boss body — abstract dark shape
    ctx.fillStyle = '#1a0008';
    ctx.fillRect(-size / 2, -size * 0.5, size, size);

    // Red glowing eyes
    ctx.fillStyle = C.redBright;
    const eyeGlow = 0.6 + 0.4 * Math.sin(fc * 0.15);
    ctx.globalAlpha = eyeGlow;
    ctx.fillRect(-size * 0.2, -size * 0.15, size * 0.1, size * 0.1);
    ctx.fillRect(size * 0.1, -size * 0.15, size * 0.1, size * 0.1);
    ctx.globalAlpha = 1;

    // Boss labels
    ctx.fillStyle = C.redBright;
    ctx.font = '6px "Press Start 2P"';
    ctx.textAlign = 'center';
    const labels = ['EXAMS', 'PROJECTS', 'DEADLINES', 'PRESSURE', 'FEAR'];
    const visibleLabels = Math.ceil(labels.length * hpRatio);
    labels.slice(0, visibleLabels).forEach((lbl, i) => {
      const angle = (i / labels.length) * Math.PI * 2 + fc * 0.02;
      const r = size * 0.7;
      ctx.globalAlpha = 0.6;
      ctx.fillText(lbl, Math.cos(angle) * r, Math.sin(angle) * r - size * 0.1);
      ctx.globalAlpha = 1;
    });

    // Cracks at low HP
    if (hp < 40) {
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 1;
      ctx.globalAlpha = (40 - hp) / 40;
      for (let c = 0; c < 4; c++) {
        ctx.beginPath();
        ctx.moveTo(Utils.randInt(-size * 0.4, size * 0.4), Utils.randInt(-size * 0.4, size * 0.4));
        ctx.lineTo(Utils.randInt(-size * 0.4, size * 0.4), Utils.randInt(-size * 0.4, size * 0.4));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ---- SCENE: GRADUATION ----
  function drawGraduation(ctx, W, H, fc) {
    ctx.clearRect(0, 0, W, H);

    // Background
    px(ctx, 0, 0, W, H, '#050202');

    // Stage
    px(ctx, W * 0.05, H * 0.62, W * 0.9, H * 0.08, C.redDark);
    px(ctx, W * 0.05, H * 0.62, W * 0.9, 4, C.red);
    // Podium
    px(ctx, W * 0.43, H * 0.52, W * 0.14, H * 0.1, C.red);

    // Audience rows
    for (let row = 0; row < 5; row++) {
      for (let seat = 0; seat < 18; seat++) {
        const sx = W * 0.03 + seat * (W * 0.94 / 18);
        const sy = H * 0.73 + row * 22;
        const isPresent = Math.random() > 0.15;
        if (isPresent) {
          // Seat
          ctx.fillStyle = C.redDark;
          ctx.fillRect(sx, sy + 10, 16, 8);
          // Head
          const headColors = ['#c8a070', '#a07050', '#d4b090', '#b89060'];
          ctx.fillStyle = headColors[Math.floor(Math.sin(sx + sy) * 2 + 2) % 4];
          ctx.fillRect(sx + 3, sy, 10, 10);
        }
      }
    }

    // Banner
    px(ctx, W * 0.2, H * 0.06, W * 0.6, 40, C.redDark);
    px(ctx, W * 0.2, H * 0.06, W * 0.6, 3, C.red);
    ctx.fillStyle = C.gold;
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('GRADUATION 2026', W / 2, H * 0.06 + 26);

    // Spotlight on stage
    const spot = ctx.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, 160);
    spot.addColorStop(0, 'rgba(240,192,64,0.12)');
    spot.addColorStop(0.6, 'rgba(240,192,64,0.04)');
    spot.addColorStop(1, 'transparent');
    ctx.fillStyle = spot;
    ctx.fillRect(W * 0.2, 0, W * 0.6, H * 0.7);

    // Flowers / decorations
    drawPixelFlowers(ctx, W * 0.08, H * 0.6, fc);
    drawPixelFlowers(ctx, W * 0.88, H * 0.6, fc);
  }

  function drawPixelFlowers(ctx, x, y, fc) {
    const colors = [C.red, C.gold, C.white];
    for (let i = 0; i < 5; i++) {
      const fx = x + Math.sin(i * 1.4) * 18;
      const fy = y - i * 8 + Math.sin(fc * 0.03 + i) * 2;
      ctx.fillStyle = colors[i % 3];
      ctx.fillRect(fx - 2, fy - 4, 4, 4);
      ctx.fillStyle = '#0a1a0a';
      ctx.fillRect(fx, fy, 2, 8);
    }
  }

  // ---- SCENE: MEMORY ROOM ----
  function drawMemoryRoom(ctx, W, H, fc) {
    ctx.clearRect(0, 0, W, H);
    // Golden-tinted dark room
    px(ctx, 0, 0, W, H, '#05040a');
    const goldAmbient = ctx.createRadialGradient(W/2, H/2, 10, W/2, H/2, W * 0.6);
    goldAmbient.addColorStop(0, 'rgba(200,150,30,0.08)');
    goldAmbient.addColorStop(1, 'transparent');
    ctx.fillStyle = goldAmbient;
    ctx.fillRect(0, 0, W, H);

    // Floor
    px(ctx, 0, H * 0.65, W, H * 0.35, '#0a0808');
    px(ctx, 0, H * 0.65, W, 3, C.goldDark);

    // Floating photo frames
    const frames = [
      { x: 0.12, y: 0.2, label: 'FIRST DAY' },
      { x: 0.35, y: 0.15, label: 'FRIENDS' },
      { x: 0.58, y: 0.22, label: 'PROJECT' },
      { x: 0.78, y: 0.18, label: 'MEMORIES' },
    ];
    frames.forEach((fr, i) => {
      const bob = Math.sin(fc * 0.025 + i * 0.8) * 6;
      const fx = W * fr.x, fy = H * fr.y + bob;
      // Frame
      ctx.fillStyle = C.dark;
      ctx.fillRect(fx - 28, fy - 22, 56, 44);
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      ctx.strokeRect(fx - 28, fy - 22, 56, 44);
      // Inner image
      ctx.fillStyle = C.redDark;
      ctx.fillRect(fx - 22, fy - 16, 44, 32);
      // Label
      ctx.fillStyle = C.gold;
      ctx.font = '4px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(fr.label, fx, fy + 34);
    });
  }

  // ---- SCENE: FINAL (dark, spotlight) ----
  function drawFinalScene(ctx, W, H, fc) {
    ctx.clearRect(0, 0, W, H);
    px(ctx, 0, 0, W, H, '#020202');

    // Stage
    px(ctx, W * 0.1, H * 0.7, W * 0.8, 8, C.redDark);
    px(ctx, W * 0.1, H * 0.7, W * 0.8, 2, C.red);

    // Spotlight from above
    const spt = ctx.createConicalGradient ? null : null;
    const grad = ctx.createRadialGradient(W/2, 0, 0, W/2, H*0.7, W*0.4);
    grad.addColorStop(0, 'rgba(240,192,64,0.15)');
    grad.addColorStop(0.4, 'rgba(240,192,64,0.06)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Fireworks in background
    for (let f = 0; f < 3; f++) {
      const burst = Math.floor((fc + f * 60) / 80) % 3;
      if (burst === f % 3) {
        const bx = W * (0.2 + f * 0.3);
        const by = H * (0.1 + f * 0.08);
        const age = (fc + f * 60) % 80;
        if (age < 30) {
          for (let p = 0; p < 10; p++) {
            const angle = (p / 10) * Math.PI * 2;
            const r = age * 3;
            ctx.fillStyle = [C.red, C.gold, C.white][p % 3];
            ctx.globalAlpha = 1 - age / 30;
            ctx.fillRect(bx + Math.cos(angle)*r, by + Math.sin(angle)*r, 3, 3);
          }
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  return {
    C,
    drawHallway,
    drawUniversity,
    drawClassroom,
    drawDeadline,
    drawBossScene,
    drawBossEntity,
    drawGraduation,
    drawMemoryRoom,
    drawFinalScene,
  };
})();
