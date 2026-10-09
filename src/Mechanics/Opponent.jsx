import React from "react";
import "./BattleUI.css";

function Opponent({ opponent, setOpponent }) {
  return (
    <div id="opponentSection">
      <div id="opponent" className="battle-status-panel">
        <img
          id="opponentImage"
          src="https://placehold.co/300x400"
          alt={opponent.name}
        />

        <div id="opponentInfo">
          <p id="opponentHeader">OPPONENT</p>

          <h2 id="opponentName">{opponent.name}</h2>

          <div id="opponentStats">
            <p id="opponentHealth">
              <span>❤️ Health</span>
              <strong>{opponent.health}</strong>
            </p>

            <p id="opponentMana">
              <span>💧 Mana</span>
              <strong>{opponent.mana}</strong>
            </p>

            <p id="opponentCooldown">
              <span>◷ Cooldown</span>
              <strong>{opponent.cooldown}</strong>
            </p>

            <p id="opponentDefense">
              <span>🛡 Defense</span>
              <strong>{opponent.defense.amount}</strong>
            </p>

            <p id="opponentSpeed">
              <span>⚡ Speed</span>
              <strong>{opponent.agility}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Opponent;

