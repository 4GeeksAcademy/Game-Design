import { spendCoins } from "./Currency.js";

const LOADOUT_KEY = "wildCardsAttackLoadouts";
const UNLOCKED_ATTACKS_KEY = "wildCardsUnlockedAttacks";

export function getAttackKey(attack) {
  return String(attack?.id ?? attack?.name ?? "");
}

export function getAttackDisplayName(attack) {
  if (attack?.name) return attack.name;
  const raw = getAttackKey(attack);
  return raw.replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Unnamed Attack";
}

export function getAttackSlotLimit(attacks = []) {
  return attacks.length;
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
  if (!attack.locked && !attack.requiresPurchase && !(Number(attack.unlockCost ?? attack.coinCost ?? attack.price) > 0)) return true;
  return getUnlockedAttackKeys(characterId).includes(getAttackKey(attack));
}

export function getEquippedAttackKeys(characterId, attacks = []) {
  const saved = readObject(LOADOUT_KEY)[characterId];
  const available = attacks.filter((attack) => isAttackUnlocked(characterId, attack));
  const defaultKeys = attacks.filter((attack) => !attack.locked && !attack.requiresPurchase && !(Number(attack.unlockCost ?? attack.coinCost ?? attack.price) > 0)).slice(0, getAttackSlotLimit(attacks)).map(getAttackKey);
  if (!Array.isArray(saved)) return defaultKeys;
  const allowed = new Set(available.map(getAttackKey));
  return [...new Set(saved.filter((key) => allowed.has(key)))].slice(0, getAttackSlotLimit(attacks));
}

export function saveEquippedAttackKeys(characterId, keys, attacks = []) {
  const slotLimit = getAttackSlotLimit(attacks);
  const allowed = new Set(attacks.filter((attack) => isAttackUnlocked(characterId, attack)).map(getAttackKey));
  const clean = [...new Set((keys ?? []).filter((key) => allowed.has(key)))].slice(0, slotLimit);
  const saved = readObject(LOADOUT_KEY);
  saved[characterId] = clean;
  localStorage.setItem(LOADOUT_KEY, JSON.stringify(saved));
  window.dispatchEvent(new CustomEvent("attackLoadoutUpdated", { detail: { characterId, keys: clean } }));
  return clean;
}

export function unlockAttack(characterId, attack) {
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

export function getEquippedAttacks(characterId, attacks = []) {
  const keys = new Set(getEquippedAttackKeys(characterId, attacks));
  return attacks.filter((attack) => keys.has(getAttackKey(attack))).map((attack) => ({ ...attack }));
}
