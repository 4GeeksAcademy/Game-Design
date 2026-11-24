import React from "react";
import "./ComboPopup.css";

export default function ComboPopup({ combo }) {
  if (!combo || combo.count < 3) return null;

  const stage = combo.stage >= 10 ? 10 : combo.stage;
  return (
    <div className="wild-combo-anchor" aria-live="polite" aria-atomic="true">
      <div
        key={stage}
        className={`wild-combo-popup combo-stage-${stage}`}
        role="status"
      >
        <span className="wild-combo-eyebrow">COMBO ACTIVATED</span>
        <strong>{combo.count} HIT COMBO</strong>
        <span className="wild-combo-subtitle">
          {stage === 10 ? "MAXIMUM MOMENTUM" : "KEEP THE PRESSURE ON"}
        </span>
        <i className="wild-combo-spark wild-combo-spark-one" />
        <i className="wild-combo-spark wild-combo-spark-two" />
      </div>
    </div>
  );
}
