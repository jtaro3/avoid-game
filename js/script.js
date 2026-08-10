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

let px = 190, py = 190;

const enemies = [];
const MAX_ENEMIES = 20;
const MAX_FUSION = 5;
let fusionCount = 0;

let baseSpeed = 1.4;
let speedRate = 1;
let slowUntil = 0;
let invincibleUntil = 0;

const TIME_LIMIT = 50;

function resetGame() {
  enemies.forEach(e => game.removeChild(e.el));
  enemies.length = 0;

  score = 1;
  fusionCount = 0;
  alive = false;
  started = false;
  gameFinished = false;
  startTime = 0;
  speedRate = 1;
  slowUntil = 0;
  invincibleUntil = 0;

  px = 190;
  py = 190;
  player.style.left = px + "px";
  player.style.top = py + "px";

  placeItem(item);
  placeItem(slowItem);

  scoreEl.textContent = "残り：50 秒 / スコア：1 / 最高：" + maxScore + " / 敵：0";
  startBtn.textContent = "開始";
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

  const r = game.getBoundingClientRect();
  const t = e.touches[0];

  movePlayer(
    t.clientX - r.left,
    t.clientY - r.top
  );
}, { passive: false });

game.addEventListener("touchmove", e => {
  if (!alive) return;

  e.preventDefault();

  const r = game.getBoundingClientRect();
  const t = e.touches[0];

  movePlayer(
    t.clientX - r.left,
    t.clientY - r.top
  );
}, { passive: false });

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

  addEnemy(20);

  loop();
};

function getEnemySpawnPoint(size) {
  const max = 400 - size;
  const corners = [
    { x: 0, y: 0 },
    { x: max, y: 0 },
    { x: 0, y: max },
    { x: max, y: max }
  ];

  return corners[Math.floor(Math.random() * corners.length)];
}

function addEnemy(size, x, y) {
  if (enemies.length >= MAX_ENEMIES) return;

  if (x === undefined || y === undefined) {
    const spawnPoint = getEnemySpawnPoint(size);
    x = spawnPoint.x;
    y = spawnPoint.y;
  }

  const el = document.createElement("div");
  el.className = "enemy";
  el.style.width = size + "px";
  el.style.height = size + "px";

  game.appendChild(el);

  enemies.push({
    el,
    x,
    y,
    size
  });
}

function placeItem(el) {
  el.style.left = Math.random() * 360 + "px";
  el.style.top = Math.random() * 360 + "px";
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

          addEnemy(newSize, nx, ny);

          merged = true;
          break;
        }
      }

      if (merged) break;
    }
  }
}

function gameOver(msg) {

  alive = false;
  started = false;
  gameFinished = true;

  if (score > maxScore) {
    maxScore = score;
  }

  alert(msg + "\nスコア：" + score + "\n最高：" + maxScore);

  startBtn.textContent = "再プレイ";
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

    addEnemy(20);

    invincibleUntil = Date.now() + 1000;

    placeItem(item);
  }

  if (rectHit(player.getBoundingClientRect(), slowItem.getBoundingClientRect())) {

    score -= 5;

    speedRate = 0.5;

    slowUntil = Date.now() + 3000;

    placeItem(slowItem);
  }

  if (score <= 0) {
    gameOver("スコアが0になった！");
    return;
  }

  scoreEl.textContent =
    "残り：" + remain +
    " 秒 / スコア：" + score +
    " / 最高：" + maxScore +
    " / 敵：" + enemies.length;

  requestAnimationFrame(loop);
}

resetGame();

function movePlayer(x, y) {

  const offsetY = ('ontouchstart' in window) ? 90 : 0;

  px = Math.max(0, Math.min(380, x - 10));
  py = Math.max(0, Math.min(380, y - 10 - offsetY));

  player.style.left = px + "px";
  player.style.top = py + "px";
}
