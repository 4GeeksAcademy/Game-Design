import React, { useEffect, useCallback } from "react";
import { aiDefendOrEvade } from "./AI.js";
import { loadKeybinds, normalizeKey } from "./Main Page/keybinds.js";
import { canUseAttack } from "./Health.js";
import "./BattleUI.css";

function isAttackAvailable(attack) {
  return canUseAttack(attack);
}

function getAttackCardType(attack) {
  const hasUses = Number.isInteger(attack.uses);
  const hasCooldown = Number(attack.turnCooldown) > 0;

  if (hasUses && hasCooldown) return "attack-limited-cooldown";
  if (hasUses) return "attack-limited";
  if (hasCooldown) return "attack-cooldown";

  return "attack-standard";
}

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
          <span className="attack-effect-heading debuff-heading">DEBUFFS</span>

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
  openingTurnActive = false,
}) {
  const openingTurnAttackLimitReached =
    openingTurnActive &&
    character.attacks.filter((attack) => attack.state === false).length >= 3;
  const handleAttack = useCallback(
    (index) => {
      const attack = character.attacks[index];

      if (
        !attack ||
        currentTurn !== "player" ||
        !isAttackAvailable(attack) ||
        openingTurnAttackLimitReached
      ) {
        return;
      }

      const result = aiDefendOrEvade(attack, character, opponent);

      if (!result) {
        showCombatMessage("Not enough mana!", "hit");
        return;
      }

      setCharacter({ ...result.attacker });
      setOpponent({ ...result.defender });

      const damage = result.damageReceived ?? 0;
      if (damage > 0) setDamageDealt((previous) => previous + damage);

      setAttacksUsed((previous) => previous + 1);
      showCombatMessage(`${character.name} uses ${attack.name}!`, "attack");

      if (result.action === "defend") {
        showCombatMessage(
          `${opponent.name} blocked ${attack.name}!`,
          "blocked",
        );
      } else if (result.action === "evade") {
        showCombatMessage(`${opponent.name} evaded ${attack.name}!`, "evaded");
      } else if (result.action === "attack" && result.evaded === false) {
        showCombatMessage("💥 FAILED TO EVADE!", "hit");
      } else if (damage > 0) {
        showCombatMessage(`${damage} DAMAGE DEALT!`, "hit");
      }

      if (result.buffNotAppliedReason) {
  const reason =
    result.buffNotAppliedReason === "evaded"
      ? "evaded"
      : "blocked";

  showCombatMessage(
    `BUFF NOT APPLIED — ATTACK WAS ${reason.toUpperCase()}!`,
    "blocked",
  );
}

      Object.entries(result.buffsApplied ?? {}).forEach(([stat, amount]) => {
        if (typeof amount === "number" && amount !== 0) {
          showCombatMessage(
            `✨ ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}`,
            "buff",
          );
        }
      });

      Object.entries(result.debuffsApplied ?? {}).forEach(([stat, amount]) => {
        if (typeof amount === "number" && amount !== 0) {
          showCombatMessage(
            `💀 ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}`,
            "debuff",
          );
        }
      });
    },
    [
      character,
      currentTurn,
      opponent,
      setCharacter,
      setOpponent,
      setDamageDealt,
      setAttacksUsed,
      showCombatMessage,
      openingTurnAttackLimitReached,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (currentTurn !== "player") return;

      const key = normalizeKey(event.key);
      const player1Binds = loadKeybinds().player1;

      const index = player1Binds.attacks.findIndex(
        (boundKey) => normalizeKey(boundKey) === key,
      );

      if (
        index === -1 ||
        !isAttackAvailable(character.attacks[index]) ||
        openingTurnAttackLimitReached
      ) {
        return;
      }

      event.preventDefault();
      handleAttack(index);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    character.attacks,
    currentTurn,
    handleAttack,
    openingTurnAttackLimitReached,
  ]);

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
                  className={`card text-start p-3 attack-card ${getAttackCardType(attack)} ${
                    !isAttackAvailable(attack) ? "attack-unavailable" : ""
                  }`}
                  style={{ minWidth: "200px" }}
                  disabled={
                    currentTurn !== "player" ||
                    !isAttackAvailable(attack) ||
                    openingTurnAttackLimitReached
                  }
                  onClick={() => handleAttack(index)}
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

                  <div className="attack-cost">
                    <span className="attack-mana-cost">
                      COST: {attack.cost} MANA
                    </span>

                    {Number.isInteger(attack.uses) && (
                      <span className="attack-availability-info">
                        USES: {attack.remainingUses ?? attack.uses}/
                        {attack.uses}
                      </span>
                    )}

                    {Number(attack.turnCooldown) > 0 && (
                      <span className="attack-availability-info">
                        {(attack.cooldownRemaining ?? 0) > 0
                          ? `COOLDOWN: ${attack.cooldownRemaining} ROUNDS`
                          : "COOLDOWN: READY"}
                      </span>
                    )}
                  </div>
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
