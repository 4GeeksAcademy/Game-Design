import React from "react";
import "./BattleUI.css";

function Opponent({ opponent, setOpponent }) {
  return (
    <div className="card mb-4" id="opponent">
      <div className="card-header">Opponent</div>

      <div className="card-body text-center">
        <h2>Opponent Character</h2>

        <p>Health: {opponent.health}</p>
        <p>Mana: {opponent.mana}</p>
        <button
          className="btn btn-danger"
          onClick={() => {
            setOpponent({
              ...opponent,
              turnFinished: true,
            });
          }}
        >
          Finish Turn
        </button>
      </div>
    </div>
  );
}

export default Opponent;
