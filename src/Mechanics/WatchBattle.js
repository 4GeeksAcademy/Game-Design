
import {
  cloneFighter,
  chooseAttack,
  resolveBotAttack,
  advanceRound,
} from "./BattleSimulator.js";

const MAX_ROUNDS = 100;
const OPENING_TURN_ATTACK_LIMIT = 3;

const MAX_ATTACKS_PER_TURN = {
  Easy: 1,
  Normal: 6,
  Hard: 10,
};

// Create an independent battle without changing the original fighters.
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

// Normalize a difficulty setting for each fighter.
// A single string can be supplied for the whole team,
// or an array can provide an individual setting per fighter.
function normalizeDifficulties(difficulty, count) {
  if (Array.isArray(difficulty)) {
    return Array.from(
      { length: count },
      (_, index) => difficulty[index] ?? "Normal",
    );
  }

  return Array(count).fill(difficulty ?? "Normal");
}

/**
 * Create a 2v2 Watch Mode battle.
 *
 * Each team gets its turn as a team. Each living fighter
 * receives at most one unique target for that team's turn.
 */
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
    throw new Error("Watch Mode team battles require two fighters per team.");
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

    // Team 0 acts first, followed by Team 1.
    teamTurn: 0,
    fighterPosition: 0,
    attacksThisTurn: 0,

    // These targets are reserved for the current team's turn.
    targetAssignments: {},

    finished: false,
    winner: null,
    log: [],
    currentAction: null,
  };
}

// Determine who attacks first in a 1v1 battle.
function getTurnOrder(round) {
  return round % 2 === 1 ? [0, 1] : [1, 0];
}

// Choose one unique living opponent for each living attacker.
// A fighter without an available target must skip their turn.
function assignUniqueTargets(attackers, defenders) {
  const livingAttackers = attackers.filter(
    (fighter) => fighter.health > 0,
  );

  const availableTargets = defenders
    .filter((fighter) => fighter.health > 0)
    .slice();

  // Shuffle target order so the first teammate is not always favored.
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
  return battle.fighters.find((fighter) => fighter.id === fighterId);
}

function teamIsDefeated(team) {
  return team.every((fighter) => fighter.health <= 0);
}

// Determine the winner of a team battle.
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

  // If the round limit is reached, compare total surviving health.
  const teamOneHealth = teamOne.reduce(
    (total, fighter) => total + Math.max(0, fighter.health),
    0,
  );

  const teamTwoHealth = teamTwo.reduce(
    (total, fighter) => total + Math.max(0, fighter.health),
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

// Record an action so the UI can animate it and display it in the log.
function recordAction(battle, attacker, defender, attack, result, healthBefore) {
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
  };

  battle.currentAction = action;
  battle.log.push(action);

  return action;
}

// Advance a 1v1 battle by at most one visible combat action.
function nextWatchDuelAction(battle) {
  const [fighterOne, fighterTwo] = battle.fighters;

  if (fighterOne.health <= 0 || fighterTwo.health <= 0) {
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
    const defenderIndex = attackerIndex === 0 ? 1 : 0;

    const attacker = battle.fighters[attackerIndex];
    const defender = battle.fighters[defenderIndex];
    const difficulty = battle.difficulties[attackerIndex];

    if (attacker.health <= 0 || defender.health <= 0) {
      finishBattle(battle);
      return battle;
    }

    const difficultyAttackLimit =
  MAX_ATTACKS_PER_TURN[difficulty] ?? MAX_ATTACKS_PER_TURN.Easy;

const isOpeningTurn = battle.round === 1 && battle.turnPosition === 0;

const attackLimit = isOpeningTurn
  ? Math.min(OPENING_TURN_ATTACK_LIMIT, difficultyAttackLimit)
  : difficultyAttackLimit;

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
    const result = resolveBotAttack(attack, attacker, defender);

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

    if (fighterOne.health <= 0 || fighterTwo.health <= 0) {
      finishBattle(battle);
    }

    return battle;
  }

  advanceRound(battle.fighters);
  battle.round += 1;
  battle.turnPosition = 0;
  battle.attacksThisTurn = 0;

  if (battle.round > MAX_ROUNDS) {
    finishBattle(battle);
  }

  return battle;
}

