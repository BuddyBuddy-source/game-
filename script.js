(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const startScreen = document.getElementById('startScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const finalScore = document.getElementById('finalScore');
  const finalCoins = document.getElementById('finalCoins');
  const pauseBtn = document.getElementById('pauseBtn');
  const pauseLabel = document.getElementById('pauseLabel');

  const W = canvas.width, H = canvas.height;
  let running = false, paused = false, gameOver = false;
  let lastTime = 0, elapsed = 0, distance = 0, score = 0, coins = 0;
  let speed = 245, spawnTimer = 0, coinTimer = 0, roadOffset = 0;
  let obstacles = [], pickups = [];
  const player = { lane: 1, x: 0, jump: 0, jumpV: 0, slide: 0, invuln: 0 };
  const laneX = [W * 0.31, W * 0.5, W * 0.69];

  function resetGame() {
    running = true; paused = false; gameOver = false;
    elapsed = 0; distance = 0; score = 0; coins = 0; speed = 245;
    spawnTimer = 0.8; coinTimer = 0.4; roadOffset = 0;
    obstacles = []; pickups = [];
    player.lane = 1; player.x = laneX[1]; player.jump = 0;
    player.jumpV = 0; player.slide = 0; player.invuln = 0;
    scoreEl.textContent = '000000'; coinsEl.textContent = '0';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseLabel.classList.add('hidden');
    pauseBtn.textContent = 'Ⅱ';
    lastTime = performance.now();
  }

  function endGame() {
    running = false; gameOver = true;
    finalScore.textContent = Math.floor(score).toLocaleString();
    finalCoins.textContent = coins;
    gameOverScreen.classList.remove('hidden');
  }

  function laneMove(dir) {
    if (!running || paused) return;
    player.lane = Math.max(0, Math.min(2, player.lane + dir));
  }
  function jump() {
    if (!running || paused || player.jump > 0 || player.slide > 0) return;
    player.jumpV = 620;
  }
  function slide() {
    if (!running || paused || player.jump > 0) return;
    player.slide = 0.62;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Spacebar'].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') laneMove(-1);
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') laneMove(1);
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') jump();
    if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') slide();
    if ((e.key === 'Escape' || e.key.toLowerCase() === 'p') && running) togglePause();
  }, { passive: false });

  let touchStart = null;
  canvas.addEventListener('pointerdown', e => {
    touchStart = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', e => {
    if (!touchStart || !running || paused) { touchStart = null; return; }
    const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) {
      if (e.clientX < window.innerWidth / 2) laneMove(-1); else laneMove(1);
    } else if (Math.abs(dx) > Math.abs(dy)) laneMove(dx < 0 ? -1 : 1);
    else if (dy < 0) jump(); else slide();
    touchStart = null;
  });

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseLabel.classList.toggle('hidden', !paused);
    pauseBtn.textContent = paused ? '▶' : 'Ⅱ';
    if (!paused) lastTime = performance.now();
  }
  document.getElementById('startBtn').addEventListener('click', resetGame);
  document.getElementById('restartBtn').addEventListener('click', resetGame);
  pauseBtn.addEventListener('click', togglePause);

  function roundedRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function drawBackground(dt) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#59c9f6'); sky.addColorStop(.47, '#c4f0ff'); sky.addColorStop(1, '#f5c48d');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Distant city skyline
    ctx.fillStyle = '#85b9d4';
    for (let i = 0; i < 13; i++) {
      const x = i * 78 - 12;
      const h = 70 + (i * 37 % 90);
      ctx.fillRect(x, 190 - h, 55, h + 120);
      ctx.fillStyle = '#bde5f1';
      for (let wy = 205 - h; wy < 285; wy += 22) {
        for (let wx = x + 9; wx < x + 48; wx += 17) ctx.fillRect(wx, wy, 7, 10);
      }
      ctx.fillStyle = '#85b9d4';
    }

    // Sun and clouds
    ctx.fillStyle = 'rgba(255,245,185,.85)';
    ctx.beginPath(); ctx.arc(740, 86, 38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    [[150,92,36],[180,82,46],[214,96,30],[630,130,32],[660,120,42],[695,137,25]].forEach(([x,y,r]) => {
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    });

    // Side walls / sidewalks
    ctx.fillStyle = '#e9b879';
    ctx.beginPath(); ctx.moveTo(0, 315); ctx.lineTo(245, 285); ctx.lineTo(245, H); ctx.lineTo(0,H); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, 315); ctx.lineTo(655, 285); ctx.lineTo(655,H); ctx.lineTo(W,H); ctx.fill();
    ctx.fillStyle = '#f5d39b';
    ctx.beginPath(); ctx.moveTo(0, 332); ctx.lineTo(260, 295); ctx.lineTo(260,H); ctx.lineTo(0,H); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, 332); ctx.lineTo(640, 295); ctx.lineTo(640,H); ctx.lineTo(W,H); ctx.fill();

    // Palm-like silhouettes
    for (let i = 0; i < 6; i++) {
      const x = i * 175 - 20;
      const y = 250 + (i % 2) * 20;
      ctx.strokeStyle = '#4c9868'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(x, y + 80); ctx.lineTo(x + 8, y - 15); ctx.stroke();
      ctx.fillStyle = '#2caa78';
      for (let a = 0; a < 6; a++) {
        const ang = a * Math.PI / 3;
        ctx.beginPath(); ctx.ellipse(x + 8 + Math.cos(ang)*28, y - 18 + Math.sin(ang)*14, 29, 8, ang, 0, Math.PI*2); ctx.fill();
      }
    }

    // Perspective railway bed
    ctx.fillStyle = '#b77b53';
    ctx.beginPath(); ctx.moveTo(330, 250); ctx.lineTo(570, 250); ctx.lineTo(850,H); ctx.lineTo(50,H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#875b43';
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(50,H); ctx.lineTo(330,250); ctx.lineTo(290,250); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(850,H); ctx.lineTo(W,H); ctx.lineTo(610,250); ctx.lineTo(570,250); ctx.closePath(); ctx.fill();

    // Sleepers move toward player
    const off = roadOffset % 48;
    for (let i = -1; i < 12; i++) {
      const t = (i * 48 + off) / (H - 250);
      const y = 250 + i * 48 + off;
      if (y < 250 || y > H + 10) continue;
      const spread = (y - 250) * .46;
      ctx.fillStyle = '#654534';
      ctx.fillRect(450 - spread, y, spread * 2, Math.max(4, 5 + (y - 250) * .035));
    }

    // Three lanes, rails
    for (let lane = 0; lane < 3; lane++) {
      const topX = 370 + lane * 80;
      const bottomX = 150 + lane * 300;
      const topX2 = topX + 30;
      const bottomX2 = bottomX + 30;
      ctx.strokeStyle = '#4b5367'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(topX,250); ctx.lineTo(bottomX,H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(topX2,250); ctx.lineTo(bottomX2,H); ctx.stroke();
      ctx.strokeStyle = '#d6dbe6'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(topX,250); ctx.lineTo(bottomX,H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(topX2,250); ctx.lineTo(bottomX2,H); ctx.stroke();
    }

    // Railside sign
    roundedRect(25, 270, 110, 65, 8, '#0d77ba', '#e8f7ff');
    ctx.fillStyle = '#fff'; ctx.font = '900 16px Nunito, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('RUN FAST!', 80, 298);
    ctx.font = '900 10px Nunito, sans-serif'; ctx.fillText('WATCH THE TRACK', 80, 317);
  }

  function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const type = Math.random() < .52 ? 'barrier' : 'train';
    obstacles.push({ lane, y: 235, type, checked: false });
  }
  function spawnCoins() {
    const lane = Math.floor(Math.random() * 3);
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) pickups.push({ lane, y: 210 - i * 45, got: false });
  }

  function projectY(y) { return y; }
  function objectX(lane, y) {
    const p = Math.max(0, Math.min(1, (y - 250) / (H - 250)));
    const center = W / 2 + (lane - 1) * (40 + p * 120);
    return center;
  }
  function drawObstacle(o) {
    const y = projectY(o.y), p = Math.max(.2, (y - 220) / 380);
    const x = objectX(o.lane, y), w = o.type === 'train' ? 92*p + 20 : 74*p + 16;
    const h = o.type === 'train' ? 145*p + 22 : 50*p + 12;
    if (o.type === 'train') {
      roundedRect(x-w/2, y-h, w, h, 8*p+2, '#e7474e', '#8c2436');
      roundedRect(x-w*.34, y-h*.83, w*.68, h*.33, 4*p+2, '#85e4ff', '#efffff');
      ctx.fillStyle = '#ffe26c'; ctx.fillRect(x-w*.42, y-h*.39, w*.84, 5*p+2);
      ctx.fillStyle = '#292f48'; ctx.fillRect(x-w*.42, y-5*p, w*.84, 9*p+2);
      ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.max(8, 10*p)}px Nunito`;
      ctx.textAlign = 'center'; ctx.fillText('TRAIN', x, y-h*.5);
    } else {
      ctx.fillStyle = '#3b3f53'; ctx.fillRect(x-w*.52, y-h*.12, w*1.04, h*.2);
      ctx.fillStyle = '#ffcf3e'; ctx.fillRect(x-w/2, y-h*.85, w, h*.72);
      ctx.fillStyle = '#e84c4f';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x-w/2+i*w/4, y-h*.85);
        ctx.lineTo(x-w/2+(i+1)*w/4, y-h*.85);
        ctx.lineTo(x-w/2+(i+.5)*w/4, y-h*.13);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = '#fff1bf'; ctx.lineWidth = Math.max(2, 3*p);
      ctx.strokeRect(x-w/2, y-h*.85, w, h*.72);
    }
  }

  function drawCoin(c) {
    const p = Math.max(.15, (c.y - 220) / 380), x = objectX(c.lane, c.y);
    const r = 11 + p * 11;
    ctx.save(); ctx.translate(x, c.y);
    ctx.fillStyle = '#ffab12'; ctx.beginPath(); ctx.arc(0,0,r+3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffe65b'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#d77b0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0,0,r-4,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#db8a05'; ctx.font = `900 ${r}px Nunito`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$',0,1);
    ctx.restore();
  }

  function drawPlayer() {
    const groundY = 520;
    const targetX = laneX[player.lane];
    player.x += (targetX - player.x) * .22;
    const x = player.x, y = groundY - player.jump;
    const sliding = player.slide > 0;
    const scale = sliding ? .72 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);

    // Shadow
    ctx.fillStyle = 'rgba(34,40,54,.25)';
    ctx.beginPath(); ctx.ellipse(0, 4 + player.jump*.08, 30 - player.jump*.025, 8, 0, 0, Math.PI*2); ctx.fill();

    // Legs
    ctx.strokeStyle = '#164b8d'; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7,-35); ctx.lineTo(-17,-8); ctx.lineTo(-12,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8,-34); ctx.lineTo(17,-17); ctx.lineTo(21,-5); ctx.stroke();
    roundedRect(-26,-7,22,10,4,'#f4f6fa','#303d58');
    roundedRect(11,-7,22,10,4,'#f4f6fa','#303d58');

    // Body and arms
    roundedRect(-20,-78,40,49,12,'#e8f2ff','#4c7095');
    ctx.fillStyle = '#ffd1a3'; ctx.beginPath(); ctx.arc(-23,-54,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffd1a3'; ctx.beginPath(); ctx.arc(23,-54,7,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#e8f2ff'; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(-17,-69); ctx.lineTo(-25,-50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(17,-69); ctx.lineTo(25,-51); ctx.stroke();

    // Backpack
    roundedRect(-16,-73,32,34,7,'#ed5a36','#9a382a');
    roundedRect(-11,-66,22,16,4,'#ffd43b');
    ctx.fillStyle = '#175c9c'; ctx.font = '900 8px Nunito'; ctx.textAlign = 'center'; ctx.fillText('RUN',0,-55);

    // Head and cap
    ctx.fillStyle = '#ffd1a3'; ctx.beginPath(); ctx.arc(0,-91,17,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#392a28'; ctx.beginPath(); ctx.arc(0,-98,16,Math.PI,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ed4548'; ctx.beginPath(); ctx.ellipse(0,-105,19,7,0,Math.PI,Math.PI*2); ctx.fill();
    ctx.fillRect(0,-107,21,5);
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(6,-91,2,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function update(dt) {
    elapsed += dt; distance += speed * dt; score += dt * 12;
    speed = Math.min(430, 245 + elapsed * 3.5);
    roadOffset += speed * dt * .58;
    player.jump = Math.max(0, player.jump + player.jumpV * dt);
    if (player.jump > 0) player.jumpV -= 1450 * dt;
    if (player.jump <= 0) { player.jump = 0; player.jumpV = 0; }
    player.slide = Math.max(0, player.slide - dt);
    player.invuln = Math.max(0, player.invuln - dt);

    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = Math.max(.68, 1.35 - elapsed*.006) + Math.random()*.42; }
    coinTimer -= dt;
    if (coinTimer <= 0) { spawnCoins(); coinTimer = 1.5 + Math.random()*1.2; }

    const playerY = 520;
    obstacles.forEach(o => {
      o.y += speed * dt;
      if (!o.checked && o.y > playerY - 38 && o.y < playerY + 12 && o.lane === player.lane) {
        o.checked = true;
        const avoided = o.type === 'barrier' ? player.jump > 35 : player.slide > 0;
        if (!avoided && player.invuln <= 0) endGame();
      }
    });
    pickups.forEach(c => {
      c.y += speed * dt;
      if (!c.got && c.lane === player.lane && Math.abs(c.y - (playerY - player.jump)) < 34) {
        c.got = true; coins++; score += 50;
        coinsEl.textContent = coins;
      }
    });
    obstacles = obstacles.filter(o => o.y < H + 170);
    pickups = pickups.filter(c => c.y < H + 30 && !c.got);
    scoreEl.textContent = String(Math.floor(score)).padStart(6,'0');
  }

  function render(dt) {
    drawBackground(dt);
    // Objects behind runner
    pickups.slice().sort((a,b) => a.y-b.y).forEach(drawCoin);
    obstacles.slice().sort((a,b) => a.y-b.y).forEach(drawObstacle);
    drawPlayer();
    // Tiny speed streaks at the edges for movement
    if (running && !paused) {
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2;
      for (let i=0;i<5;i++) {
        const y = (roadOffset*1.7 + i*117) % H;
        ctx.beginPath(); ctx.moveTo(35,y); ctx.lineTo(55,y+22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W-35,y+12); ctx.lineTo(W-55,y+34); ctx.stroke();
      }
    }
  }

  function loop(now) {
    const dt = Math.min((now - (lastTime || now)) / 1000, .035);
    lastTime = now;
    if (running && !paused) update(dt);
    render(dt);
    requestAnimationFrame(loop);
  }

  // Initial scene and animation
  player.x = laneX[1];
  drawBackground(0);
  drawPlayer();
  requestAnimationFrame(loop);
})();