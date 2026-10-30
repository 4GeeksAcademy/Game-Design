// ==========================================
// FESTIVAL CONFIGURATION
// ==========================================

export const FESTIVAL_TOTAL_POINTS = 600;
export const FESTIVAL_TOTAL_TIERS = 15;
export const FESTIVAL_POINTS_PER_TIER =
  FESTIVAL_TOTAL_POINTS / FESTIVAL_TOTAL_TIERS;

// Give this festival its own ID.
// A future festival can have a completely separate progress record.
const FESTIVAL_ID = "combat-festival-2026";

const STORAGE_KEY = `fighters-arena-${FESTIVAL_ID}`;

// ==========================================
// DEFAULT PROGRESS
// ==========================================

const createDefaultProgress = () => ({
  festivalId: FESTIVAL_ID,
  points: 0,
  elitePassOwned: false,
  claimedFreeRewards: [],
  claimedEliteRewards: [],
});

// ==========================================
// LOAD AND VALIDATE PROGRESS
// ==========================================

export const getFestivalProgress = () => {
  try {
    const savedProgress = localStorage.getItem(STORAGE_KEY);

    if (!savedProgress) {
      return createDefaultProgress();
    }

    const parsed = JSON.parse(savedProgress);

    return {
      ...createDefaultProgress(),
      ...parsed,
      points: Math.max(
        0,
        Math.min(
          FESTIVAL_TOTAL_POINTS,
          Number(parsed.points) || 0
        )
      ),
      claimedFreeRewards: Array.isArray(
        parsed.claimedFreeRewards
      )
        ? parsed.claimedFreeRewards
        : [],
      claimedEliteRewards: Array.isArray(
        parsed.claimedEliteRewards
      )
        ? parsed.claimedEliteRewards
        : [],
    };
  } catch (error) {
    console.error("Could not load Festival progress:", error);
    return createDefaultProgress();
  }
};

// ==========================================
// SAVE PROGRESS
// ==========================================

export const saveFestivalProgress = (progress) => {
  try {
    const safeProgress = {
      ...createDefaultProgress(),
      ...progress,
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(safeProgress)
    );

    // Notify Festival components that progress changed.
    window.dispatchEvent(
      new CustomEvent("festivalProgressUpdated", {
        detail: safeProgress,
      })
    );

    return safeProgress;
  } catch (error) {
    console.error("Could not save Festival progress:", error);
    return null;
  }
};

// ==========================================
// ADD FESTIVAL POINTS
// ==========================================

export const addFestivalPoints = (amount) => {
  const pointsToAdd = Math.floor(Number(amount));

  if (!Number.isFinite(pointsToAdd) || pointsToAdd <= 0) {
    return getFestivalProgress();
  }

  const currentProgress = getFestivalProgress();

  const updatedProgress = {
    ...currentProgress,
    points: Math.min(
      FESTIVAL_TOTAL_POINTS,
      currentProgress.points + pointsToAdd
    ),
  };

  return saveFestivalProgress(updatedProgress);
};

// ==========================================
// CHECK TIER UNLOCK STATUS
// ==========================================

export const isFestivalTierUnlocked = (tierNumber, points) => {
  const requiredPoints =
    tierNumber * FESTIVAL_POINTS_PER_TIER;

  return points >= requiredPoints;
};