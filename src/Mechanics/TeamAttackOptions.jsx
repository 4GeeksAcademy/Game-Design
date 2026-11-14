import React from "react";
import { getModifiedAttackStat } from "./Modifiers.js";
import { canUseAttack } from "./Health.js";

function getTeamAttackCardType(attack) {
  const hasUses = Number.isInteger(attack.uses);
  const hasCooldown = Number(attack.turnCooldown) > 0;

  if (hasUses && hasCooldown) return "team-attack-limited-cooldown";
  if (hasUses) return "team-attack-limited";
  if (hasCooldown) return "team-attack-cooldown";

  return "team-attack-standard";
}

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
              {stat.toUpperCase()} {amount > 0 ? "+" : ""}
              {amount}
            </span>
          ))}
        </div>
      )}

      {debuffs.length > 0 && (
        <div>
          <span className="team-effect-heading debuff-heading">DEBUFFS</span>
          {debuffs.map(([stat, amount]) => (
            <span className="team-effect debuff" key={`debuff-${stat}`}>
              {stat.toUpperCase()} {amount > 0 ? "+" : ""}
              {amount}
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
  lockDuringAllyAttack = false,
  allowSimultaneousActions = false,
  onAttack,
  onFinishTurn,
}) {
  if (!fighter) return null;

  const canFinishTurn =
    phase === "fighting" &&
    (allowSimultaneousActions || isActive) &&
    fighter.health > 0 &&
    !fighter.turnFinished;

  const canUseAttacks = canFinishTurn && !lockDuringAllyAttack;

  return (
    <section
      className={`player-attack-panel ${
        isActive ? "is-active" : "is-inactive"
      }`}
    >
      <header className="attack-panel-header">
        <h3>{fighter.name}</h3>
        <span>ATTACKS</span>
      </header>

      <div className="team-attack-grid">
        {fighter.attacks.map((attack, index) => {
          const modifiedDamage = getModifiedAttackStat(
            attack,
            fighter,
            "damage",
          );

          const modifiedSpeed = getModifiedAttackStat(attack, fighter, "speed");

          const modifiedCost = getModifiedAttackStat(attack, fighter, "cost");
          const hasEnoughMana = fighter.mana >= modifiedCost;
          const attackAvailable = canUseAttack(attack);

          const usable = canUseAttacks && attackAvailable && hasEnoughMana;

          const isSacrifice = Number(attack.sacrifice?.health) > 0;

          return (
            <div className="team-attack-wrapper" key={`${fighter.id}-${index}`}>
              <button
                type="button"
                className={`team-attack-card ${getTeamAttackCardType(
                  attack,
                )} ${isSacrifice ? "team-attack-sacrifice" : ""} ${
                  (attack.stunned?.remainingRounds ?? 0) > 0
                    ? "team-attack-stunned"
                    : ""
                }`}
                disabled={!usable}
                onClick={() => onAttack(fighter.id, index)}
              >
                {isSacrifice && (
                  <span className="team-attack-sacrifice-header">
                    HEALTH SACRIFICE
                  </span>
                )}

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
                {(attack.stunned?.remainingRounds ?? 0) > 0 && (
                  <div className="team-stun-overlay">
                    <span className="stun-lock-icon">🔒</span>
                    <strong>STUNNED</strong>
                    <small>
                      {attack.stunned.remainingRounds} ROUNDS REMAINING
                    </small>
                  </div>
                )}
                <strong className="team-attack-name">{attack.name}</strong>

                <span className="team-attack-damage">
                  DAMAGE: {modifiedDamage}
                </span>

                <span className="team-attack-speed">
                  SPEED: {modifiedSpeed}
                </span>

                <div className="team-attack-cost">
                  <span>COST: {modifiedCost} MANA</span>

                  {Number.isInteger(attack.uses) && (
                    <span className="team-attack-availability">
                      USES: {attack.remainingUses ?? attack.uses}/{attack.uses}
                    </span>
                  )}

                  {Number(attack.turnCooldown) > 0 && (
                    <span className="team-attack-availability">
                      {(attack.cooldownRemaining ?? 0) > 0
                        ? `COOLDOWN: ${attack.cooldownRemaining} ROUNDS`
                        : "COOLDOWN: READY"}
                    </span>
                  )}

                  {isSacrifice && (
                    <span className="team-attack-sacrifice-cost">
                      COST: {attack.sacrifice.health} HEALTH
                    </span>
                  )}
                </div>
              </button>

              <AttackEffects attack={attack} />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="finish-turn-button"
        disabled={!canFinishTurn}
        onClick={() => onFinishTurn(fighter.id)}
      >
        {fighter.turnFinished ? "TURN FINISHED" : "FINISH TURN"}
      </button>
    </section>
  );
}
