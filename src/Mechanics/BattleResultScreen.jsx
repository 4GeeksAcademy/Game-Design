import React from "react";
import { useNavigate } from "react-router-dom";
import "./BattleUI.css";

export default function BattleResultScreen({
  won,
  defeated,
  winner,
  damageDealt = 0,
  combatDefense = 0,
  attacksUsed = 0,
  difficulty = "Easy",
  comboMultiplier = 1,
  onRematch,
  onMainMenu,
  onTournamentComplete,
}) {
  const navigate = useNavigate();
  const multiplier = ({ Easy: 1, Normal: 2, Hard: 3 })[difficulty] ?? 1;
  const combo = Math.max(1, Number(comboMultiplier) || 1);
  const score = Math.max(0, Math.floor((Number(damageDealt) + Number(combatDefense)) * multiplier * combo));
  const defeatedFighters = Array.isArray(defeated) ? defeated : defeated ? [defeated] : [];
  const winningFighters = Array.isArray(winner) ? winner : winner ? [winner] : [];

  return (
    <main className={`wild-result-screen ${won ? "result-victory" : "result-defeat"}`} role="alert" aria-live="assertive">
      <div className="wild-result-flash" />
      {won && <div className="wild-result-particles" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>}
      {!won && <div className="wild-result-defeat-atmosphere" aria-hidden="true" />}
      <p className="wild-result-eyebrow">WILD CARDS · MATCH COMPLETE</p>
      <h1 className="wild-result-title">{won ? "VICTORY!" : "GAME OVER"}</h1>
      <p className="wild-result-subtitle">{won ? `${winningFighters.map((fighter) => fighter.name).join(" & ")} CLAIM THE WIN!` : "YOUR FIGHT ENDS HERE — RISE AGAIN."}</p>

      <section className="wild-result-matchup" aria-label="Match results">
        <div className="wild-result-side wild-result-defeated">
          <span className="wild-result-side-label">DEFEATED</span>
          <div className="wild-result-character-group">
            {defeatedFighters.map((fighter, index) => (
              <div className="wild-result-character" key={fighter.id ?? `${fighter.name}-${index}`}>
                {fighter.image && <img src={fighter.image} alt={fighter.name} />}
                <strong>{fighter.name ?? "Fighter"}</strong>
                <span>K.O.</span>
              </div>
            ))}
          </div>
        </div>
        <div className="wild-result-divider" aria-hidden="true"><span>VS</span></div>
        <div className="wild-result-side wild-result-winner">
          <span className="wild-result-side-label">{won ? "CHAMPION" : "WINNER"}</span>
          <div className="wild-result-character-group">
            {winningFighters.map((fighter, index) => (
              <div className="wild-result-character" key={fighter.id ?? `${fighter.name}-${index}`}>
                {fighter.image && <img src={fighter.image} alt={fighter.name} />}
                <strong>{fighter.name ?? "Fighter"}</strong>
                <span>{Math.max(0, Number(fighter.health) || 0)} HP REMAINING</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wild-result-stats" aria-label="Battle statistics">
        <div><span>DAMAGE DEALT</span><strong>{damageDealt}</strong></div>
        <div><span>ATTACKS USED</span><strong>{attacksUsed}</strong></div>
        <div><span>DEFENSES</span><strong>{combatDefense}</strong></div>
        <div><span>DIFFICULTY</span><strong>{difficulty.toUpperCase()} ×{multiplier}</strong></div>
        <div><span>COMBO MULTIPLIER</span><strong>×{combo}</strong></div>
        <div className="wild-result-score"><span>TOTAL SCORE</span><strong>{score}</strong></div>
        <div className="wild-result-score"><span>{onTournamentComplete ? "TOURNAMENT MATCH SCORE" : "COINS EARNED"}</span><strong>{onTournamentComplete ? score : `+${score}`}</strong></div>
      </section>

      <div className="wild-result-actions">
        {onTournamentComplete ? (
          <button type="button" className="wild-result-rematch" onClick={onTournamentComplete}>RETURN TO BRACKET ▶</button>
        ) : (
          <>
            <button type="button" className="wild-result-rematch" onClick={onRematch}>↻ REMATCH</button>
            <button type="button" className="wild-result-menu" onClick={onMainMenu ?? (() => navigate("/"))}>⌂ MAIN MENU</button>
          </>
        )}
      </div>
      <p className="wild-result-footer">{won ? "A NEW LEGEND RISES." : "EVERY DEFEAT IS ANOTHER CHANCE TO GROW."}</p>
    </main>
  );
}
