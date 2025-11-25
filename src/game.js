// src/game.js
// Rogue-Lite Dungeon Crawler (Node.js + Blessed)
// Run: npm start

const blessed = require("blessed");
const { generateDungeon } = require("./dungeon");

// === CONFIG ===
const MAP_WIDTH = 40;
const MAP_HEIGHT = 18;
const INITIAL_ENEMY_COUNT = 6;

// === GAME STATE ===
const gameState = {
  level: 1,
  map: null,          // 2D tiles
  player: null,       // { x, y, hp, maxHp, attack, gold }
  enemies: [],        // array of entities
  log: [],
  flashCells: [],     // { x, y, type, timeoutId }
  gameOver: false,
  awaitingNextLevel: false,
};

// === BLESSED UI SETUP ===
const screen = blessed.screen({
  smartCSR: true,
  title: "Rogue Dungeon",
});

const mapBox = blessed.box({
  top: 0,
  left: 0,
  width: "70%",
  height: "100%-3",
  tags: true,
  border: { type: "line" },
  label: " Dungeon ",
});

const sideBox = blessed.box({
  top: 0,
  left: "70%",
  width: "30%",
  height: "100%-3",
  tags: true,
  border: { type: "line" },
  label: " Stats ",
});

const logBox = blessed.box({
  bottom: 0,
  left: 0,
  width: "100%",
  height: 3,
  tags: true,
  border: { type: "line" },
  label: " Log ",
});

screen.append(mapBox);
screen.append(sideBox);
screen.append(logBox);

// Exit keys
screen.key(["escape", "q", "C-c"], () => process.exit(0));

// Movement keys
const MOVE_KEYS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
  k: [0, -1],
  j: [0, 1],
  h: [-1, 0],
  l: [1, 0],
};

// === UTILITIES ===
function addLog(message, color = "white") {
  const colored = `{${color}-fg}${message}{/${color}-fg}`;
  gameState.log.push(colored);
  if (gameState.log.length > 10) gameState.log.shift();
}

function getTile(x, y) {
  if (!gameState.map) return "#";
  if (y < 0 || y >= gameState.map.length) return "#";
  if (x < 0 || x >= gameState.map[0].length) return "#";
  return gameState.map[y][x];
}

function setTile(x, y, value) {
  if (
    y >= 0 &&
    y < gameState.map.length &&
    x >= 0 &&
    x < gameState.map[0].length
  ) {
    gameState.map[y][x] = value;
  }
}

function entitiesAt(x, y) {
  const res = [];
  if (gameState.player && gameState.player.x === x && gameState.player.y === y) {
    res.push(gameState.player);
  }
  for (const e of gameState.enemies) {
    if (e.x === x && e.y === y) res.push(e);
  }
  return res;
}

function findEnemyAt(x, y) {
  return gameState.enemies.find((e) => e.x === x && e.y === y);
}

