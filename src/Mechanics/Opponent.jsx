import React from "react";
import { getModifiedCharacterStat } from "./Modifiers.js";
import "./BattleUI.css";

function ResourceBar({ label, value, maximum, type }) {
  const max = Math.max(1, Number(maximum) || 1);
  const current = Math.max(0, Number(value) || 0);
  const percent = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className={`solo-resource-row solo-resource-${type}`}>
      <span>{label}</span>
      <div className="solo-resource-track"><div className="solo-resource-fill" style={{ width: `${percent}%` }} /></div>
      <b>{current}/{max}</b>
    </div>
  );
}
function Segments({ label, value, maximum, type }) {
  const max = Math.min(10, Math.max(0, Math.floor(Number(maximum) || 0)));
  const current = Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
  return (
    <div className={`solo-segment-row ${type}`}>
      <span>{label}</span><div className="solo-segments">{Array.from({ length: max }, (_, i) => <i key={i} className={i < current ? "filled" : ""} />)}{!max && <small>—</small>}</div><b>{current}/{max}</b>
    </div>
  );
}
function FighterInfo({ fighter }) {
  const slotLimit = Number(fighter.slot) || fighter.attacks?.length || 0;
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
        <div><span>COOLDOWN</span><b>{getModifiedCharacterStat(fighter, "cooldown")}/{getModifiedCharacterStat(fighter, "maximumCooldown") || 3}</b></div>
        <div><span>RECOVERY</span><b>{getModifiedCharacterStat(fighter, "recovery")}</b></div>
      </div>
      {(fighter.activeModifiers ?? []).length > 0 && <div className="solo-tooltip-effects"><strong>ACTIVE EFFECTS</strong>{fighter.activeModifiers.map((effect, i) => <span key={effect.id ?? i}>{effect.sourceAttackName ?? effect.id ?? "Active effect"}{effect.remainingDuration != null ? ` · ${effect.remainingDuration} turns` : ""}</span>)}</div>}
      <small>Hover or focus to inspect current modified stats</small>
    </div>
  );
}
function Opponent({ opponent, setOpponent, combatEffect = null, isAttacking = false }) {
  const stunnedAttackCount = opponent.attacks.filter((attack) => (attack.stunned?.remainingRounds ?? 0) > 0).length;
  const hasStun = stunnedAttackCount > 0;
  return (
    <div id="opponentSection" className={`solo-fighter-section opponent-fighter-section ${isAttacking ? "opponent-is-attacking" : ""}`}>
      <div id="opponent" className="solo-fighter-unit battle-status-panel">
        <div className="solo-fighter-hud">
          <div className="solo-fighter-name-row"><h2 id="opponentName">{opponent.name}</h2><span>CPU</span></div>
          <ResourceBar label="HP" value={opponent.health} maximum={opponent.maximumHealth} type="health" />
          <ResourceBar label="MP" value={opponent.mana} maximum={opponent.maximumMana} type="mana" />
          <div className="solo-segment-group">
            <Segments label="CD" value={getModifiedCharacterStat(opponent, "cooldown")} maximum={getModifiedCharacterStat(opponent, "maximumCooldown") || 3} type="cooldown" />
            <Segments label="REC" value={getModifiedCharacterStat(opponent, "recovery")} maximum={10} type="recovery" />
          </div>
        </div>
        <div role="group" tabIndex={0} className={`solo-fighter-art ${combatEffect?.type ? `combat-effect-${combatEffect.type}` : ""}`} aria-label={`${opponent.name} fighter artwork. Hover or focus to view stats.`}>
          <div className={`solo-portrait-wrapper ${hasStun ? "fighter-stunned" : ""}`}>
            <img id="opponentImage" src={opponent.image} alt={opponent.name} />
            {hasStun && <span className="solo-stun-status"><strong>STUNNED!</strong><small key={stunnedAttackCount}>{stunnedAttackCount} ATTACK{stunnedAttackCount === 1 ? "" : "S"} DISABLED</small></span>}
          </div>
          {combatEffect?.target === "opponent" && (
            <div key={combatEffect.id} className={`solo-impact-overlay impact-${combatEffect.type}`}>
              {combatEffect.damage > 0 && <strong className={`solo-damage-number damage-tier-${combatEffect.tier}`}>{combatEffect.tier === "light" ? `+${combatEffect.damage}` : combatEffect.tier === "effective" ? `!${combatEffect.damage}` : combatEffect.tier === "heavy" ? `!!${combatEffect.damage}` : `FATAL ${combatEffect.damage}`}</strong>}
              {combatEffect.message && <span className={combatEffect.message === "STUNNED!" ? "solo-stunned-callout" : ""}>{combatEffect.message}</span>}
              {(combatEffect.effects ?? []).map((effect, index) => <b key={index} className={`solo-effect-label effect-${effect.stat}`} style={{ animationDelay: `${index * 650}ms` }}>{effect.label}</b>)}
            </div>
          )}
          <FighterInfo fighter={opponent} />
        </div>
      </div>
    </div>
  );
}
export default Opponent;
