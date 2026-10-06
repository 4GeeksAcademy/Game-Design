import React from "react";




function attackCharacter(ATK, attacker, defender) {

    if (attacker.mana >= ATK.cost) {

        attacker.mana = attacker.mana - ATK.cost;

        ATK.state = true;
        currentHealth(ATK, defender);
        ATK.state = false;

    } else {
        console.log("Not enough mana!");
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