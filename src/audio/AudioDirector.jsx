import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getAudioSettings,
  initializeAudio,
  playUISound,
  startMusic,
  stopMusic,
  updateAudioSettings,
} from "./audioManager.js";

function getTrack(pathname) {
  if (pathname.includes("battle") || pathname.includes("watch-mode") || pathname.includes("bot-simulator")) return "battle";
  if (pathname.includes("story")) return "story";
  if (pathname.includes("victory") || pathname.includes("story-reward")) return "victory";
  return "menu";
}

function AudioControls() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(getAudioSettings());

  const changeSetting = (key, value) => {
    const next = updateAudioSettings({ [key]: value });
    setSettings(next);
  };

  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 10000, fontFamily: "inherit" }}>
      {open && (
        <div style={{
          width: 220, marginBottom: 9, padding: 14, borderRadius: 12,
          color: "#f5f7ff", background: "rgba(8, 13, 28, .96)",
          border: "1px solid rgba(19, 213, 255, .45)",
          boxShadow: "0 8px 30px rgba(0,0,0,.35)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong style={{ fontSize: 12, letterSpacing: 1 }}>AUDIO SETTINGS</strong>
            <button type="button" aria-label="Close audio settings" onClick={() => setOpen(false)} style={smallButton}>×</button>
          </div>
          {[
            ["master", "Master"],
            ["music", "Music"],
            ["effects", "Sound effects"],
          ].map(([key, label]) => (
            <label key={key} style={{ display: "block", fontSize: 11, margin: "10px 0" }}>
              <span style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span>{label}</span><span>{Math.round(settings[key] * 100)}%</span>
              </span>
              <input
                aria-label={label + " volume"}
                type="range" min="0" max="1" step="0.05"
                value={settings[key]}
                onChange={(event) => changeSetting(key, Number(event.target.value))}
                style={{ width: "100%", accentColor: "#13d5ff" }}
              />
            </label>
          ))}
          <button type="button" onClick={() => changeSetting("muted", !settings.muted)} style={{ ...smallButton, width: "100%", marginTop: 6 }}>
            {settings.muted ? "UNMUTE AUDIO" : "MUTE AUDIO"}
          </button>
        </div>
      )}
      <button
        type="button"
        aria-label="Open audio settings"
        title="Audio settings"
        onClick={() => setOpen((value) => !value)}
        style={{
          width: 42, height: 42, borderRadius: "50%", cursor: "pointer",
          color: "#f5f7ff", background: "rgba(8, 13, 28, .92)",
          border: "1px solid rgba(19, 213, 255, .65)",
          boxShadow: "0 4px 16px rgba(0,0,0,.3)", fontSize: 17,
        }}
      >
        ♫
      </button>
    </div>
  );
}

const smallButton = {
  color: "#f5f7ff", background: "rgba(19, 213, 255, .12)",
  border: "1px solid rgba(19, 213, 255, .35)", borderRadius: 7,
  padding: "5px 9px", cursor: "pointer", fontSize: 11,
};

export default function AudioDirector() {
  const location = useLocation();

  useEffect(() => {
    const unlock = () => {
      initializeAudio();
      startMusic(getTrack(window.location.pathname));
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    const handleClick = (event) => {
      const control = event.target.closest("button, [role='button'], a");
      if (!control || control.disabled || control.getAttribute("aria-disabled") === "true") return;
      const label = (control.getAttribute("aria-label") || control.textContent || "").toLowerCase();
      playUISound(/back|cancel|close|return/.test(label) ? "back" : "click");
    };
    document.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  useEffect(() => {
    startMusic(getTrack(location.pathname));
    return () => stopMusic();
  }, [location.pathname]);

  return <AudioControls />;
}
