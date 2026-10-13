import React from "react";
import StatBar from "./StatBar.jsx";
import "./BattleUI.css";

function Character({ character, setCharacter, currentTurn, setCurrentTurn }) {
  const healthPercentage =
    character.maximumHealth > 0
      ? Math.min(
          100,
          Math.max(0, (character.health / character.maximumHealth) * 100),
        )
      : 0;

  return (
    <div id="characterSection">
      <div id="character" className="battle-status-panel">
        <div id="characterPortraitWrapper">
          <img
            id="characterImage"
            src="https://placehold.co/300x400"
            alt={character.name}
          />

          <div id="characterSideMeters">
            <div className="verticalMeterGroup">
              <div className="verticalMeter healthMeter" title="Health">
                <div
                  className="verticalMeterFill"
                  style={{
                    height: `${
                      character.maximumHealth > 0
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              (character.health / character.maximumHealth) *
                                100,
                            ),
                          )
                        : 0
                    }%`,
                  }}
                />
                <span>H</span>
              </div>
              <strong className="verticalMeterValue">
                {character.health}/{character.maximumHealth}
              </strong>
              <small>Health</small>
            </div>

            <div className="verticalMeterGroup">
              <div className="verticalMeter manaMeter" title="Mana">
                <div
                  className="verticalMeterFill"
                  style={{
                    height: `${
                      character.maximumMana > 0
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              (character.mana / character.maximumMana) * 100,
                            ),
                          )
                        : 0
                    }%`,
                  }}
                />
                <span>M</span>
              </div>
              <strong className="verticalMeterValue">
                {character.mana}/{character.maximumMana}
              </strong>
              <small>Mana</small>
            </div>
          </div>
        </div>

        <div id="characterInfo">
          <p id="characterHeader">YOUR CHARACTER</p>

          <h2 id="characterName">{character.name}</h2>

          <div id="characterStats">
           
            <StatBar
              label="Defense"
              icon="🛡️"
              current={character.defense.amount}
              maximum={100}
              color="secondary"
            />

            <StatBar
              label="Agility"
              icon="⚡"
              current={character.agility}
              maximum={100}
              color="warning"
            />
          </div>

          <div id="characterCompactStats">
            <div className="compactStat">
              <span>⏳ Cooldown</span>
              <strong>
                {character.cooldown ?? 0}/{character.maximumCooldown ?? 3}
              </strong>
            </div>

            <div className="compactStat">
              <span>🔄 Recovery</span>
              <strong>{character.recovery ?? 0}</strong>
            </div>
          </div>
        </div>
      </div>

      <div id="finishTurnArea">
        <button
          id="finishTurnButton"
          disabled={currentTurn !== "player"}
          onClick={() => {
            setCharacter({
              ...character,
              turnFinished: true,
            });

            setCurrentTurn("ai");
          }}
        >
          <span>Finish</span>
          <span>Turn</span>
          <span id="finishTurnArrow">➜</span>
        </button>
      </div>
    </div>
  );
}

export default Character;
