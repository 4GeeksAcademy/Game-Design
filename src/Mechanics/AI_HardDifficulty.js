import { attackCharacter, evadeAttack, canFighterUseAttack } from "./Health.js";
import { aiChooseStunTargets } from "./AI.js";
import { getModifiedAttackStat, getModifiedCharacterStat } from "./Modifiers.js";

const HARD_MAX_ATTACKS_PER_TURN = 10;
const HARD_ATTACK_TIMEOUT = 10000;
const LOW_HEALTH_THRESHOLD = 0.3;
const DEBUFF_WEIGHTS = {
  defense: 0.85,
  agility: 0.9,
  manaRegen: 1.05,
  recovery: 1.3,
  cooldown: 1.45,
  maximumCooldown: 1.15,
  maximumMana: 0.9,
  maximumHealth: 0.9,
  health: 1.2,
};

function getAverageAttackSpeed(fighter) {
  const attacks = (fighter?.attacks ?? []).filter((attack) =>
    attack && (attack.stunned?.remainingRounds ?? 0) <= 0 &&
    (attack.remainingUses ?? attack.uses ?? 1) > 0
  );
  if (!attacks.length) return 0;

  const total = attacks.reduce(
    (sum, attack) => sum + Math.max(0, getModifiedAttackStat(attack, fighter, "speed")),
    0,
  );
  return total / attacks.length;
}

function getHardEvadeManaCost(attack, attacker, defender) {
  const attackSpeed = Math.max(0, getModifiedAttackStat(attack, attacker, "speed"));
  const agility = Math.max(0, getModifiedCharacterStat(defender, "agility"));
  const cooldown = Math.max(0, getModifiedCharacterStat(defender, "cooldown"));

  // Health.evadeAttack only counts agility while a defensive cooldown charge
  // exists. At zero cooldown, the defender must fund the full attack speed.
  return Math.max(0, attackSpeed - (cooldown > 0 ? agility : 0));
}

function getHardManaReserve(fighter, opponent, attacksUsedThisTurn = 0) {
  const currentMana = Math.max(0, Number(fighter?.mana) || 0);
  const maximumMana = Math.max(0, Number(fighter?.maximumMana ?? currentMana) || 0);
  const maximumHealth = Math.max(1, Number(fighter?.maximumHealth ?? fighter?.health) || 1);
  const healthPercent = Math.max(0, Number(fighter?.health) || 0) / maximumHealth;
  const opponentAverageSpeed = getAverageAttackSpeed(opponent);

  let reserveRatio = 0.15;

  // If a typical incoming move is faster than this fighter's entire mana
  // capacity, preserve a small current-mana reserve but plan to block or
  // accept damage too; mana alone cannot be the defensive plan.
  if (maximumMana > 0 && opponentAverageSpeed > maximumMana) {
    reserveRatio = Math.max(reserveRatio, 0.2);
  }

  // Experimental survival stance: after two attacks at critical health,
  // preserve an additional 20 percentage points of current mana.
  if (healthPercent <= LOW_HEALTH_THRESHOLD && attacksUsedThisTurn >= 2) {
    reserveRatio = Math.min(0.6, reserveRatio + 0.2);
  }

  return currentMana * reserveRatio;
}

function getHardDebuffThreat(attack, defender) {
  if (!attack?.debuff || !defender) return { score: 0, significant: false };

  let score = 0;
  let significant = false;

  for (const [stat, rawAmount] of Object.entries(attack.debuff)) {
    const amount = Math.abs(Number(rawAmount) || 0);
    const currentValue = Math.max(0, getModifiedCharacterStat(defender, stat));
    if (!amount || !currentValue) continue;

    const reduction = Math.min(amount, currentValue);
    const ratio = reduction / currentValue;
    const weight = DEBUFF_WEIGHTS[stat] ?? 0.7;

    if (ratio > 0.05) significant = true;
    score += ratio * 28 * weight;
  }

  return { score, significant };
}

