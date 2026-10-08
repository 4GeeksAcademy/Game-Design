import Opponent from "./Opponent.jsx";
import Character from "./Character.jsx";
import AttackOptions from "./AttackOptions.jsx";
import VictoryScreen from "./VictoryScreen.jsx";
import { turn } from "./Turns.js";

// Characters list for now
import mina from "./Mina_AshidoStats";
import rockLee from "./Rock_LeeStats";

// Artificial Intelligence (Bot)
import { aiTurn, aiFinishTurn } from "./AI.js";

import React, { useState, useEffect } from "react";

function blockAttack(character, attack) {
  let reducedDamage = attack.damage - character.defense.amount;

  if (reducedDamage < 0) {
    reducedDamage = 0;
  }

  character.health -= reducedDamage;

  if (character.health < 0) {
    character.health = 0;
  }

  return reducedDamage;
}

function App() {
  const [character, setCharacter] = useState({
    ...mina,
    attacks: mina.attacks.map((attack) => ({
      ...attack,
    })),
    health: mina.health,
    mana: mina.mana,
    maximumMana: mina.maximumMana,
    manaRegen: mina.manaRegen,
    turnFinished: false,
    blocked: false,
  });

  // Shows opponents stats and available attacks on his side
  const [opponent, setOpponent] = useState({
    ...rockLee,
    attacks: rockLee.attacks.map((attack) => ({
      ...attack,
    })),
    health: rockLee.health,
    mana: rockLee.mana,
    maximumMana: rockLee.maximumMana,
    manaRegen: rockLee.manaRegen,
    turnFinished: false,
  });

  const [damageDealt, setDamageDealt] = useState(0);
  const [attacksUsed, setAttacksUsed] = useState(0);
  const [currentTurn, setCurrentTurn] = useState("player");
  const [aiAttack, setAiAttack] = useState(null);

  useEffect(() => {
    if (character.turnFinished && opponent.turnFinished) {
      turn(character, opponent);

      setCharacter({
        ...character,
      });

      setOpponent({
        ...opponent,
      });

      setCurrentTurn("player");
    }
  }, [character, opponent]);

  // Switches to AI's turn
  useEffect(() => {
    if (currentTurn === "ai") {
      console.log("AI TURN!");

      aiTurn(opponent, character, setAiAttack, () => {
        setOpponent({
          ...opponent,
        });

        setCharacter({
          ...character,
        });

        setAiAttack(null);
      });
    }
  }, [currentTurn]);

  return (
    <div className="container mt-4">
  {opponent.health === 0 ? (
    <VictoryScreen
      damageDealt={damageDealt}
      attacksUsed={attacksUsed}
    />
  ) : (
    <>
      {/* Opponent Area */}
      <div className="d-flex flex-column align-items-center">
        <Opponent
          opponent={opponent}
          setOpponent={setOpponent}
        />

        {/* AI Attack */}
        {aiAttack && (
          <div className="d-flex flex-column align-items-center mt-3">
            <div
              className="card shadow-sm border-danger"
              style={{ width: "200px" }}
            >
              <div className="card-header text-center">
                AI Attack
              </div>

              <div className="card-body text-center p-2">
                <h5 className="mb-2">{aiAttack.name}</h5>

                <p className="mb-1">
                  Damage: {aiAttack.damage}
                </p>

                <p className="mb-2">
                  Mana: {aiAttack.cost}
                </p>
              </div>
            </div>

            <button
              className="btn btn-primary mt-2"
              disabled={character.cooldown <= 0}
              onClick={() => {
                if (character.cooldown > 0) {
                  blockAttack(character, aiAttack);

                  character.cooldown -= 1;
                  character.blocked = true;

                  setCharacter({
                    ...character,
                  });

                  setAiAttack(null);
                }
              }}
            >
              Block
            </button>
          </div>
        )}
      </div>

      {/* Player Area */}
      <div className="d-flex justify-content-center mt-5">
        <Character
          character={character}
          setCharacter={setCharacter}
          currentTurn={currentTurn}
          setCurrentTurn={setCurrentTurn}
        />
      </div>

      {/* Player Attacks */}
      <div className="mt-4">
        <AttackOptions
          character={character}
          opponent={opponent}
          setCharacter={setCharacter}
          setOpponent={setOpponent}
          setDamageDealt={setDamageDealt}
          setAttacksUsed={setAttacksUsed}
          currentTurn={currentTurn}
        />
      </div>
    </>
  )}
</div>
  );

}

export default App;
