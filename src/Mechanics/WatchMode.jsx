
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { roster } from "./Main Page/CharacterSelection";
import { getUnlockedCharacters } from "./Currency";
import {
  createWatchBattle,
  createWatchTeamBattle,
  nextWatchAction,
} from "./WatchBattle";

import "./WatchMode.css";

const MAX_ROUNDS = 100;

const SPEEDS = [
  { label: "0.5×", delay: 2000 },
  { label: "1×", delay: 1400 },
  { label: "2×", delay: 150 },
];

const PLAYER_COLOR = "#13D5FF";
const CPU_COLOR = "#FF3159";

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

function getFighterImage(fighter) {
  if (fighter?.image) return fighter.image;

  const rosterFighter = roster.find(
    (item) =>
      item.id === fighter?.rosterId ||
      getFighterName(item) === getFighterName(fighter),
  );

  return rosterFighter?.image ?? "";
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

function FighterPanel({ fighter, color, side, compact = false }) {
  if (!fighter) return null;

  const stats = getFighterStats(fighter);
  const name = getFighterName(fighter);

  return (
    <div
      className={`watch-fighter watch-fighter-${side}`}
      style={{
        minWidth: 0,
        opacity: stats.health <= 0 ? 0.45 : 1,
        filter: stats.health <= 0 ? "grayscale(1)" : "none",
        padding: compact ? "10px" : undefined,
      }}
    >
      <div
        className="watch-fighter-image"
        style={compact ? { maxWidth: "110px", margin: "0 auto" } : undefined}
      >
        {getFighterImage(fighter) && (
          <img src={getFighterImage(fighter)} alt={name} />
        )}

        <div
          className="watch-fighter-glow"
          style={{ backgroundColor: color }}
        />
      </div>

      <h2 style={{ color, fontSize: compact ? "1rem" : undefined }}>
        {name}
        {stats.health <= 0 ? " — KO" : ""}
      </h2>

      <HealthBar
        label="HEALTH"
        value={Math.max(0, stats.health ?? 0)}
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
  const fighters = battle.fighters.map((fighter) => ({
    ...fighter,
    defense:
      typeof fighter.defense === "object" && fighter.defense
        ? { ...fighter.defense }
        : fighter.defense,
    attacks: fighter.attacks.map((attack) => ({ ...attack })),
  }));

  const fightersById = new Map(
    fighters.map((fighter) => [fighter.id, fighter]),
  );

  return {
    ...battle,
    fighters,
    // Reconnect team members to the copied fighters so the UI
    // always displays the same current health and mana values.
    teams: battle.teams?.map((team) =>
      team.map((fighter) => fightersById.get(fighter.id)),
    ),
    log: [...battle.log],
    currentAction: battle.currentAction
      ? { ...battle.currentAction }
      : null,
  };
}

function FighterSelect({
  id,
  label,
  value,
  fighters,
  onChange,
  excludedIds = [],
}) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {fighters.map((fighter) => (
          <option
            key={fighter.id}
            value={fighter.id}
            disabled={excludedIds.includes(fighter.id)}
          >
            {getFighterName(fighter)}
          </option>
        ))}
      </select>
    </>
  );
}

function DifficultySelect({ id, value, onChange }) {
  return (
    <>
      <label htmlFor={id}>Team AI difficulty</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option>Easy</option>
        <option>Normal</option>
        <option>Hard</option>
      </select>
    </>
  );
}

