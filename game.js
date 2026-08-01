(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
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

    // big friendly eyes (white sclera)
    const eyeSpread = r * 0.4;
    const eyeY = -r * 0.2;
    const eyeRx = r * 0.35;
    const eyeRy = r * 0.42;
    ctx.fillStyle = '#eeffee';
    ctx.beginPath();
    ctx.ellipse(-eyeSpread, eyeY, eyeRx, eyeRy, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#228844';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(eyeSpread, eyeY, eyeRx, eyeRy, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // pupils — swirl when hypnotizing
    const t = performance.now() / 400;
    const pupilR = r * 0.16;
    if (seesPlayer) {
      // blue pupils, fixed position
      ctx.fillStyle = '#3366ff';
      ctx.beginPath();
      ctx.arc(-eyeSpread, eyeY, pupilR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeSpread, eyeY, pupilR, 0, Math.PI * 2);
      ctx.fill();
      // blue glow
      ctx.fillStyle = 'rgba(50,100,255,0.25)';
      ctx.beginPath();
      ctx.arc(-eyeSpread, eyeY, pupilR * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeSpread, eyeY, pupilR * 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // normal friendly dark pupils
      ctx.fillStyle = '#113322';
      ctx.beginPath();
      ctx.arc(-eyeSpread, eyeY, pupilR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeSpread, eyeY, pupilR, 0, Math.PI * 2);
      ctx.fill();
      // cute eye shine
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(-eyeSpread - 2, eyeY - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeSpread - 2, eyeY - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // friendly smile
    ctx.strokeStyle = '#226644';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, r * 0.35, r * 0.3, 0.2, Math.PI - 0.2);
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

    // legs with walk animation
    const legSwing = walking ? Math.sin(performance.now() / 100) * 8 : 0;
    ctx.strokeStyle = '#3366aa';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5, r * 0.5);
    ctx.lineTo(-8 + legSwing, r * 1.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, r * 0.5);
    ctx.lineTo(8 - legSwing, r * 1.3);
    ctx.stroke();
    // shoes
    ctx.fillStyle = '#553322';
    ctx.beginPath();
    ctx.ellipse(-8 + legSwing, r * 1.3 + 2, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8 - legSwing, r * 1.3 + 2, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // body (torso)
    ctx.fillStyle = '#4488cc';
    ctx.beginPath();
    ctx.roundRect(-r * 0.6, -r * 0.3, r * 1.2, r * 1.0, 4);
    ctx.fill();
    ctx.strokeStyle = '#2266aa';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // head
    ctx.fillStyle = '#ffcc88';
    ctx.beginPath();
    ctx.arc(0, -r * 0.65, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cc9955';
    ctx.lineWidth = 1;
    ctx.stroke();

    // eyes (look toward mouse)
    const eyeOffX = Math.cos(angle) * 2;
    const eyeOffY = Math.sin(angle) * 2;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-4, -r * 0.7, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -r * 0.7, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-4 + eyeOffX, -r * 0.7 + eyeOffY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4 + eyeOffX, -r * 0.7 + eyeOffY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // gun arm pointing toward mouse
    ctx.rotate(angle);
    ctx.fillStyle = '#777';
    ctx.fillRect(r * 0.3, -2.5, r * 1.8, 5);
    ctx.fillStyle = '#ffcc88';
    ctx.beginPath();
    ctx.arc(r * 0.3, 0, 4, 0, Math.PI * 2);
    ctx.fill();

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
      let sees = d <= this.visionRange;
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
  const WAVES = [
    { count: 2, speed: 22, visionRange: 130, visionHalfAngle: 0.35, hypRate: 10 },
    { count: 2, speed: 25, visionRange: 140, visionHalfAngle: 0.37, hypRate: 12 },
    { count: 3, speed: 28, visionRange: 150, visionHalfAngle: 0.39, hypRate: 14 },
    { count: 3, speed: 31, visionRange: 160, visionHalfAngle: 0.41, hypRate: 16 },
    { count: 3, speed: 34, visionRange: 170, visionHalfAngle: 0.43, hypRate: 18 },
    { count: 4, speed: 37, visionRange: 180, visionHalfAngle: 0.45, hypRate: 20 },
    { count: 4, speed: 40, visionRange: 190, visionHalfAngle: 0.47, hypRate: 22 },
    { count: 5, speed: 44, visionRange: 200, visionHalfAngle: 0.49, hypRate: 24 },
    { count: 5, speed: 48, visionRange: 210, visionHalfAngle: 0.51, hypRate: 26 },
    { count: 6, speed: 52, visionRange: 220, visionHalfAngle: 0.53, hypRate: 28 },
  ];

  const HYPNOSIS_DECAY = 15;

  const game = {
    state: 'start',
    player: null,
    aliens: [],
    bullets: [],
    obstacles: [],
    waveIndex: 0,
    kills: 0,
    keys: new Set(),
    mouse: { x: W / 2, y: H / 2, down: false },
    lastTime: 0,
  };

  function buildObstacles() {
    return [
      new Obstacle(150, 120, 120, 30),
      new Obstacle(630, 120, 120, 30),
      new Obstacle(150, 450, 120, 30),
      new Obstacle(630, 450, 120, 30),
      new Obstacle(380, 180, 100, 30),
      new Obstacle(420, 400, 100, 30),
      new Obstacle(60, 260, 30, 80),
      new Obstacle(810, 260, 30, 80),
    ];
  }

  function spawnWave(idx) {
    const cfg = WAVES[idx];
    game.aliens = [];
    for (let i = 0; i < cfg.count; i++) {
      let x, y;
      do {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { x = Math.random() * W; y = 20; }
        else if (edge === 1) { x = Math.random() * W; y = H - 20; }
        else if (edge === 2) { x = 20; y = Math.random() * H; }
        else { x = W - 20; y = Math.random() * H; }
      } while (dist(x, y, game.player.x, game.player.y) < 150);
      game.aliens.push(new Alien(x, y, cfg));
    }
    waveInfo.textContent = `Wave ${idx + 1} / ${WAVES.length}`;
  }

  function resetGame() {
    game.player = new Player();
    game.obstacles = buildObstacles();
    game.bullets = [];
    game.waveIndex = 0;
    game.kills = 0;
    scoreInfo.textContent = 'Kills: 0';
    spawnWave(0);
  }

  function startGame() {
    resetGame();
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
    game.player.hypnosis = Math.max(0, game.player.hypnosis - 30);
    waveTitle.textContent = `WAVE ${idx + 1}`;
    waveSubtitle.textContent = `${WAVES[idx].count} aliens incoming — Kills: ${game.kills}`;
    waveScreen.classList.remove('hidden');
  }

  function continueWave() {
    spawnWave(game.waveIndex);
    waveScreen.classList.add('hidden');
    game.state = 'playing';
    canvas.focus();
  }

  function endGame(win) {
    game.state = win ? 'win' : 'gameover';
    stopMusic();
    if (win) {
      winScore.textContent = `Kills: ${game.kills}`;
      winScreen.classList.remove('hidden');
    } else {
      gameoverScore.textContent = `Kills: ${game.kills} — Wave ${game.waveIndex + 1}`;
      gameoverScreen.classList.remove('hidden');
    }
  }

  function update(dt) {
    const player = game.player;
    player.update(dt, game.keys, game.mouse);

    let anySees = false;
    for (const alien of game.aliens) {
      alien.update(dt, player);
      if (alien.seesPlayer) anySees = true;
    }
    if (!anySees) {
      player.hypnosis = Math.max(0, player.hypnosis - HYPNOSIS_DECAY * dt);
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

    aliensInfo.textContent = `Aliens: ${game.aliens.length}`;
    scoreInfo.textContent = `Kills: ${game.kills}`;
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
    if (game.player) game.player.draw();

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

  // ---------- input ----------
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') e.preventDefault();
    game.keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => game.keys.delete(e.key.toLowerCase()));

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
  restartBtn.addEventListener('click', startGame);
  winRestartBtn.addEventListener('click', startGame);
  waveBtn.addEventListener('click', continueWave);

  requestAnimationFrame(loop);
})();
