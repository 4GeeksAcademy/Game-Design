import React from "react";
import "./BattleUI.css";

function GameOverScreen({ damageDealt, attacksUsed }) {
  return (
    <div id="gameOverScreen">
      <div id="gameOverCard">
        <div id="gameOverIcon">💀</div>

        <p id="gameOverEyebrow">BATTLE COMPLETE</p>

        <h1 id="gameOverTitle">GAME OVER</h1>

        <p id="gameOverMessage">
          You have been defeated. Get back up and fight again!
        </p>

        <div id="gameOverDivider"></div>

        <h2 id="gameOverResultsTitle">BATTLE RESULTS</h2>

        <div id="gameOverStats">
          <div className="gameOverStat">
            <span>⚔️ Damage Dealt</span>
            <strong>{damageDealt}</strong>
          </div>

          <div className="gameOverStat">
            <span>💥 Attacks Used</span>
            <strong>{attacksUsed}</strong>
          </div>

          <div className="gameOverStat">
            <span>❤️ Your Health</span>
            <strong>0</strong>
          </div>
        </div>

        <div id="gameOverFooter">
          <span>✦</span>
          <p>EVERY FIGHT IS A LESSON</p>
          <span>✦</span>
        </div>
      </div>
    </div>
  );
}

export default GameOverScreen;

