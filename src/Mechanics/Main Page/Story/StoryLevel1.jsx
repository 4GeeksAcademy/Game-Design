import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StoryCutscene from "./StoryCutscene.jsx";

// ============================================================
// LEVEL 1 — A STRANGER IN THE HIDDEN LEAF
//
// Scene 1: Rock Lee challenges the player.
// Battle 1: Player vs. Rock Lee (1v1).
//
// Scene 2: Tenten finds Lee causing trouble.
// Battle 2: Player vs. Rock Lee and Tenten (1v2).
//
// Ending: The player spends the night in the Leaf Village.
// ============================================================


// ------------------------------------------------------------
// CUTSCENE 1 — AN UNEXPECTED CHALLENGE
// ------------------------------------------------------------

const level1Cutscene1 = [
  
 
  {
    speaker: "NARRATOR",
    text: "By the time you reach the Land of Fire, your legs are begging you to stop. You have traveled farther than you intended, and the thought of sleeping beneath another tree is becoming less appealing by the minute.",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "opening",
  },
  {
    speaker: "NARRATOR",
    text: "Then, beyond the trees, you finally spot it:",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "opening",
  },
  {
    speaker: "NARRATOR",
    text: "Konohagakure, the Hidden Leaf Village!",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "leafVillage",
  },
  {
    speaker: "NARRATOR",
    text: "You have heard stories about this place. It is home to some of the strongest shinobi in the world.",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "leafVillage",
  },
{
    speaker: "NARRATOR",
    text: "The Hokage Monument overlooks the village, while merchants, shinobi, and ordinary citizens fill its busy streets.",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "arena",
  },
  {
    speaker: "NARRATOR",
    text: "For now, however, you have a much simpler objective.",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "arena",
  },
  {
    speaker: "PLAYER",
    text: "First, I need a room. Then I can figure out what to do next.",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "arena",
  },
  {
    speaker: "NARRATOR",
    text: "You take a turn down a quieter street. Before you can get your bearings, a loud voice rings out from a nearby training ground.",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "leafCorner1",
  },
  {
    speaker: "ROCK LEE",
    text: "ONE THOUSAND! ONE THOUSAND AND ONE! ONE THOUSAND AND TWO!",
    characterId: "rockLee",
    expression: "pushups2",
    position: "center",
    animation: "enter",
    zoom: 1,
    background: "leafCorner1",
  },
  {
    speaker: "NARRATOR",
    text: "A young shinobi is doing push-ups with enough intensity to make you wonder whether he is training for a mission or trying to defeat the ground itself.",
    characterId: "rockLee",
    expression: "pushups2",
    position: "center",
    animation: "bounce",
    background: "leafCorner1",
  },
  {
    speaker: "ROCK LEE",
    text: "And now, one thousand and three! A shinobi must never abandon his training! Even if my arms fall off, I shall keep pushing forward!",
    characterId: "rockLee",
    expression: "pushups2",
    position: "center",
    animation: "bounce",
    background: "leafCorner1",
  },
  {
    speaker: "PLAYER",
    text: "...Should I come back later?",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "leafCorner1",
  },
  {
    speaker: "ROCK LEE",
    text: "Hm?",
    characterId: "rockLee",
    expression: "pushups1",
    position: "center",
    animation: "fade",
    background: "leafCorner1",
  },
  {
    speaker: "NARRATOR",
    text: "Lee springs to his feet. The moment he notices that you are carrying yourself like a fighter, his eyes light up.",
    characterId: "rockLee",
    expression: "serious",
    position: "center",
    animation: "bounce",
    background: "leafCorner1",
  },
  {
    speaker: "ROCK LEE",
    text: "You! I have never seen you around here before! Are you a shinobi from another village?",
    characterId: "rockLee",
    expression: "neutral",
    position: "center",
    animation: "enter",
    zoom: 1.2,
    background: "leafCorner1",
  },
  {
    speaker: "PLAYER",
    text: "Something like that. I'm just passing through and looking for a place to stay.",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "leafCorner1",
  },
  {
    speaker: "ROCK LEE",
    text: "A traveler, and possibly a fellow martial artist! What a splendid coincidence!",
    characterId: "rockLee",
    expression: "excited",
    position: "center",
    animation: "bounce",
    zoom: 1.2,
    background: "leafCorner1",
  },
  {
    speaker: "PLAYER",
    text: "I wouldn't exactly call it a coincidence. I was just walking down the street.",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "leafCorner1",
  },
  {
    speaker: "ROCK LEE",
    text: "Then allow me to make your visit to the Hidden Leaf unforgettable! Let us have a match!",
    characterId: "rockLee",
    expression: "serious",
    position: "center",
    animation: "bounce",
    background: "leafCorner1",
  },
  {
    speaker: "PLAYER",
    text: "Wait. I haven't even found a place to sleep yet.",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "leafCorner1",
  },
  {
    speaker: "ROCK LEE",
    text: "Excellent! Then we shall make this quick! I promise to give you a challenge worthy of your journey!",
    characterId: "rockLee",
    expression: "happy",
    position: "center",
    animation: "bounce",
    zoom: 1.2,
    background: "leafCorner1",
  },
  {
    speaker: "NARRATOR",
    text: "Before you can explain that this was not what you had in mind, Lee takes his fighting stance. Apparently, your search for lodging will have to wait.",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "leafCorner1",
  },
  {
    speaker: "ROCK LEE",
    text: "Come! Let us see the strength of your youthful spirit!",
    characterId: "rockLee",
    expression: "determined",
    position: "center",
    animation: "bounce",
    background: "leafCorner1",
  },
  {
    speaker: "NARRATOR",
    text: "Rock Lee has challenged you to a duel. There is apparently no polite way to decline a shinobi who is already warming up.",
    characterId: null,
    expression: "neutral",
    position: "center",
    animation: "fade",
    background: "leafCorner1",
  },
];


