
import React from "react";

function StatBar({ label, current, maximum, color, icon }) {
  const percentage =
    maximum > 0
      ? Math.min(100, Math.max(0, (current / maximum) * 100))
      : 0;

  return (
    <div className="statBar">
      <div className="statBarHeader">
        <span>
          {icon} {label}
        </span>

        <span>
          {current} / {maximum}
        </span>
      </div>

      <div
        className="progress statProgress"
        role="progressbar"
        aria-label={label}
        aria-valuenow={percentage}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          className={`progress-bar bg-${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default StatBar;