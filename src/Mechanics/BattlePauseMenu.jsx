import React, { useEffect, useState } from "react";
import {
  ATTACK_SLOT_COUNT, DEFAULT_KEYBINDS, actionLabel, findKeybindConflict,
  getKeybindLabel, isReservedKey, loadKeybinds, normalizeKey, saveKeybinds,
} from "./Main Page/keybinds.js";
import { getAudioSettings, updateAudioSettings } from "../audio/audioManager.js";
import "./BattlePauseMenu.css";

export default function BattlePauseMenu({ onResume, onRestart, onCharacterSelect, onMainMenu, tournamentMode = false }) {
  const [tab, setTab] = useState("pause");
  const [keybinds, setKeybinds] = useState(() => loadKeybinds());
  const [audio, setAudio] = useState(() => getAudioSettings());
  const [listeningFor, setListeningFor] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const blockCombatInput = (event) => {
      if (listeningFor) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", blockCombatInput, true);
    return () => window.removeEventListener("keydown", blockCombatInput, true);
  }, [listeningFor]);

  useEffect(() => {
    if (!listeningFor) return undefined;
    const capture = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setListeningFor(null);
        setMessage("");
        return;
      }
      if (isReservedKey(event)) {
        setMessage("That key is reserved. Choose another key.");
        return;
      }
      const key = normalizeKey(event.key);
      if (!key) return;
      const [playerId, action, slot] = listeningFor.split(".");
      const conflict = action === "navigation" ? null : findKeybindConflict(keybinds, key, listeningFor);
      if (conflict) {
        setMessage(`${getKeybindLabel(key)} is already assigned to ${conflict.playerId === "player1" ? "Player 1" : "Player 2"} ${conflict.label}.`);
        return;
      }
      const next = JSON.parse(JSON.stringify(keybinds));
      if (action === "navigation") next[playerId].navigation[slot] = key;
      else if (action === "attack") next[playerId].attacks[Number(slot)] = key;
      else next[playerId][action] = key;
      setKeybinds(next);
      saveKeybinds(next);
      setListeningFor(null);
      setMessage("Keybind saved.");
    };
    window.addEventListener("keydown", capture, true);
    return () => window.removeEventListener("keydown", capture, true);
  }, [listeningFor, keybinds]);

  const bindButton = (playerId, action, key) => {
    const id = action;
    return <button type="button" className="battle-pause-bind" key={id}
      onClick={() => { setListeningFor(id); setMessage("Press a key. Escape cancels."); }}>
      {listeningFor === id ? "PRESS A KEY…" : getKeybindLabel(key)}
    </button>;
  };
  const resetBinds = () => {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_KEYBINDS));
    setKeybinds(defaults); saveKeybinds(defaults); setListeningFor(null);
    setMessage("Default keybinds restored.");
  };
  const changeAudio = (key, value) => setAudio(updateAudioSettings({ [key]: value }));

  return <section className="battle-pause-overlay" role="dialog" aria-modal="true" aria-label="Game paused">
    <div className="battle-pause-panel">
      <header className="battle-pause-header"><span>WILD CARDS</span><h2>PAUSED</h2></header>
      {tab === "settings" && <button className="battle-pause-back" onClick={() => setTab("pause")}>← BACK TO PAUSE MENU</button>}
      {tab === "pause" && <div className="battle-pause-actions">
        <button className="primary" onClick={onResume}>RESUME MATCH</button>
        <button onClick={() => setTab("settings")}>SETTINGS</button>
        {!tournamentMode && <button onClick={onRestart}>RESTART MATCH</button>}
        {!tournamentMode && <button onClick={onCharacterSelect}>CHARACTER SELECT</button>}
        <button className="danger" onClick={onMainMenu}>
          {tournamentMode ? "FORFEIT TOURNAMENT" : "MAIN MENU"}
        </button>
      </div>}
      {tab === "settings" && <div className="battle-pause-settings battle-pause-all-settings">
        <p>Choose a binding and press the key you want. Navigation keys may overlap; attacks and combat actions must remain unique.</p>
        <div className="battle-pause-player-grid">
          {["player1", "player2"].map((playerId, playerIndex) => <section className="battle-pause-player" key={playerId}>
            <h3>PLAYER {playerIndex + 1}</h3>
            <h4>NAVIGATION</h4>
            {["up", "down", "left", "right"].map((direction) => {
              const id = playerId + ".navigation." + direction;
              return <div className="battle-pause-bind-row" key={id}><span>Move {direction}</span>{bindButton(playerId, id, keybinds[playerId].navigation[direction])}</div>;
            })}
            <h4>ATTACKS</h4>
            {Array.from({ length: ATTACK_SLOT_COUNT }, (_, index) => {
              const id = playerId + ".attack." + index;
              return <div className="battle-pause-bind-row" key={id}><span>Attack {index + 1}</span>{bindButton(playerId, id, keybinds[playerId].attacks[index])}</div>;
            })}
            <h4>COMBAT</h4>
            {["finishTurn", "defend", "evade", "takeDamage"].map((action) => {
              const id = playerId + "." + action;
              return <div className="battle-pause-bind-row" key={id}><span>{actionLabel(action)}</span>{bindButton(playerId, id, keybinds[playerId][action])}</div>;
            })}
          </section>)}
        </div>
        {message && <p className="battle-pause-message" role="status">{message}</p>}
        <button className="battle-pause-reset" onClick={resetBinds}>RESTORE DEFAULT KEYBINDS</button>
        <section className="battle-pause-audio-section">
          <h3> AUDIO SETTINGS </h3>
          <p>These settings are shared with the Home Screen and save automatically.</p>
          {[
            ["master", "Master volume", "Controls all game audio."],
            ["music", "Background music", "Menu, story, and battle themes."],
            ["effects", "Sound effects", "Buttons, impacts, and action sounds."],
            ["voices", "Character voices", "Dialogue and character reactions."],
          ].map(([key, label, description]) => <label className="battle-pause-audio-row" key={key}>
            <span><strong>{label}</strong><small>{description}</small></span>
            <span><input type="range" min="0" max="1" step="0.05" value={audio[key]} onChange={(event) => changeAudio(key, Number(event.target.value))}/><output>{Math.round(audio[key] * 100)}%</output></span>
          </label>)}
          <label className="battle-pause-mute"><span><strong>Mute all audio</strong><small>Silence music, effects, and voices.</small></span><input type="checkbox" checked={audio.muted} onChange={(event) => changeAudio("muted", event.target.checked)}/></label>
          
        </section>
        <section className="battle-pause-visual-section">
          <h3>VISUAL EFFECTS</h3>
          <p>Customize the movement effects used throughout the game. These settings save automatically.</p>
          <label className="battle-pause-visual-toggle motion-blur-setting-row">
            <span>
              <strong>Motion Blur</strong>
              <small>Adds subtle movement blur to animated fighters, attacks, impacts, and transitions. Turning it off keeps every animation intact.</small>
            </span>
            <input
              type="checkbox"
              checked={audio.motionBlur !== false}
              onChange={(event) => changeAudio("motionBlur", event.target.checked)}
              aria-label="Enable motion blur"
            />
          </label>
        </section>
      </div>}
      {tab === "settings" && <button className="battle-pause-close" onClick={onResume}>SAVE SETTINGS & RESUME</button>}
      {tab === "pause" && <button className="battle-pause-close" onClick={onResume}>BACK TO MATCH</button>}
    </div>
  </section>;
}
