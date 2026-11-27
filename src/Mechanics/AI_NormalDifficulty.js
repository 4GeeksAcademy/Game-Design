import { attackCharacter, evadeAttack, canFighterUseAttack } from "./Health.js";
import { aiChooseStunTargets } from "./AI.js";
import { getModifiedAttackStat, getModifiedCharacterStat } from "./Modifiers.js";

const MAX_QUEUE_SIZE = 10;
const ATTACK_TIMEOUT = 10000;

function hasMeaningfulDebuff(attack, defender) {
  if (!attack?.debuff || !defender) return false;

  // Normal only considers the three lighter strategic debuffs. Recovery and
  // cooldown manipulation are deliberately reserved for Hard difficulty.
  const normalAwareStats = new Set(["defense", "agility", "manaRegen"]);

  return Object.entries(attack.debuff).some(([stat, rawAmount]) => {
    if (!normalAwareStats.has(stat)) return false;
    const amount = Math.abs(Number(rawAmount) || 0);
    if (amount <= 0) return false;

    const currentValue = getModifiedCharacterStat(defender, stat);
    if (currentValue <= 0) return false;

    // Debuffs are flat reductions and applyEffects clamps stats at zero.
    // Measure the actual reduction, not an amount that exceeds the stat.
    const effectiveReduction = Math.min(amount, currentValue);
    return (effectiveReduction / currentValue) * 100 > 5;
  });
}

