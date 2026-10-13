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

  if (!effects || !character) {
    return applied;
  }

  const stats = [
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

    if (typeof amount !== "number" || amount === 0) {
      return;
    }

    const change = amount * direction;

    if (stat === "health") {
      const previous = character.health;
      const maximum = character.maximumHealth ?? previous;

      character.health = Math.max(
        0,
        Math.min(maximum, previous + change)
      );

      applied.health = character.health - previous;
    } else if (stat === "mana") {
      const previous = character.mana;
      const maximum = character.maximumMana ?? previous;

      character.mana = Math.max(
        0,
        Math.min(maximum, previous + change)
      );

      applied.mana = character.mana - previous;
    } else if (stat === "defense") {
      const previous =
        typeof character.defense === "number"
          ? character.defense
          : character.defense?.amount ?? 0;

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
    } else {
      const previous = character[stat] ?? 0;
      character[stat] = Math.max(0, previous + change);
      applied[stat] = character[stat] - previous;
    }
  });

  return applied;
}

function attackCharacter(ATK, attacker, defender, defense = 0) {
  if (!ATK || !attacker || !defender) {
    return null;
  }

  if (attacker.mana < (ATK.cost ?? 0)) {
    console.log("Not enough mana!");
    return null;
  }

  if (ATK.state !== true) {
    console.log("Attack already used!");
    return null;
  }

  // Pay the attack cost once.
  attacker.mana -= ATK.cost ?? 0;

  // Apply the attacker's buffs and opponent's debuffs.
  // Apply the attacker's buffs and opponent's debuffs.
const buffsApplied = applyEffects(ATK.buff, attacker);
const debuffsApplied = applyEffects(ATK.debuff, defender, -1);
  // Buffs and debuffs do not prevent normal attack damage.
  let damageReceived = 0;

  if (ATK.damage > 0 && defender.health > 0) {
    damageReceived = Math.max(0, ATK.damage - defense);

    defender.health = Math.max(
      0,
      defender.health - damageReceived
    );
  }

  ATK.state = false;

  if (defender.health <= 0) {
    console.log("Game over");
  }

  return {
    attacker,
    defender,
    damageReceived,
    buffsApplied,
    debuffsApplied,
    action:
      ATK.buff || ATK.debuff
        ? "effect"
        : "attack",
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
  if (!ATK || !attacker || !defender || ATK.state !== true) {
    return null;
  }

  if (attacker.mana < (ATK.cost ?? 0)) {
    console.log("Not enough attacker mana!");
    return null;
  }

  attacker.mana -= ATK.cost ?? 0;

  const agilityNeeded = Math.max(
    0,
    ATK.speed - defender.agility
  );

  let evaded = false;
  let manaSpent = 0;

  if (agilityNeeded === 0) {
    evaded = true;
  } else if (defender.mana >= agilityNeeded) {
    defender.mana -= agilityNeeded;
    manaSpent = agilityNeeded;
    evaded = true;
  } else {
    manaSpent = defender.mana;
    defender.mana = 0;
  }

  // Effects resolve even when the attack's damage is evaded.
  let buffsApplied = {};
let debuffsApplied = {};

// Only apply effects if the attack was not successfully evaded.
if (!evaded) {
  buffsApplied = applyEffects(ATK.buff, attacker);
  debuffsApplied = applyEffects(ATK.debuff, defender, -1);
}

  let damageReceived = 0;

  if (!evaded && ATK.damage > 0 && defender.health > 0) {
    damageReceived = Math.max(0, ATK.damage);
    defender.health = Math.max(0, defender.health - damageReceived);
  }

  ATK.state = false;

  return {
    attacker,
    defender,
    evaded,
    manaSpent,
    damageReceived,
    buffsApplied,
    debuffsApplied,
    action: evaded ? "evade" : "attack",
  };
}

export { attackCharacter, currentHealth, evadeAttack, applyEffects };

