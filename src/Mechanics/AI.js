import { attackCharacter, evadeAttack, canUseAttack } from "./Health.js";

function aiChooseAttack(ai) {
  let availableAttacks = ai.attacks.filter((attack) => {
    return canUseAttack(attack) && ai.mana >= (attack.cost ?? 0);
  });

  if (availableAttacks.length === 0) {
    console.log("AI has no available attacks!");
    return null;
  }

  let randomAttack =
    availableAttacks[Math.floor(Math.random() * availableAttacks.length)];

  return randomAttack;
}

function aiChooseHealTarget(ai, teammates) {
  if (!ai || !Array.isArray(teammates)) return null;

  // Easy AI doesn't evaluate health percentages.
  // It simply chooses a random living teammate.
  const availableTeammates = teammates.filter(
    (fighter) => fighter.id !== ai.id && fighter.health > 0,
  );

  if (availableTeammates.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * availableTeammates.length);

  return availableTeammates[randomIndex];
}

function aiChooseStunTargets(defender, stun) {
  if (
    !defender ||
    !Array.isArray(defender.attacks) ||
    !stun ||
    stun.type !== "selected"
  ) {
    return [];
  }

  const eligibleAttacks = defender.attacks
    .filter((attack) => attack && (attack.stunned?.remainingRounds ?? 0) <= 0)
    .map((attack) => {
      let score = 0;

      score += Math.max(0, attack.damage ?? 0) * 1.5;
      score += Math.max(0, attack.speed ?? 0) * 0.5;

      if (attack.buff) score += 12;
      if (attack.debuff) score += 14;
      if (attack.heal) score += 16;
      if (attack.stun) score += 18;

      score -= Math.max(0, attack.cost ?? 0) * 0.6;

      return {
        attack,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const amount = Math.max(1, Number(stun.amount) || 1);

  return eligibleAttacks
    .slice(0, amount)
    .map(({ attack }) => attack.id ?? attack.name);
}

// AI randomly chooses to defend or evade.

// function aiDefendOrEvade(attack, attacker, defender) {
//   // Buff cards should activate directly without being blocked or evaded.
//   if (attack.buff) {
//     return attackCharacter(attack, attacker, defender);
//   }

//   let result;

//   // Only defend or evade if defensive charges are available.
//   if (defender.cooldown > 0) {
//     if (Math.random() < 0.5) {
//       // Defend
//       const damageReceived = Math.max(
//         0,
//         attack.damage - defender.defense.amount,
//       );

//       result = attackCharacter(
//         attack,
//         attacker,
//         defender,
//         defender.defense.amount,
//       );

//       if (result) {
//         defender.cooldown -= 1;
//         result.damageReceived = damageReceived;
//         result.action = "defend";
//       }
//     } else {
//       // Evade
//       result = evadeAttack(attack, attacker, defender);

//       if (result) {
//         defender.cooldown -= 1;
//         result.action = "evade";
//       }
//     }
//   } else {
//     // No defensive charges left: take the attack normally.
//     result = attackCharacter(attack, attacker, defender);

//     if (result) {
//       result.action = "take damage";
//     }
//   }

//   if (result) {
//     console.log("AI defensive choice:", result.action);
//     console.log("Damage received:", result.damageReceived);
//   }

//   return result;
// }

function aiTurn(ai, player, showAttack, hideAttack) {
  const attack = aiChooseAttack(ai);

  // No usable attack: finish immediately.
  if (!attack) {
    console.log(`${ai.name} has no available attacks. Ending turn.`);

    aiFinishTurn(ai);
    hideAttack();
    return;
  }

  showAttack(attack);

  setTimeout(() => {
    // Apply damage only if the player did not defend or evade.
    if (player.blocked === false) {
      const selectedAttackIds = aiChooseStunTargets(player, attack.stun);

      attackCharacter(attack, ai, player, 0, {
        selectedAttackIds,
        fighters: [ai, player],
      });
    }

    player.blocked = false;

    aiFinishTurn(ai);
    hideAttack();
  }, 7000);
}

function aiFinishTurn(ai) {
  ai.turnFinished = true;
}

function aiDefendOrEvade(attack, attacker, defender, options = {}) {
  // Pure effect abilities resolve directly.
  if ((attack.buff || attack.debuff) && !(attack.damage > 0)) {
    return attackCharacter(attack, attacker, defender, 0, options);
  }

  let result;

  if (defender.cooldown > 0) {
    if (Math.random() < 0.5) {
      const defense =
        typeof defender.defense === "object"
          ? (defender.defense?.amount ?? 0)
          : (defender.defense ?? 0);

      const damageReceived = Math.max(0, attack.damage - defense);

      result = attackCharacter(attack, attacker, defender, defense, {
        ...options,
        blocked: true,
      });

      if (result) {
        result.defender.cooldown = Math.max(
          0,
          (result.defender.cooldown ?? 0) - 1,
        );
        result.damageReceived = damageReceived;
        result.action = "defend";
      }
    } else {
      result = evadeAttack(attack, attacker, defender, options);

      if (result) {
        result.action = result.evaded ? "evade" : "attack";
      }
    }
  } else {
    result = attackCharacter(attack, attacker, defender, 0, options);

    if (result) {
      result.action = "take damage";
    }
  }

  return result;
}

export {
  aiChooseAttack,
  aiChooseHealTarget,
  aiTurn,
  aiFinishTurn,
  aiDefendOrEvade,
  aiChooseStunTargets,
};
