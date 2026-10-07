import React from "react";



let turns = 1;



function regenerateMana(character) {

     character.mana = Math.min(
        character.maximumMana,
        character.mana + character.manaRegen
    );
}

function resetAttacks(attacks) {
  attacks.forEach((attack) => {
    attack.state = true;
  });
}

function turn(playerOne, playerTwo, attacks) {

    if (playerOne.turnFinished && playerTwo.turnFinished) {

        turns++;

        regenerateMana(playerOne);
        regenerateMana(playerTwo);

        playerOne.turnFinished = false;
        playerTwo.turnFinished = false;
        resetAttacks(attacks)
    }
}



export { regenerateMana, resetAttacks, turn };