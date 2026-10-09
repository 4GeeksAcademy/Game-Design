import Opponent from "./Opponent.jsx";
import Character from "./Character.jsx";
import AttackOptions from "./AttackOptions.jsx";
import VictoryScreen from "./VictoryScreen.jsx";
import GameOverScreen from "./GameOverScreen.jsx";
import { attackCharacter, evadeAttack } from "./Health.js";
import { turn } from "./Turns.js";
import mina from "./Mina_AshidoStats";
import rockLee from "./Rock_LeeStats";
import { aiTurn } from "./AI.js";
import React, { useState, useEffect } from "react";

function App() {
  const [character, setCharacter] = useState({
    ...mina,
    attacks: mina.attacks.map((attack) => ({ ...attack })),
    health: mina.health,
    maximumHealth: mina.health,
    mana: mina.mana,
    maximumMana: mina.maximumMana,
    manaRegen: mina.manaRegen,
    turnFinished: false,
    blocked: false,
  });

  const [opponent, setOpponent] = useState({
    ...rockLee,
    attacks: rockLee.attacks.map((attack) => ({ ...attack })),
    health: rockLee.health,
    maximumHealth: rockLee.health,
    mana: rockLee.mana,
    maximumMana: rockLee.maximumMana,
    manaRegen: rockLee.manaRegen,
    turnFinished: false,
  });

  const [damageDealt, setDamageDealt] = useState(0);
  const [attacksUsed, setAttacksUsed] = useState(0);
  const [currentTurn, setCurrentTurn] = useState("player");
  const [combatMessages, setCombatMessages] = useState([]);
  const [aiAttack, setAiAttack] = useState(null);

  // Queue combat messages so they don't replace one another.
  useEffect(() => {
    if (combatMessages.length === 0) return;

    const timer = setTimeout(() => {
      setCombatMessages((messages) => messages.slice(1));
    }, 3300);

    return () => clearTimeout(timer);
  }, [combatMessages]);

  // Advance the turn when both sides finish.
  useEffect(() => {
    if (character.turnFinished && opponent.turnFinished) {
      turn(character, opponent);
      setCharacter({ ...character });
      setOpponent({ ...opponent });
      setCurrentTurn("player");
    }
  }, [character, opponent]);

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

  // Add a message to the queue.
  function showCombatMessage(text, type) {
    setCombatMessages((messages) => [
      ...messages,
      {
        id: Date.now() + Math.random(),
        text,
        type,
      },
    ]);
  }

  return (
    <div className="container-fluid mt-3" id="gameContainer">
      {combatMessages.length > 0 && (
        <div id="combatPopupContainer">
          {combatMessages.map((message) => (
            <div className={`combat-popup ${message.type}`} key={message.id}>
              {message.text}
            </div>
          ))}
        </div>
      )}

      {character.health <= 0 ? (
        <GameOverScreen damageDealt={damageDealt} attacksUsed={attacksUsed} />
      ) : opponent.health <= 0 ? (
        <div id="victorySection">
          <VictoryScreen damageDealt={damageDealt} attacksUsed={attacksUsed} />
        </div>
      ) : (
        <>
          <div id="battleArena">
            <div id="opponentSection">
              <Opponent opponent={opponent} setOpponent={setOpponent} />
            </div>

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
                      const result = evadeAttack(aiAttack, opponent, character);

                      if (result) {
                        character.cooldown -= 1;
                        character.blocked = true;

                        showCombatMessage(
                          result.evaded ? "💨 EVADED!" : "💥 FAILED TO EVADE!",
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
