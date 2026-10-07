import React from "react";
import "./BattleUI.css";

function Opponent({ opponent, setOpponent }) {
  return (
    <div className="card mb-4 shadow-sm" id="opponent">
      <div className="card-header bg-dark text-white fw-bold">Opponent</div>
      <img
        src="https://placehold.co/600x400"
        className="card-img-top object-fit-cover"
        style={{ height: "200px" }}
        alt={opponent.name}
      />
      <div className="card-body text-center">
        <h2>{opponent.name}</h2>

        <p className="mb-1">Health: {opponent.health}</p>
        <p className="mb-1">Mana: {opponent.mana}</p>
        <p className="mb-1">Cooldown: {opponent.cooldown}</p>
        <p className="mb-1">Defense: {opponent.defense.amount }</p>
      </div>
    </div>
  );
}

export default Opponent;
