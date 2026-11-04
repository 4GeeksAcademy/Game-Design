import React from "react";

// function attackCharacter(ATK, attacker, defender, defense = 0) {
//   if (!ATK || !attacker || !defender) {
//     return null;
//   }

//   if (attacker.mana < ATK.cost) {
//     console.log("Not enough mana!");
//     return null;
//   }

//   if (ATK.state !== true) {
//     console.log("Attack already used!");
//     return null;
//   }

//   // Pay the mana cost once.
//   attacker.mana -= ATK.cost;

//   // Apply a buff instead of dealing damage.
//   if (ATK.buff) {
//     if (ATK.buff.defense) {
//       attacker.defense = {
//         ...attacker.defense,
//         amount: attacker.defense.amount + ATK.buff.defense,
//       };
//     }

//     ATK.state = false;

//     return {
//       attacker,
//       defender,
//       damageReceived: 0,
//       action: "buff",
//     };
//   }

//   // Calculate and apply normal attack damage.
//   const damageReceived = Math.max(0, ATK.damage - defense);

//   currentHealth(ATK, defender, defense);

//   ATK.state = false;

//   return {
//     attacker,
//     defender,
//     damageReceived,
//   };
// }

// function currentHealth(ATK, character, defense = 0) {
//   if (ATK.state == true && ATK.damage > 0 && character.health > 0) {
//     let damage = ATK.damage - defense;

//     if (damage < 0) {
//       damage = 0;
//     }

//     character.health = character.health - damage;

//     if (character.health <= 0) {
//       character.health = 0;
//       console.log("Game over");
//     }
//   }
// }

// function evadeAttack(ATK, attacker, defender) {
//   if (!ATK || !attacker || !defender || ATK.state !== true) {
//     return null;
//   }

//   if (attacker.mana < ATK.cost) {
//     console.log("Not enough attacker mana!");
//     return null;
//   }

//   // Pay the attacker's mana cost.
//   attacker.mana -= ATK.cost;

//   // Calculate the agility needed to evade.
//   const agilityNeeded = Math.max(0, ATK.speed - defender.agility);

//   let evaded = false;
//   let manaSpent = 0;

//   if (agilityNeeded === 0) {
//     evaded = true;
//   } else if (defender.mana >= agilityNeeded) {
//     defender.mana -= agilityNeeded;
//     manaSpent = agilityNeeded;
//     evaded = true;
//   } else {
//     // Spend all remaining mana, but the evade fails.
//     manaSpent = defender.mana;
//     defender.mana = 0;

//     currentHealth(ATK, defender);
//   }

//   // Prevent this attack from being resolved a second time.
//   ATK.state = false;

//   console.log("Evade successful:", evaded);
//   console.log("Mana spent on evasion:", manaSpent);

//   return {
//     attacker: attacker,
//     defender: defender,
//     evaded: evaded,
//     manaSpent: manaSpent,
//     damageReceived: evaded ? 0 : ATK.damage,
//   };
// }

// export { attackCharacter, currentHealth, evadeAttack };

