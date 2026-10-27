import { attackCharacter, evadeAttack } from "./Health.js";
import { chooseNormalAttack, scoreAttack } from "./AI_NormalDifficulty.js";

const MAX_ROUNDS = 100;
const MAX_ATTACKS_PER_TURN = {
  Easy: 1,
  Normal: 6,
  Hard: 10,
};

// Make independent copies so the original roster never changes.
function cloneFighter(fighter) {
  return {
    ...fighter,
    defense:
      typeof fighter.defense === "object" && fighter.defense !== null
        ? { ...fighter.defense }
        : fighter.defense,
    maximumHealth: fighter.maximumHealth ?? fighter.health,
    maximumMana: fighter.maximumMana ?? fighter.mana,
    manaRegen: fighter.manaRegen ?? 0,
    maximumCooldown: fighter.maximumCooldown ?? 3,
    recovery: fighter.recovery ?? 1,
    turnFinished: false,
    blocked: false,
    attacks: (fighter.attacks ?? []).map((attack) => ({
      ...attack,
      buff: attack.buff ? { ...attack.buff } : attack.buff,
      debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
      state: true,
    })),
  };
}

function getDefense(fighter) {
  return typeof fighter.defense === "number"
    ? fighter.defense
    : (fighter.defense?.amount ?? 0);
}

