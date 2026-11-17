import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initializeAudio, playUISound, startMusic, stopMusic } from "./audioManager.js";

function getTrack(pathname) {
  if (pathname.includes("team-battle")) return "battle2v2";
  if (pathname.includes("battle") || pathname.includes("watch-mode") || pathname.includes("bot-simulator")) return "battle1v1";
  if (pathname.includes("victory") || pathname.includes("story-reward")) return "victory";
  if (pathname.includes("story")) return "story";
  return "menu";
}

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

  return null;
}
