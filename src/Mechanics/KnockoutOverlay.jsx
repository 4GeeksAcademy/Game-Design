import React from "react";
import "./KnockoutOverlay.css";

export default function KnockoutOverlay({ fighter, defeatedTeam, isFadingOut = false }) {
  if (!fighter) return null;
  return (
    <div className={`wild-ko-overlay ko-${defeatedTeam} ${isFadingOut ? "is-fading-out" : ""}`} role="alert" aria-live="assertive">
      <div className="wild-ko-flash" />
      <div className="wild-ko-content">
        <p className="wild-ko-eyebrow">FIGHTER DEFEATED</p>
        {fighter.image && <img className="wild-ko-portrait" src={fighter.image} alt={fighter.name ?? ""} />}
        <h1 className="wild-ko-title">K.O.!</h1>
        <p className="wild-ko-name">{fighter.name}</p>
        <p className="wild-ko-subtitle">{defeatedTeam === "opponent" ? "OPPONENT DOWN" : "PLAYER DOWN"}</p>
      </div>
    </div>
  );
}
