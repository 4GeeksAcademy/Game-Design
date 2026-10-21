
import React from "react";
import { useNavigate } from "react-router-dom";
import "./BattleUI.css";

function GameOverScreen({
  damageDealt = 0,
  attacksUsed = 0,
  onRematch,
  message = "You have been defeated. Get back up and fight again!",
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
    <div id="gameOverScreen">
      <div id="gameOverCard">
        <div id="gameOverIcon">💀</div>

        <p id="gameOverEyebrow">BATTLE COMPLETE</p>
        <h1 id="gameOverTitle">GAME OVER</h1>

        <p id="gameOverMessage">{message}</p>

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

          <div className="gameOverStat">
            <span>◈ Coins Earned</span>
            <strong>+{Math.max(0, Math.floor(damageDealt))}</strong>
          </div>
        </div>

        <div id="gameOverFooter">
          <span>✦</span>
          <p>EVERY FIGHT IS A LESSON</p>
          <span>✦</span>
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

export default GameOverScreen;
