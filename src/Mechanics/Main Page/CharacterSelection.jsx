import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import mina from "../All_Character_Stats/Mina_AshidoStats.js";
import minaArena from "../../assets/img/MinaAshidoArena.jpg";
import rockLee from "../All_Character_Stats/Rock_LeeStats.js";
import RockLeeArena from "../../assets/img/RockLeeArena.jpg";
import Usopp from "../All_Character_Stats/UsoppStats.js";
import UsoppArenaImage from "../../assets/img/UsoppArena.png";
import "./CharacterSelection.css";


const roster = [
  {
    id: "mina",
    image: minaArena,
    data: mina,
    color: "mina",
    description: "THE ACID FIGHTER",
  },
  {
    id: "rockLee",
    image: RockLeeArena,
    data: rockLee,
    color: "lee",
    description: "THE TAIJUTSU SPECIALIST",
  },
  {
    id: "usopp",
    image: UsoppArenaImage,
    data: Usopp,
    color: "usopp",
    description: "SNIPER KING",
  },
];

function CharacterSelection() {
  const navigate = useNavigate();
  const location = useLocation();

  const teamSize = location.state?.teamSize ?? "1v1";
  const difficulty = location.state?.difficulty ?? "Normal";

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cpuIndex, setCpuIndex] = useState(null);
  const [phase, setPhase] = useState("player");

  const selectedFighter = roster[selectedIndex];
  const cpuFighter = cpuIndex === null ? null : roster[cpuIndex];

  const changeFighter = (direction) => {
    if (phase !== "player") return;

    setSelectedIndex(
      (current) => (current + direction + roster.length) % roster.length,
    );
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (phase !== "player") return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        changeFighter(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        changeFighter(1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        confirmSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [phase, selectedIndex]);

  const confirmSelection = () => {
    if (phase !== "player") return;

    // Choose an opponent different from the player's fighter.
    const availableOpponents = roster
      .map((fighter, index) => ({ fighter, index }))
      .filter(({ fighter }) => fighter.id !== selectedFighter.id);

    const opponent =
      availableOpponents[Math.floor(Math.random() * availableOpponents.length)];

    setCpuIndex((selectedIndex + 1) % roster.length);
    setPhase("cpu");

    // Save the final choice for the CPU selection animation.
    setPendingOpponent(opponent.index);
  };

  const [pendingOpponent, setPendingOpponent] = useState(null);

  useEffect(() => {
    if (phase !== "cpu" || pendingOpponent === null) return;

    let animationStep = 0;

    // Alternate the CPU cursor before it locks onto its opponent.
    const animation = setInterval(() => {
      animationStep += 1;

      if (animationStep >= 6) {
        clearInterval(animation);
        setCpuIndex(pendingOpponent);
        setPhase("ready");
        return;
      }

      setCpuIndex((current) => (current === 0 ? 1 : 0));
    }, 350);

    return () => clearInterval(animation);
  }, [phase, pendingOpponent]);

  const startBattle = () => {
    if (phase !== "ready" || cpuIndex === null) return;

    navigate("/battle", {
      state: {
        playerId: selectedFighter.id,
        opponentId: roster[cpuIndex].id,
        teamSize,
        difficulty,
      },
    });
  };

  const FighterStats = ({ fighter }) => {
    const stats = fighter.data;

    const statBars = [
      {
        name: "HEALTH",
        value: stats.health,
        maximum: 300,
        color: "health",
      },
      {
        name: "MANA",
        value: stats.maximumMana,
        maximum: 150,
        color: "mana",
      },
      {
        name: "DEFENSE",
        value: stats.defense.amount,
        maximum: 150,
        color: "defense",
      },
      {
        name: "AGILITY",
        value: stats.agility,
        maximum: 150,
        color: "agility",
      },
    ];

    return (
      <div className={`roster-fighter-info ${fighter.color}`}>
        <div className="roster-fighter-layout">
          <div className="roster-fighter-portrait">
            <img src={fighter.image} alt={stats.name} />
          </div>

          <div className="roster-fighter-details">
            <p className="roster-fighter-description">{fighter.description}</p>

            <h2>{stats.name}</h2>

            {/* Keep your existing roster-stat-list and roster-moves here */}
          </div>
        </div>

        <div className="roster-stat-list">
          {statBars.map((stat) => {
            const percentage = Math.min(
              100,
              Math.max(0, (stat.value / stat.maximum) * 100),
            );

            return (
              <div className="roster-stat" key={stat.name}>
                <div className="roster-stat-heading">
                  <span>{stat.name}</span>
                  <strong>
                    {stat.value}/{stat.maximum}
                  </strong>
                </div>

                <div
                  className={`roster-stat-track ${stat.color}`}
                  role="progressbar"
                  aria-label={stat.name}
                  aria-valuenow={stat.value}
                  aria-valuemin={0}
                  aria-valuemax={stat.maximum}
                >
                  <div
                    className="roster-stat-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="roster-moves">
          <p>SPECIAL MOVES</p>
          {stats.attacks.map((attack) => (
            <span key={attack.name}>{attack.name}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="character-select-screen">
      <header className="select-header">
        <button
          className="select-back-button"
          onClick={() => navigate("/")}
          disabled={phase === "cpu"}
        >
          ← MAIN MENU
        </button>

        <div className="select-match-info">
          <span>{teamSize} MATCH</span>
          <span>AI: {difficulty.toUpperCase()}</span>
        </div>
      </header>

      <section className="select-heading">
        <p className="select-eyebrow">INSERT COIN · CHOOSE YOUR FIGHTER</p>
        <h1>SELECT YOUR FIGHTER</h1>
        <p>Player 1, choose your fighter. The CPU will choose its opponent.</p>
      </section>

      <section className="versus-selection">
        <section className="roster-side player-side">
          <div className="roster-side-heading">
            <span className="player-label">P1</span>
            <div>
              <h2>PLAYER 1</h2>
              <p>
                {phase === "player" ? "SELECT YOUR FIGHTER" : "FIGHTER LOCKED"}
              </p>
            </div>
          </div>

          {phase === "player" ? (
            <FighterStats fighter={selectedFighter} />
          ) : (
            <FighterStats fighter={selectedFighter} />
          )}
        </section>

        <div className="versus-divider">VS</div>

        <section className="roster-side cpu-side">
          <div className="roster-side-heading">
            <span className="cpu-label">CPU</span>
            <div>
              <h2>CPU OPPONENT</h2>
              <p>
                {phase === "player"
                  ? "WAITING FOR PLAYER"
                  : phase === "cpu"
                    ? "SEARCHING FOR OPPONENT..."
                    : "OPPONENT LOCKED"}
              </p>
            </div>
          </div>

          {cpuFighter ? (
            <FighterStats fighter={cpuFighter} />
          ) : (
            <div className="cpu-placeholder">
              <span>?</span>
              <strong>OPPONENT UNKNOWN</strong>
              <p>The CPU is waiting for your selection.</p>
            </div>
          )}
        </section>
      </section>

      <section className="roster-section">
        <div className="roster-title-row">
          <h2>FIGHTER ROSTER</h2>
          <span>{roster.length} FIGHTERS AVAILABLE</span>
        </div>

        <div className="character-roster-grid">
          {roster.map((fighter, index) => {
            const isPlayerSelected = index === selectedIndex;
            const isCpuSelected = index === cpuIndex;

            return (
              <button
                key={fighter.id}
                className={[
                  "roster-tile",
                  fighter.color,
                  isPlayerSelected ? "p1-selected" : "",
                  isCpuSelected ? "cpu-selected" : "",
                  phase !== "player" ? "roster-locked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (phase === "player") setSelectedIndex(index);
                }}
                disabled={phase !== "player"}
                aria-pressed={isPlayerSelected}
              >
                {isPlayerSelected && (
                  <span className="roster-cursor p1-cursor">P1 ▼</span>
                )}

                {isCpuSelected && (
                  <span className="roster-cursor cpu-cursor">
                    {phase === "cpu" ? "CPU ?" : "CPU ▼"}
                  </span>
                )}

                <span className="roster-portrait">
                  <img src={fighter.image} alt={fighter.data.name} />
                </span>

                <strong>{fighter.data.name}</strong>
                <span className="roster-tile-description">
                  {fighter.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="roster-controls">
          <button
            className="roster-nav-button"
            onClick={() => changeFighter(-1)}
            disabled={phase !== "player"}
          >
            ◀ PREVIOUS
          </button>

          <p>
            {phase === "player"
              ? "SELECT A TILE OR USE THE ARROWS"
              : phase === "cpu"
                ? "CPU IS SELECTING..."
                : "BOTH FIGHTERS ARE READY"}
          </p>

          <button
            className="roster-nav-button"
            onClick={() => changeFighter(1)}
            disabled={phase !== "player"}
          >
            NEXT ▶
          </button>
        </div>
      </section>

      <footer className="select-footer">
        <p>
          P1: <strong>{selectedFighter.data.name.toUpperCase()}</strong>
          {"  VS  "}
          CPU: <strong>{cpuFighter?.data.name.toUpperCase() ?? "???"}</strong>
        </p>

        {phase === "player" ? (
          <button className="confirm-fighter-button" onClick={confirmSelection}>
            CONFIRM FIGHTER <span>▶</span>
          </button>
        ) : (
          <button
            className="confirm-fighter-button"
            onClick={startBattle}
            disabled={phase !== "ready"}
          >
            {phase === "cpu" ? "CPU SELECTING..." : "FIGHT! ▶"}
          </button>
        )}
      </footer>
    </main>
  );
}

export default CharacterSelection;
