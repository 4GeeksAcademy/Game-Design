import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./StoryMode.css";

function StoryMode() {
  const navigate = useNavigate();
  const location = useLocation();

  const [screen, setScreen] = useState("chapters");

  const [level1Complete, setLevel1Complete] = useState(
    () => localStorage.getItem("storyLevel1Complete") === "true",
  );

  useEffect(() => {
    if (location.state?.level1Completed === true) {
      localStorage.setItem("storyLevel1Complete", "true");
      setLevel1Complete(true);
    }
  }, [location.state]);

  const renderChapters = () => (
    <>
      <p className="story-eyebrow">YOUR LEGEND BEGINS</p>
      <h1 className="story-title">STORY MODE</h1>
      <p className="story-description">
        Fight your way through the story of Fighter's Arena.
      </p>
      

      <div className="story-chapter-list">
        <button
          className="story-chapter available"
          onClick={() => setScreen("levels")}
        >
          <span className="story-chapter-number">01</span>
          <span className="story-chapter-info">
            <strong>CHAPTER 1</strong>
            <small>THE BEGINNING</small>
          </span>
          <span className="story-chapter-status">PLAY ▶</span>
        </button>

        {[2, 3].map((chapter) => (
          <button key={chapter} className="story-chapter locked" disabled>
            <span className="story-chapter-number">
              {String(chapter).padStart(2, "0")}
            </span>
            <span className="story-chapter-info">
              <strong>CHAPTER {chapter}</strong>
              <small>COMING SOON</small>
            </span>
            <span className="story-chapter-status">LOCKED</span>
          </button>
        ))}
      </div>

      <button className="story-back-button" onClick={() => navigate("/")}>
        ← HOMESCREEN
      </button>
    </>
  );

  const renderLevels = () => (
    <>
      <p className="story-eyebrow">CHAPTER 1</p>
      <h1 className="story-title">THE BEGINNING</h1>
      <p className="story-description">
        Complete each level to continue your journey.
      </p>

      <div className="story-level-map">
        <svg
          className="story-level-path"
          viewBox="0 0 320 220"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 35 175 C 65 175, 65 125, 105 125 S 145 75, 185 75 S 235 125, 285 45"
            fill="none"
            stroke="#8ca9c9"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="7 5"
          />
        </svg>

        <button
          className={`story-level-node level-one ${
            level1Complete ? "completed" : ""
          }`}
          onClick={() =>
            navigate("/story-cutscene", {
              state: {
                gameMode: "story",
                storyChapter: 1,
                storyLevel: 1,
                teamSize: "1v1",
                difficulty: "Normal",
                teamControl: "single-player",
                opponentId: "rockLee",
                background: null,
              },
            })
          }
          aria-label={
            level1Complete ? "Replay completed Level 1" : "Play Level 1"
          }
        >
          <strong>01</strong>
          <small>{level1Complete ? "COMPLETED" : "START"}</small>
        </button>

        <button
          className={`story-level-node level-two ${
            level1Complete ? "available" : "locked"
          }`}
          disabled={!level1Complete}
          aria-label={level1Complete ? "Level 2 unlocked" : "Level 2 locked"}
          title={
            level1Complete
              ? "Level 2 unlocked — story coming soon"
              : "Complete Level 1 to unlock"
          }
        >
          <strong>02</strong>
          <small>{level1Complete ? "UNLOCKED" : "LOCKED"}</small>
        </button>

        <div
          className="story-level-node level-three locked"
          aria-label="Level 3 locked"
        >
          <strong>03</strong>
          <small>LOCKED</small>
        </div>

        <div
          className="story-level-node level-four locked"
          aria-label="Level 4 locked"
        >
          <strong>04</strong>
          <small>LOCKED</small>
        </div>
      </div>

      <button
        className="story-back-button"
        onClick={() => setScreen("chapters")}
      >
        ← CHAPTER SELECT
      </button>
    </>
  );

  return (
    <main className="story-screen">
      <header className="story-header">
        <div className="story-logo">
          <span className="story-logo-mark">VS</span>
          <span>FIGHTER'S ARENA</span>
        </div>
        <span className="story-header-label">STORY CAMPAIGN</span>
      </header>

      <section className="story-content" key={screen}>
        {screen === "chapters" ? renderChapters() : renderLevels()}
      </section>

      <footer className="story-footer">FIGHTER'S ARENA © 2026</footer>
    </main>
  );
}

export default StoryMode;
