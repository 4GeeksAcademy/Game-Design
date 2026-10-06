import React from "react";



function VictoryScreen({ damageDealt, attacksUsed }) {



   return (

            <div className="card-body">

        <h1>YOU WIN!</h1>

        <h3>Victory!</h3>

        <hr />

        <p>Damage Dealt: {damageDealt}</p>

        <p>Attacks Used: {attacksUsed}</p>

        <p>Opponent Health: 0</p>

      </div>

  );
}

export default VictoryScreen;