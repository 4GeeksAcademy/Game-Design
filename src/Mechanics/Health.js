import React from "react";

function attackCharacter(ATK, attacker, defender, defense = 0) {
  if (attacker.mana >= ATK.cost && ATK.state === true) {
    attacker.mana = attacker.mana - ATK.cost;

    currentHealth(ATK, defender, defense);

    ATK.state = false;

    return {
      attacker: attacker,
      defender: defender,
    };
  } else if (attacker.mana < ATK.cost) {
    console.log("Not enough mana!");
    return null;
  }

  if (ATK.state === false) {
    console.log("Attack already used!");
    return null;
  }
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
