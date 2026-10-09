import React from "react";
import "./BattleUI.css";

function Character({ character, setCharacter, currentTurn, setCurrentTurn }) {
  return (
    <div id="characterSection">
      <div id="character" className="battle-status-panel">
        <img
          id="characterImage"
          src="https://placehold.co/300x400"
          alt={character.name}
        />

        <div id="characterInfo">
          <p id="characterHeader">YOUR CHARACTER</p>

          <h2 id="characterName">{character.name}</h2>

          <div id="characterStats">
            <p id="characterHealth">
              <span>❤️ Health</span>
              <strong>{character.health}</strong>
            </p>

            <p id="characterMana">
              <span>💧 Mana</span>
              <strong>{character.mana}</strong>
            </p>

            <p id="characterCooldown">
              <span>◷ Cooldown</span>
              <strong>{character.cooldown}</strong>
            </p>

            <p id="characterDefense">
              <span>🛡 Defense</span>
              <strong>{character.defense.amount}</strong>
            </p>

            <p id="characterSpeed">
              <span>⚡ Speed</span>
              <strong>{character.agility}</strong>
            </p>
          </div>
        </div>
      </div>

      <div id="finishTurnArea">
        <button
          id="finishTurnButton"
          disabled={currentTurn !== "player"}
          onClick={() => {
            setCharacter({
              ...character,
              turnFinished: true,
            });

            setCurrentTurn("ai");
          }}
        >
          <span>Finish</span>
          <span>Turn</span>
          <span id="finishTurnArrow">➜</span>
        </button>
      </div>
    </div>
  );
}

export default Character;