function hardDefendOrEvade(attack, attacker, defender, options = {}, context = {}) {
  if (!attack || !attacker || !defender) return null;

  const health = Math.max(0, Number(defender.health) || 0);
  const maximumHealth = Math.max(1, Number(defender.maximumHealth ?? health) || 1);
  const healthPercent = health / maximumHealth;
  const mana = Math.max(0, Number(defender.mana) || 0);
  const cooldown = Math.max(0, getModifiedCharacterStat(defender, "cooldown"));
  const defense = Math.max(0, getModifiedCharacterStat(defender, "defense"));
  const damage = Math.max(0, getModifiedAttackStat(attack, attacker, "damage"));
  const blockedDamage = Math.max(0, damage - defense);
  const damagePercent = health > 0 ? damage / health : 1;
  const debuff = getHardDebuffThreat(attack, defender);
  const evadeCost = getHardEvadeManaCost(attack, attacker, defender);
  const canEvade = mana >= evadeCost;
  const averageSpeed = getAverageAttackSpeed(attacker);
  const reserve = getHardManaReserve(defender, attacker, context.attacksUsedThisTurn ?? 0);
  const manaAfterEvade = Math.max(0, mana - evadeCost);
  const evadeKeepsReserve = manaAfterEvade >= reserve;
  const fatal = damage >= health && health > 0;
  const blockSurvives = cooldown > 0 && blockedDamage < health;
  const evadeSurvives = canEvade;
  const isCriticalDebuff = debuff.score >= 22 ||
    (attack.debuff && (attack.debuff.recovery || attack.debuff.cooldown));

  let choice = "take-damage";

  if (fatal) {
    // Survival overrides the reserve. If either defense can prevent the KO,
    // compare the resource cost and choose the option that keeps the fighter alive.
    if (evadeSurvives && !blockSurvives) {
      choice = "evade";
    } else if (blockSurvives && !evadeSurvives) {
      choice = "defend";
    } else if (evadeSurvives && blockSurvives) {
      choice = evadeKeepsReserve && evadeCost < Math.max(1, cooldown * 12)
        ? "evade"
        : "defend";
    } else if (canEvade) {
      choice = "evade";
    } else if (cooldown > 0 && blockedDamage < damage) {
      choice = "defend";
    }
  } else if (debuff.significant) {
    if (attack.debuffRequiresHit === true && cooldown > 0) {
      choice = "defend";
    } else if (canEvade && (evadeKeepsReserve || isCriticalDebuff)) {
      choice = "evade";
    } else if (cooldown > 0 && blockedDamage < damage) {
      choice = "defend";
    }
  } else if (damage > 0) {
    // A light hit (10–20% of current HP) is usually accepted while healthy.
    if (healthPercent > 0.75 && damagePercent <= 0.2) {
      choice = "take-damage";
    } else if (damagePercent >= 0.4) {
      if (cooldown > 0 && blockedDamage <= damage * 0.65) {
        choice = "defend";
      } else if (canEvade && (evadeKeepsReserve || damagePercent >= 0.65)) {
        choice = "evade";
      } else if (cooldown > 0 && blockedDamage < damage) {
        choice = "defend";
      }
    } else if (damagePercent > 0.2) {
      if (cooldown > 0 && blockedDamage <= damage * 0.5) {
        choice = "defend";
      } else if (canEvade && evadeKeepsReserve && blockedDamage > 0) {
        choice = "evade";
      } else if (cooldown > 0 && blockedDamage < damage) {
        choice = "defend";
      }
    } else if (healthPercent <= LOW_HEALTH_THRESHOLD && canEvade && evadeKeepsReserve) {
      choice = "evade";
    }
  }

  // A zero-damage attack may still carry a dangerous cooldown/recovery debuff.
  if (damage === 0 && debuff.significant && choice === "take-damage") {
    if (canEvade && (evadeKeepsReserve || isCriticalDebuff)) {
      choice = "evade";
    } else if (attack.debuffRequiresHit === true && cooldown > 0) {
      choice = "defend";
    }
  }

  let result;
  if (choice === "defend") {
    result = attackCharacter(attack, attacker, defender, defense, {
      ...options,
      blocked: true,
    });
  } else if (choice === "evade") {
    // Never call evadeAttack with insufficient mana: its failure path spends
    // all remaining mana and still allows the attack to connect.
    result = canEvade
      ? evadeAttack(attack, attacker, defender, options)
      : attackCharacter(attack, attacker, defender, 0, options);
  } else {
    result = attackCharacter(attack, attacker, defender, 0, options);
  }

  if (!result) return null;

  if (choice === "defend") {
    result.defender.cooldown = Math.max(0, cooldown - 1);
  }

  result.action = choice === "take-damage" ? "take damage" : choice;
  result.hardAI = {
    averageIncomingSpeed: averageSpeed,
    evadeManaCost: evadeCost,
    manaReserve: reserve,
    manaAfterEvade,
    debuffThreat: debuff.score,
  };
  return result;
}

