import React, { useEffect, useRef, useState } from "react";
import { storyBackgrounds } from "./Story/StoryBackgrounds.js";
import "./StageSelect.css";

const STAGES = [
  { id: "arena", name: "WILDCARD ARENA", subtitle: "THE CLASSIC SHOWDOWN" },
  { id: "leafVillage", name: "HIDDEN LEAF", subtitle: "VILLAGE OUTSKIRTS" },
  { id: "leafCorner1", name: "LEAF DISTRICT", subtitle: "BACKSTREET CORNER" },
  { id: "leafCorner2", name: "VILLAGE CROSSING", subtitle: "THE OLD QUARTER" },
  { id: "leafEntrance", name: "LEAF GATES", subtitle: "THE VILLAGE ENTRANCE" },
  { id: "leafNight", name: "LEAF AT NIGHT", subtitle: "MOONLIT STREETS" },
  { id: "hotelRoom", name: "HIDDEN LEAF INN", subtitle: "THE QUIET ROOM" },
];
const MYSTERY_STAGE = { id: "mystery", name: "MYSTERY STAGE", subtitle: "LET FATE DECIDE" };
const STAGE_TILES = [...STAGES, MYSTERY_STAGE];
const randomStage = () => STAGES[Math.floor(Math.random() * STAGES.length)].id;
const wrapIndex = (index, delta) => (index + delta + STAGE_TILES.length) % STAGE_TILES.length;

