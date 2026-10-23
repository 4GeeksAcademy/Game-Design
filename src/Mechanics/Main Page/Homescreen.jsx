import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCoins } from "../Currency";
import "./Homescreen.css";

function Homescreen() {
  const navigate = useNavigate();
  const [teamControl, setTeamControl] = useState("single-player");
  const [menuHistory, setMenuHistory] = useState(["home"]);
  const menu = menuHistory[menuHistory.length - 1];
  const [teamSize, setTeamSize] = useState("1v1");
  const [difficulty, setDifficulty] = useState("Normal");

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

        <button className="arcade-button" disabled>
          STORY MODE <span>LOCKED</span>
        </button>

        <button className="arcade-button" disabled>
          CHALLENGES <span>LOCKED</span>
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
        onClick={() => openMenu("difficulty")}
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
        return renderPlaceholder(
          "SETTINGS",
          "Game settings will be available here.",
        );
      case "howToPlay":
        return renderPlaceholder(
          "HOW TO PLAY",
          "Learn the rules and master your combat abilities.",
        );
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
