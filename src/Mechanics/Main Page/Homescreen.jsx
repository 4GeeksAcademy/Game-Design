import React, { useState, useEffect } from "react";
import mina from "../All_Character_Stats/Mina_AshidoStats.js";
import Kirishima from "../All_Character_Stats/KirishimaStats.js";
import Usopp from "../All_Character_Stats/UsoppStats.js";
import Ochaco from "../All_Character_Stats/OchacoStats.js";
import wildCardsLogo from "../../assets/img/logo.png";
import { useNavigate } from "react-router-dom";
import { getAudioSettings, updateAudioSettings } from "../../audio/audioManager.js";
import { getCoins, getUnlockedCharacters, unlockCharacter } from "../Currency";
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

const STARTER_OPTIONS = [
  { id: "mina", label: "MINA ASHIDO", data: mina, role: "ACID FIGHTER" },
  { id: "kirishima", label: "EIJIRO KIRISHIMA", data: Kirishima, role: "HARDENING HERO" },
  { id: "usopp", label: "USOPP", data: Usopp, role: "SNIPER KING" },
  { id: "ochaco", label: "OCHACO URARAKA", data: Ochaco, role: "ZERO-GRAVITY HERO" },
];

// TEMPORARY FEATURE SWITCH:
// Set to true to show the LOCAL 2 PLAYERS button in the Multiplayer menu.
// Set to false to hide it while the local PvP interface is being polished.
const ENABLE_LOCAL_MULTIPLAYER = true;