// Advance a 2v2 battle by at most one visible combat action.
function nextWatchTeamAction(battle) {
  const [teamOne, teamTwo] = battle.teams;

  if (teamIsDefeated(teamOne) || teamIsDefeated(teamTwo)) {
    finishTeamBattle(battle);
    return battle;
  }

  if (battle.round > MAX_ROUNDS) {
    finishTeamBattle(battle);
    return battle;
  }

  // Keep processing internal turn transitions until an action is
  // available to show, or the battle ends.
  while (!battle.finished) {
    const attackers = battle.teams[battle.teamTurn];
    const defenders = battle.teams[1 - battle.teamTurn];

    // Assign targets once at the start of this team's turn.
    if (battle.fighterPosition === 0 && battle.attacksThisTurn === 0) {
      battle.targetAssignments = assignUniqueTargets(
        attackers,
        defenders,
      );
    }

    // Every fighter on this team has been considered.
    if (battle.fighterPosition >= attackers.length) {
      if (battle.teamTurn === 0) {
        // Team 1 has finished. Team 2 acts next.
        battle.teamTurn = 1;
        battle.fighterPosition = 0;
        battle.attacksThisTurn = 0;
        battle.targetAssignments = {};
        continue;
      }

      // Both teams have acted: begin the next round.
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
    const targetId = battle.targetAssignments[attacker.id];
    const defender = targetId ? findFighter(battle, targetId) : null;
    const difficulty = battle.difficulties[battle.fighters.indexOf(attacker)];

    // A fighter who is knocked out or has no unique target skips.
    if (
      attacker.health <= 0 ||
      !defender ||
      defender.health <= 0
    ) {
      if (attacker.health > 0 && !defender) {
        const action = recordAction(
          battle,
          attacker,
          null,
          null,
          { action: "skipped" },
          attacker.health,
        );

        action.reason = "No unique target was available.";

        battle.fighterPosition += 1;
        battle.attacksThisTurn = 0;

        return battle;
      }

      battle.fighterPosition += 1;
      battle.attacksThisTurn = 0;
      continue;
    }

    const difficultyAttackLimit =
  MAX_ATTACKS_PER_TURN[difficulty] ?? MAX_ATTACKS_PER_TURN.Easy;

const isOpeningTeamTurn = battle.round === 1 && battle.teamTurn === 0;

const attackLimit = isOpeningTeamTurn
  ? Math.min(OPENING_TURN_ATTACK_LIMIT, difficultyAttackLimit)
  : difficultyAttackLimit;


    const attack =
      battle.attacksThisTurn < attackLimit
        ? chooseAttack(attacker, difficulty)
        : null;

    // Move to the next teammate if this fighter has no more attacks.
    if (!attack) {
      battle.fighterPosition += 1;
      battle.attacksThisTurn = 0;
      continue;
    }

    const healthBefore = defender.health;
    const result = resolveBotAttack(attack, attacker, defender);

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

    // The target remains reserved. If defeated, this attacker stops;
    // their teammate does not take over that target during this turn.
    if (defender.health <= 0) {
      battle.fighterPosition += 1;
      battle.attacksThisTurn = 0;
    }

    if (teamIsDefeated(teamOne) || teamIsDefeated(teamTwo)) {
      finishTeamBattle(battle);
    }

    return battle;
  }

  return battle;
}

// Public function shared by the Watch Mode playback controls.
export function nextWatchAction(battle) {
  if (!battle || battle.finished) {
    return battle;
  }

  if (battle.mode === "2v2") {
    return nextWatchTeamAction(battle);
  }

  return nextWatchDuelAction(battle);
}

function finishBattle(battle) {
  battle.finished = true;

  const [fighterOne, fighterTwo] = battle.fighters;

  if (fighterOne.health <= 0 && fighterTwo.health <= 0) {
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
