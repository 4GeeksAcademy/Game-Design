import React, { useEffect, useState } from "react";
import GokuImage from "../../../assets/img/Goku.jpeg";
import KenpachiImage from "../../../assets/img/Kenpachi.png";
import TogaImage from "../../../assets/img/Toga.png";
import HinataImage from "../../../assets/img/Hinata.png";
import { getOwnedSkins, unlockSkin } from "../../SkinManager";
import { skins } from "../../Skins";
import { useNavigate } from "react-router-dom";
import { getDailyObjectives } from "./FestivalDailyObjectives";
import FESTIVAL_REWARDS from "./FestivalRewards";
import {
  getFestivalProgress,
  saveFestivalProgress,
  addFestivalPoints,
  claimFestivalReward,
  FESTIVAL_TOTAL_POINTS,
  FESTIVAL_TOTAL_TIERS,
  FESTIVAL_TIER_REQUIREMENTS,
} from "./FestivalProgress";
import { getRotatingChallenges } from "./FestivalChallenges";
import {
  getCoins,
  spendCoins,
  addCoins,
  unlockCharacter,
  getUnlockedCharacters,
} from "../../Currency";
import "./Festival.css";

const FESTIVAL_CHARACTER_IMAGES = {
  goku: GokuImage,
  kenpachi: KenpachiImage,
  toga: TogaImage,
  hinata: HinataImage,
};
const ELITE_PASS_COST = 100000;

// Each tier has a free and an elite reward placeholder.
const tiers = Array.from({ length: FESTIVAL_TOTAL_TIERS }, (_, index) => ({
  number: index + 1,
  points: FESTIVAL_TIER_REQUIREMENTS[index],
}));

