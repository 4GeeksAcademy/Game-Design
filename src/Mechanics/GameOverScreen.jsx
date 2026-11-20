
import React from "react";
import { useNavigate } from "react-router-dom";
import "./BattleUI.css";

function GameOverScreen({
  damageDealt = 0,
  attacksUsed = 0,
  combatDefense = 0,
  difficulty = "Easy",
  onRematch,
  message = "You have been defeated. Get back up and fight again!",
}) {
  const navigate = useNavigate();
  const difficultyMultiplier = ({ Easy: 1, Normal: 2, Hard: 3 })[difficulty] ?? 1;
  const totalScore = Math.floor((Number(damageDealt) + Number(combatDefense)) * difficultyMultiplier);

  const handleRematch = () => {
    if (onRematch) {
      onRematch();
    } else {
      navigate(0);
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
            <span>🛡️ Combat Defense</span>
            <strong>{combatDefense}</strong>
          </div>

          <div className="gameOverStat">
            <span>✦ Difficulty Multiplier</span>
            <strong>{difficultyMultiplier}x</strong>
          </div>

          <div className="gameOverStat">
            <span>✦ Total Score</span>
            <strong>{Math.max(0, totalScore)}</strong>
          </div>

          <div className="gameOverStat">
            <span>◈ Coins Earned</span>
            <strong>+{Math.max(0, totalScore)}</strong>
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