function applyEffects(effects, character, direction = 1) {
  const applied = {};

  if (!effects || !character) return applied;

  const stats = [
    "maximumHealth",
    "maximumMana",
    "manaRegen",
    "health",
    "mana",
    "defense",
    "agility",
    "cooldown",
    "maximumCooldown",
    "recovery",
  ];

  stats.forEach((stat) => {
    const amount = effects[stat];

    if (typeof amount !== "number" || amount === 0) return;

    const change = amount * direction;

    // Increase or decrease the maximum health capacity.
    if (stat === "maximumHealth") {
      const previous = character.maximumHealth ?? character.health ?? 1;
      const next = Math.max(1, previous + change);

      character.maximumHealth = next;

      // Current health cannot exceed the new maximum.
      character.health = Math.min(character.health, next);

      applied.maximumHealth = next - previous;
    }

    // Increase or decrease the maximum mana capacity.
    else if (stat === "maximumMana") {
      const previous = character.maximumMana ?? character.mana ?? 1;
      const next = Math.max(1, previous + change);

      character.maximumMana = next;

      // Current mana cannot exceed the new maximum.
      character.mana = Math.min(character.mana, next);

      applied.maximumMana = next - previous;
    }

    // Mana regeneration can increase or decrease, but never go below zero.
    else if (stat === "manaRegen") {
      const previous = character.manaRegen ?? 0;
      const next = Math.max(0, previous + change);

      character.manaRegen = next;
      applied.manaRegen = next - previous;
    }

    // Existing health behavior.
    else if (stat === "health") {
      const previous = character.health;
      const maximum = character.maximumHealth ?? previous;

      character.health = Math.max(0, Math.min(maximum, previous + change));

      applied.health = character.health - previous;
    }

    // Existing mana behavior.
    else if (stat === "mana") {
      const previous = character.mana;
      const maximum = character.maximumMana ?? previous;

      character.mana = Math.max(0, Math.min(maximum, previous + change));

      applied.mana = character.mana - previous;
    }

    // Existing defense behavior.
    else if (stat === "defense") {
      const previous =
        typeof character.defense === "number"
          ? character.defense
          : (character.defense?.amount ?? 0);

      const next = Math.max(0, previous + change);

      if (typeof character.defense === "number") {
        character.defense = next;
      } else {
        character.defense = {
          ...character.defense,
          amount: next,
        };
      }

      applied.defense = next - previous;
    }

    // Existing behavior for agility, cooldown, and recovery.
    else {
      const previous = character[stat] ?? 0;
      const next = Math.max(0, previous + change);

      character[stat] = next;
      applied[stat] = next - previous;
    }
  });

  return applied;
}

function canUseAttack(attack) {
  if (!attack || attack.state !== true) return false;

  const remainingUses = attack.remainingUses ?? attack.uses;

  if (Number.isInteger(attack.uses) && remainingUses <= 0) {
    return false;
  }

  if ((attack.cooldownRemaining ?? 0) > 0) {
    return false;
  }

  return true;
}

function consumeAttack(attack) {
  // Reduce remaining uses when the attack has a uses limit.
  if (Number.isInteger(attack.uses)) {
    attack.remainingUses = Math.max(
      0,
      (attack.remainingUses ?? attack.uses) - 1,
    );
  }

  // Start the configured turn cooldown.
  if (Number(attack.turnCooldown) > 0) {
    attack.cooldownRemaining = Number(attack.turnCooldown);
    attack.cooldownStartedThisRound = true;
  }

  // Mark the attack as used for this round.
  attack.state = false;
}

function recordTemporaryEffects(attack, target, effects) {
  if (
    !attack ||
    !target ||
    !target.id ||
    !effects ||
    Number(attack.turnCooldown) <= 0
  ) {
    return;
  }

  const appliedEffects = Object.fromEntries(
    Object.entries(effects).filter(([, amount]) => amount !== 0),
  );

  if (Object.keys(appliedEffects).length === 0) return;

  attack.activeEffects ??= [];

  attack.activeEffects.push({
    targetId: target.id,
    effects: appliedEffects,
  });
}

function attackCharacter(ATK, attacker, defender, defense = 0, options = {}) {
  if (!ATK || !attacker || !defender) return null;

  if (attacker.mana < (ATK.cost ?? 0)) {
    console.log("Not enough mana!");
    return null;
  }

  if (!canUseAttack(ATK)) {
    console.log("Attack is unavailable!");
    return null;
  }

  // Calculate the health cost of a sacrifice attack.
  const sacrificeHealth = Math.max(0, Number(ATK.sacrifice?.health) || 0);

  // Prevent the attack from knocking out its own user.
  if (attacker.health <= sacrificeHealth) {
    console.log("Not enough health to use this sacrifice attack!");
    return null;
  }

  const blocked = options.blocked === true;

  // Pay both costs when the attack is activated.
  attacker.mana -= ATK.cost ?? 0;
  attacker.health -= sacrificeHealth;

  // A conditional buff only activates when the attack isn't blocked.
  const buffNotAppliedReason =
    ATK.buffRequiresHit && blocked ? "blocked" : null;

  const buffsApplied = buffNotAppliedReason
    ? {}
    : applyEffects(ATK.buff, attacker);

  recordTemporaryEffects(ATK, attacker, buffsApplied);

  // By default, debuffs can still affect a defender who blocks.
  // Set debuffRequiresHit to make the debuff require a successful hit.
  const debuffNotAppliedReason =
    ATK.debuffRequiresHit && blocked ? "blocked" : null;

  const debuffsApplied = debuffNotAppliedReason
    ? {}
    : applyEffects(ATK.debuff, defender, -1);
  let damageReceived = 0;
  recordTemporaryEffects(ATK, defender, debuffsApplied);

  if (ATK.damage > 0 && defender.health > 0) {
    damageReceived = Math.max(0, ATK.damage - defense);
    defender.health = Math.max(0, defender.health - damageReceived);
  }

  consumeAttack(ATK);

  if (defender.health <= 0) console.log("Game over");

  return {
    attacker,
    defender,
    damageReceived,
    buffsApplied,
    debuffsApplied,
    buffNotAppliedReason,
    debuffNotAppliedReason,
    sacrificePaid: sacrificeHealth,
    action: ATK.buff || ATK.debuff ? "effect" : "attack",
  };
}

