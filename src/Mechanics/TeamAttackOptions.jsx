// TeamAttackOptions.jsx
import React from "react";

function AttackEffects({ attack }) {
  const buffs = Object.entries(attack.buff ?? {}).filter(
    ([, amount]) => typeof amount === "number" && amount !== 0,
  );
  const debuffs = Object.entries(attack.debuff ?? {}).filter(
    ([, amount]) => typeof amount === "number" && amount !== 0,
  );

  if (!buffs.length && !debuffs.length) return null;

  return (
    <div className="team-attack-effects">
      {buffs.length > 0 && (
        <div>
          <span className="team-effect-heading buff-heading">BUFFS</span>
          {buffs.map(([stat, amount]) => (
            <span className="team-effect buff" key={`buff-${stat}`}>
              {stat.toUpperCase()} {amount > 0 ? "+" : ""}{amount}
            </span>
          ))}
        </div>
      )}

      {debuffs.length > 0 && (
        <div>
          <span className="team-effect-heading debuff-heading">DEBUFFS</span>
          {debuffs.map(([stat, amount]) => (
            <span className="team-effect debuff" key={`debuff-${stat}`}>
              {stat.toUpperCase()} {amount > 0 ? "+" : ""}{amount}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeamAttackOptions({
  fighter,
  isActive,
  phase,
  onAttack,
  onFinishTurn,
}) {
  if (!fighter) return null;

  const canAct =
    phase === "fighting" &&
    isActive &&
    fighter.health > 0 &&
    !fighter.turnFinished;

  return (
    <section
      className={`player-attack-panel ${isActive ? "is-active" : "is-inactive"}`}
    >
      <header className="attack-panel-header">
        <h3>{fighter.name}</h3>
        <span>ATTACKS</span>
      </header>

      <div className="team-attack-grid">
        {fighter.attacks.map((attack, index) => {
          const usable =
            canAct &&
            attack.state === true &&
            fighter.mana >= (attack.cost ?? 0);

          return (
            <div className="team-attack-wrapper" key={`${fighter.id}-${index}`}>
              <button
                type="button"
                className="team-attack-card"
                disabled={!usable}
                onClick={() => onAttack(fighter.id, index)}
              >
                {attack.image ? (
                  <img
                    className="team-attack-image"
                    src={attack.image}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="team-attack-image-placeholder">NO IMAGE</div>
                )}

                <strong className="team-attack-name">{attack.name}</strong>

                <span className="team-attack-damage">
                  DAMAGE: {attack.damage ?? 0}
                </span>

                <span className="team-attack-cost">
                  COST: {attack.cost ?? 0} MANA
                </span>
              </button>

              <AttackEffects attack={attack} />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="finish-turn-button"
        disabled={!canAct}
        onClick={() => onFinishTurn(fighter.id)}
      >
        {fighter.turnFinished ? "TURN FINISHED" : "FINISH TURN"}
      </button>
    </section>
  );
}