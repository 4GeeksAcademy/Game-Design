
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
  return attacks.map((attack) => {
    let cooldownRemaining = attack.cooldownRemaining ?? 0;

    // Don't reduce a cooldown during the same round it was started.
    if (attack.cooldownStartedThisRound) {
      return {
        ...attack,
        cooldownStartedThisRound: false,
        state:
          (attack.remainingUses === undefined ||
            attack.remainingUses === null ||
            attack.remainingUses > 0) &&
          cooldownRemaining <= 0,
      };
    }

    // Reduce cooldown by one completed round.
    if (cooldownRemaining > 0) {
      cooldownRemaining -= 1;
    }

    const usesAvailable =
      attack.remainingUses === undefined ||
      attack.remainingUses === null ||
      attack.remainingUses > 0;

    return {
      ...attack,
      cooldownRemaining,
      state: usesAvailable && cooldownRemaining <= 0,
    };
  });
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

