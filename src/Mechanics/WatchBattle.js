
import {
  cloneFighter,
  chooseAttack,
  resolveBotAttack,
  advanceRound,
  getTurnOrder,
  getAttackLimit,
} from "./BattleSimulator.js";

const MAX_ROUNDS = 100;

// =========================================
// CREATE 1v1 WATCH BATTLE
// =========================================

export function createWatchBattle(
  fighterOne,
  fighterTwo,
  difficultyOne = "Normal",
  difficultyTwo = "Normal",
) {
  const botOne = cloneFighter(fighterOne);
  const botTwo = cloneFighter(fighterTwo);

  botOne.id = "botOne";
  botTwo.id = "botTwo";

  return {
    mode: "1v1",
    fighters: [botOne, botTwo],
    difficulties: [difficultyOne, difficultyTwo],
    round: 1,
    turnPosition: 0,
    attacksThisTurn: 0,
    finished: false,
    winner: null,
    log: [],
    currentAction: null,
  };
}

// =========================================
// DIFFICULTY NORMALIZATION
// =========================================

function normalizeDifficulties(difficulty, count) {
  if (Array.isArray(difficulty)) {
    return Array.from(
      { length: count },
      (_, index) => difficulty[index] ?? "Normal",
    );
  }

  return Array(count).fill(difficulty ?? "Normal");
}

// =========================================
// CREATE 2v2 WATCH BATTLE
// =========================================

export function createWatchTeamBattle(
  teamOne,
  teamTwo,
  difficultyOne = "Normal",
  difficultyTwo = "Normal",
) {
  if (
    !Array.isArray(teamOne) ||
    !Array.isArray(teamTwo) ||
    teamOne.length !== 2 ||
    teamTwo.length !== 2
  ) {
    throw new Error(
      "Watch Mode team battles require two fighters per team.",
    );
  }

  const players = teamOne.map((fighter, index) => {
    const clone = cloneFighter(fighter);
    clone.id = `teamOne${index + 1}`;
    clone.teamId = "teamOne";
    return clone;
  });

  const opponents = teamTwo.map((fighter, index) => {
    const clone = cloneFighter(fighter);
    clone.id = `teamTwo${index + 1}`;
    clone.teamId = "teamTwo";
    return clone;
  });

  const difficulties = [
    ...normalizeDifficulties(difficultyOne, 2),
    ...normalizeDifficulties(difficultyTwo, 2),
  ];

  return {
    mode: "2v2",
    fighters: [...players, ...opponents],
    teams: [players, opponents],
    difficulties,
    round: 1,

    teamTurn: 0,
    fighterPosition: 0,
    attacksThisTurn: 0,

    targetAssignments: {},

    finished: false,
    winner: null,
    log: [],
    currentAction: null,
  };
}

// =========================================
// TARGET ASSIGNMENT
// =========================================

// Each living attacker receives a unique living target.
// If there are fewer defenders than attackers,
// the remaining attackers skip their turn.

function assignUniqueTargets(attackers, defenders) {
  const livingAttackers = attackers.filter(
    (fighter) => fighter.health > 0,
  );

  const availableTargets = defenders
    .filter((fighter) => fighter.health > 0)
    .slice();

  // Shuffle targets to avoid always favoring
  // the same teammate.
  for (let i = availableTargets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [availableTargets[i], availableTargets[j]] = [
      availableTargets[j],
      availableTargets[i],
    ];
  }

  const assignments = {};

  livingAttackers.forEach((attacker, index) => {
    const target = availableTargets[index];

    if (target) {
      assignments[attacker.id] = target.id;
    }
  });

  return assignments;
}

function findFighter(battle, fighterId) {
  return battle.fighters.find(
    (fighter) => fighter.id === fighterId,
  );
}

function teamIsDefeated(team) {
  return team.every((fighter) => fighter.health <= 0);
}

// =========================================
// FINISH 2v2 BATTLE
// =========================================

