
import React, { useState } from "react";
import "./BattleUI.css";

function StunTargetSelector({
  fighter,
  amount = 1,
  onConfirm,
  onCancel,
}) {
  const [selectedIds, setSelectedIds] = useState([]);

  const maxTargets = Math.max(1, Number(amount) || 1);

  // Attacks already stunned cannot be selected again.
  // Attacks on cooldown remain eligible.
  const eligibleAttacks = (fighter?.attacks ?? []).filter(
    (attack) => (attack.stunned?.remainingRounds ?? 0) <= 0,
  );

  const toggleAttack = (attack) => {
    const attackId = attack.id ?? attack.name;

    setSelectedIds((previous) => {
      if (previous.includes(attackId)) {
        return previous.filter((id) => id !== attackId);
      }

      if (previous.length >= maxTargets) {
        return previous;
      }

      return [...previous, attackId];
    });
  };

  return (
    <div className="stun-selector-backdrop">
      <div className="stun-selector-panel">
        <div className="stun-selector-header">
          <span className="stun-selector-eyebrow">STUN EFFECT</span>
          <h2>Choose Enemy Attacks</h2>
          <p>
            Select up to {maxTargets} attack
            {maxTargets === 1 ? "" : "s"} to disable.
          </p>
        </div>

        <div className="stun-selector-list">
          {eligibleAttacks.length === 0 ? (
            <p>No eligible attacks are available.</p>
          ) : (
            eligibleAttacks.map((attack) => {
              const attackId = attack.id ?? attack.name;
              const isSelected = selectedIds.includes(attackId);

              return (
                <button
                  key={attackId}
                  type="button"
                  className={`stun-selector-attack ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => toggleAttack(attack)}
                  aria-pressed={isSelected}
                >
                  {attack.image && (
                    <img src={attack.image} alt="" />
                  )}

                  <span>{attack.name}</span>

                  <span className="stun-selector-check">
                    {isSelected ? "✓" : "+"}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="stun-selector-footer">
          <span>
            SELECTED: {selectedIds.length}/{maxTargets}
          </span>

          <div>
            <button
              type="button"
              className="stun-selector-cancel"
              onClick={onCancel}
            >
              CANCEL
            </button>

            <button
              type="button"
              className="stun-selector-confirm"
              disabled={selectedIds.length === 0}
              onClick={() => onConfirm(selectedIds)}
            >
              CONFIRM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StunTargetSelector;
