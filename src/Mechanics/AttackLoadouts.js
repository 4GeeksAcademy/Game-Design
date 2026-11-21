import { spendCoins } from "./Currency.js";

const LOADOUT_KEY = "wildCardsAttackLoadouts";
const UNLOCKED_ATTACKS_KEY = "wildCardsUnlockedAttacks";
const FESTIVAL_UNLOCKED_ATTACKS_KEY = "wildCardsFestivalUnlockedAttacks";

export function getAttackKey(attack) {
  return String(attack?.id ?? attack?.name ?? "");
}

export function getAttackDisplayName(attack) {
  if (attack?.name) return attack.name;
  const raw = getAttackKey(attack);
  return raw.replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Unnamed Attack";
}

export function getAttackSlotLimit(characterOrAttacks = []) {
  // Accept a numeric slot count directly, as battle and inventory callers
  // pass character.data.slot into the loadout helpers.
  if (typeof characterOrAttacks === "number") {
    return Number.isFinite(characterOrAttacks) && characterOrAttacks >= 0
      ? Math.floor(characterOrAttacks)
      : 0;
  }

  // Character stat objects own their equip capacity through the "slot" property.
  // Passing an attacks array remains supported for older callers.
  if (Array.isArray(characterOrAttacks)) return characterOrAttacks.length;
  const configuredSlots = Number(characterOrAttacks?.slot);
  return Number.isFinite(configuredSlots) && configuredSlots >= 0
    ? Math.floor(configuredSlots)
    : (characterOrAttacks?.attacks?.length ?? 0);
}

function readObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function getUnlockedAttackKeys(characterId) {
  const unlocked = readObject(UNLOCKED_ATTACKS_KEY);
  return Array.isArray(unlocked[characterId]) ? unlocked[characterId] : [];
}

export function isAttackUnlocked(characterId, attack) {
  if (attack.festivalExclusive) {
    const festivalUnlocked = readObject(FESTIVAL_UNLOCKED_ATTACKS_KEY);
    return Array.isArray(festivalUnlocked[characterId]) &&
      festivalUnlocked[characterId].includes(getAttackKey(attack));
  }
  if (!attack.locked && !attack.requiresPurchase && !(Number(attack.unlockCost ?? attack.coinCost ?? attack.price) > 0)) return true;
  return getUnlockedAttackKeys(characterId).includes(getAttackKey(attack));
}

export function getEquippedAttackKeys(characterId, attacks = [], configuredSlot) {
  const saved = readObject(LOADOUT_KEY)[characterId];
  const available = attacks.filter((attack) => isAttackUnlocked(characterId, attack));
  const defaultKeys = attacks.filter((attack) => !attack.locked && !attack.requiresPurchase && !(Number(attack.unlockCost ?? attack.coinCost ?? attack.price) > 0)).slice(0, getAttackSlotLimit(configuredSlot ?? attacks)).map(getAttackKey);
  if (!Array.isArray(saved)) return defaultKeys;
  const allowed = new Set(available.map(getAttackKey));
  return [...new Set(saved.filter((key) => allowed.has(key)))].slice(0, getAttackSlotLimit(configuredSlot ?? attacks));
}

export function saveEquippedAttackKeys(characterId, keys, attacks = [], configuredSlot) {
  const slotLimit = getAttackSlotLimit(configuredSlot ?? attacks);
  const allowed = new Set(attacks.filter((attack) => isAttackUnlocked(characterId, attack)).map(getAttackKey));
  const clean = [...new Set((keys ?? []).filter((key) => allowed.has(key)))].slice(0, slotLimit);
  const saved = readObject(LOADOUT_KEY);
  saved[characterId] = clean;
  localStorage.setItem(LOADOUT_KEY, JSON.stringify(saved));
  window.dispatchEvent(new CustomEvent("attackLoadoutUpdated", { detail: { characterId, keys: clean } }));
  return clean;
}

export function unlockFestivalAttack(characterId, attack) {
  if (!attack?.festivalExclusive) return false;
  const key = getAttackKey(attack);
  const unlocked = readObject(FESTIVAL_UNLOCKED_ATTACKS_KEY);
  const current = Array.isArray(unlocked[characterId]) ? unlocked[characterId] : [];
  if (!current.includes(key)) {
    unlocked[characterId] = [...current, key];
    localStorage.setItem(FESTIVAL_UNLOCKED_ATTACKS_KEY, JSON.stringify(unlocked));
    window.dispatchEvent(new CustomEvent("attackUnlocked", { detail: { characterId, key, source: "festival" } }));
  }
  return true;
}

export function unlockAttack(characterId, attack) {
  if (attack?.festivalExclusive) return false;
  const key = getAttackKey(attack);
  const cost = Math.max(0, Math.floor(Number(attack.unlockCost ?? attack.coinCost ?? attack.price) || 0));
  const unlocked = readObject(UNLOCKED_ATTACKS_KEY);
  const current = Array.isArray(unlocked[characterId]) ? unlocked[characterId] : [];
  if (current.includes(key)) return true;
  if (cost > 0) {
    if (!spendCoins(cost)) return false;
  }
  unlocked[characterId] = [...current, key];
  localStorage.setItem(UNLOCKED_ATTACKS_KEY, JSON.stringify(unlocked));
  window.dispatchEvent(new CustomEvent("attackUnlocked", { detail: { characterId, key } }));
  return true;
}

export function getEquippedAttacks(characterId, attacks = [], configuredSlot) {
  const keys = new Set(getEquippedAttackKeys(characterId, attacks, configuredSlot));
  return attacks.filter((attack) => keys.has(getAttackKey(attack))).map((attack) => ({ ...attack }));
}
