import React from "react";
import "./BattleUI.css";

function AttackOptions() {
  // Temporarily hardcoded attacks to see if i can make it functional

  return (
    <div className="d-flex justify-content-center w-100 my-3">
      <div className="card" id="attack">
        <div className="card-header text-center">Attack Options</div>

        <div className="card-body">
          <div className="d-flex flex-row flex-nowrap gap-3 overflow-x-auto pb-2">
            {/* Attack 1 */}
            <button
              className="card btn btn-light text-start p-3"
              id="attackButton"
              style={{ minWidth: "200px" }}
            >
              <img
                src="https://placehold.co/600x400"
                className="card-img-top"
                alt="Your Character"
              />
              <h5 className="text-center" id="attackCardTitle">Acid Shot</h5>

              <p className="mb-1" id="attackDesc">Damage: 20</p>

              <p className="mb-3" id="attackDesc">Mana: 10</p>

              <span className="btn btn-success w-100">ATTACK</span>
            </button>

            {/* Attack 2 */}
            <button
              className="card btn btn-primary text-start p-3"
              style={{ minWidth: "200px" }}
              id="attackButton"
            >
              <img
                src="https://placehold.co/600x400"
                className="card-img-top"
                alt="Your Character"
              />

              <h5 className="text-center">Acid Bomb</h5>

              <p className="mb-1">Damage: 30</p>

              <p className="mb-3">Mana: 15</p>

              <span className="btn btn-success w-100">ATTACK</span>
            </button>
            {/* Attack 3 */}
            <button
              className="card btn btn-secondary text-start p-3"
              style={{ minWidth: "200px" }}
              disabled
              id="attackButton"
            >
              <img
                src="https://placehold.co/600x400"
                className="card-img-top"
                alt="Your Character"
              />

              <h5 className="text-center">Acid Rain</h5>

              <p className="mb-1">Damage: 40</p>

              <p className="mb-3">Mana: 20</p>

              <span className="btn btn-light w-100">DISABLED</span>
            </button>
            {/* Attack 4 */}
            <button
              className="card btn btn-secondary text-start p-3"
              style={{ minWidth: "200px" }}
              disabled
              id="attackButton"
            >
              <img
                src="https://placehold.co/600x400"
                className="card-img-top"
                alt="Your Character"
              />

              <h5 className="text-center">Acid Storm</h5>

              <p className="mb-1">Damage: 50</p>

              <p className="mb-3">Mana: 25</p>

              <span className="btn btn-light w-100">DISABLED</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttackOptions;
