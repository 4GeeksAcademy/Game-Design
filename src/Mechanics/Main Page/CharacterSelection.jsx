import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Toga from "../All_Character_Stats/TogaStats.js";
import TogaImage from "/workspaces/Game-Design/src/assets/img/Toga.png";
import { Kenpachi } from "../All_Character_Stats/KempachiStats.js";
import KenpachiImage from "/workspaces/Game-Design/src/assets/img/Kenpachi.png";
import Hinata from "../All_Character_Stats/HinataStats.js";
import HinataImage from "/workspaces/Game-Design/src/assets/img/Hinata.png";
import Goku from "../All_Character_Stats/GokuStats.js";
import GokuImage from "/workspaces/Game-Design/src/assets/img/Goku.jpeg"
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
    // =====================================
  // FESTIVAL SECRET CHARACTERS
  // =====================================

  {
    id: "goku",
    image: GokuImage,
    data: Goku,
    color: "goku",
    description: "THE SAIYAN WARRIOR",
    isFestivalSecret: true,
  },
  {
    id: "kenpachi",
    image: KenpachiImage,
    data: Kenpachi,
    color: "kenpachi",
    description: "THE BLOODTHIRSTY SWORDSMAN",
    isFestivalSecret: true,
  },
  {
    id: "toga",
    image: TogaImage,
    data: Toga,
    color: "toga",
    description: "THE LOVABLE VILLAIN",
    isFestivalSecret: true,
  },
  {
    id: "hinata",
    image: HinataImage,
    data: Hinata,
    color: "hinata",
    description: "THE GENTLE FIST",
    isFestivalSecret: true,
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
          <p className="roster-fighter-description">{fighter.description}</p>
          <h2>{stats.name}</h2>
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
}

