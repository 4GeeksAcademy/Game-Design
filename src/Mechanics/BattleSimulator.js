import { attackCharacter, evadeAttack, canUseAttack } from "./Health.js";

import {
  getModifiedAttackStat,
  getModifiedCharacterStat,
  tickSelfModifiers,
} from "./Modifiers.js";

import { resetAttacks } from "./Turns.js";
import { aiChooseStunTargets } from "./AI.js";

import { getNormalAttackPriority, scoreAttack } from "./AI_NormalDifficulty.js";

const MAX_ROUNDS = 100;
const OPENING_TURN_ATTACK_LIMIT = 4;
const MAX_ATTACKS_PER_TURN = {
  Easy: 1,
  Normal: 6,
  Hard: 10,
};

// Both 1v1 systems use the same alternating turn order.
function getTurnOrder(round) {
  return round % 2 === 1 ? [0, 1] : [1, 0];
}

// The first fighter of the opening round gets the special attack limit.
function getAttackLimit(difficulty, isOpeningTurn = false) {
  const difficultyLimit =
    MAX_ATTACKS_PER_TURN[difficulty] ?? MAX_ATTACKS_PER_TURN.Easy;

  return isOpeningTurn
    ? Math.min(OPENING_TURN_ATTACK_LIMIT, difficultyLimit)
    : difficultyLimit;
}

