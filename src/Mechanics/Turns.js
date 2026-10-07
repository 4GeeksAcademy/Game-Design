



let turns = 1;



function regenerateMana(character) {

     character.mana = Math.min(
        character.maximumMana,
        character.mana + character.manaRegen
    );
}

function resetAttacks(attacks) {
  return attacks.map((attack) => ({
    ...attack,
    state: true,
  }));
}

function turn(playerOne, playerTwo) {

    if (playerOne.turnFinished && playerTwo.turnFinished) {

        turns++;

        regenerateMana(playerOne);
        regenerateMana(playerTwo);

        playerOne.turnFinished = false;
        playerTwo.turnFinished = false;
        playerOne.attacks = resetAttacks(playerOne.attacks);
        playerTwo.attacks = resetAttacks(playerTwo.attacks);
    }
}



export { regenerateMana, resetAttacks, turn };