function CharacterSelection() {
  const navigate = useNavigate();
  const location = useLocation();

  const levelConfig = location.state ?? {};

  const isStoryMode = levelConfig.gameMode === "story";

  const teamSize = levelConfig.teamSize ?? "1v1";
  const difficulty = levelConfig.difficulty ?? "Normal";
  const teamControl = levelConfig.teamControl ?? "single-player";

  const storyOpponentIds = isStoryMode
    ? (levelConfig.opponentTeamIds ??
      (levelConfig.opponentId ? [levelConfig.opponentId] : []))
    : [];

  const storyOpponentId = storyOpponentIds[0] ?? null;

  const [unlockedIds, setUnlockedIds] = useState(() => getUnlockedCharacters());

  // const requiredFighters =
  // teamSize !== "2v2"
  //   ? 1
  //   : teamControl === "cpu-assist"
  //     ? 1
  //     : 2;
  // Story encounters can override the standard team-size rules.
  const isStoryOneVsTwo = isStoryMode && levelConfig.storyMatchType === "1v2";

  const requiredFighters = isStoryOneVsTwo ? 1 : teamSize === "2v2" ? 2 : 1;

  // A 1v2 story encounter has one player fighter and two opponents.
  const cpuFighterCount = isStoryOneVsTwo ? 2 : requiredFighters;

  const [selectedIndices, setSelectedIndices] = useState([]);

  const [cpuIndices, setCpuIndices] = useState(() => {
    if (levelConfig.gameMode !== "story" || !levelConfig.opponentId) {
      return [];
    }

    const opponentIds =
      levelConfig.gameMode === "story"
        ? (levelConfig.opponentTeamIds ??
          (levelConfig.opponentId ? [levelConfig.opponentId] : []))
        : [];

    return opponentIds
      .map((id) => roster.findIndex((fighter) => fighter.id === id))
      .filter((index) => index >= 0);
  });
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const unlocked = getUnlockedCharacters();

    const firstSelectable = roster.findIndex(
      (fighter) =>
        unlocked.includes(fighter.id) &&
        !(
          location.state?.gameMode === "story" &&
          fighter.id === location.state?.opponentId
        ),
    );

    return firstSelectable >= 0 ? firstSelectable : 0;
  });

  const [playerAnimationKey, setPlayerAnimationKey] = useState(0);
  const [cpuAnimationKey, setCpuAnimationKey] = useState(0);
  const [phase, setPhase] = useState("player");

  const selectedFighters = selectedIndices.map((index) => roster[index]);

  // const selectedFighter = roster[selectedIndex];

  const cpuFighters = cpuIndices.map((index) => roster[index]);

  // const cpuIndex = cpuIndices[0] ?? null;
  // const cpuFighter = cpuFighters[0] ?? null;

  // Keep the existing single-fighter preview working.
  // const previewFighter = selectedFighter;

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
  const visibleRoster = roster
  .map((fighter, index) => ({ fighter, index }))
  .filter(
    ({ fighter }) =>
      !fighter.isFestivalSecret || isUnlocked(fighter)
  );

  const changeFighter = (direction) => {
    if (phase !== "player") return;

    let nextIndex = selectedIndex;

    // Move through the roster until we find an unlocked character.
    for (let step = 0; step < roster.length; step += 1) {
      nextIndex = (nextIndex + direction + roster.length) % roster.length;

      const candidate = roster[nextIndex];

      if (
        isUnlocked(candidate) &&
        (!isStoryMode || !storyOpponentIds.includes(candidate.id))
      ) {
        break;
      }
    }

    // Update the character highlighted by the arrows.
    setSelectedIndex(nextIndex);
    setPlayerAnimationKey((key) => key + 1);

    // In 1v1, the highlighted character is automatically selected.
    if (requiredFighters === 1) {
      setSelectedIndices([nextIndex]);
    }
  };

  // Handle keyboard arrows and Enter.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (phase !== "player") return;

      // Don't interfere with typing in text fields.
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        changeFighter(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        changeFighter(1);
      } else if (event.key === "Enter") {
        event.preventDefault();

        if (requiredFighters === 2) {
          // In 2v2, Enter selects or deselects the highlighted fighter.
          togglePlayerFighter(selectedIndex);
        } else {
          // In 1v1, Enter confirms the selected fighter.
          confirmSelection();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [phase, selectedIndex, selectedIndices, unlockedIds, requiredFighters]);

  const togglePlayerFighter = (index) => {
    if (phase !== "player") return;

    const fighter = roster[index];

    // Story opponents are assigned by the level, not selected by the player.
    if (isStoryMode && storyOpponentIds.includes(fighter.id)) {
      return null;
    }

    if (!isUnlocked(fighter)) {
      navigate("/shop");
      return;
    }

    setSelectedIndex(index);

    setSelectedIndices((current) => {
      // Clicking a selected fighter removes them from the team.
      if (current.includes(index)) {
        return current.filter((selected) => selected !== index);
      }

      // Do not allow more fighters than the selected team size.
      if (current.length >= requiredFighters) {
        return current;
      }

      return [...current, index];
    });

    setPlayerAnimationKey((key) => key + 1);
  };

  const confirmSelection = () => {
    if (phase !== "player") return;

    if (selectedIndices.length !== requiredFighters) return;

    if (!selectedIndices.every((index) => isUnlocked(roster[index]))) {
      navigate("/shop");
      return;
    }

    if (isStoryMode) {
      // The story level has already assigned its opponent.
      setPhase("ready");
      return;
    }

    setCpuIndices([]);
    setPhase("cpu");
  };

  useEffect(() => {
    if (phase !== "cpu" || isStoryMode) return;

    const playerIds = selectedIndices.map((index) => roster[index].id);

    // CPU fighters cannot duplicate characters on the player's team.
    // The CPU can choose from the entire roster, including locked fighters.
    const eligibleOpponents = roster
      .map((fighter, index) => ({ fighter, index }))
      .filter(
  ({ fighter }) =>
    !playerIds.includes(fighter.id) &&
    (!fighter.isFestivalSecret || unlockedIds.includes(fighter.id))
);

    if (eligibleOpponents.length < cpuFighterCount) {
      setCpuIndices([]);
      setPhase("player");
      return;
    }

    let animationStep = 0;
    let finalTeam = [];

    const animation = setInterval(() => {
      const shuffled = [...eligibleOpponents].sort(() => Math.random() - 0.5);

      finalTeam = shuffled.slice(0, cpuFighterCount).map(({ index }) => index);

      setCpuIndices(finalTeam);
      setCpuAnimationKey((key) => key + 1);

      animationStep += 1;

      if (animationStep >= 6) {
        clearInterval(animation);
        setCpuIndices(finalTeam);
        setPhase("ready");
      }
    }, 350);

    return () => clearInterval(animation);
  }, [phase, selectedIndices, unlockedIds, requiredFighters, teamControl]);

  const startBattle = () => {
    if (
      phase !== "ready" ||
      selectedIndices.length !== requiredFighters ||
      cpuIndices.length !== cpuFighterCount
    ) {
      return;
    }

    const playerTeamIds = selectedIndices.map((index) => roster[index].id);

    const opponentTeamIds = cpuIndices.map((index) => roster[index].id);

    navigate(
      isStoryOneVsTwo || teamSize === "2v2" ? "/team-battle" : "/battle",
      {
        state: {
          // Preserve every setting defined by the story level.
          ...levelConfig,

          // Pass the selected fighters to the battle.
          playerId: playerTeamIds[0],
          opponentId: opponentTeamIds[0],
          playerTeamIds,
          opponentTeamIds,

          // Keep the established match settings.
          teamSize,
          difficulty,
          teamControl,
          gameMode: isStoryMode ? "story" : (levelConfig.gameMode ?? "quick"),
        },
      },
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

        <button
          className="select-back-button"
          onClick={() => navigate("/shop")}
        >
          ◈ CHARACTER SHOP
        </button>
      </header>

      <section className="select-heading">
        <p className="select-eyebrow">UNLOCK FIGHTERS · CHOOSE YOUR CHAMPION</p>

        <h1>
          {requiredFighters === 2 ? "SELECT YOUR TEAM" : "SELECT YOUR FIGHTER"}
        </h1>

        <p>
          {requiredFighters === 2
            ? "Choose two unlocked fighters to form your team."
            : "Choose an unlocked fighter. Earn coins in battle to expand your roster."}
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

          <div className={teamSize === "2v2" ? "roster-team-preview" : ""}>
            {selectedFighters.map((fighter) => (
              <FighterStats
                key={`player-${fighter.id}-${playerAnimationKey}`}
                fighter={fighter}
              />
            ))}
          </div>
        </section>

        <div className="versus-divider">VS</div>

        <section className="roster-side cpu-side">
          <div className="roster-side-heading">
            <span className="cpu-label">CPU</span>
            <div>
              <h2>
                {isStoryMode
                  ? "STORY OPPONENT"
                  : teamControl === "cpu-assist"
                    ? "CPU TEAM"
                    : "CPU OPPONENT"}
              </h2>
              <p>
                {isStoryMode
                  ? "STORY OPPONENT ASSIGNED"
                  : phase === "player"
                    ? "WAITING FOR PLAYER"
                    : phase === "cpu"
                      ? "SELECTING TEAM..."
                      : teamControl === "cpu-assist"
                        ? "ALLY + OPPONENTS LOCKED"
                        : "OPPONENT LOCKED"}
              </p>
            </div>
          </div>

          {cpuFighters.length > 0 ? (
            <div className={teamSize === "2v2" ? "roster-team-preview" : ""}>
              {cpuFighters.map((fighter) => (
                <FighterStats
                  key={`cpu-${fighter.id}-${cpuAnimationKey}`}
                  fighter={fighter}
                />
              ))}
            </div>
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
  visibleRoster.filter(({ fighter }) => isUnlocked(fighter)).length
}{" "}
 / {visibleRoster.length} UNLOCKED
          </span>
        </div>

        <div className="character-roster-grid">
          {visibleRoster.map(({ fighter, index }) => {
            if (isStoryMode && fighter.id === storyOpponentId) {
              return null;
            }
            const isPlayerSelected = selectedIndices.includes(index);
            const isKeyboardHighlighted = selectedIndex === index;
            const isCpuSelected = cpuIndices.includes(index);
            const fighterUnlocked = isUnlocked(fighter);

            return (
              <button
                key={fighter.id}
                type="button"
                className={[
                  "roster-tile",
                  isKeyboardHighlighted && phase === "player"
                    ? "keyboard-highlighted"
                    : "",
                  fighter.color,
                  isPlayerSelected ? "p1-selected" : "",
                  isCpuSelected ? "cpu-selected" : "",
                  !fighterUnlocked ? "fighter-unavailable" : "",
                  phase !== "player" ? "roster-locked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => togglePlayerFighter(index)}
                disabled={phase !== "player"}
                aria-pressed={isPlayerSelected}
                aria-label={
                  fighterUnlocked
                    ? `Select ${fighter.data.name}`
                    : `${fighter.data.name} is locked. Open the shop to unlock.`
                }
              >
                {(isPlayerSelected ||
                  (isKeyboardHighlighted && phase === "player")) && (
                  <span
                    className={`roster-cursor ${
                      isPlayerSelected
                        ? selectedIndices[0] === index
                          ? "p1-cursor"
                          : "p2-cursor"
                        : requiredFighters === 2 && selectedIndices.length === 1
                          ? "p2-cursor"
                          : "p1-cursor"
                    }`}
                  >
                    {isPlayerSelected
                      ? selectedIndices[0] === index
                        ? "P1 ▼"
                        : "P2 ▼"
                      : requiredFighters === 2 && selectedIndices.length === 1
                        ? "P2 ▼"
                        : "P1 ▼"}
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
              ? requiredFighters === 2
                ? "SELECT TWO UNLOCKED FIGHTERS FROM THE ROSTER"
                : "SELECT AN UNLOCKED FIGHTER OR USE THE ARROWS"
              : phase === "cpu"
                ? "CPU IS SELECTING..."
                : "BOTH FIGHTERS ARE READY"}
          </p>

          <button
            className="roster-nav-button"
            onClick={() => changeFighter(1)}
            disabled={
              phase !== "player" || selectedIndices.length !== requiredFighters
            }
          >
            NEXT ▶
          </button>
        </div>
      </section>

      <footer className="select-footer">
        <p>
          P1:{" "}
          <strong>
            {selectedFighters
              .map((fighter) => fighter.data.name.toUpperCase())
              .join(" + ") || "NONE SELECTED"}
          </strong>
          {" VS "}
          CPU:{" "}
          <strong>
            {cpuFighters
              .map((fighter) => fighter.data.name.toUpperCase())
              .join(" + ") || "???"}
          </strong>
        </p>

        {phase === "player" ? (
          <button className="confirm-fighter-button" onClick={confirmSelection}>
            {requiredFighters === 2 ? "CONFIRM TEAM" : "CONFIRM FIGHTER"}{" "}
            <span>▶</span>
          </button>
        ) : (
          <button
            className="confirm-fighter-button"
            onClick={startBattle}
            disabled={
              phase !== "ready" ||
              selectedIndices.length !== requiredFighters ||
              cpuIndices.length !== cpuFighterCount
            }
          >
            {phase === "cpu" ? "CPU SELECTING..." : "FIGHT! ▶"}
          </button>
        )}
      </footer>
    </main>
  );
}

export default CharacterSelection;