const formatChallengeTime = (milliseconds) => {
  const totalSeconds = Math.ceil(milliseconds / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
};

const formatDailyTime = (milliseconds) => {
  const totalSeconds = Math.ceil(milliseconds / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:${String(seconds).padStart(2, "0")}`;
};

function Festival() {
  const navigate = useNavigate();
  const [festivalProgress, setFestivalProgress] = useState(() =>
    getFestivalProgress(),
  );
  const [unlockedCharacters, setUnlockedCharacters] = useState(() =>
    getUnlockedCharacters(),
  );

  useEffect(() => {
    const updateUnlocks = () => {
      setUnlockedCharacters(getUnlockedCharacters());
    };

    window.addEventListener("unlocksUpdated", updateUnlocks);

    return () => {
      window.removeEventListener("unlocksUpdated", updateUnlocks);
    };
  }, []);

  const [challengeRotation, setChallengeRotation] = useState(() =>
    getRotatingChallenges(),
  );

  const [dailyObjectiveData, setDailyObjectiveData] = useState(() =>
    getDailyObjectives(),
  );

  const [dailyTimeLeft, setDailyTimeLeft] = useState(() =>
    Math.max(0, dailyObjectiveData.expiresAt - Date.now()),
  );

  const dailyObjectives = dailyObjectiveData.objectives;

  useEffect(() => {
    const updateDailyObjectives = () => {
      const data = getDailyObjectives();

      setDailyObjectiveData(data);
      setDailyTimeLeft(Math.max(0, data.expiresAt - Date.now()));
    };

    updateDailyObjectives();

    const timer = setInterval(updateDailyObjectives, 1000);

    window.addEventListener(
      "festivalDailyObjectivesUpdated",
      updateDailyObjectives,
    );

    return () => {
      clearInterval(timer);

      window.removeEventListener(
        "festivalDailyObjectivesUpdated",
        updateDailyObjectives,
      );
    };
  }, []);

  const [rewardPopup, setRewardPopup] = useState(null);
  const [isRewardPopupClosing, setIsRewardPopupClosing] = useState(false);
  useEffect(() => {
    if (!rewardPopup) return;

    setIsRewardPopupClosing(false);

    const closeTimer = setTimeout(() => {
      setIsRewardPopupClosing(true);
    }, 2600);

    const removeTimer = setTimeout(() => {
      setRewardPopup(null);
      setIsRewardPopupClosing(false);
    }, 3200);

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(removeTimer);
    };
  }, [rewardPopup]);

  const [challengeTimeLeft, setChallengeTimeLeft] = useState(() =>
    Math.max(0, getRotatingChallenges().expiresAt - Date.now()),
  );

  const challenges = challengeRotation.challenges;

  useEffect(() => {
    const updateChallenges = () => {
      const rotation = getRotatingChallenges();

      setChallengeRotation(rotation);
      setChallengeTimeLeft(Math.max(0, rotation.expiresAt - Date.now()));
    };

    updateChallenges();

    // Keep the countdown updated every second.
    const timer = setInterval(updateChallenges, 1000);

    window.addEventListener("festivalChallengesUpdated", updateChallenges);

    return () => {
      clearInterval(timer);

      window.removeEventListener("festivalChallengesUpdated", updateChallenges);
    };
  }, []);

  const [coinBalance, setCoinBalance] = useState(() => getCoins());

  const [purchaseMessage, setPurchaseMessage] = useState("");

  useEffect(() => {
    const updateCoins = () => {
      setCoinBalance(getCoins());
    };

    window.addEventListener("coinsUpdated", updateCoins);

    return () => {
      window.removeEventListener("coinsUpdated", updateCoins);
    };
  }, []);

  const purchaseElitePass = () => {
    if (festivalProgress.elitePassOwned) {
      return;
    }

    if (coinBalance < ELITE_PASS_COST) {
      setPurchaseMessage("NOT ENOUGH COINS!");
      return;
    }

    const purchaseSuccessful = spendCoins(ELITE_PASS_COST);

    if (!purchaseSuccessful) {
      setPurchaseMessage("PURCHASE FAILED. TRY AGAIN.");
      return;
    }

    const updatedProgress = {
      ...festivalProgress,
      elitePassOwned: true,
    };

    // Save the Elite Pass permanently for this festival.
    const savedProgress = saveFestivalProgress(updatedProgress);

    if (!savedProgress) {
      setPurchaseMessage(
        "COINS WERE DEDUCTED, BUT THE PASS COULD NOT BE SAVED. PLEASE CONTACT SUPPORT.",
      );
      return;
    }

    setPurchaseMessage("ELITE PASS UNLOCKED!");
  };

  const playerPoints = festivalProgress.points;

  useEffect(() => {
    const updateProgress = (event) => {
      setFestivalProgress(event.detail);
    };

    window.addEventListener("festivalProgressUpdated", updateProgress);

    return () => {
      window.removeEventListener("festivalProgressUpdated", updateProgress);
    };
  }, []);
  const progressPercentage = Math.min(
    (playerPoints / FESTIVAL_TOTAL_POINTS) * 100,
    100,
  );
  const getRewardDisplay = (reward) => {
    if (!reward) return "COMING SOON";

    if (reward.type === "coins") {
      return `🪙 ${reward.amount.toLocaleString()} COINS`;
    }

    if (reward.type === "character") {
      return reward.name;
    }

    if (reward.type === "skin") {
      return `🎨 ${reward.name}`;
    }

    return "UNKNOWN REWARD";
  };

  const getRewardRarity = (reward) => {
    if (!reward) return null;

    if (reward.type === "skin") {
      const skin = skins.find((item) => item.id === reward.skinId);

      return skin?.rarity ?? null;
    }

    if (reward.type === "character") {
      return reward.rarity ?? null;
    }

    return null;
  };

  const claimReward = (tierNumber, rewardTrack) => {
    const reward = FESTIVAL_REWARDS[tierNumber]?.[rewardTrack];

    if (!reward) return;

    // Always check the latest saved progress.
    const currentProgress = getFestivalProgress();

    const requiredPoints = FESTIVAL_TIER_REQUIREMENTS[tierNumber - 1];

    // Check tier access.
    if (currentProgress.points < requiredPoints) return;

    // Elite rewards require the Elite Pass.
    if (rewardTrack === "elite" && !currentProgress.elitePassOwned) {
      return;
    }

    // Prevent duplicate claims.
    const claimedRewards =
      rewardTrack === "free"
        ? currentProgress.claimedFreeRewards
        : currentProgress.claimedEliteRewards;

    if (claimedRewards.includes(tierNumber)) return;

    // Prevent duplicate character unlocks.
    // Prevent claiming characters already owned.
    if (
      reward.type === "character" &&
      getUnlockedCharacters().includes(reward.characterId)
    ) {
      return;
    }

    // Prevent claiming skins already owned.
    if (reward.type === "skin" && getOwnedSkins().includes(reward.skinId)) {
      return;
    }

    // Record the claim before granting the reward.
    const saved = claimFestivalReward(tierNumber, rewardTrack);

    if (!saved) return;

    // Grant the actual reward.
    if (reward.type === "coins") {
      addCoins(reward.amount);

      setRewardPopup({
        type: "coins",
        title: `+${reward.amount.toLocaleString()} COINS`,
        description: "REWARD CLAIMED!",
      });
    } else if (reward.type === "character") {
      const unlocked = unlockCharacter(reward.characterId);

      if (!unlocked) return;

      setUnlockedCharacters(getUnlockedCharacters());

      setRewardPopup({
        type: "character",
        title: reward.name.toUpperCase(),
        description: "NEW CHARACTER UNLOCKED!",
        image: FESTIVAL_CHARACTER_IMAGES[reward.characterId],
      });
    } else if (reward.type === "skin") {
      const unlocked = unlockSkin(reward.skinId);

      if (!unlocked) return;

      const skinData = skins.find((skin) => skin.id === reward.skinId);

      setRewardPopup({
        type: "skin",
        title: reward.name.toUpperCase(),
        description: "EXCLUSIVE SKIN UNLOCKED!",
        image: skinData?.image,
      });
    }
  };
  return (
    <main className="festival-screen">
      {rewardPopup && (
        <div
          className={`festival-reward-popup-overlay ${
            isRewardPopupClosing ? "reward-popup-closing" : ""
          }`}
        >
          <div
            className={`festival-reward-popup ${
              rewardPopup.type === "character" || rewardPopup.type === "skin"
                ? "character-reward-popup"
                : "coin-reward-popup"
            }`}
          >
            {rewardPopup.type === "character" || rewardPopup.type === "skin" ? (
              <img
                className="reward-popup-character-image"
                src={rewardPopup.image}
                alt={rewardPopup.title}
              />
            ) : (
              <div className="reward-popup-icon">🪙</div>
            )}

            <p className="reward-popup-eyebrow">FESTIVAL REWARDS</p>

            <h2>{rewardPopup.title}</h2>

            <p className="reward-popup-description">
              {rewardPopup.description}
            </p>

            <div className="reward-popup-line" />
          </div>
        </div>
      )}
      <div className="festival-background" />

      {/* HEADER */}
      <header className="festival-header">
        <div className="festival-logo">
          <span>VS</span>
          <h1>FIGHTER'S ARENA</h1>
        </div>

        <button className="festival-back-button" onClick={() => navigate("/")}>
          ← BACK TO MENU
        </button>
      </header>

      {/* FESTIVAL INTRO */}
      <section className="festival-intro">
        <p className="festival-eyebrow">THE FIGHT NEVER ENDS</p>

        <h2>COMBAT FESTIVAL</h2>

        <p className="festival-description">
          Complete challenges, earn festival points, and unlock exclusive
          rewards.
        </p>

        <div className="festival-status">
          <span>PERMANENT FESTIVAL</span>
          <span>{FESTIVAL_TOTAL_TIERS} TIERS</span>
          <span>{FESTIVAL_TOTAL_POINTS.toLocaleString()} TOTAL POINTS</span>
        </div>
      </section>

      {/* OVERALL PROGRESS */}
      <section className="festival-progress-section">
        <div className="festival-progress-info">
          <div>
            <span className="festival-section-label">
              YOUR FESTIVAL PROGRESS
            </span>
            <strong>
              {playerPoints} / {FESTIVAL_TOTAL_POINTS} PTS
            </strong>
          </div>

          <span className="festival-progress-percent">
            {Math.floor(progressPercentage)}%
          </span>
        </div>

        <div className="festival-progress-track">
          <div
            className="festival-progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </section>

      {/* REWARD TRACK */}
      <section className="festival-rewards-section">
        <div className="festival-section-heading">
          <div>
            <p className="festival-eyebrow">YOUR REWARDS</p>
            <h3>FESTIVAL REWARD TRACK</h3>
          </div>

          <span className="festival-tier-count">{FESTIVAL_TOTAL_TIERS} TIERS</span>
        </div>

        <div className="festival-track-container">
          <div
            className="festival-track"
            style={{ "--festival-tier-count": FESTIVAL_TOTAL_TIERS }}
          >
            {/* TIER NUMBERS */}
            <div className="festival-tier-row">
              {tiers.map((tier) => {
                const unlocked = playerPoints >= tier.points;

                return (
                  <div
                    className={`festival-tier-header ${
                      unlocked ? "tier-unlocked" : ""
                    }`}
                    key={tier.number}
                  >
                    <span className="festival-tier-number">
                      TIER {tier.number}
                    </span>

                    <strong>{tier.points} PTS</strong>
                  </div>
                );
              })}
            </div>

            {/* FREE REWARDS */}
            <div className="festival-reward-row free-reward-row">
              <div className="festival-reward-label">
                <span>🎁</span>
                <strong>FREE</strong>
              </div>

              {tiers.map((tier) => {
                const reward = FESTIVAL_REWARDS[tier.number]?.free;
                const unlocked = playerPoints >= tier.points;

                const claimed = festivalProgress.claimedFreeRewards.includes(
                  tier.number,
                );

                return (
                  <div
                    className={`festival-reward-slot ${
                      unlocked ? "reward-unlocked" : ""
                    } ${
                      reward?.type === "character" || reward?.type === "skin"
                        ? "character-reward-slot"
                        : ""
                    }`}
                    key={tier.number}
                  >
                    {reward?.type === "character" || reward?.type === "skin" ? (
                      <img
                        className="reward-character-image"
                        src={
                          reward.type === "skin"
                            ? skins.find((skin) => skin.id === reward.skinId)
                                ?.image
                            : FESTIVAL_CHARACTER_IMAGES[reward.characterId]
                        }
                        alt={reward.name}
                      />
                    ) : (
                      <span className="reward-icon">🪙</span>
                    )}

                    <span className="reward-name">
                      {getRewardDisplay(reward)}
                    </span>

                    {getRewardRarity(reward) && (
                      <span
                        className={`reward-rarity rarity-${getRewardRarity(
                          reward,
                        ).toLowerCase()}`}
                      >
                        {getRewardRarity(reward).toUpperCase()}
                      </span>
                    )}

                    <span className="reward-status">
                      {claimed ? "CLAIMED ✓" : unlocked ? "UNLOCKED" : "LOCKED"}
                    </span>

                    <button
                      className="festival-claim-button"
                      disabled={!unlocked || claimed}
                      onClick={() => claimReward(tier.number, "free")}
                    >
                      {claimed
                        ? "CLAIMED"
                        : unlocked
                          ? "CLAIM REWARD"
                          : "LOCKED"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* DIVIDER BETWEEN FREE AND ELITE */}
            <div className="festival-track-divider">
              <span>ELITE PASS REWARDS</span>
            </div>

            {/* ELITE REWARDS */}
            <div className="festival-reward-row elite-reward-row">
              <div className="festival-reward-label">
                <span>👑</span>
                <strong>ELITE</strong>
              </div>

              {tiers.map((tier) => {
                const reward = FESTIVAL_REWARDS[tier.number]?.elite;

                const tierUnlocked = playerPoints >= tier.points;
                const unlocked =
                  tierUnlocked && festivalProgress.elitePassOwned;

                const claimed = festivalProgress.claimedEliteRewards.includes(
                  tier.number,
                );

                return (
                  <div
                    className={`festival-reward-slot ${
                      unlocked ? "reward-unlocked" : ""
                    } ${
                      reward?.type === "character" || reward?.type === "skin"
                        ? "character-reward-slot"
                        : ""
                    }`}
                    key={tier.number}
                  >
                    {reward?.type === "character" || reward?.type === "skin" ? (
                      <img
                        className="reward-character-image"
                        src={
                          reward.type === "skin"
                            ? skins.find((skin) => skin.id === reward.skinId)
                                ?.image
                            : FESTIVAL_CHARACTER_IMAGES[reward.characterId]
                        }
                        alt={reward.name}
                      />
                    ) : (
                      <span className="reward-icon">🪙</span>
                    )}

                    <span className="reward-name">
                      {getRewardDisplay(reward)}
                    </span>

                    {getRewardRarity(reward) && (
                      <span
                        className={`reward-rarity rarity-${getRewardRarity(
                          reward,
                        ).toLowerCase()}`}
                      >
                        {getRewardRarity(reward).toUpperCase()}
                      </span>
                    )}

                    <span className="reward-status">
                      {claimed
                        ? "CLAIMED ✓"
                        : !tierUnlocked
                          ? "LOCKED"
                          : !festivalProgress.elitePassOwned
                            ? "PASS REQUIRED"
                            : "UNLOCKED"}
                    </span>

                    <button
                      className="festival-claim-button"
                      disabled={!unlocked || claimed}
                      onClick={() => claimReward(tier.number, "elite")}
                    >
                      {claimed
                        ? "CLAIMED"
                        : !tierUnlocked
                          ? "LOCKED"
                          : !festivalProgress.elitePassOwned
                            ? "PASS REQUIRED"
                            : "CLAIM REWARD"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <p className="festival-track-hint">
          ← SCROLL HORIZONTALLY TO VIEW ALL {FESTIVAL_TOTAL_TIERS} TIERS →
        </p>

        {/* ELITE PASS INFORMATION */}
        <div className="festival-elite-banner">
          <div>
            <span className="elite-crown">👑</span>

            <div>
              <h4>
                {festivalProgress.elitePassOwned
                  ? "ELITE PASS ACTIVATED"
                  : "UPGRADE TO ELITE"}
              </h4>

              <p>
                {festivalProgress.elitePassOwned
                  ? "You have unlocked the exclusive Elite reward track."
                  : `Unlock access to all ${FESTIVAL_TOTAL_TIERS} exclusive Elite rewards.`}
              </p>

              <strong className="festival-coin-balance">
                YOUR BALANCE: 🪙 {coinBalance.toLocaleString()}
              </strong>
            </div>
          </div>

          <button
            className="festival-elite-button"
            onClick={purchaseElitePass}
            disabled={festivalProgress.elitePassOwned}
          >
            {festivalProgress.elitePassOwned
              ? "OWNED ✓"
              : `BUY ELITE · ${ELITE_PASS_COST.toLocaleString()} COINS`}
          </button>

          {purchaseMessage && (
            <p className="festival-purchase-message">{purchaseMessage}</p>
          )}
        </div>
      </section>

      {/* ROTATING CHALLENGES */}
      <section className="festival-challenges-section">
        <div className="festival-section-heading">
          <div>
            <p className="festival-eyebrow">EARN FESTIVAL POINTS</p>
            <h3>ROTATING CHALLENGES</h3>
          </div>

          <span className="festival-refresh-label">
            ↻ NEW CHALLENGES IN {formatChallengeTime(challengeTimeLeft)}
          </span>
        </div>

        <div className="festival-challenge-grid">
          {challenges.map((challenge) => (
            <article
              className={`festival-challenge-card ${
                challenge.completed ? "challenge-completed" : ""
              }`}
              key={challenge.id}
            >
              <div className="challenge-card-top">
                <span className="challenge-icon">{challenge.icon}</span>

                <span className="challenge-category">{challenge.category}</span>
              </div>

              <h4>{challenge.title}</h4>

              <p>{challenge.description}</p>

              <div className="challenge-card-footer">
                <span className="challenge-points">
                  +{challenge.points} PTS
                </span>

                <span className="challenge-progress">
                  {challenge.progress} / {challenge.target}
                </span>
              </div>

              <div className="challenge-progress-track">
                <div
                  className="challenge-progress-fill"
                  style={{
                    width: `${(challenge.progress / challenge.target) * 100}%`,
                  }}
                />
              </div>

              {challenge.completed && (
                <span className="challenge-complete-label">✓ COMPLETED</span>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* DAILY OBJECTIVES */}
      <section className="festival-daily-section">
        <div className="festival-section-heading">
          <div>
            <p className="festival-eyebrow">DAILY MISSIONS</p>
            <h3>DAILY OBJECTIVES</h3>
          </div>

          <span className="festival-refresh-label">
            ↻ NEW OBJECTIVES IN {formatDailyTime(dailyTimeLeft)}
          </span>

          <span className="festival-daily-label">DAILY REWARDS</span>
        </div>

        <div className="festival-daily-grid">
          {dailyObjectives.map((objective) => {
            const progressPercent = Math.min(
              100,
              (objective.progress / objective.target) * 100,
            );

            return (
              <article
                className={`festival-challenge-card ${
                  objective.completed ? "challenge-completed" : ""
                }`}
                key={objective.id}
              >
                <div className="challenge-card-top">
                  <span className="challenge-icon">{objective.icon}</span>

                  <span className="challenge-category">
                    {objective.category}
                  </span>
                </div>

                <h4>{objective.title}</h4>

                <p>{objective.description}</p>

                <div className="challenge-card-footer">
                  <span className="challenge-points">
                    +{objective.points} PTS
                  </span>

                  <span className="challenge-progress">
                    {objective.progress} / {objective.target}
                  </span>
                </div>

                <div className="challenge-progress-track">
                  <div
                    className="challenge-progress-fill"
                    style={{
                      width: `${progressPercent}%`,
                    }}
                  />
                </div>

                {objective.completed && (
                  <span className="challenge-complete-label">✓ COMPLETED</span>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default Festival;