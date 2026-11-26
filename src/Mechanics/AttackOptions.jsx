import React, { useEffect, useCallback, useState } from "react";
import { aiDefendOrEvade } from "./AI.js";
import { normalDefendOrEvade } from "./AI_NormalDifficulty.js";
import { getModifiedAttackStat } from "./Modifiers.js";
import { loadKeybinds, normalizeKey } from "./Main Page/keybinds.js";
import { canUseAttack } from "./Health.js";
import StunTargetSelector from "./StunTargetSelector.jsx";
import "./BattleUI.css";
import { playGameSound } from "../audio/audioManager.js";

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
  difficulty = "Easy",
  localPvP = false,
  playerKey = "player1",
  canAttack = true,
  onPvPAttack,
  onCombatEffect,
  onComboEvent,
}) {
  const [pendingStunAttack, setPendingStunAttack] = useState(null);
  const openingTurnAttackLimitReached =
    openingTurnActive &&
    character.attacks.filter((attack) => attack.state === false).length >= 4;
  const handleAttack = useCallback(
    (index, selectedAttackIds = []) => {
      const attack = character.attacks[index];

      if (
        !attack ||
        (!localPvP && currentTurn !== "player") ||
        (localPvP && !canAttack) ||
        !isAttackAvailable(attack) ||
        openingTurnAttackLimitReached
      ) {
        return;
      }

      if (localPvP) {
        onPvPAttack?.(index, selectedAttackIds);
        return;
      }

      const stunOptions = {
        fighters: [character, opponent],
        selectedAttackIds,
      };

      const opponentHealthBefore = Math.max(0, Number(opponent.health) || 0);
      const result =
        difficulty === "Normal"
          ? normalDefendOrEvade(attack, character, opponent, stunOptions)
          : aiDefendOrEvade(attack, character, opponent, stunOptions);

      if (!result) {
        showCombatMessage("Not enough mana!", "hit");
        return;
      }

      setCharacter({ ...result.attacker });
      setOpponent({ ...result.defender });

      const damage = Math.max(
        0,
        opponentHealthBefore - Math.max(0, Number(result.defender?.health) || 0),
      );
      if (damage > 0) setDamageDealt((previous) => previous + damage);

      const effectStats = [
        ...Object.entries(result.buffsApplied ?? {}).map(([stat, amount]) => ({ stat, amount, kind: "buff" })),
        ...Object.entries(result.debuffsApplied ?? {}).map(([stat, amount]) => ({ stat, amount, kind: "debuff" })),
      ].filter((effect) => Number(effect.amount) !== 0);
      if (result.stunnedAttacks?.length) {
        effectStats.push({ stat: "stun", amount: 1, kind: "debuff" });
      }
      const physicalDamage = Math.max(0, Number(result.damageReceived) || 0);
      const tier = physicalDamage >= 70 ? "fatal" : physicalDamage >= 45 ? "heavy" : physicalDamage >= 20 ? "effective" : "light";
      const damageAndDebuffs = effectStats
        .filter((effect) => effect.kind === "debuff")
        .map(({ stat, amount, kind }) => ({ stat, kind, label: stat === "stun" ? "STUN APPLIED" : `${kind === "buff" ? "↑" : "↓"} ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}` }));
      // The physical strike is the first hit. A health-draining debuff is
      // a distinct follow-up impact, presented just after the physical hit.
      const debuffDamage = Math.max(0, -Number(result.debuffsApplied?.health ?? 0));
      const hasOtherDebuff = damageAndDebuffs.some((effect) => effect.stat !== "health");
      if (physicalDamage > 0) onComboEvent?.(true);
      if (debuffDamage > 0) {
        window.setTimeout(() => {
          onComboEvent?.(true);
          onCombatEffect?.({
            target: "opponent",
            type: "debuff-drain",
            damage: debuffDamage,
            tier: debuffDamage >= 70 ? "fatal" : debuffDamage >= 45 ? "heavy" : debuffDamage >= 20 ? "effective" : "light",
            message: "DEBUFF HIT!",
            effects: damageAndDebuffs.filter((effect) => effect.stat === "health"),
          });
        }, 500);
      } else if (physicalDamage === 0 && debuffDamage === 0 && hasOtherDebuff) {
        onComboEvent?.(true);
      } else if (physicalDamage === 0 && debuffDamage === 0 && damageAndDebuffs.length === 0) {
        onComboEvent?.(false);
      }
      const selfBuffs = effectStats
        .filter((effect) => effect.kind === "buff")
        .map(({ stat, amount, kind }) => ({ stat, kind, label: `${kind === "buff" ? "↑" : "↓"} ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}` }));

      onCombatEffect?.({
        target: "opponent",
        type: result.action === "defend" ? "blocked" : result.action === "evade" ? "evaded" : physicalDamage > 0 ? "damage" : damageAndDebuffs.length ? "status" : "attack",
        damage: physicalDamage,
        tier,
        message: result.action === "defend" ? "BLOCKED!" : result.action === "evade" ? (result.evaded ? "EVADED!" : "FAILED TO EVADE!") : "",
        effects: damageAndDebuffs.filter((effect) => effect.stat !== "health"),
      });
      const healingReceived = Math.max(0, Number(result.buffsApplied?.health) || 0);
      if (healingReceived > 0 || selfBuffs.length || damage > 0) {
        onCombatEffect?.({
          target: "player",
          type: healingReceived > 0 ? "heal" : damage > 0 ? "attack" : "status",
          damage: healingReceived,
          tier: "light",
          message: healingReceived > 0 ? "HEALED!" : "",
          effects: selfBuffs.filter((effect) => effect.stat !== "health"),
        });
      }

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
          result.buffNotAppliedReason === "evaded" ? "evaded" : "blocked";

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
      difficulty,
      localPvP,
      canAttack,
      onPvPAttack,
      onCombatEffect,
      onComboEvent,
    ],
  );

  const startAttack = useCallback(
    (index) => {
      const attack = character.attacks[index];

      if (
        !attack ||
        (!localPvP && currentTurn !== "player") ||
        (localPvP && !canAttack) ||
        !isAttackAvailable(attack) ||
        openingTurnAttackLimitReached
      ) {
        return;
      }

      // Every valid attack selection gets its dedicated impact sound,
      // including attacks that open the stun-target picker.
      playGameSound("attack");

      // In PvP, selected-type stun attacks still open the existing target picker.
      if (attack.stun?.type === "selected") {
        const eligibleAttacks = (opponent.attacks ?? []).filter(
          (enemyAttack) => (enemyAttack.stunned?.remainingRounds ?? 0) <= 0,
        );

        // Don't open an empty selection window.
        if (eligibleAttacks.length > 0) {
          setPendingStunAttack(index);
          return;
        }
      }

      // Ordinary attacks and other stun types resolve normally.
      handleAttack(index);
    },
    [
      character.attacks,
      opponent.attacks,
      currentTurn,
      openingTurnAttackLimitReached,
      handleAttack,
      localPvP,
      canAttack,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((!localPvP && currentTurn !== "player") ||
          (localPvP && !canAttack) ||
          pendingStunAttack !== null) return;

      const key = normalizeKey(event.key);
      if (localPvP && !canAttack) return;
      const playerBinds = loadKeybinds()[playerKey];

      const index = playerBinds.attacks.findIndex(
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
      startAttack(index);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    character.attacks,
    currentTurn,
    startAttack,
    openingTurnAttackLimitReached,
    pendingStunAttack,
    localPvP,
    playerKey,
    canAttack,
  ]);

  return (
    <>
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
              {character.attacks.map((attack, index) => {
                const modifiedDamage = getModifiedAttackStat(
                  attack,
                  character,
                  "damage",
                );

                const modifiedSpeed = getModifiedAttackStat(
                  attack,
                  character,
                  "speed",
                );

                const modifiedCost = getModifiedAttackStat(
                  attack,
                  character,
                  "cost",
                );

                return (
                  <div className="attack-card-wrapper" key={attack.name}>
                    <button
                      id={`attackCard${index}`}
                      type="button"
                      className={`card text-start p-3 attack-card ${getAttackCardType(attack)} ${
                        Number(attack.sacrifice?.health) > 0
                          ? "attack-sacrifice"
                          : ""
                      } ${!isAttackAvailable(attack) ? "attack-unavailable" : ""}
${(attack.stunned?.remainingRounds ?? 0) > 0 ? "attack-stunned" : ""}`}
                      style={{ minWidth: "158px" }}
                      disabled={
                        (!localPvP && currentTurn !== "player") ||
                        (localPvP && !canAttack) ||
                        !isAttackAvailable(attack) ||
                        openingTurnAttackLimitReached
                      }
                      onClick={() => startAttack(index)}
                    >
                      <img
                        id={`attackImage${index}`}
                        src={attack.image}
                        className="card-img-top attack-image"
                        alt={attack.name}
                        loading="lazy"
                      />

                      {(attack.stunned?.remainingRounds ?? 0) > 0 && (
                        <div className="stun-card-overlay">
                          <span className="stun-lock-icon">🔒</span>
                          <strong>STUNNED</strong>
                          <small>
                            {attack.stunned.remainingRounds} ROUNDS REMAINING
                          </small>
                        </div>
                      )}

                      <h5 id={`attackName${index}`} className="text-center">
                        {attack.name}
                      </h5>

                      <div id={`attackStats${index}`} className="attack-stats">
                        <span className="attack-damage">
                          DAMAGE: {modifiedDamage}
                        </span>

                        <span className="attack-speed">
                          SPEED: {modifiedSpeed}
                        </span>
                      </div>

                      <div className="attack-cost">
                        <span className="attack-mana-cost">
                          COST: {modifiedCost} MANA
                        </span>

                        {Number(attack.sacrifice?.health) > 0 && (
                          <span className="attack-sacrifice-cost">
                            HEALTH SACRIFICE: {attack.sacrifice.health}
                          </span>
                        )}

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
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {pendingStunAttack !== null && (
        <StunTargetSelector
          fighter={opponent}
          amount={character.attacks[pendingStunAttack]?.stun?.amount ?? 1}
          onConfirm={(selectedIds) => {
            const attackIndex = pendingStunAttack;

            setPendingStunAttack(null);
            handleAttack(attackIndex, selectedIds);
          }}
          onCancel={() => setPendingStunAttack(null)}
        />
      )}
    </>
  );
}

export default AttackOptions;
