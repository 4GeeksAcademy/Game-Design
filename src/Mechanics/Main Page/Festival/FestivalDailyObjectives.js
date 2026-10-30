
import { addFestivalPoints } from "./FestivalProgress";

// Daily objectives reset every 24 hours.
export const DAILY_OBJECTIVE_INTERVAL = 24 * 60 * 60 * 1000;

const STORAGE_KEY = "fighters-arena-daily-objectives";

const DAILY_OBJECTIVE_POOL = [
  {
    id: "complete-3-battles",
    title: "Enter the Arena",
    description: "Complete 3 battles.",
    type: "battle",
    target: 3,
    points: 30,
    icon: "⚔️",
    category: "COMBAT",
  },
  {
    id: "deal-1000-damage",
    title: "Warrior's Effort",
    description: "Deal 1,000 total damage.",
    type: "damage",
    target: 1000,
    points: 40,
    icon: "💥",
    category: "OFFENSE",
  },
  {
    id: "win-3-battles",
    title: "Prove Your Strength",
    description: "Win 3 battles.",
    type: "victory",
    target: 3,
    points: 50,
    icon: "🏆",
    category: "VICTORY",
  },
];

const createDefaultObjectives = () => ({
  startedAt: Date.now(),
  expiresAt: Date.now() + DAILY_OBJECTIVE_INTERVAL,
  objectives: DAILY_OBJECTIVE_POOL.map((objective) => ({
    ...objective,
    progress: 0,
    completed: false,
  })),
});

const saveDailyObjectives = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    window.dispatchEvent(
      new CustomEvent("festivalDailyObjectivesUpdated", {
        detail: data,
      })
    );

    return true;
  } catch (error) {
    console.error("Could not save daily objectives:", error);
    return false;
  }
};

export const getDailyObjectives = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      const freshObjectives = createDefaultObjectives();
      saveDailyObjectives(freshObjectives);
      return freshObjectives;
    }

    const parsed = JSON.parse(saved);

    const isValid =
      parsed &&
      Array.isArray(parsed.objectives) &&
      typeof parsed.expiresAt === "number";

    if (!isValid || Date.now() >= parsed.expiresAt) {
      const freshObjectives = createDefaultObjectives();
      saveDailyObjectives(freshObjectives);
      return freshObjectives;
    }

    return parsed;
  } catch (error) {
    console.error("Could not load daily objectives:", error);

    const freshObjectives = createDefaultObjectives();
    saveDailyObjectives(freshObjectives);
    return freshObjectives;
  }
};

export const recordDailyObjectiveEvent = (eventType, amount = 1) => {
  const currentData = getDailyObjectives();
  const eventAmount = Number(amount);

  if (!Number.isFinite(eventAmount) || eventAmount <= 0) {
    return currentData;
  }

  let pointsEarned = 0;
  const newlyCompleted = [];

  const updatedObjectives = currentData.objectives.map((objective) => {
    if (objective.completed || objective.type !== eventType) {
      return objective;
    }

    const progress = Math.min(
      objective.target,
      objective.progress + eventAmount
    );

    const completed = progress >= objective.target;

    if (completed) {
      pointsEarned += objective.points;

      newlyCompleted.push({
        ...objective,
        progress,
        completed: true,
      });
    }

    return {
      ...objective,
      progress,
      completed,
    };
  });

  const updatedData = {
    ...currentData,
    objectives: updatedObjectives,
  };

  const saved = saveDailyObjectives(updatedData);

  if (saved && pointsEarned > 0) {
    addFestivalPoints(pointsEarned);

    newlyCompleted.forEach((objective) => {
      window.dispatchEvent(
        new CustomEvent("festivalDailyObjectiveCompleted", {
          detail: objective,
        })
      );
    });
  }

  return updatedData;
};