function isOccupied(x, y) {
  if (gameState.player && gameState.player.x === x && gameState.player.y === y) {
    return true;
  }
  return !!findEnemyAt(x, y);
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Collect all floor tiles and pick a random free one
function getRandomFloorPosition(excluded = []) {
  const exSet = new Set(excluded.map((e) => `${e.x},${e.y}`));
  const candidates = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (getTile(x, y) === ".") {
        const key = `${x},${y}`;
        if (!exSet.has(key)) {
          candidates.push({ x, y });
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// === FLASH / SIMPLE "ANIMATION" ===
function flashCell(x, y, type = "hit", duration = 120) {
  const id = setTimeout(() => {
    // remove from flash list
    gameState.flashCells = gameState.flashCells.filter((f) => f.timeoutId !== id);
    render();
  }, duration);

  gameState.flashCells.push({ x, y, type, timeoutId: id });
  render();
}

function getFlashTypeAt(x, y) {
  const f = gameState.flashCells.find((cell) => cell.x === x && cell.y === y);
  return f ? f.type : null;
}

// === INITIALIZATION ===
function createPlayer(start) {
  return {
    name: "You",
    x: start.x,
    y: start.y,
    hp: 20,
    maxHp: 20,
    attack: 5,
    gold: 0,
  };
}

function spawnEnemies(count) {
  gameState.enemies = [];
  for (let i = 0; i < count; i++) {
    const pos = getRandomFloorPosition([gameState.player, ...gameState.enemies]);
    if (!pos) break;
    const isElite = Math.random() < 0.25;
    gameState.enemies.push({
      name: isElite ? "Elite Goblin" : "Goblin",
      x: pos.x,
      y: pos.y,
      hp: isElite ? 10 : 6,
      maxHp: isElite ? 10 : 6,
      attack: isElite ? 4 : 2,
      char: isElite ? "G" : "g",
      color: isElite ? "red" : "yellow",
    });
  }
}

function initLevel(level) {
  const { tiles, playerStart } = generateDungeon(MAP_WIDTH, MAP_HEIGHT);
  gameState.map = tiles;
  gameState.player = createPlayer(playerStart);
  gameState.enemies = [];
  gameState.flashCells = [];
  gameState.awaitingNextLevel = false;
  gameState.level = level;
  addLog(`Entered dungeon level ${level}`, "cyan");
  spawnEnemies(INITIAL_ENEMY_COUNT + level - 1);
}

// === RENDERING ===
function renderMap() {
  let content = "";

  for (let y = 0; y < MAP_HEIGHT; y++) {
    let line = "";
    for (let x = 0; x < MAP_WIDTH; x++) {
      let ch = getTile(x, y) === "#" ? "#" : ".";
      let color = getTile(x, y) === "#" ? "grey" : "black";

      const flashType = getFlashTypeAt(x, y);

      const enemy = findEnemyAt(x, y);
      if (enemy) {
        ch = enemy.char;
        color = enemy.color;
        if (flashType === "hit") color = "magenta";
      } else if (
        gameState.player &&
        gameState.player.x === x &&
        gameState.player.y === y
      ) {
        ch = "@";
        color = flashType === "hit" ? "red" : "green";
      }

      // floor styling
      if (getTile(x, y) === ".") {
        if (!enemy && (!gameState.player || gameState.player.x !== x || gameState.player.y !== y)) {
          // faint dot for floor
          color = "grey";
          ch = ".";
        }
      }

      line += `{${color}-fg}${ch}{/${color}-fg}`;
    }
    content += line + "\n";
  }

  mapBox.setContent(content);
}

function renderStats() {
  const p = gameState.player;
  if (!p) return;
  const hpBarLength = 20;
  const hpRatio = p.hp / p.maxHp;
  const filled = Math.max(0, Math.floor(hpBarLength * hpRatio));
  const empty = hpBarLength - filled;

  const hpBar =
    `{green-fg}${"#".repeat(filled)}{/${hpRatio < 0.3 ? "green" : "green"}-fg}` +
    `{grey-fg}${"-".repeat(empty)}{/grey-fg}`;

  let enemiesInfo = "";
  for (const e of gameState.enemies.slice(0, 5)) {
    enemiesInfo += `{${e.color}-fg}${e.char}{/${e.color}-fg} ${e.name} (${e.hp}/${e.maxHp})\n`;
  }
  if (gameState.enemies.length > 5) {
    enemiesInfo += `{grey-fg}+ ${gameState.enemies.length - 5} more...{/grey-fg}\n`;
  }

  const content = [
    `{cyan-fg}Level:{/cyan-fg} ${gameState.level}`,
    "",
    `{white-fg}HP:{/white-fg}`,
    hpBar,
    "",
    `{white-fg}Attack:{/white-fg} ${p.attack}`,
    `{white-fg}Gold:{/white-fg} ${p.gold}`,
    "",
    `{white-fg}Enemies:{/white-fg}`,
    enemiesInfo || "{grey-fg}(none){/grey-fg}",
    "",
    "{white-fg}Controls:{/white-fg}",
    "Move: arrows / WASD / HJKL",
    "Next level: N (when clear)",
    "Quit: Q / Esc / Ctrl+C",
  ].join("\n");

  sideBox.setContent(content);
}

function renderLog() {
  const last = gameState.log.slice(-3).join("\n");
  logBox.setContent(last || "{grey-fg}The dungeon is quiet...{/grey-fg}");
}

function render() {
  renderMap();
  renderStats();
  renderLog();
  screen.render();
}

// === COMBAT & TURN LOGIC ===
function attack(attacker, defender, isPlayerAttacking) {
  const base = attacker.attack;
  const variance = Math.floor(Math.random() * 3); // 0–2
  const dmg = Math.max(1, base + variance - 1);

  defender.hp -= dmg;

  const attackerName = isPlayerAttacking ? "You" : defender === gameState.player ? attacker.name : attacker.name;
  const defenderName = defender === gameState.player ? "you" : defender.name.toLowerCase();

  addLog(`${attackerName} hit ${defenderName} for ${dmg} damage.`, isPlayerAttacking ? "green" : "red");

  if (defender === gameState.player) {
    flashCell(defender.x, defender.y, "hit");
  } else {
    flashCell(defender.x, defender.y, "hit");
  }

  if (defender.hp <= 0) {
    if (defender === gameState.player) {
      addLog("You died... 💀", "red");
      gameState.gameOver = true;
      gameOverScreen();
    } else {
      addLog(`${defender.name} died.`, "yellow");
      // small gold reward
      gameState.player.gold += Math.floor(Math.random() * 5) + 1;
      gameState.enemies = gameState.enemies.filter((e) => e !== defender);
    }
  }
}

function enemyTurn() {
  if (gameState.gameOver) return;

  for (const e of gameState.enemies) {
    if (gameState.gameOver) break;

    // If adjacent to player → attack
    const dist = manhattan(e, gameState.player);
    if (dist === 1) {
      attack(e, gameState.player, false);
      continue;
    }

    // Simple chase AI if close enough, else wander
    let target = null;
    if (dist <= 6) {
      target = gameState.player;
    }

    let dx = 0;
    let dy = 0;

    if (target) {
      if (target.x < e.x) dx = -1;
      else if (target.x > e.x) dx = 1;
      if (target.y < e.y) dy = -1;
      else if (target.y > e.y) dy = 1;

      // prioritize horizontal or vertical by random
      const tryDirs = Math.random() < 0.5 ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];

      let moved = false;
      for (const [mx, my] of tryDirs) {
        const nx = e.x + mx;
        const ny = e.y + my;
        if (getTile(nx, ny) === "." && !isOccupied(nx, ny)) {
          e.x = nx;
          e.y = ny;
          moved = true;
          break;
        }
      }

      if (!moved) {
        // no move
      }
    } else {
      // wander randomly
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      const [wx, wy] = dirs[Math.floor(Math.random() * dirs.length)];
      const nx = e.x + wx;
      const ny = e.y + wy;
      if (getTile(nx, ny) === "." && !isOccupied(nx, ny)) {
        e.x = nx;
        e.y = ny;
      }
    }
  }

  if (gameState.enemies.length === 0 && !gameState.awaitingNextLevel && !gameState.gameOver) {
    gameState.awaitingNextLevel = true;
    addLog("Floor cleared! Press N for the next level.", "cyan");
  }
}

// === INPUT HANDLING ===
function handleMove(dx, dy) {
  if (gameState.gameOver) return;
  if (!gameState.player) return;

  const p = gameState.player;
  const nx = p.x + dx;
  const ny = p.y + dy;

  // Wall?
  if (getTile(nx, ny) === "#") {
    addLog("You bump into a wall.", "grey");
    render();
    return;
  }

  const enemy = findEnemyAt(nx, ny);
  if (enemy) {
    // Attack instead of moving
    attack(p, enemy, true);
    if (!gameState.gameOver && !gameState.awaitingNextLevel) {
      enemyTurn();
    }
  } else if (getTile(nx, ny) === ".") {
    p.x = nx;
    p.y = ny;
    addLog("You move.", "grey");
    enemyTurn();
  }

  render();
}

function nextLevel() {
  if (!gameState.awaitingNextLevel) {
    addLog("You haven't cleared this floor yet.", "grey");
    render();
    return;
  }
  initLevel(gameState.level + 1);
  render();
}

function gameOverScreen() {
  addLog("Press R to restart or Q to quit.", "magenta");
  render();
}

// Global key handling
screen.key(Object.keys(MOVE_KEYS), (_, key) => {
  if (gameState.gameOver) return;
  const [dx, dy] = MOVE_KEYS[key.name];
  handleMove(dx, dy);
});

screen.key(["n", "N"], () => {
  if (gameState.gameOver) return;
  nextLevel();
});

screen.key(["r", "R"], () => {
  if (!gameState.gameOver) return;
  gameState.log = [];
  gameState.gameOver = false;
  initLevel(1);
  render();
});

// === INTRO "ANIMATION" ===
function showIntroAndStart() {
  const intro = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: 40,
    height: 9,
    tags: true,
    border: "line",
    style: { border: { fg: "cyan" } },
  });

  const lines = [
    "{cyan-fg}Rogue Dungeon{/cyan-fg}",
    "",
    "{white-fg}A tiny ASCII roguelite{/white-fg}",
    "",
    "{grey-fg}Move with arrows / WASD{/grey-fg}",
    "{grey-fg}Kill enemies, survive, go deeper{/grey-fg}",
    "",
    "{green-fg}Press any key to enter...{/green-fg}",
  ];

  intro.setContent(lines.join("\n"));
  screen.render();

  function startGameOnce() {
    screen.removeListener("keypress", startGameOnce);
    intro.destroy();
    initLevel(1);
    render();
  }

  screen.on("keypress", startGameOnce);
}

showIntroAndStart();
