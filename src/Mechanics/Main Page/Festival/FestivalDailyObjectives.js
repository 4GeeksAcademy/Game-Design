
import { addFestivalPoints } from "./FestivalProgress";

// Daily objectives reset every 24 hours.
export const DAILY_OBJECTIVE_INTERVAL = 24 * 60 * 60 * 1000;

const STORAGE_KEY = "fighters-arena-daily-objectives";

const DAILY_OBJECTIVE_POOL = [
  {
    id: "complete-20-battles",
    title: "Enter the Arena",
    description: "Complete 20 battles.",
    type: "battle",
    target: 20,
    points: 250,
    icon: "⚔️",
    category: "COMBAT",
  },
  {
    id: "deal-5000-damage",
    title: "Relentless Assault",
    description: "Deal 5,000 total damage.",
    type: "damage",
    target: 5000,
    points: 700,
    icon: "💥",
    category: "OFFENSE",
  },
  {
    id: "deal-10000-damage",
    title: "Show No Mercy!",
    description: "Deal 10,000 total damage.",
    type: "damage",
    target: 10000,
    points: 700,
    icon: "💥",
    category: "OFFENSE",
  },
  {
    id: "win-30-battles",
    title: "Prove That You're a Worthy Opponent",
    description: "Win 30 battles.",
    type: "victory",
    target: 30,
    points: 1200,
    icon: "🏆",
    category: "VICTORY",
  },
  {
    id: "defense-200",
    title: "I Just Love Dodging!",
    description: "Successfully block or evade 200 attacks.",
    type: "defense",
    target: 200,
    points: 1500,
    icon: "💨",
    category: "DEFENSE",
  },
];

// Show three of the four available objectives each day. On the next
// rotation, keep two of yesterday's objectives and replace the third.
const chooseDailyObjectiveSet = (previousObjectives = []) => {
  const previousIds = previousObjectives.map((objective) => objective.id);
  const previousSet = previousIds.length === 3
    ? previousIds.map((id) => DAILY_OBJECTIVE_POOL.find((item) => item.id === id)).filter(Boolean)
    : [];

  let selected;
  if (previousSet.length === 3) {
    const previouslyHidden = DAILY_OBJECTIVE_POOL.find(
      (item) => !previousIds.includes(item.id),
    );
    const retained = [...previousSet].sort(() => Math.random() - 0.5).slice(0, 2);
    selected = [...retained, previouslyHidden];
  } else {
    selected = [...DAILY_OBJECTIVE_POOL]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  }

  return selected.map((objective) => ({
    ...objective,
    progress: 0,
    completed: false,
  }));
};

const createDefaultObjectives = (previousObjectives = []) => {
  const now = Date.now();
  return {
    startedAt: now,
    expiresAt: now + DAILY_OBJECTIVE_INTERVAL,
    objectives: chooseDailyObjectiveSet(previousObjectives),
  };
};

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
      const freshObjectives = createDefaultObjectives(
        Array.isArray(parsed?.objectives) ? parsed.objectives : [],
      );
      saveDailyObjectives(freshObjectives);
      return freshObjectives;
    }

    // Migrate existing saves that still contain all four objectives.
    if (parsed.objectives.length !== 3) {
      const migrated = {
        ...parsed,
        objectives: chooseDailyObjectiveSet(parsed.objectives.slice(0, 3)),
      };
      saveDailyObjectives(migrated);
      return migrated;
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
