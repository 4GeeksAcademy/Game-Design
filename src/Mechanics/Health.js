import React from "react";

function attackCharacter(ATK, attacker, defender, defense = 0) {
  if (!ATK || !attacker || !defender) {
    return null;
  }

  if (attacker.mana < ATK.cost) {
    console.log("Not enough mana!");
    return null;
  }

  if (ATK.state !== true) {
    console.log("Attack already used!");
    return null;
  }

  // Pay the mana cost once.
  attacker.mana -= ATK.cost;

  // Apply a buff instead of dealing damage.
  if (ATK.buff) {
    if (ATK.buff.defense) {
      attacker.defense = {
        ...attacker.defense,
        amount: attacker.defense.amount + ATK.buff.defense,
      };
    }

    ATK.state = false;

    return {
      attacker,
      defender,
      damageReceived: 0,
      action: "buff",
    };
  }

  // Calculate and apply normal attack damage.
  const damageReceived = Math.max(0, ATK.damage - defense);

  currentHealth(ATK, defender, defense);

  ATK.state = false;

  return {
    attacker,
    defender,
    damageReceived,
  };
}

function currentHealth(ATK, character, defense = 0) {
  if (ATK.state == true && ATK.damage > 0 && character.health > 0) {
    let damage = ATK.damage - defense;

    if (damage < 0) {
      damage = 0;
    }

    character.health = character.health - damage;

    if (character.health <= 0) {
      character.health = 0;
      console.log("Game over");
    }
  }
}

function evadeAttack(ATK, attacker, defender) {
  if (!ATK || !attacker || !defender || ATK.state !== true) {
    return null;
  }

  if (attacker.mana < ATK.cost) {
    console.log("Not enough attacker mana!");
    return null;
  }

  // Pay the attacker's mana cost.
  attacker.mana -= ATK.cost;

  // Calculate the agility needed to evade.
  const agilityNeeded = Math.max(0, ATK.speed - defender.agility);

  let evaded = false;
  let manaSpent = 0;

  if (agilityNeeded === 0) {
    evaded = true;
  } else if (defender.mana >= agilityNeeded) {
    defender.mana -= agilityNeeded;
    manaSpent = agilityNeeded;
    evaded = true;
  } else {
    // Spend all remaining mana, but the evade fails.
    manaSpent = defender.mana;
    defender.mana = 0;

    currentHealth(ATK, defender);
  }

  // Prevent this attack from being resolved a second time.
  ATK.state = false;

  console.log("Evade successful:", evaded);
  console.log("Mana spent on evasion:", manaSpent);

  return {
    attacker: attacker,
    defender: defender,
    evaded: evaded,
    manaSpent: manaSpent,
    damageReceived: evaded ? 0 : ATK.damage,
  };
}

export { attackCharacter, currentHealth, evadeAttack };
