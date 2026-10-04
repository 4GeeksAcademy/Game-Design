import React from "react";


function Character() {

    return (
        <div className="card mb-4" id="character">

            <div className="card-header">
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
    );
}

export default Character;