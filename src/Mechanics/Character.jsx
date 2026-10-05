import React from "react";

function Character() {
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
          <h2>Your Character</h2>

          <p>Health: 100</p>
          <p>Mana: 50</p>
          <p>Attack: 20</p>
          <p>Defense: 10</p>
        </div>
      </div>
    </div>
  );
}

export default Character;
