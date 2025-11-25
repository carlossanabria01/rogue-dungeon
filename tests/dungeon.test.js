const { generateDungeon } = require('../src/dungeon');

describe("Dungeon Generator", () => {
  test("returns a map with correct size", () => {
    const { tiles } = generateDungeon(40, 18);
    expect(tiles.length).toBe(18);
    expect(tiles[0].length).toBe(40);
  });

  test("generates at least 20% floor tiles", () => {
    const { tiles } = generateDungeon(40, 18);
    const floors = tiles.flat().filter(t => t === ".").length;
    const total = 40 * 18;
    expect(floors).toBeGreaterThan(total * 0.2);
  });
});
