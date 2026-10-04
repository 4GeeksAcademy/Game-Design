import Opponent from "./Opponent.jsx";
import Character from "./Character.jsx";
import AttackOptions from "./AttackOptions.jsx";
import React from "react";

function App() {

    return (
        <div className="container mt-4">

            <Opponent />

            <Character />

            <AttackOptions />

        </div>
    );
}

export default App;

