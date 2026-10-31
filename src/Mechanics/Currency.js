const CURRENCY_KEY = "fightersArenaCoins";
const UNLOCKED_KEY = "fightersArenaUnlockedCharacters";

const STARTER_CHARACTERS = ["mina", "kirishima"];

export function getCoins() {
  const savedCoins = Number(localStorage.getItem(CURRENCY_KEY));

  return Number.isFinite(savedCoins) && savedCoins >= 0
    ? savedCoins
    : 0;
}

export function addCoins(amount) {
  const reward = Math.floor(Number(amount));

  if (!Number.isFinite(reward) || reward <= 0) {
    return getCoins();
  }

  const newBalance = getCoins() + reward;

  localStorage.setItem(CURRENCY_KEY, String(newBalance));
  window.dispatchEvent(new Event("coinsUpdated"));

  return newBalance;
}

export function spendCoins(amount) {
  const cost = Math.floor(Number(amount));

  if (!Number.isFinite(cost) || cost < 0 || getCoins() < cost) {
    return false;
  }

  localStorage.setItem(CURRENCY_KEY, String(getCoins() - cost));
  window.dispatchEvent(new Event("coinsUpdated"));

  return true;
}

export function getUnlockedCharacters() {
  try {
    const saved = localStorage.getItem(UNLOCKED_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return [...new Set([...STARTER_CHARACTERS, ...parsed])];
      }
    }
  } catch (error) {
    console.error("Could not load character unlocks:", error);
  }

  return [...STARTER_CHARACTERS];
}

export function unlockCharacter(characterId) {
  const unlocked = getUnlockedCharacters();

  if (unlocked.includes(characterId)) {
    return false;
  }

  const updated = [...unlocked, characterId];

  localStorage.setItem(UNLOCKED_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("unlocksUpdated"));

  return true;
}