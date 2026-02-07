const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const waveEl = document.getElementById("wave");
const livesEl = document.getElementById("lives");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const restartButton = document.getElementById("restart");

const state = {
  keys: new Set(),
  running: false,
  paused: false,
  wave: 1,
  score: 0,
  lives: 3,
  cooldown: 0,
  player: {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 56,
    height: 20,
    speed: 6,
  },
  bullets: [],
  enemies: [],
  enemyDirection: 1,
  enemySpeed: 1,
  enemyDrop: 16,
  starfield: [],
};

const settings = {
  enemyRows: 4,
  enemyCols: 10,
  enemySpacing: 56,
  enemyGap: 16,
  bulletSpeed: 8,
  enemyBulletSpeed: 4,
  maxEnemyBullets: 3,
};

const colors = {
  player: "#7ff1ff",
  enemy: "#ff7cc7",
  enemyAlt: "#ffc857",
  bullet: "#c9f4ff",
  enemyBullet: "#ff9671",
};

function initStars() {
  state.starfield = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.6 + 0.4,
    speed: Math.random() * 0.6 + 0.2,
  }));
}

function spawnWave() {
  state.enemies = [];
  const offsetX =
    (canvas.width -
      settings.enemyCols * settings.enemySpacing +
      settings.enemyGap) /
    2;
  for (let row = 0; row < settings.enemyRows; row += 1) {
    for (let col = 0; col < settings.enemyCols; col += 1) {
      state.enemies.push({
        x: offsetX + col * settings.enemySpacing,
        y: 80 + row * 50,
        width: 36,
        height: 24,
        alive: true,
        row,
      });
    }
  }
  state.enemyDirection = 1;
  state.enemySpeed = 1 + state.wave * 0.25;
}

function resetGame() {
  state.wave = 1;
  state.score = 0;
  state.lives = 3;
  state.bullets = [];
  state.cooldown = 0;
  state.running = false;
  state.paused = false;
  state.player.x = canvas.width / 2;
  spawnWave();
  updateHud();
  showOverlay("Ready", "Press Space to launch the next wave.");
}

function updateHud() {
  scoreEl.textContent = state.score;
  waveEl.textContent = state.wave;
  livesEl.textContent = state.lives;
}

function showOverlay(title, message) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlay.classList.add("visible");
}

function hideOverlay() {
  overlay.classList.remove("visible");
}

function fireBullet() {
  if (state.cooldown > 0) return;
  state.bullets.push({
    x: state.player.x,
    y: state.player.y - 14,
    width: 4,
    height: 12,
    velocity: -settings.bulletSpeed,
    owner: "player",
  });
  state.cooldown = 18;
}

function fireEnemyBullet() {
  if (state.enemies.length === 0) return;
  const aliveEnemies = state.enemies.filter((enemy) => enemy.alive);
  if (aliveEnemies.length === 0) return;
  const shooters = aliveEnemies.filter((enemy) => enemy.row === settings.enemyRows - 1);
  const shooter = shooters[Math.floor(Math.random() * shooters.length)] ||
    aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
  state.bullets.push({
    x: shooter.x,
    y: shooter.y + shooter.height,
    width: 4,
    height: 12,
    velocity: settings.enemyBulletSpeed,
    owner: "enemy",
  });
}

function movePlayer() {
  if (state.keys.has("ArrowLeft")) {
    state.player.x -= state.player.speed;
  }
  if (state.keys.has("ArrowRight")) {
    state.player.x += state.player.speed;
  }
  const min = state.player.width / 2 + 20;
  const max = canvas.width - state.player.width / 2 - 20;
  state.player.x = Math.max(min, Math.min(max, state.player.x));
}

function updateBullets() {
  state.bullets.forEach((bullet) => {
    bullet.y += bullet.velocity;
  });
  state.bullets = state.bullets.filter(
    (bullet) => bullet.y > -20 && bullet.y < canvas.height + 20
  );
}

function enemyBounds() {
  const alive = state.enemies.filter((enemy) => enemy.alive);
  if (alive.length === 0) return null;
  const xs = alive.map((enemy) => enemy.x);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  return { min, max };
}

function updateEnemies() {
  const bounds = enemyBounds();
  if (!bounds) return;
  const leftEdge = bounds.min - 24;
  const rightEdge = bounds.max + 24;
  if (rightEdge >= canvas.width - 24 && state.enemyDirection === 1) {
    state.enemyDirection = -1;
    state.enemies.forEach((enemy) => {
      enemy.y += state.enemyDrop;
    });
  } else if (leftEdge <= 24 && state.enemyDirection === -1) {
    state.enemyDirection = 1;
    state.enemies.forEach((enemy) => {
      enemy.y += state.enemyDrop;
    });
  }
  state.enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    enemy.x += state.enemyDirection * state.enemySpeed;
  });
}

