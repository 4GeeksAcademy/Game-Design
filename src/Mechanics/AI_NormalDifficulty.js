
import { attackCharacter } from "./Health.js";

const MAX_QUEUE_SIZE = 10;
const ATTACK_TIMEOUT = 10000;

function scoreAttack(attack) {
  let score = 0;

  score += Math.max(0, attack.damage || 0) * 1.5;
  score += Math.max(0, attack.speed || 0) * 0.5;

  if (attack.buff) score += 12;
  if (attack.debuff) score += 14;

  score -= Math.max(0, attack.cost || 0) * 0.6;

  return score;
}

function aiChooseNormalAttacks(ai) {
  if (!ai || !Array.isArray(ai.attacks)) return [];

  return ai.attacks
    .filter((attack) => attack.state === true)
    .sort((a, b) => scoreAttack(b) - scoreAttack(a))
    .slice(0, MAX_QUEUE_SIZE);
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
  aiChooseNormalAttacks,
  createNormalAIController,
};
