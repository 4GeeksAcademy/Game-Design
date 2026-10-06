import React from "react";
import './BattleUI.css';

function Opponent({ health, mana }) {

    
    return (
        <div className="card mb-4" id="opponent">

            <div className="card-header">
                Opponent
            </div>

            <div className="card-body text-center">

                <h2>Opponent Character</h2>

                <p>Health: {health}</p>
                <p>Mana: {mana}</p>
                <p>Attack: 20</p>
                <p>Defense: 10</p>

            </div>

        </div>
    );
}

export default Opponent;