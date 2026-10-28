import React from "react";
import { useNavigate } from "react-router-dom";

function StoryResultsScreen({
  won,
  playerName,
  opponentName,
  damageDealt,
  attacksUsed,
  levelConfig,
}) {
  const navigate = useNavigate();

  const chapter = levelConfig?.storyChapter ?? 1;
  const level = levelConfig?.storyLevel ?? 1;

  const returnToStory = () => {
    navigate("/story-mode", {
      state: {
        gameMode: "story",
        storyChapter: chapter,
        storyLevel: level,
      },
    });
  };

  const retryLevel = () => {
    navigate("/story-cutscene", {
      state: {
        ...levelConfig,
        gameMode: "story",
      },
    });
  };

  return (
    <div id="storyResultsScreen">
      <div className="story-results-content">
        <p className="story-results-eyebrow">
          CHAPTER {chapter} · LEVEL {level}
        </p>

        <h1 className={won ? "story-results-victory" : "story-results-defeat"}>
          {won ? "VICTORY!" : "DEFEAT"}
        </h1>

        <p className="story-results-message">
          {won
            ? `${playerName} defeated ${opponentName}!`
            : `${opponentName} defeated ${playerName}.`}
        </p>

        <div className="story-results-stats">
          <div>
            <span>DAMAGE DEALT</span>
            <strong>{Math.floor(damageDealt)}</strong>
          </div>

          <div>
            <span>ATTACKS USED</span>
            <strong>{attacksUsed}</strong>
          </div>
        </div>

        {won && (
          <p className="story-results-completion">
            LEVEL COMPLETE
          </p>
        )}

        <div className="story-results-actions">
          <button type="button" onClick={returnToStory}>
            RETURN TO STORY MAP
          </button>

          <button type="button" onClick={retryLevel}>
            RETRY LEVEL
          </button>
        </div>
      </div>
    </div>
  );
}

export default StoryResultsScreen;
