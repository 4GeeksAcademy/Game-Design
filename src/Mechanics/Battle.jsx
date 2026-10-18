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
import { aiTurn } from "./AI.js";
import { addCoins } from "./Currency.js";
import React, { useState, useEffect, useRef } from "react";

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

  useEffect(() => {
    const damageSinceLastUpdate = damageDealt - lastRewardedDamage.current;

    // Update the tracker before awarding the coins.
    lastRewardedDamage.current = damageDealt;

    if (damageSinceLastUpdate > 0) {
      addCoins(Math.floor(damageSinceLastUpdate));
    }
  }, [damageDealt]);

  const [attacksUsed, setAttacksUsed] = useState(0);
  const [currentTurn, setCurrentTurn] = useState("intro");

  const [roundNumber, setRoundNumber] = useState(1);
  const [showRoundIntro, setShowRoundIntro] = useState(true);

  const [knockout, setKnockout] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Temporary popup queue and permanent combat history.
  const [combatMessages, setCombatMessages] = useState([]);
  const [combatLog, setCombatLog] = useState([]);
  const [aiAttack, setAiAttack] = useState(null);

  // Display ONLY the first queued message.
  // The next message waits until this popup's display time finishes.
  // Remove the oldest popup after its display time.
  const firstMessageId = combatMessages[0]?.id;

  useEffect(() => {
    if (firstMessageId === undefined) return;

    const timer = setTimeout(() => {
      setCombatMessages((messages) => messages.slice(1));
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

  // Run the AI turn.
  useEffect(() => {
    if (currentTurn === "ai") {
      aiTurn(opponent, character, setAiAttack, () => {
        setOpponent({ ...opponent });
        setCharacter({ ...character });
        setAiAttack(null);
      });
    }
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
      {/* Show only one animated popup at a time. */}
      {combatMessages.length > 0 && (
        <div id="combatPopupContainer">
          {combatMessages.slice(0, 3).map((message, index) => (
            <div
              className={`combat-popup ${message.type}`}
              key={message.id}
              style={{
                animationDelay: `${index * 0.15}s`,
              }}
            >
              {message.text}
            </div>
          ))}
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
                <div id="aiAttackSection">
                  <div id="aiAttackCard">
                    <div id="aiAttackHeader">OPPONENT ATTACK</div>

                    <div id="aiAttackInfo">
                      <h5 id="aiAttackName">{aiAttack.name}</h5>

                      <div id="aiAttackStats">
                        <span>⚔ {aiAttack.damage}</span>
                        <span>◆ {aiAttack.cost}</span>
                        <span>⚡ {aiAttack.speed}</span>
                      </div>
                    </div>
                  </div>

                  <div id="defensiveActions">
                    <button
                      id="defendButton"
                      disabled={character.cooldown <= 0}
                      onClick={() => {
                        const result = attackCharacter(
                          aiAttack,
                          opponent,
                          character,
                          character.defense.amount,
                        );

                        if (result) {
                          character.cooldown -= 1;
                          character.blocked = true;

                          showCombatMessage("🛡️ BLOCKED!", "blocked");

                          setOpponent({ ...result.attacker });
                          setCharacter({ ...result.defender });
                          setAiAttack(null);
                        }
                      }}
                    >
                      <span id="defendButtonIcon">🛡</span>
                      <span>Defend</span>
                    </button>

                    <button
                      id="evadeButton"
                      onClick={() => {
                        const result = evadeAttack(
                          aiAttack,
                          opponent,
                          character,
                        );

                        if (result) {
                          character.cooldown -= 1;
                          character.blocked = true;

                          showCombatMessage(
                            result.evaded
                              ? "💨 EVADED!"
                              : "💥 FAILED TO EVADE!",
                            result.evaded ? "evaded" : "hit",
                          );

                          setOpponent({ ...result.attacker });
                          setCharacter({ ...result.defender });
                          setAiAttack(null);
                        }
                      }}
                    >
                      <span id="evadeButtonIcon">💨</span>
                      <span>Evade</span>
                    </button>
                  </div>
                </div>
              )}

              <div id="characterSection">
                <Character
                  character={character}
                  setCharacter={setCharacter}
                  currentTurn={currentTurn}
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
