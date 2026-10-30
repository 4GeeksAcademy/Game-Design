import Opponent from "./Opponent.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import { recordFestivalEvent } from "./Main Page/Festival/FestivalChallenges";
import { recordDailyObjectiveEvent } from "./Main Page/Festival/FestivalDailyObjectives";
import FestivalChallengePopup from "./Main Page/Festival/FestivalChallengePopup";
import Character from "./Character.jsx";
import AttackOptions from "./AttackOptions.jsx";
import VictoryScreen from "./VictoryScreen.jsx";
import GameOverScreen from "./GameOverScreen.jsx";
import { attackCharacter, evadeAttack } from "./Health.js";
import { turn } from "./Turns.js";
import { storyBackgrounds } from "./Main Page/Story/StoryBackgrounds.js";
import mina from "./All_Character_Stats/Mina_AshidoStats.js";
import rockLee from "./All_Character_Stats/Rock_LeeStats.js";
import Usopp from "./All_Character_Stats/UsoppStats.js";
import Chad from "./All_Character_Stats/ChadStats.js";
import Picolo from "./All_Character_Stats/PicoloStats.js";
import TenTen from "./All_Character_Stats/TenTenStats.js";
import Kirishima from "./All_Character_Stats/KirishimaStats.js";
import Ochaco from "./All_Character_Stats/OchacoStats.js";
import Luffy from "./All_Character_Stats/LuffyStats.js";
import Ichigo from "./All_Character_Stats/IchigoStats.js";
import Naruto from "./All_Character_Stats/NarutoStats.js";
import Yoruichi from "./All_Character_Stats/YoruichiStats.js";
import Goku from "./All_Character_Stats/GokuStats.js";
import Toga from "./All_Character_Stats/TogaStats.js";
import { Kenpachi } from "./All_Character_Stats/KempachiStats.js";
import Hinata from "./All_Character_Stats/HinataStats.js";
import { getDamageThreat, getSpeedThreat } from "./AttackThreat.js";
import { aiDefendOrEvade, aiTurn } from "./AI.js";
import { createNormalAIController } from "./AI_NormalDifficulty.js";
import { addCoins } from "./Currency.js";
import StoryResultsScreen from "./Main Page/Story/StoryResultScreen.jsx";
import { loadKeybinds, normalizeKey } from "./Main Page/keybinds.js";
import React, { useState, useEffect, useRef, useCallback } from "react";


