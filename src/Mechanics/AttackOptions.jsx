import React from "react";
import { aiDefendOrEvade } from "./AI.js";
import "./BattleUI.css";

function AttackEffects({ attack }) {
  const buffs = Object.entries(attack.buff ?? {}).filter(
    ([, amount]) => typeof amount === "number" && amount !== 0,
  );

  const debuffs = Object.entries(attack.debuff ?? {}).filter(
    ([, amount]) => typeof amount === "number" && amount !== 0,
  );

  if (buffs.length === 0 && debuffs.length === 0) {
    return null;
  }

  return (
    <div className="attack-effects-popup">
      <h6>Attack Effects</h6>

      {buffs.length > 0 && (
        <div className="attack-effect-group">
          <span className="attack-effect-heading buff-heading">BUFFS</span>

          <div className="attack-effect-list">
            {buffs.map(([stat, amount]) => (
              <span key={stat} className="attack-effect buff">
                {stat.toUpperCase()} {amount > 0 ? "+" : ""}
                {amount}
              </span>
            ))}
          </div>
        </div>
      )}

      {debuffs.length > 0 && (
        <div className="attack-effect-group">
          <span className="attack-effect-heading debuff-heading">
            DEBUFFS
          </span>

          <div className="attack-effect-list">
            {debuffs.map(([stat, amount]) => (
              <span key={stat} className="attack-effect debuff">
                {stat.toUpperCase()} {amount > 0 ? "+" : ""}
                {amount}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AttackOptions({
  character,
  opponent,
  setCharacter,
  setOpponent,
  setDamageDealt,
  setAttacksUsed,
  currentTurn,
  showCombatMessage,
}) {
  return (
    <div
      id="attackSection"
      className="d-flex justify-content-center w-100 my-3"
    >
      <div id="attack" className="card w-100">
        <div id="attackHeader" className="card-header text-center fw-bold">
          Attack Options
        </div>

        <div id="attackBody" className="card-body">
          <div
            id="attackList"
            className="d-flex flex-row flex-nowrap gap-3 overflow-x-auto pb-2"
          >
            {character.attacks.map((attack, index) => (
              <div className="attack-card-wrapper" key={attack.name}>
                <button
                  id={`attackCard${index}`}
                  type="button"
                  className="card text-start p-3 attack-card"
                  style={{ minWidth: "200px" }}
                  disabled={currentTurn !== "player" || !attack.state}
                  onClick={() => {
                    const result = aiDefendOrEvade(
                      attack,
                      character,
                      opponent,
                    );

                    if (!result) {
                      showCombatMessage("Not enough mana!", "hit");
                      return;
                    }

                    setCharacter({ ...result.attacker });
                    setOpponent({ ...result.defender });

                    const damage = result.damageReceived ?? 0;

                    if (damage > 0) {
                      setDamageDealt((previous) => previous + damage);
                    }

                    setAttacksUsed((previous) => previous + 1);

                    showCombatMessage(
                      `${character.name} uses ${attack.name}!`,
                      "attack",
                    );

                    if (result.action === "defend") {
                      showCombatMessage(
                        `${opponent.name} blocked ${attack.name}!`,
                        "blocked",
                      );
                    } else if (result.action === "evade") {
                      showCombatMessage(
                        `${opponent.name} evaded ${attack.name}!`,
                        "evaded",
                      );
                    } else if (
                      result.action === "attack" &&
                      result.evaded === false
                    ) {
                      showCombatMessage("💥 FAILED TO EVADE!", "hit");
                    } else if (damage > 0) {
                      showCombatMessage(`${damage} DAMAGE DEALT!`, "hit");
                    }

                    // Display buffs applied by the attack.
                    Object.entries(result.buffsApplied ?? {}).forEach(
                      ([stat, amount]) => {
                        if (typeof amount === "number" && amount !== 0) {
                          showCombatMessage(
                            `✨ ${stat.toUpperCase()} ${
                              amount > 0 ? "+" : ""
                            }${amount}`,
                            "buff",
                          );
                        }
                      },
                    );

                    // Display debuffs applied by the attack.
                    Object.entries(result.debuffsApplied ?? {}).forEach(
                      ([stat, amount]) => {
                        if (typeof amount === "number" && amount !== 0) {
                          showCombatMessage(
                            `💀 ${stat.toUpperCase()} ${
                              amount > 0 ? "+" : ""
                            }${amount}`,
                            "debuff",
                          );
                        }
                      },
                    );
                  }}
                >
                  <img
                    id={`attackImage${index}`}
                    src={attack.image}
                    className="card-img-top attack-image"
                    alt={attack.name}
                    loading="lazy"
                  />

                  <h5 id={`attackName${index}`} className="text-center">
                    {attack.name}
                  </h5>

                  <div id={`attackStats${index}`} className="attack-stats">
                    <span className="attack-damage">
                      DAMAGE: {attack.damage ?? 0}
                    </span>
                  </div>

                  <span
                    id={`attackButton${index}`}
                    className="btn btn-success attack-cost-button"
                  >
                    COST: {attack.cost ?? 0} MANA
                  </span>
                </button>

                <AttackEffects attack={attack} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttackOptions;
