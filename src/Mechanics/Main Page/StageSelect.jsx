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

const randomStage = () => STAGES[Math.floor(Math.random() * STAGES.length)];

export default function StageSelect({ localPvP = false, onStart, onBack }) {
  const [singleChoice, setSingleChoice] = useState("arena");
  const [choices, setChoices] = useState({ player1: "arena", player2: "leafVillage" });
  const [ready, setReady] = useState({ player1: false, player2: false });
  const [showdown, setShowdown] = useState(false);
  const [showdownStage, setShowdownStage] = useState("arena");
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => () => {
    window.clearInterval(intervalRef.current);
    window.clearTimeout(timeoutRef.current);
  }, []);

  const chooseRandom = (playerId) => {
    const stage = randomStage().id;
    if (!localPvP) setSingleChoice(stage);
    else setChoices((current) => ({ ...current, [playerId]: stage }));
  };

  const confirmPlayer = (playerId) => {
    if (ready[playerId] || showdown) return;
    const nextReady = { ...ready, [playerId]: true };
    setReady(nextReady);
    if (!nextReady.player1 || !nextReady.player2) return;

    const first = choices.player1;
    const second = choices.player2;
    if (first === second) {
      onStart(first);
      return;
    }

    setShowdown(true);
    let frame = 0;
    intervalRef.current = window.setInterval(() => {
      frame += 1;
      setShowdownStage(STAGES[frame % STAGES.length].id);
    }, 115);
    timeoutRef.current = window.setTimeout(() => {
      window.clearInterval(intervalRef.current);
      const winner = Math.random() < 0.5 ? first : second;
      setShowdownStage(winner);
      window.setTimeout(() => onStart(winner), 1050);
    }, 2650);
  };

  const renderStageCard = (stage, selected, onClick, side) => (
    <button
      type="button"
      key={stage.id}
      className={`stage-select-card ${selected ? "is-selected" : ""}`}
      onClick={onClick}
      disabled={showdown || (localPvP && ready[side])}
      aria-pressed={selected}
    >
      <span className="stage-card-art">
        <img src={storyBackgrounds[stage.id]} alt="" loading="lazy" />
        <span className="stage-card-index">{String(STAGES.indexOf(stage) + 1).padStart(2, "0")}</span>
        {selected && <span className="stage-card-check">✓ LOCKED IN</span>}
      </span>
      <span className="stage-card-copy">
        <strong>{stage.name}</strong>
        <small>{stage.subtitle}</small>
      </span>
    </button>
  );

  return (
    <section className="wild-stage-select" aria-label="Choose battle stage">
      <header className="stage-select-heading">
        {onBack && <button type="button" className="stage-select-back" onClick={onBack}>← CHARACTER SELECT</button>}
        <p>THE ARENA IS YOURS</p>
        <h2>SELECT YOUR STAGE</h2>
        <span>Choose where this battle will become legendary.</span>
      </header>

      {!localPvP ? (
        <>
          <div className="stage-select-grid">
            {STAGES.map((stage) => renderStageCard(stage, singleChoice === stage.id, () => setSingleChoice(stage.id), "player1"))}
          </div>
          <footer className="stage-select-footer">
            <button type="button" className="stage-random-button" onClick={() => chooseRandom("player1")}>⚄ RANDOM STAGE</button>
            <button type="button" className="stage-fight-button" onClick={() => onStart(singleChoice)}>ENTER THE ARENA <span>▶</span></button>
          </footer>
        </>
      ) : (
        <>
          <div className="local-stage-players">
            {["player1", "player2"].map((playerId, index) => (
              <section className={`local-stage-player local-stage-player-${index + 1}`} key={playerId}>
                <header>
                  <strong>PLAYER {index + 1}</strong>
                  <span>{ready[playerId] ? "STAGE LOCKED ✓" : "PICK YOUR BATTLEGROUND"}</span>
                </header>
                <div className="stage-select-grid local-stage-grid">
                  {STAGES.map((stage) => renderStageCard(stage, choices[playerId] === stage.id, () => setChoices((current) => ({ ...current, [playerId]: stage.id })), playerId))}
                </div>
                <div className="local-stage-actions">
                  <button type="button" className="stage-random-button" disabled={ready[playerId] || showdown} onClick={() => chooseRandom(playerId)}>⚄ RANDOM</button>
                  <button type="button" className="stage-ready-button" disabled={ready[playerId] || showdown} onClick={() => confirmPlayer(playerId)}>{ready[playerId] ? "READY ✓" : `P${index + 1} LOCK IN`}</button>
                </div>
              </section>
            ))}
          </div>
          <p className="stage-versus-hint">If your stages don't match, the arena will decide the battleground!</p>
        </>
      )}

      {showdown && (
        <div className="stage-showdown-backdrop" role="alert" aria-live="assertive">
          <div className="stage-showdown-card">
            <p>STAGE CLASH</p>
            <h2>WHOSE ARENA WILL IT BE?</h2>
            <div className="stage-showdown-art">
              <img src={storyBackgrounds[showdownStage]} alt="" />
              <span>⚡</span>
            </div>
            <strong>{STAGES.find((stage) => stage.id === showdownStage)?.name}</strong>
            <small>THE ARENA IS DECIDING...</small>
          </div>
        </div>
      )}
    </section>
  );
}