function finishTeamBattle(battle) {
  battle.finished = true;

  const [teamOne, teamTwo] = battle.teams;

  const teamOneDefeated = teamIsDefeated(teamOne);
  const teamTwoDefeated = teamIsDefeated(teamTwo);

  if (teamOneDefeated && teamTwoDefeated) {
    battle.winner = null;
    return;
  }

  if (teamOneDefeated) {
    battle.winner = "Team 2";
    return;
  }

  if (teamTwoDefeated) {
    battle.winner = "Team 1";
    return;
  }

  // Round limit: compare surviving health.
  const teamOneHealth = teamOne.reduce(
    (total, fighter) =>
      total + Math.max(0, fighter.health),
    0,
  );

  const teamTwoHealth = teamTwo.reduce(
    (total, fighter) =>
      total + Math.max(0, fighter.health),
    0,
  );

  if (teamOneHealth > teamTwoHealth) {
    battle.winner = "Team 1";
  } else if (teamTwoHealth > teamOneHealth) {
    battle.winner = "Team 2";
  } else {
    battle.winner = null;
  }
}

// =========================================
// RECORD COMBAT ACTION
// =========================================

function recordAction(
  battle,
  attacker,
  defender,
  attack,
  result,
  healthBefore,
) {
  const action = {
    round: battle.round,

    attackerId: attacker.id,
    defenderId: defender?.id ?? null,

    attackerName: attacker.name,
    defenderName: defender?.name ?? null,

    attackName: attack?.name ?? null,

    action: result?.action ?? "skipped",

    damage: defender
      ? Math.max(0, healthBefore - defender.health)
      : 0,

    attackerHealth: attacker.health,
    defenderHealth: defender?.health ?? null,

    attackerMana: attacker.mana,
    defenderMana: defender?.mana ?? null,

    evaded: result?.evaded ?? false,

    // New combat mechanics.
    stunnedAttacks: result?.stunnedAttacks ?? [],
    stunNotAppliedReason:
      result?.stunNotAppliedReason ?? null,

    buffsApplied: result?.buffsApplied ?? {},
    debuffsApplied: result?.debuffsApplied ?? {},
  };

  battle.currentAction = action;
  battle.log.push(action);

  return action;
}

// =========================================
// 1v1 WATCH BATTLE
// =========================================

function nextWatchDuelAction(battle) {
  const [fighterOne, fighterTwo] = battle.fighters;

  if (
    fighterOne.health <= 0 ||
    fighterTwo.health <= 0
  ) {
    finishBattle(battle);
    return battle;
  }

  if (battle.round > MAX_ROUNDS) {
    finishBattle(battle);
    return battle;
  }

  const order = getTurnOrder(battle.round);

  while (battle.turnPosition < order.length) {
    const attackerIndex = order[battle.turnPosition];

    const defenderIndex =
      attackerIndex === 0 ? 1 : 0;

    const attacker = battle.fighters[attackerIndex];
    const defender = battle.fighters[defenderIndex];

    const difficulty = battle.difficulties[attackerIndex];

    if (
      attacker.health <= 0 ||
      defender.health <= 0
    ) {
      finishBattle(battle);
      return battle;
    }

    const attackLimit = getAttackLimit(
      difficulty,
      battle.round === 1 &&
        battle.turnPosition === 0,
    );

    const attack =
      battle.attacksThisTurn < attackLimit
        ? chooseAttack(attacker, difficulty)
        : null;

    if (!attack) {
      battle.turnPosition += 1;
      battle.attacksThisTurn = 0;
      continue;
    }

    const healthBefore = defender.health;

    // Pass both fighters so stun can clean up
    // temporary effects correctly.
    const result = resolveBotAttack(
      attack,
      attacker,
      defender,
      battle.fighters,
    );

    if (!result) {
      attack.state = false;
      continue;
    }

    battle.attacksThisTurn += 1;

    recordAction(
      battle,
      attacker,
      defender,
      attack,
      result,
      healthBefore,
    );

    if (
      fighterOne.health <= 0 ||
      fighterTwo.health <= 0
    ) {
      finishBattle(battle);
    }

    return battle;
  }

  // Both fighters have finished their turns.
  advanceRound(battle.fighters);

  battle.round += 1;
  battle.turnPosition = 0;
  battle.attacksThisTurn = 0;

  if (battle.round > MAX_ROUNDS) {
    finishBattle(battle);
  }

  return battle;
}

// =========================================
// 2v2 WATCH BATTLE
// =========================================

