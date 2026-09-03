const game = document.getElementById("game");
const player = document.getElementById("player");
const item = document.getElementById("item");
const slowItem = document.getElementById("slow");
const scoreEl = document.getElementById("score");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const ruleBtn = document.getElementById("ruleBtn");
const ruleWindow = document.getElementById("ruleWindow");
const closeRule = document.getElementById("closeRule");

ruleBtn.onclick = () => {
    ruleWindow.style.display = "block";
    startBtn.disabled = true;
};

closeRule.onclick = () => {
    ruleWindow.style.display = "none";
    startBtn.disabled = started;
};

let alive = false;
let started = false;
let gameFinished = false;
let startTime = 0;

let score = 1;
let maxScore = 1;
let addedEnemyCount = 0;

let px = 190, py = 190;

const enemies = [];
const MAX_ENEMIES = 20;
const MAX_FUSION = 5;
let fusionCount = 0;

let baseSpeed = 0.85;
let speedRate = 1;
let slowUntil = 0;
let invincibleUntil = 0;

const TIME_LIMIT = 50;
let lastTouch = null;

function resetGame() {
  enemies.forEach(e => game.removeChild(e.el));
  enemies.length = 0;

  score = 1;
  addedEnemyCount = 0;
  fusionCount = 0;
  alive = false;
  started = false;
  gameFinished = false;
  startTime = 0;
  speedRate = 1;
  slowUntil = 0;
  invincibleUntil = 0;
  lastTouch = null;

  px = (game.clientWidth - player.offsetWidth) / 2;
  py = (game.clientHeight - player.offsetHeight) / 2;
  player.style.left = px + "px";
  player.style.top = py + "px";

  overlay.textContent = "";
  overlay.style.display = "none";
  placeItem(item, true);
  placeItem(slowItem, true);

  scoreEl.textContent = "残り：50 秒 / スコア：1 / 最高：" + maxScore + " / 敵：0 / 増加敵：0";
  startBtn.textContent = "開始";
  startBtn.classList.remove("replay-mode");
}

game.addEventListener("mousemove", e => {
  if (!alive) return;

  const r = game.getBoundingClientRect();
  movePlayer(
    e.clientX - r.left,
    e.clientY - r.top
  );
});

game.addEventListener("touchstart", e => {
  if (!alive) return;

  e.preventDefault();

  const t = e.touches[0];
  lastTouch = { x: t.clientX, y: t.clientY };
}, { passive: false });

window.addEventListener("keydown", e => {
  if (!alive) return;
  const step = 18;
  const moves = {
    ArrowUp: [0, -step], w: [0, -step], W: [0, -step],
    ArrowDown: [0, step], s: [0, step], S: [0, step],
    ArrowLeft: [-step, 0], a: [-step, 0], A: [-step, 0],
    ArrowRight: [step, 0], d: [step, 0], D: [step, 0]
  };
  const move = moves[e.key];
  if (!move) return;
  e.preventDefault();
  movePlayer(px + 10 + move[0], py + 10 + move[1]);
});

game.addEventListener("touchmove", e => {
  if (!alive) return;

  e.preventDefault();

  const t = e.touches[0];
  if (!lastTouch) {
    lastTouch = { x: t.clientX, y: t.clientY };
    return;
  }

  const dx = (t.clientX - lastTouch.x) * 1.5;
  const dy = (t.clientY - lastTouch.y) * 1.5;
  movePlayer(px + 10 + dx, py + 10 + dy);
  lastTouch = { x: t.clientX, y: t.clientY };
}, { passive: false });

game.addEventListener("touchend", () => {
  lastTouch = null;
}, { passive: true });

startBtn.onclick = async () => {
  if (started) return;

  if (gameFinished) {
    resetGame();
  }

  ruleWindow.style.display = "none";

  started = true;
  overlay.style.display = "flex";

  for (let i = 3; i > 0; i--) {
    overlay.textContent = i;
    await new Promise(r => setTimeout(r, 1000));
  }

  overlay.textContent = "START";
  await new Promise(r => setTimeout(r, 500));

  overlay.style.display = "none";
  alive = true;
  startTime = Date.now();
  invincibleUntil = Date.now() + 2000;

  addEnemy(20);

  loop();
};

function getEnemySpawnPoint(size) {
  const max = game.clientWidth - size;
  const corners = [
    { x: 0, y: 0 },
    { x: max, y: 0 },
    { x: 0, y: max },
    { x: max, y: max }
  ];

  return corners[Math.floor(Math.random() * corners.length)];
}

function addEnemy(size, x, y, isMerged = false) {
  if (enemies.length >= MAX_ENEMIES) return;

  if (x === undefined || y === undefined) {
    const spawnPoint = getEnemySpawnPoint(size);
    x = spawnPoint.x;
    y = spawnPoint.y;
  }

  const el = document.createElement("div");
  el.className = "enemy";
  el.dataset.merged = String(isMerged);
  el.style.width = size + "px";
  el.style.height = size + "px";

  game.appendChild(el);

  enemies.push({
    el,
    x,
    y,
    size,
    isMerged
  });
}

