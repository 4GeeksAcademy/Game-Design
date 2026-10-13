
let turns = 1;

function regenerateMana(character) {
  character.mana = Math.min(
    character.maximumMana,
    character.mana + character.manaRegen
  );
}

function recoverCooldown(character) {
  const recovery = character.recovery ?? 1;
  const maximumCooldown = character.maximumCooldown ?? 3;

  character.cooldown = Math.min(
    maximumCooldown,
    (character.cooldown ?? 0) + recovery
  );

  console.log(
    character.name,
    "recovered",
    recovery,
    "cooldown. Current cooldown:",
    character.cooldown,
    "/",
    maximumCooldown
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

    recoverCooldown(playerOne);
    recoverCooldown(playerTwo);

    playerOne.turnFinished = false;
    playerTwo.turnFinished = false;

    playerOne.attacks = resetAttacks(playerOne.attacks);
    playerTwo.attacks = resetAttacks(playerTwo.attacks);
  }
}

export {
  regenerateMana,
  recoverCooldown,
  resetAttacks,
  turn,
};