function nextWatchTeamAction(battle) {
  const [teamOne, teamTwo] = battle.teams;

  if (
    teamIsDefeated(teamOne) ||
    teamIsDefeated(teamTwo)
  ) {
    finishTeamBattle(battle);
    return battle;
  }

  if (battle.round > MAX_ROUNDS) {
    finishTeamBattle(battle);
    return battle;
  }

  // Process internal transitions until an action
  // is available to display or the battle ends.
  while (!battle.finished) {
    const attackers = battle.teams[battle.teamTurn];
    const defenders = battle.teams[1 - battle.teamTurn];

    // Assign targets once at the start of each team's turn.
    if (
      battle.fighterPosition === 0 &&
      battle.attacksThisTurn === 0
    ) {
      battle.targetAssignments = assignUniqueTargets(
        attackers,
        defenders,
      );
    }

    // Every fighter on this team has been considered.
    if (
      battle.fighterPosition >= attackers.length
    ) {
      if (battle.teamTurn === 0) {
        // Team 1 finished. Team 2 acts next.
        battle.teamTurn = 1;
        battle.fighterPosition = 0;
        battle.attacksThisTurn = 0;
        battle.targetAssignments = {};
        continue;
      }

      // Both teams finished their turns.
      advanceRound(battle.fighters);

      battle.round += 1;
      battle.teamTurn = 0;
      battle.fighterPosition = 0;
      battle.attacksThisTurn = 0;
      battle.targetAssignments = {};

      if (battle.round > MAX_ROUNDS) {
        finishTeamBattle(battle);
      }

      return battle;
    }

    const attacker = attackers[battle.fighterPosition];

    const targetId =
      battle.targetAssignments[attacker.id];

    const defender = targetId
      ? findFighter(battle, targetId)
      : null;

    const difficulty =
      battle.difficulties[
        battle.fighters.indexOf(attacker)
      ];

    // A defeated fighter or fighter without a unique
    // target cannot attack.
    if (
      attacker.health <= 0 ||
      !defender ||
      defender.health <= 0
    ) {
      if (
        attacker.health > 0 &&
        !defender
      ) {
        const action = recordAction(
          battle,
          attacker,
          null,
          null,
          { action: "skipped" },
          attacker.health,
        );

        action.reason =
          "No unique target was available.";

        battle.fighterPosition += 1;
        battle.attacksThisTurn = 0;

        return battle;
      }

      battle.fighterPosition += 1;
      battle.attacksThisTurn = 0;
      continue;
    }

    const attackLimit = getAttackLimit(
      difficulty,
      battle.round === 1 &&
        battle.teamTurn === 0,
    );

    const attack =
      battle.attacksThisTurn < attackLimit
        ? chooseAttack(attacker, difficulty)
        : null;

    // This fighter has no more usable attacks.
    if (!attack) {
      battle.fighterPosition += 1;
      battle.attacksThisTurn = 0;
      continue;
    }

    const healthBefore = defender.health;

    // Pass every fighter, not just the attacker and target.
    const result = resolveBotAttack(
      attack,
      attacker,
      defender,
      battle.fighters,
    );

    if (!result) {
      attack.state = false;
      continue;
    }

    battle.attacksThisTurn += 1;

    recordAction(
      battle,
      attacker,
      defender,
      attack,
      result,
      healthBefore,
    );

    // The assigned target remains reserved for this
    // attacker. A teammate cannot take over mid-turn.
    if (defender.health <= 0) {
      battle.fighterPosition += 1;
      battle.attacksThisTurn = 0;
    }

    if (
      teamIsDefeated(teamOne) ||
      teamIsDefeated(teamTwo)
    ) {
      finishTeamBattle(battle);
    }

    return battle;
  }

  return battle;
}

// =========================================
// PUBLIC PLAYBACK FUNCTION
// =========================================

export function nextWatchAction(battle) {
  if (!battle || battle.finished) {
    return battle;
  }

  if (battle.mode === "2v2") {
    return nextWatchTeamAction(battle);
  }

  return nextWatchDuelAction(battle);
}

// =========================================
// FINISH 1v1 BATTLE
// =========================================

function finishBattle(battle) {
  battle.finished = true;

  const [fighterOne, fighterTwo] = battle.fighters;

  if (
    fighterOne.health <= 0 &&
    fighterTwo.health <= 0
  ) {
    battle.winner = null;
  } else if (fighterOne.health <= 0) {
    battle.winner = fighterTwo.name;
  } else if (fighterTwo.health <= 0) {
    battle.winner = fighterOne.name;
  } else if (fighterOne.health > fighterTwo.health) {
    battle.winner = fighterOne.name;
  } else if (fighterTwo.health > fighterOne.health) {
    battle.winner = fighterTwo.name;
  } else {
    battle.winner = null;
  }
}
