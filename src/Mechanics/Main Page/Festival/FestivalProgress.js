// ==========================================
// FESTIVAL CONFIGURATION
// ==========================================

// ==========================================
// FESTIVAL CONFIGURATION
// ==========================================

export const FESTIVAL_TOTAL_POINTS = 1500;
export const FESTIVAL_TOTAL_TIERS = 15;

// Points required to unlock each tier.
export const FESTIVAL_TIER_REQUIREMENTS = [
  50,
  100,
  160,
  230,
  310,
  400,
  450,
  650,
  730,
  900,
  1050,
  1150,
  1270,
  1355,
  1500,
];

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
  if (
    !Number.isInteger(tierNumber) ||
    tierNumber < 1 ||
    tierNumber > FESTIVAL_TOTAL_TIERS
  ) {
    return false;
  }

  const requiredPoints =
    FESTIVAL_TIER_REQUIREMENTS[tierNumber - 1];

  return points >= requiredPoints;
};


export const claimFestivalReward = (tierNumber, rewardTrack) => {
  if (
    !Number.isInteger(tierNumber) ||
    tierNumber < 1 ||
    tierNumber > FESTIVAL_TOTAL_TIERS ||
    !["free", "elite"].includes(rewardTrack)
  ) {
    return false;
  }

  const progress = getFestivalProgress();

  const claimedKey =
    rewardTrack === "free"
      ? "claimedFreeRewards"
      : "claimedEliteRewards";

  if (progress[claimedKey].includes(tierNumber)) {
    return false;
  }

  const updatedProgress = {
    ...progress,
    [claimedKey]: [...progress[claimedKey], tierNumber],
  };

  return saveFestivalProgress(updatedProgress);
};
