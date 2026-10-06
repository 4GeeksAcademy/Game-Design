import Opponent from "./Opponent.jsx";
import Character from "./Character.jsx";
import AttackOptions from "./AttackOptions.jsx";
import VictoryScreen from "./VictoryScreen.jsx";
import React, { useState } from "react";

function App() {

  const [character, setCharacter] = useState({
    health: 100,
    mana: 50,
    maximumMana: 50,
    manaRegen: 5,
    turnFinished: false,
  });

  const [opponent, setOpponent] = useState({
    health: 100,
    mana: 50,
    maximumMana: 50,
    manaRegen: 5,
    turnFinished: false,
  });

  const [damageDealt, setDamageDealt] = useState(0);
  const [attacksUsed, setAttacksUsed] = useState(0);

  return (
    <div className="container mt-4">

      {opponent.health === 0 ? (

        <VictoryScreen
          damageDealt={damageDealt}
          attacksUsed={attacksUsed}
        />

      ) : (

        <>
          <Opponent
            health={opponent.health}
            mana={opponent.mana}
          />

          <Character
            health={character.health}
            mana={character.mana}
          />

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