function getOpponentResponse(attack, attacker, defender) {
  const speed = Math.max(0, getModifiedAttackStat(attack, attacker, "speed"));
  const damage = Math.max(0, getModifiedAttackStat(attack, attacker, "damage"));
  const defense = Math.max(0, getModifiedCharacterStat(defender, "defense"));
  const cooldown = Math.max(0, getModifiedCharacterStat(defender, "cooldown"));
  const evadeCost = getHardEvadeManaCost(attack, attacker, defender);
  const canEvade = (Number(defender.mana) || 0) >= evadeCost;

  let evadeChance = canEvade ? 0.28 : 0.04;
  let blockChance = cooldown > 0 ? 0.25 : 0;

  // Faster attacks are harder to evade; low speed relative to agility is easier.
  const agility = Math.max(0, getModifiedCharacterStat(defender, "agility"));
  if (speed > 0) {
    const speedMargin = speed - (cooldown > 0 ? agility : 0);
    if (speedMargin <= 0) evadeChance *= 0.65;
    else if (speedMargin >= 25) evadeChance *= 0.75;
  }

  const totalDefenseChance = Math.min(0.7, evadeChance + blockChance);
  const hitChance = 1 - totalDefenseChance;
  const expectedDamage = damage * hitChance +
    Math.max(0, damage - defense) * blockChance;
  return {
    expectedDamage,
    killChance: damage >= (Number(defender.health) || 0) ? hitChance : 0,
  };
}

function getHardAttackUtility(attack, attacker, defender) {
  const damage = Math.max(0, getModifiedAttackStat(attack, attacker, "damage"));
  const cost = Math.max(0, getModifiedAttackStat(attack, attacker, "cost"));
  const response = getOpponentResponse(attack, attacker, defender);
  const debuff = getHardDebuffThreat(attack, defender);
  let utility = response.expectedDamage * 1.8;
  utility += response.killChance * 100;
  utility += debuff.score;
  if (attack.stun) utility += 12;
  if (attack.buff) utility += 8;
  if (attack.heal) utility += 10;
  utility -= cost * 0.45;
  if (damage <= 0 && !attack.buff && !attack.debuff && !attack.heal && !attack.stun) {
    utility -= 100;
  }
  return utility;
}

