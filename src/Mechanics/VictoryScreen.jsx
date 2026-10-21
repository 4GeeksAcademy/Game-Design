
import React from "react";
import { useNavigate } from "react-router-dom";
import "./BattleUI.css";

function VictoryScreen({
  damageDealt = 0,
  attacksUsed = 0,
  onRematch,
  message = "Your opponent has been defeated.",
}) {
  const navigate = useNavigate();

  const handleRematch = () => {
    if (onRematch) {
      onRematch();
    } else {
      navigate("/character-select");
    }
  };

  return (
    <div id="victoryScreen">
      <div id="victoryCard">
        <div id="victoryIcon">🏆</div>

        <p id="victoryEyebrow">BATTLE COMPLETE</p>
        <h1 id="victoryTitle">VICTORY!</h1>

        <p id="victoryMessage">{message}</p>

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

          <div className="victoryStat">
            <span className="victoryStatIcon">◈</span>
            <span className="victoryStatLabel">Coins Earned</span>
            <strong>+{Math.max(0, Math.floor(damageDealt))}</strong>
          </div>
        </div>

        <div id="victoryFooter">
          <span className="victoryFooterIcon">✦</span>
          <p>WELL FOUGHT, PLAYER!</p>
          <span className="victoryFooterIcon">✦</span>
        </div>

        <div className="resultScreenButtons">
          <button onClick={handleRematch}>
            ↻ REMATCH
          </button>

          <button onClick={() => navigate("/")}>
            ⌂ MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}

export default VictoryScreen;
