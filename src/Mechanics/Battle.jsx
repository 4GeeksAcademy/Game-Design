import Opponent from "./Opponent.jsx";
import Character from "./Character.jsx";
import AttackOptions from "./AttackOptions.jsx";
import VictoryScreen from "./VictoryScreen.jsx";
import { turn } from "./Turns.js";

// Characters ATM
import mina from "./Mina_AshidoStats";

import React, { useState, useEffect } from "react";

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

  const [opponent, setOpponent] = useState({
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

  const [damageDealt, setDamageDealt] = useState(0);
  const [attacksUsed, setAttacksUsed] = useState(0);

  useEffect(() => {
    if (character.turnFinished && opponent.turnFinished) {
      turn(character, opponent);

      setCharacter({
        ...character,
      });

      setOpponent({
        ...opponent,
      });
    }
  }, [character, opponent]);

  return (
    <div className="container mt-4">
      {opponent.health === 0 ? (
        <VictoryScreen damageDealt={damageDealt} attacksUsed={attacksUsed} />
      ) : (
        <>
          <Opponent opponent={opponent} setOpponent={setOpponent} />

          <Character character={character} setCharacter={setCharacter} />

          <AttackOptions
            character={character}
            opponent={opponent}
            setCharacter={setCharacter}
            setOpponent={setOpponent}
            setDamageDealt={setDamageDealt}
            setAttacksUsed={setAttacksUsed}
          />
        </>
      )}
    </div>
  );
}

export default App;