// Make independent copies so the original roster never changes.
function cloneFighter(fighter) {
  return {
    ...fighter,

    defense:
      typeof fighter.defense === "object" && fighter.defense !== null
        ? { ...fighter.defense }
        : fighter.defense,

    activeModifiers: (fighter.activeModifiers ?? []).map((modifier) => ({
      ...modifier,
      attackModifiers: modifier.attackModifiers
        ? {
            ...modifier.attackModifiers,
            targetAttackIds: modifier.attackModifiers.targetAttackIds
              ? [...modifier.attackModifiers.targetAttackIds]
              : null,
            stats: { ...modifier.attackModifiers.stats },
          }
        : null,
      characterModifiers: modifier.characterModifiers
        ? { ...modifier.characterModifiers }
        : null,
    })),

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
      heal: attack.heal
        ? {
            ...attack.heal,
            buff: attack.heal.buff ? { ...attack.heal.buff } : attack.heal.buff,
          }
        : attack.heal,
      stun: attack.stun ? { ...attack.stun } : attack.stun,
      attackModifiers: attack.attackModifiers
        ? {
            ...attack.attackModifiers,
            targetAttackIds: attack.attackModifiers.targetAttackIds
              ? [...attack.attackModifiers.targetAttackIds]
              : null,
            stats: { ...attack.attackModifiers.stats },
          }
        : attack.attackModifiers,
      characterModifiers: attack.characterModifiers
        ? { ...attack.characterModifiers }
        : attack.characterModifiers,
      activeEffects: (attack.activeEffects ?? []).map((effect) => ({
        ...effect,
        effects: { ...effect.effects },
      })),
      stunned: attack.stunned ? { ...attack.stunned } : null,
      remainingUses: attack.remainingUses ?? attack.uses,
      cooldownRemaining: Math.max(0, Number(attack.cooldownRemaining) || 0),
      cooldownStartedThisRound: attack.cooldownStartedThisRound === true,
      state:
        (attack.remainingUses ?? attack.uses ?? 1) > 0 &&
        (Number(attack.cooldownRemaining) || 0) <= 0 &&
        (attack.stunned?.remainingRounds ?? 0) <= 0 &&
        attack.cooldownStartedThisRound !== true,
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
    (attack) =>
      canUseAttack(attack) &&
      fighter.mana >= getModifiedAttackStat(attack, fighter, "cost") &&
      // A pure teammate-healing move has no valid target in 1v1.
      !(attack.heal && !(attack.damage > 0)),
  );

  if (available.length === 0) return null;

  if (difficulty === "Easy") {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Score attacks using their currently modified values.
  const scoredAttacks = available.map((attack) => ({
    ...attack,
    damage: getModifiedAttackStat(attack, fighter, "damage"),
    speed: getModifiedAttackStat(attack, fighter, "speed"),
    cost: getModifiedAttackStat(attack, fighter, "cost"),
    originalAttack: attack,
  }));

  if (difficulty === "Normal") {
    return getNormalAttackPriority(scoredAttacks)[0]?.originalAttack ?? null;
  }

  return (
    [...scoredAttacks].sort((a, b) => scoreAttack(b) - scoreAttack(a))[0]
      ?.originalAttack ?? null
  );
}

function resolveBotAttack(
  attack,
  attacker,
  defender,
  fighters = [attacker, defender],
) {
  // Selection and execution both enforce cooldowns; never trust a queued move.
  if (
    !canUseAttack(attack) ||
    attacker.mana < getModifiedAttackStat(attack, attacker, "cost")
  ) {
    return null;
  }

  const selectedAttackIds = aiChooseStunTargets(defender, attack.stun);

  const options = {
    selectedAttackIds,
    fighters,
  };

  const damage = getModifiedAttackStat(attack, attacker, "damage");
  const defense = getModifiedCharacterStat(defender, "defense");
  const attackSpeed = getModifiedAttackStat(attack, attacker, "speed");

  const defenderCooldown = getModifiedCharacterStat(defender, "cooldown");

  // Zero-damage debuffs still require defensive evaluation. A block only
  // prevents a debuff explicitly marked debuffRequiresHit; otherwise a
  // successful evade is the only defense that prevents the effect.
  if (damage <= 0) {
    const meaningfulDebuff = attack.debuff && Object.entries(attack.debuff).some(
      ([stat, rawAmount]) => {
        const amount = Math.abs(Number(rawAmount) || 0);
        const currentValue = getModifiedCharacterStat(defender, stat);
        return amount > 0 && currentValue > 0 && (amount / currentValue) * 100 > 5;
      },
    );

    if (!meaningfulDebuff || defenderCooldown <= 0) {
      return attackCharacter(attack, attacker, defender, 0, options);
    }

    if (attack.debuffRequiresHit === true) {
      const result = attackCharacter(attack, attacker, defender, 0, {
        ...options,
        blocked: true,
      });
      if (result) {
        defender.cooldown = Math.max(0, defenderCooldown - 1);
        result.action = "defend";
      }
      return result;
    }

    const agility = getModifiedCharacterStat(defender, "agility");
    const agilityNeeded = Math.max(0, attackSpeed - agility);
    if (defender.mana >= agilityNeeded) {
      const result = evadeAttack(attack, attacker, defender, options);
      if (result) result.action = result.evaded ? "evade" : "take damage";
      return result;
    }

    return attackCharacter(attack, attacker, defender, 0, options);
  }

  // Preserve the existing low-health behavior.
  if (defender.health <= 5 && defender.health > damage) {
    const result = attackCharacter(attack, attacker, defender, 0, options);

    if (result) result.action = "take damage";

    return result;
  }

  // No defensive charges available.
  if (defenderCooldown <= 0) {
    const result = attackCharacter(attack, attacker, defender, 0, options);

    if (result) result.action = "take damage";

    return result;
  }

  const agility = getModifiedCharacterStat(defender, "agility");

  const agilityNeeded = Math.max(0, attackSpeed - agility);
  const canEvade = defender.mana >= agilityNeeded;

  const blockedDamage = Math.max(0, damage - defense);

  const manaAfterEvade = defender.mana - agilityNeeded;
  const maximumMana = defender.maximumMana ?? defender.mana;
  const manaReserve = maximumMana * 0.25;

  const isLethalThreat = defender.health <= damage;

  const shouldEvade =
    canEvade &&
    (agilityNeeded === 0 ||
      isLethalThreat ||
      (damage > defense &&
        (blockedDamage >= 10 || manaAfterEvade >= manaReserve)));

  if (shouldEvade) {
    const result = evadeAttack(attack, attacker, defender, options);

    if (result) {
      result.action = result.evaded ? "evade" : "take damage";
    }

    return result;
  }

  // Otherwise, block using modified defense.
  const healthBefore = defender.health;

  const result = attackCharacter(attack, attacker, defender, defense, {
    ...options,
    blocked: true,
  });

  if (result) {
    defender.cooldown = Math.max(0, defenderCooldown - 1);
    result.action = "defend";
    result.damageReceived = healthBefore - defender.health;
  }

  return result;
}

function runBotTurn(
  attacker,
  defender,
  difficulty,
  stats,
  log,
  round,
  isOpeningTurn = false,
  fighters = [attacker, defender],
) {
  let attacksThisTurn = 0;

  const difficultyAttackLimit =
    MAX_ATTACKS_PER_TURN[difficulty] ?? MAX_ATTACKS_PER_TURN.Easy;

  const attackLimit = isOpeningTurn
    ? Math.min(OPENING_TURN_ATTACK_LIMIT, difficultyAttackLimit)
    : difficultyAttackLimit;

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

    const result = resolveBotAttack(attack, attacker, defender, fighters);

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
      attackerManaUsed: Math.max(0, attackerManaBefore - attacker.mana),
      defenderManaUsed: Math.max(0, defenderManaBefore - defender.mana),
    });
  }

  stats[attacker.id].turnsTaken += 1;
}

