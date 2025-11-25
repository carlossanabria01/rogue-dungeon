const { attack } = require('../src/game');

describe("Combat System", () => {
  test("player deals damage", () => {
    const attacker = { attack: 5 };
    const defender = { hp: 10 };

    attack(attacker, defender, true);
    expect(defender.hp).toBeLessThan(10);
  });

  test("enemy dies at 0 hp", () => {
    const attacker = { attack: 10 };
    const defender = { hp: 1 };

    attack(attacker, defender, true);
    expect(defender.hp <= 0).toBe(true);
  });
});
