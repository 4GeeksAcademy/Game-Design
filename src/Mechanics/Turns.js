import React from "react";



let turns = 1;



function regenerateMana(HP) {

    HP.mana = HP.mana + HP.manaRegen;

    if (HP.mana > HP.maximumMana) {
        HP.mana = HP.maximumMana;
    }
}


function turn(playerOne, playerTwo) {

    if (playerOne.turnFinished && playerTwo.turnFinished) {

        turns++;

        regenerateMana(playerOne);
        regenerateMana(playerTwo);

        playerOne.turnFinished = false;
        playerTwo.turnFinished = false;
        attack.state = true
    }
}