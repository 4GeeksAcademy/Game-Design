import React from "react";
import "./BattleUI.css";

import { attackCharacter } from "./Health.js";

function AttackOptions({
  character,
  opponent,
  setCharacter,
  setOpponent,
  setDamageDealt,
  setAttacksUsed
}) {

  return (
    <div className="d-flex justify-content-center w-100 my-3">
      <div className="card" id="attack">

        <div className="card-header text-center">
          Attack Options
        </div>

        <div className="card-body">

          <div className="d-flex flex-row flex-nowrap gap-3 overflow-x-auto pb-2">

            {character.attacks.map((attack) => (

              <button
                className="card btn btn-light text-start p-3"
                id="attackButton"
                style={{ minWidth: "200px" }}
                key={attack.name}
                disabled={!attack.state}

                onClick={() => {

                  const result = attackCharacter(
                    attack,
                    character,
                    opponent
                  );

                  if (result) {

                    setCharacter({
                      ...result.attacker
                    });

                    setOpponent({
                      ...result.defender
                    });

                    setDamageDealt((damage) =>
                      damage + attack.damage
                    );

                    setAttacksUsed((attacks) =>
                      attacks + 1
                    );
                  }
                }}
              >

                <img
                  src="https://placehold.co/600x400"
                  className="card-img-top"
                  alt={attack.name}
                />

                <h5 className="text-center">
                  {attack.name}
                </h5>

                <p className="mb-1">
                  Damage: {attack.damage}
                </p>

                <p className="mb-3">
                  Mana: {attack.cost}
                </p>

                <span className="btn btn-success w-100">
                  ATTACK
                </span>

              </button>

            ))}

          </div>

        </div>

      </div>
    </div>
  );
}

export default AttackOptions;