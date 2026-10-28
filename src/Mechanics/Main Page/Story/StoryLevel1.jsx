
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StoryCutscene from "./StoryCutscene.jsx";

const level1Dialogue = [
  {
    speaker: "NARRATOR",
    text: "A new challenge awaits. The road to becoming a champion begins here.",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "opening",
  },
  {
    speaker: "ROCK LEE",
    text: "I have been waiting for a worthy opponent!",
    characterId: "rockLee",
    expression: "determined",
    position: "right",
    animation: "enter",
    background: "arena",
  },
  {
    speaker: "ROCK LEE",
    text: "Show me what you can do! My training has prepared me for this moment!",
    characterId: "rockLee",
    expression: "excited",
    position: "right",
    animation: "bounce",
    background: "arena",
  },
  {
    speaker: "NARRATOR",
    text: "Your first battle is about to begin. Choose your fighter!",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "arena",
  },
];

function StoryLevel1() {
  const location = useLocation();
  const navigate = useNavigate();

  const defaultLevelConfig = {
    gameMode: "story",
    storyChapter: 1,
    storyLevel: 1,
    teamSize: "1v1",
    difficulty: "Normal",
    teamControl: "single-player",
    opponentId: "rockLee",
    background: null,
  };

  const levelConfig = {
    ...defaultLevelConfig,
    ...(location.state ?? {}),
  };

  const isResultsPhase = location.state?.storyPhase === "results";
  const won = location.state?.won === true;

  const playerName = location.state?.playerName ?? "Player";
  const opponentName = location.state?.opponentName ?? "Rock Lee";
  const damageDealt = location.state?.damageDealt ?? 0;
  const attacksUsed = location.state?.attacksUsed ?? 0;

  const victoryDialogue = [
    {
      speaker: "ROCK LEE",
      text: "Incredible! You have defeated me! Your fighting spirit is truly amazing!",
    },
    {
      speaker: playerName.toUpperCase(),
      text: "That was a tough battle. I still have so much to learn.",
    },
    {
      speaker: "ROCK LEE",
      text: "That is the attitude of a true fighter! Never stop training, and you will become even stronger!",
    },
    {
      speaker: "NARRATOR",
      text: "Your first victory marks the beginning of a much greater journey.",
    },
  ];

  const defeatDialogue = [
    {
      speaker: playerName.toUpperCase(),
      text: "I lost... I thought I was ready, but I still have a long way to go.",
    },
    {
      speaker: "ROCK LEE",
      text: "Do not lose heart! Defeat is not the end. It is an opportunity to discover your weaknesses!",
    },
    {
      speaker: playerName.toUpperCase(),
      text: "You're right. I'll train harder and come back stronger!",
    },
    {
      speaker: "ROCK LEE",
      text: "Excellent! I will be looking forward to our next battle. Give it everything you've got!",
    },
  ];

  const dialogue = won ? victoryDialogue : defeatDialogue;

  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const advanceDialogue = () => {
    if (dialogueIndex < dialogue.length - 1) {
      setDialogueIndex((index) => index + 1);
    } else {
      setShowSummary(true);
    }
  };

  const retryLevel = () => {
    navigate("/story-cutscene", {
      state: {
        ...defaultLevelConfig,
        storyPhase: "intro",
      },
    });
  };

  const returnToStoryMap = () => {
    navigate("/story-mode", {
      state: {
        gameMode: "story",
        storyChapter: levelConfig.storyChapter,
        storyLevel: levelConfig.storyLevel,
      },
    });
  };

  // Normal entry: play the level's introduction.
  if (!isResultsPhase) {
    return (
      <StoryCutscene
        dialogue={level1Dialogue}
        levelConfig={levelConfig}
      />
    );
  }

  // Results entry: play the level-specific post-battle conversation.
  if (!showSummary) {
    const currentDialogue = dialogue[dialogueIndex];

    return (
      <div id="storyResultsScreen">
        <div className="story-results-content story-dialogue-content">
          <p className="story-results-eyebrow">
            CHAPTER {levelConfig.storyChapter} · LEVEL{" "}
            {levelConfig.storyLevel}
          </p>

          <h1
            className={
              won ? "story-results-victory" : "story-results-defeat"
            }
          >
            {won ? "AFTER THE BATTLE" : "AFTER THE DEFEAT"}
          </h1>

          <div className="story-dialogue-panel">
            <p className="story-dialogue-speaker">
              {currentDialogue.speaker}
            </p>

            <p className="story-dialogue-text" key={dialogueIndex}>
              {currentDialogue.text}
            </p>
          </div>

          <p className="story-dialogue-progress">
            DIALOGUE {dialogueIndex + 1} / {dialogue.length}
          </p>

          <div className="story-results-actions">
            <button type="button" onClick={advanceDialogue}>
              {dialogueIndex === dialogue.length - 1
                ? "VIEW RESULTS"
                : "NEXT"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // After the conversation, show the battle summary.
  return (
    <div id="storyResultsScreen">
      <div className="story-results-content">
        <p className="story-results-eyebrow">
          CHAPTER {levelConfig.storyChapter} · LEVEL{" "}
          {levelConfig.storyLevel}
        </p>

        <h1
          className={
            won ? "story-results-victory" : "story-results-defeat"
          }
        >
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
          <button type="button" onClick={returnToStoryMap}>
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

export default StoryLevel1;
