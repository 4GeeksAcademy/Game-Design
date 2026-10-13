import React from "react";
import StatBar from "./StatBar.jsx";
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
            <StatBar
              label="Health"
              icon="❤️"
              current={character.health}
              maximum={character.maximumHealth}
              color={
                character.health / character.maximumHealth <= 0.25
                  ? "danger"
                  : character.health / character.maximumHealth <= 0.5
                    ? "warning"
                    : "success"
              }
            />
            <StatBar
              label="Mana"
              icon="🔵"
              current={character.mana}
              maximum={character.maximumMana}
              color="info"
            />
            <StatBar
              label="Defense"
              icon="🛡️"
              current={character.defense.amount}
              maximum={100}
              color="secondary"
            />
            <StatBar
              label="Agility"
              icon="⚡"
              current={character.agility}
              maximum={100}
              color="warning"
            />
            <StatBar
              label="Cooldown"
              icon="⏳"
              current={character.cooldown ?? 0}
              maximum={character.maximumCooldown ?? 3}
              color="secondary"
            />{" "}
            <StatBar
              label="Recovery"
              icon="🔄"
              current={character.recovery ?? 0}
              maximum={Math.max(5, character.recovery ?? 0)}
              color="info"
            />
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
