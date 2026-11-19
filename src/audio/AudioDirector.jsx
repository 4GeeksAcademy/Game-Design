import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initializeAudio, playUISound, startMusic, getMusicBeatInfo, resumeMusic } from "./audioManager.js";

function getTrack(pathname, routeState) {
  // Reward and victory screens keep their dedicated victory music.
  if (pathname.includes("victory") || pathname.includes("story-reward")) {
    return "victory";
  }

  // Story Mode has its own two-step music flow:
  // 1. Play the character-selection theme while choosing a fighter.
  // 2. Switch to the Story Mode level theme once the battle begins.
  // This check must come before the general Story Mode check below.
  if (
    routeState?.gameMode === "story" &&
    (pathname.includes("character-select") ||
      pathname.includes("character-selection"))
  ) {
    return "characterSelect";
  }

  // Keep the Story Mode level theme through both 1v1 and team battles.
  // Quick Battle and the other non-story modes never enter this branch.
  if (routeState?.gameMode === "story") {
    return "story";
  }

  // Non-story modes retain their normal screen-specific playlists.
  if (
    pathname.includes("team-battle") ||
    pathname === "/battle" ||
    pathname.endsWith("/battle") ||
    pathname.includes("watch-mode") ||
    pathname.includes("bot-simulator")
  ) {
    return "battle";
  }

  if (
    pathname.includes("character-select") ||
    pathname.includes("character-selection")
  ) {
    return "characterSelect";
  }

  if (pathname.includes("story")) return "story";
  return "menu";
}

export default function AudioDirector() {
  const location = useLocation();
  const musicCategory = getTrack(location.pathname, location.state);

  useEffect(() => {
    const unlock = () => {
      initializeAudio();
      resumeMusic();
    };

    // Keep the listener available: some browsers may reject the first play()
    // attempt until a later user gesture.
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    const handleClick = (event) => {
      const control = event.target.closest("button, [role='button'], a");
      if (!control || control.disabled || control.getAttribute("aria-disabled") === "true") return;
      // Attack cards play their own heavier action sound from their handlers.
      if (control.matches(".attack-card, .team-attack-card")) return;
      const label = (control.getAttribute("aria-label") || control.textContent || "").toLowerCase();
      playUISound(/back|cancel|close|return/.test(label) ? "back" : "click");
    };
    // Capture phase catches buttons even when a component stops propagation.
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("click", handleClick, true);
    };
  }, [musicCategory]);

  useEffect(() => {
    const isBattleRoute =
      location.pathname === "/battle" ||
      location.pathname.endsWith("/battle") ||
      location.pathname.includes("team-battle");

    // Story battles switch to the Story Mode playlist, never the selection theme.
    if (isBattleRoute && location.state?.gameMode === "story") {
      startMusic("story");
      return;
    }

    startMusic(musicCategory);
  }, [musicCategory, location.pathname, location.state?.preserveMusicOnBattle]);


  // Keep CSS logo animations locked to the active track's BPM metadata.
  useEffect(() => {
    const updateTempo = () => {
      const { bpm } = getMusicBeatInfo();
      const safeBpm = Number(bpm) > 0 ? Number(bpm) : 120;
      document.documentElement.style.setProperty("--wc-bpm", String(safeBpm));
      document.documentElement.style.setProperty("--wc-beat-duration", `${60 / safeBpm}s`);
    };
    updateTempo();
    window.addEventListener("wildcards:musicchange", updateTempo);
    return () => window.removeEventListener("wildcards:musicchange", updateTempo);
  }, [musicCategory]);

  return null;
}
