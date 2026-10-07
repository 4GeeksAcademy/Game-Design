import React from "react";

function Character({ character, setCharacter, currentTurn, setCurrentTurn }) {
  return (
    <div className="d-flex justify-content-center w-100 my-3">
      <div
        className="card m-3 shadow-sm"
        style={{ width: "18rem" }}
        id="Character"
      >
        <img
          src="https://placehold.co/600x400"
          className="card-img-top"
          alt="Your Character"
        />
        <div className="card-header text-center bg-primary text-white fw-bold">
          Your Character
        </div>

        <div className="card-body text-center">
          <h2>{character.name}</h2>

          <p>Health: {character.health}</p>
          <p>Mana: {character.mana}</p>
          <p>Defense: {character.defense.amount}</p>
          <p>cooldown: {character.cooldown}</p>
        </div>
      </div>
      <div className="text-left my-3">
        <button
          className="btn btn-primary rounded-circle d-inline-flex align-items-center justify-content-center shadow-lg"
          style={{ width: "90px", height: "90px", fontWeight: "bold" }}
          disabled={currentTurn !== "player"}
          onClick={() => {
            setCharacter({
              ...character,
              turnFinished: true,
            });

            setCurrentTurn("ai");
          }}
        >
          Finish
          <br />
          Turn
        </button>
      </div>
    </div>
  );
}

export default Character;