function chooseHardAttack(attacker, defender, options = {}) {
  if (!attacker || !defender || !Array.isArray(attacker.attacks)) return null;

  const attacksUsedThisTurn = Math.max(0, Number(options.attacksUsedThisTurn) || 0);
  const reserve = getHardManaReserve(attacker, defender, attacksUsedThisTurn);
  const usable = attacker.attacks.filter((attack) =>
    canFighterUseAttack(attacker, attack)
  );
  if (!usable.length) return null;

  const candidates = usable
    .map((attack) => ({
      attack,
      cost: Math.max(0, getModifiedAttackStat(attack, attacker, "cost")),
      utility: getHardAttackUtility(attack, attacker, defender),
      damage: Math.max(0, getModifiedAttackStat(attack, attacker, "damage")),
    }))
    .sort((a, b) => b.utility - a.utility)
    .slice(0, 8);

  const mana = Math.max(0, Number(attacker.mana) || 0);
  const maximumHealth = Math.max(1, Number(attacker.maximumHealth ?? attacker.health) || 1);
  const criticalHealth = (Number(attacker.health) || 0) / maximumHealth <= LOW_HEALTH_THRESHOLD;
  const survivalReserve = criticalHealth && attacksUsedThisTurn >= 2
    ? Math.max(reserve, mana * 0.35)
    : reserve;

  let best = null;

  // Evaluate one- and two-action sequences. Re-plan after each resolved move
  // using live state, so a dodge, block, buff or knockout invalidates stale plans.
  for (let i = 0; i < candidates.length; i++) {
    const first = candidates[i];
    const firstKills = first.damage >= (Number(defender.health) || 0);
    const firstRemainingMana = mana - first.cost;
    const firstPreservesReserve = firstRemainingMana >= survivalReserve;
    const firstScore = first.utility -
      (!firstPreservesReserve && !firstKills ? 55 : 0);

    if (!best || firstScore > best.score) {
      best = { attack: first.attack, score: firstScore };
    }

    if (firstKills) continue;

    for (let j = 0; j < candidates.length; j++) {
      if (j === i) continue;
      const second = candidates[j];
      const totalCost = first.cost + second.cost;
      if (totalCost > mana) continue;

      const secondResponse = getOpponentResponse(second.attack, attacker, defender);
      const expectedTotalDamage = Math.min(
        Number(defender.health) || 0,
        getOpponentResponse(first.attack, attacker, defender).expectedDamage +
          secondResponse.expectedDamage,
      );
      const sequenceKills = expectedTotalDamage >= (Number(defender.health) || 0);
      const remainingMana = mana - totalCost;
      const preservesReserve = remainingMana >= survivalReserve;
      const comboBonus = first.damage > 0 && second.damage > 0 ? 9 : 0;
      const score = first.utility + second.utility * 0.72 + comboBonus +
        (sequenceKills ? 85 : 0) -
        (!preservesReserve && !sequenceKills ? 65 : 0);

      if (!best || score > best.score) {
        best = { attack: first.attack, score };
      }
    }
  }

  return best?.attack ?? null;
}

function getHardAttackPriority(attacker, defender, options = {}) {
  const remaining = [];
  const seen = new Set();
  let mana = Math.max(0, Number(attacker?.mana) || 0);
  const reserve = getHardManaReserve(attacker, defender, options.attacksUsedThisTurn ?? 0);
  const sorted = (attacker?.attacks ?? [])
    .filter((attack) => canFighterUseAttack(attacker, attack))
    .map((attack) => ({
      attack,
      cost: Math.max(0, getModifiedAttackStat(attack, attacker, "cost")),
      utility: getHardAttackUtility(attack, attacker, defender),
      damage: Math.max(0, getModifiedAttackStat(attack, attacker, "damage")),
    }))
    .sort((a, b) => b.utility - a.utility);

  for (const item of sorted) {
    const key = item.attack.id ?? item.attack.name;
    if (seen.has(key) || item.cost > mana) continue;
    const canFinish = item.damage >= (Number(defender?.health) || 0);
    if (mana - item.cost < reserve && !canFinish) continue;
    seen.add(key);
    remaining.push(item.attack);
    mana -= item.cost;
  }
  return remaining;
}

function getHardEffectiveHeal(attack, fighter) {
  if (!attack?.heal || !fighter || fighter.health <= 0) return 0;
  const maxHealth = Math.max(1, Number(fighter.maximumHealth ?? fighter.health) || 1);
  const missing = Math.max(0, maxHealth - (Number(fighter.health) || 0));
  const amount = Math.max(0, Number(attack.heal.amount) || 0) +
    Math.max(0, Number(attack.heal.buff?.health) || 0);
  return Math.min(missing, amount);
}

