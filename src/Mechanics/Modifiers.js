
/**
 * Self-only temporary stat modifiers.
 * These modifiers only affect the fighter who activates them.
 */

function applyStatModifier(baseValue, modifier = {}) {
  const base = Number(baseValue) || 0;
  const amount = Number(modifier.amount) || 0;

  const multiplier =
    typeof modifier.multiplier === "number"
      ? modifier.multiplier
      : 1;

  // Apply flat changes first, then percentage changes.
  return (base + amount) * multiplier;
}

function getActiveModifiers(character) {
  return Array.isArray(character?.activeModifiers)
    ? character.activeModifiers
    : [];
}

function modifierTargetsAttack(modifier, attack) {
  const targetIds = modifier.attackModifiers?.targetAttackIds;

  // null means all of this fighter's attacks.
  if (targetIds == null) return true;
  if (!Array.isArray(targetIds)) return false;

  return (
    targetIds.includes(attack?.id) ||
    targetIds.includes(attack?.name)
  );
}

function getModifiedAttackStat(attack, character, stat) {
  let value = Number(attack?.[stat]) || 0;

  getActiveModifiers(character).forEach((modifier) => {
    if (!modifierTargetsAttack(modifier, attack)) return;

    const statModifier = modifier.attackModifiers?.stats?.[stat];

    if (!statModifier) return;

    value = applyStatModifier(value, statModifier);
  });

  return Math.round(Math.max(0, value));
}

function getModifiedCharacterStat(character, stat) {
  const rawValue =
    stat === "defense" && typeof character?.defense === "object"
      ? character.defense?.amount
      : character?.[stat];

  let value = Number(rawValue) || 0;

  getActiveModifiers(character).forEach((modifier) => {
    const statModifier = modifier.characterModifiers?.[stat];

    if (!statModifier) return;

    value = applyStatModifier(value, statModifier);
  });

  return Math.round(Math.max(0, value));
}

function activateSelfModifiers(character, attack) {
  if (!character || !attack) return [];

  const hasModifiers =
    attack.attackModifiers || attack.characterModifiers;

  if (!hasModifiers) return getActiveModifiers(character);

  const modifierId =
    attack.modifierId || attack.id || attack.name;

  const duration = Math.max(1, Number(attack.duration) || 1);

  // Remove an existing instance so activating it refreshes,
  // rather than stacks, its strength.
  const activeModifiers = getActiveModifiers(character).filter(
    (modifier) => modifier.id !== modifierId
  );

  activeModifiers.push({
    id: modifierId,
    sourceAttackId: attack.id ?? null,
    sourceAttackName: attack.name ?? null,
    remainingDuration: duration,
    attackModifiers: attack.attackModifiers ?? null,
    characterModifiers: attack.characterModifiers ?? null,
  });

  character.activeModifiers = activeModifiers;

  return activeModifiers;
}

function tickSelfModifiers(character) {
  if (!character || !Array.isArray(character.activeModifiers)) {
    return [];
  }

  character.activeModifiers = character.activeModifiers
    .map((modifier) => ({
      ...modifier,
      remainingDuration: modifier.remainingDuration - 1,
    }))
    .filter((modifier) => modifier.remainingDuration > 0);

  return character.activeModifiers;
}

export {
  applyStatModifier,
  getActiveModifiers,
  getModifiedAttackStat,
  getModifiedCharacterStat,
  activateSelfModifiers,
  tickSelfModifiers,
};
