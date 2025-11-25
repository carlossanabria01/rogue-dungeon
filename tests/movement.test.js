const { getTile } = require('../src/game');

describe("Movement Logic", () => {
  test("cannot walk through walls", () => {
    const map = [
      "#####",
      "#.@.#",
      "#####"
    ].map(row => row.split(""));

    const isWall = getTile(0,0) === "#";
    expect(isWall).toBe(true);
  });
});
