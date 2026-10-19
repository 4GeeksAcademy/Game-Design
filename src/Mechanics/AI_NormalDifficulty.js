import { attackCharacter } from "./Health.js";

const MAX_QUEUE_SIZE = 10;
const ATTACK_TIMEOUT = 10000;

// Higher scores indicate attacks the AI should prefer.
function scoreAttack(attack) {
  let score = 0;

  score += Math.max(0, attack.damage || 0) * 1.5;
  score += Math.max(0, attack.speed || 0) * 0.5;

  // Reward useful effects.
  if (attack.buff) score += 12;
  if (attack.debuff) score += 14;

  // Avoid spending lots of mana on weak moves.
  score -= Math.max(0, attack.cost || 0) * 0.6;

  return score;
}

function aiChooseNormalAttacks(ai) {
  let available = ai.attacks.filter(
    (attack) => attack.state === true && attack.cost <= ai.mana,
  );

  // Save mana rather than waste it on a very weak move.
  if (available.length > 0 && scoreAttack(available[0]) < 8) {
    return [];
  }

  // Prefer the moves with the highest strategic value.
  available.sort((a, b) => scoreAttack(b) - scoreAttack(a));

  const queue = [];
  let plannedMana = ai.mana;

  for (const attack of available) {
    if (queue.length >= MAX_QUEUE_SIZE) break;

    // Never plan an attack the AI cannot afford.
    if (attack.cost > plannedMana) continue;

    queue.push(attack);
    plannedMana -= attack.cost;
  }

  return queue;
}

function createNormalAIController({
  ai,
  player,
  onShowAttack,
  onResolveAttack,
  onFinish,
}) {
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

  function finishTurn() {
    if (stopped) return;

    stopped = true;
    clearAttackTimer();
    currentAttack = null;
    queue = [];

    onShowAttack(null);
    onFinish();
  }

  function advance() {
    if (stopped) return;

    clearAttackTimer();
    currentAttack = null;

    // Don't continue a turn after a knockout.
    if (player.health <= 0 || ai.health <= 0) {
      finishTurn();
      return;
    }

    // Skip attacks that became unavailable while queued.
    while (queue.length > 0) {
      const nextAttack = queue.shift();

      if (nextAttack.state === true && nextAttack.cost <= ai.mana) {
        currentAttack = nextAttack;
        break;
      }
    }

    // No useful queued attack remains: end immediately.
    if (!currentAttack) {
      finishTurn();
      return;
    }

    onShowAttack(currentAttack);

    timer = setTimeout(() => {
      if (stopped || !currentAttack) return;

      const attack = currentAttack;
      currentAttack = null;
      timer = null;

      // The attack resolves automatically after 10 seconds.
      if (player.health > 0 && ai.health > 0) {
        attackCharacter(attack, ai, player);
        onResolveAttack(attack);
      }

      if (player.health <= 0 || ai.health <= 0) {
        finishTurn();
        return;
      }

      // Continue immediately instead of adding another delay.
      advance();
    }, ATTACK_TIMEOUT);
  }

  function start() {
    if (started || stopped) return;

    started = true;
    queue = aiChooseNormalAttacks(ai);

    if (queue.length === 0) {
      finishTurn();
      return;
    }

    advance();
  }

  function respondToDefense() {
    if (stopped || !currentAttack) return false;

    // The defense handler resolves the attack before calling this.
    // Clear its timeout and show the next attack immediately.
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
  aiChooseNormalAttacks,
  createNormalAIController,
};
