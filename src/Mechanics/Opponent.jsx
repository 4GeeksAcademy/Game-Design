import React from "react";
import StatBar from "./StatBar.jsx";
import "./BattleUI.css";

function Opponent({ opponent, setOpponent }) {
  const healthPercentage =
    opponent.maximumHealth > 0
      ? Math.min(
          100,
          Math.max(0, (opponent.health / opponent.maximumHealth) * 100),
        )
      : 0;

  const manaPercentage =
    opponent.maximumMana > 0
      ? Math.min(
          100,
          Math.max(0, (opponent.mana / opponent.maximumMana) * 100),
        )
      : 0;

  return (
    <div id="opponentSection">
      <div id="opponent" className="battle-status-panel">
        <div id="opponentPortraitWrapper">
          <img
            id="opponentImage"
            src="https://placehold.co/300x400"
            alt={opponent.name}
          />

          <div id="opponentSideMeters">
            <div className="verticalMeterGroup">
              <div className="verticalMeter healthMeter" title="Health">
                <div
                  className="verticalMeterFill"
                  style={{ height: `${healthPercentage}%` }}
                />
                <span>H</span>
              </div>

              <strong className="verticalMeterValue">
                {opponent.health}/{opponent.maximumHealth}
              </strong>
              <small>Health</small>
            </div>

            <div className="verticalMeterGroup">
              <div className="verticalMeter manaMeter" title="Mana">
                <div
                  className="verticalMeterFill"
                  style={{ height: `${manaPercentage}%` }}
                />
                <span>M</span>
              </div>

              <strong className="verticalMeterValue">
                {opponent.mana}/{opponent.maximumMana}
              </strong>
              <small>Mana</small>
            </div>
          </div>
        </div>

        <div id="opponentInfo">
          <p id="opponentHeader">OPPONENT</p>

          <h2 id="opponentName">{opponent.name}</h2>

          <div id="opponentStats">
            <StatBar
              label="Defense"
              icon="🛡️"
              current={opponent.defense.amount}
              maximum={100}
              color="secondary"
            />

            <StatBar
              label="Agility"
              icon="⚡"
              current={opponent.agility}
              maximum={100}
              color="warning"
            />
          </div>

          <div id="opponentCompactStats">
            <div className="compactStat">
              <span>⏳ Cooldown</span>
              <strong>
                {opponent.cooldown ?? 0}/{opponent.maximumCooldown ?? 3}
              </strong>
            </div>

            <div className="compactStat">
              <span>🔄 Recovery</span>
              <strong>{opponent.recovery ?? 0}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Opponent;

