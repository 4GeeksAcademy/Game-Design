import React from "react";
import "./RoundIntroOverlay.css";

function HealthBar({ fighter }) {
  const maximum = Math.max(1, Number(fighter.maximumHealth) || 1);
  const health = Math.max(0, Number(fighter.health) || 0);
  const percent = Math.max(0, Math.min(100, (health / maximum) * 100));
  const level = percent <= 10 ? "critical" : percent <= 30 ? "danger" : percent <= 50 ? "warning" : "healthy";

  return (
    <div className={`round-intro__healthbar health-${level}`} role="img" aria-label={`${health} of ${maximum} health remaining`}>
      <div className="round-intro__healthbar-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

function FighterCard({ fighter, side, index }) {
  const isKO = Number(fighter.health) <= 0;
  return (
    <div className={`round-intro__fighter round-intro__fighter--${side} ${isKO ? "is-defeated" : "is-alive"}`} style={{ "--fighter-index": index }} key={fighter.id ?? fighter.name}>
      {fighter.image && <img src={fighter.image} alt={fighter.name ?? ""} />}
      <HealthBar fighter={fighter} />
      <span className="round-intro__name">{fighter.name}</span>
      <span className={`round-intro__status ${isKO ? "status-ko" : "status-alive"}`}>
        {isKO ? "K.O." : `HP ${Math.max(0, fighter.health)} / ${fighter.maximumHealth}`}
      </span>
    </div>
  );
}

export default function RoundIntroOverlay({
  roundNumber = 1,
  opponentTeam = [],
  playerTeam = [],
  isFadingOut = false,
}) {
  return (
    <div className={`round-intro ${isFadingOut ? "is-hiding" : "is-visible"}`} role="status" aria-live="polite" aria-hidden={isFadingOut}>
      <div className="round-intro__eyebrow">Wild Cards</div>
      <h1 className="round-intro__round">ROUND {roundNumber}</h1>
      <div className="round-intro__matchup">
        <div className="round-intro__team round-intro__team--cpu">
          <div className="round-intro__label">{opponentTeam.length > 1 ? "CPU TEAM" : "CPU OPPONENT"}</div>
          <div className="round-intro__fighters">
            {opponentTeam.map((fighter, index) => <FighterCard fighter={fighter} side="cpu" index={index} key={fighter.id ?? fighter.name} />)}
          </div>
        </div>
        <div className="round-intro__vs">VS</div>
        <div className="round-intro__team round-intro__team--player">
          <div className="round-intro__label">{playerTeam.length > 1 ? "PLAYER TEAM" : "PLAYER"}</div>
          <div className="round-intro__fighters">
            {playerTeam.map((fighter, index) => <FighterCard fighter={fighter} side="player" index={index} key={fighter.id ?? fighter.name} />)}
          </div>
        </div>
      </div>
      <div className="round-intro__footer">GET READY</div>
    </div>
  );
}
