import { test, expect } from "@playwright/test";

import {
  aiChooseAttack,
  aiDefendOrEvade,
} from "../src/Mechanics/AI.js";

import {
  normalDefendOrEvade,
  chooseNormalAttack,
  scoreAttack,
} from "../src/Mechanics/AI_NormalDifficulty.js";

import {
  getHardEvadeManaCost,
  getHardManaReserve,
  getHardDebuffThreat,
  chooseHardAttack,
  hardDefendOrEvade,
} from "../src/Mechanics/AI_HardDifficulty.js";

function makeAttack(id, overrides = {}) {
  return {
    id,
    name: id,
    damage: 20,
    speed: 10,
    cost: 0,
    state: true,
    ...overrides,
  };
}

function makeFighter(overrides = {}) {
  return {
    id: "fighter",
    name: "Test Fighter",
    health: 100,
    maximumHealth: 100,
    mana: 0,
    maximumMana: 100,
    defense: 0,
    agility: 0,
    cooldown: 0,
    maximumCooldown: 3,
    recovery: 10,
    maximumRecovery: 10,
    manaRegen: 5,
    attacks: [],
    activeModifiers: [],
    ...overrides,
  };
}

test.describe("Easy AI", () => {
  test("chooses an available attack instead of an exhausted attack", () => {
    const available = makeAttack("available");
    const exhausted = makeAttack("exhausted", { state: false });

    const fighter = makeFighter({
      attacks: [exhausted, available],
    });

    expect(aiChooseAttack(fighter)).toBe(available);
  });

  test("takes an ordinary hit when no defensive charge is available", () => {
    const attacker = makeFighter({
      id: "attacker",
      attacks: [makeAttack("easy-hit")],
    });

    const defender = makeFighter({
      id: "defender",
      health: 100,
      cooldown: 0,
    });

    const result = aiDefendOrEvade(
      attacker.attacks[0],
      attacker,
      defender,
    );

    expect(result).not.toBeNull();
    expect(result.defender.health).toBe(80);
    expect(result.action).toBe("take damage");
  });
});

test.describe("Normal AI", () => {
  test("scores attacks using damage, speed, effects, and mana cost", () => {
    const attack = makeAttack("normal-score", {
      damage: 10,
      speed: 20,
      cost: 5,
      buff: { defense: 2 },
      debuff: { defense: -2 },
    });

    expect(scoreAttack(attack)).toBe(48);
  });

  test("prioritizes a usable high-value attack", () => {
    const low = makeAttack("low", {
      damage: 5,
      speed: 5,
    });

    const high = makeAttack("high", {
      damage: 40,
      speed: 20,
    });

    const exhausted = makeAttack("exhausted", {
      damage: 100,
      state: false,
    });

    const fighter = makeFighter({
      mana: 100,
      attacks: [low, exhausted, high],
    });

    expect(chooseNormalAttack(fighter)).toBe(high);
  });

  test("resolves a hit when the defender has no cooldown or evade mana", () => {
    const attacker = makeFighter({
      id: "attacker",
      attacks: [makeAttack("normal-hit")],
    });

    const defender = makeFighter({
      id: "defender",
      health: 100,
      mana: 0,
      cooldown: 0,
    });

    const result = normalDefendOrEvade(
      attacker.attacks[0],
      attacker,
      defender,
    );

    expect(result).not.toBeNull();
    expect(result.defender.health).toBe(80);
  });
});

test.describe("Hard AI", () => {
  test("requires full attack speed in mana when cooldown is zero", () => {
    const attack = makeAttack("fast-attack", { speed: 30 });

    const defender = makeFighter({
      agility: 12,
      cooldown: 0,
    });

    expect(
      getHardEvadeManaCost(attack, makeFighter(), defender),
    ).toBe(30);
  });

  test("uses agility to reduce evade cost when cooldown is available", () => {
    const attack = makeAttack("fast-attack", { speed: 30 });

    const defender = makeFighter({
      agility: 12,
      cooldown: 2,
    });

    expect(
      getHardEvadeManaCost(attack, makeFighter(), defender),
    ).toBe(18);
  });

  test("preserves the expected percentage of current mana", () => {
    const fighter = makeFighter({
      mana: 80,
      maximumMana: 100,
      health: 100,
    });

    const opponent = makeFighter({
      attacks: [makeAttack("opponent-move", { speed: 10 })],
    });

    expect(getHardManaReserve(fighter, opponent, 0)).toBeCloseTo(12);

    fighter.health = 20;

    expect(getHardManaReserve(fighter, opponent, 2)).toBeCloseTo(28);
  });

  test("recognizes significant recovery and cooldown debuffs", () => {
    const defender = makeFighter({
      defense: 20,
      cooldown: 2,
      recovery: 10,
    });

    const attack = makeAttack("advanced-debuff", {
      debuff: {
        defense: -10,
        cooldown: -1,
        recovery: -3,
      },
    });

    const threat = getHardDebuffThreat(attack, defender);

    expect(threat.score).toBeGreaterThan(0);
    expect(threat.significant).toBe(true);
  });

  test("chooses an available attack from its candidate list", () => {
    const first = makeAttack("candidate-one", {
      damage: 30,
      cost: 10,
    });

    const second = makeAttack("candidate-two", {
      damage: 50,
      cost: 15,
    });

    const unavailable = makeAttack("unavailable", {
      damage: 100,
      state: false,
    });

    const attacker = makeFighter({
      mana: 100,
      maximumMana: 100,
      attacks: [first, second, unavailable],
    });

    const defender = makeFighter({
      health: 100,
      mana: 50,
      attacks: [makeAttack("response", { speed: 10 })],
    });

    const selected = chooseHardAttack(attacker, defender);

    expect([first, second]).toContain(selected);
    expect(selected).not.toBe(unavailable);
  });

  test("does not select an attack when every move is unavailable", () => {
    const attacker = makeFighter({
      attacks: [
        makeAttack("locked-one", { state: false }),
        makeAttack("locked-two", { state: false }),
      ],
    });

    expect(
      chooseHardAttack(attacker, makeFighter()),
    ).toBeNull();
  });

  test("resolves a hit when no defensive option can be funded", () => {
    const attacker = makeFighter({
      id: "attacker",
      attacks: [makeAttack("hard-hit", { speed: 20 })],
    });

    const defender = makeFighter({
      id: "defender",
      health: 100,
      mana: 0,
      cooldown: 0,
      agility: 0,
    });

    const result = hardDefendOrEvade(
      attacker.attacks[0],
      attacker,
      defender,
    );

    expect(result).not.toBeNull();
    expect(result.defender.health).toBe(80);
  });
});