function Homescreen() {
  const navigate = useNavigate();
  const [teamControl, setTeamControl] = useState("single-player");
  const [menuHistory, setMenuHistory] = useState(["home"]);
  const menu = menuHistory[menuHistory.length - 1];
  const [teamSize, setTeamSize] = useState("1v1");
  const [difficulty, setDifficulty] = useState("Normal");
  const [unlockedCharacters, setUnlockedCharacters] = useState(() =>
    getUnlockedCharacters(),
  );

  const [selectedStarter, setSelectedStarter] = useState("");
  const [hoveredStarter, setHoveredStarter] = useState("");
  const [showStarterWarning, setShowStarterWarning] = useState(false);

  const [showStarterPopup, setShowStarterPopup] = useState(
    () => getUnlockedCharacters().length === 0,
  );

  const canPlay2v2 = unlockedCharacters.length >= 2;
  const [keybinds, setKeybinds] = useState(() => loadKeybinds());
  const [audioSettings, setAudioSettings] = useState(() => getAudioSettings());
  const [listeningFor, setListeningFor] = useState(null);
  const [keybindMessage, setKeybindMessage] = useState("");

  const changeAudioSetting = (key, value) => {
    setAudioSettings(updateAudioSettings({ [key]: value }));
  };

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

    const [playerId, action, slot] = listeningFor.split(".");
    const isNavigationBinding = action === "navigation";
    const conflict = isNavigationBinding
      ? null
      : findKeybindConflict(keybinds, key, listeningFor);

    if (conflict) {
      const playerName =
        conflict.playerId === "player1" ? "Player 1" : "Player 2";

      setKeybindMessage(
        `${getKeybindLabel(key)} is already assigned to ${playerName} ${conflict.label}.`,
      );
      return;
    }

    const updated = JSON.parse(JSON.stringify(keybinds));

    if (action === "navigation") {
      updated[playerId].navigation[slot] = key;
    } else if (action === "attack") {
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
    // Keep the temporary feature switch effective even if this menu is
    // reached programmatically while local multiplayer is disabled.
    if (nextMenu === "localMultiplayer" && !ENABLE_LOCAL_MULTIPLAYER) return;
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

  // Keyboard navigation for the home screen and its submenus.
  // Arrow keys move focus; Enter/Space use the focused button's native action.
  useEffect(() => {
    const handleMenuNavigation = (event) => {
      if (listeningFor || showStarterPopup) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

      const currentKeybinds = loadKeybinds();
      const p1Navigation = currentKeybinds.player1.navigation;
      const p2Navigation = currentKeybinds.player2.navigation;
      const pressedKey = normalizeKey(event.key);
      const navigationKeys = [
        [p1Navigation.up, -1],
        [p1Navigation.left, -1],
        [p1Navigation.down, 1],
        [p1Navigation.right, 1],
        [p2Navigation.up, -1],
        [p2Navigation.left, -1],
        [p2Navigation.down, 1],
        [p2Navigation.right, 1],
      ];
      const direction = navigationKeys.find(
        ([boundKey]) => normalizeKey(boundKey) === pressedKey,
      )?.[1];
      if (!direction) return;

      const menuRoot = document.querySelector(".home-content");
      if (!menuRoot) return;

      const buttons = Array.from(
        menuRoot.querySelectorAll("button:not(:disabled)"),
      ).filter((button) => button.getClientRects().length > 0);

      if (!buttons.length) return;

      event.preventDefault();

      const activeIndex = buttons.indexOf(document.activeElement);
      const nextIndex =
        activeIndex === -1
          ? direction > 0
            ? 0
            : buttons.length - 1
          : (activeIndex + direction + buttons.length) % buttons.length;

      buttons[nextIndex].focus();
    };

    window.addEventListener("keydown", handleMenuNavigation);
    return () => window.removeEventListener("keydown", handleMenuNavigation);
  }, [listeningFor, showStarterPopup]);

  const startBattle = () => {
    if (teamSize === "2v2" && !canPlay2v2) {
      setTeamSize("1v1");
      return;
    }

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

  useEffect(() => {
    const updateUnlockedCharacters = () => {
      setUnlockedCharacters(getUnlockedCharacters());
    };

    window.addEventListener("unlocksUpdated", updateUnlockedCharacters);

    return () => {
      window.removeEventListener("unlocksUpdated", updateUnlockedCharacters);
    };
  }, []);

  const confirmStarterSelection = () => {
    if (selectedStarter) setShowStarterWarning(true);
  };

  const finalizeStarterSelection = () => {
    if (!selectedStarter) return;
    const unlocked = getUnlockedCharacters();
    if (unlocked.length > 0) {
      setUnlockedCharacters(unlocked);
      setShowStarterPopup(false);
      setShowStarterWarning(false);
      return;
    }
    unlockCharacter(selectedStarter);
    setUnlockedCharacters(getUnlockedCharacters());
    setShowStarterPopup(false);
    setShowStarterWarning(false);
    setSelectedStarter("");
  };

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
          Choose a binding and press the key you want. Navigation keys may
          overlap with any other binding; attacks and combat actions must remain unique.
        </p>

        <div className="keybind-player-grid">
          {players.map(([playerId, title]) => (
            <section className="keybind-player" key={playerId}>
              <h3>{title}</h3>

              <div className="keybind-navigation-group">
                <h4>NAVIGATION</h4>
                {[
                  ["up", "Move up"],
                  ["down", "Move down"],
                  ["left", "Move left"],
                  ["right", "Move right"],
                ].map(([direction, label]) => (
                  <div className="keybind-row" key={`${playerId}.navigation.${direction}`}>
                    <span>{label}</span>
                    {renderBindingButton(
                      playerId,
                      `${playerId}.navigation.${direction}`,
                      keybinds[playerId].navigation[direction],
                    )}
                  </div>
                ))}
              </div>

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

        <section className="audio-settings-section" aria-labelledby="audio-settings-title">
          <p className="home-eyebrow">SOUND & MUSIC</p>
          <h2 className="menu-title" id="audio-settings-title">AUDIO SETTINGS</h2>
          <p className="menu-description">
            Adjust the soundtrack, sound effects, and character voices independently.
          </p>

          {[
            ["master", "Master volume", "Controls all game audio."],
            ["music", "Background music", "Menu, story, and battle themes."],
            ["effects", "Sound effects", "Buttons, impacts, and action sounds."],
            ["voices", "Character voices", "Dialogue typing and expression reactions."],
          ].map(([key, label, description]) => (
            <label className="audio-setting-row" key={key}>
              <span className="audio-setting-copy">
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <span className="audio-setting-control">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioSettings[key]}
                  onChange={(event) => changeAudioSetting(key, Number(event.target.value))}
                  aria-label={label}
                />
                <output>{Math.round(audioSettings[key] * 100)}%</output>
              </span>
            </label>
          ))}

          <label className="audio-mute-row">
            <span>
              <strong>Mute all audio</strong>
              <small>Quickly silence music, effects, and voices.</small>
            </span>
            <input
              type="checkbox"
              checked={audioSettings.muted}
              onChange={(event) => changeAudioSetting("muted", event.target.checked)}
            />
          </label>
        </section>

        <div className="settings-actions">
          <button
            type="button"
            className="arcade-button"
            onClick={resetKeybinds}
          >
            RESTORE KEYBINDS
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
        description: "Two local players face off, each controlling a full team.",
        disabled: false,
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
                      className={`matchup-rectangle ${option.id === "pvp" ? "player" : "cpu"}`}
                      key={`cpu-${index}`}
                    >
                      <i className={option.id === "pvp" ? "fa-solid fa-circle-user" : "fa-solid fa-robot"} />
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
          onClick={() => {
            if (teamControl === "pvp") {
              navigate("/character-select", {
                state: {
                  gameMode: "quick",
                  teamSize: "2v2",
                  difficulty: "Normal",
                  teamControl: "pvp",
                  localPvP: true,
                  playerCount: 2,
                },
              });
              return;
            }

            openMenu("difficulty");
          }}
        >
          {teamControl === "pvp" ? "SELECT TEAMS" : "CONTINUE"} <span>▶</span>
        </button>

        <button className="back-button" onClick={goBack}>
          ← BACK
        </button>
      </>
    );
  };

  
const renderHome = () => (
  <div className="home-hero home-hero--main">
    <div className="home-hero-brand">
      <p className="home-eyebrow">THE NEXT GENERATION OF CARD COMBAT</p>

      <img
        src={wildCardsLogo}
        alt="Wild Cards"
        className="wild-cards-logo wc-beat-animation--bounce"
      />

      <p className="home-subtitle">
        CHOOSE YOUR FIGHTER. PLAY YOUR CARDS. MAKE YOUR LEGEND.
      </p>

      <div className="hero-divider">
        <span />
        <b>EST. 2026</b>
        <span />
      </div>
    </div>

    <nav className="main-menu-nav" aria-label="Main menu">
      <button
        className="main-menu-button main-menu-button--primary"
        onClick={() => openMenu("play")}
      >
       
        <span className="main-menu-icon">⚔</span>
        <span className="main-menu-label">
          <strong>PLAY</strong>
          <small>ENTER THE ARENA</small>
        </span>
        <span className="main-menu-arrow">▶</span>
      </button>

      <button
        className="main-menu-button"
        onClick={() => navigate("/shop")}
      >
        
        <span className="main-menu-icon">◈</span>
        <span className="main-menu-label">
          <strong>CHARACTER SHOP</strong>
          <small>DISCOVER NEW FIGHTERS</small>
        </span>
        <span className="main-menu-arrow">↗</span>
      </button>

      <button
        className="main-menu-button"
        onClick={() => navigate("/inventory")}
      >
        
        <span className="main-menu-icon">▤</span>
        <span className="main-menu-label">
          <strong>INVENTORY</strong>
          <small>MANAGE YOUR COLLECTION</small>
        </span>
        <span className="main-menu-arrow">↗</span>
      </button>

      <button
        className="main-menu-button"
        onClick={() => openMenu("howToPlay")}
      >
      
        <span className="main-menu-icon">?</span>
        <span className="main-menu-label">
          <strong>HOW TO PLAY</strong>
          <small>LEARN THE RULES</small>
        </span>
        <span className="main-menu-arrow">↗</span>
      </button>

      <button
        className="main-menu-button"
        onClick={() => openMenu("settings")}
      >
       
        <span className="main-menu-icon">⚙</span>
        <span className="main-menu-label">
          <strong>SETTINGS</strong>
          <small>CONFIGURE YOUR GAME</small>
        </span>
        <span className="main-menu-arrow">↗</span>
      </button>

      <button
        className="main-menu-button"
        onClick={() => navigate("/achievements")}
      >
       
        <span className="main-menu-icon">🏆</span>
        <span className="main-menu-label">
          <strong>ACHIEVEMENTS</strong>
          <small>TRACK YOUR PROGRESS</small>
        </span>
        <span className="main-menu-arrow">↗</span>
      </button>
    </nav>
  </div>
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

        <button
          className="arcade-button"
          onClick={() => openMenu("multiplayer")}
        >
          MULTIPLAYER <span>▶</span>
        </button>
      </div>

      <button className="back-button" onClick={goBack}>
        ← BACK
      </button>
    </>
  );

 
const renderMultiplayer = () => (
  <>
    <p className="home-eyebrow">PLAY WITH OTHERS</p>
    <h2 className="menu-title">MULTIPLAYER</h2>
    <p className="menu-description">
      Challenge someone locally or connect online when online play becomes available.
    </p>

    <div className="home-menu-buttons">
      {ENABLE_LOCAL_MULTIPLAYER && (
        <button
          className="arcade-button primary-button"
          onClick={() => openMenu("localMultiplayer")}
        >
          LOCAL <span>2 PLAYERS · SAME KEYBOARD</span>
        </button>
      )}
      <button className="arcade-button" disabled title="Online multiplayer is not available yet.">
        ONLINE <span>COMING SOON</span>
      </button>
    </div>

    <button className="back-button" onClick={goBack}>
      ← BACK
    </button>
  </>
);

const renderLocalMultiplayer = () => (
  <>
    <p className="home-eyebrow">LOCAL HEAD-TO-HEAD</p>
    <h2 className="menu-title">TWO PLAYER BATTLE</h2>
    <p className="menu-description">
      Choose the match format. Both players use the same keyboard.
    </p>

    <div className="choice-grid">
      <button
        className={`choice-button ${teamSize === "1v1" ? "selected" : ""}`}
        onClick={() => setTeamSize("1v1")}
      >
        <strong>1v1</strong>
        <span>ONE FIGHTER EACH</span>
      </button>
      <button
        className={`choice-button ${teamSize === "2v2" ? "selected" : ""}`}
        onClick={() => setTeamSize("2v2")}
      >
        <strong>2v2</strong>
        <span>TWO FIGHTERS EACH</span>
      </button>
    </div>

    <button
      className="arcade-button primary-button continue-button"
      onClick={() =>
        navigate("/character-select", {
          state: {
            gameMode: "quick",
            teamSize,
            difficulty: "Normal",
            teamControl: "pvp",
            localPvP: true,
            playerCount: 2,
          },
        })
      }
    >
      SELECT FIGHTERS <span>▶</span>
    </button>

    <button className="back-button" onClick={goBack}>
      ← BACK
    </button>
  </>
);

const renderSinglePlayer = () => (
  <div className="single-player-screen">
    <div className="single-player-heading">
      <p className="home-eyebrow">CHOOSE YOUR EXPERIENCE</p>
      <h2 className="menu-title">SINGLE PLAYER</h2>
      <p className="menu-description">
        Your journey begins here. Choose how you want to fight.
      </p>
    </div>

    <div className="home-mode-grid">
      <button
        className="mode-card mode-card--quick"
        onClick={() => openMenu("battleSetup")}
      >
        <span className="mode-card-art">
          <span className="mode-art-symbol">VS</span>
        </span>
        <span className="mode-card-info">
          <span className="mode-card-number">01 / COMPETITIVE</span>
          <strong>QUICK BATTLE</strong>
          <span>Enter the arena and fight.</span>
        </span>
        <span className="mode-card-arrow">↗</span>
      </button>

      <button
        className="mode-card mode-card--story"
        onClick={() => navigate("/story-mode")}
      >
        <span className="mode-card-art">
          <span className="mode-art-symbol">章</span>
        </span>
        <span className="mode-card-info">
          <span className="mode-card-number">02 / ADVENTURE</span>
          <strong>STORY MODE</strong>
          <span>Discover the stories behind the fighters.</span>
        </span>
        <span className="mode-card-arrow">↗</span>
      </button>

      <button
        className="mode-card mode-card--simulator"
        onClick={() => navigate("/bot-simulator")}
      >
        <span className="mode-card-art">
          <span className="mode-art-symbol">⚔</span>
        </span>
        <span className="mode-card-info">
          <span className="mode-card-number">03 / SPECTATOR</span>
          <strong>BOT SIMULATOR</strong>
          <span>Watch fighters battle automatically.</span>
        </span>
        <span className="mode-card-arrow">↗</span>
      </button>

      <button
        className="mode-card mode-card--festival"
        onClick={() => navigate("/festival")}
      >
        <span className="mode-card-art">
          <span className="mode-art-symbol">冠</span>
        </span>
        <span className="mode-card-info">
          <span className="mode-card-number">04 / LIMITED EVENTS</span>
          <strong>FESTIVAL</strong>
          <span>Take on challenges and earn rewards.</span>
        </span>
        <span className="mode-card-arrow">↗</span>
      </button>
    </div>

    <button className="back-button" onClick={goBack}>
      ← MAIN MENU
    </button>
  </div>
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
          className={`choice-button ${
            teamSize === "2v2" ? "selected" : ""
          } ${!canPlay2v2 ? "locked-choice" : ""}`}
          disabled={!canPlay2v2}
          title={
            !canPlay2v2
              ? "Unlock at least two characters to play 2v2."
              : "Choose 2v2 Team Battle"
          }
          onClick={() => setTeamSize("2v2")}
        >
          <strong>2v2</strong>
          <span>{canPlay2v2 ? "TEAM BATTLE" : "🔒 OWN 2 FIGHTERS"}</span>
        </button>
      </div>

      <button
        className="arcade-button primary-button continue-button"
        onClick={() => {
          if (teamSize === "2v2" && !canPlay2v2) {
            setTeamSize("1v1");
            return;
          }

          openMenu(teamSize === "2v2" ? "teamControl" : "difficulty");
        }}
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
      case "multiplayer":
        return renderMultiplayer();
      case "localMultiplayer":
        return ENABLE_LOCAL_MULTIPLAYER ? renderLocalMultiplayer() : renderMultiplayer();
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
        <div className="home-header-spacer" />

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
      {showStarterPopup && (
        <div className="starter-modal-overlay">
          <div className="starter-modal starter-modal-expanded" role="dialog" aria-modal="true" aria-labelledby="starter-modal-title">
            <p className="home-eyebrow">WELCOME TO WILD CARDS</p>
            <h2 id="starter-modal-title" className="menu-title">CHOOSE YOUR FIRST FIGHTER</h2>
            <p className="menu-description">
              Choose ONE of these four fighters to permanently unlock for free. Your other choices remain available through the game.
            </p>

            <div className="starter-choice-grid starter-choice-grid-four">
              {STARTER_OPTIONS.map((option) => {
                const data = option.data;
                const selected = selectedStarter === option.id;
                const defense = typeof data.defense === "object" ? data.defense?.amount : data.defense;
                return (
                  <button
                    type="button"
                    key={option.id}
                    className={`starter-choice starter-choice-expanded ${selected ? "selected" : ""}`}
                    onClick={() => setSelectedStarter(option.id)}
                    onMouseEnter={() => setHoveredStarter(option.id)}
                    onMouseLeave={() => setHoveredStarter("")}
                    onFocus={() => setHoveredStarter(option.id)}
                    onBlur={() => setHoveredStarter("")}
                    aria-pressed={selected}
                  >
                    <span className="starter-choice-name">{option.label}</span>
                    <span className="starter-choice-status">{option.role} · FREE STARTER</span>
                    <img src={data.image} alt={option.label} className="starter-choice-image" />
                    <span className="starter-choice-vitals">
                      <span><b>HP</b><strong>{data.health}</strong></span>
                      <span><b>MP</b><strong>{data.maximumMana ?? data.mana}</strong></span>
                    </span>
                    {selected && <span className="starter-selected-check">✓ SELECTED</span>}
                  </button>
                );
              })}
            </div>

            {(hoveredStarter || selectedStarter) && (() => {
              const previewId = hoveredStarter || selectedStarter;
              const fighter = STARTER_OPTIONS.find((option) => option.id === previewId);
              const data = fighter.data;
              const defense = typeof data.defense === "object" ? data.defense?.amount : data.defense;
              return (
                <section className="starter-expanded-details">
                  <div>
                    <span>FIGHTER PROFILE</span>
                    <h3>{fighter.label}</h3>
                    <p>{fighter.role}</p>
                  </div>
                  <div className="starter-detail-stats">
                    {[
                      { label: "DEFENSE", value: defense ?? 0, maximum: 100, tone: "defense" },
                      { label: "AGILITY", value: data.agility ?? 0, maximum: 100, tone: "agility" },
                      { label: "MANA REGEN", value: data.manaRegen ?? 0, maximum: 20, tone: "regen" },
                      { label: "ATTACK SLOTS", value: data.slot ?? data.attacks?.length ?? 0, maximum: 8, tone: "slots" },
                    ].map((stat) => {
                      const value = Math.max(0, Number(stat.value) || 0);
                      const percentage = Math.min(100, (value / stat.maximum) * 100);
                      return (
                        <div className={`starter-stat-bar starter-stat-${stat.tone}`} key={stat.label}>
                          <div className="starter-stat-heading">
                            <span>{stat.label}</span>
                            <strong>{value}<small> / {stat.maximum}</small></strong>
                          </div>
                          <span className="starter-stat-track">
                            <span className="starter-stat-fill" style={{ width: `${percentage}%` }} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}

            <button type="button" className="arcade-button primary-button starter-confirm-button" disabled={!selectedStarter} onClick={confirmStarterSelection}>
              CONFIRM FIGHTER <span>▶</span>
            </button>
            <p className="starter-modal-note">Your first fighter unlock is permanent. Review your choice before confirming.</p>
          </div>
        </div>
      )}

      {showStarterWarning && (
        <div className="starter-warning-overlay">
          <section className="starter-warning-modal" role="alertdialog" aria-modal="true" aria-labelledby="starter-warning-title">
            <span className="starter-warning-icon" aria-hidden="true">⚠</span>
            <p className="home-eyebrow">PERMANENT STARTER UNLOCK</p>
            <h2 id="starter-warning-title">ARE YOU SURE?</h2>
            <p>You are about to permanently unlock <strong>{STARTER_OPTIONS.find((option) => option.id === selectedStarter)?.label}</strong> as your free starter fighter.</p>
            <p className="starter-warning-emphasis">This choice cannot be changed later.</p>
            <div className="starter-warning-actions">
              <button type="button" className="starter-warning-cancel" onClick={() => setShowStarterWarning(false)}>GO BACK</button>
              <button type="button" className="starter-warning-confirm" onClick={finalizeStarterSelection}>YES, UNLOCK FIGHTER</button>
            </div>
          </section>
        </div>
      )}

      <footer className="home-footer">
        <span>INSERT COIN? NAH. JUST FIGHT.</span>
        <span>Wild Cards © 2026</span>
      </footer>
    </main>
  );
}

export default Homescreen;
