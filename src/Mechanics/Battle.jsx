import Opponent from "./Opponent.jsx";
import { useLocation } from "react-router-dom";
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
  const location = useLocation();

const fighterData = {
  mina,
  rockLee,
};

const playerData =
  fighterData[location.state?.playerId] ?? mina;

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
  const [attacksUsed, setAttacksUsed] = useState(0);
  const [currentTurn, setCurrentTurn] = useState("player");
  const [combatMessages, setCombatMessages] = useState([]);
  const [aiAttack, setAiAttack] = useState(null);

  // Queue combat messages so they don't replace one another.
  const firstMessageId = combatMessages[0]?.id;

  useEffect(() => {
    if (firstMessageId === undefined) return;

    const timer = setTimeout(() => {
      setCombatMessages((messages) => messages.slice(3));
    }, 2500);

    return () => clearTimeout(timer);
  }, [firstMessageId]);

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
          {combatMessages.slice(0, 3).map((message) => (
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