function advanceRound(fighters) {
  // First, recover resources using currently active modifiers.
  for (const fighter of fighters) {
    const manaRegen = getModifiedCharacterStat(fighter, "manaRegen");

    const maximumMana = getModifiedCharacterStat(fighter, "maximumMana");

    fighter.mana = Math.min(maximumMana, fighter.mana + manaRegen);

    const recovery = getModifiedCharacterStat(fighter, "recovery");

    const maximumCooldown = getModifiedCharacterStat(
      fighter,
      "maximumCooldown",
    );

    fighter.cooldown = Math.min(
      maximumCooldown,
      (fighter.cooldown ?? 0) + recovery,
    );
  }

  // Expire temporary character and attack modifiers.
  for (const fighter of fighters) {
    tickSelfModifiers(fighter);
  }

  // Process stun, cooldown, and limited-use attacks.
  // Passing all fighters also allows temporary effects
  // to be reversed on the correct target.
  for (const fighter of fighters) {
    fighter.attacks = resetAttacks(fighter.attacks, fighters);

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

    // Alternate the starting fighter every round.
    const order = getTurnOrder(round);

    for (let position = 0; position < order.length; position++) {
      const attackerIndex = order[position];

      const attacker = fighters[attackerIndex];
      const defender = fighters[1 - attackerIndex];

      const difficulty = attackerIndex === 0 ? difficultyOne : difficultyTwo;

      if (attacker.health <= 0 || defender.health <= 0) break;

      runBotTurn(
        attacker,
        defender,
        difficulty,
        stats,
        log,
        round,
        round === 1 && position === 0,
        fighters,
      );
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

/**
 * Choose one unique opponent for each fighter who can act.
 *
 * If two teammates are alive but only one opponent remains,
 * only one teammate receives a target. The other skips.
 */
function assignUniqueTargets(attackers, defenders) {
  const livingAttackers = attackers.filter((fighter) => fighter.health > 0);
  const livingDefenders = defenders.filter((fighter) => fighter.health > 0);

  // Shuffle the available targets so the same teammate isn't
  // always favored when there is only one opponent left.
  const availableTargets = [...livingDefenders].sort(() => Math.random() - 0.5);

  const assignments = new Map();

  for (const attacker of livingAttackers) {
    const target = availableTargets.shift();

    if (!target) break;

    assignments.set(attacker.id, target);
  }

  return assignments;
}

/**
 * Simulate a complete 2v2 battle.
 *
 * Each team's fighters act before the other team gets its turn.
 * Targets are exclusive for the round, and a teammate without
 * an assigned target skips their turn.
 *
 * The existing 1v1 simulateBattle() remains unchanged.
 */
function simulateTeamBattle(
  teamOne,
  teamTwo,
  {
    difficultyOne = "Normal",
    difficultyTwo = "Normal",
    maxRounds = MAX_ROUNDS,
  } = {},
) {
  if (!Array.isArray(teamOne) || !Array.isArray(teamTwo)) {
    throw new Error("Both teams must be arrays of fighters.");
  }

  if (teamOne.length !== 2 || teamTwo.length !== 2) {
    throw new Error("Team battles require exactly two fighters per team.");
  }

  const cloneTeam = (team, prefix) =>
    team.map((fighter, index) => {
      const clone = cloneFighter(fighter);
      clone.id = `${prefix}${index + 1}`;
      clone.teamId = prefix;
      return clone;
    });

  const players = cloneTeam(teamOne, "teamOne");
  const opponents = cloneTeam(teamTwo, "teamTwo");
  const allFighters = [...players, ...opponents];

  const stats = {};

  for (const fighter of allFighters) {
    stats[fighter.id] = {
      id: fighter.id,
      name: fighter.name,
      attacksUsed: 0,
      damageDealt: 0,
      blocks: 0,
      successfulEvades: 0,
      turnsTaken: 0,
      skippedTurns: 0,
    };
  }

  const log = [];
  let roundsCompleted = 0;

  function living(team) {
    return team.filter((fighter) => fighter.health > 0);
  }

  function teamIsDefeated(team) {
    return living(team).length === 0;
  }

  function runTeamTurn(attackers, defenders, difficulty, round) {
    const targets = assignUniqueTargets(attackers, defenders);

    for (const attacker of attackers) {
      if (attacker.health <= 0) continue;

      const defender = targets.get(attacker.id);

      if (!defender) {
        stats[attacker.id].skippedTurns++;

        log.push({
          round,
          attacker: attacker.name,
          defender: null,
          attack: null,
          action: "skipped",
          damage: 0,
          attackerHealth: attacker.health,
          defenderHealth: null,
          attackerMana: attacker.mana,
          defenderMana: null,
          reason: "No unique target was available.",
        });

        continue;
      }

      if (defender.health <= 0) continue;

      const difficultyAttackLimit =
        MAX_ATTACKS_PER_TURN[difficulty] ?? MAX_ATTACKS_PER_TURN.Easy;

      const isOpeningTeamTurn = round === 1 && attackers === players;

      const attackLimit = isOpeningTeamTurn
        ? Math.min(OPENING_TURN_ATTACK_LIMIT, difficultyAttackLimit)
        : difficultyAttackLimit;

      let attacksThisTurn = 0;

      stats[attacker.id].turnsTaken++;

      while (
        attacker.health > 0 &&
        defender.health > 0 &&
        attacksThisTurn < attackLimit
      ) {
        const attack = chooseAttack(attacker, difficulty);

        if (!attack) break;

        const attackerManaBefore = attacker.mana;
        const defenderManaBefore = defender.mana;
        const healthBefore = defender.health;

        const result = resolveBotAttack(
          attack,
          attacker,
          defender,
          allFighters,
        );

        if (!result) {
          // Avoid repeatedly trying a failed move.
          attack.state = false;
          continue;
        }

        attacksThisTurn++;
        stats[attacker.id].attacksUsed++;
        stats[attacker.id].damageDealt += healthBefore - defender.health;

        if (result.action === "defend") {
          stats[defender.id].blocks++;
        } else if (result.action === "evade") {
          stats[defender.id].successfulEvades++;
        }

        log.push({
          round,
          attacker: attacker.name,
          defender: defender.name,
          attack: attack.name,
          action: result.action,
          damage: Math.max(0, healthBefore - defender.health),
          attackerHealth: attacker.health,
          defenderHealth: defender.health,
          attackerMana: attacker.mana,
          defenderMana: defender.mana,
          attackerManaUsed: Math.max(0, attackerManaBefore - attacker.mana),
          defenderManaUsed: Math.max(0, defenderManaBefore - defender.mana),
        });

        // Don't allow the other teammate to take over this target
        // if it gets knocked out during the round.
        if (defender.health <= 0) break;
      }
    }
  }

  for (let round = 1; round <= maxRounds; round++) {
    if (teamIsDefeated(players) || teamIsDefeated(opponents)) break;

    roundsCompleted = round;

    // The player's team acts first, followed by the opposing team.
    runTeamTurn(players, opponents, difficultyOne, round);

    if (teamIsDefeated(opponents)) break;

    runTeamTurn(opponents, players, difficultyTwo, round);

    if (teamIsDefeated(players) || teamIsDefeated(opponents)) break;

    advanceRound(allFighters);
  }

  const playerSurvivors = living(players);
  const opponentSurvivors = living(opponents);

  let winner = null;

  if (playerSurvivors.length > 0 && opponentSurvivors.length === 0) {
    winner = "Team 1";
  } else if (opponentSurvivors.length > 0 && playerSurvivors.length === 0) {
    winner = "Team 2";
  } else {
    const playerHealth = playerSurvivors.reduce(
      (total, fighter) => total + fighter.health,
      0,
    );

    const opponentHealth = opponentSurvivors.reduce(
      (total, fighter) => total + fighter.health,
      0,
    );

    if (playerHealth > opponentHealth) winner = "Team 1";
    if (opponentHealth > playerHealth) winner = "Team 2";
  }

  return {
    winner,
    isDraw: winner === null,
    rounds: roundsCompleted,
    endReason:
      teamIsDefeated(players) || teamIsDefeated(opponents)
        ? "knockout"
        : "round-limit",
    teams: [
      players.map((fighter) => ({
        id: fighter.id,
        name: fighter.name,
        health: fighter.health,
        mana: fighter.mana,
      })),
      opponents.map((fighter) => ({
        id: fighter.id,
        name: fighter.name,
        health: fighter.health,
        mana: fighter.mana,
      })),
    ],
    fighters: allFighters.map((fighter) => ({
      id: fighter.id,
      name: fighter.name,
      health: fighter.health,
      mana: fighter.mana,
      teamId: fighter.teamId,
    })),
    stats,
    log,
  };
}

export {
  cloneFighter,
  simulateBattle,
  simulateTeamBattle,
  chooseAttack,
  resolveBotAttack,
  advanceRound,
  getTurnOrder,
  getAttackLimit,
};
