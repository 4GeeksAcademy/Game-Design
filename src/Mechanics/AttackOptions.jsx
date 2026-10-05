import React from "react";

function AttackOptions() {
  // Temporarily hardcoded attacks to see if i can make it functional

  return (
    <div className="d-flex justify-content-center w-100 my-3">
      <div className="card" id="attack">
        <div className="card-header text-center">Attack Options</div>

        <div className="card-body">
          <div className="d-flex flex-row flex-nowrap gap-2 overflow-x-auto pb-2">
            <button className="btn btn-primary text-nowrap">Attack 1</button>
            <button className="btn btn-primary text-nowrap">Attack 2</button>
            <button className="btn btn-secondary text-nowrap" disabled>
              Attack 3
            </button>
            <button className="btn btn-secondary text-nowrap card h-100" disabled>
              Attack 4
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttackOptions;
