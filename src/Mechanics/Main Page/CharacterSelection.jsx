import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import mina from "../All_Character_Stats/Mina_AshidoStats.js";
import minaArena from "../../assets/img/MinaAshidoArena.jpg";
import rockLee from "../All_Character_Stats/Rock_LeeStats.js";
import RockLeeArena from "../../assets/img/RockLeeArena.jpg";
import Usopp from "../All_Character_Stats/UsoppStats.js";
import UsoppArenaImage from "../../assets/img/UsoppArena.png";
import Chad from "../All_Character_Stats/ChadStats.js";
import ChadImage from "../../assets/img/Chad.jpeg";
import Picolo from "../All_Character_Stats/PicoloStats.js";
import PicoloImage from "../../assets/img/picolo.jpg";
import TenTen from "../All_Character_Stats/TenTenStats.js";
import TenTenImage from "../../assets/img/Tenten.jpg";
import Kirishima from "../All_Character_Stats/KirishimaStats.js";
import KirishimaImage from "../../assets/img/Kirishima.png";
import Ochaco from "../All_Character_Stats/OchacoStats.js";
import OchacoArenaImage from "../../assets/img/Ochaco.png";
import Luffy from "../All_Character_Stats/LuffyStats.js";
import LuffyArenaImage from "../../assets/img/Luffy.png";
import Ichigo from "../All_Character_Stats/IchigoStats.js";
import IchigoArenaImage from "../../assets/img/Ichigo.png";
import Naruto from "../All_Character_Stats/NarutoStats.js";
import NarutoArenaImage from "../../assets/img/Naruto.png";
import Yoruichi from "../All_Character_Stats/YoruichiStats.js";
import YoruichiArenaImage from "../../assets/img/Yoruichi.png";

import { getUnlockedCharacters } from "../Currency.js";

import "./CharacterSelection.css";

export const roster = [
  {
    id: "luffy",
    image: LuffyArenaImage,
    data: Luffy,
    color: "luffy",
    description: "RUBBER TEEN",
  },
  {
    id: "ichigo",
    image: IchigoArenaImage,
    data: Ichigo,
    color: "ichigo",
    description: "THE SUBSTITUTE SOUL REAPER",
  },
  {
    id: "naruto",
    image: NarutoArenaImage,
    data: Naruto,
    color: "naruto",
    description: "THE NINE TAILS JINCHURIKI",
  },
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
  {
    id: "chad",
    image: ChadImage,
    data: Chad,
    color: "Chad",
    description: "DEADLY STRIKER",
  },
  {
    id: "picolo",
    image: PicoloImage,
    data: Picolo,
    color: "Picolo",
    description: "REGENERATION EXPERT",
  },
  {
    id: "tenten",
    image: TenTenImage,
    data: TenTen,
    color: "TenTen",
    description: "WEAPONS SPECIALIST",
  },
  {
    id: "kirishima",
    image: KirishimaImage,
    data: Kirishima,
    color: "Kirishima",
    description: "HARDEN",
  },
  {
    id: "ochaco",
    image: OchacoArenaImage,
    data: Ochaco,
    color: "ochaco",
    description: "UGRAVITY",
  },
  {
    id: "yoruichi",
    image: YoruichiArenaImage,
    data: Yoruichi,
    color: "yoruichi",
    description: "THE THUNDER GOD",
  },
];

