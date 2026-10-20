
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { roster } from "./Main Page/CharacterSelection";
import { getUnlockedCharacters } from "./Currency";
import {
  createWatchBattle,
  nextWatchAction,
} from "./WatchBattle";

import "./WatchMode.css";

const SPEEDS = [
  { label: "0.5×", delay: 1600 },
  { label: "1×", delay: 900 },
  { label: "2×", delay: 450 },
];

function getFighterName(fighter) {
  return fighter?.data?.name ?? fighter?.name ?? fighter?.id ?? "Fighter";
}

function getFighterStats(fighter) {
  return fighter?.data ?? fighter;
}

function getFighterId(fighter) {
  return fighter?.id;
}

function getInitialFighters() {
  const unlockedIds = getUnlockedCharacters();

  return roster.filter((fighter) =>
    unlockedIds.includes(getFighterId(fighter)),
  );
}

function HealthBar({ label, value, maximum, color }) {
  const percentage =
    maximum > 0
      ? Math.max(0, Math.min(100, (value / maximum) * 100))
      : 0;

  return (
    <div className="watch-meter">
      <div className="watch-meter-label">
        <span>{label}</span>
        <span>
          {Math.ceil(value)} / {maximum}
        </span>
      </div>

      <div className="watch-meter-track">
        <div
          className="watch-meter-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function FighterPanel({ fighter, color, side }) {
  if (!fighter) return null;

  const stats = getFighterStats(fighter);
  const name = getFighterName(fighter);

  return (
    <div className={`watch-fighter watch-fighter-${side}`}>
      <div className="watch-fighter-image">
        <img src={fighter.image} alt={name} />

        <div
          className="watch-fighter-glow"
          style={{ backgroundColor: color }}
        />
      </div>

      <h2 style={{ color }}>{name}</h2>

      <HealthBar
        label="HEALTH"
        value={stats.health ?? 0}
        maximum={stats.maximumHealth ?? stats.health ?? 1}
        color={color}
      />

      <HealthBar
        label="MANA"
        value={stats.mana ?? 0}
        maximum={stats.maximumMana ?? stats.mana ?? 1}
        color="#8D75FF"
      />

      <div className="watch-fighter-stats">
        <span>AGI: {stats.agility ?? 0}</span>
        <span>
          DEF:{" "}
          {typeof stats.defense === "object"
            ? stats.defense?.amount ?? 0
            : stats.defense ?? 0}
        </span>
      </div>
    </div>
  );
}

function createSnapshot(battle) {
  return {
    ...battle,
    fighters: battle.fighters.map((fighter) => ({
      ...fighter,
      defense:
        typeof fighter.defense === "object" && fighter.defense
          ? { ...fighter.defense }
          : fighter.defense,
      attacks: fighter.attacks.map((attack) => ({ ...attack })),
    })),
    log: [...battle.log],
    currentAction: battle.currentAction
      ? { ...battle.currentAction }
      : null,
  };
}

export default function WatchMode() {
  const navigate = useNavigate();

  const [availableFighters] = useState(getInitialFighters);
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [firstDifficulty, setFirstDifficulty] = useState("Normal");
  const [secondDifficulty, setSecondDifficulty] = useState("Normal");
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [battleView, setBattleView] = useState(null);

  const battleRef = useRef(null);
  const logRef = useRef(null);

  const firstFighter =
    availableFighters.find((fighter) => fighter.id === firstId) ?? null;

  const secondFighter =
    availableFighters.find((fighter) => fighter.id === secondId) ?? null;

  useEffect(() => {
    if (!firstId && availableFighters.length > 0) {
      setFirstId(availableFighters[0].id);
    }

    if (!secondId && availableFighters.length > 1) {
      setSecondId(availableFighters[1].id);
    }
  }, [availableFighters, firstId, secondId]);

  useEffect(() => {
    if (!playing || !battleRef.current) return;

    const delay = SPEEDS[speed].delay;

    const timer = setTimeout(() => {
      const updatedBattle = nextWatchAction(battleRef.current);

      battleRef.current = updatedBattle;
      setBattleView(createSnapshot(updatedBattle));

      if (updatedBattle.finished) {
        setPlaying(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [playing, speed, battleView]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battleView?.log?.length]);

  function startBattle() {
    if (!firstFighter || !secondFighter) return;
    if (firstFighter.id === secondFighter.id) return;

    const battle = createWatchBattle(
      getFighterStats(firstFighter),
      getFighterStats(secondFighter),
      firstDifficulty,
      secondDifficulty,
    );

    battleRef.current = battle;
    setBattleView(createSnapshot(battle));
    setPlaying(true);
  }

  function pauseBattle() {
    setPlaying(false);
  }

  function resumeBattle() {
    if (battleRef.current && !battleRef.current.finished) {
      setPlaying(true);
    }
  }

  function resetBattle() {
    setPlaying(false);
    battleRef.current = null;
    setBattleView(null);
  }

  const fightersInBattle = battleView?.fighters ?? [
    firstFighter ? getFighterStats(firstFighter) : null,
    secondFighter ? getFighterStats(secondFighter) : null,
  ];

  const fighterOne = fightersInBattle[0];
  const fighterTwo = fightersInBattle[1];
  const action = battleView?.currentAction;

  return (
    <main className="watch-page">
      <header className="watch-header">
        <button
          className="watch-back-button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <div>
          <p className="watch-eyebrow">ARCADE COMBAT SIMULATOR</p>
          <h1>WATCH MODE</h1>
          <p>Let the fighters settle it in the arena.</p>
        </div>
      </header>

      {!battleView && (
        <section className="watch-setup">
          <h2>Choose your fighters</h2>

          <div className="watch-setup-grid">
            <div className="watch-setup-side">
              <label htmlFor="watch-first">Fighter 1</label>
              <select
                id="watch-first"
                value={firstId}
                onChange={(event) => setFirstId(event.target.value)}
              >
                {availableFighters.map((fighter) => (
                  <option key={fighter.id} value={fighter.id}>
                    {getFighterName(fighter)}
                  </option>
                ))}
              </select>

              <label htmlFor="watch-first-difficulty">Difficulty</label>
              <select
                id="watch-first-difficulty"
                value={firstDifficulty}
                onChange={(event) =>
                  setFirstDifficulty(event.target.value)
                }
              >
                <option>Easy</option>
                <option>Normal</option>
                <option>Hard</option>
              </select>
            </div>

            <div className="watch-vs">VS</div>

            <div className="watch-setup-side">
              <label htmlFor="watch-second">Fighter 2</label>
              <select
                id="watch-second"
                value={secondId}
                onChange={(event) => setSecondId(event.target.value)}
              >
                {availableFighters.map((fighter) => (
                  <option key={fighter.id} value={fighter.id}>
                    {getFighterName(fighter)}
                  </option>
                ))}
              </select>

              <label htmlFor="watch-second-difficulty">Difficulty</label>
              <select
                id="watch-second-difficulty"
                value={secondDifficulty}
                onChange={(event) =>
                  setSecondDifficulty(event.target.value)
                }
              >
                <option>Easy</option>
                <option>Normal</option>
                <option>Hard</option>
              </select>
            </div>
          </div>

          {availableFighters.length < 2 && (
            <p className="watch-error">
              You need at least two unlocked fighters to start a battle.
            </p>
          )}

          <button
            className="watch-primary-button"
            disabled={
              availableFighters.length < 2 ||
              !firstId ||
              !secondId ||
              firstId === secondId
            }
            onClick={startBattle}
          >
            Start Battle
          </button>
        </section>
      )}

      {battleView && (
        <>
          <section className="watch-arena">
            <div className="watch-round">
              ROUND {Math.min(battleView.round, 100)}
            </div>

            <div className="watch-arena-fighters">
              <FighterPanel
                fighter={fighterOne}
                color="#13D5FF"
                side="left"
              />

              <div className="watch-arena-center">
                <span className="watch-vs-large">VS</span>

                <div
                  className={`watch-action-banner ${
                    action ? `watch-action-${action.action}` : ""
                  }`}
                  key={
                    action
                      ? `${action.round}-${battleView.log.length}`
                      : "ready"
                  }
                >
                  {battleView.finished
                    ? battleView.winner
                      ? `${battleView.winner} WINS!`
                      : "DRAW!"
                    : action
                      ? `${action.attackerName}: ${action.attackName}`
                      : "THE FIGHT BEGINS"}
                </div>

                {action && (
                  <p className="watch-action-result">
                    {action.action === "evade"
                      ? "EVADED!"
                      : action.action === "defend"
                        ? `BLOCKED · ${action.damage} DAMAGE`
                        : action.action === "take damage"
                          ? `HIT! · ${action.damage} DAMAGE`
                          : `${action.damage} DAMAGE`}
                  </p>
                )}
              </div>

              <FighterPanel
                fighter={fighterTwo}
                color="#FF3159"
                side="right"
              />
            </div>
          </section>

          <section className="watch-playback">
            <div className="watch-playback-buttons">
              {!battleView.finished && (
                <button
                  className="watch-primary-button"
                  onClick={playing ? pauseBattle : resumeBattle}
                >
                  {playing ? "Ⅱ Pause" : "▶ Resume"}
                </button>
              )}

              <button
                className="watch-secondary-button"
                onClick={resetBattle}
              >
                ↻ New Battle
              </button>
            </div>

            <div className="watch-speed-controls">
              <span>Playback speed</span>
              {SPEEDS.map((option, index) => (
                <button
                  key={option.label}
                  className={
                    speed === index
                      ? "watch-speed-button active"
                      : "watch-speed-button"
                  }
                  onClick={() => setSpeed(index)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="watch-combat-log">
            <h2>Combat Log</h2>

            <div className="watch-log-list" ref={logRef}>
              {battleView.log.map((entry, index) => (
                <div className="watch-log-entry" key={index}>
                  <span className="watch-log-round">
                    R{entry.round}
                  </span>

                  <span>
                    <strong>{entry.attackerName}</strong>
                    {" used "}
                    {entry.attackName}
                    {" — "}
                    {entry.action === "evade"
                      ? "evaded"
                      : entry.action === "defend"
                        ? "defended"
                        : entry.action}
                    {`, ${entry.damage} damage`}
                  </span>
                </div>
              ))}

              {battleView.log.length === 0 && (
                <p>The first attack is coming...</p>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
