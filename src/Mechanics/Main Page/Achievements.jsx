
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ACHIEVEMENTS, getUnlockedAchievements, } from "./Achievements";
import "./Achievements.css";

function Achievements() {
  const navigate = useNavigate();

  const [unlocked, setUnlocked] = useState(() =>
    getUnlockedAchievements()
  );

  useEffect(() => {
    const updateAchievements = () => {
      setUnlocked(getUnlockedAchievements());
    };

    window.addEventListener("achievementsUpdated", updateAchievements);

    return () => {
      window.removeEventListener(
        "achievementsUpdated",
        updateAchievements
      );
    };
  }, []);

  const achievements = Object.values(ACHIEVEMENTS);
  const unlockedCount = achievements.filter((achievement) =>
    unlocked.includes(achievement.id)
  ).length;

  const progress =
    achievements.length === 0
      ? 0
      : (unlockedCount / achievements.length) * 100;

  return (
    <main className="achievements-screen">
      <div className="achievements-background" />

      <header className="achievements-header">
        <div className="achievements-logo">
          <span className="logo-mark">VS</span>
          <span>FIGHTER'S ARENA</span>
        </div>

        <button
          className="achievements-back"
          onClick={() => navigate("/")}
        >
          ← HOME
        </button>
      </header>

      <section className="achievements-content">
        <p className="achievements-eyebrow">YOUR LEGACY</p>

        <h1 className="achievements-title">
          ACHIEVEMENTS
        </h1>

        <p className="achievements-subtitle">
          Every victory leaves a mark.
        </p>

        <div className="achievement-progress">
          <div className="achievement-progress-info">
            <span>BADGES EARNED</span>
            <strong>
              {unlockedCount} / {achievements.length}
            </strong>
          </div>

          <div className="achievement-progress-track">
            <div
              className="achievement-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="achievement-grid">
          {achievements.map((achievement) => {
            const isUnlocked = unlocked.includes(achievement.id);

            return (
              <article
                key={achievement.id}
                className={`achievement-card ${
                  isUnlocked ? "unlocked" : "locked"
                }`}
              >
                <div className="achievement-artwork">
                  <img
                    src={achievement.artwork}
                    alt={achievement.title}
                  />

                  {!isUnlocked && (
                    <div className="achievement-lock">
                      <span>🔒</span>
                      <small>LOCKED</small>
                    </div>
                  )}
                </div>

                <div className="achievement-details">
                  <span className="achievement-category">
                    {achievement.category}
                  </span>

                  <h2>{achievement.title}</h2>

                  <p>{achievement.description}</p>

                  <div className="achievement-requirement">
                    <strong>REQUIREMENT</strong>
                    <span>{achievement.requirement}</span>
                  </div>

                  <div
                    className={`achievement-status ${
                      isUnlocked ? "earned" : "not-earned"
                    }`}
                  >
                    {isUnlocked ? "✓ ACHIEVEMENT EARNED" : "NOT YET EARNED"}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="achievements-footer">
        WILD CARDS © 2026
      </footer>
    </main>
  );
}

export default Achievements;
