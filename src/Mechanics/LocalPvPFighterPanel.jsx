import React from "react";
import StatBar from "./StatBar.jsx";
import "./BattleUI.css";

export default function LocalPvPFighterPanel({ fighter, side = "player" }) {
  if (!fighter) return null;
  const isPlayer = side === "player";
  const health = Math.max(0, fighter.health ?? 0);
  const mana = Math.max(0, fighter.mana ?? 0);
  const healthPct = fighter.maximumHealth > 0 ? Math.min(100, health / fighter.maximumHealth * 100) : 0;
  const manaPct = fighter.maximumMana > 0 ? Math.min(100, mana / fighter.maximumMana * 100) : 0;
  const hasStunnedAttacks = fighter.attacks?.some((attack) => (attack.stunned?.remainingRounds ?? 0) > 0);
  const panelId = isPlayer ? "character" : "opponent";
  const portraitId = isPlayer ? "characterPortraitWrapper" : "opponentPortraitWrapper";
  const imageId = isPlayer ? "characterImage" : "opponentImage";
  const nameId = isPlayer ? "characterName" : "opponentName";
  const statsId = isPlayer ? "characterStats" : "opponentStats";
  const compactId = isPlayer ? "characterCompactStats" : "opponentCompactStats";
  return (
    <section className={`local-pvp-fighter-status ${isPlayer ? "local-pvp-own" : "local-pvp-rival"}`}>
      <div id={panelId} className="battle-status-panel">
        <div id={portraitId} className={hasStunnedAttacks ? "fighter-stunned" : ""}>
          <img id={imageId} src={fighter.image} alt={fighter.name} />
          <div id={isPlayer ? "characterSideMeters" : "opponentSideMeters"}>
            <div className="verticalMeterGroup">
              <div className="verticalMeter healthMeter" title="Health">
                <div className="verticalMeterFill" style={{ height: `${healthPct}%` }} />
                <span>H</span>
              </div>
              <strong className="verticalMeterValue">{health}/{fighter.maximumHealth}</strong>
              <small>Health</small>
            </div>
            <div className="verticalMeterGroup">
              <div className="verticalMeter manaMeter" title="Mana">
                <div className="verticalMeterFill" style={{ height: `${manaPct}%` }} />
                <span>M</span>
              </div>
              <strong className="verticalMeterValue">{mana}/{fighter.maximumMana}</strong>
              <small>Mana</small>
            </div>
          </div>
        </div>
        <div id={isPlayer ? "characterInfo" : "opponentInfo"}>
          <p id={isPlayer ? "characterHeader" : "opponentHeader"}>{isPlayer ? "YOUR FIGHTER" : "OPPONENT"}</p>
          <h2 id={nameId}>{fighter.name}</h2>
          <div id={statsId}>
            <StatBar label="Defense" icon="🛡️" current={fighter.defense?.amount ?? fighter.defense ?? 0} maximum={100} color="secondary" />
            <StatBar label="Agility" icon="⚡" current={fighter.agility ?? 0} maximum={100} color="warning" />
          </div>
          <div id={compactId}>
            <div className="compactStat"><span>⏳ Cooldown</span><strong>{fighter.cooldown ?? 0}/{fighter.maximumCooldown ?? 3}</strong></div>
            <div className="compactStat"><span>🔄 Recovery</span><strong>{fighter.recovery ?? 0}</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}
