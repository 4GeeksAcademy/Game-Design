import { attackCharacter, evadeAttack } from "./Health.js";
import { chooseNormalAttack, scoreAttack } from "./AI_NormalDifficulty.js";

const MAX_ROUNDS = 100;
const OPENING_TURN_ATTACK_LIMIT = 3;
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

  const damage = Math.max(0, attack.damage ?? 0);
  const defense = getDefense(defender);

  // LOW-HEALTH RULE:
  // At 5 HP or less, take a survivable hit to preserve
  // the defensive cooldown and avoid spending evade mana.
  // If the attack could knock the fighter out, use the
  // normal defensive decision logic instead.
  if (defender.health <= 5 && defender.health > damage) {
    const result = attackCharacter(attack, attacker, defender);

    if (result) {
      result.action = "take damage";
      result.damageReceived = defender.health;
    }

    return result;
  }

  // No defensive charges available: take the attack normally.
  if ((defender.cooldown ?? 0) <= 0) {
    const result = attackCharacter(attack, attacker, defender);

    if (result) result.action = "take damage";

    return result;
  }

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
    (agilityNeeded === 0 ||
      isLethalThreat ||
      (damage > defense &&
        (blockedDamage >= 10 ||
          manaAfterEvade >= manaReserve)));

  if (shouldEvade) {
    const result = evadeAttack(attack, attacker, defender);

    if (result) {
      defender.cooldown -= 1;
    }

    return result;
  }

  // Otherwise, block using the existing defense behavior.
  const healthBefore = defender.health;

  const result = attackCharacter(attack, attacker, defender, defense);

  if (result) {
    defender.cooldown -= 1;
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

      runBotTurn(
  attacker,
  defender,
  difficulty,
  stats,
  log,
  round,
  round === 1 && attacker === botOne,
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
  const availableTargets = [...livingDefenders].sort(
    () => Math.random() - 0.5,
  );

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

        const result = resolveBotAttack(attack, attacker, defender);

        if (!result) {
          // Avoid repeatedly trying a failed move.
          attack.state = false;
          continue;
        }

        attacksThisTurn++;
        stats[attacker.id].attacksUsed++;
        stats[attacker.id].damageDealt +=
          healthBefore - defender.health;

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
          attackerManaUsed: Math.max(
            0,
            attackerManaBefore - attacker.mana,
          ),
          defenderManaUsed: Math.max(
            0,
            defenderManaBefore - defender.mana,
          ),
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
};
