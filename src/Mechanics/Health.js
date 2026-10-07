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

export { attackCharacter, currentHealth };