function normalDefendOrEvade(attack, attacker, defender, options = {}) {
  if (!attack || !attacker || !defender) return null;

  const defense = getModifiedCharacterStat(defender, "defense");

  const health = defender.health ?? 0;
  const mana = defender.mana ?? 0;
  const cooldown = getModifiedCharacterStat(defender, "cooldown");
  const damage = getModifiedAttackStat(attack, attacker, "damage");

  const meaningfulDebuff = hasMeaningfulDebuff(attack, defender);

  // A zero-damage attack can still be strategically dangerous. If its
  // debuff is significant, spend a defensive charge when a block can stop
  // it; otherwise evade if the available mana can guarantee success.
  if (damage === 0) {
    if (!meaningfulDebuff || cooldown <= 0) {
      return attackCharacter(attack, attacker, defender, 0, options);
    }

    const attackSpeed = getModifiedAttackStat(attack, attacker, "speed");
    const agility = getModifiedCharacterStat(defender, "agility");
    const evadeManaNeeded = Math.max(0, attackSpeed - agility);
    const canEvade = mana >= evadeManaNeeded;

    if (attack.debuffRequiresHit === true) {
      const result = attackCharacter(attack, attacker, defender, 0, {
        ...options,
        blocked: true,
      });
      if (result) {
        defender.cooldown = Math.max(0, cooldown - 1);
        result.action = "defend";
      }
      return result;
    }

    if (canEvade) {
      const result = evadeAttack(attack, attacker, defender, options);
      if (result) result.action = result.evaded ? "evade" : "take damage";
      return result;
    }

    return attackCharacter(attack, attacker, defender, 0, options);
  }

  if (cooldown <= 0) {
    return attackCharacter(attack, attacker, defender, 0, options);
  }

  const damageAfterBlock = Math.max(0, damage - defense);
  const blockPreventsKnockout = damage >= health && damageAfterBlock < health;

  const attackSpeed = getModifiedAttackStat(attack, attacker, "speed");
  const agility = getModifiedCharacterStat(defender, "agility");
  const evadeManaNeeded = Math.max(0, attackSpeed - agility);

  // Never attempt an evade that would fail due to insufficient mana.
  const canEvade = mana >= evadeManaNeeded;
  // A successful evade prevents the entire attack, including lethal damage.
  const evadePreventsKnockout = canEvade;

  const isFatal = damage >= health;

  let choice = "take-damage";

  if (isFatal) {
    // A meaningful hit-gated debuff can be stopped by blocking. An
    // ungated debuff survives a block, so evade it whenever possible.
    if (meaningfulDebuff && attack.debuffRequiresHit !== true && canEvade) {
      choice = "evade";
    } else if (
      meaningfulDebuff &&
      attack.debuffRequiresHit === true &&
      blockPreventsKnockout
    ) {
      choice = "defend";
    } else if (blockPreventsKnockout && !evadePreventsKnockout) {
      choice = "defend";
    } else if (evadePreventsKnockout && !blockPreventsKnockout) {
      choice = "evade";
    } else if (blockPreventsKnockout && evadePreventsKnockout) {
      // Both work: preserve the debuff immunity when blocking is enough;
      // otherwise favor the cheaper defensive option.
      choice =
        meaningfulDebuff && attack.debuffRequiresHit === true
          ? "defend"
          : evadeManaNeeded === 0 || evadeManaNeeded <= mana * 0.25
            ? "evade"
            : "defend";
    }
  } else {
    // Don't spend a defensive charge on trivial damage.
    const trivialDamage = Math.max(5, health * 0.1);

    if (meaningfulDebuff && attack.debuffRequiresHit === true) {
      // Blocking is sufficient to prevent a hit-gated debuff and costs no mana.
      choice = "defend";
    } else if (meaningfulDebuff && canEvade) {
      // Ungated debuffs pass through blocks, so a successful evade is needed.
      choice = "evade";
    } else if (damage <= trivialDamage) {
      choice = "take-damage";
    } else if (canEvade) {
      const manaIsAffordable = evadeManaNeeded <= mana * 0.25;

      // Evade when it prevents meaningful damage at a reasonable
      // mana cost, especially when blocking would leave damage.
      if (
        damageAfterBlock > 0 &&
        manaIsAffordable &&
        damageAfterBlock >= damage * 0.25
      ) {
        choice = "evade";
      } else if (damageAfterBlock < damage) {
        choice = "defend";
      }
    } else if (damageAfterBlock < damage) {
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
    result = evadeAttack(attack, attacker, defender, options);
  } else {
    result = attackCharacter(attack, attacker, defender, 0, options);
  }

  if (!result) return null;

  if (choice === "defend") {
    defender.cooldown = Math.max(0, cooldown - 1);
  }

  result.action = choice === "take-damage" ? "take damage" : choice;

  return result;
}

function scoreAttack(attack) {
  let score = 0;

  score += Math.max(0, attack.damage || 0) * 1.5;
  score += Math.max(0, attack.speed || 0) * 0.5;

  if (attack.buff) score += 12;
  if (attack.debuff) score += 14;

  score -= Math.max(0, attack.cost || 0) * 0.6;

  return score;
}

function getNormalAttackPriority(attacks) {
  const damagingAttacks = attacks
    .filter((attack) => (attack.damage ?? 0) > 0)
    .sort((a, b) => scoreAttack(b) - scoreAttack(a));

  const utilityAttacks = attacks
    .filter((attack) => (attack.damage ?? 0) <= 0)
    .sort((a, b) => scoreAttack(b) - scoreAttack(a));

  return [...damagingAttacks, ...utilityAttacks];
}

function aiChooseNormalAttacks(ai) {
  if (!ai || !Array.isArray(ai.attacks)) return [];

  const usableAttacks = ai.attacks.filter((attack) => canFighterUseAttack(ai, attack));

  return getNormalAttackPriority(usableAttacks).slice(0, MAX_QUEUE_SIZE);
}

function chooseNormalAttack(fighter) {
  if (!fighter || !Array.isArray(fighter.attacks)) return null;

  const usableAttacks = fighter.attacks.filter(
    (attack) => canFighterUseAttack(fighter, attack),
  );

  return getNormalAttackPriority(usableAttacks)[0] ?? null;
}

function getEffectiveHeal(attack, fighter) {
  if (!attack?.heal || !fighter || fighter.health <= 0) return 0;

  const maximumHealth = fighter.maximumHealth ?? fighter.health;
  const missingHealth = Math.max(0, maximumHealth - fighter.health);

  const healingAmount =
    (attack.heal.amount ?? 0) + (attack.heal.buff?.health ?? 0);

  return Math.min(missingHealth, healingAmount);
}

function chooseNormalTeamAction(fighter, teammates) {
  if (!fighter || !Array.isArray(fighter.attacks)) return null;
  if (!Array.isArray(teammates)) return null;

  const usableAttacks = fighter.attacks.filter(
    (attack) => canFighterUseAttack(fighter, attack),
  );

  if (usableAttacks.length === 0) return null;

  // Start by considering ordinary attacks.
  let bestAction = {
    attack:
      getNormalAttackPriority(
        usableAttacks.filter((attack) => !attack.heal),
      )[0] ?? null,
    healTargetId: null,
    score: -Infinity,
  };

  if (bestAction.attack) {
    bestAction.score = scoreAttack(bestAction.attack);
  }

  // Now evaluate healing attacks.
  const healingAttacks = usableAttacks.filter((attack) => attack.heal);

  for (const attack of healingAttacks) {
    let healValue = 0;
    let healTargetId = null;

    if (attack.heal.target === "selected") {
      const possibleTargets = teammates.filter(
        (ally) => ally.id !== fighter.id && ally.health > 0,
      );

      // Find the teammate who would benefit the most.
      for (const ally of possibleTargets) {
        const effectiveHeal = getEffectiveHeal(attack, ally);

        if (effectiveHeal > healValue) {
          healValue = effectiveHeal;
          healTargetId = ally.id;
        }
      }
    } else if (attack.heal.target === "all") {
      // Add up the useful healing across all living teammates,
      // including the healer.
      healValue = teammates
        .filter((ally) => ally.health > 0)
        .reduce((total, ally) => total + getEffectiveHeal(attack, ally), 0);
    }

    // Healing must provide an actual benefit to be considered.
    if (healValue <= 0) continue;

    const healingScore = healValue * 1.5 - (attack.cost ?? 0) * 0.6;

    if (healingScore > bestAction.score) {
      bestAction = {
        attack,
        healTargetId,
        score: healingScore,
      };
    }
  }

  if (!bestAction.attack) return null;

  return {
    attack: bestAction.attack,
    healTargetId: bestAction.healTargetId,
  };
}

function createNormalAIController({
  getAI,
  getPlayer,
  ai,
  player,
  onShowAttack,
  onResolveAttack,
  onFinish,
}) {
  // Get the latest fighter objects whenever needed.
  const readAI = getAI ?? (() => ai);
  const readPlayer = getPlayer ?? (() => player);

  let queue = [];
  let currentAttack = null;
  let currentAttackKey = null;
  let timer = null;
  let stopped = false;
  let started = false;

  function clearAttackTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function getAttackKey(attack) {
    return attack?.id ?? attack?.name ?? attack;
  }

  function findLiveAttack(fighter, key) {
    return fighter?.attacks?.find((attack) => getAttackKey(attack) === key) ?? null;
  }

  function isBattleOver() {
    const currentAI = readAI();
    const currentPlayer = readPlayer();

    return (
      !currentAI ||
      !currentPlayer ||
      currentAI.health <= 0 ||
      currentPlayer.health <= 0
    );
  }

  function finishTurn() {
    if (stopped) return;

    stopped = true;
    clearAttackTimer();
    currentAttack = null;
    currentAttackKey = null;
    queue = [];

    onShowAttack(null);
    onFinish(readAI(), readPlayer());
  }

  function advance() {
    if (stopped) return;

    clearAttackTimer();
    currentAttack = null;

    if (isBattleOver()) {
      finishTurn();
      return;
    }

    const currentAI = readAI();

    // Resolve each queued ID against the fighter's current attack list.
    // This prevents an outdated queue snapshot from bypassing cooldowns.
    const index = queue.findIndex((key) => {
      const liveAttack = findLiveAttack(currentAI, key);
      return canFighterUseAttack(currentAI, liveAttack);
    });

    if (index === -1) {
      finishTurn();
      return;
    }

    currentAttackKey = queue.splice(index, 1)[0];
    currentAttack = findLiveAttack(currentAI, currentAttackKey);

    if (!currentAttack || !canFighterUseAttack(readAI(), currentAttack)) {
      currentAttack = null;
      currentAttackKey = null;
      advance();
      return;
    }

    onShowAttack(currentAttack);

    timer = setTimeout(() => {
      if (stopped || !currentAttack) return;

      const queuedAttackKey = currentAttackKey;
      const attacker = readAI();
      const defender = readPlayer();
      const attack = findLiveAttack(attacker, queuedAttackKey);

      timer = null;

      if (
        !attacker ||
        !defender ||
        attacker.health <= 0 ||
        defender.health <= 0
      ) {
        finishTurn();
        return;
      }

      // Re-check the current move immediately before execution.
      if (
        !attack ||
        !canFighterUseAttack(attacker, attack)
      ) {
        currentAttack = null;
        currentAttackKey = null;
        advance();
        return;
      }

      const selectedAttackIds = aiChooseStunTargets(defender, attack.stun);

      const result = attackCharacter(attack, attacker, defender, 0, {
        selectedAttackIds,
        fighters: [attacker, defender],
      });

      currentAttack = null;
      currentAttackKey = null;

      if (result) {
        onResolveAttack(attack, attacker, defender, result);
      }

      if (isBattleOver()) {
        finishTurn();
        return;
      }

      advance();
    }, ATTACK_TIMEOUT);
  }

  function start() {
    if (started || stopped) return;

    started = true;

    const currentAI = readAI();
    queue = aiChooseNormalAttacks(currentAI).map(getAttackKey);

    if (queue.length === 0) {
      finishTurn();
      return;
    }

    advance();
  }

  function respondToDefense() {
    if (stopped || !currentAttack) return false;

    // The defense handler has already resolved the attack.
    advance();
    return true;
  }

  function stop() {
    if (stopped) return;

    stopped = true;
    clearAttackTimer();
    currentAttack = null;
    currentAttackKey = null;
    queue = [];
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
  MAX_QUEUE_SIZE,
  ATTACK_TIMEOUT,
  scoreAttack,
  getNormalAttackPriority,
  aiChooseNormalAttacks,
  chooseNormalAttack,
  chooseNormalTeamAction,
  createNormalAIController,
  normalDefendOrEvade,
};
