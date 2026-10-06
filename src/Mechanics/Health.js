import React from "react";

  function attackCharacter(ATK, attacker, defender) {
    if (attacker.mana >= ATK.cost && ATK.state === true) {
      attacker.mana = attacker.mana - ATK.cost;

      currentHealth(ATK, defender);

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

function currentHealth(ATK, character) {
  if (ATK.state == true && ATK.damage > 0 && character.health > 0) {
    character.health = character.health - ATK.damage;

    if (character.health <= 0) {
      character.health = 0;
      console.log("Game over");
    }
  }
}


export { attackCharacter, currentHealth };