import { attackCharacter, evadeAttack } from "./Health.js";

const MAX_QUEUE_SIZE = 10;
const ATTACK_TIMEOUT = 10000;



function normalDefendOrEvade(attack, attacker, defender) {
  if (!attack || !attacker || !defender) return null;

  const defense =
    typeof defender.defense === "object"
      ? defender.defense?.amount ?? 0
      : defender.defense ?? 0;

  const health = defender.health ?? 0;
  const mana = defender.mana ?? 0;
  const cooldown = defender.cooldown ?? 0;
  const damage = Math.max(0, attack.damage ?? 0);

  // Zero-damage moves should resolve without spending defense.
  if (damage === 0 || cooldown <= 0) {
    return attackCharacter(attack, attacker, defender);
  }

  const damageAfterBlock = Math.max(0, damage - defense);
  const blockPreventsKnockout =
    damage >= health && damageAfterBlock < health;

  const evadeManaNeeded = Math.max(
    0,
    (attack.speed ?? 0) - (defender.agility ?? 0),
  );

  // Never attempt an evade that would fail due to insufficient mana.
  const canEvade = mana >= evadeManaNeeded;
  const evadePreventsKnockout = canEvade && damage < health;

  const isFatal = damage >= health;

  let choice = "take-damage";

  if (isFatal) {
    // Survival comes first. Avoid spending resources if the
    // defensive move cannot prevent the knockout.
    if (blockPreventsKnockout && !evadePreventsKnockout) {
      choice = "defend";
    } else if (evadePreventsKnockout && !blockPreventsKnockout) {
      choice = "evade";
    } else if (blockPreventsKnockout && evadePreventsKnockout) {
      // Both work: prefer the option that preserves more mana.
      choice =
        evadeManaNeeded === 0 || evadeManaNeeded <= mana * 0.25
          ? "evade"
          : "defend";
    }
  } else {
    // Don't spend a defensive charge on trivial damage.
    const trivialDamage = Math.max(5, health * 0.1);

    if (damage <= trivialDamage) {
      choice = "take-damage";
    } else if (canEvade) {
      const manaIsAffordable =
        evadeManaNeeded <= mana * 0.25;

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
    result = attackCharacter(
      attack,
      attacker,
      defender,
      defense,
    );
  } else if (choice === "evade") {
    result = evadeAttack(attack, attacker, defender);
  } else {
    result = attackCharacter(attack, attacker, defender);
  }

  if (!result) return null;

  if (choice === "defend" || choice === "evade") {
    defender.cooldown = Math.max(0, cooldown - 1);
  }

  result.action =
    choice === "take-damage" ? "take damage" : choice;

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

  const usableAttacks = ai.attacks.filter(
    (attack) => attack.state === true
  );

  return getNormalAttackPriority(usableAttacks).slice(
    0,
    MAX_QUEUE_SIZE
  );
}

function chooseNormalAttack(fighter) {
  if (!fighter || !Array.isArray(fighter.attacks)) return null;

  const usableAttacks = fighter.attacks.filter(
    (attack) =>
      attack.state === true &&
      fighter.mana >= (attack.cost ?? 0)
  );

  return getNormalAttackPriority(usableAttacks)[0] ?? null;
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
  let timer = null;
  let stopped = false;
  let started = false;

  function clearAttackTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
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

    // Choose the next queued move that is still usable.
    const index = queue.findIndex(
      (attack) =>
        attack.state === true &&
        (attack.cost ?? 0) <= currentAI.mana,
    );

    if (index === -1) {
      finishTurn();
      return;
    }

    currentAttack = queue.splice(index, 1)[0];

    onShowAttack(currentAttack);

    timer = setTimeout(() => {
      if (stopped || !currentAttack) return;

      const attack = currentAttack;
      const attacker = readAI();
      const defender = readPlayer();

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

      const result = attackCharacter(attack, attacker, defender);

      currentAttack = null;

      if (result) {
        onResolveAttack(attack, attacker, defender);
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
    queue = aiChooseNormalAttacks(currentAI);

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
  createNormalAIController,
  normalDefendOrEvade,
};
