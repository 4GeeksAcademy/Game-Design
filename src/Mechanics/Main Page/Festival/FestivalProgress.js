import { addCoins } from "../../Currency.js";

// ==========================================
// FESTIVAL CONFIGURATION
// ==========================================

// ==========================================
// FESTIVAL CONFIGURATION
// ==========================================

export const FESTIVAL_TOTAL_POINTS = 20000;
export const FESTIVAL_TOTAL_TIERS = 20;

// Points required to unlock each tier.
export const FESTIVAL_TIER_REQUIREMENTS = [
  50,    // 1
  100,   // 2
  160,   // 3
  250,   // 4
  340,   // 5
  430,   // 6
  550,   // 7
  750,   // 8
  930,   // 9
  1100,  // 10
  1350,  // 11
  1550,  // 12
  2070,  // 13
  2550,  // 14
  3000,  // 15
  5000,  // 16
  7500,  // 17
  11000, // 18
  15000, // 19
  20000, // 20
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
  claimedAttackRewards: [],
  rewardMigrationVersion: 1,
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

    const progress = {
      ...createDefaultProgress(),
      ...parsed,
      points: Math.max(
        0,
        Math.min(FESTIVAL_TOTAL_POINTS, Number(parsed.points) || 0),
      ),
      claimedFreeRewards: Array.isArray(parsed.claimedFreeRewards)
        ? parsed.claimedFreeRewards
        : [],
      claimedEliteRewards: Array.isArray(parsed.claimedEliteRewards)
        ? parsed.claimedEliteRewards
        : [],
      claimedAttackRewards: Array.isArray(parsed.claimedAttackRewards)
        ? parsed.claimedAttackRewards
        : [],
    };

    // Preserve existing players' progress when coin rewards move to later
    // free tiers, and allow newly-added attack rewards at previously-claimed
    // tiers to be claimed once without resetting the festival.
    if ((Number(parsed.rewardMigrationVersion) || 0) < 1) {
      const coinCompensation =
        (progress.claimedFreeRewards.includes(15) ? 15000 : 0) +
        (progress.claimedFreeRewards.includes(19) ? 6500 : 0);
      if (coinCompensation > 0) addCoins(coinCompensation);
      progress.rewardMigrationVersion = 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }

    return progress;
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

    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeProgress));

    // Notify Festival components that progress changed.
    window.dispatchEvent(
      new CustomEvent("festivalProgressUpdated", {
        detail: safeProgress,
      }),
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
      currentProgress.points + pointsToAdd,
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

  const requiredPoints = FESTIVAL_TIER_REQUIREMENTS[tierNumber - 1];

  return points >= requiredPoints;
};

export const claimFestivalReward = (tierNumber, rewardTrack, attackRewardId = null) => {
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
    rewardTrack === "free" ? "claimedFreeRewards" : "claimedEliteRewards";

  if (attackRewardId) {
    if (progress.claimedAttackRewards.includes(attackRewardId)) return false;
    return saveFestivalProgress({
      ...progress,
      [claimedKey]: progress[claimedKey].includes(tierNumber)
        ? progress[claimedKey]
        : [...progress[claimedKey], tierNumber],
      claimedAttackRewards: [...progress.claimedAttackRewards, attackRewardId],
    });
  }

  if (progress[claimedKey].includes(tierNumber)) return false;
  return saveFestivalProgress({
    ...progress,
    [claimedKey]: [...progress[claimedKey], tierNumber],
  });
};
