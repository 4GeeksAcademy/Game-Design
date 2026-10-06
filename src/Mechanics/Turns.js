import React from "react";



let turns = 1;



function regenerateMana(character) {

     character.mana = Math.min(
        character.maximumMana,
        character.mana + character.manaRegen
    );
}


function turn(playerOne, playerTwo) {

    if (playerOne.turnFinished && playerTwo.turnFinished) {

        turns++;

        regenerateMana(playerOne);
        regenerateMana(playerTwo);

        playerOne.turnFinished = false;
        playerTwo.turnFinished = false;
        
    }
}

export { regenerateMana, turn };