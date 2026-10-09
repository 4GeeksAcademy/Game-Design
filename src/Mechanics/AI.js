import { attackCharacter, evadeAttack } from "./Health.js";

function aiChooseAttack(ai) {
  let availableAttacks = ai.attacks.filter((attack) => {
    return attack.state === true && ai.mana >= attack.cost;
  });

  if (availableAttacks.length === 0) {
    console.log("AI has no available attacks!");
    return null;
  }

  let randomAttack =
    availableAttacks[Math.floor(Math.random() * availableAttacks.length)];

  return randomAttack;
}

// AI randomly chooses to defend or evade.

function aiDefendOrEvade(attack, attacker, defender) {
  // Buff cards should activate directly without being blocked or evaded.
  if (attack.buff) {
    return attackCharacter(attack, attacker, defender);
  }

  let result;

  // Only defend or evade if defensive charges are available.
  if (defender.cooldown > 0) {
    if (Math.random() < 0.5) {
      // Defend
      const damageReceived = Math.max(
        0,
        attack.damage - defender.defense.amount,
      );

      result = attackCharacter(
        attack,
        attacker,
        defender,
        defender.defense.amount,
      );

      if (result) {
        defender.cooldown -= 1;
        result.damageReceived = damageReceived;
        result.action = "defend";
      }
    } else {
      // Evade
      result = evadeAttack(attack, attacker, defender);

      if (result) {
        defender.cooldown -= 1;
        result.action = "evade";
      }
    }
  } else {
    // No defensive charges left: take the attack normally.
    result = attackCharacter(attack, attacker, defender);

    if (result) {
      result.action = "take damage";
    }
  }

  if (result) {
    console.log("AI defensive choice:", result.action);
    console.log("Damage received:", result.damageReceived);
  }

  return result;
}

function aiTurn(ai, player, showAttack, hideAttack) {
  let attack = aiChooseAttack(ai);

  if (attack) {
    showAttack(attack);

    setTimeout(() => {
      if (player.blocked === false) {
        attackCharacter(attack, ai, player);
      }

      player.blocked = false;

      aiFinishTurn(ai);
      hideAttack();
    }, 7000);
  }
}

function aiFinishTurn(ai) {
  ai.turnFinished = true;
}

export { aiChooseAttack, aiTurn, aiFinishTurn, aiDefendOrEvade };