// ------------------------------------------------------------
// CUTSCENE 2 — LEE, WHAT HAVE YOU DONE NOW?
//
// This plays after the first battle, regardless of its result.
// Tenten isn't looking for a fight. She arrives because Lee's
// training has gotten out of hand and she wants answers.
// ------------------------------------------------------------

function createCutscene2({ won, playerName }) {
  const playerSpeaker = playerName.toUpperCase();

  const afterBattleDialogue = won
    ? [
        {
          speaker: "ROCK LEE",
          text: "Amazing! You managed to overcome my taijutsu! Your movements were impressive!",
          characterId: "rockLee",
          expression: "happy",
          position: "center",
          animation: "bounce",
          background: "leafCorner2",
        },
        {
          speaker: playerSpeaker,
          text: "You certainly don't hold back. Is challenging random travelers part of your daily training?",
          characterId: null,
          expression: "neutral",
          position: "center",
          animation: "fade",
          background: "leafCorner2",
        },
        {
          speaker: "ROCK LEE",
          text: "Of course not! Only when I encounter someone whose spirit calls out to me through the power of hard work!",
          characterId: "rockLee",
          expression: "determined",
          position: "center",
          animation: "bounce",
          background: "leafCorner2",
        },
        {
          speaker: playerSpeaker,
          text: "That sounds suspiciously like something you tell yourself to justify this.",
          characterId: null,
          expression: "neutral",
          position: "center",
          animation: "fade",
          background: "leafCorner2",
        },
        
      
      ]
    : [
        {
          speaker: playerSpeaker,
          text: "You're stronger than you look. I underestimated how quickly you could close the distance.",
          characterId: null,
          expression: "neutral",
          position: "center",
          animation: "fade",
          background: "leafCorner2",
        },
        {
          speaker: "ROCK LEE",
          text: "And you have shown me much as well! Defeat is not something to fear. It is an opportunity to discover where we must improve!",
          characterId: "rockLee",
          expression: "happy",
          position: "center",
          animation: "bounce",
          background: "leafCorner2",
        },
        {
          speaker: playerSpeaker,
          text: "You make losing sound like a regular part of your schedule.",
          characterId: null,
          expression: "neutral",
          position: "center",
          animation: "fade",
          background: "leafCorner2",
        },
        {
          speaker: "ROCK LEE",
          text: "Naturally! How else could I surpass my limits and become a splendid shinobi through hard work alone?",
          characterId: "rockLee",
          expression: "determined",
          position: "right",
          animation: "bounce",
          background: "leafCorner2",
        },
      ];

  const tentenIntroduction = [
    {
      speaker: "NARRATOR",
      text: "A metallic clatter comes from the edge of the training ground. A young kunoichi stands there with a weapons scroll in hand, staring at Lee as if she has just discovered a new and particularly exhausting problem.",
      characterId: "rockLee",
      expression: "neutral",
      position: "right",
      animation: "bounce",
      zoom:1,
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "Lee. Please tell me you haven't been challenging strangers again.",
      characterId: "tenten",
      expression: "angry",
      position: "center",
      animation: "enter",
      zoom: 1.3,
      background: "leafCorner2",
    },
    {
      speaker: "ROCK LEE",
      text: "Tenten! You have arrived at the perfect moment! I have found a worthy opponent!",
      characterId: "rockLee",
      expression: "happy",
      position: "right",
      animation: "bounce",
      zoom: 1.20,
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "That wasn't what I asked.",
      characterId: "tenten",
      expression: "facepalm",
      position: "left",
      animation: "fade",
      zoom: 1.20,
      background: "leafCorner2",
    },
    {
      speaker: "ROCK LEE",
      text: "And what a splendid battle it was! My youthful spirit burns brighter than ever!",
      characterId: "rockLee",
      expression: "excited",
      position: "center",
      animation: "bounce",
      zoom: 1.2,
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "We were supposed to finish our training, not turn the entire afternoon into one of your personal tournaments.",
      characterId: "tenten",
      expression: "exasperated",
      position: "left",
      animation: "fade",
      zoom: 1.2,
      background: "leafCorner2",
    },
    {
      speaker: "PLAYER",
      text: "For the record, I was trying to find a hotel. It's getting late",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "You got dragged into one of Lee's challenges while looking for a place to sleep?",
      characterId: "tenten",
      expression: "relate",
      position: "left",
      animation: "fade",
      zoom: 1.2,
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "...Yeah, that sounds about right.",
      characterId: "tenten",
      expression: "facepalm",
      position: "left",
      animation: "fade",
      zoom: 1.2,
      background: "leafCorner2",
    },
    {
      speaker: "ROCK LEE",
      text: "But think of the possibilities, Tenten! We could learn so much from another battle!",
      characterId: "rockLee",
      expression: "happy",
      position: "right",
      animation: "bounce",
      zoom: 1.40,
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "Lee, we have already trained today. My arms are not going to get any stronger just because you shout about youth.",
      characterId: "tenten",
      expression: "exasperated",
      position: "left",
      animation: "fade",
      zoom: 1.15,
      background: "leafCorner2",
    },
    {
      speaker: "ROCK LEE",
      text: "Then I shall do one hundred extra push-ups to make up for it!",
      characterId: "rockLee",
      expression: "pushups1",
      position: "center",
      animation: "bounce",
      zoom: 1.35,
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "That is not how any of this works!",
      characterId: "tenten",
      expression: "angry",
      position: "left",
      animation: "bounce",
      zoom: 1.40,
      background: "leafCorner2",
    },
    {
      speaker: "NARRATOR",
      text: "Lee immediately drops to the ground and starts doing push-ups. He seems entirely satisfied with the solution he has just invented.",
      characterId: "rockLee",
      expression: "pushups2",
      position: "center",
      animation: "bounce",
      zoom: 1.50,
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "...I'm surrounded by idiots in this village.",
      characterId: "tenten",
      expression: "facepalm",
      position: "left",
      animation: "fade",
      zoom: 1.15,
      background: "leafCorner2",
    },
    {
      speaker: playerSpeaker,
      text: "Should I leave you two to it?",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "Honestly? That would probably be the sensible thing to do.",
      characterId: "tenten",
      expression: "relate",
      position: "left",
      animation: "fade",
      zoom: 1.15,
      background: "leafCorner2",
    },
    {
      speaker: "ROCK LEE",
      text: "WAIT! Before you go, there is one more thing I wish to ask!",
      characterId: "rockLee",
      expression: "determined",
      position: "center",
      animation: "bounce",
      zoom: 1.20,
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "Lee. Don't you dare.",
      characterId: "tenten",
      expression: "angry",
      position: "left",
      animation: "fade",
      zoom: 1.25,
      background: "leafCorner2",
    },
    {
      speaker: "ROCK LEE",
      text: "Would you be willing to face us both in a friendly training match?",
      characterId: "rockLee",
      expression: "serious",
      position: "center",
      animation: "bounce",
      zoom: 1.15,
      background: "leafCorner2",
    },
    {
      speaker: playerSpeaker,
      text: "You have got to be kidding me.",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "I am not agreeing to this because I want another fight. But if you're going to insist on dragging me into your mess, at least let me make sure you don't get yourself hurt.",
      characterId: "tenten",
      expression: "neutral",
      position: "left",
      animation: "fade",
      zoom: 1.15,
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "Besides, I'd like to see how this stranger handles an opponent who doesn't announce every move with a speech.",
      characterId: "tenten",
      expression: "relate",
      position: "left",
      animation: "fade",
      zoom: 1.15,
      background: "leafCorner2",
    },
    {
      speaker: "ROCK LEE",
      text: "Excellent! A two-on-one training match! This will be a valuable experience for all of us!",
      characterId: "rockLee",
      expression: "excited",
      position: "center",
      animation: "bounce",
      zoom: 1.45,
      background: "leafCorner2",
    },
    {
      speaker: "TENTEN",
      text: "I knew I should have stayed home.",
      characterId: "tenten",
      expression: "facepalm",
      position: "left",
      animation: "fade",
      zoom: 1,
      background: "leafCorner2",
    },
    {
      speaker: "NARRATOR",
      text: "You came to the Hidden Leaf looking for a bed. Somehow, you have ended up with two shinobi determined to test your abilities. At least one of them seems to understand how ridiculous this is.",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "leafCorner2",
    },
  ];

  return [...afterBattleDialogue, ...tentenIntroduction];
}


