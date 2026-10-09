import React from "react";

function Character({ character, setCharacter, currentTurn, setCurrentTurn }) {
  return (
    <div className="position-relative d-flex justify-content-center w-100 my-4">

      {/* Character Card */}
      <div
        className="card shadow-sm"
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

          <p className="mb-1">Health: {character.health}</p>
          <p className="mb-1">Mana: {character.mana}</p>
          <p className="mb-1">Defense: {character.defense.amount}</p>
          <p className="mb-1">Cooldown: {character.cooldown}</p>
          <h1 className="mb-1">Speed: {character.agility}</h1>
        </div>
      </div>

      {/* Finish Turn Button */}
      <div
        className="position-absolute"
        style={{
          left: "calc(50% + 160px)",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
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