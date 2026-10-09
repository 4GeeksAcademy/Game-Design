import Opponent from "./Opponent.jsx";
import Character from "./Character.jsx";
import AttackOptions from "./AttackOptions.jsx";
import VictoryScreen from "./VictoryScreen.jsx";
import { attackCharacter, evadeAttack } from "./Health.js";
import { turn } from "./Turns.js";

// Characters list for now
import mina from "./Mina_AshidoStats";
import rockLee from "./Rock_LeeStats";

// Artificial Intelligence (Bot)
import { aiTurn, aiFinishTurn } from "./AI.js";

import React, { useState, useEffect } from "react";

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
    <div className="container-fluid mt-3" id="gameContainer">
      {" "}
      {opponent.health === 0 ? (
        <div id="victorySection">
          {" "}
          <VictoryScreen
            damageDealt={damageDealt}
            attacksUsed={attacksUsed}
          />{" "}
        </div>
      ) : (
        <>
          {" "}
          {/* Battle Arena */}{" "}
          <div id="battleArena">
            {" "}
            {/* Opponent */}{" "}
            <div id="opponentSection">
              {" "}
              <Opponent opponent={opponent} setOpponent={setOpponent} />{" "}
            </div>{" "}
            {/* AI Attack and Defensive Actions */}{" "}
            {aiAttack && (
              <div id="aiAttackSection">
                {" "}
                <div id="aiAttackCard">
                  {" "}
                  <div id="aiAttackHeader"> OPPONENT ATTACK </div>{" "}
                  <div id="aiAttackInfo">
                    {" "}
                    <h5 id="aiAttackName">{aiAttack.name}</h5>{" "}
                    <div id="aiAttackStats">
                      {" "}
                      <span>⚔ {aiAttack.damage}</span>{" "}
                      <span>◆ {aiAttack.cost}</span>{" "}
                      <span>⚡ {aiAttack.speed}</span>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
                <div id="defensiveActions">
                  {" "}
                  {/* Defend */}{" "}
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
                        setOpponent({ ...result.attacker });
                        setCharacter({ ...result.defender });
                        setAiAttack(null);
                      }
                    }}
                  >
                    {" "}
                    <span id="defendButtonIcon">🛡</span>{" "}
                    <span>Defend</span>{" "}
                  </button>{" "}
                  {/* Evade */}{" "}
                  <button
                    id="evadeButton"
                    onClick={() => {
                      character.cooldown -= 1;
                      const result = evadeAttack(aiAttack, opponent, character);
                      if (result) {
                        character.blocked = true;
                        setOpponent({ ...result.attacker });
                        setCharacter({ ...result.defender });
                        setAiAttack(null);
                      }
                    }}
                  >
                    {" "}
                    <span id="evadeButtonIcon">💨</span> <span>Evade</span>{" "}
                  </button>{" "}
                </div>{" "}
              </div>
            )}{" "}
            {/* Player */}{" "}
            <div id="characterSection">
              {" "}
              <Character
                character={character}
                setCharacter={setCharacter}
                currentTurn={currentTurn}
                setCurrentTurn={setCurrentTurn}
              />{" "}
            </div>{" "}
          </div>{" "}
          {/* Player Attack Options */}{" "}
          <div id="attackSection">
            {" "}
            <AttackOptions
              character={character}
              opponent={opponent}
              setCharacter={setCharacter}
              setOpponent={setOpponent}
              setDamageDealt={setDamageDealt}
              setAttacksUsed={setAttacksUsed}
              currentTurn={currentTurn}
            />{" "}
          </div>{" "}
        </>
      )}{" "}
    </div>
  );
}
export default App;
