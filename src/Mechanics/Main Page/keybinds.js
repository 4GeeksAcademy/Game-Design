// keybinds.js

export const ATTACK_SLOT_COUNT = 10;
export const KEYBINDS_STORAGE_KEY = "fightersArena.keybinds";

const makePlayerDefaults = (attackKeys, finishTurn, defend, evade, takeDamage) => ({
  attacks: attackKeys,
  finishTurn,
  defend,
  evade,
  takeDamage,
});

// Defaults are unique across both players and all actions.
export const DEFAULT_KEYBINDS = {
  player1: makePlayerDefaults(
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    "Enter",
    "q",
    "w",
    "e",
  ),
  player2: makePlayerDefaults(
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
    " ",
    "u",
    "i",
    "o",
  ),
};

export function loadKeybinds() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(KEYBINDS_STORAGE_KEY) || "null",
    );

    return mergeWithDefaults(saved);
  } catch {
    return structuredClone(DEFAULT_KEYBINDS);
  }
}

function mergeWithDefaults(saved) {
  if (!saved || typeof saved !== "object") {
    return structuredClone(DEFAULT_KEYBINDS);
  }

  return {
    player1: mergePlayer(DEFAULT_KEYBINDS.player1, saved.player1),
    player2: mergePlayer(DEFAULT_KEYBINDS.player2, saved.player2),
  };
}

function mergePlayer(defaults, saved) {
  if (!saved || typeof saved !== "object") return structuredClone(defaults);

  return {
    attacks: defaults.attacks.map(
      (key, index) => normalizeKey(saved.attacks?.[index]) || key,
    ),
    finishTurn: normalizeKey(saved.finishTurn) || defaults.finishTurn,
    defend: normalizeKey(saved.defend) || defaults.defend,
    evade: normalizeKey(saved.evade) || defaults.evade,
    takeDamage: normalizeKey(saved.takeDamage) || defaults.takeDamage,
  };
}

export function saveKeybinds(keybinds) {
  localStorage.setItem(KEYBINDS_STORAGE_KEY, JSON.stringify(keybinds));
}

export function normalizeKey(key) {
  if (typeof key !== "string" || key.length === 0) return null;

  if (key === " ") return "Space";
  if (key === "Spacebar") return "Space";

  return key.length === 1 ? key.toLowerCase() : key;
}

export function getKeybindLabel(key) {
  if (key === " ") return "Space";
  if (key === "Enter") return "Enter";
  return key.length === 1 ? key.toUpperCase() : key;
}

export function findKeybindConflict(keybinds, key, except = null) {
  const normalized = normalizeKey(key);
  if (!normalized) return null;

  for (const playerId of ["player1", "player2"]) {
    const player = keybinds[playerId];

    for (let index = 0; index < ATTACK_SLOT_COUNT; index += 1) {
      const actionId = `${playerId}.attack.${index}`;
      if (
        player.attacks[index] === normalized &&
        actionId !== except
      ) {
        return { playerId, actionId, label: `Attack ${index + 1}` };
      }
    }

    for (const action of ["finishTurn", "defend", "evade", "takeDamage"]) {
      const actionId = `${playerId}.${action}`;
      if (player[action] === normalized && actionId !== except) {
        return { playerId, actionId, label: actionLabel(action) };
      }
    }
  }

  return null;
}

export function actionLabel(action) {
  const labels = {
    finishTurn: "Finish turn",
    defend: "Defend",
    evade: "Evade",
    takeDamage: "Take full damage",
  };

  return labels[action] ?? action;
}

export function isReservedKey(event) {
  const key = normalizeKey(event.key);

  // Avoid browser/system shortcuts and keys that aren't useful as game binds.
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    key === "Tab" ||
    key === "Escape" ||
    key === "Backspace" ||
    key === "Delete" ||
    key === "F5" ||
    key === "F11" ||
    key === "F12"
  ) {
    return true;
  }

  return false;
}