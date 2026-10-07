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
        <VictoryScreen damageDealt={damageDealt} attacksUsed={attacksUsed} />
      ) : (
        <>
          <div className="container mt-4">
            <div className="row justify-content-center">
              <div className="col-md-5 d-flex">
                <Opponent opponent={opponent} setOpponent={setOpponent} />
              </div>

              {aiAttack && (
                <>
                  <div
                    className="card mx-auto my-3 shadow-sm border-danger"
                    style={{ maxWidth: "220px" }}
                  >
                    <div className="card-header text-center">AI Attack</div>

                    <div className="card-body text-center">
                      <h5>{aiAttack.name}</h5>

                      <p>Damage: {aiAttack.damage}</p>

                      <p>Mana: {aiAttack.cost}</p>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary d-block mx-auto"
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
                </>
              )}
              <div className="col-12 d-flex">
                <Character
                  character={character}
                  setCharacter={setCharacter}
                  currentTurn={currentTurn}
                  setCurrentTurn={setCurrentTurn}
                />
              </div>
            </div>
          </div>

          <AttackOptions
            character={character}
            opponent={opponent}
            setCharacter={setCharacter}
            setOpponent={setOpponent}
            setDamageDealt={setDamageDealt}
            setAttacksUsed={setAttacksUsed}
            currentTurn={currentTurn}
          />
        </>
      )}
    </div>
  );
}

export default App;
