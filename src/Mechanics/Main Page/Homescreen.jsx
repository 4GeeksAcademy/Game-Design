import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCoins } from "../Currency";
import {
  ATTACK_SLOT_COUNT,
  DEFAULT_KEYBINDS,
  actionLabel,
  findKeybindConflict,
  getKeybindLabel,
  isReservedKey,
  loadKeybinds,
  normalizeKey,
  saveKeybinds,
} from "./keybinds.js";
import "./Homescreen.css";

function Homescreen() {
  const navigate = useNavigate();
  const [teamControl, setTeamControl] = useState("single-player");
  const [menuHistory, setMenuHistory] = useState(["home"]);
  const menu = menuHistory[menuHistory.length - 1];
  const [teamSize, setTeamSize] = useState("1v1");
  const [difficulty, setDifficulty] = useState("Normal");

  const [keybinds, setKeybinds] = useState(() => loadKeybinds());
  const [listeningFor, setListeningFor] = useState(null);
  const [keybindMessage, setKeybindMessage] = useState("");

  const resetKeybinds = () => {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_KEYBINDS));
    setKeybinds(defaults);
    saveKeybinds(defaults);
    setListeningFor(null);
    setKeybindMessage("Default keybinds restored.");
  };

  const handleKeybindCapture = (event) => {
    if (!listeningFor) return;

    event.preventDefault();
    event.stopPropagation();

    if (isReservedKey(event)) {
      setKeybindMessage("That key is reserved. Choose another key.");
      return;
    }

    const key = normalizeKey(event.key);
    if (!key) return;

    const conflict = findKeybindConflict(keybinds, key, listeningFor);

    if (conflict) {
      const playerName =
        conflict.playerId === "player1" ? "Player 1" : "Player 2";

      setKeybindMessage(
        `${getKeybindLabel(key)} is already assigned to ${playerName} ${conflict.label}.`,
      );
      return;
    }

    const [playerId, action, slot] = listeningFor.split(".");
    const updated = JSON.parse(JSON.stringify(keybinds));

    if (action === "attack") {
      updated[playerId].attacks[Number(slot)] = key;
    } else {
      updated[playerId][action] = key;
    }

    setKeybinds(updated);
    saveKeybinds(updated);
    setListeningFor(null);
    setKeybindMessage("");
  };

  useEffect(() => {
    if (!listeningFor) return undefined;

    window.addEventListener("keydown", handleKeybindCapture);
    return () => window.removeEventListener("keydown", handleKeybindCapture);
  }, [listeningFor, keybinds]);

  const openMenu = (nextMenu) => {
    setMenuHistory((history) => [...history, nextMenu]);
  };

  const goBack = () => {
    setMenuHistory((history) => {
      if (history.length <= 1) {
        return history;
      }

      return history.slice(0, -1);
    });
  };

  const startBattle = () => {
    navigate("/character-select", {
      state: {
        gameMode: "quick",
        teamSize,
        difficulty,
        teamControl: teamSize === "2v2" ? teamControl : "single-player",
      },
    });
  };

  const [coins, setCoins] = useState(() => getCoins());

  useEffect(() => {
    const updateCoins = () => {
      setCoins(getCoins());
    };

    window.addEventListener("coinsUpdated", updateCoins);

    return () => {
      window.removeEventListener("coinsUpdated", updateCoins);
    };
  }, []);

  const renderSettings = () => {
    const players = [
      ["player1", "PLAYER 1"],
      ["player2", "PLAYER 2"],
    ];

    const renderBindingButton = (playerId, actionId, key) => {
      const listening = listeningFor === actionId;

      return (
        <button
          key={actionId}
          type="button"
          className="keybind-button"
          onClick={() => {
            setListeningFor(actionId);
            setKeybindMessage("Press a key. Escape cancels.");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setListeningFor(null);
              setKeybindMessage("");
            }
          }}
        >
          {listening ? "PRESS A KEY…" : getKeybindLabel(key)}
        </button>
      );
    };

    return (
      <>
        <p className="home-eyebrow">CUSTOMIZE CONTROLS</p>
        <h2 className="menu-title">KEYBINDS</h2>
        <p className="menu-description">
          Select a binding, then press the key you want. Keys must be unique
          across both players.
        </p>

        <div className="keybind-player-grid">
          {players.map(([playerId, title]) => (
            <section className="keybind-player" key={playerId}>
              <h3>{title}</h3>

              {Array.from({ length: ATTACK_SLOT_COUNT }, (_, index) => (
                <div
                  className="keybind-row"
                  key={`${playerId}.attack.${index}`}
                >
                  <span>Attack {index + 1}</span>
                  {renderBindingButton(
                    playerId,
                    `${playerId}.attack.${index}`,
                    keybinds[playerId].attacks[index],
                  )}
                </div>
              ))}

              {[
                ["finishTurn", "Finish turn"],
                ["defend", "Defend"],
                ["evade", "Evade"],
                ["takeDamage", "Take full damage"],
              ].map(([action, label]) => (
                <div className="keybind-row" key={`${playerId}.${action}`}>
                  <span>{label}</span>
                  {renderBindingButton(
                    playerId,
                    `${playerId}.${action}`,
                    keybinds[playerId][action],
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>

        {keybindMessage && (
          <p className="keybind-message" role="status">
            {keybindMessage}
          </p>
        )}

        <div className="settings-actions">
          <button
            type="button"
            className="arcade-button"
            onClick={resetKeybinds}
          >
            RESTORE DEFAULTS
          </button>

          <button type="button" className="back-button" onClick={goBack}>
            ← BACK
          </button>
        </div>
      </>
    );
  };

  const renderTeamControl = () => {
    const options = [
      {
        id: "single-player",
        title: "PLAYER VS FULL CPU",
        description:
          "One player controls both fighters using the current turn-based mechanics.",
        disabled: false,
        playerCount: 1,
        allyCpuCount: 0,
        enemyCpuCount: 2,
      },
      {
        id: "local-coop",
        title: "PLAYER + PLAYER VS FULL CPU",
        description: "Two local players control one fighter each.",
        disabled: false,
        playerCount: 2,
        allyCpuCount: 0,
        enemyCpuCount: 2,
      },
      {
        id: "pvp",
        title: "PLAYER VS PLAYER",
        description: "Coming soon.",
        disabled: true,
        playerCount: 2,
        allyCpuCount: 0,
        enemyCpuCount: 2,
      },
      {
        id: "cpu-assist",
        title: "PLAYER + CPU VS CPU TEAM",
        description: "A CPU teammate fights alongside you.",
        disabled: false,
        playerCount: 1,
        allyCpuCount: 1,
        enemyCpuCount: 2,
      },
    ];

    return (
      <>
        <p className="home-eyebrow">2V2 TEAM SETUP</p>
        <h2 className="menu-title">CHOOSE YOUR TEAM CONTROLS</h2>

        <div className="team-control-grid">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`team-control-card ${
                teamControl === option.id ? "selected" : ""
              }`}
              disabled={option.disabled}
              aria-pressed={teamControl === option.id}
              onClick={() => setTeamControl(option.id)}
            >
              <span className="team-control-title">{option.title}</span>

              <span className="team-control-matchup" aria-hidden="true">
                <span className="matchup-side">
                  {Array.from({ length: option.playerCount }, (_, index) => (
                    <span
                      className="matchup-rectangle player"
                      key={`p-${index}`}
                    >
                      <i className="fa-solid fa-circle-user" />
                    </span>
                  ))}
                  {Array.from({ length: option.allyCpuCount }, (_, index) => (
                    <span
                      className="matchup-rectangle cpu"
                      key={`ally-${index}`}
                    >
                      <i className="fa-solid fa-robot" />
                    </span>
                  ))}
                </span>

                <b>VS</b>

                <span className="matchup-side">
                  {Array.from({ length: option.enemyCpuCount }, (_, index) => (
                    <span
                      className="matchup-rectangle cpu"
                      key={`cpu-${index}`}
                    >
                      <i className="fa-solid fa-robot" />
                    </span>
                  ))}
                </span>
              </span>

              <span className="team-control-description">
                {option.description}
              </span>
            </button>
          ))}
        </div>

        <button
          className="arcade-button primary-button continue-button"
          onClick={() => openMenu("difficulty")}
        >
          CONTINUE <span>▶</span>
        </button>

        <button className="back-button" onClick={goBack}>
          ← BACK
        </button>
      </>
    );
  };

  const renderHome = () => (
    <>
      <p className="home-eyebrow">THE FIGHT STARTS HERE</p>

      <h1 className="home-title">
        <span>YOUR</span>
        <span className="title-accent">NEXT</span>
        <span>CHALLENGE</span>
      </h1>

      <p className="home-subtitle">Choose your fighter. Prove your strength.</p>

      <div className="home-menu-buttons">
        <button
          className="arcade-button primary-button"
          onClick={() => openMenu("play")}
        >
          PLAY <span>▶</span>
        </button>

        <button className="arcade-button " onClick={() => navigate("/shop")}>
          CHARACTER SHOP <span>◈</span>
        </button>

        <button className="arcade-button" onClick={() => openMenu("settings")}>
          SETTINGS
        </button>

        <button className="arcade-button" onClick={() => openMenu("howToPlay")}>
          HOW TO PLAY
        </button>
      </div>
    </>
  );

  const renderPlay = () => (
    <>
      <p className="home-eyebrow">CHOOSE YOUR DESTINATION</p>
      <h2 className="menu-title">GAME MODE</h2>

      <div className="home-menu-buttons">
        <button
          className="arcade-button primary-button"
          onClick={() => openMenu("singlePlayer")}
        >
          SINGLE PLAYER <span>▶</span>
        </button>

        <button className="arcade-button" disabled>
          MULTIPLAYER <span>LOCKED</span>
        </button>
      </div>

      <button className="back-button" onClick={goBack}>
        ← BACK
      </button>
    </>
  );

  const renderSinglePlayer = () => (
    <>
      <p className="home-eyebrow">SINGLE PLAYER</p>
      <h2 className="menu-title">CHOOSE YOUR MODE</h2>

      <div className="home-menu-buttons">
        <button
          className="arcade-button primary-button"
          onClick={() => openMenu("battleSetup")}
        >
          QUICK / CUSTOM BATTLE <span>▶</span>
        </button>

        <button
          className="arcade-button"
          onClick={() => navigate("/bot-simulator")}
        >
          BOT VS BOT SIMULATOR <span>⚔</span>
        </button>

        <button
          className="arcade-button"
          onClick={() => navigate("/story-mode")}
        >
          STORY MODE <span>📖</span>
        </button>

        <button className="arcade-button" onClick={() => navigate("/festival")}>
          FESTIVAL <span>🏆</span>
        </button>
      </div>

      <button className="back-button" onClick={goBack}>
        ← BACK
      </button>
    </>
  );

  const renderBattleSetup = () => (
    <>
      <p className="home-eyebrow">QUICK / CUSTOM BATTLE</p>
      <h2 className="menu-title">CHOOSE YOUR MATCH</h2>

      <p className="menu-description">
        How many fighters will be on each team?
      </p>

      <div className="choice-grid">
        <button
          className={`choice-button ${teamSize === "1v1" ? "selected" : ""}`}
          onClick={() => setTeamSize("1v1")}
        >
          <strong>1v1</strong>
          <span>ONE ON ONE</span>
        </button>

        <button
          className={`choice-button ${teamSize === "2v2" ? "selected" : ""}`}
          onClick={() => setTeamSize("2v2")}
        >
          <strong>2v2</strong>
          <span>TEAM BATTLE</span>
        </button>
      </div>

      <button
        className="arcade-button primary-button continue-button"
        onClick={() =>
          openMenu(teamSize === "2v2" ? "teamControl" : "difficulty")
        }
      >
        CONTINUE <span>▶</span>
      </button>

      <button className="back-button" onClick={goBack}>
        ← BACK
      </button>
    </>
  );

  const renderDifficulty = () => (
    <>
      <p className="home-eyebrow">FINAL PREPARATION</p>
      <h2 className="menu-title">AI DIFFICULTY</h2>

      <p className="menu-description">
        How tough do you want your opponent to be?
      </p>

      <div className="difficulty-list">
        {["Easy", "Normal", "Hard"].map((level) => (
          <button
            key={level}
            className={`difficulty-button ${
              difficulty === level ? "selected" : ""
            }`}
            onClick={() => setDifficulty(level)}
          >
            <span>{level.toUpperCase()}</span>
            <span className="difficulty-check">
              {difficulty === level ? "✓" : ""}
            </span>
          </button>
        ))}
      </div>

      <button
        className="arcade-button primary-button continue-button"
        onClick={startBattle}
      >
        SELECT YOUR FIGHTER <span>▶</span>
      </button>

      <button className="back-button" onClick={goBack}>
        ← BACK
      </button>
    </>
  );

  const renderPlaceholder = (title, description) => (
    <>
      <p className="home-eyebrow">COMING SOON</p>
      <h2 className="menu-title">{title}</h2>
      <p className="menu-description">{description}</p>

      <button className="back-button" onClick={goBack}>
        ← BACK
      </button>
    </>
  );

  const renderMenu = () => {
    switch (menu) {
      case "home":
        return renderHome();
      case "play":
        return renderPlay();
      case "singlePlayer":
        return renderSinglePlayer();
      case "battleSetup":
        return renderBattleSetup();
      case "difficulty":
        return renderDifficulty();
      case "settings":
        return renderSettings();
      case "howToPlay":
        return renderPlaceholder(
          "HOW TO PLAY",
          "Learn the rules and master your combat abilities.",
        );
      case "teamControl":
        return renderTeamControl();
      default:
        return renderHome();
    }
  };

  return (
    <main className="home-screen">
      <div className="arcade-background" />

      <header className="home-header">
        <div className="game-logo">
          <span className="logo-mark">VS</span>
          <span className="logo-name">FIGHTER'S ARENA</span>
        </div>

        <div className="home-header-right">
          <div className="currency-display" aria-label={`${coins} coins`}>
            <span className="currency-icon">◈</span>
            <span>{coins.toLocaleString()}</span>
            <span className="currency-label">COINS</span>
          </div>

          <span className="header-tag">PLAYER 1</span>
        </div>
      </header>

      <section className="home-content" key={menu}>
        {renderMenu()}
      </section>

      <footer className="home-footer">
        <span>INSERT COIN? NAH. JUST FIGHT.</span>
        <span>FIGHTER'S ARENA © 2026</span>
      </footer>
    </main>
  );
}

export default Homescreen;