function chooseHardTeamAction(fighter, teammates, opponents = []) {
  if (!fighter || !Array.isArray(fighter.attacks)) return null;
  const livingOpponents = opponents.filter((opponent) => opponent.health > 0);
  const target = livingOpponents[0] ?? null;
  const attack = target ? chooseHardAttack(fighter, target) : null;
  let bestAction = attack
    ? { attack, healTargetId: null, score: getHardAttackUtility(attack, fighter, target) }
    : { attack: null, healTargetId: null, score: -Infinity };

  for (const healAttack of fighter.attacks.filter((move) =>
    move.heal && canFighterUseAttack(fighter, move)
  )) {
    let healValue = 0;
    let healTargetId = null;
    let bestSingleHeal = 0;
    const possibleTargets = healAttack.heal.target === "all"
      ? teammates.filter((ally) => ally.health > 0)
      : teammates.filter((ally) => ally.id !== fighter.id && ally.health > 0);

    for (const ally of possibleTargets) {
      const effective = getHardEffectiveHeal(healAttack, ally);
      if (effective > 0) {
        healValue += effective;
        if (healAttack.heal.target === "selected" && effective > bestSingleHeal) {
          bestSingleHeal = effective;
          healTargetId = ally.id;
        }
      }
    }

    const score = healValue * 1.8 - getModifiedAttackStat(healAttack, fighter, "cost") * 0.5;
    if (healValue > 0 && score > bestAction.score) {
      bestAction = { attack: healAttack, healTargetId, score };
    }
  }

  return bestAction.attack ? bestAction : null;
}

function createHardAIController({
  getAI,
  getPlayer,
  ai,
  player,
  onShowAttack,
  onResolveAttack,
  onFinish,
}) {
  const readAI = getAI ?? (() => ai);
  const readPlayer = getPlayer ?? (() => player);
  let currentAttack = null;
  let timer = null;
  let stopped = false;
  let started = false;
  let attacksResolved = 0;

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function isBattleOver() {
    const currentAI = readAI();
    const currentPlayer = readPlayer();
    return !currentAI || !currentPlayer ||
      currentAI.health <= 0 || currentPlayer.health <= 0;
  }

  function finishTurn() {
    if (stopped) return;
    stopped = true;
    clearTimer();
    currentAttack = null;
    onShowAttack(null);
    onFinish(readAI(), readPlayer());
  }

  function advance() {
    if (stopped) return;
    clearTimer();
    currentAttack = null;

    if (isBattleOver() || attacksResolved >= HARD_MAX_ATTACKS_PER_TURN) {
      finishTurn();
      return;
    }

    const attacker = readAI();
    const defender = readPlayer();
    const attack = chooseHardAttack(attacker, defender, {
      attacksUsedThisTurn: attacksResolved,
    });

    if (!attack || !canFighterUseAttack(attacker, attack)) {
      finishTurn();
      return;
    }

    currentAttack = attack;
    onShowAttack(attack);

    timer = setTimeout(() => {
      if (stopped || !currentAttack) return;
      const liveAttacker = readAI();
      const liveDefender = readPlayer();
      const liveAttack = liveAttacker?.attacks?.find((candidate) =>
        (candidate.id ?? candidate.name) === (attack.id ?? attack.name)
      );

      timer = null;
      if (!liveAttacker || !liveDefender || !canFighterUseAttack(liveAttacker, liveAttack)) {
        currentAttack = null;
        advance();
        return;
      }

      const selectedAttackIds = aiChooseStunTargets(liveDefender, liveAttack.stun);
      const result = attackCharacter(liveAttack, liveAttacker, liveDefender, 0, {
        selectedAttackIds,
        fighters: [liveAttacker, liveDefender],
      });

      currentAttack = null;
      if (result) {
        attacksResolved += 1;
        onResolveAttack(liveAttack, liveAttacker, liveDefender, result);
      }

      if (isBattleOver()) {
        finishTurn();
        return;
      }
      advance();
    }, HARD_ATTACK_TIMEOUT);
  }

  function start() {
    if (started || stopped) return;
    started = true;
    advance();
  }

  function respondToDefense() {
    if (stopped || !currentAttack) return false;
    // The player's defense handler already resolved this incoming attack.
    attacksResolved += 1;
    advance();
    return true;
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    clearTimer();
    currentAttack = null;
  }

  return {
    start,
    advance,
    respondToDefense,
    stop,
    getCurrentAttack: () => currentAttack,
  };
}

export {
  HARD_MAX_ATTACKS_PER_TURN,
  getAverageAttackSpeed,
  getHardEvadeManaCost,
  getHardManaReserve,
  getHardDebuffThreat,
  hardDefendOrEvade,
  getHardAttackUtility,
  chooseHardAttack,
  getHardAttackPriority,
  chooseHardTeamAction,
  createHardAIController,
};
