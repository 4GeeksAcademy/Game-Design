import React, { useEffect, useCallback } from "react";
import { getModifiedCharacterStat } from "./Modifiers.js";
import "./BattleUI.css";
import { loadKeybinds, normalizeKey } from "./Main Page/keybinds.js";

function ResourceBar({ label, value, maximum, type }) {
  const max = Math.max(1, Number(maximum) || 1);
  const current = Math.max(0, Number(value) || 0);
  const percent = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className={`solo-resource-row solo-resource-${type}`}>
      <span>{label}</span>
      <div className="solo-resource-track">
        <div className="solo-resource-fill" style={{ width: `${percent}%` }} />
      </div>
      <b>{current}/{max}</b>
    </div>
  );
}

function Segments({ label, value, maximum, type }) {
  const max = Math.min(10, Math.max(0, Math.floor(Number(maximum) || 0)));
  const current = Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
  return (
    <div className={`solo-segment-row ${type}`}>
      <span>{label}</span>
      <div className="solo-segments">
        {Array.from({ length: max }, (_, index) => (
          <i key={index} className={index < current ? "filled" : ""} />
        ))}
        {!max && <small>—</small>}
      </div>
      <b>{current}/{max}</b>
    </div>
  );
}

function FighterInfo({ fighter }) {
  const slotLimit = Number(fighter.slot) || fighter.attacks?.length || 0;
  const cooldownMax = Number(fighter.maximumCooldown) || 0;
  const recoveryMax = Number(fighter.maximumRecovery) || 10;
  return (
    <div className="solo-fighter-tooltip" role="tooltip">
      <header><strong>{fighter.name}</strong><span>FIGHTER STATUS</span></header>
      <div className="solo-tooltip-grid">
        <div><span>DEFENSE</span><b>{getModifiedCharacterStat(fighter, "defense")}</b></div>
        <div><span>AGILITY</span><b>{getModifiedCharacterStat(fighter, "agility")}</b></div>
        <div><span>MANA REGEN</span><b>{getModifiedCharacterStat(fighter, "manaRegen")}</b></div>
        <div><span>ATTACK SLOTS</span><b>{fighter.attacks?.length ?? 0}/{slotLimit}</b></div>
        <div><span>MAX HEALTH</span><b>{fighter.maximumHealth}</b></div>
        <div><span>MAX MANA</span><b>{fighter.maximumMana}</b></div>
        <div><span>COOLDOWN</span><b>{getModifiedCharacterStat(fighter, "cooldown")}/{cooldownMax}</b></div>
        <div><span>RECOVERY</span><b>{getModifiedCharacterStat(fighter, "recovery")}/{recoveryMax}</b></div>
      </div>
      {(fighter.activeModifiers ?? []).length > 0 && (
        <div className="solo-tooltip-effects">
          <strong>ACTIVE EFFECTS</strong>
          {fighter.activeModifiers.map((effect, index) => (
            <span key={effect.id ?? index}>
              {effect.sourceAttackName ?? effect.id ?? "Active effect"}
              {effect.remainingDuration != null ? ` · ${effect.remainingDuration} turns` : ""}
            </span>
          ))}
        </div>
      )}
      <small>Hover or focus to inspect current modified stats</small>
    </div>
  );
}

function Character({
  character,
  setCharacter,
  currentTurn,
  setCurrentTurn,
  combatMessages = [],
  combatEffect = null,
  showFinishTurnButton = true,
}) {
  const finishTurn = useCallback(() => {
    if (currentTurn !== "player") return;
    setCharacter({ ...character, turnFinished: true });
    setCurrentTurn("ai");
  }, [character, currentTurn, setCharacter, setCurrentTurn]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (normalizeKey(event.key) !== normalizeKey(loadKeybinds().player1.finishTurn) || currentTurn !== "player") return;
      event.preventDefault();
      finishTurn();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTurn, finishTurn]);

  const cooldown = getModifiedCharacterStat(character, "cooldown");
  const cooldownMax = getModifiedCharacterStat(character, "maximumCooldown") || 3;
  const recovery = getModifiedCharacterStat(character, "recovery");
  const stunnedAttackCount = character.attacks.filter((attack) => (attack.stunned?.remainingRounds ?? 0) > 0).length;
  const hasStun = stunnedAttackCount > 0;
  const effectClass = combatEffect?.type ? `combat-effect-${combatEffect.type}` : "";

  return (
    <div id="characterSection" className="solo-fighter-section player-fighter-section">
      <div id="character" className="solo-fighter-unit battle-status-panel">
        <div className="solo-fighter-hud">
          <div className="solo-fighter-name-row">
            <h2 id="characterName">{character.name}</h2>
            <span>PLAYER</span>
          </div>
          <ResourceBar label="HP" value={character.health} maximum={character.maximumHealth} type="health" />
          <ResourceBar label="MP" value={character.mana} maximum={character.maximumMana} type="mana" />
          <div className="solo-segment-group">
            <Segments label="CD" value={cooldown} maximum={cooldownMax} type="cooldown" />
            <Segments label="REC" value={recovery} maximum={10} type="recovery" />
          </div>
        </div>
        <div className="solo-hud-pointer" aria-hidden="true" />

        <div
          role="group"
          tabIndex={0}
          className={`solo-fighter-art ${effectClass}`}
          aria-label={`${character.name} fighter artwork. Focus or hover to view stats.`}
        >
          <div className={`solo-portrait-wrapper ${hasStun ? "fighter-stunned" : ""}`}>
            <img key={combatEffect?.id ?? "idle"} src={character.image} id="characterImage" alt={character.name} />
            {hasStun && <span className="solo-stun-status"><strong>STUNNED!</strong><small key={stunnedAttackCount}>{stunnedAttackCount} ATTACK{stunnedAttackCount === 1 ? "" : "S"} DISABLED</small></span>}
            {combatEffect?.target === "player" && ["debuff-drain", "damage"].includes(combatEffect.type) && <span key={combatEffect.id} className="durability-drain-visual" aria-hidden="true"><i /><i /><i /></span>}
          </div>
          {combatEffect?.target === "player" && (
            <div key={combatEffect.id} className={`solo-impact-overlay impact-${combatEffect.type}`}>
              {combatEffect.damage > 0 && (
                <strong className={`solo-damage-number damage-tier-${combatEffect.tier}`}>
                  {combatEffect.type === "heal" ? `+${combatEffect.damage}` : `-${combatEffect.damage}`}
                </strong>
              )}
              {combatEffect.message && <span className={combatEffect.message === "STUNNED!" ? "solo-stunned-callout" : ""}>{combatEffect.message}</span>}
              {(combatEffect.effects ?? []).map((effect, index) => (
                <b key={index} className={`solo-effect-label effect-${effect.stat}`} style={{ animationDelay: `${index * 650}ms` }}>
                  {effect.label}
                </b>
              ))}
            </div>
          )}
          <FighterInfo fighter={character} />
        </div>

        <div className="solo-combat-messages" aria-live="polite">

        </div>
        {showFinishTurnButton && (
          <div id="finishTurnArea">
            <button id="finishTurnButton" disabled={currentTurn !== "player"} onClick={finishTurn}>
              <span>Finish</span><span>Turn</span><span id="finishTurnArrow">➜</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Character;