export default function WatchMode() {
  const navigate = useNavigate();

  const [availableFighters] = useState(getInitialFighters);

  const [battleMode, setBattleMode] = useState("1v1");

  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");

  const [teamOneIds, setTeamOneIds] = useState(["", ""]);
  const [teamTwoIds, setTeamTwoIds] = useState(["", ""]);

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

  const selectedTeamOne = teamOneIds.map(
    (id) => availableFighters.find((fighter) => fighter.id === id) ?? null,
  );

  const selectedTeamTwo = teamTwoIds.map(
    (id) => availableFighters.find((fighter) => fighter.id === id) ?? null,
  );

  useEffect(() => {
    if (availableFighters.length === 0) return;

    const ids = availableFighters.map((fighter) => fighter.id);

    if (!firstId || !ids.includes(firstId)) {
      setFirstId(ids[0] ?? "");
    }

    if (!secondId || !ids.includes(secondId)) {
      setSecondId(ids.find((id) => id !== firstId) ?? ids[0] ?? "");
    }

    setTeamOneIds((current) =>
      current.map((id, index) =>
        id && ids.includes(id) ? id : ids[index] ?? "",
      ),
    );

    setTeamTwoIds((current) =>
      current.map((id, index) =>
        id && ids.includes(id) ? id : ids[index + 2] ?? "",
      ),
    );
  }, [availableFighters, firstId, secondId]);

  useEffect(() => {
    if (!playing || !battleRef.current) return;

    const timer = setTimeout(() => {
      const updatedBattle = nextWatchAction(battleRef.current);

      battleRef.current = updatedBattle;
      setBattleView(createSnapshot(updatedBattle));

      if (updatedBattle.finished) {
        setPlaying(false);
      }
    }, SPEEDS[speed].delay);

    return () => clearTimeout(timer);
  }, [playing, speed, battleView]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battleView?.log?.length]);

  function startBattle() {
    let battle;

    if (battleMode === "1v1") {
      if (!firstFighter || !secondFighter) return;
      if (firstFighter.id === secondFighter.id) return;

      battle = createWatchBattle(
        {
          ...getFighterStats(firstFighter),
          image: firstFighter.image,
          rosterId: firstFighter.id,
        },
        {
          ...getFighterStats(secondFighter),
          image: secondFighter.image,
          rosterId: secondFighter.id,
        },
        firstDifficulty,
        secondDifficulty,
      );
    } else {
      if (
        selectedTeamOne.some((fighter) => !fighter) ||
        selectedTeamTwo.some((fighter) => !fighter)
      ) {
        return;
      }

      const allSelectedIds = [...teamOneIds, ...teamTwoIds];

      // Avoid duplicate fighters in the selected 2v2 matchup.
      if (new Set(allSelectedIds).size !== 4) return;

      const toBattleFighter = (fighter) => ({
        ...getFighterStats(fighter),
        image: fighter.image,
        rosterId: fighter.id,
      });

      battle = createWatchTeamBattle(
        selectedTeamOne.map(toBattleFighter),
        selectedTeamTwo.map(toBattleFighter),
        firstDifficulty,
        secondDifficulty,
      );
    }

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

  function updateTeamSelection(teamNumber, fighterIndex, fighterId) {
    const setter = teamNumber === 1 ? setTeamOneIds : setTeamTwoIds;

    setter((current) =>
      current.map((id, index) =>
        index === fighterIndex ? fighterId : id,
      ),
    );
  }

  const isTeamBattle = battleView?.mode === "2v2";

  const fightersInBattle = battleView?.fighters ?? [
    firstFighter
      ? {
          ...getFighterStats(firstFighter),
          image: firstFighter.image,
          rosterId: firstFighter.id,
        }
      : null,
    secondFighter
      ? {
          ...getFighterStats(secondFighter),
          image: secondFighter.image,
          rosterId: secondFighter.id,
        }
      : null,
  ];

  const fighterOne = fightersInBattle[0];
  const fighterTwo = fightersInBattle[1];
  const action = battleView?.currentAction;

  const displayedTeamOne = isTeamBattle
    ? battleView.teams[0]
    : [fighterOne];

  const displayedTeamTwo = isTeamBattle
    ? battleView.teams[1]
    : [fighterTwo];

  const duplicateTeamSelection =
    new Set([...teamOneIds, ...teamTwoIds]).size !== 4;

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
          <h2>Choose your battle</h2>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "24px",
            }}
          >
            <button
              type="button"
              className={
                battleMode === "1v1"
                  ? "watch-primary-button"
                  : "watch-secondary-button"
              }
              onClick={() => setBattleMode("1v1")}
            >
              1v1 Battle
            </button>

            <button
              type="button"
              className={
                battleMode === "2v2"
                  ? "watch-primary-button"
                  : "watch-secondary-button"
              }
              onClick={() => setBattleMode("2v2")}
            >
              2v2 Team Battle
            </button>
          </div>

          {battleMode === "1v1" ? (
            <>
              <h3>Choose your fighters</h3>

              <div className="watch-setup-grid">
                <div className="watch-setup-side">
                  <FighterSelect
                    id="watch-first"
                    label="Fighter 1"
                    value={firstId}
                    fighters={availableFighters}
                    onChange={setFirstId}
                  />

                  <DifficultySelect
                    id="watch-first-difficulty"
                    value={firstDifficulty}
                    onChange={setFirstDifficulty}
                  />
                </div>

                <div className="watch-vs">VS</div>

                <div className="watch-setup-side">
                  <FighterSelect
                    id="watch-second"
                    label="Fighter 2"
                    value={secondId}
                    fighters={availableFighters}
                    onChange={setSecondId}
                  />

                  <DifficultySelect
                    id="watch-second-difficulty"
                    value={secondDifficulty}
                    onChange={setSecondDifficulty}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <h3>Team 1 — Player Side</h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "18px",
                  marginBottom: "24px",
                }}
              >
                {[0, 1].map((index) => (
                  <div className="watch-setup-side" key={`team1-${index}`}>
                    <FighterSelect
                      id={`watch-team-one-${index}`}
                      label={`Team 1 · Fighter ${index + 1}`}
                      value={teamOneIds[index]}
                      fighters={availableFighters}
                      excludedIds={teamOneIds.filter(
                        (id, otherIndex) => otherIndex !== index,
                      ).concat(teamTwoIds.filter(Boolean))}
                      onChange={(id) =>
                        updateTeamSelection(1, index, id)
                      }
                    />
                  </div>
                ))}
              </div>

              <h3>Team 2 — Opponent Side</h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "18px",
                  marginBottom: "24px",
                }}
              >
                {[0, 1].map((index) => (
                  <div className="watch-setup-side" key={`team2-${index}`}>
                    <FighterSelect
                      id={`watch-team-two-${index}`}
                      label={`Team 2 · Fighter ${index + 1}`}
                      value={teamTwoIds[index]}
                      fighters={availableFighters}
                      excludedIds={teamTwoIds.filter(
                        (id, otherIndex) => otherIndex !== index,
                      ).concat(teamOneIds.filter(Boolean))}
                      onChange={(id) =>
                        updateTeamSelection(2, index, id)
                      }
                    />
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "18px",
                }}
              >
                <div className="watch-setup-side">
                  <DifficultySelect
                    id="watch-team-one-difficulty"
                    value={firstDifficulty}
                    onChange={setFirstDifficulty}
                  />
                </div>

                <div className="watch-setup-side">
                  <DifficultySelect
                    id="watch-team-two-difficulty"
                    value={secondDifficulty}
                    onChange={setSecondDifficulty}
                  />
                </div>
              </div>

              <p style={{ textAlign: "center", marginTop: "12px" }}>
                Each team has its own AI difficulty setting.
              </p>

              {duplicateTeamSelection && (
                <p className="watch-error">
                  Choose four different fighters for a 2v2 battle.
                </p>
              )}
            </>
          )}

          {availableFighters.length <
            (battleMode === "2v2" ? 4 : 2) && (
            <p className="watch-error">
              You need at least {battleMode === "2v2" ? "four" : "two"}{" "}
              unlocked fighters to start this battle.
            </p>
          )}

          <button
            className="watch-primary-button"
            disabled={
              availableFighters.length <
                (battleMode === "2v2" ? 4 : 2) ||
              (battleMode === "1v1"
                ? !firstId ||
                  !secondId ||
                  firstId === secondId
                : duplicateTeamSelection ||
                  [...teamOneIds, ...teamTwoIds].some((id) => !id))
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
              ROUND {Math.min(battleView.round, MAX_ROUNDS)}
              {isTeamBattle
                ? ` · ${battleView.teamTurn === 0 ? "TEAM 1 TURN" : "TEAM 2 TURN"}`
                : ""}
            </div>

            {isTeamBattle ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(110px, 0.5fr) minmax(0, 1fr)",
                  gap: "12px",
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "10px",
                  }}
                >
                  {displayedTeamOne.map((fighter) => (
                    <FighterPanel
                      key={fighter.id}
                      fighter={fighter}
                      color={PLAYER_COLOR}
                      side="left"
                      compact
                    />
                  ))}
                </div>

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
                        ? action.action === "skipped"
                          ? `${action.attackerName} SKIPS`
                          : `${action.attackerName}: ${action.attackName}`
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
                            : action.action === "skipped"
                              ? "NO UNIQUE TARGET"
                              : `${action.damage} DAMAGE`}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "10px",
                  }}
                >
                  {displayedTeamTwo.map((fighter) => (
                    <FighterPanel
                      key={fighter.id}
                      fighter={fighter}
                      color={CPU_COLOR}
                      side="right"
                      compact
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="watch-arena-fighters">
                <FighterPanel
                  fighter={fighterOne}
                  color={PLAYER_COLOR}
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
                  color={CPU_COLOR}
                  side="right"
                />
              </div>
            )}
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
                    {entry.action === "skipped" ? (
                      <> had no unique target and skipped their turn.</>
                    ) : (
                      <>
                        {" used "}
                        {entry.attackName}
                        {" against "}
                        <strong>{entry.defenderName}</strong>
                        {" — "}
                        {entry.action}
                        {`, ${entry.damage} damage`}
                      </>
                    )}
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
