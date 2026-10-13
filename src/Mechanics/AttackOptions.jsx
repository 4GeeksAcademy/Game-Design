import React from "react";
import { aiDefendOrEvade } from "./AI.js";
import "./BattleUI.css";

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
      {/* Attack Options Card */}
      <div id="attack" className="card w-100">
        {/* Section Header */}
        <div id="attackHeader" className="card-header text-center fw-bold">
          Attack Options
        </div>

        {/* Attack Cards Container */}
        <div id="attackBody" className="card-body">
          <div
            id="attackList"
            className="d-flex flex-row flex-nowrap gap-3 overflow-x-auto pb-2"
          >
            {character.attacks.map((attack, index) => (
              <button
                id={`attackButton${index}`}
                className="card btn btn-light text-start p-3"
                style={{ minWidth: "200px" }}
                key={attack.name}
                disabled={currentTurn !== "player" || !attack.state}
                onClick={() => {
                  const result = aiDefendOrEvade(attack, character, opponent);

                  if (result) {
                    // Announce the attack.
                    showCombatMessage(
                      `⚔️ ${character.name} uses ${attack.name}!`,
                      "hit",
                    );

                    // Show damage when the attack actually deals damage.
                    if (result.damageReceived > 0) {
                      showCombatMessage(
                        `💥 ${opponent.name.toUpperCase()} TOOK ${result.damageReceived} DAMAGE!`,
                        "hit",
                      );
                    }

                    // Show the effects applied to the attacker.
                    // Show each buff individually.
                    Object.entries(result.buffsApplied ?? {}).forEach(
                      ([stat, amount]) => {
                        if (amount !== 0) {
                          showCombatMessage(
                            `✨ ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}!`,
                            amount > 0 ? "buff" : "debuff",
                          );
                        }
                      },
                    );

                    // Show each debuff individually.
                    Object.entries(result.debuffsApplied ?? {}).forEach(
                      ([stat, amount]) => {
                        if (amount !== 0) {
                          showCombatMessage(
                            `💢 ${opponent.name.toUpperCase()} ${stat.toUpperCase()} ${amount}!`,
                            "debuff",
                          );
                        }
                      },
                    );

                   

                    // Show defensive responses for normal attacks.
                    if (result.action === "defend") {
                      showCombatMessage(
                        `🛡️ ${opponent.name.toUpperCase()} BLOCKED!`,
                        "opponent-blocked",
                      );
                    } else if (result.action === "evade") {
                      showCombatMessage(
                        result.evaded
                          ? `💨 ${opponent.name.toUpperCase()} EVADED!`
                          : `💥 ${opponent.name.toUpperCase()} FAILED TO EVADE!`,
                        result.evaded ? "opponent-evaded" : "hit",
                      );
                    }

                    setCharacter({ ...result.attacker });
                    setOpponent({ ...result.defender });

                    setDamageDealt(
                      (damage) => damage + (result.damageReceived || 0),
                    );

                    setAttacksUsed((attacks) => attacks + 1);
                  }
                }}
              >
                {/* Attack Image */}
                <img
                  id={`attackImage${index}`}
                  src="https://placehold.co/600x400"
                  className="card-img-top"
                  alt={attack.name}
                />

                {/* Attack Name */}
                <h5 id={`attackName${index}`} className="text-center">
                  {attack.name}
                </h5>

                {/* Attack Stats */}
                <div id={`attackStats${index}`}>
                  <p id={`attackDamage${index}`} className="mb-1">
                    Damage: {attack.damage ?? 0}
                  </p>

                  <p id={`attackMana${index}`} className="mb-3">
                    Mana: {attack.cost}
                  </p>
                </div>

                {/* Attack Button Label */}
                <span
                  id={`attackLabel${index}`}
                  className="btn btn-success w-100"
                >
                  ATTACK
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttackOptions;
