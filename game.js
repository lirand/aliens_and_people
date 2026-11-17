(() => {
  const canvas = document.getElementById('game');
  let ctx = canvas.getContext('2d');
  const mainCtx = ctx;
  const W = canvas.width;
  const H = canvas.height;

  const meterFill = document.getElementById('meter-fill');
  const waveInfo = document.getElementById('wave-info');
  const aliensInfo = document.getElementById('aliens-info');
  const scoreInfo = document.getElementById('score-info');

  const startScreen = document.getElementById('start-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const winScreen = document.getElementById('win-screen');
  const gameoverScore = document.getElementById('gameover-score');
  const winScore = document.getElementById('win-score');

  const waveScreen = document.getElementById('wave-screen');
  const waveTitle = document.getElementById('wave-title');
  const waveSubtitle = document.getElementById('wave-subtitle');
  const waveBtn = document.getElementById('wave-btn');
  const crownCanvas = document.getElementById('crown-preview');
  const crownCtx = crownCanvas.getContext('2d');
  let crownPreviewLvl = -1;

  function renderCrownPreview() {
    if (crownPreviewLvl < 0) return;
    const cw = crownCanvas.width, ch = crownCanvas.height;
    ctx = crownCtx;
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    const bob = Math.sin(performance.now() / 500) * 4;
    ctx.translate(cw / 2, ch * 0.72 + bob);
    const zoom = 6.5 - 2.8 * (crownPreviewLvl / (CROWN_COUNT - 1));
    ctx.scale(zoom, zoom);
    drawCrown(crownPreviewLvl, 16, 0);
    ctx.restore();
    ctx = mainCtx;
    requestAnimationFrame(renderCrownPreview);
  }

  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const winRestartBtn = document.getElementById('win-restart-btn');

  // ---------- helpers ----------
  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function circleRectCollide(cx, cy, r, rect) {
    const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    return dist(cx, cy, nearestX, nearestY) < r;
  }

  function segmentIntersectsRect(x1, y1, x2, y2, rect) {
    const { x, y, w, h } = rect;
    const edges = [
      [x, y, x + w, y],
      [x + w, y, x + w, y + h],
      [x + w, y + h, x, y + h],
      [x, y + h, x, y],
    ];
    for (const [ex1, ey1, ex2, ey2] of edges) {
      if (segmentsIntersect(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) return true;
    }
    return false;
  }

  function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const d1 = cross(x4 - x3, y4 - y3, x1 - x3, y1 - y3);
    const d2 = cross(x4 - x3, y4 - y3, x2 - x3, y2 - y3);
    const d3 = cross(x2 - x1, y2 - y1, x3 - x1, y3 - y1);
    const d4 = cross(x2 - x1, y2 - y1, x4 - x1, y4 - y1);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      return true;
    }
    return false;
  }

  function cross(ax, ay, bx, by) {
    return ax * by - ay * bx;
  }

  // ---------- drawing helpers ----------
  function drawAlienSprite(x, y, r, facing, seesPlayer) {
    ctx.save();
    ctx.translate(x, y);

    // head (big oval, green)
    ctx.fillStyle = seesPlayer ? '#44dd44' : '#33bb55';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.15, r, r * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a6630';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // big alien eyes (solid black, wrap-around, no sclera)
    const eyeSpread = r * 0.38;
    const eyeY = -r * 0.15;
    const eyeRx = r * 0.42;
    const eyeRy = r * 0.55;
    const t = performance.now() / 400;

    // outer eye shape — solid black
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.ellipse(-eyeSpread, eyeY, eyeRx, eyeRy, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eyeSpread, eyeY, eyeRx, eyeRy, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // inner reflection
    if (seesPlayer) {
      // blue glow inside eyes when hypnotizing
      ctx.fillStyle = 'rgba(50,120,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(-eyeSpread, eyeY + 2, eyeRx * 0.5, eyeRy * 0.4, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(eyeSpread, eyeY + 2, eyeRx * 0.5, eyeRy * 0.4, 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // subtle green reflection
      ctx.fillStyle = 'rgba(100,200,130,0.15)';
      ctx.beginPath();
      ctx.ellipse(-eyeSpread - 2, eyeY - 4, eyeRx * 0.25, eyeRy * 0.2, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(eyeSpread - 2, eyeY - 4, eyeRx * 0.25, eyeRy * 0.2, 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    // cheeky smile (a little sly when hypnotizing)
    const smileW = r * 0.32;
    const smileY = r * 0.38;
    const smileDepth = seesPlayer ? r * 0.2 : r * 0.13;
    ctx.fillStyle = '#1d4a2c';
    ctx.beginPath();
    ctx.moveTo(-smileW, smileY);
    ctx.quadraticCurveTo(0, smileY + smileDepth * 2, smileW, smileY);
    ctx.quadraticCurveTo(0, smileY + smileDepth * 0.6, -smileW, smileY);
    ctx.fill();
    // two small neat fangs
    ctx.fillStyle = '#f2fff2';
    for (const fx of [-smileW * 0.45, smileW * 0.45]) {
      ctx.beginPath();
      ctx.moveTo(fx - 2, smileY + smileDepth * 0.35);
      ctx.lineTo(fx + 2, smileY + smileDepth * 0.35);
      ctx.lineTo(fx, smileY + smileDepth * 0.35 + 3.5);
      ctx.closePath();
      ctx.fill();
    }
    // smile corners
    ctx.strokeStyle = '#1d4a2c';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-smileW - 2, smileY - 2); ctx.lineTo(-smileW, smileY);
    ctx.moveTo(smileW + 2, smileY - 2); ctx.lineTo(smileW, smileY);
    ctx.stroke();

    // little antennae
    const antennaWave = Math.sin(t * 2) * 0.15;
    ctx.strokeStyle = '#44cc66';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, -r * 1.05);
    ctx.quadraticCurveTo(-r * 0.6, -r * 1.5 + antennaWave * r, -r * 0.45, -r * 1.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.25, -r * 1.05);
    ctx.quadraticCurveTo(r * 0.6, -r * 1.5 - antennaWave * r, r * 0.45, -r * 1.7);
    ctx.stroke();
    // antenna tips (glow when hypnotizing)
    ctx.fillStyle = seesPlayer ? '#4488ff' : '#88ffcc';
    ctx.shadowColor = seesPlayer ? '#3366ff' : '#44ff88';
    ctx.shadowBlur = seesPlayer ? 8 : 4;
    ctx.beginPath();
    ctx.arc(-r * 0.45, -r * 1.7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 1.7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // hypnosis waves when seeing player
    if (seesPlayer) {
      ctx.strokeStyle = 'rgba(50,100,255,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const rr = r * 1.5 + ((t * 80 + i * 8) % 24);
        ctx.globalAlpha = 0.5 - i * 0.15;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawPlayerSprite(x, y, r, angle, walking) {
    ctx.save();
    ctx.translate(x, y);

    // legs with walk animation (khaki pants)
    const legSwing = walking ? Math.sin(performance.now() / 100) * 8 : 0;
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5, r * 0.5);
    ctx.lineTo(-7 + legSwing, r * 1.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, r * 0.5);
    ctx.lineTo(7 - legSwing, r * 1.3);
    ctx.stroke();
    // heavy boots
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.roundRect(-12 + legSwing, r * 1.2, 10, 5, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(2 - legSwing, r * 1.2, 10, 5, 2);
    ctx.fill();

    // body (vest / jacket — olive green)
    ctx.fillStyle = '#556B2F';
    ctx.beginPath();
    ctx.roundRect(-r * 0.65, -r * 0.35, r * 1.3, r * 1.05, 4);
    ctx.fill();
    ctx.strokeStyle = '#3B4A1F';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // vest pockets
    ctx.fillStyle = '#4A5E28';
    ctx.fillRect(-r * 0.45, r * 0.05, r * 0.35, r * 0.3);
    ctx.fillRect(r * 0.1, r * 0.05, r * 0.35, r * 0.3);
    ctx.strokeStyle = '#3B4A1F';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-r * 0.45, r * 0.05, r * 0.35, r * 0.3);
    ctx.strokeRect(r * 0.1, r * 0.05, r * 0.35, r * 0.3);

    // ammo belt across chest
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.1);
    ctx.lineTo(r * 0.5, r * 0.5);
    ctx.stroke();

    // head
    ctx.fillStyle = '#e8b878';
    ctx.beginPath();
    ctx.arc(0, -r * 0.7, r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // hunter hat (safari/wide-brim)
    ctx.fillStyle = '#8B6914';
    // brim
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.95, r * 0.85, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // crown
    ctx.fillStyle = '#7A5C12';
    ctx.beginPath();
    ctx.roundRect(-r * 0.4, -r * 1.35, r * 0.8, r * 0.45, [4, 4, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = '#5a4310';
    ctx.lineWidth = 1;
    ctx.stroke();
    // hat band
    ctx.fillStyle = '#553311';
    ctx.fillRect(-r * 0.4, -r * 0.95, r * 0.8, r * 0.08);

    // eyes (look toward mouse)
    const eyeOffX = Math.cos(angle) * 2;
    const eyeOffY = Math.sin(angle) * 2;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-4, -r * 0.72, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -r * 0.72, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-4 + eyeOffX, -r * 0.72 + eyeOffY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4 + eyeOffX, -r * 0.72 + eyeOffY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // crown (a fancier one every 5 waves)
    const crownLvl = getCrownLevel(game.waveIndex);
    if (crownLvl >= 0) drawCrown(crownLvl, r, -r * 1.3);

    // rifle pointing toward mouse
    ctx.rotate(angle);
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(r * 0.2, -2, r * 1.2, 4);
    ctx.fillStyle = '#444';
    ctx.fillRect(r * 1.4, -2.5, r * 0.9, 5);
    ctx.fillStyle = '#333';
    ctx.fillRect(r * 1.0, -5, r * 0.5, 3);
    ctx.fillStyle = '#e8b878';
    ctx.beginPath();
    ctx.arc(r * 0.3, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawHelperSprite(x, y, r, facing, seesPlayer) {
    ctx.save();
    ctx.translate(x, y);

    // legs
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const legAnim = Math.sin(performance.now() / 120) * 6;
    ctx.beginPath();
    ctx.moveTo(-4, r * 0.4);
    ctx.lineTo(-6 + legAnim, r * 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, r * 0.4);
    ctx.lineTo(6 - legAnim, r * 1.2);
    ctx.stroke();
    // dark boots
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(-6 + legAnim, r * 1.2 + 2, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6 - legAnim, r * 1.2 + 2, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // body — dark hooded robe
    ctx.fillStyle = '#2a1a2a';
    ctx.beginPath();
    ctx.roundRect(-r * 0.55, -r * 0.3, r * 1.1, r * 0.9, 4);
    ctx.fill();
    ctx.strokeStyle = '#1a0a1a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // alien symbol on chest
    ctx.fillStyle = seesPlayer ? '#4488ff' : '#33aa55';
    ctx.beginPath();
    ctx.arc(0, r * 0.1, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1a2a';
    ctx.beginPath();
    ctx.arc(0, r * 0.1, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // head with hood
    ctx.fillStyle = '#ddb888';
    ctx.beginPath();
    ctx.arc(0, -r * 0.6, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    // hood
    ctx.fillStyle = '#2a1a2a';
    ctx.beginPath();
    ctx.arc(0, -r * 0.65, r * 0.55, Math.PI + 0.3, -0.3);
    ctx.lineTo(r * 0.45, -r * 0.3);
    ctx.lineTo(-r * 0.45, -r * 0.3);
    ctx.closePath();
    ctx.fill();

    // glowing eyes
    ctx.fillStyle = seesPlayer ? '#4488ff' : '#cc4444';
    ctx.shadowColor = seesPlayer ? '#3366ff' : '#cc4444';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(-4, -r * 0.6, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -r * 0.6, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // detection waves when seeing player
    if (seesPlayer) {
      ctx.strokeStyle = 'rgba(50,100,255,0.3)';
      ctx.lineWidth = 1.5;
      const t = performance.now() / 300;
      for (let i = 0; i < 2; i++) {
        const rr = r * 1.3 + ((t * 60 + i * 10) % 20);
        ctx.globalAlpha = 0.4 - i * 0.15;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ---------- entities ----------
  class Obstacle {
    constructor(x, y, w, h) {
      this.x = x; this.y = y; this.w = w; this.h = h;
    }
    draw() {
      ctx.fillStyle = '#2f3d4c';
      ctx.strokeStyle = '#5a7690';
      ctx.lineWidth = 2;
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.strokeRect(this.x, this.y, this.w, this.h);
    }
  }

  class Bullet {
    constructor(x, y, angle) {
      this.x = x; this.y = y;
      this.speed = 620;
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
      this.dead = false;
      this.r = 3;
    }
    update(dt) {
      const px = this.x, py = this.y;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.dead = true;
      for (const ob of game.obstacles) {
        if (segmentIntersectsRect(px, py, this.x, this.y, ob)) {
          this.dead = true;
          break;
        }
      }
    }
    draw() {
      ctx.fillStyle = '#ffe066';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  class EnemyBullet {
    constructor(x, y, angle) {
      this.x = x; this.y = y;
      this.speed = 160;
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
      this.dead = false;
      this.r = 6;
    }
    update(dt) {
      const px = this.x, py = this.y;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) { this.dead = true; return; }
      for (const ob of game.obstacles) {
        if (segmentIntersectsRect(px, py, this.x, this.y, ob)) {
          this.dead = true;
          break;
        }
      }
    }
    draw() {
      ctx.fillStyle = '#cc44ff';
      ctx.shadowColor = '#9922cc';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  class Player {
    constructor() {
      this.x = W / 2;
      this.y = H / 2;
      this.r = 16;
      this.speed = 220;
      this.angle = 0;
      this.hypnosis = 0;
      this.fireCooldown = 0;
      this.shooting = false;
      this.walking = false;
    }
    update(dt, keys, mouse) {
      let dx = 0, dy = 0;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;

      this.walking = (dx !== 0 || dy !== 0);
      if (this.walking) {
        const len = Math.hypot(dx, dy);
        dx /= len; dy /= len;
        const nx = this.x + dx * this.speed * dt;
        const ny = this.y + dy * this.speed * dt;
        if (!this.collidesAt(nx, this.y)) this.x = nx;
        if (!this.collidesAt(this.x, ny)) this.y = ny;
      }

      this.x = Math.max(this.r, Math.min(W - this.r, this.x));
      this.y = Math.max(this.r, Math.min(H - this.r, this.y));

      this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

      this.shooting = mouse.down || keys.has(' ');
      if (this.fireCooldown > 0) this.fireCooldown -= dt;
      if (this.shooting && this.fireCooldown <= 0) {
        game.bullets.push(new Bullet(
          this.x + Math.cos(this.angle) * (this.r + 10),
          this.y + Math.sin(this.angle) * (this.r + 10),
          this.angle
        ));
        this.fireCooldown = 0.18;
      }
    }
    collidesAt(x, y) {
      for (const ob of game.obstacles) {
        if (circleRectCollide(x, y, this.r, ob)) return true;
      }
      return false;
    }
    draw() {
      drawPlayerSprite(this.x, this.y, this.r, this.angle, this.walking);
    }
  }

  class Alien {
    constructor(x, y, cfg) {
      this.x = x; this.y = y;
      this.r = 18;
      this.speed = cfg.speed;
      this.visionRange = cfg.visionRange;
      this.visionHalfAngle = cfg.visionHalfAngle;
      this.hypRate = cfg.hypRate;
      this.dead = false;
      this.facing = Math.random() * Math.PI * 2;
      this.seesPlayer = false;
      this.wanderTimer = 0;
      this.wanderAngle = Math.random() * Math.PI * 2;
      this.stuckTimer = 0;
      this.flankDir = Math.random() < 0.5 ? 1 : -1;
    }
    update(dt, player) {
      const d = dist(this.x, this.y, player.x, player.y);
      const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);

      // check if line of sight to player is blocked by obstacle
      let blocked = false;
      for (const ob of game.obstacles) {
        if (segmentIntersectsRect(this.x, this.y, player.x, player.y, ob)) {
          blocked = true;
          break;
        }
      }

      // track previous position to detect being stuck on geometry
      const prevX = this.x;
      const prevY = this.y;

      let moveAngle = angleToPlayer;
      if (d <= 60) {
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
          this.wanderAngle = Math.random() * Math.PI * 2;
          this.wanderTimer = 1 + Math.random();
        }
        moveAngle = this.wanderAngle;
      } else if (blocked) {
        this.stuckTimer += dt;
        if (this.stuckTimer > 0.3) {
          moveAngle = angleToPlayer + (Math.PI * 0.6) * this.flankDir;
        }
        if (this.stuckTimer > 1.5) {
          this.flankDir *= -1;
          this.stuckTimer = 0;
        }
      } else {
        this.stuckTimer = 0;
      }

      const step = this.speed * dt;
      const tryAngles = [moveAngle, moveAngle + 0.5 * this.flankDir, moveAngle - 0.5 * this.flankDir,
                         moveAngle + Math.PI / 2, moveAngle - Math.PI / 2,
                         moveAngle + Math.PI * 0.75, moveAngle - Math.PI * 0.75];
      let moved = false;
      for (const a of tryAngles) {
        const nx = this.x + Math.cos(a) * step;
        const ny = this.y + Math.sin(a) * step;
        const bx = this.collidesAt(nx, this.y);
        const by = this.collidesAt(this.x, ny);
        if (!bx && !by) {
          this.x = nx;
          this.y = ny;
          moved = true;
          break;
        }
        if (!bx) { this.x = nx; moved = true; break; }
        if (!by) { this.y = ny; moved = true; break; }
      }

      // if barely moved, count as stuck even without LOS block
      if (Math.abs(this.x - prevX) < 0.1 && Math.abs(this.y - prevY) < 0.1) {
        this.stuckTimer += dt;
      }
      this.x = Math.max(this.r, Math.min(W - this.r, this.x));
      this.y = Math.max(this.r, Math.min(H - this.r, this.y));

      this.facing = angleToPlayer;

      // vision: always faces player, check distance + obstacle blocking
      let sees = !isInvisible() && d <= this.visionRange;
      if (sees) {
        for (const ob of game.obstacles) {
          if (segmentIntersectsRect(this.x, this.y, player.x, player.y, ob)) {
            sees = false;
            break;
          }
        }
      }
      this.seesPlayer = sees;

      if (sees) {
        player.hypnosis = Math.min(100, player.hypnosis + this.hypRate * dt);
      }
    }
    collidesAt(x, y) {
      for (const ob of game.obstacles) {
        if (circleRectCollide(x, y, this.r, ob)) return true;
      }
      return false;
    }
    draw() {
      // vision cone
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.arc(this.x, this.y, this.visionRange,
        this.facing - this.visionHalfAngle, this.facing + this.visionHalfAngle);
      ctx.closePath();
      ctx.fillStyle = this.seesPlayer ? 'rgba(255,50,50,0.15)' : 'rgba(100,255,100,0.06)';
      ctx.fill();
      if (this.seesPlayer) {
        ctx.strokeStyle = 'rgba(255,80,80,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      drawAlienSprite(this.x, this.y, this.r, this.facing, this.seesPlayer);
    }
  }

  class Helper {
    constructor(x, y, cfg) {
      this.x = x; this.y = y;
      this.r = 14;
      this.speed = cfg.speed * 1.3;
      this.visionRange = cfg.visionRange * 1.1;
      this.hypRate = cfg.hypRate * 0.7;
      this.dead = false;
      this.facing = Math.random() * Math.PI * 2;
      this.seesPlayer = false;
      this.stuckTimer = 0;
      this.flankDir = Math.random() < 0.5 ? 1 : -1;
      this.isHelper = true;
      this.fireCooldown = 2;
    }
    update(dt, player) {
      const d = dist(this.x, this.y, player.x, player.y);
      const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);

      let blocked = false;
      for (const ob of game.obstacles) {
        if (segmentIntersectsRect(this.x, this.y, player.x, player.y, ob)) {
          blocked = true;
          break;
        }
      }

      const prevX = this.x;
      const prevY = this.y;

      let moveAngle = angleToPlayer;
      if (blocked) {
        this.stuckTimer += dt;
        if (this.stuckTimer > 0.3) {
          moveAngle = angleToPlayer + (Math.PI * 0.6) * this.flankDir;
        }
        if (this.stuckTimer > 1.5) {
          this.flankDir *= -1;
          this.stuckTimer = 0;
        }
      } else {
        this.stuckTimer = 0;
      }

      // keeps more distance than aliens, circles around
      if (d < 120 && !blocked) {
        moveAngle = angleToPlayer + Math.PI * 0.45 * this.flankDir;
      }

      const step = this.speed * dt;
      const tryAngles = [moveAngle, moveAngle + 0.5 * this.flankDir, moveAngle - 0.5 * this.flankDir,
                         moveAngle + Math.PI / 2, moveAngle - Math.PI / 2];
      for (const a of tryAngles) {
        const nx = this.x + Math.cos(a) * step;
        const ny = this.y + Math.sin(a) * step;
        if (!this.collidesAt(nx, ny)) {
          this.x = nx; this.y = ny; break;
        }
        if (!this.collidesAt(nx, this.y)) { this.x = nx; break; }
        if (!this.collidesAt(this.x, ny)) { this.y = ny; break; }
      }

      if (Math.abs(this.x - prevX) < 0.1 && Math.abs(this.y - prevY) < 0.1) {
        this.stuckTimer += dt;
      }

      this.x = Math.max(this.r, Math.min(W - this.r, this.x));
      this.y = Math.max(this.r, Math.min(H - this.r, this.y));
      this.facing = angleToPlayer;

      let sees = !isInvisible() && d <= this.visionRange;
      if (sees) {
        for (const ob of game.obstacles) {
          if (segmentIntersectsRect(this.x, this.y, player.x, player.y, ob)) {
            sees = false;
            break;
          }
        }
      }
      this.seesPlayer = sees;

      if (sees) {
        player.hypnosis = Math.min(100, player.hypnosis + this.hypRate * dt);
      }

      // shoot at player even outside vision cone (if not blocked by obstacle)
      if (this.fireCooldown > 0) this.fireCooldown -= dt;
      if (!blocked && !isInvisible() && this.fireCooldown <= 0) {
        game.enemyBullets.push(new EnemyBullet(
          this.x + Math.cos(angleToPlayer) * (this.r + 6),
          this.y + Math.sin(angleToPlayer) * (this.r + 6),
          angleToPlayer
        ));
        this.fireCooldown = sees ? 1.5 : 2.5;
      }
    }
    collidesAt(x, y) {
      for (const ob of game.obstacles) {
        if (circleRectCollide(x, y, this.r, ob)) return true;
      }
      return false;
    }
    draw() {
      // vision cone (purple-ish)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.arc(this.x, this.y, this.visionRange,
        this.facing - 0.5, this.facing + 0.5);
      ctx.closePath();
      ctx.fillStyle = this.seesPlayer ? 'rgba(100,50,255,0.15)' : 'rgba(150,100,200,0.06)';
      ctx.fill();
      ctx.restore();

      drawHelperSprite(this.x, this.y, this.r, this.facing, this.seesPlayer);
    }
  }

  // ---------- audio ----------
  let audioCtx = null;
  let musicNodes = null;

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function startMusic() {
    try {
      initAudio();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      if (musicNodes) stopMusic();

      const BPM = 100;
      const beatLen = 60 / BPM;
      const master = audioCtx.createGain();
      master.gain.value = 0.32;
      master.connect(audioCtx.destination);

      // delay for synthwave echo
      const delay = audioCtx.createDelay(1.0);
      delay.delayTime.value = beatLen * 0.75;
      const fb = audioCtx.createGain();
      fb.gain.value = 0.35;
      const delayGain = audioCtx.createGain();
      delayGain.gain.value = 0.2;
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(master);

      // ---- KICK DRUM (four on the floor) ----
      const kickOsc = audioCtx.createOscillator();
      kickOsc.type = 'sine';
      kickOsc.frequency.value = 60;
      const kickGain = audioCtx.createGain();
      kickGain.gain.value = 0;
      kickOsc.connect(kickGain);
      kickGain.connect(master);
      kickOsc.start();

      function scheduleKick() {
        if (!musicNodes) return;
        const now = audioCtx.currentTime;
        kickOsc.frequency.setValueAtTime(150, now);
        kickOsc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
        kickGain.gain.setValueAtTime(0.3, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        setTimeout(scheduleKick, beatLen * 1000);
      }
      scheduleKick();

      // ---- HI-HAT (offbeat 8ths) ----
      const bufferSize = audioCtx.sampleRate;
      const noiseBuf = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) nd[i] = Math.random() * 2 - 1;
      const hat = audioCtx.createBufferSource();
      hat.buffer = noiseBuf;
      hat.loop = true;
      const hatFilter = audioCtx.createBiquadFilter();
      hatFilter.type = 'highpass';
      hatFilter.frequency.value = 8000;
      const hatGain = audioCtx.createGain();
      hatGain.gain.value = 0;
      hat.connect(hatFilter);
      hatFilter.connect(hatGain);
      hatGain.connect(master);
      hat.start();

      let hatBeat = 0;
      function scheduleHat() {
        if (!musicNodes) return;
        const now = audioCtx.currentTime;
        const vol = (hatBeat % 2 === 1) ? 0.07 : 0.03;
        hatGain.gain.setValueAtTime(vol, now);
        hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        hatBeat++;
        setTimeout(scheduleHat, beatLen * 500);
      }
      scheduleHat();

      // ---- SYNTH BASS (arpeggiated, sawtooth filtered) ----
      const bassOsc = audioCtx.createOscillator();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.value = 55;
      const bassFilter = audioCtx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 250;
      bassFilter.Q.value = 12;
      const bassGain = audioCtx.createGain();
      bassGain.gain.value = 0;
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(master);
      bassOsc.start();

      const bassPattern = [41.2, 41.2, 49, 41.2, 55, 41.2, 49, 36.7,
                           41.2, 41.2, 55, 49, 36.7, 41.2, 49, 36.7];
      let bassIdx = 0;
      function scheduleBass() {
        if (!musicNodes) return;
        const now = audioCtx.currentTime;
        const freq = bassPattern[bassIdx % bassPattern.length];
        bassOsc.frequency.setValueAtTime(freq, now);
        bassFilter.frequency.setValueAtTime(800, now);
        bassFilter.frequency.exponentialRampToValueAtTime(250, now + beatLen * 0.4);
        bassGain.gain.setValueAtTime(0.18, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + beatLen * 0.45);
        bassIdx++;
        setTimeout(scheduleBass, beatLen * 500);
      }
      scheduleBass();

      // ---- LEAD SYNTH (synthwave melody, square wave) ----
      const leadOsc = audioCtx.createOscillator();
      leadOsc.type = 'square';
      leadOsc.frequency.value = 220;
      const leadFilter = audioCtx.createBiquadFilter();
      leadFilter.type = 'lowpass';
      leadFilter.frequency.value = 1500;
      leadFilter.Q.value = 6;
      const leadGain = audioCtx.createGain();
      leadGain.gain.value = 0;
      leadOsc.connect(leadFilter);
      leadFilter.connect(leadGain);
      leadGain.connect(master);
      leadGain.connect(delay);
      leadOsc.start();

      const leadNotes = [164.8, 0, 196, 220, 0, 207.7, 164.8, 0,
                         146.8, 0, 164.8, 196, 0, 185, 164.8, 0,
                         130.8, 0, 146.8, 164.8, 0, 155.6, 146.8, 0,
                         164.8, 0, 185, 196, 0, 207.7, 220, 0];
      let leadIdx = 0;
      function scheduleLead() {
        if (!musicNodes) return;
        const now = audioCtx.currentTime;
        const freq = leadNotes[leadIdx % leadNotes.length];
        if (freq > 0) {
          leadOsc.frequency.setValueAtTime(freq, now);
          leadFilter.frequency.setValueAtTime(2500, now);
          leadFilter.frequency.exponentialRampToValueAtTime(600, now + beatLen * 0.8);
          leadGain.gain.setValueAtTime(0.08, now);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + beatLen * 0.9);
        }
        leadIdx++;
        setTimeout(scheduleLead, beatLen * 500);
      }
      setTimeout(scheduleLead, beatLen * 4000);

      // ---- PAD (wide sawtooth chord, filtered) ----
      const padOscs = [];
      const padGainNode = audioCtx.createGain();
      padGainNode.gain.value = 0.05;
      const padFilter2 = audioCtx.createBiquadFilter();
      padFilter2.type = 'lowpass';
      padFilter2.frequency.value = 800;
      padGainNode.connect(padFilter2);
      padFilter2.connect(master);

      [82.4, 98, 123.5, 146.8].forEach(freq => {
        const o = audioCtx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        o.connect(padGainNode);
        o.start();
        padOscs.push(o);
      });

      // slow filter sweep on pad
      const padLfo = audioCtx.createOscillator();
      padLfo.frequency.value = 0.08;
      const padLfoGain = audioCtx.createGain();
      padLfoGain.gain.value = 600;
      padLfo.connect(padLfoGain);
      padLfoGain.connect(padFilter2.frequency);
      padLfo.start();

      musicNodes = { master, kickOsc, hat, bassOsc, leadOsc, padLfo,
                     padOscs,
                     all: [kickOsc, hat, bassOsc, leadOsc, padLfo, ...padOscs] };
    } catch(e) {
      console.error('Music init failed:', e);
    }
  }

  function stopMusic() {
    if (!musicNodes) return;
    musicNodes.all.forEach(n => { try { n.stop(); } catch(e) {} });
    musicNodes.master.disconnect();
    musicNodes = null;
  }

  function updateMusicIntensity(hypnosis) {
    if (!musicNodes) return;
    const t = hypnosis / 100;
    musicNodes.master.gain.value = 0.22 + t * 0.3;
  }

  // ---------- game ----------
  const TOTAL_WAVES = 100;
  const WAVES = [];
  for (let i = 0; i < TOTAL_WAVES; i++) {
    const t = i / (TOTAL_WAVES - 1);
    WAVES.push({
      count: Math.floor(2 + t * 6),
      speed: 22 + t * 35,
      visionRange: 130 + t * 100,
      visionHalfAngle: 0.35 + t * 0.2,
      hypRate: 10 + t * 20,
    });
  }

  // a new crown every 5 waves: level 0 at wave 5 ... level 19 at wave 100
  const CROWN_COUNT = 20;
  function getCrownLevel(waveIdx) {
    return Math.min(CROWN_COUNT - 1, Math.floor((waveIdx + 1) / 5) - 1);
  }

  const CROWN_NAMES = [
    'עץ', 'נחושת', 'ארד', 'ארד מבריק', 'כסף', 'כסף מלכותי', 'זהב', 'זהב טהור',
    'זהב וספירים', 'אזמרגד', 'אודם', 'מלך', 'קיסר', 'פלטינה', 'יהלום',
    'יהלום כחול', 'כוכבים', 'שמש', 'אגדי', 'האולטימטיבי',
  ];

  // metal palette per tier: [light, mid, dark]
  function crownMetal(lvl) {
    if (lvl <= 0) return ['#b08a5a', '#8b6a40', '#5e4526'];       // wood
    if (lvl <= 1) return ['#e3a27a', '#b87333', '#7a4a20'];       // copper
    if (lvl <= 3) return ['#f0b070', '#cd7f32', '#8a5520'];       // bronze
    if (lvl <= 5) return ['#ffffff', '#c8ccd4', '#8a8f99'];       // silver
    if (lvl <= 12) return ['#fff4b0', '#ffd23a', '#b8860b'];      // gold
    if (lvl <= 15) return ['#ffffff', '#dfe6ee', '#9aa6b4'];      // platinum
    return ['#fff8d0', '#ffcc00', '#c07800'];                     // radiant gold
  }

  function crownGemColor(lvl, i) {
    if (lvl >= 18) return `hsl(${(performance.now() / 8 + i * 60) % 360},100%,60%)`;
    if (lvl >= 14) return ['#bff4ff', '#7fd8ff', '#ffffff'][i % 3];
    if (lvl === 9) return '#2ecc71';
    if (lvl === 8) return '#2a6bff';
    if (lvl >= 10) return ['#ff2244', '#2a6bff', '#2ecc71'][i % 3];
    return '#ff3355';
  }

  function drawGem(x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.8, y);
    ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.8, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x - s * 0.25, y - s * 0.3, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // draws the crown with its base centred at (0, baseY) in current transform
  function drawCrown(lvl, r, baseY) {
    const t = performance.now() / 1000;
    const k = lvl / (CROWN_COUNT - 1);           // 0 → 1
    const w = r * (0.55 + k * 0.75);              // half-width
    const h = r * (0.35 + k * 0.85);              // spike height
    const bandH = r * (0.12 + k * 0.18);
    const spikes = 3 + Math.floor(lvl / 4);       // 3 → 7 points
    const [light, mid, dark] = crownMetal(lvl);

    ctx.save();

    // ---- back effects ----
    if (lvl >= 17) {                              // rotating sun rays
      ctx.save();
      ctx.translate(0, baseY - h * 0.6);
      ctx.rotate(t * 0.6);
      const rays = 12;
      for (let i = 0; i < rays; i++) {
        ctx.rotate((Math.PI * 2) / rays);
        ctx.fillStyle = `rgba(255,220,80,${0.18 + 0.1 * Math.sin(t * 3 + i)})`;
        ctx.beginPath();
        ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(0, -h * 2.4);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    if (lvl >= 19) {                              // rainbow halo
      ctx.lineWidth = 3;
      ctx.strokeStyle = `hsl(${(t * 120) % 360},100%,65%)`;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(0, baseY - h * 1.6, w * 1.1, h * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (lvl >= 9) {                               // glow
      ctx.shadowColor = lvl >= 18 ? `hsl(${(t * 120) % 360},100%,60%)` : mid;
      ctx.shadowBlur = 6 + (lvl - 9) * 1.5 + 3 * Math.sin(t * 4);
    }

    // ---- crown body ----
    const grad = ctx.createLinearGradient(0, baseY - h, 0, baseY + bandH);
    grad.addColorStop(0, light);
    grad.addColorStop(0.55, mid);
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-w, baseY + bandH);
    ctx.lineTo(-w, baseY - h * 0.55);
    for (let i = 0; i < spikes; i++) {
      const x0 = -w + (2 * w * i) / (spikes - 1);
      const tall = (i === Math.floor(spikes / 2)) ? 1.15 : (i % 2 === 0 ? 1 : 0.8);
      ctx.lineTo(x0, baseY - h * tall);
      if (i < spikes - 1) {
        const xm = x0 + w / (spikes - 1);
        ctx.lineTo(xm, baseY - h * 0.35);
      }
    }
    ctx.lineTo(w, baseY + bandH);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    ctx.stroke();

    // band
    if (lvl >= 2) {
      ctx.fillStyle = dark;
      ctx.fillRect(-w, baseY, w * 2, bandH);
      ctx.fillStyle = light;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(-w, baseY, w * 2, bandH * 0.3);
      ctx.globalAlpha = 1;
    }
    // fur trim (royal)
    if (lvl >= 11) {
      ctx.fillStyle = '#fafafa';
      ctx.beginPath();
      ctx.roundRect(-w * 1.05, baseY + bandH * 0.7, w * 2.1, bandH * 0.9, bandH * 0.45);
      ctx.fill();
      ctx.fillStyle = '#222';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(-w + (i + 0.5) * (w * 2 / 6) - 1, baseY + bandH * 1.0, 2, 3);
      }
    }

    // ---- jewels ----
    // balls on spike tips
    if (lvl >= 1) {
      for (let i = 0; i < spikes; i++) {
        const x0 = -w + (2 * w * i) / (spikes - 1);
        const tall = (i === Math.floor(spikes / 2)) ? 1.15 : (i % 2 === 0 ? 1 : 0.8);
        const s = 1.5 + k * 2.5;
        if (lvl >= 6) drawGem(x0, baseY - h * tall - s * 0.6, s, crownGemColor(lvl, i));
        else {
          ctx.fillStyle = lvl >= 4 ? '#ffffff' : light;
          ctx.beginPath();
          ctx.arc(x0, baseY - h * tall - s * 0.5, s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // gems in the band
    if (lvl >= 3) {
      const n = Math.min(7, 1 + Math.floor((lvl - 3) / 2) * 2);
      for (let i = 0; i < n; i++) {
        const gx = n === 1 ? 0 : -w * 0.75 + (1.5 * w * i) / (n - 1);
        drawGem(gx, baseY + bandH * 0.5, bandH * 0.42, crownGemColor(lvl, i + 1));
      }
    }
    // big centre jewel on body
    if (lvl >= 7) {
      drawGem(0, baseY - h * 0.35, r * (0.12 + k * 0.12), crownGemColor(lvl, 0));
    }
    // cross / orb on top
    if (lvl >= 12) {
      const topY = baseY - h * 1.15 - r * 0.25;
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(0, topY, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = mid;
      ctx.fillRect(-1.5, topY - r * 0.45, 3, r * 0.35);
      ctx.fillRect(-r * 0.13, topY - r * 0.35, r * 0.26, 3);
    }

    // ---- sparkles ----
    if (lvl >= 13) {
      const n = 3 + (lvl - 13) * 2;
      for (let i = 0; i < n; i++) {
        const a = i * 2.39 + t * 0.8;
        const phase = (t * 1.5 + i * 0.37) % 1;
        const sx = Math.cos(a) * w * 1.3;
        const sy = baseY - h * 0.5 + Math.sin(a * 1.3) * h * 0.9;
        const s = 3 * Math.sin(phase * Math.PI);
        ctx.strokeStyle = lvl >= 18 ? `hsl(${(i * 50 + t * 100) % 360},100%,80%)` : '#fff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy);
        ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  const HYPNOSIS_DECAY = 15;
  const POWER_CHARGE_TIME = 20; // seconds to fill the ring
  const POWER_DURATION = 20;    // seconds of invisibility
  const isInvisible = () => game.power.active > 0;

  const game = {
    state: 'start',
    player: null,
    aliens: [],
    bullets: [],
    enemyBullets: [],
    hitFlash: 0,
    obstacles: [],
    waveIndex: 0,
    kills: 0,
    keys: new Set(),
    mouse: { x: W / 2, y: H / 2, down: false },
    lastTime: 0,
    power: { charge: 0, active: 0 },
    spaceHeld: false,
  };

  function buildObstacles() {
    return [
      new Obstacle(150, 120, 120, 30),
      new Obstacle(630, 450, 120, 30),
      new Obstacle(380, 180, 100, 30),
      new Obstacle(420, 400, 100, 30),
    ];
  }

  function spawnAtEdge() {
    let x, y;
    do {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { x = Math.random() * W; y = 20; }
      else if (edge === 1) { x = Math.random() * W; y = H - 20; }
      else if (edge === 2) { x = 20; y = Math.random() * H; }
      else { x = W - 20; y = Math.random() * H; }
    } while (dist(x, y, game.player.x, game.player.y) < 150);
    return { x, y };
  }

  function spawnWave(idx) {
    const cfg = WAVES[idx];
    game.aliens = [];
    for (let i = 0; i < cfg.count; i++) {
      const pos = spawnAtEdge();
      game.aliens.push(new Alien(pos.x, pos.y, cfg));
    }
    if (idx >= 4) {
      const helperCount = Math.min(Math.floor((idx - 3) * 0.8), 6);
      for (let i = 0; i < helperCount; i++) {
        const pos = spawnAtEdge();
        game.aliens.push(new Helper(pos.x, pos.y, cfg));
      }
    }
    const totalEnemies = game.aliens.length;
    waveInfo.textContent = `שלב ${idx + 1} / ${WAVES.length}`;
  }

  function resetGame(fromWave = 0) {
    game.player = new Player();
    game.obstacles = buildObstacles();
    game.bullets = [];
    game.enemyBullets = [];
    game.waveIndex = fromWave;
    if (fromWave === 0) game.kills = 0;
    game.power = { charge: 0, active: 0 };
    scoreInfo.textContent = `הריגות: ${game.kills}`;
    spawnWave(fromWave);
  }

  function retryWave() {
    startGame(game.waveIndex);
  }

  function startGame(fromWave = 0) {
    if (typeof fromWave !== 'number') fromWave = 0;
    resetGame(fromWave);
    game.state = 'playing';
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    winScreen.classList.add('hidden');
    waveScreen.classList.add('hidden');
    canvas.focus();
    startMusic();
  }

  function showWaveBreak(idx) {
    game.state = 'wavebreak';
    game.bullets = [];
    game.enemyBullets = [];
    game.player.hypnosis = Math.max(0, game.player.hypnosis - 30);
    waveTitle.textContent = `שלב ${idx + 1}`;
    const helperCount = idx >= 4 ? Math.min(Math.floor((idx - 3) * 0.8), 6) : 0;
    const helperText = helperCount > 0 ? ` + ${helperCount} בוגדים` : '';
    const cl = getCrownLevel(idx);
    const prevCl = getCrownLevel(idx - 1);
    const crownText = cl > prevCl ? ` — 👑 קיבלת כתר ${CROWN_NAMES[cl]}!` : '';
    if (cl > prevCl) {
      crownPreviewLvl = cl;
      crownCanvas.classList.remove('hidden');
      requestAnimationFrame(renderCrownPreview);
    } else {
      crownPreviewLvl = -1;
      crownCanvas.classList.add('hidden');
    }
    waveSubtitle.textContent = `${WAVES[idx].count} חייזרים${helperText} בדרך — הריגות: ${game.kills}${crownText}`;
    waveScreen.classList.remove('hidden');
  }

  function continueWave() {
    spawnWave(game.waveIndex);
    crownPreviewLvl = -1;
    crownCanvas.classList.add('hidden');
    waveScreen.classList.add('hidden');
    game.state = 'playing';
    canvas.focus();
  }

  function endGame(win) {
    game.state = win ? 'win' : 'gameover';
    stopMusic();
    if (win) {
      winScore.textContent = `הריגות: ${game.kills}`;
      winScreen.classList.remove('hidden');
    } else {
      gameoverScore.textContent = `הריגות: ${game.kills} — שלב ${game.waveIndex + 1}`;
      gameoverScreen.classList.remove('hidden');
    }
  }

  function update(dt) {
    const player = game.player;
    player.update(dt, game.keys, game.mouse);

    // invisibility power: charge ring, then active countdown
    if (game.power.active > 0) {
      game.power.active = Math.max(0, game.power.active - dt);
    } else {
      game.power.charge = Math.min(POWER_CHARGE_TIME, game.power.charge + dt);
    }

    let anySees = false;
    for (const alien of game.aliens) {
      alien.update(dt, player);
      if (alien.seesPlayer) anySees = true;
    }
    if (player.hypnosis >= 100) {
      meterFill.style.width = '100%';
      endGame(false);
      return;
    }
    if (!anySees) {
      player.hypnosis = Math.max(0, player.hypnosis - HYPNOSIS_DECAY * dt);
    } else {
      player.hypnosis = Math.max(0, player.hypnosis - HYPNOSIS_DECAY * 0.15 * dt);
    }

    for (const b of game.bullets) b.update(dt);
    game.bullets = game.bullets.filter(b => !b.dead);

    for (const alien of game.aliens) {
      if (alien.dead) continue;
      for (const b of game.bullets) {
        if (b.dead) continue;
        if (dist(b.x, b.y, alien.x, alien.y) < alien.r + b.r) {
          alien.dead = true;
          b.dead = true;
          game.kills++;
        }
      }
    }
    game.aliens = game.aliens.filter(a => !a.dead);
    game.bullets = game.bullets.filter(b => !b.dead);

    // enemy bullets
    for (const b of game.enemyBullets) b.update(dt);
    game.enemyBullets = game.enemyBullets.filter(b => !b.dead);
    for (const b of game.enemyBullets) {
      if (b.dead) continue;
      if (dist(b.x, b.y, player.x, player.y) < player.r + b.r) {
        b.dead = true;
        player.hypnosis = Math.min(100, player.hypnosis + 12);
        game.hitFlash = 0.2;
      }
    }
    game.enemyBullets = game.enemyBullets.filter(b => !b.dead);

    if (game.hitFlash > 0) game.hitFlash -= dt;

    aliensInfo.textContent = `אויבים: ${game.aliens.length}`;
    scoreInfo.textContent = `הריגות: ${game.kills}`;
    meterFill.style.width = player.hypnosis + '%';
    updateMusicIntensity(player.hypnosis);

    if (player.hypnosis >= 100) {
      endGame(false);
      return;
    }

    if (game.aliens.length === 0) {
      if (game.waveIndex < WAVES.length - 1) {
        game.waveIndex++;
        showWaveBreak(game.waveIndex);
      } else {
        endGame(true);
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    for (const ob of game.obstacles) ob.draw();
    for (const alien of game.aliens) alien.draw();
    for (const b of game.bullets) b.draw();
    for (const b of game.enemyBullets) b.draw();
    if (game.player) {
      const p = game.player;
      const inv = isInvisible();
      if (inv) ctx.globalAlpha = 0.3 + 0.1 * Math.sin(performance.now() / 150);
      p.draw();
      ctx.globalAlpha = 1;

      // power ring
      const ringR = p.r * 2.1;
      const full = game.power.charge >= POWER_CHARGE_TIME;
      const frac = inv ? game.power.active / POWER_DURATION
                       : game.power.charge / POWER_CHARGE_TIME;
      ctx.save();
      ctx.lineWidth = 3;
      // empty ring outline
      ctx.strokeStyle = 'rgba(70,140,255,0.25)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
      // filled part
      ctx.strokeStyle = inv ? '#9fd4ff' : '#3a8bff';
      if (full || inv) {
        ctx.shadowColor = '#4aa0ff';
        ctx.shadowBlur = full ? 10 + 6 * Math.sin(performance.now() / 120) : 8;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.restore();

      if (full && !inv && game.state === 'playing') {
        ctx.fillStyle = '#9fd4ff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('לחץ רווח!', p.x, p.y - ringR - 6);
      }
    }

    // hit flash
    if (game.hitFlash > 0) {
      ctx.fillStyle = `rgba(180, 50, 255, ${game.hitFlash * 1.2})`;
      ctx.fillRect(0, 0, W, H);
    }

    // crosshair
    if (game.state === 'playing') {
      const mx = game.mouse.x, my = game.mouse.y;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx - 10, my); ctx.lineTo(mx + 10, my);
      ctx.moveTo(mx, my - 10); ctx.lineTo(mx, my + 10);
      ctx.stroke();
    }
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - game.lastTime) / 1000 || 0);
    game.lastTime = t;

    if (game.state === 'playing') {
      update(dt);
    }
    render();
    requestAnimationFrame(loop);
  }

  // ---------- secret codes ----------
  // type during play (works with any keyboard language — uses physical keys)
  //   SKIP  → jump to the next wave
  //   CROWN → jump to the next crown wave (5, 10, 15 ...)
  const SECRET_CODES = {
    SKIP: () => game.waveIndex + 1,
    CROWN: () => {
      let i = game.waveIndex + 1;
      while ((i + 1) % 5 !== 0) i++;
      return i;
    },
  };
  let codeBuffer = '';
  function handleSecretCode(e) {
    if (game.state !== 'playing' || !e.code.startsWith('Key')) return;
    codeBuffer = (codeBuffer + e.code.slice(3)).slice(-10);
    for (const [code, target] of Object.entries(SECRET_CODES)) {
      if (codeBuffer.endsWith(code)) {
        codeBuffer = '';
        const idx = Math.min(target(), WAVES.length - 1);
        game.aliens = [];
        game.waveIndex = idx;
        showWaveBreak(idx);
        return;
      }
    }
  }

  // ---------- input ----------
  window.addEventListener('keydown', (e) => {
    handleSecretCode(e);
    if (e.key === ' ') {
      e.preventDefault();
      if (game.state === 'playing' && !e.repeat &&
          game.power.active <= 0 && game.power.charge >= POWER_CHARGE_TIME) {
        game.power.active = POWER_DURATION;
        game.power.charge = 0;
        game.spaceHeld = true; // this press activates, doesn't shoot
        return;
      }
      if (game.spaceHeld) return;
    }
    game.keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === ' ') game.spaceHeld = false;
    game.keys.delete(e.key.toLowerCase());
  });

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    game.mouse.x = (e.clientX - rect.left) * (W / rect.width);
    game.mouse.y = (e.clientY - rect.top) * (H / rect.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    game.mouse.down = true;
  });
  window.addEventListener('mouseup', () => { game.mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.setAttribute('tabindex', '0');

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', retryWave);
  winRestartBtn.addEventListener('click', startGame);
  waveBtn.addEventListener('click', continueWave);

  requestAnimationFrame(loop);
})();