function RoundIntroHealthBar({ fighter }) {
  const maximumHealth = Number(fighter.maximumHealth) || 1;
  const health = Math.max(0, Number(fighter.health) || 0);
  const percent = Math.max(0, Math.min(100, (health / maximumHealth) * 100));

  const healthLevel =
    percent <= 10
      ? "critical"
      : percent <= 30
        ? "danger"
        : percent <= 50
          ? "warning"
          : "healthy";

  return (
    <div
      className={`battle-intro-healthbar health-${healthLevel}`}
      role="img"
      aria-label={`${health} of ${maximumHealth} health remaining`}
    >
      <div
        className="battle-intro-healthbar-fill"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const levelConfig = location.state ?? {};
  const isStoryMode = levelConfig.gameMode === "story";

  const fighterData = {
    mina: mina,
    rockLee: rockLee,
    usopp: Usopp,
    chad: Chad,
    picolo: Picolo,
    tenten: TenTen,
    kirishima: Kirishima,
    ochaco: Ochaco,
    luffy: Luffy,
    ichigo: Ichigo,
    naruto: Naruto,
    yoruichi: Yoruichi,
    goku: Goku,
    toga: Toga,
    kenpachi: Kenpachi,
    hinata: Hinata,
  };

  const playerData = fighterData[location.state?.playerId] ?? mina;

  const opponentData =
    fighterData[location.state?.opponentId] ??
    (playerData === mina ? rockLee : mina);

  const [character, setCharacter] = useState(() => ({
    ...playerData,
    attacks: playerData.attacks.map((attack) => ({ ...attack })),
    health: playerData.health,
    maximumHealth: playerData.health,
    mana: playerData.mana,
    maximumMana: playerData.maximumMana,
    manaRegen: playerData.manaRegen,
    turnFinished: false,
    blocked: false,
  }));

  const [opponent, setOpponent] = useState(() => ({
    ...opponentData,
    attacks: opponentData.attacks.map((attack) => ({ ...attack })),
    health: opponentData.health,
    maximumHealth: opponentData.health,
    mana: opponentData.mana,
    maximumMana: opponentData.maximumMana,
    manaRegen: opponentData.manaRegen,
    turnFinished: false,
    blocked: false,
  }));

  const [damageDealt, setDamageDealt] = useState(0);
  const lastRewardedDamage = useRef(0);
  
  const aiControllerRef = useRef(null);

  useEffect(() => {
  const damageSinceLastUpdate = damageDealt - lastRewardedDamage.current;

  // Update the tracker before recording rewards.
  lastRewardedDamage.current = damageDealt;

  if (damageSinceLastUpdate > 0) {
    // Preserve the existing coin reward system.
    addCoins(Math.floor(damageSinceLastUpdate));

    // Update Festival damage challenges.
    recordFestivalEvent("damage", damageSinceLastUpdate);
    recordDailyObjectiveEvent("damage", damageSinceLastUpdate);
  }
}, [damageDealt]);

  const [attacksUsed, setAttacksUsed] = useState(0);
  const lastRecordedAttacks = useRef(0);

useEffect(() => {
  const newAttacks =
    attacksUsed - lastRecordedAttacks.current;

  lastRecordedAttacks.current = attacksUsed;

  if (newAttacks > 0) {
    recordFestivalEvent("attack", newAttacks);
  }
}, [attacksUsed]);
  const [defenseTimeLeft, setDefenseTimeLeft] = useState(10);
  const [currentTurn, setCurrentTurn] = useState("intro");
const [showIncomingAttack, setShowIncomingAttack] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [showRoundIntro, setShowRoundIntro] = useState(true);

  const [knockout, setKnockout] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const [isRoundIntroFadingOut, setIsRoundIntroFadingOut] = useState(false);

  const [showFinishOverlay, setShowFinishOverlay] = useState(false);

  const [isFinishFadingOut, setIsFinishFadingOut] = useState(false);
  // Temporary popup queue and permanent combat history.
  const [combatMessages, setCombatMessages] = useState([]);
  const [combatLog, setCombatLog] = useState([]);
  const [aiAttack, setAiAttack] = useState(null);

  const characterRef = useRef(character);
  const opponentRef = useRef(opponent);
  const knockoutRef = useRef(knockout);
  const festivalBattleRecorded = useRef(false);

useEffect(() => {
  if (!knockout || festivalBattleRecorded.current) return;

  // Prevent the same match from being counted twice.
  festivalBattleRecorded.current = true;

  // Every completed match counts, including defeats.
  recordFestivalEvent("battle", 1);
  recordDailyObjectiveEvent("battle", 1);

  // Only victories count toward victory challenges.
  if (knockout.defeatedTeam === "opponent") {
    recordFestivalEvent("victory", 1);
    recordDailyObjectiveEvent("victory", 1);
  }
}, [knockout]);

  useEffect(() => {
    characterRef.current = character;
    opponentRef.current = opponent;
    knockoutRef.current = knockout;
  }, [character, opponent, knockout]);

  // Display one queued message at a time.
  const firstMessageId = combatMessages[0]?.id;

  useEffect(() => {
    if (firstMessageId === undefined) return;

    const timer = setTimeout(() => {
      setCombatMessages((messages) => messages.slice(3));
    }, 2800);

    return () => clearTimeout(timer);
  }, [firstMessageId]);

  // Advance to the next round after both fighters finish.
  useEffect(() => {
    if (
      character.turnFinished &&
      opponent.turnFinished &&
      character.health > 0 &&
      opponent.health > 0 &&
      !knockout
    ) {
      turn(character, opponent);

      setCharacter({ ...character });
      setOpponent({ ...opponent });

      setRoundNumber((round) => round + 1);
      setShowRoundIntro(true);
      setCurrentTurn("intro");
    }
  }, [character, opponent, knockout]);

  // Show the individual K.O. cutscene, then the final results cards.
  useEffect(() => {
    if (!knockout) return;

    setShowFinishOverlay(false);
    setIsFinishFadingOut(false);
    setShowResults(false);

    // Let the individual K.O. cutscene play first.
    const finishTimer = setTimeout(() => {
      setShowFinishOverlay(true);
    }, 2600);

    // Fade the final cards out before showing the original result screen.
    const fadeTimer = setTimeout(() => {
      setIsFinishFadingOut(true);
    }, 5000);

    const resultsTimer = setTimeout(() => {
      setShowResults(true);
    }, 5600);

    return () => {
      clearTimeout(finishTimer);
      clearTimeout(fadeTimer);
      clearTimeout(resultsTimer);
    };
  }, [knockout]);

  // Detect a knockout only once and save the fighters for the animations.
  useEffect(() => {
    if (knockout) return;

    if (character.health <= 0) {
      setKnockout({
        defeated: character.name,
        winner: opponent.name,
        defeatedImage: character.image,
        winnerImage: opponent.image,
        winnerHealth: Math.max(0, opponent.health),
        winnerMaximumHealth: opponent.maximumHealth,
        defeatedTeam: "player",
      });
    } else if (opponent.health <= 0) {
      setKnockout({
        defeated: opponent.name,
        winner: character.name,
        defeatedImage: opponent.image,
        winnerImage: character.image,
        winnerHealth: Math.max(0, character.health),
        winnerMaximumHealth: character.maximumHealth,
        defeatedTeam: "opponent",
      });
    }
  }, [
    character.health,
    opponent.health,
    character.name,
    opponent.name,
    character.image,
    opponent.image,
    character.maximumHealth,
    opponent.maximumHealth,
    knockout,
  ]);

  useEffect(() => {
    if (knockout || character.health <= 0 || opponent.health <= 0) {
      aiControllerRef.current?.stop();
      aiControllerRef.current = null;
      setAiAttack(null);
    }
  }, [knockout, character.health, opponent.health]);

  useEffect(() => {
    if (
      currentTurn !== "ai" ||
      knockout ||
      character.health <= 0 ||
      opponent.health <= 0
    ) {
      return;
    }

    // Keep your existing AI-turn logic here.
  }, [currentTurn, knockout, character.health, opponent.health]);

  // Run the AI turn.
  useEffect(() => {
    if (currentTurn !== "ai") return;

    const difficulty = location.state?.difficulty ?? "Easy";

    if (difficulty === "Normal" || difficulty === "Hard") {
      const controller = createNormalAIController({
        getAI: () => opponentRef.current,
        getPlayer: () => characterRef.current,

        onShowAttack: (attack) => {
          setAiAttack(attack);
        },

        onResolveAttack: (attack, currentAI, currentPlayer) => {
          showCombatMessage(`${currentAI.name} used ${attack.name}!`, "hit");

          setOpponent({ ...currentAI });
          setCharacter({ ...currentPlayer });
        },

        onFinish: (currentAI, currentPlayer) => {
          if (!currentAI || !currentPlayer) return;

          setOpponent({
            ...currentAI,
            turnFinished: true,
          });

          setCharacter({ ...currentPlayer });
          setAiAttack(null);
        },
      });

      aiControllerRef.current = controller;
      controller.start();

      return () => {
        controller.stop();

        if (aiControllerRef.current === controller) {
          aiControllerRef.current = null;
        }
      };
    }

    // Preserve Easy difficulty's existing behavior.
    aiTurn(opponent, character, setAiAttack, () => {
      setOpponent({ ...opponent });
      setCharacter({ ...character });
      setAiAttack(null);
    });
  }, [currentTurn]);

  // Display the round announcement before allowing combat.
  useEffect(() => {
    if (!showRoundIntro) return;

    setIsRoundIntroFadingOut(false);

    // Begin fading after the intro has been visible.
    const fadeTimer = setTimeout(() => {
      setIsRoundIntroFadingOut(true);
    }, 1800);

    // Remove the overlay after its fade-out transition.
    const finishTimer = setTimeout(() => {
      setShowRoundIntro(false);
      setIsRoundIntroFadingOut(false);
      setCurrentTurn("player");
    }, 2400);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [showRoundIntro]);

  // Countdown for the player's defensive window.
  useEffect(() => {
    if (
      !aiAttack ||
      knockout ||
      character.health <= 0 ||
      opponent.health <= 0
    ) {
      setDefenseTimeLeft(10);
      return;
    }

    let remaining = 10;
    setDefenseTimeLeft(remaining);

    const timer = setInterval(() => {
      remaining -= 1;
      setDefenseTimeLeft(Math.max(remaining, 0));

      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [aiAttack, knockout, character.health, opponent.health]);

  // Add messages to the popup queue and permanent combat log.
  function showCombatMessage(text, type) {
    const message = {
      id: Date.now() + Math.random(),
      text,
      type,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };

    // Queue popups so they appear one after another.
    setCombatMessages((messages) => [...messages, message]);

    // Save every message immediately in the combat log.
    setCombatLog((log) => [...log, message]);
  }

  const resolveIncomingAttack = useCallback(
    (choice) => {
      if (!aiAttack || defenseTimeLeft <= 0) return;

      if (choice === "defend" && character.cooldown <= 0) return;

      const result =
        choice === "defend"
          ? attackCharacter(
              aiAttack,
              opponent,
              character,
              character.defense.amount,
            )
          : choice === "evade"
            ? evadeAttack(aiAttack, opponent, character)
            : attackCharacter(aiAttack, opponent, character);

      if (!result) return;
      // Record successful defensive actions for Festival challenges.
if (choice === "defend") {
  recordFestivalEvent("block", 1);
} else if (choice === "evade" && result.evaded) {
  recordFestivalEvent("evade", 1);
}

      if (choice === "defend" || choice === "evade") {
        result.defender.cooldown -= 1;
        result.defender.blocked = true;
      }

      setOpponent({ ...result.attacker });
      setCharacter({ ...result.defender });

      if (choice === "defend") {
        showCombatMessage("🛡️ BLOCKED!", "blocked");
      } else if (choice === "evade") {
        showCombatMessage(
          result.evaded ? "💨 EVADED!" : "💥 FAILED TO EVADE!",
          result.evaded ? "evaded" : "hit",
        );
      } else {
        showCombatMessage(
          `${character.name} took ${result.damageReceived ?? aiAttack.damage} full damage!`,
          "hit",
        );
      }

      if (aiControllerRef.current) {
        aiControllerRef.current.respondToDefense();
      } else {
        setAiAttack(null);
      }
    },
    [aiAttack, defenseTimeLeft, character, opponent, showCombatMessage],
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!aiAttack || defenseTimeLeft <= 0) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      const key = normalizeKey(event.key);
      const binds = loadKeybinds().player1;

      let choice = null;

      if (key === normalizeKey(binds.defend)) {
        choice = "defend";
      } else if (key === normalizeKey(binds.evade)) {
        choice = "evade";
      } else if (key === normalizeKey(binds.takeDamage)) {
        choice = "take-damage";
      }

      if (!choice) return;

      // Don't consume the defend key when defending is unavailable.
      if (choice === "defend" && character.cooldown <= 0) return;

      event.preventDefault();
      resolveIncomingAttack(choice);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aiAttack, defenseTimeLeft, character.cooldown, resolveIncomingAttack]);

  useEffect(() => {
  if (!aiAttack) {
    setShowIncomingAttack(false);
    return;
  }

  const timer = setTimeout(() => {
    setShowIncomingAttack(true);
  }, 500);

  return () => clearTimeout(timer);
}, [aiAttack]);

  return (
    <div className="container-fluid mt-3" id="gameContainer">
      <FestivalChallengePopup />
      {/* Full-screen round intro with both fighters and their health. */}
      {showRoundIntro && !knockout && (
        <div
          id="roundIntroOverlay"
          className={isRoundIntroFadingOut ? "is-fading-out" : ""}
          role="status"
          aria-live="polite"
        >
          <div id="roundIntroContent" className="battle-intro-enhanced">
            <span id="roundIntroEyebrow">FIGHTER'S ARENA</span>

            <h1 key={roundNumber}>ROUND {roundNumber}</h1>

            <div className="battle-intro-matchup">
              <div className="battle-intro-fighter battle-intro-opponent">
                <span className="battle-intro-label">CPU OPPONENT</span>

                {opponent.image && (
                  <img src={opponent.image} alt={opponent.name} />
                )}

                <strong>{opponent.name}</strong>

                <RoundIntroHealthBar fighter={opponent} />

                <span className="battle-intro-hp">
                  HP {Math.max(0, opponent.health)} / {opponent.maximumHealth}
                </span>
              </div>

              <div className="battle-intro-vs">VS</div>

              <div className="battle-intro-fighter battle-intro-player">
                <span className="battle-intro-label">PLAYER</span>

                {character.image && (
                  <img src={character.image} alt={character.name} />
                )}

                <strong>{character.name}</strong>

                <RoundIntroHealthBar fighter={character} />

                <span className="battle-intro-hp">
                  HP {Math.max(0, character.health)} / {character.maximumHealth}
                </span>
              </div>
            </div>

            <div id="roundIntroLine" />

            <p>GET READY</p>
          </div>
        </div>
      )}

      {/* Individual K.O. cutscene. */}
      {knockout && !showFinishOverlay && !showResults && (
        <div
          className={`battle-ko-overlay ko-${knockout.defeatedTeam} ${
            isFinishFadingOut ? "is-fading-out" : ""
          }`}
          role="alert"
          aria-live="assertive"
        >
          <div className="battle-ko-flash" />

          <div className="battle-ko-content">
            <p className="battle-ko-eyebrow">FIGHTER DEFEATED</p>

            {knockout.defeatedImage && (
              <img
                className="battle-ko-portrait"
                src={knockout.defeatedImage}
                alt={knockout.defeated}
              />
            )}

            <h1 className="battle-ko-title">K.O.!</h1>

            <p className="battle-ko-name">{knockout.defeated}</p>

            <p className="battle-ko-subtitle">
              {knockout.defeatedTeam === "opponent"
                ? "OPPONENT DOWN"
                : "PLAYER DOWN"}
            </p>
          </div>
        </div>
      )}

      {/* Final winner-versus-defeated cards. */}
      {knockout && showFinishOverlay && !showResults && (
        <div
          className={`battle-finish-overlay ${
            knockout.defeatedTeam === "player"
              ? "finish-defeat"
              : "finish-victory"
          } ${isFinishFadingOut ? "is-fading-out" : ""}`}
          role="alert"
          aria-live="assertive"
        >
          <div className="battle-finish-flash" />

          <p className="battle-finish-eyebrow">FIGHTER'S ARENA</p>

          <h1 className="battle-finish-title">
            {knockout.defeatedTeam === "player" ? "DEFEAT" : "VICTORY"}
          </h1>

          <p className="battle-finish-message">
            {knockout.winner} WINS THE MATCH
          </p>

          <div className="battle-finish-versus">
            <div className="battle-finish-side defeated-side">
              <h2>DEFEATED</h2>

              <div className="battle-finish-card">
                {knockout.defeatedImage && (
                  <img src={knockout.defeatedImage} alt="" />
                )}

                <strong>{knockout.defeated}</strong>
                <span>K.O.</span>
              </div>
            </div>

            <div className="battle-finish-vs">VS</div>

            <div className="battle-finish-side winning-side">
              <h2>WINNER</h2>

              <div className="battle-finish-card">
                {knockout.winnerImage && (
                  <img src={knockout.winnerImage} alt="" />
                )}

                <strong>{knockout.winner}</strong>
                <span>{knockout.winnerHealth} HP</span>
              </div>
            </div>
          </div>

          <p className="battle-finish-footer">MATCH COMPLETE</p>
        </div>
      )}

      {isStoryMode && knockout && showResults ? (
        <StoryResultsScreen
          won={knockout.defeatedTeam === "opponent"}
          playerName={character.name}
          opponentName={opponent.name}
          damageDealt={damageDealt}
          attacksUsed={attacksUsed}
          levelConfig={levelConfig}
        />
      ) : knockout && !showResults ? null : !isStoryMode &&
        character.health <= 0 ? (
        <GameOverScreen damageDealt={damageDealt} attacksUsed={attacksUsed} />
      ) : !isStoryMode && opponent.health <= 0 ? (
        <div id="victorySection">
          <VictoryScreen damageDealt={damageDealt} attacksUsed={attacksUsed} />
        </div>
      ) : knockout ? null : (
        <>
          {/* Fighters and combat log share one layout. */}
          <div id="battleLayout">
            <div id="battleArena">
              {/* Story background behind both fighters. */}
              {isStoryMode && (
                <div
                  className="story-battle-background"
                  style={{
                    backgroundImage: `url("${storyBackgrounds.arena}")`,
                  }}
                  aria-hidden="true"
                />
              )}

              <div
                id="opponentSection"
                className={aiAttack ? "opponent-is-attacking" : ""}
              >
                <Opponent opponent={opponent} setOpponent={setOpponent} />
              </div>

              {/* Opponent's attack and defensive choices. */}
              {aiAttack && showIncomingAttack && (
                <div
    id="aiAttackSection"
    className="incoming-attack-card"
    key={aiAttack.id ?? aiAttack.name}
  >
                  {/*
      The key helps React remount the card when the attack changes.
      This retriggers its entrance animation for queued attacks.
    */}

                  <div id="aiAttackCard">
                    <div id="aiAttackHeader">
                      <span>⚠ INCOMING ATTACK</span>
                      <span className="attack-warning-dot" />
                    </div>

                    <div
                      id="defenseTimer"
                      className={
                        defenseTimeLeft <= 3
                          ? "timer-critical"
                          : defenseTimeLeft <= 5
                            ? "timer-warning"
                            : ""
                      }
                    >
                      <div id="defenseTimerText">
                        <span>DEFENSE WINDOW</span>
                        <strong>{defenseTimeLeft}s</strong>
                      </div>

                      <div id="defenseTimerTrack">
                        <div
                          id="defenseTimerFill"
                          style={{ width: `${defenseTimeLeft * 10}%` }}
                        />
                      </div>
                    </div>

                    <div id="aiAttackInfo">
                      <h5 id="aiAttackName">{aiAttack.name}</h5>

                      <div id="aiAttackStats">
                        {/* Damage threat */}
                        <div
                          className={`attack-threat-badge ${
                            getDamageThreat(aiAttack.damage).className
                          }`}
                        >
                          <span className="threat-label">DAMAGE</span>

                          <strong>{aiAttack.damage}</strong>

                          <span className="threat-rating">
                            {getDamageThreat(aiAttack.damage).label}
                          </span>
                        </div>

                        {/* Speed threat */}
                        <div
                          className={`attack-threat-badge ${
                            getSpeedThreat(aiAttack.speed).className
                          }`}
                        >
                          <span className="threat-label">SPEED</span>

                          <strong>{aiAttack.speed}</strong>

                          <span className="threat-rating">
                            {getSpeedThreat(aiAttack.speed).label}
                          </span>
                        </div>

                        {/* Mana cost */}
                        <div className="attack-cost-badge">
                          <span className="threat-label">MANA COST</span>

                          <strong>◆ {aiAttack.cost}</strong>
                        </div>
                      </div>
                    </div>
                

                  <div id="defensiveActions">
                    <button
                      id="defendButton"
                      disabled={character.cooldown <= 0 || defenseTimeLeft <= 0}
                     
                      onClick={() => resolveIncomingAttack("defend")}
                    >
                      <span id="defendButtonIcon">🛡</span>
                      <span>DEFEND</span>
                    </button>

                    <button
                      id="evadeButton"
                      disabled={defenseTimeLeft <= 0}
                      
                      onClick={() => resolveIncomingAttack("evade")}
                    >
                      <span id="evadeButtonIcon">💨</span>
                      <span>EVADE</span>
                    </button>

                    <button
                      id="takeDamageButton"
                      type="button"
                      disabled={!aiAttack || defenseTimeLeft <= 0}
                      onClick={() => resolveIncomingAttack("take-damage")}
                    >
                      <span>💥</span>
                      <span>TAKE FULL DAMAGE</span>
                    </button>
                  </div>
                </div>
                </div>
              )}

              <div id="characterSection">
                <Character
                  character={character}
                  setCharacter={setCharacter}
                  currentTurn={currentTurn}
                  combatMessages={combatMessages}
                  setCurrentTurn={setCurrentTurn}
                />
              </div>
            </div>

            {/* Permanent combat log beside the fighters. */}
            <div id="combatLog">
              <div id="combatLogHeader">
                <h4>📜 Combat Log</h4>
                <span>{combatLog.length} events</span>
              </div>

              <div id="combatLogEntries">
                {combatLog.length === 0 ? (
                  <p id="emptyCombatLog">Waiting for combat...</p>
                ) : (
                  [...combatLog].reverse().map((message) => (
                    <div
                      className={`combat-log-entry ${message.type}`}
                      key={message.id}
                    >
                      <span className="combat-log-time">{message.time}</span>

                      <span className="combat-log-text">{message.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Player's attack cards stay below the battle layout. */}
          <div id="attackSection">
            <AttackOptions
              character={character}
              opponent={opponent}
              setCharacter={setCharacter}
              setOpponent={setOpponent}
              setDamageDealt={setDamageDealt}
              setAttacksUsed={setAttacksUsed}
              currentTurn={currentTurn}
              showCombatMessage={showCombatMessage}
              openingTurnActive={roundNumber === 1}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