function FighterStats({ fighter }) {
  const stats = fighter.data;

  const statBars = [
    {
      name: "HEALTH",
      value: stats.health,
      maximum: 200,
      color: "health",
    },
    {
      name: "MANA",
      value: stats.maximumMana,
      maximum: 200,
      color: "mana",
    },
    {
      name: "DEFENSE",
      value:
        typeof stats.defense === "number"
          ? stats.defense
          : (stats.defense?.amount ?? 0),
      maximum: 100,
      color: "defense",
    },
    {
      name: "AGILITY",
      value: stats.agility,
      maximum: 100,
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
          <p className="roster-fighter-description">
            {fighter.description}
          </p>
          <h2>{stats.name}</h2>
        </div>
      </div>

      <div className="roster-stat-list">
        {statBars.map((stat) => {
          const percentage = Math.min(
            100,
            Math.max(0, (stat.value / stat.maximum) * 100)
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
}

function CharacterSelection() {
  const navigate = useNavigate();
  const location = useLocation();

  const teamSize = location.state?.teamSize ?? "1v1";
  const difficulty = location.state?.difficulty ?? "Normal";

  const [unlockedIds, setUnlockedIds] = useState(() => getUnlockedCharacters());

  const [selectedIndex, setSelectedIndex] = useState(() => {
    const unlocked = getUnlockedCharacters();
    const firstUnlocked = roster.findIndex((fighter) =>
      unlocked.includes(fighter.id),
    );

    return firstUnlocked >= 0 ? firstUnlocked : 0;
  });

  const [cpuIndex, setCpuIndex] = useState(null);
  const [playerAnimationKey, setPlayerAnimationKey] = useState(0);
  const [cpuAnimationKey, setCpuAnimationKey] = useState(0);
  const [phase, setPhase] = useState("player");

  const selectedFighter = roster[selectedIndex];
  const previewFighter = selectedFighter;
  const cpuFighter = cpuIndex === null ? null : roster[cpuIndex];

  useEffect(() => {
    const updateUnlocks = () => {
      setUnlockedIds(getUnlockedCharacters());
    };

    window.addEventListener("unlocksUpdated", updateUnlocks);

    return () => {
      window.removeEventListener("unlocksUpdated", updateUnlocks);
    };
  }, []);

  const isUnlocked = (fighter) => unlockedIds.includes(fighter.id);

  // Move to the next unlocked fighter, skipping locked characters.
  const changeFighter = (direction) => {
    if (phase !== "player") return;

    const nextIndex =
      (selectedIndex + direction + roster.length) % roster.length;

    setSelectedIndex(nextIndex);
    setPlayerAnimationKey((key) => key + 1);
  };

  const confirmSelection = () => {
    if (phase !== "player") return;

    if (!isUnlocked(selectedFighter)) {
      navigate("/shop");
      return;
    }

    setCpuIndex(null);
    setPhase("cpu");
  };
  // const confirmSelection = () => {
  //   if (phase !== "player" || !isUnlocked(selectedFighter)) return;

  //   const availableOpponents = roster
  //     .map((fighter, index) => ({ fighter, index }))
  //     .filter(
  //       ({ fighter }) =>
  //         isUnlocked(fighter) && fighter.id !== selectedFighter.id,
  //     );

  //   if (availableOpponents.length === 0) {
  //     return;
  //   }

  //   const opponent =
  //     availableOpponents[Math.floor(Math.random() * availableOpponents.length)];

  //   setCpuIndex(opponent.index);
  //   setPendingOpponent(opponent.index);
  //   setPhase("cpu");
  // };

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
  }, [phase, selectedIndex, unlockedIds]);

  useEffect(() => {
    if (phase !== "cpu") return;

    const eligibleOpponents = roster
      .map((fighter, index) => ({ fighter, index }))
      .filter(({ fighter }) => fighter.id !== selectedFighter.id);

    if (eligibleOpponents.length === 0) {
      setPhase("player");
      return;
    }

    let animationStep = 0;

    const animation = setInterval(() => {
      const randomChoice =
        eligibleOpponents[Math.floor(Math.random() * eligibleOpponents.length)];

      setCpuIndex(randomChoice.index);
      setCpuAnimationKey((key) => key + 1);
      animationStep += 1;

      if (animationStep >= 6) {
        clearInterval(animation);
        setPhase("ready");
      }
    }, 350);

    return () => clearInterval(animation);
  }, [phase, selectedIndex]);

  const startBattle = () => {
    if (
      phase !== "ready" ||
      cpuIndex === null ||
      !isUnlocked(selectedFighter)
    ) {
      return;
    }

    navigate("/battle", {
      state: {
        playerId: selectedFighter.id,
        opponentId: roster[cpuIndex].id,
        teamSize,
        difficulty,
      },
    });
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

        <button
          className="select-back-button"
          onClick={() => navigate("/shop")}
        >
          ◈ CHARACTER SHOP
        </button>
      </header>

      <section className="select-heading">
        <p className="select-eyebrow">UNLOCK FIGHTERS · CHOOSE YOUR CHAMPION</p>
        <h1>SELECT YOUR FIGHTER</h1>
        <p>
          Choose an unlocked fighter. Earn coins in battle to expand your
          roster.
        </p>
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

          <FighterStats
            key={`player-${playerAnimationKey}`}
            fighter={previewFighter}
          />
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
            <FighterStats
              key={`cpu-${cpuAnimationKey}-${cpuFighter.id}`}
              fighter={cpuFighter}
            />
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
          <span>
            {
              unlockedIds.filter((id) =>
                roster.some((fighter) => fighter.id === id),
              ).length
            }{" "}
            / {roster.length} UNLOCKED
          </span>
        </div>

        <div className="character-roster-grid">
          {roster.map((fighter, index) => {
            const isPlayerSelected = index === selectedIndex;
            const isCpuSelected = index === cpuIndex;
            const fighterUnlocked = isUnlocked(fighter);

            return (
              <button
                key={fighter.id}
                type="button"
                className={[
                  "roster-tile",
                  fighter.color,
                  isPlayerSelected ? "p1-selected" : "",
                  isCpuSelected ? "cpu-selected" : "",
                  !fighterUnlocked ? "fighter-unavailable" : "",
                  phase !== "player" ? "roster-locked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (phase !== "player") return;

                  setSelectedIndex(index);
                  setPlayerAnimationKey((key) => key + 1);
                }}
                disabled={phase !== "player"}
                aria-pressed={isPlayerSelected}
                aria-label={
                  fighterUnlocked
                    ? `Select ${fighter.data.name}`
                    : `${fighter.data.name} is locked. Open the shop to unlock.`
                }
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

                  {!fighterUnlocked && (
                    <span className="fighter-lock-overlay">
                      <span className="fighter-lock-icon">🔒</span>
                      <strong>LOCKED</strong>
                      <small>VISIT SHOP</small>
                    </span>
                  )}
                </span>

                <span className="roster-tile-info">
                  <strong>{fighter.data.name}</strong>
                  <span className="roster-tile-description">
                    {fighterUnlocked ? fighter.description : "UNLOCK IN SHOP"}
                  </span>
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
              ? "SELECT AN UNLOCKED TILE OR USE THE ARROWS"
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
