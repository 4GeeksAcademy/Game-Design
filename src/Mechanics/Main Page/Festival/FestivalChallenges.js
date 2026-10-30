import { addFestivalPoints } from "./FestivalProgress";

// ==========================================
// ROTATION SETTINGS
// ==========================================

// Testing: 15 minutes.
// Later, change this to 60 * 60 * 1000 for one hour.
export const FESTIVAL_CHALLENGE_INTERVAL = 15 * 60 * 1000;

const ACTIVE_CHALLENGE_COUNT = 4;
const STORAGE_KEY = "fighters-arena-rotating-challenges";

// ==========================================
// CHALLENGE POOL
// ==========================================

const CHALLENGE_POOL = [
  {
    id: "damage-250",
    title: "Damage Dealer",
    description: "Deal 250 damage across battles.",
    type: "damage",
    target: 250,
    points: 10,
    icon: "⚔️",
    category: "OFFENSE",
  },
  {
    id: "damage-500",
    title: "Heavy Hitter",
    description: "Deal 500 damage across battles.",
    type: "damage",
    target: 500,
    points: 15,
    icon: "💥",
    category: "OFFENSE",
  },
  {
    id: "attacks-5",
    title: "Attack Starter",
    description: "Use 5 attacks during combat.",
    type: "attack",
    target: 5,
    points: 10,
    icon: "🥊",
    category: "COMBAT",
  },
  {
    id: "attacks-10",
    title: "Attack Master",
    description: "Use 10 attacks during combat.",
    type: "attack",
    target: 10,
    points: 15,
    icon: "🔥",
    category: "COMBAT",
  },
  {
    id: "defense-3",
    title: "Quick Defense",
    description: "Successfully block or evade 3 attacks.",
    type: "defense",
    target: 3,
    points: 10,
    icon: "🛡️",
    category: "DEFENSE",
  },
  {
    id: "defense-5",
    title: "Untouchable",
    description: "Successfully block or evade 5 attacks.",
    type: "defense",
    target: 5,
    points: 15,
    icon: "💨",
    category: "DEFENSE",
  },
  {
    id: "victory-1",
    title: "First Victory",
    description: "Win 1 battle.",
    type: "victory",
    target: 1,
    points: 15,
    icon: "🏆",
    category: "VICTORY",
  },
  {
    id: "victory-2",
    title: "Victory Hunter",
    description: "Win 2 battles.",
    type: "victory",
    target: 2,
    points: 25,
    icon: "👑",
    category: "VICTORY",
  },
];

// ==========================================
// SAVE ROTATION
// ==========================================

const saveRotation = (rotation) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rotation));

    window.dispatchEvent(
      new CustomEvent("festivalChallengesUpdated", {
        detail: rotation,
      }),
    );

    return true;
  } catch (error) {
    console.error("Could not save Festival challenges:", error);
    return false;
  }
};

// ==========================================
// CREATE A NEW ROTATION
// ==========================================

const createNewRotation = () => {
  const shuffled = [...CHALLENGE_POOL];

  // Randomize the challenge pool.
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[i],
    ];
  }

  const selectedChallenges = shuffled
    .slice(0, ACTIVE_CHALLENGE_COUNT)
    .map((challenge) => ({
      ...challenge,
      progress: 0,
      completed: false,
    }));

  const rotation = {
    startedAt: Date.now(),
    expiresAt: Date.now() + FESTIVAL_CHALLENGE_INTERVAL,
    challenges: selectedChallenges,
  };

  saveRotation(rotation);

  return rotation;
};

// ==========================================
// GET CURRENT ROTATION
// ==========================================

export const getRotatingChallenges = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return createNewRotation();
    }

    const rotation = JSON.parse(saved);

    const isValid =
      rotation &&
      Array.isArray(rotation.challenges) &&
      typeof rotation.expiresAt === "number";

    if (!isValid || Date.now() >= rotation.expiresAt) {
      return createNewRotation();
    }

    return rotation;
  } catch (error) {
    console.error("Could not load Festival challenges:", error);
    return createNewRotation();
  }
};

// ==========================================
// RECORD A BATTLE EVENT
// ==========================================

// Supported event types:
// damage, attack, block, evade, victory

export const recordFestivalEvent = (eventType, amount = 1) => {
  const currentRotation = getRotatingChallenges();

  const eventAmount = Number(amount);

  if (
    !Number.isFinite(eventAmount) ||
    eventAmount <= 0
  ) {
    return currentRotation;
  }

let pointsEarned = 0;
const newlyCompleted = [];

const updatedChallenges = currentRotation.challenges.map((challenge) => {
      if (challenge.completed) {
        return challenge;
      }

      const matchesEvent =
        challenge.type === eventType ||
        (challenge.type === "defense" &&
          ["block", "evade"].includes(eventType));

      if (!matchesEvent) {
        return challenge;
      }

      const progress = Math.min(
        challenge.target,
        challenge.progress + eventAmount,
      );

     const completed = progress >= challenge.target;

if (completed) {
  pointsEarned += challenge.points;

  newlyCompleted.push({
    ...challenge,
    progress,
    completed: true,
  });
}

      return {
        ...challenge,
        progress,
        completed,
      };
    },
  );

  const updatedRotation = {
    ...currentRotation,
    challenges: updatedChallenges,
  };

  // Save completion before awarding points.
  // This prevents the same completed challenge from awarding twice.
  const saved = saveRotation(updatedRotation);

if (saved && pointsEarned > 0) {
  addFestivalPoints(pointsEarned);

  newlyCompleted.forEach((challenge) => {
    window.dispatchEvent(
      new CustomEvent("festivalChallengeCompleted", {
        detail: challenge,
      })
    );
  });
}

return updatedRotation;
};