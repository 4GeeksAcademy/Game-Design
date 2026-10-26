import Opponent from "./Opponent.jsx";
import { useLocation } from "react-router-dom";
import Character from "./Character.jsx";
import AttackOptions from "./AttackOptions.jsx";
import VictoryScreen from "./VictoryScreen.jsx";
import GameOverScreen from "./GameOverScreen.jsx";
import { attackCharacter, evadeAttack } from "./Health.js";
import { turn } from "./Turns.js";
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
import { getDamageThreat, getSpeedThreat } from "./AttackThreat.js";
import { aiDefendOrEvade, aiTurn } from "./AI.js";
import { createNormalAIController } from "./AI_NormalDifficulty.js";
import { addCoins } from "./Currency.js";
import { loadKeybinds, normalizeKey } from "./Main Page/keybinds.js";
import React, { useState, useEffect, useRef, useCallback } from "react";

function App() {
  const location = useLocation();

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

    // Update the tracker before awarding the coins.
    lastRewardedDamage.current = damageDealt;

    if (damageSinceLastUpdate > 0) {
      addCoins(Math.floor(damageSinceLastUpdate));
    }
  }, [damageDealt]);

  const [attacksUsed, setAttacksUsed] = useState(0);
  const [defenseTimeLeft, setDefenseTimeLeft] = useState(10);
  const [currentTurn, setCurrentTurn] = useState("intro");

  const [roundNumber, setRoundNumber] = useState(1);
  const [showRoundIntro, setShowRoundIntro] = useState(true);

  const [knockout, setKnockout] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Temporary popup queue and permanent combat history.
  const [combatMessages, setCombatMessages] = useState([]);
  const [combatLog, setCombatLog] = useState([]);
  const [aiAttack, setAiAttack] = useState(null);

  const characterRef = useRef(character);
  const opponentRef = useRef(opponent);
  const knockoutRef = useRef(knockout);

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

  // Pause combat and show the knockout announcement.
  useEffect(() => {
    if (knockout) {
      const timer = setTimeout(() => {
        setShowResults(true);
      }, 2800);

      return () => clearTimeout(timer);
    }
  }, [knockout]);

  // Detect a knockout only once.
  useEffect(() => {
    if (knockout) return;

    if (character.health <= 0) {
      setKnockout({
        defeated: character.name,
        winner: opponent.name,
      });
    } else if (opponent.health <= 0) {
      setKnockout({
        defeated: opponent.name,
        winner: character.name,
      });
    }
  }, [
    character.health,
    opponent.health,
    character.name,
    opponent.name,
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

    // Give the CSS fade-out time to finish before removing the overlay.
    const timer = setTimeout(() => {
      setShowRoundIntro(false);
      setCurrentTurn("player");
    }, 2400);

    return () => clearTimeout(timer);
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

  //   const useAttackSlot = (index) => {
  //   const attack = character.attacks[index];

  //   if (!attack || currentTurn !== "player" || !attack.state) return;

  //   const result = aiDefendOrEvade(attack, character, opponent);

  //   if (!result) {
  //     showCombatMessage("Not enough mana!", "hit");
  //     return;
  //   }

  //   setCharacter({ ...result.attacker });
  //   setOpponent({ ...result.defender });

  //   const damage = result.damageReceived ?? 0;
  //   if (damage > 0) setDamageDealt((previous) => previous + damage);

  //   setAttacksUsed((previous) => previous + 1);
  //   showCombatMessage(`${character.name} uses ${attack.name}!`, "attack");

  //   if (result.action === "defend") {
  //     showCombatMessage(`${opponent.name} blocked ${attack.name}!`, "blocked");
  //   } else if (result.action === "evade") {
  //     showCombatMessage(`${opponent.name} evaded ${attack.name}!`, "evaded");
  //   } else if (result.action === "attack" && result.evaded === false) {
  //     showCombatMessage("💥 FAILED TO EVADE!", "hit");
  //   } else if (damage > 0) {
  //     showCombatMessage(`${damage} DAMAGE DEALT!`, "hit");
  //   }

  //   Object.entries(result.buffsApplied ?? {}).forEach(([stat, amount]) => {
  //     if (typeof amount === "number" && amount !== 0) {
  //       showCombatMessage(
  //         `✨ ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}`,
  //         "buff",
  //       );
  //     }
  //   });

  //   Object.entries(result.debuffsApplied ?? {}).forEach(([stat, amount]) => {
  //     if (typeof amount === "number" && amount !== 0) {
  //       showCombatMessage(
  //         `💀 ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}`,
  //         "debuff",
  //       );
  //     }
  //   });
  // };

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

  return (
    <div className="container-fluid mt-3" id="gameContainer">
      {/* Full-screen round announcement */}
      {showRoundIntro && !knockout && (
        <div id="roundIntroOverlay">
          <div id="roundIntroContent">
            <span id="roundIntroEyebrow">FIGHT!</span>

            <h1 key={roundNumber}>ROUND {roundNumber}</h1>

            <div id="roundIntroLine" />

            <p>GET READY</p>
          </div>
        </div>
      )}

      {/* Full-screen knockout announcement */}
      {knockout && !showResults && (
        <div id="knockoutOverlay">
          <div id="knockoutContent">
            <span id="knockoutEyebrow">BATTLE OVER</span>

            <h1>K.O.!</h1>

            <p id="knockoutDefeated">{knockout.defeated} DEFEATED</p>

            <p id="knockoutWinner">{knockout.winner} WINS!</p>
          </div>
        </div>
      )}
      {/* Show one animated combat popup at a time. */}
      {combatMessages.length > 0 && (
        <div id="combatPopupContainer">
          <div
            className={`combat-popup ${combatMessages[0].type}`}
            key={combatMessages[0].id}
          >
            {combatMessages[0].text}
          </div>
        </div>
      )}

      {knockout && !showResults ? null : character.health <= 0 ? (
        <GameOverScreen damageDealt={damageDealt} attacksUsed={attacksUsed} />
      ) : opponent.health <= 0 ? (
        <div id="victorySection">
          <VictoryScreen damageDealt={damageDealt} attacksUsed={attacksUsed} />
        </div>
      ) : (
        <>
          {/* Fighters and combat log share one layout. */}
          <div id="battleLayout">
            <div id="battleArena">
              <div
                id="opponentSection"
                className={aiAttack ? "opponent-is-attacking" : ""}
              >
                <Opponent opponent={opponent} setOpponent={setOpponent} />
              </div>

              {/* Opponent's attack and defensive choices. */}
              {aiAttack && (
                <div id="aiAttackSection" key={aiAttack.id ?? aiAttack.name}>
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
                  </div>

                  <div id="defensiveActions">
                    <button
                      id="defendButton"
                      disabled={character.cooldown <= 0 || defenseTimeLeft <= 0}
                      // onClick={() => {
                      //   const result = attackCharacter(
                      //     aiAttack,
                      //     opponent,
                      //     character,
                      //     character.defense.amount,
                      //   );

                      //   if (result) {
                      //     character.cooldown -= 1;
                      //     character.blocked = true;

                      //     showCombatMessage("🛡️ BLOCKED!", "blocked");

                      //     setOpponent({ ...result.attacker });
                      //     setCharacter({ ...result.defender });

                      //     if (aiControllerRef.current) {
                      //       aiControllerRef.current.respondToDefense();
                      //     } else {
                      //       setAiAttack(null);
                      //     }
                      //   }
                      // }}
                      onClick={() => resolveIncomingAttack("defend")}
                    >
                      <span id="defendButtonIcon">🛡</span>
                      <span>DEFEND</span>
                    </button>

                    <button
                      id="evadeButton"
                      disabled={defenseTimeLeft <= 0}
                      // onClick={() => {
                      //   const result = evadeAttack(
                      //     aiAttack,
                      //     opponent,
                      //     character,
                      //   );

                      //   if (result) {
                      //     character.cooldown -= 1;
                      //     character.blocked = true;

                      //     showCombatMessage(
                      //       result.evaded
                      //         ? "💨 EVADED!"
                      //         : "💥 FAILED TO EVADE!",
                      //       result.evaded ? "evaded" : "hit",
                      //     );

                      //     setOpponent({ ...result.attacker });
                      //     setCharacter({ ...result.defender });

                      //     if (aiControllerRef.current) {
                      //       aiControllerRef.current.respondToDefense();
                      //     } else {
                      //       setAiAttack(null);
                      //     }
                      //   }
                      // }}
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
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
