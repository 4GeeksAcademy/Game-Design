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
  createHardSavingState,
  getHardSavingDecision,
  recordHardPressureOutcome,
  chooseHardTarget,
  chooseHardTeamTargets,
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


  test("uses a pressure debuff only when its mana cost fits one round of regeneration", () => {
    const pressure = makeAttack("cooldown-pressure", {
      damage: 0,
      cost: 5,
      debuff: { recovery: -3 },
    });
    const attacker = makeFighter({
      id: "hard-cpu",
      mana: 20,
      manaRegen: 5,
      attacks: [pressure],
    });
    const defender = makeFighter({
      id: "player",
      cooldown: 2,
      recovery: 10,
      attacks: [],
    });
    const state = createHardSavingState();

    const decision = getHardSavingDecision(attacker, [defender], state);

    expect(decision.mode).toBe("pressure");
    expect(decision.attack).toBe(pressure);
    expect(state.pressureUsedThisRound).toBe(true);
  });

  test("waits instead of using a pressure move that costs more than mana regeneration", () => {
    const pressure = makeAttack("expensive-pressure", {
      damage: 0,
      cost: 6,
      debuff: { recovery: -3 },
    });
    const attacker = makeFighter({
      mana: 20,
      manaRegen: 5,
      attacks: [pressure],
    });
    const defender = makeFighter({ id: "player", recovery: 10 });

    const decision = getHardSavingDecision(
      attacker,
      [defender],
      createHardSavingState(),
    );

    expect(decision.mode).toBe("skip");
    expect(decision.attack).toBeNull();
  });

  test("enters full recovery after ten pressure rounds without post-recovery progress", () => {
    const pressure = makeAttack("cooldown-pressure", {
      damage: 0,
      cost: 5,
      debuff: { recovery: -3 },
    });
    const attacker = makeFighter({
      mana: 20,
      manaRegen: 5,
      attacks: [pressure],
    });
    const defender = makeFighter({
      id: "player",
      cooldown: 2,
      recovery: 10,
    });
    const state = createHardSavingState();

    for (let round = 0; round < 10; round += 1) {
      const decision = getHardSavingDecision(attacker, [defender], state);
      expect(decision.mode).toBe("pressure");
      // No net resource change after round recovery means no real progress.
      recordHardPressureOutcome(state, defender);
    }

    expect(state.stalledRounds).toBe(10);
    expect(state.mode).toBe("recover");
  });

  test("resets the stalled counter when pressure creates lasting progress", () => {
    const pressure = makeAttack("cooldown-pressure", {
      damage: 0,
      cost: 5,
      debuff: { recovery: -3 },
    });
    const attacker = makeFighter({
      mana: 20,
      manaRegen: 5,
      attacks: [pressure],
    });
    const defender = makeFighter({
      id: "player",
      cooldown: 2,
      recovery: 10,
    });
    const state = createHardSavingState();

    getHardSavingDecision(attacker, [defender], state);
    defender.cooldown = 0;
    recordHardPressureOutcome(state, defender);

    expect(state.stalledRounds).toBe(0);
    expect(state.mode).toBe("pressure");
  });



  test("exits pressure mode as soon as a worthwhile combo becomes affordable", () => {
    const attacker = makeFighter({
      mana: 100,
      attacks: [
        makeAttack("pressure", { damage: 0, cost: 5, debuff: { recovery: -1 } }),
        makeAttack("combo-one", { damage: 40, cost: 10 }),
        makeAttack("combo-two", { damage: 40, cost: 10 }),
      ],
    });
    const defender = makeFighter({ id: "player", health: 100 });
    const state = createHardSavingState();
    state.mode = "pressure";
    state.stalledRounds = 4;

    const decision = getHardSavingDecision(attacker, [defender], state);

    expect(decision.mode).toBe("normal");
    expect(decision.attack).not.toBeNull();
    expect(state.mode).toBe("normal");
    expect(state.stalledRounds).toBe(0);
  });

  test("leaves full recovery when a worthwhile combo becomes affordable", () => {
    const attacker = makeFighter({
      mana: 0,
      manaRegen: 5,
      attacks: [
        makeAttack("combo-starter", { damage: 40, cost: 10 }),
        makeAttack("combo-finisher", { damage: 40, cost: 10 }),
      ],
    });
    const defender = makeFighter({ id: "player", health: 100 });
    const state = createHardSavingState();
    state.mode = "recover";
    state.stalledRounds = 10;

    const waiting = getHardSavingDecision(attacker, [defender], state);
    expect(waiting.mode).toBe("skip");

    attacker.mana = 100;
    const resumed = getHardSavingDecision(attacker, [defender], state);

    expect(resumed.mode).toBe("normal");
    expect(resumed.attack).not.toBeNull();
    expect(state.mode).toBe("normal");
    expect(state.stalledRounds).toBe(0);
  });

  test("chooses the more vulnerable opponent when no matching resource-disruption move exists", () => {
    const attacker = makeFighter({
      mana: 100,
      attacks: [makeAttack("heavy-hit", { damage: 45, cost: 5 })],
    });
    const easier = makeFighter({
      id: "easier-target",
      defense: 1,
      health: 100,
    });
    const tougher = makeFighter({
      id: "tougher-target",
      defense: 9,
      health: 100,
      manaRegen: 10,
      recovery: 10,
    });

    expect(chooseHardTarget(attacker, [tougher, easier])).toBe(easier);
  });

  test("focuses a second CPU fighter on an opponent who can be knocked out", () => {
    const attack = () => makeAttack("finisher", { damage: 40, cost: 5 });
    const cpuOne = makeFighter({ id: "cpu-one", mana: 100, attacks: [attack()] });
    const cpuTwo = makeFighter({ id: "cpu-two", mana: 100, attacks: [attack()] });
    const lowHealth = makeFighter({ id: "low-health", health: 35, maximumHealth: 100 });
    const healthy = makeFighter({ id: "healthy", health: 100, maximumHealth: 100 });

    const assignments = chooseHardTeamTargets(
      [cpuOne, cpuTwo],
      [lowHealth, healthy],
    );

    expect(assignments["cpu-one"]).toBe("low-health");
    expect(assignments["cpu-two"]).toBe("low-health");
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
