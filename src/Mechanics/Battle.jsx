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
    health: 100,
    mana: 50,
    maximumMana: 50,
    manaRegen: 5,
    turnFinished: false,
  });

  // Shows opponents stats and available attacks on his side
  const [opponent, setOpponent] = useState({
    ...rockLee,
    attacks: rockLee.attacks.map((attack) => ({
      ...attack,
    })),
    health: 100,
    mana: 50,
    maximumMana: 50,
    manaRegen: 5,
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
          <Opponent opponent={opponent} setOpponent={setOpponent} />

          {aiAttack && (
            <>
              <div
                className="card mx-auto my-3 shadow"
                style={{ width: "200px" }}
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

          <Character
            character={character}
            setCharacter={setCharacter}
            currentTurn={currentTurn}
            setCurrentTurn={setCurrentTurn}
          />

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
