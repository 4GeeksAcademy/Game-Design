import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initializeAudio, playUISound, startMusic, stopMusic } from "./audioManager.js";

function getTrack(pathname, routeState) {
  // Victory and reward screens get their own one-shot stinger.
  if (pathname.includes("victory") || pathname.includes("story-reward")) return "victory";

  // Story cutscenes and story-mode fights use the separately configurable
  // story playlist. Ordinary 1v1 and 2v2 matches share the battle playlist.
  if (routeState?.gameMode === "story" || pathname.includes("story")) return "story";

  if (
    pathname.includes("team-battle") ||
    pathname.includes("battle") ||
    pathname.includes("watch-mode") ||
    pathname.includes("bot-simulator")
  ) return "battle";

  return "menu";
}

export default function AudioDirector() {
  const location = useLocation();
  const musicCategory = getTrack(location.pathname, location.state);

  useEffect(() => {
    const unlock = () => {
      initializeAudio();
      startMusic(musicCategory);
    };

    // Keep the listener available: some browsers may reject the first play()
    // attempt until a later user gesture.
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
  }, [musicCategory]);

  useEffect(() => {
    startMusic(musicCategory);
    return () => stopMusic();
  }, [musicCategory]);

  return null;
}
