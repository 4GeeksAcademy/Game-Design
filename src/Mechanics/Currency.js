const CURRENCY_KEY = "fightersArenaCoins";

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

  // Notify other parts of the game that the balance changed.
  window.dispatchEvent(new Event("coinsUpdated"));

  return newBalance;
}