function currentHealth(ATK, character, defense = 0) {
  if (
    ATK &&
    ATK.state === true &&
    ATK.damage > 0 &&
    character &&
    character.health > 0
  ) {
    const damage = Math.max(0, ATK.damage - defense);

    character.health = Math.max(0, character.health - damage);

    if (character.health <= 0) {
      console.log("Game over");
    }
  }
}

function evadeAttack(ATK, attacker, defender) {
  if (!ATK || !attacker || !defender || !canUseAttack(ATK)) {
    return null;
  }

  const attackCost = Number(ATK.cost) || 0;
  const attackSpeed = Number(ATK.speed) || 0;
  const attackerMana = Number(attacker.mana) || 0;
  const defenderMana = Number(defender.mana) || 0;
  const defenderAgility = Number(defender.agility) || 0;
  const defenderCooldown = Number(defender.cooldown) || 0;

  if (attackerMana < attackCost) {
    console.log("Not enough attacker mana!");
    return null;
  }

  // Calculate sacrifice health.
  const sacrificeHealth = Math.max(0, Number(ATK.sacrifice?.health) || 0);

  // Prevent the attacker from knocking themselves out.
  if (attacker.health <= sacrificeHealth) {
    console.log("Not enough health to use this sacrifice attack!");
    return null;
  }

  // Pay both costs when the attack is activated.
  attacker.mana = attackerMana - attackCost;
  attacker.health -= sacrificeHealth;

  const hasCooldown = defenderCooldown > 0;

  if (hasCooldown) {
    defender.cooldown = defenderCooldown - 1;
  }

  const usableAgility = hasCooldown ? defenderAgility : 0;
  const manaNeeded = Math.max(0, attackSpeed - usableAgility);
  const manaSpent = Math.min(defenderMana, manaNeeded);

  defender.mana = defenderMana - manaSpent;

  const evaded = usableAgility + manaSpent >= attackSpeed;

  // Conditional buffs only activate if the attack connects.
  const buffNotAppliedReason = ATK.buffRequiresHit && evaded ? "evaded" : null;

  const buffsApplied = buffNotAppliedReason
    ? {}
    : applyEffects(ATK.buff, attacker);

  recordTemporaryEffects(ATK, attacker, buffsApplied);

  // An evaded attack cannot apply debuffs.
  // A successful evade prevents debuffs.
  const debuffNotAppliedReason = evaded ? "evaded" : null;

  const debuffsApplied = evaded ? {} : applyEffects(ATK.debuff, defender, -1);
  recordTemporaryEffects(ATK, defender, debuffsApplied);

  let damageReceived = 0;

  if (!evaded && ATK.damage > 0 && defender.health > 0) {
    damageReceived = Math.max(0, Number(ATK.damage) || 0);
    defender.health = Math.max(0, defender.health - damageReceived);
  }

  consumeAttack(ATK);

  return {
    attacker,
    defender,
    evaded,
    manaSpent,
    damageReceived,
    buffsApplied,
    debuffsApplied,
    buffNotAppliedReason,
    debuffNotAppliedReason,
    sacrificePaid: sacrificeHealth,
    action: evaded ? "evade" : "attack",
  };
}

export {
  attackCharacter,
  currentHealth,
  evadeAttack,
  applyEffects,
  consumeAttack,
  canUseAttack,
};
