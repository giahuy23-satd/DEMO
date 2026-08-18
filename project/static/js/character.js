/* ===== CHARACTER.JS — Pixel Guide Character (drawn on Canvas) ===== */

const Character = (() => {
  // Animation states
  const ANIM = {
    IDLE: 'idle',
    WALK: 'walk',
    RUN: 'run',
    TURN_LEFT: 'turn_left',
    TURN_RIGHT: 'turn_right',
    LOOK_AT_CAM: 'look_at_cam',
    POINT: 'point',
    TALK: 'talk',
    NOD: 'nod',
    SHAKE_HEAD: 'shake_head',
    SIT: 'sit',
    STAND: 'stand',
    OPEN_DOOR: 'open_door',
    USE_COMPUTER: 'use_computer',
    TYPE: 'type',
    READ: 'read',
    WAVE: 'wave',
    JUMP: 'jump',
    ATTACK: 'attack',
    DODGE: 'dodge',
    RECEIVE_DIPLOMA: 'receive_diploma',
    PUT_ON_CAP: 'put_on_cap',
    THROW_CAP: 'throw_cap',
    VICTORY: 'victory',
    CELEBRATE: 'celebrate',
    CROUCH: 'crouch',
  };

  // Direction
  let facingRight = true;
  let currentAnim = ANIM.IDLE;
  let animFrame = 0;
  let animTimer = 0;
  let hasCap = false;
  let hasDiploma = false;

  // Target position for movement
  let targetX = null;
  let moveSpeed = 1.5;

  // Cap position when thrown
  let capThrow = null;

  // Colours
  const C = {
    skin:     '#c8a070',
    hair:     '#1a0a00',
    shirt:    '#6b0f1a',      // dark red
    pants:    '#1a1a2a',
    shoes:    '#0a0a0a',
    cap:      '#1a0000',
    capTrim:  '#f0c040',
    diploma:  '#f0e0a0',
    white:    '#f0f0f0',
    gold:     '#f0c040',
    red:      '#c0392b',
  };

  // Scale factor (pixels per unit)
  const S = 4;

  // Draw character at canvas coords (cx, cy = bottom center)
  function draw(ctx, cx, cy, fc) {
    animTimer++;

    // Advance animation frame
    const fps = getAnimFPS(currentAnim);
    if (animTimer % fps === 0) animFrame++;

    ctx.save();
    if (!facingRight) {
      ctx.translate(cx * 2, 0);
      ctx.scale(-1, 1);
    }

    switch (currentAnim) {
      case ANIM.IDLE:          drawIdle(ctx, cx, cy, fc); break;
      case ANIM.WALK:          drawWalk(ctx, cx, cy, fc); break;
      case ANIM.RUN:           drawRun(ctx, cx, cy, fc);  break;
      case ANIM.TALK:          drawTalk(ctx, cx, cy, fc); break;
      case ANIM.WAVE:          drawWave(ctx, cx, cy, fc); break;
      case ANIM.JUMP:          drawJump(ctx, cx, cy, fc); break;
      case ANIM.SIT:           drawSit(ctx, cx, cy, fc);  break;
      case ANIM.TYPE:          drawType(ctx, cx, cy, fc); break;
      case ANIM.POINT:         drawPoint(ctx, cx, cy, fc); break;
      case ANIM.NOD:           drawNod(ctx, cx, cy, fc);  break;
      case ANIM.ATTACK:        drawAttack(ctx, cx, cy, fc); break;
      case ANIM.DODGE:         drawDodge(ctx, cx, cy, fc); break;
      case ANIM.RECEIVE_DIPLOMA: drawReceiveDiploma(ctx, cx, cy, fc); break;
      case ANIM.PUT_ON_CAP:    drawPutOnCap(ctx, cx, cy, fc); break;
      case ANIM.THROW_CAP:     drawThrowCap(ctx, cx, cy, fc); break;
      case ANIM.VICTORY:       drawVictory(ctx, cx, cy, fc); break;
      case ANIM.LOOK_AT_CAM:   drawLookAtCam(ctx, cx, cy, fc); break;
      case ANIM.OPEN_DOOR:     drawOpenDoor(ctx, cx, cy, fc); break;
      case ANIM.CELEBRATE:     drawCelebrate(ctx, cx, cy, fc); break;
      case ANIM.SHAKE_HEAD:    drawShakeHead(ctx, cx, cy, fc); break;
      default:                 drawIdle(ctx, cx, cy, fc); break;
    }

    ctx.restore();

    // Draw flying cap if thrown
    if (capThrow) {
      capThrow.update();
      drawFlyingCap(ctx, capThrow.x, capThrow.y, capThrow.angle);
    }
  }

  function getAnimFPS(anim) {
    const map = {
      idle: 20, walk: 8, run: 5, talk: 12, wave: 8,
      jump: 8, sit: 30, type: 6, point: 16, nod: 10,
      attack: 4, dodge: 5, receive_diploma: 12, put_on_cap: 14,
      throw_cap: 6, victory: 8, look_at_cam: 30, open_door: 10,
      celebrate: 6, shake_head: 8,
    };
    return map[anim] || 12;
  }

  // ---- Base parts ----
  function drawBody(ctx, cx, cy, legOffset = 0, armOffset = 0, headOffset = 0, crouchOffset = 0) {
    const bx = cx - S * 3;
    const by = cy - S * 12 - crouchOffset;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, S * 4, S, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shoes
    ctx.fillStyle = C.shoes;
    ctx.fillRect(cx - S * 3, cy - S + legOffset, S * 2.5, S);
    ctx.fillRect(cx + S * 0.5, cy - S - legOffset, S * 2.5, S);

    // Legs
    ctx.fillStyle = C.pants;
    ctx.fillRect(cx - S * 2.5, cy - S * 5 + legOffset, S * 2, S * 4);
    ctx.fillRect(cx + S * 0.5, cy - S * 5 - legOffset, S * 2, S * 4);

    // Belt
    ctx.fillStyle = C.hair;
    ctx.fillRect(cx - S * 3, by + S * 8, S * 6, S * 0.8);

    // Shirt / body
    ctx.fillStyle = C.shirt;
    ctx.fillRect(cx - S * 3, by + S * 3, S * 6, S * 5.5);

    // Arms
    ctx.fillStyle = C.shirt;
    ctx.fillRect(cx - S * 5, by + S * 3 + armOffset, S * 2, S * 4);
    ctx.fillRect(cx + S * 3, by + S * 3 - armOffset, S * 2, S * 4);

    // Hands
    ctx.fillStyle = C.skin;
    ctx.fillRect(cx - S * 5, by + S * 7 + armOffset, S * 2, S * 2);
    ctx.fillRect(cx + S * 3, by + S * 7 - armOffset, S * 2, S * 2);

    // Neck
    ctx.fillStyle = C.skin;
    ctx.fillRect(cx - S, by + S * 1.5, S * 2, S * 1.8);

    // Head (with offset for anims)
    ctx.fillStyle = C.skin;
    ctx.fillRect(cx - S * 2.5, by - S * 1 + headOffset, S * 5, S * 5);
    // Hair
    ctx.fillStyle = C.hair;
    ctx.fillRect(cx - S * 2.5, by - S * 1 + headOffset, S * 5, S * 1.5);
    ctx.fillRect(cx - S * 3, by + headOffset, S * 1.5, S * 3);
    // Eyes
    ctx.fillStyle = C.white;
    ctx.fillRect(cx - S * 1.5, by + S * 0.8 + headOffset, S, S * 1.2);
    ctx.fillRect(cx + S * 0.5, by + S * 0.8 + headOffset, S, S * 1.2);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(cx - S, by + S * 0.8 + headOffset, S * 0.6, S * 1.2);
    ctx.fillRect(cx + S * 0.7, by + S * 0.8 + headOffset, S * 0.6, S * 1.2);

    if (hasCap) {
      drawCap(ctx, cx, by - S + headOffset);
    }
    if (hasDiploma) {
      drawDiplomaHeld(ctx, cx, by + S * 6);
    }
  }

  function drawCap(ctx, cx, topY) {
    ctx.fillStyle = C.cap;
    ctx.fillRect(cx - S * 4, topY + S, S * 8, S * 2);
    ctx.fillRect(cx - S * 2.5, topY - S, S * 5, S * 2);
    ctx.fillStyle = C.capTrim;
    ctx.fillRect(cx - S * 4, topY + S, S * 8, S * 0.5);
    // Tassel
    ctx.fillStyle = C.gold;
    ctx.fillRect(cx + S * 2, topY, S * 0.5, S * 4);
  }

  function drawDiplomaHeld(ctx, cx, y) {
    ctx.fillStyle = C.diploma;
    ctx.fillRect(cx + S * 3, y, S * 4, S * 5);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx + S * 3, y, S * 4, S * 5);
    ctx.fillStyle = C.red;
    ctx.fillRect(cx + S * 4.5, y + S, S * 0.5, S * 3);
  }

  function drawFlyingCap(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = C.cap;
    ctx.fillRect(-S * 4, 0, S * 8, S * 2);
    ctx.fillRect(-S * 2.5, -S * 2, S * 5, S * 2);
    ctx.fillStyle = C.capTrim;
    ctx.fillRect(-S * 4, 0, S * 8, S * 0.5);
    ctx.fillStyle = C.gold;
    ctx.fillRect(S * 2, -S * 2, S * 0.5, S * 4);
    ctx.restore();
  }

  // ---- ANIMATIONS ----

  function drawIdle(ctx, cx, cy, fc) {
    const bob = Math.sin(fc * 0.04) * 1.5;
    const armSwing = Math.sin(fc * 0.04) * 2;
    drawBody(ctx, cx, cy, 0, armSwing, bob);
  }

  function drawWalk(ctx, cx, cy, fc) {
    const legSwing = Math.sin(fc * 0.18) * S * 2;
    const armSwing = Math.sin(fc * 0.18) * S;
    const bob = Math.abs(Math.sin(fc * 0.18)) * 2;
    drawBody(ctx, cx, cy, legSwing, armSwing, -bob);
  }

  function drawRun(ctx, cx, cy, fc) {
    const legSwing = Math.sin(fc * 0.3) * S * 3;
    const armSwing = Math.sin(fc * 0.3) * S * 2;
    const bob = Math.abs(Math.sin(fc * 0.3)) * 4;
    drawBody(ctx, cx, cy - bob, legSwing, armSwing, 0);
  }

  function drawTalk(ctx, cx, cy, fc) {
    const headBob = Math.sin(fc * 0.12) * 1.5;
    const armGesture = Math.sin(fc * 0.1) * 3;
    drawBody(ctx, cx, cy, 0, armGesture, headBob);
    // Speech dots
    const dotAlpha = (fc % 30) / 30;
    ctx.fillStyle = C.white;
    ctx.globalAlpha = dotAlpha;
    ctx.fillRect(cx + S * 3, cy - S * 15, S * 0.8, S * 0.8);
    ctx.globalAlpha = 1;
  }

  function drawWave(ctx, cx, cy, fc) {
    const waveAngle = Math.sin(fc * 0.2) * S * 4;
    const by = cy - S * 12;
    drawBody(ctx, cx, cy, 0, 0, 0);
    // Override right arm (wave)
    ctx.fillStyle = C.shirt;
    ctx.fillRect(cx + S * 3, by + S * 3 - waveAngle, S * 2, S * 4);
    ctx.fillStyle = C.skin;
    ctx.fillRect(cx + S * 3, by + S * 7 - waveAngle, S * 2, S * 2);
  }

  function drawJump(ctx, cx, cy, fc) {
    const jumpHeight = Math.max(0, -Math.abs(Math.sin(fc * 0.15)) * S * 10);
    const spread = Math.abs(Math.sin(fc * 0.15)) * S * 2;
    drawBody(ctx, cx, cy + jumpHeight, spread, -spread * 0.5, jumpHeight * 0.1);
  }

  function drawSit(ctx, cx, cy, fc) {
    const bob = Math.sin(fc * 0.03) * 0.5;
    // Sitting body - legs horizontal
    const by = cy - S * 8;
    ctx.fillStyle = C.shoes;
    ctx.fillRect(cx - S * 6, cy - S, S * 2.5, S);
    ctx.fillRect(cx + S * 3, cy - S, S * 2.5, S);
    ctx.fillStyle = C.pants;
    ctx.fillRect(cx - S * 6, cy - S * 3, S * 6, S * 2);
    ctx.fillRect(cx, cy - S * 3, S * 6, S * 2);
    ctx.fillStyle = C.shirt;
    ctx.fillRect(cx - S * 3, by + S * 3, S * 6, S * 5);
    ctx.fillStyle = C.shirt;
    ctx.fillRect(cx - S * 5, by + S * 3, S * 2, S * 3);
    ctx.fillRect(cx + S * 3, by + S * 3, S * 2, S * 3);
    ctx.fillStyle = C.skin;
    ctx.fillRect(cx - S * 2.5, by - S + bob, S * 5, S * 5);
    ctx.fillStyle = C.hair;
    ctx.fillRect(cx - S * 2.5, by - S + bob, S * 5, S * 1.5);
    if (hasCap) drawCap(ctx, cx, by - S * 2 + bob);
  }

  function drawType(ctx, cx, cy, fc) {
    const typeBob = Math.abs(Math.sin(fc * 0.3)) * 2;
    const handY = Math.sin(fc * 0.4) * 2;
    drawSit(ctx, cx, cy, fc);
    // Hands on keyboard
    ctx.fillStyle = C.skin;
    ctx.fillRect(cx - S * 2, cy - S * 5 - handY, S * 2, S);
    ctx.fillRect(cx, cy - S * 5 + handY, S * 2, S);
  }

  function drawPoint(ctx, cx, cy, fc) {
    const by = cy - S * 12;
    drawBody(ctx, cx, cy, 0, 0, 0);
    // Pointing arm extended right
    ctx.fillStyle = C.shirt;
    ctx.fillRect(cx + S * 3, by + S * 3, S * 6, S * 2);
    ctx.fillStyle = C.skin;
    ctx.fillRect(cx + S * 9, by + S * 3, S * 1.5, S * 1.5);
  }

  function drawNod(ctx, cx, cy, fc) {
    const nodAngle = Math.abs(Math.sin(fc * 0.15)) * 4;
    drawBody(ctx, cx, cy, 0, 0, nodAngle);
  }

  function drawAttack(ctx, cx, cy, fc) {
    const phase = animFrame % 4;
    const byOff = phase < 2 ? -S * 2 : 0;
    const armFwd = phase < 2 ? -S * 4 : 0;
    const legOff = phase < 2 ? S * 3 : 0;
    drawBody(ctx, cx, cy + byOff, legOff, armFwd, 0);
    // Attack slash effect
    if (phase < 2) {
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + S * 4, cy - S * 10);
      ctx.lineTo(cx + S * 10, cy - S * 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawDodge(ctx, cx, cy, fc) {
    const phase = animFrame % 4;
    const slideOff = phase < 2 ? S * 8 : 0;
    drawBody(ctx, cx + slideOff, cy, 0, S * 3, 0, S * 2);
  }

  function drawReceiveDiploma(ctx, cx, cy, fc) {
    const by = cy - S * 12;
    drawBody(ctx, cx, cy, 0, -S * 2, 0);
    // Both arms extended forward
    ctx.fillStyle = C.shirt;
    ctx.fillRect(cx - S * 7, by + S * 4, S * 4, S * 2);
    ctx.fillRect(cx + S * 3, by + S * 4, S * 4, S * 2);
    ctx.fillStyle = C.skin;
    ctx.fillRect(cx - S * 7, by + S * 6, S * 2, S * 1.5);
    ctx.fillRect(cx + S * 5, by + S * 6, S * 2, S * 1.5);
    // Diploma appearing
    const progress = Math.min(1, animTimer / 60);
    ctx.fillStyle = C.diploma;
    ctx.globalAlpha = progress;
    ctx.fillRect(cx - S * 3, by + S * 4, S * 6, S * 5);
    ctx.globalAlpha = 1;
  }

  function drawPutOnCap(ctx, cx, cy, fc) {
    const by = cy - S * 12;
    const capY = Math.max(0, (1 - Math.min(1, animTimer / 40)) * -S * 8);
    drawBody(ctx, cx, cy, 0, 0, 0);
    // Cap descending from above
    drawCap(ctx, cx, by - S * 2 + capY);
    // Arms raised
    ctx.fillStyle = C.shirt;
    ctx.fillRect(cx - S * 5, by + S * 1, S * 2, S * 3);
    ctx.fillRect(cx + S * 3, by + S * 1, S * 2, S * 3);
  }

  function drawThrowCap(ctx, cx, cy, fc) {
    hasCap = false;
    drawBody(ctx, cx, cy, 0, -S * 6, -2);
    // Victory arms raised
    const by = cy - S * 12;
    ctx.fillStyle = C.shirt;
    ctx.fillRect(cx - S * 6, by - S * 2, S * 2, S * 5);
    ctx.fillRect(cx + S * 4, by - S * 2, S * 2, S * 5);
  }

  function drawVictory(ctx, cx, cy, fc) {
    const bob = Math.abs(Math.sin(fc * 0.1)) * S * 2;
    const by = cy - S * 12 - bob;
    drawBody(ctx, cx, cy - bob, 0, -S * 5, -2);
    // Arms high
    ctx.fillStyle = C.shirt;
    ctx.fillRect(cx - S * 6, by - S * 2, S * 2, S * 5);
    ctx.fillRect(cx + S * 4, by - S * 2, S * 2, S * 5);
    ctx.fillStyle = C.skin;
    ctx.fillRect(cx - S * 6, by - S * 3, S * 2, S * 1.5);
    ctx.fillRect(cx + S * 4, by - S * 3, S * 2, S * 1.5);
  }

  function drawLookAtCam(ctx, cx, cy, fc) {
    const headTilt = Math.sin(fc * 0.02) * 1;
    drawBody(ctx, cx, cy, 0, 0, headTilt);
    // Slightly more intense eyes (looking at cam)
    const by = cy - S * 12;
    ctx.fillStyle = C.red;
    ctx.fillRect(cx - S, by + S * 0.8 + headTilt, S * 0.6, S * 1.2);
    ctx.fillRect(cx + S * 0.7, by + S * 0.8 + headTilt, S * 0.6, S * 1.2);
  }

  function drawOpenDoor(ctx, cx, cy, fc) {
    const progress = Math.min(1, animTimer / 40);
    const armReach = progress * S * 4;
    drawBody(ctx, cx, cy, 0, -armReach, 0);
  }

  function drawCelebrate(ctx, cx, cy, fc) {
    const phase = Math.floor(fc * 0.1) % 4;
    const jumpOff = phase < 2 ? -S * 4 : 0;
    const armY = phase < 2 ? -S * 4 : 0;
    drawBody(ctx, cx, cy + jumpOff, phase * S, armY, 0);
  }

  function drawShakeHead(ctx, cx, cy, fc) {
    const shake = Math.sin(fc * 0.25) * 4;
    drawBody(ctx, cx, cy, 0, 0, 0);
    // Override head with horizontal shake
    const by = cy - S * 12;
    ctx.clearRect(cx - S * 3, by - S * 2, S * 6, S * 8);
    ctx.fillStyle = C.skin;
    ctx.fillRect(cx - S * 2.5 + shake, by - S + 0, S * 5, S * 5);
    ctx.fillStyle = C.hair;
    ctx.fillRect(cx - S * 2.5 + shake, by - S, S * 5, S * 1.5);
  }

  // ---- Public API ----

  function setAnimation(anim) {
    if (currentAnim === anim) return;
    currentAnim = anim;
    animFrame = 0;
    animTimer = 0;
  }

  function setFacing(right) { facingRight = right; }
  function setHasCap(v) { hasCap = v; }
  function setHasDiploma(v) { hasDiploma = v; }

  function throwCap(startX, startY) {
    capThrow = {
      x: startX, y: startY, angle: 0,
      vx: Utils.randInt(-3, 3),
      vy: -12,
      gravity: 0.4,
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.angle += 0.15;
        if (this.y > window.innerHeight + 100) capThrow = null;
      }
    };
  }

  function resetCapThrow() { capThrow = null; }
  function getAnim() { return currentAnim; }

  return {
    ANIM,
    draw,
    setAnimation,
    setFacing,
    setHasCap,
    setHasDiploma,
    throwCap,
    resetCapThrow,
    getAnim,
  };
})();
