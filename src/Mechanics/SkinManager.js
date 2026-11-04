
import { skins } from "./Skins.js";

const OWNED_SKINS_KEY = "fightersArenaOwnedSkins";
const EQUIPPED_SKINS_KEY = "fightersArenaEquippedSkins";

// Retrieve all skins owned by the player.
export function getOwnedSkins() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(OWNED_SKINS_KEY) || "[]"
    );

    return Array.isArray(saved) ? [...new Set(saved)] : [];
  } catch (error) {
    console.error("Could not load owned skins:", error);
    return [];
  }
}

// Unlock a skin.
export function unlockSkin(skinId) {
  const skin = skins.find((item) => item.id === skinId);

  if (!skin) return false;

  const owned = getOwnedSkins();

  if (owned.includes(skinId)) return false;

  localStorage.setItem(
    OWNED_SKINS_KEY,
    JSON.stringify([...owned, skinId])
  );

  window.dispatchEvent(new Event("skinsUpdated"));

  return true;
}

// Retrieve equipped skins for every character.
export function getEquippedSkins() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(EQUIPPED_SKINS_KEY) || "{}"
    );

    return saved && typeof saved === "object" && !Array.isArray(saved)
      ? saved
      : {};
  } catch (error) {
    console.error("Could not load equipped skins:", error);
    return {};
  }
}

// Retrieve one character's equipped skin.
export function getEquippedSkin(characterId) {
  const equipped = getEquippedSkins();
  return equipped[characterId] ?? null;
}

// Equip a skin to its corresponding character.
export function equipSkin(skinId) {
  const skin = skins.find((item) => item.id === skinId);

  if (!skin) return false;

  if (!getOwnedSkins().includes(skinId)) return false;

  const equipped = getEquippedSkins();

  equipped[skin.characterId] = skinId;

  localStorage.setItem(
    EQUIPPED_SKINS_KEY,
    JSON.stringify(equipped)
  );

  window.dispatchEvent(new Event("skinsUpdated"));

  return true;
}

// Remove a character's equipped skin.
export function unequipSkin(characterId) {
  const equipped = getEquippedSkins();

  if (!equipped[characterId]) return false;

  delete equipped[characterId];

  localStorage.setItem(
    EQUIPPED_SKINS_KEY,
    JSON.stringify(equipped)
  );

  window.dispatchEvent(new Event("skinsUpdated"));

  return true;
}

// Get the correct artwork for a fighter.
export function getCharacterImage(characterId, defaultImage) {
  const equippedSkinId = getEquippedSkin(characterId);

  if (!equippedSkinId) return defaultImage;

  const skin = skins.find(
    (item) =>
      item.id === equippedSkinId &&
      item.characterId === characterId
  );

  if (!skin || !getOwnedSkins().includes(skin.id)) {
    return defaultImage;
  }

  return skin.image;
}
