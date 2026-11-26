import { applyEffects } from "./Health.js";
import { getModifiedCharacterStat, tickSelfModifiers } from "./Modifiers.js";

let turns = 1;

function regenerateMana(character) {
  const manaRegen =
    character.manaRegen == null
      ? 0
      : getModifiedCharacterStat(character, "manaRegen");

  const maximumMana =
    character.maximumMana == null
      ? character.mana
      : getModifiedCharacterStat(character, "maximumMana");

  character.mana = Math.min(maximumMana, character.mana + manaRegen);
}

function recoverCooldown(character) {
  const recovery =
    character.recovery == null
      ? 1
      : getModifiedCharacterStat(character, "recovery");

  const maximumCooldown =
    character.maximumCooldown == null
      ? 3
      : getModifiedCharacterStat(character, "maximumCooldown");

  character.cooldown = Math.min(
    maximumCooldown,
    (character.cooldown ?? 0) + recovery,
  );

  console.log(
    character.name,
    "recovered",
    recovery,
    "cooldown. Current cooldown:",
    character.cooldown,
    "/",
    maximumCooldown,
  );
}


function resetAttacks(attacks, fighters = []) {
  return attacks.map((attack) => {
    let cooldownRemaining = Math.max(0, Number(attack.cooldownRemaining) || 0);
    let stunRemaining = Math.max(0, Number(attack.stunned?.remainingRounds) || 0);

    // A cooldown is not reduced at the end of the same round in which it
    // began. Keep at least the configured duration if a counter was cleared.
    const cooldownStartedThisRound = attack.cooldownStartedThisRound === true;
    const configuredCooldown = Math.max(0, Number(attack.turnCooldown) || 0);
    const previousCooldown = cooldownRemaining;

    if (cooldownStartedThisRound && configuredCooldown > 0) {
      cooldownRemaining = Math.max(cooldownRemaining, configuredCooldown);
    } else if (cooldownRemaining > 0) {
      cooldownRemaining = Math.max(0, cooldownRemaining - 1);
    }

    if (stunRemaining > 0) stunRemaining -= 1;

    const usesAvailable =
      attack.remainingUses === undefined ||
      attack.remainingUses === null ||
      attack.remainingUses > 0;

    let activeEffects = attack.activeEffects ?? [];

    // Reverse temporary effects when the cooldown finishes.
    if (
      !cooldownStartedThisRound &&
      previousCooldown > 0 &&
      cooldownRemaining === 0
    ) {
      activeEffects.forEach(({ targetId, effects }) => {
        const target = fighters.find((fighter) => fighter.id === targetId);
        if (target) applyEffects(effects, target, -1);
      });
      activeEffects = [];
    }

    return {
      ...attack,
      cooldownRemaining,
      stunned:
        stunRemaining > 0
          ? { ...attack.stunned, remainingRounds: stunRemaining }
          : null,
      cooldownStartedThisRound: false,
      activeEffects,
      state:
        usesAvailable &&
        cooldownRemaining <= 0 &&
        stunRemaining <= 0 &&
        !cooldownStartedThisRound,
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
    
    // Reduce temporary modifier durations after this round's
    // regeneration and cooldown recovery have been completed.
    tickSelfModifiers(playerOne);
    tickSelfModifiers(playerTwo);

    playerOne.turnFinished = false;
    playerTwo.turnFinished = false;

    const fighters = [playerOne, playerTwo];

    playerOne.attacks = resetAttacks(playerOne.attacks, fighters);
    playerTwo.attacks = resetAttacks(playerTwo.attacks, fighters);
  }
}

export { regenerateMana, recoverCooldown, resetAttacks, turn };