export default function StageSelect({ localPvP = false, onStart, onBack }) {
  const [selected, setSelected] = useState({ player1: 0, player2: 1 });
  const [activePlayer, setActivePlayer] = useState("player1");
  const [ready, setReady] = useState({ player1: false, player2: false });
  const [showdown, setShowdown] = useState(false);
  const [showdownStage, setShowdownStage] = useState("arena");
  const [transitioning, setTransitioning] = useState(false);
  const [transitionStage, setTransitionStage] = useState("arena");
  const [transitionLabel, setTransitionLabel] = useState("PREPARING THE ARENA");
  const intervalRef = useRef(null);
  const timeoutRefs = useRef([]);

  const clearTimers = () => {
    window.clearInterval(intervalRef.current);
    timeoutRefs.current.forEach(window.clearTimeout);
    timeoutRefs.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const getResolvedChoice = (playerId) => {
    const id = STAGE_TILES[selected[playerId]]?.id ?? "arena";
    return id === "mystery" ? randomStage() : id;
  };

  const beginBattleTransition = (stageId) => {
    if (transitioning) return;
    setTransitionStage(stageId);
    setTransitionLabel("THE BATTLE IS ABOUT TO BEGIN");
    setTransitioning(true);
    timeoutRefs.current.push(window.setTimeout(() => onStart?.(stageId), 1050));
  };

  const confirmPlayer = (playerId) => {
    if (ready[playerId] || showdown || transitioning) return;
    if (!localPvP) {
      beginBattleTransition(getResolvedChoice("player1"));
      return;
    }

    const nextReady = { ...ready, [playerId]: true };
    setReady(nextReady);
    if (!nextReady.player1 || !nextReady.player2) return;

    const first = getResolvedChoice("player1");
    const second = getResolvedChoice("player2");
    if (first === second) {
      beginBattleTransition(first);
      return;
    }

    setShowdown(true);
    let frame = 0;
    intervalRef.current = window.setInterval(() => {
      frame += 1;
      setShowdownStage(STAGES[frame % STAGES.length].id);
    }, 115);
    timeoutRefs.current.push(window.setTimeout(() => {
      window.clearInterval(intervalRef.current);
      const winner = Math.random() < 0.5 ? first : second;
      setShowdownStage(winner);
      timeoutRefs.current.push(window.setTimeout(() => beginBattleTransition(winner), 800));
    }, 2450));
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat || showdown || transitioning) return;
      const key = event.key.toLowerCase();
      const p1Keys = ["w", "a", "s", "d"];
      const p2Keys = ["arrowup", "arrowleft", "arrowdown", "arrowright"];
      if (key === "tab" && localPvP) {
        event.preventDefault();
        setActivePlayer((current) => current === "player1" ? "player2" : "player1");
        return;
      }

      let playerId = activePlayer;
      let delta = 0;
      if (p1Keys.includes(key)) {
        playerId = "player1";
        delta = key === "a" || key === "w" ? -1 : 1;
      } else if (p2Keys.includes(key)) {
        playerId = "player2";
        delta = key === "arrowleft" || key === "arrowup" ? -1 : 1;
      } else if (key === "enter" || key === " ") {
        event.preventDefault();
        confirmPlayer(playerId);
        return;
      } else if (key === "f" && localPvP) {
        confirmPlayer("player2");
        return;
      } else {
        return;
      }

      event.preventDefault();
      if (ready[playerId]) return;
      setActivePlayer(playerId);
      setSelected((current) => ({
        ...current,
        [playerId]: wrapIndex(current[playerId], delta),
      }));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePlayer, localPvP, ready, showdown, transitioning]);

  const chooseTile = (index) => {
    if (showdown || transitioning) return;
    const playerId = localPvP ? activePlayer : "player1";
    if (ready[playerId]) return;
    setSelected((current) => ({ ...current, [playerId]: index }));
  };

  const renderTile = (stage, index) => {
    const isMystery = stage.id === "mystery";
    const p1Selected = selected.player1 === index;
    const p2Selected = localPvP && selected.player2 === index;
    const focused = localPvP ? activePlayer : "player1";
    return (
      <button
        type="button"
        key={stage.id}
        className={`stage-select-card ${p1Selected ? "is-p1-selected" : ""} ${p2Selected ? "is-p2-selected" : ""} ${(p1Selected || p2Selected) ? "is-selected" : ""}`}
        onClick={() => chooseTile(index)}
        disabled={showdown || transitioning || (localPvP && ready[focused])}
        aria-pressed={p1Selected || p2Selected}
      >
        <span className="stage-card-art">
          {isMystery ? (
            <span className="stage-mystery-art"><strong>?</strong><small>RANDOM DESTINATION</small></span>
          ) : <img src={storyBackgrounds[stage.id]} alt="" loading="lazy" />}
          <span className="stage-card-index">{isMystery ? "??" : String(index + 1).padStart(2, "0")}</span>
          {p1Selected && <span className="stage-player-marker p1-marker">P1</span>}
          {p2Selected && <span className="stage-player-marker p2-marker">P2</span>}
        </span>
        <span className="stage-card-copy">
          <strong>{stage.name}</strong>
          <small>{stage.subtitle}</small>
        </span>
      </button>
    );
  };

  return (
    <section className={`wild-stage-select ${localPvP ? "is-shared-local-select" : ""}`} aria-label="Choose battle stage">
      <header className="stage-select-heading">
        {onBack && <button type="button" className="stage-select-back" onClick={onBack}>← CHARACTER SELECT</button>}
        <p>THE ARENA IS YOURS</p>
        <h2>SELECT YOUR STAGE</h2>
        <span>{localPvP ? "ONE SHARED MAP. TWO PLAYERS. PICK YOUR DESTINATION." : "Use WASD or the arrow keys to move. Enter to lock in."}</span>
      </header>

      {localPvP && (
        <div className="shared-stage-player-status">
          <button type="button" className={`shared-stage-player p1 ${activePlayer === "player1" ? "is-active" : ""} ${ready.player1 ? "is-ready" : ""}`} onClick={() => !ready.player1 && setActivePlayer("player1")}>
            <strong>PLAYER 1 · WASD</strong><span>{ready.player1 ? "LOCKED IN ✓" : selected.player1 === 7 ? "MYSTERY PICK" : STAGES[selected.player1]?.name}</span>
          </button>
          <button type="button" className={`shared-stage-player p2 ${activePlayer === "player2" ? "is-active" : ""} ${ready.player2 ? "is-ready" : ""}`} onClick={() => !ready.player2 && setActivePlayer("player2")}>
            <strong>PLAYER 2 · ARROWS</strong><span>{ready.player2 ? "LOCKED IN ✓" : selected.player2 === 7 ? "MYSTERY PICK" : STAGES[selected.player2]?.name}</span>
          </button>
        </div>
      )}

      <div className="stage-select-grid shared-stage-grid">
        {STAGE_TILES.map(renderTile)}
      </div>

      <footer className="stage-select-footer">
        {localPvP ? (
          <>
            <button type="button" className="stage-ready-button p1-ready-button" disabled={ready.player1 || showdown || transitioning} onClick={() => confirmPlayer("player1")}>{ready.player1 ? "P1 LOCKED ✓" : "PLAYER 1 · LOCK IN"}</button>
            <button type="button" className="stage-ready-button p2-ready-button" disabled={ready.player2 || showdown || transitioning} onClick={() => confirmPlayer("player2")}>{ready.player2 ? "P2 LOCKED ✓" : "PLAYER 2 · LOCK IN"}</button>
          </>
        ) : (
          <button type="button" className="stage-fight-button" onClick={() => confirmPlayer("player1")}>ENTER THE ARENA <span>▶</span></button>
        )}
      </footer>
      {localPvP && <p className="stage-versus-hint">P1: WASD + Enter · P2: Arrow keys + F · Tab switches the active cursor. Both players use this same map grid.</p>}

      {showdown && (
        <div className="stage-showdown-backdrop" role="alert" aria-live="assertive">
          <div className="stage-showdown-card">
            <p>STAGE CLASH</p><h2>WHOSE ARENA WILL IT BE?</h2>
            <div className="stage-showdown-art"><img src={storyBackgrounds[showdownStage]} alt="" /><span>⚡</span></div>
            <strong>{STAGES.find((stage) => stage.id === showdownStage)?.name}</strong>
            <small>THE ARENA IS DECIDING...</small>
          </div>
        </div>
      )}

      {transitioning && (
        <div className="stage-battle-transition" role="status" aria-live="assertive">
          <div className="stage-transition-art" style={{ backgroundImage: `url("${storyBackgrounds[transitionStage]}")` }} />
          <div className="stage-transition-content"><span>WILD CARDS</span><h2>{transitionLabel}</h2><p>{STAGES.find((stage) => stage.id === transitionStage)?.name}</p><i /></div>
        </div>
      )}
    </section>
  );
}
