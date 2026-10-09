import React from "react";
import StatBar from "./StatBar.jsx";
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

          <div id="characterStats">
            <StatBar
              label="Health"
              icon="❤️"
              current={opponent.health}
              maximum={opponent.maximumHealth}
              color={
                opponent.health / opponent.maximumHealth <= 0.25
                  ? "danger"
                  : opponent.health / opponent.maximumHealth <= 0.5
                    ? "warning"
                    : "success"
              }
            />

            <StatBar
              label="Mana"
              icon="🔵"
              current={opponent.mana}
              maximum={opponent.maximumMana}
              color="info"
            />

            <StatBar
              label="Defense"
              icon="🛡️"
              current={opponent.defense.amount}
              maximum={100}
              color="secondary"
            />

            <StatBar
              label="Agility"
              icon="⚡"
              current={opponent.agility}
              maximum={100}
              color="warning"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Opponent;
