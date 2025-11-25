// src/dungeon.js
// Simple procedural "cave-ish" dungeon using a random walk / drunkard algorithm

function generateDungeon(width, height) {
  // Initialize with walls '#'
  const tiles = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => "#")
  );

  let startX = Math.floor(width / 2);
  let startY = Math.floor(height / 2);

  let x = startX;
  let y = startY;
  tiles[y][x] = ".";

  const targetFloorCount = Math.floor(width * height * 0.4);
  let carved = 1;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (carved < targetFloorCount) {
    const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
    const newX = Math.min(width - 2, Math.max(1, x + dx));
    const newY = Math.min(height - 2, Math.max(1, y + dy));

    x = newX;
    y = newY;

    if (tiles[y][x] === "#") {
      tiles[y][x] = ".";
      carved++;
    }
  }

  return {
    tiles,
    playerStart: { x: startX, y: startY },
  };
}

module.exports = {
  generateDungeon,
};
