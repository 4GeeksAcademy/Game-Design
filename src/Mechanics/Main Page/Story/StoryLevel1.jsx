
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StoryCutscene from "./StoryCutscene.jsx";

// CUTSCENE 1: The original Rock Lee introduction.
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
    expression: "happy",
    position: "right",
    animation: "enter",
    background: "arena",
  },
  {
    speaker: "ROCK LEE",
    text: "Show me what you can do! My training has prepared me for this moment!",
    characterId: "rockLee",
    expression: "neutral",
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

// CUTSCENE 2: The first battle's aftermath, followed by Tenten's entrance.
// This plays after the 1v1 against Rock Lee, whether the player wins or loses.
function createCutscene2({ won, playerName }) {
  const playerSpeaker = playerName.toUpperCase();

  const afterBattleDialogue = won
    ? [
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
          speaker: playerSpeaker,
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
      ]
    : [
        {
          speaker: playerSpeaker,
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
          speaker: playerSpeaker,
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

  const tentenIntroduction = [
    {
      speaker: "TENTEN",
      text: "Lee! There you are. I hope you haven't forgotten that I'm here to train too!",
      characterId: "tenten",
      expression: "determined",
      position: "left",
      animation: "enter",
      background: "arena",
    },
    {
      speaker: "ROCK LEE",
      text: "Tenten! Of course not! We have another challenge ahead of us!",
      characterId: "rockLee",
      expression: "excited",
      position: "right",
      animation: "bounce",
      background: "arena",
    },
    {
      speaker: "TENTEN",
      text: "Then let's do this together. I want to see how our challenger handles two opponents!",
      characterId: "tenten",
      expression: "excited",
      position: "left",
      animation: "bounce",
      background: "arena",
    },
    {
      speaker: "NARRATOR",
      text: "Your next challenge is a two-on-one battle! Prepare to face Rock Lee and Tenten together!",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "arena",
    },
  ];

  return [...afterBattleDialogue, ...tentenIntroduction];
}

// FINAL CUTSCENE: The outcome of the second battle.
function createFinalCutscene({ won, playerName }) {
  const playerSpeaker = playerName.toUpperCase();

  if (won) {
    return [
      {
        speaker: "TENTEN",
        text: "Wow! You managed to beat both of us! I didn't expect that!",
        characterId: "tenten",
        expression: "excited",
        position: "left",
        animation: "bounce",
        background: "arena",
      },
      {
        speaker: "ROCK LEE",
        text: "Magnificent! Your determination has carried you through an incredible challenge!",
        characterId: "rockLee",
        expression: "excited",
        position: "right",
        animation: "enter",
        background: "arena",
      },
      {
        speaker: playerSpeaker,
        text: "That was even tougher than the first fight. I'm glad I didn't give up!",
        characterId: null,
        expression: "neutral",
        position: "center",
        animation: "fade",
        background: "arena",
      },
      {
        speaker: "NARRATOR",
        text: "You have overcome your first great challenge. Level 1 is complete, but a greater journey awaits!",
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
      speaker: playerSpeaker,
      text: "I couldn't defeat them both... I still have more training to do.",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "arena",
    },
    {
      speaker: "TENTEN",
      text: "You put up a good fight! Now you know what you need to work on.",
      characterId: "tenten",
      expression: "determined",
      position: "left",
      animation: "enter",
      background: "arena",
    },
    {
      speaker: "ROCK LEE",
      text: "Never give up on your dreams! Every defeat can make you stronger!",
      characterId: "rockLee",
      expression: "determined",
      position: "right",
      animation: "bounce",
      background: "arena",
    },
    {
      speaker: "NARRATOR",
      text: "Your first chapter comes to an end. Take what you have learned and prepare for the challenges ahead!",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "opening",
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

  const storyPhase = levelConfig.storyPhase ?? "opening";
  const isAfterBattle = storyPhase === "continue";
  const isSecondBattle = levelConfig.storyMatchType === "1v2";

  const previousBattleWon = levelConfig.previousBattleWon === true;
  const previousPlayerName = levelConfig.previousPlayerName ?? "Player";

  // CUTSCENE 1 -> BATTLE 1: Player versus Rock Lee.
  const startFirstBattle = () => {
    navigate("/character-select", {
      state: {
        ...levelConfig,
        gameMode: "story",
        storyPhase: "battle1",
        storyMatchType: "1v1",
        teamSize: "1v1",
        opponentId: "rockLee",
        opponentTeamIds: ["rockLee"],
      },
    });
  };

  // CUTSCENE 2 -> BATTLE 2: Player versus Rock Lee and Tenten.
  const startSecondBattle = () => {
  navigate("/character-select", {
    state: {
      ...levelConfig,
      gameMode: "story",
      storyPhase: "battle2",
      storyMatchType: "1v2",
      teamSize: "1v1",
      opponentId: "rockLee",
      opponentTeamIds: ["rockLee", "tenten"],

      // Preserve the result of Battle 1.
      firstBattleWon: previousBattleWon,
    },
  });
};

  // After the second battle's ending cutscene, return to the story map.
  const finishLevel = () => {
  const level1Completed =
    levelConfig.firstBattleWon === true &&
    previousBattleWon === true;

  // Save completion only when both battles were won.
  if (level1Completed) {
    localStorage.setItem("storyLevel1Complete", "true");
  }

  navigate("/story-mode", {
    state: {
      gameMode: "story",
      storyChapter: levelConfig.storyChapter,
      storyLevel: levelConfig.storyLevel,
      firstBattleWon: levelConfig.firstBattleWon,
      lastBattleWon: previousBattleWon,
      storyLevelComplete: level1Completed,
      level1Completed,
    },
  });
};

  // After Battle 1, play the aftermath and Tenten's introduction.
  if (isAfterBattle && !isSecondBattle) {
    return (
      <StoryCutscene
        key={`level1-cutscene2-${previousBattleWon}`}
        dialogue={createCutscene2({
          won: previousBattleWon,
          playerName: previousPlayerName,
        })}
        levelConfig={levelConfig}
        onComplete={startSecondBattle}
      />
    );
  }

  // After Battle 2, play the final win/defeat cutscene.
  if (isAfterBattle && isSecondBattle) {
    return (
      <StoryCutscene
        key={`level1-finale-${previousBattleWon}`}
        dialogue={createFinalCutscene({
          won: previousBattleWon,
          playerName: previousPlayerName,
        })}
        levelConfig={levelConfig}
        onComplete={finishLevel}
      />
    );
  }

  // The opening remains unchanged and leads to the first 1v1.
  return (
    <StoryCutscene
      key="level1-opening"
      dialogue={level1Cutscene1}
      levelConfig={levelConfig}
      onComplete={startFirstBattle}
    />
  );
}

export default StoryLevel1;
