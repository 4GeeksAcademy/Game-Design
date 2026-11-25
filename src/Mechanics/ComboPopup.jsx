import React, { useEffect } from "react";
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


export function ComboBreakPopup({ combo }) {
  useEffect(() => {
    if (!combo) return undefined;
    const timer = window.setTimeout(() => combo.onDismiss?.(), 2300);
    return () => window.clearTimeout(timer);
  }, [combo]);

  if (!combo || combo.count < 3) return null;

  const count = combo.count;
  const tier = count >= 10
    ? { className: "combo-break-crazy", title: "CRAZY!!!", subtitle: "THAT WAS INSANE!" }
    : count >= 7
      ? { className: "combo-break-excellent", title: "EXCELLENT!", subtitle: "WHAT A PERFORMANCE!" }
      : count >= 5
        ? { className: "combo-break-good", title: "GOOD JOB!", subtitle: "NICE COMBO!" }
        : { className: "combo-break-disappointed", title: "DISAPPOINTING...", subtitle: "YOU HAD MORE IN YOU." };

  return (
    <div className="wild-combo-break-anchor" aria-live="assertive" aria-atomic="true">
      <div key={combo.id} className={`wild-combo-break-popup ${tier.className}`} role="status">
        <span className="wild-combo-break-eyebrow">COMBO LOST</span>
        <strong>{count} HIT COMBO</strong>
        <span className="wild-combo-break-rating">{tier.title}</span>
        <span className="wild-combo-break-subtitle">{tier.subtitle}</span>
        <i className="wild-combo-break-spark spark-a" />
        <i className="wild-combo-break-spark spark-b" />
      </div>
    </div>
  );
}