// ------------------------------------------------------------
// FINAL CUTSCENE — A QUIET NIGHT IN THE LEAF
//
// Regardless of the second battle's outcome, the player gets
// somewhere to stay. Winning changes how the encounter ends.
// ------------------------------------------------------------

function createFinalCutscene({ won, playerName }) {
  const playerSpeaker = playerName.toUpperCase();

  const battleEnding = won
    ? [
        {
          speaker: "TENTEN",
          text: "Well... I wasn't expecting you to handle both of us that well.",
          characterId: "tenten",
          expression: "neutral",
          position: "left",
          animation: "fade",
          zoom: 1.15,
          background: "leafCorner2",
        },
        {
          speaker: "ROCK LEE",
          text: "Magnificent! Your fighting spirit is truly extraordinary! I can hardly wait until we train together again!",
          characterId: "rockLee",
          expression: "excited",
          position: "right",
          animation: "bounce",
          zoom: 1.25,
          background: "leafCorner2",
        },
        {
          speaker: "TENTEN",
          text: "Lee, they just fought both of us. Maybe give them five minutes before planning the next match?",
          characterId: "tenten",
          expression: "angry",
          position: "left",
          animation: "fade",
          zoom: 1.15,
          background: "leafCorner2",
        },
        {
          speaker: playerSpeaker,
          text: "I'd appreciate that. I still need to find somewhere to sleep.",
          characterId: null,
          expression: "neutral",
          position: "center",
          animation: "fade",
          zoom: 1.15,
          background: "leafCorner2",
        },
        {
          speaker: "TENTEN",
          text: "There's an inn a few streets from here. Follow the main road and ask for directions if you get lost. And don't worry, I'll make sure Lee doesn't follow you.",
          characterId: "tenten",
          expression: "neutral",
          position: "left",
          animation: "fade",
          zoom: 1.15,
          background: "leafCorner2",
        },
        {
          speaker: "ROCK LEE",
          text: "But Tenten! I was going to offer to escort our guest!",
          characterId: "rockLee",
          expression: "happy",
          position: "right",
          animation: "bounce",
          zoom: 1.35,
          background: "leafCorner2",
        },
        {
          speaker: "TENTEN",
          text: "Exactly why I'm not letting you.",
          characterId: "tenten",
          expression: "happy",
          position: "left",
          animation: "fade",
          zoom: 1.15,
          background: "leafCorner2",
        },
      ]
    : [
        {
          speaker: playerSpeaker,
          text: "I couldn't keep up with both of you. I've got some work to do before I can handle a fight like that.",
          characterId: null,
          expression: "neutral",
          position: "center",
          animation: "fade",
          zoom: 1.15,
          background: "leafCorner2",
        },
        {
          speaker: "TENTEN",
          text: "You were outnumbered. Don't expect yourself to solve everything in one afternoon.",
          characterId: "tenten",
          expression: "relate",
          position: "left",
          animation: "fade",
          zoom: 1.15,
          background: "leafCorner2",
        },
        {
          speaker: "ROCK LEE",
          text: "Indeed! Every battle teaches us something new! With enough effort, you can overcome even your greatest weaknesses!",
          characterId: "rockLee",
          expression: "happy",
          position: "right",
          animation: "bounce",
          zoom: 1.15,
          background: "leafCorner2",
        },
        {
          speaker: "TENTEN",
          text: "For once, Lee is making a reasonable point. ",
          characterId: "tenten",
          expression: "neutral",
          position: "left",
          animation: "fade",
          zoom: 1.15,
          background: "leafCorner2",
        },
        {
          speaker: "TENTEN",
          text: "Just... don't take his training methods too seriously.",
          characterId: "tenten",
          expression: "relate",
          position: "left",
          animation: "fade",
          zoom: 1.15,
          background: "leafCorner2",
        },
        {
          speaker: "TENTEN",
          text: "There's an inn a few streets from here. Get some rest. You'll have a better chance of thinking straight after a night's sleep.",
          characterId: "tenten",
          expression: "neutral",
          position: "left",
          animation: "fade",
          zoom: 1.15,
          background: "leafCorner2",
        },
      ];

  const nightEnding = [
    {
      speaker: "NARRATOR",
      text: "At last, the training ground grows quiet. You leave Lee and Tenten behind and make your way through the village streets as the evening settles over Konohagakure.",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      clearCharacters: true,
      background: "leafNight",
    },
    {
      speaker: "NARRATOR",
      text: "Lanterns begin to glow outside the shops. The noise of the day's crowds fades into the distance, replaced by the calm sounds of a village settling in for the night.",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "leafNight",
    },
    {
      speaker: "NARRATOR",
      text: "You find a small room at a local inn and finally set your belongings down. After the journey, the unexpected duel, and the chaos of meeting Team Guy, a bed has never looked so inviting.",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "hotelRoom",
    },
    {
      speaker: playerSpeaker,
      text: "I came here looking for a place to sleep. Instead, I ended up fighting two Leaf shinobi... What a first day.",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "hotelRoom",
    },
    {
      speaker: "NARRATOR",
      text: "You settle in for the night. Tomorrow, you can figure out where this journey will take you. For now, the Hidden Leaf Village offers something you have not had in a long time: a moment of peace.",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "hotelRoom",
    },
    {
      speaker: "NARRATOR",
      text: "LEVEL 1 COMPLETE — A STRANGER IN THE HIDDEN LEAF",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "opening",
    },
  ];

  return [...battleEnding, ...nightEnding];
}


// ------------------------------------------------------------
// LEVEL CONTROLLER
// Navigation and story progression remain compatible with
// the existing character-selection and battle flow.
// ------------------------------------------------------------

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

  // Scene 1 -> Battle 1: Player versus Rock Lee.
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

  // Scene 2 -> Battle 2: Player versus Rock Lee and Tenten.
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
        firstBattleWon: previousBattleWon,
      },
    });
  };

  // Finish the chapter after the hotel-room ending.
  const finishLevel = () => {
    const level1Completed =
      levelConfig.firstBattleWon === true &&
      previousBattleWon === true;

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

  // After Battle 1, show the aftermath and Tenten's introduction.
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

  // After Battle 2, show the outcome and hotel-room ending.
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

  // Opening scene -> first 1v1 battle.
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
