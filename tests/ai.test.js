const { manhattan } = require('../src/game');

describe("Enemy AI", () => {
  test("calculates Manhattan distance", () => {
    const a = { x: 1, y: 1 };
    const b = { x: 4, y: 5 };
    expect(manhattan(a, b)).toBe(7);
  });
});
