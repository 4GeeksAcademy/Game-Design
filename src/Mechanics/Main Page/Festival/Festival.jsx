import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFestivalProgress,
  saveFestivalProgress,
  addFestivalPoints,
  FESTIVAL_TOTAL_POINTS,
  FESTIVAL_TOTAL_TIERS,
  FESTIVAL_POINTS_PER_TIER,
} from "./FestivalProgress";
import { getRotatingChallenges } from "./FestivalChallenges";
import { getCoins, spendCoins } from "../../Currency";
import "./Festival.css";

// Festival configuration
// const FESTIVAL_TOTAL_POINTS = 600;
// const TOTAL_TIERS = 15;
// const POINTS_PER_TIER = FESTIVAL_TOTAL_POINTS / TOTAL_TIERS;

// Temporary sample progress.
// We'll connect this to saved player data later.

const ELITE_PASS_COST = 15000;

// Each tier has a free and an elite reward placeholder.
const tiers = Array.from({ length: FESTIVAL_TOTAL_TIERS }, (_, index) => ({
  number: index + 1,
  points: (index + 1) * FESTIVAL_POINTS_PER_TIER,
}));

// Temporary challenge examples.
// const challenges = [
//   {
//     id: 1,
//     title: "Damage Dealer",
//     description: "Deal 500 damage across battles.",
//     points: 10,
//     icon: "⚔️",
//     category: "OFFENSE",
//   },
//   {
//     id: 2,
//     title: "Defensive Fighter",
//     description: "Successfully block or evade 5 attacks.",
//     points: 15,
//     icon: "🛡️",
//     category: "DEFENSE",
//   },
//   {
//     id: 3,
//     title: "Victory Streak",
//     description: "Win 2 battles.",
//     points: 20,
//     icon: "🏆",
//     category: "VICTORY",
//   },
//   {
//     id: 4,
//     title: "Attack Master",
//     description: "Use 10 attacks during combat.",
//     points: 10,
//     icon: "💥",
//     category: "COMBAT",
//   },
// ];

// const dailyObjectives = [
//   {
//     id: 1,
//     title: "Enter the Arena",
//     description: "Complete 3 battles.",
//     points: 30,
//   },
//   {
//     id: 2,
//     title: "Warrior's Effort",
//     description: "Deal 1,000 total damage.",
//     points: 40,
//   },
//   {
//     id: 3,
//     title: "Prove Your Strength",
//     description: "Win 3 battles.",
//     points: 50,
//   },
// ];

const formatChallengeTime = (milliseconds) => {
  const totalSeconds = Math.ceil(milliseconds / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
};

const dailyObjectives = [
  {
    id: 1,
    title: "Enter the Arena",
    description: "Complete 3 battles.",
    points: 30,
  },
  {
    id: 2,
    title: "Warrior's Effort",
    description: "Deal 1,000 total damage.",
    points: 40,
  },
  {
    id: 3,
    title: "Prove Your Strength",
    description: "Win 3 battles.",
    points: 50,
  },
];

function Festival() {
  const navigate = useNavigate();
  const [festivalProgress, setFestivalProgress] = useState(() =>
    getFestivalProgress(),
  );

  const [challengeRotation, setChallengeRotation] = useState(
  () => getRotatingChallenges()
);

const [challengeTimeLeft, setChallengeTimeLeft] = useState(() =>
  Math.max(0, getRotatingChallenges().expiresAt - Date.now())
);

const challenges = challengeRotation.challenges;

useEffect(() => {
  const updateChallenges = () => {
    const rotation = getRotatingChallenges();

    setChallengeRotation(rotation);
    setChallengeTimeLeft(
      Math.max(0, rotation.expiresAt - Date.now())
    );
  };

  updateChallenges();

  // Keep the countdown updated every second.
  const timer = setInterval(updateChallenges, 1000);

  window.addEventListener(
    "festivalChallengesUpdated",
    updateChallenges
  );

  return () => {
    clearInterval(timer);

    window.removeEventListener(
      "festivalChallengesUpdated",
      updateChallenges
    );
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

  return (
    <main className="festival-screen">
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
          <span>15 TIERS</span>
          <span>600 TOTAL POINTS</span>
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

          <span className="festival-tier-count">15 TIERS</span>
        </div>

        <div className="festival-track-container">
          <div className="festival-track">
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
                const unlocked = playerPoints >= tier.points;

                return (
                  <div
                    className={`festival-reward-slot ${
                      unlocked ? "reward-unlocked" : ""
                    }`}
                    key={tier.number}
                  >
                    <span className="reward-icon">🎁</span>
                    <span className="reward-name">FREE REWARD</span>
                    {unlocked && (
                      <span className="reward-status">UNLOCKED</span>
                    )}
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
                const unlocked =
                  playerPoints >= tier.points &&
                  festivalProgress.elitePassOwned;

                return (
                  <div
                    className={`festival-reward-slot ${
                      unlocked ? "reward-unlocked" : ""
                    }`}
                    key={tier.number}
                  >
                    <span className="reward-icon">👑</span>
                    <span className="reward-name">ELITE REWARD</span>

                    <span className="reward-status">
  {unlocked
    ? "UNLOCKED"
    : playerPoints >= tier.points
      ? "PASS REQUIRED"
      : "LOCKED"}
</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <p className="festival-track-hint">
          ← SCROLL HORIZONTALLY TO VIEW ALL 15 TIERS →
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
                  : "Unlock access to all 15 exclusive Elite rewards."}
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

      <span className="challenge-category">
        {challenge.category}
      </span>
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
          width: `${
            (challenge.progress / challenge.target) * 100
          }%`,
        }}
      />
    </div>

    {challenge.completed && (
      <span className="challenge-complete-label">
        ✓ COMPLETED
      </span>
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

          <span className="festival-daily-label">DAILY REWARDS</span>
        </div>

        <div className="festival-daily-grid">
          {dailyObjectives.map((objective) => (
            <article className="festival-daily-card" key={objective.id}>
              <div>
                <h4>{objective.title}</h4>
                <p>{objective.description}</p>
              </div>

              <strong>+{objective.points} PTS</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Festival;
