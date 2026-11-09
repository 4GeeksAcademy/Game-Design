
import RockLeeArena from "/workspaces/Game-Design/src/assets/img/RockLeeArena.jpg";

const ACHIEVEMENTS_KEY = "fightersArenaAchievements";

export const ACHIEVEMENTS = {
  "a-new-rival": {
    id: "a-new-rival",
    title: "A NEW RIVAL!",
    category: "STORY MODE",
    description:
      "Your fighting skills have earned Rock Lee's respect.",
    requirement: "Win both battles in Story Mode Level 1.",
    artwork: RockLeeArena,
  },

  // Future achievements go here.
};

export function getUnlockedAchievements() {
  try {
    const saved = localStorage.getItem(ACHIEVEMENTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function unlockAchievement(achievementId) {
  if (!ACHIEVEMENTS[achievementId]) {
    console.warn(`Achievement "${achievementId}" does not exist.`);
    return false;
  }

  const unlocked = getUnlockedAchievements();

  // Prevent duplicate achievements.
  if (unlocked.includes(achievementId)) {
    return false;
  }

  const updated = [...unlocked, achievementId];

  localStorage.setItem(
    ACHIEVEMENTS_KEY,
    JSON.stringify(updated)
  );

  window.dispatchEvent(new Event("achievementsUpdated"));

  return true;
}
