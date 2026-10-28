
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StoryCutscene from "./StoryCutscene.jsx";

const level1Cutscene1 = [
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

function createAfterBattleCutscene({
  won,
  playerName,
}) {
  if (won) {
    return [
      {
        speaker: "ROCK LEE",
        text: "Incredible! You have defeated me! Your fighting spirit is truly amazing!",
        characterId: "rockLee",
        expression: "excited",
        position: "right",
        animation: "bounce",
        background: "arena",
      },
      {
        speaker: playerName.toUpperCase(),
        text: "That was a tough battle. I still have so much to learn.",
        characterId: null,
        expression: "neutral",
        position: "center",
        animation: "fade",
        background: "arena",
      },
      {
        speaker: "ROCK LEE",
        text: "That is the attitude of a true fighter! Never stop training, and you will become even stronger!",
        characterId: "rockLee",
        expression: "determined",
        position: "right",
        animation: "enter",
        background: "arena",
      },
      {
        speaker: "NARRATOR",
        text: "Your first victory marks the beginning of a much greater journey.",
        characterId: null,
        expression: "neutral",
        position: "center",
        animation: "fade",
        background: "opening",
      },
    ];
  }

  return [
    {
      speaker: playerName.toUpperCase(),
      text: "I lost... I thought I was ready, but I still have a long way to go.",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "arena",
    },
    {
      speaker: "ROCK LEE",
      text: "Do not lose heart! Defeat is not the end. It is an opportunity to discover your weaknesses!",
      characterId: "rockLee",
      expression: "determined",
      position: "right",
      animation: "enter",
      background: "arena",
    },
    {
      speaker: playerName.toUpperCase(),
      text: "You're right. I'll train harder and come back stronger!",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "arena",
    },
    {
      speaker: "ROCK LEE",
      text: "Excellent! I will be looking forward to our next battle. Give it everything you've got!",
      characterId: "rockLee",
      expression: "excited",
      position: "right",
      animation: "bounce",
      background: "arena",
    },
  ];
}

function StoryLevel1() {
  const location = useLocation();
  const navigate = useNavigate();

  const levelConfig = {
    gameMode: "story",
    storyChapter: 1,
    storyLevel: 1,
    teamSize: "1v1",
    difficulty: "Normal",
    teamControl: "single-player",
    opponentId: "rockLee",
    background: null,
    ...(location.state ?? {}),
  };

  const isAfterBattle = levelConfig.storyPhase === "continue";

  const previousBattleWon =
    levelConfig.previousBattleWon === true;

  const previousPlayerName =
    levelConfig.previousPlayerName ?? "Player";

  // Opening cutscene ends by sending the player to Character Selection.
  const startBattle = () => {
    navigate("/character-select", {
      state: {
        ...levelConfig,
        gameMode: "story",
        storyPhase: "battle",
        opponentId: "rockLee",
      },
    });
  };

  // The current level's post-battle cutscene ends at the story map.
  // Future story events can replace this destination as the story expands.
  const finishAfterBattleCutscene = () => {
    navigate("/story-mode", {
      state: {
        gameMode: "story",
        storyChapter: levelConfig.storyChapter,
        storyLevel: levelConfig.storyLevel,
        lastBattleWon: previousBattleWon,
      },
    });
  };

  if (isAfterBattle) {
    return (
      <StoryCutscene
        key={`level1-after-battle-${previousBattleWon}`}
        dialogue={createAfterBattleCutscene({
          won: previousBattleWon,
          playerName: previousPlayerName,
        })}
        levelConfig={levelConfig}
        onComplete={finishAfterBattleCutscene}
      />
    );
  }

  return (
    <StoryCutscene
      key="level1-opening"
      dialogue={level1Cutscene1}
      levelConfig={levelConfig}
      onComplete={startBattle}
    />
  );
}

export default StoryLevel1;