function removeRandomUnmergedEnemy() {
  if (enemies.length <= 1) return;

  const candidates = enemies
    .map((enemy, index) => ({ enemy, index }))
    .filter(({ enemy }) => enemy.el.dataset.merged !== "true");

  if (candidates.length === 0) return;

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  game.removeChild(chosen.enemy.el);
  enemies.splice(chosen.index, 1);
}

function placeItem(el, keepAway = false) {
  const max = Math.max(0, game.clientWidth - el.offsetWidth);
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 30; tries++) {
    x = Math.random() * max;
    y = Math.random() * max;
    if (!keepAway || Math.hypot(x - px, y - py) > 80) break;
  }
  el.style.left = x + "px";
  el.style.top = y + "px";
}

function rectHit(a, b) {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  );
}

function checkFusion() {
  let merged = true;

  while (merged && fusionCount < MAX_FUSION) {
    merged = false;

    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {

        const a = enemies[i];
        const b = enemies[j];

        const d = Math.hypot(a.x - b.x, a.y - b.y);

        if (d < (a.size + b.size) / 2) {

          const nx = (a.x + b.x) / 2;
          const ny = (a.y + b.y) / 2;
          const newSize = a.size + b.size;

          game.removeChild(a.el);
          game.removeChild(b.el);

          enemies.splice(j, 1);
          enemies.splice(i, 1);

          fusionCount++;

          addEnemy(newSize, nx, ny, true);

          merged = true;
          break;
        }
      }

      if (merged) break;
    }
  }
}

function getTimeMultiplier(remain) {
  if (remain >= 45) return 1;
  return 1 + ((44 - remain) * 0.5 / 44);
}

function gameOver(msg) {

  if (gameFinished) return;

  alive = false;
  started = false;
  gameFinished = true;

  const remain = Math.max(0, Math.ceil(TIME_LIMIT - (Date.now() - startTime) / 1000));
  const multiplier = getTimeMultiplier(remain);
  const basicScore = score + addedEnemyCount;
  const finalScore = Math.floor(basicScore * multiplier);

  if (finalScore > maxScore) {
    maxScore = finalScore;
  }

  overlay.textContent = msg + "\n最終スコア：" + finalScore +
    "\n（基本：" + basicScore + " × " + multiplier.toFixed(2) + "倍）" +
    "\n最高：" + maxScore;
  overlay.style.whiteSpace = "pre-line";
  overlay.style.display = "flex";

  startBtn.textContent = "再プレイ";
  startBtn.classList.add("replay-mode");
  startBtn.disabled = false;
}

function loop() {

  if (!alive) return;

  const elapsed = (Date.now() - startTime) / 1000;
  const remain = Math.max(0, Math.ceil(TIME_LIMIT - elapsed));

  if (remain <= 0) {
    gameOver("時間切れ！");
    return;
  }

speedRate = Date.now() < slowUntil ? 0.5 : 1;

  enemies.forEach(en => {

    const dx = px - en.x;
    const dy = py - en.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    en.x += (dx / d) * baseSpeed * speedRate;
    en.y += (dy / d) * baseSpeed * speedRate;

    en.el.style.left = en.x + "px";
    en.el.style.top = en.y + "px";

    if (
      Date.now() > invincibleUntil &&
      rectHit(player.getBoundingClientRect(), en.el.getBoundingClientRect())
    ) {
      gameOver("捕まった！");
    }

  });

  checkFusion();

  if (rectHit(player.getBoundingClientRect(), item.getBoundingClientRect())) {

    score += 3;

    const enemyCountBefore = enemies.length;
    addEnemy(20);
    if (enemies.length > enemyCountBefore) {
      addedEnemyCount++;
    }

    invincibleUntil = Date.now() + 1000;

    placeItem(item, true);
  }

  if (rectHit(player.getBoundingClientRect(), slowItem.getBoundingClientRect())) {

    score = Math.max(0, score - 5);
    removeRandomUnmergedEnemy();

    speedRate = 0.5;

    slowUntil = Date.now() + 3000;

    placeItem(slowItem, true);
  }

  scoreEl.textContent =
    "残り：" + remain +
    " 秒 / スコア：" + score +
    " / 最高：" + maxScore +
    " / 敵：" + enemies.length +
    " / 増加敵：" + addedEnemyCount;

  requestAnimationFrame(loop);
}

resetGame();

function movePlayer(x, y) {
  const maxX = game.clientWidth - player.offsetWidth;
  const maxY = game.clientHeight - player.offsetHeight;
  px = Math.max(0, Math.min(maxX, x - player.offsetWidth / 2));
  py = Math.max(0, Math.min(maxY, y - player.offsetHeight / 2));

  player.style.left = px + "px";
  player.style.top = py + "px";
}