function checkCollisions() {
  state.bullets.forEach((bullet) => {
    if (bullet.owner === "player") {
      state.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (
          bullet.x < enemy.x + enemy.width / 2 &&
          bullet.x > enemy.x - enemy.width / 2 &&
          bullet.y < enemy.y + enemy.height / 2 &&
          bullet.y > enemy.y - enemy.height / 2
        ) {
          enemy.alive = false;
          bullet.y = -40;
          state.score += 50;
        }
      });
    } else if (bullet.owner === "enemy") {
      if (
        bullet.x > state.player.x - state.player.width / 2 &&
        bullet.x < state.player.x + state.player.width / 2 &&
        bullet.y > state.player.y - state.player.height / 2 &&
        bullet.y < state.player.y + state.player.height / 2
      ) {
        bullet.y = canvas.height + 40;
        state.lives -= 1;
        if (state.lives <= 0) {
          state.running = false;
          showOverlay("Game Over", "Press Restart to try again.");
        }
      }
    }
  });

  const breached = state.enemies.some(
    (enemy) => enemy.alive && enemy.y + enemy.height / 2 > state.player.y - 20
  );
  if (breached) {
    state.lives = 0;
    state.running = false;
    showOverlay("Defense Breached", "Press Restart to regroup.");
  }
}

function updateStars() {
  state.starfield.forEach((star) => {
    star.y += star.speed;
    if (star.y > canvas.height) {
      star.y = -10;
      star.x = Math.random() * canvas.width;
    }
  });
}

function drawPlayer() {
  ctx.fillStyle = colors.player;
  ctx.beginPath();
  ctx.moveTo(state.player.x, state.player.y - 16);
  ctx.lineTo(state.player.x + 24, state.player.y + 14);
  ctx.lineTo(state.player.x - 24, state.player.y + 14);
  ctx.closePath();
  ctx.fill();
}

function drawEnemies() {
  state.enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    ctx.fillStyle = enemy.row % 2 === 0 ? colors.enemy : colors.enemyAlt;
    ctx.beginPath();
    drawRoundedRect(
      enemy.x - enemy.width / 2,
      enemy.y - enemy.height / 2,
      enemy.width,
      enemy.height,
      6
    );
    ctx.fill();
    ctx.fillStyle = "rgba(3, 10, 20, 0.45)";
    ctx.fillRect(
      enemy.x - enemy.width / 2 + 6,
      enemy.y - enemy.height / 2 + 6,
      enemy.width - 12,
      6
    );
  });
}

function drawBullets() {
  state.bullets.forEach((bullet) => {
    ctx.fillStyle =
      bullet.owner === "player" ? colors.bullet : colors.enemyBullet;
    ctx.fillRect(bullet.x - 2, bullet.y - 8, bullet.width, bullet.height);
  });
}

function drawStars() {
  ctx.fillStyle = "rgba(160, 190, 255, 0.9)";
  state.starfield.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGround() {
  ctx.strokeStyle = "rgba(94, 128, 230, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, state.player.y + 22);
  ctx.lineTo(canvas.width - 60, state.player.y + 22);
  ctx.stroke();
}

function drawRoundedRect(x, y, width, height, radius) {
  const corner = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + corner, y);
  ctx.arcTo(x + width, y, x + width, y + height, corner);
  ctx.arcTo(x + width, y + height, x, y + height, corner);
  ctx.arcTo(x, y + height, x, y, corner);
  ctx.arcTo(x, y, x + width, y, corner);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();
  drawGround();
  drawEnemies();
  drawPlayer();
  drawBullets();
}

function update() {
  if (!state.running || state.paused) return;
  movePlayer();
  updateBullets();
  updateEnemies();
  checkCollisions();
  updateStars();

  const aliveEnemies = state.enemies.filter((enemy) => enemy.alive);
  if (aliveEnemies.length === 0) {
    state.wave += 1;
    state.running = false;
    spawnWave();
    updateHud();
    showOverlay(
      `Wave ${state.wave}`,
      "Press Space to start the next wave."
    );
  }

  if (Math.random() < 0.02 + state.wave * 0.003) {
    const enemyBullets = state.bullets.filter((bullet) => bullet.owner === "enemy");
    if (enemyBullets.length < settings.maxEnemyBullets) {
      fireEnemyBullet();
    }
  }

  if (state.cooldown > 0) {
    state.cooldown -= 1;
  }

  updateHud();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

function startWave() {
  if (state.running) return;
  if (state.lives <= 0) return;
  hideOverlay();
  state.running = true;
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  if (state.paused) {
    showOverlay("Paused", "Press P to resume.");
  } else {
    hideOverlay();
  }
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === "Space") {
    if (!state.running) {
      startWave();
      return;
    }
    fireBullet();
  }
  if (event.code === "KeyP") {
    togglePause();
  }
  state.keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.code);
});

restartButton.addEventListener("click", () => {
  resetGame();
});

initStars();
resetGame();
loop();
