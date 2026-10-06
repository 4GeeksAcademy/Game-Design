import Opponent from "./Opponent.jsx";
import Character from "./Character.jsx";
import AttackOptions from "./AttackOptions.jsx";
import VictoryScreen from "./VictoryScreen.jsx";
import React from "react";
import { useState } from "react";


  function App() {
    const [opponentHealth, setOpponentHealth] = useState(100);
    const [damageDealt, setDamageDealt] = useState(0);
    const [attacksUsed, setAttacksUsed] = useState(0);

    return (
      <div className="container mt-4">
        {opponentHealth === 0 ? (
          <VictoryScreen damageDealt={damageDealt} attacksUsed={attacksUsed} />
        ) : (
          <>
            <Opponent health={opponentHealth} />

            <Character />

            <AttackOptions
              setOpponentHealth={setOpponentHealth}
              setDamageDealt={setDamageDealt}
              setAttacksUsed={setAttacksUsed}
            />
          </>
        )}
      </div>
    );
  }
  
export default App;