function chooseAttack(fighter, difficulty) {
  const available = fighter.attacks.filter(
    (attack) => attack.state === true && fighter.mana >= (attack.cost ?? 0),
  );

  if (available.length === 0) return null;

  // Easy: choose a random usable attack.
  if (difficulty === "Easy") {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Normal: use the shared damage-first strategy.
  if (difficulty === "Normal") {
    return chooseNormalAttack(fighter);
  }

  // Hard: keep the existing scoring behavior for now.
  return [...available].sort((a, b) => scoreAttack(b) - scoreAttack(a))[0];
}

function resolveBotAttack(attack, attacker, defender) {
  // Pure buff/debuff moves cannot be blocked or evaded.
  if ((attack.buff || attack.debuff) && !(attack.damage > 0)) {
    return attackCharacter(attack, attacker, defender);
  }

  // No defensive charges available: take the attack normally.
  if ((defender.cooldown ?? 0) <= 0) {
    const result = attackCharacter(attack, attacker, defender);

    if (result) result.action = "take damage";

    return result;
  }

  const damage = Math.max(0, attack.damage ?? 0);
  const defense = getDefense(defender);

  // Calculate the cost and feasibility of evading this attack.
  const agilityNeeded = Math.max(
    0,
    (attack.speed ?? 0) - (defender.agility ?? 0),
  );

  const canEvade = defender.mana >= agilityNeeded;

  // Calculate how much damage a block would allow through.
  const blockedDamage = Math.max(0, damage - defense);

  // Decide whether the damage avoided is worth the mana cost.
  const manaAfterEvade = defender.mana - agilityNeeded;
  const maximumMana = defender.maximumMana ?? defender.mana;
  const manaReserve = maximumMana * 0.25;

  const isLethalThreat = defender.health <= damage;

  const shouldEvade =
    canEvade &&
    // A free evade is always worth considering.
    (agilityNeeded === 0 ||
      // Evade rather than risk being knocked out.
      isLethalThreat ||
      // Save mana when blocking already prevents all damage.
      (damage > defense &&
        // Avoid taking a substantial hit if mana permits.
        (blockedDamage >= 10 ||
          // Or evade when enough mana remains afterward.
          manaAfterEvade >= manaReserve)));

  if (shouldEvade) {
    const result = evadeAttack(attack, attacker, defender);

    if (result) {
      defender.cooldown -= 1;
    }

    return result;
  }

  // Blocking is preferred when evasion is impossible or
  // conserving mana is more valuable than avoiding the hit.
  const healthBefore = defender.health;

  const result = attackCharacter(attack, attacker, defender, defense);

  if (result) {
    defender.cooldown -= 1;
    result.action = "defend";
    result.damageReceived = healthBefore - defender.health;
  }

  return result;
}

function runBotTurn(attacker, defender, difficulty, stats, log, round) {
  let attacksThisTurn = 0;

  const attackLimit =
    MAX_ATTACKS_PER_TURN[difficulty] ?? MAX_ATTACKS_PER_TURN.Easy;

  while (
    attacker.health > 0 &&
    defender.health > 0 &&
    attacksThisTurn < attackLimit
  ) {
    const attack = chooseAttack(attacker, difficulty);

    // No usable attacks remain, so this bot finishes its turn.
    if (!attack) break;

    const healthBefore = defender.health;
    const attackerManaBefore = attacker.mana;
    const defenderManaBefore = defender.mana;

    const result = resolveBotAttack(attack, attacker, defender);

    if (!result) {
      // Prevent a failed move from trapping the simulator.
      attack.state = false;
      continue;
    }

    attacksThisTurn += 1;
    stats[attacker.id].attacksUsed += 1;
    stats[attacker.id].damageDealt += healthBefore - defender.health;

    if (result.action === "defend") {
      stats[defender.id].blocks += 1;
    } else if (result.action === "evade") {
      stats[defender.id].successfulEvades += 1;
    }

    log.push({
      round,
      attacker: attacker.name,
      defender: defender.name,
      attack: attack.name,
      action: result.action,
      damage: healthBefore - defender.health,
      attackerHealth: attacker.health,
      defenderHealth: defender.health,
      attackerMana: attacker.mana,
      defenderMana: defender.mana,
      attackerMana: attacker.mana,
      defenderMana: defender.mana,
      attackerManaUsed: Math.max(0, attackerManaBefore - attacker.mana),
      attackerMana: attacker.mana,
      defenderManaUsed: Math.max(0, defenderManaBefore - defender.mana),
      defenderMana: defender.mana,
    });
  }

  stats[attacker.id].turnsTaken += 1;
}

function advanceRound(fighters) {
  for (const fighter of fighters) {
    // Restore mana without exceeding the current maximum.
    fighter.mana = Math.min(
      fighter.maximumMana,
      fighter.mana + fighter.manaRegen,
    );

    // Recover defensive charges without exceeding the maximum.
    fighter.cooldown = Math.min(
      fighter.maximumCooldown,
      (fighter.cooldown ?? 0) + fighter.recovery,
    );

    // Make every attack available for the next round.
    fighter.attacks = fighter.attacks.map((attack) => ({
      ...attack,
      state: true,
    }));

    fighter.turnFinished = false;
  }
}

function simulateBattle(
  fighterOne,
  fighterTwo,
  {
    difficultyOne = "Easy",
    difficultyTwo = "Easy",
    maxRounds = MAX_ROUNDS,
  } = {},
) {
  const botOne = cloneFighter(fighterOne);
  const botTwo = cloneFighter(fighterTwo);

  // IDs identify the stats belonging to each bot.
  botOne.id = "botOne";
  botTwo.id = "botTwo";

  const fighters = [botOne, botTwo];

  const stats = {
    botOne: {
      attacksUsed: 0,
      damageDealt: 0,
      blocks: 0,
      successfulEvades: 0,
      turnsTaken: 0,
    },
    botTwo: {
      attacksUsed: 0,
      damageDealt: 0,
      blocks: 0,
      successfulEvades: 0,
      turnsTaken: 0,
    },
  };

  const log = [];
  let roundsCompleted = 0;

  for (let round = 1; round <= maxRounds; round++) {
    if (botOne.health <= 0 || botTwo.health <= 0) break;

    roundsCompleted = round;

    // Alternate who acts first each round to reduce first-turn bias.
    // Keep the original fighter order consistent every round.
    const order = [
      [botOne, botTwo, difficultyOne],
      [botTwo, botOne, difficultyTwo],
    ];

    for (const [attacker, defender, difficulty] of order) {
      if (attacker.health <= 0 || defender.health <= 0) break;

      const attackerStats = attacker === botOne ? stats.botOne : stats.botTwo;

      runBotTurn(attacker, defender, difficulty, stats, log, round);
    }

    if (botOne.health <= 0 || botTwo.health <= 0) break;

    advanceRound(fighters);
  }

  let winner = null;

  if (botOne.health > 0 && botTwo.health <= 0) {
    winner = botOne.name;
  } else if (botTwo.health > 0 && botOne.health <= 0) {
    winner = botTwo.name;
  } else if (botOne.health > botTwo.health) {
    winner = botOne.name;
  } else if (botTwo.health > botOne.health) {
    winner = botTwo.name;
  }

  return {
    winner,
    isDraw: winner === null,
    rounds: roundsCompleted,
    endReason:
      botOne.health <= 0 || botTwo.health <= 0 ? "knockout" : "round-limit",
    fighters: [
      {
        id: botOne.id,
        name: botOne.name,
        health: botOne.health,
        mana: botOne.mana,
      },
      {
        id: botTwo.id,
        name: botTwo.name,
        health: botTwo.health,
        mana: botTwo.mana,
      },
    ],
    stats,
    log,
  };
}

export {
  cloneFighter,
  simulateBattle,
  chooseAttack,
  resolveBotAttack,
  advanceRound,
};
