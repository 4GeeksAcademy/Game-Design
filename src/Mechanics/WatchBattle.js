import {
  cloneFighter,
  chooseAttack,
  resolveBotAttack,
  advanceRound,
} from "./BattleSimulator.js";

const MAX_ROUNDS = 100;
const MAX_ATTACKS_PER_TURN = {
  Easy: 1,
  Normal: 4,
  Hard: 4,
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

// Determine who attacks first during the current round.
function getTurnOrder(round) {
  return round % 2 === 1 ? [0, 1] : [1, 0];
}

// Advance the battle by one attack.
export function nextWatchAction(battle) {
  if (battle.finished) {
    return battle;
  }

  const [fighterOne, fighterTwo] = battle.fighters;

  // Stop immediately if either fighter has been knocked out.
  if (fighterOne.health <= 0 || fighterTwo.health <= 0) {
    finishBattle(battle);
    return battle;
  }

  // Prevent an endless battle.
  if (battle.round > MAX_ROUNDS) {
    finishBattle(battle);
    return battle;
  }

  const order = getTurnOrder(battle.round);

  // Find the next fighter who can take an action.
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

    const attackLimit =
      MAX_ATTACKS_PER_TURN[difficulty] ?? MAX_ATTACKS_PER_TURN.Easy;

    const attack =
      battle.attacksThisTurn < attackLimit
        ? chooseAttack(attacker, difficulty)
        : null;

    // No more usable attacks: move to the other fighter.
    if (!attack) {
      battle.turnPosition += 1;
      battle.attacksThisTurn = 0;
      continue;
    }

    const healthBefore = defender.health;
    const result = resolveBotAttack(attack, attacker, defender);

    // Safely skip a failed action.
    if (!result) {
      attack.state = false;
      continue;
    }

    battle.attacksThisTurn += 1;

    // Save the details for the arena and combat log.
    const action = {
      round: battle.round,
      attackerId: attacker.id,
      defenderId: defender.id,
      attackerName: attacker.name,
      defenderName: defender.name,
      attackName: attack.name,
      action: result.action,
      damage: Math.max(0, healthBefore - defender.health),
      attackerHealth: attacker.health,
      defenderHealth: defender.health,
      evaded: result.evaded ?? false,
    };

    battle.currentAction = action;
    battle.log.push(action);

    // End the battle immediately after a knockout.
    if (fighterOne.health <= 0 || fighterTwo.health <= 0) {
      finishBattle(battle);
    }

    return battle;
  }

  // Both fighters have completed their turns.
  advanceRound(battle.fighters);
  battle.round += 1;
  battle.turnPosition = 0;
  battle.attacksThisTurn = 0;

  if (battle.round > MAX_ROUNDS) {
    finishBattle(battle);
  }

  return battle;
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
