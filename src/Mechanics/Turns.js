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
    let cooldownRemaining = attack.cooldownRemaining ?? 0;

    // Don't reduce cooldown during the round it was started.
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

    const previousCooldown = cooldownRemaining;

    // Reduce cooldown by one completed round.
    if (cooldownRemaining > 0) {
      cooldownRemaining -= 1;
    }

    const usesAvailable =
      attack.remainingUses === undefined ||
      attack.remainingUses === null ||
      attack.remainingUses > 0;

    let activeEffects = attack.activeEffects ?? [];

    // Reverse temporary effects when the cooldown finishes.
    if (previousCooldown > 0 && cooldownRemaining === 0) {
      activeEffects.forEach(({ targetId, effects }) => {
        const target = fighters.find((fighter) => fighter.id === targetId);

        if (target) {
          applyEffects(effects, target, -1);
        }
      });

      activeEffects = [];
    }

    return {
      ...attack,
      cooldownRemaining,
      activeEffects,
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
