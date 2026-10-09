import React from "react";
import "./BattleUI.css";

function VictoryScreen({ damageDealt, attacksUsed }) {
  return (
    <div id="victoryScreen">
      <div id="victoryCard">
        <div id="victoryIcon">🏆</div>

        <p id="victoryEyebrow">BATTLE COMPLETE</p>

        <h1 id="victoryTitle">VICTORY!</h1>

        <p id="victoryMessage">
          Your opponent has been defeated.
        </p>

        <div id="victoryDivider"></div>

        <h2 id="victoryResultsTitle">BATTLE RESULTS</h2>

        <div id="victoryStats">
          <div className="victoryStat">
            <span className="victoryStatIcon">⚔️</span>
            <span className="victoryStatLabel">Damage Dealt</span>
            <strong>{damageDealt}</strong>
          </div>

          <div className="victoryStat">
            <span className="victoryStatIcon">💥</span>
            <span className="victoryStatLabel">Attacks Used</span>
            <strong>{attacksUsed}</strong>
          </div>

          <div className="victoryStat">
            <span className="victoryStatIcon">❤️</span>
            <span className="victoryStatLabel">Opponent Health</span>
            <strong>0</strong>
          </div>
        </div>

        <div id="victoryFooter">
          <span id="victoryFooterIcon">✦</span>
          <p>WELL FOUGHT, PLAYER!</p>
          <span id="victoryFooterIcon">✦</span>
        </div>
      </div>
    </div>
  );
}

export default VictoryScreen;