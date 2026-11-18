import React, { useCallback, useEffect, useState } from "react";
import { getMusicBeatInfo } from "../../audio/audioManager.js";
import "./GameIntro.css";

const INTRO_SLIDES = [
  {
    id: "credit",
    lines: ["A PRODUCTION", "CREATED BY A WELL-KNOWN", "FIFA SUPER SOCCER CONTENT CREATOR"],
    className: "game-intro-credit",
  },
  {
    id: "beta",
    lines: ["YOU'RE PLAYING THE BETA VERSION", "OF THE GAME", "SO EXPECT MANY BUGS."],
    className: "game-intro-beta",
  },
  {
    id: "community",
    lines: ["JOIN THE DISCORD SERVER", "JSM HUB ON MY GITHUB PROFILE", "FOR MORE UPDATES."],
    className: "game-intro-community",
  },
];

// INTRO TIMING TEST SETTINGS
// Testing only: set useCustomBpm to false to return to the active music track's
// BPM automatically. Change customBpm to compare intro pacing without editing
// the music files or their BPM metadata.
const INTRO_TIMING = {
  useCustomBpm: true,
  customBpm: 150,
  beatsPerLine: 2,
};

// The intro follows a beat clock derived from either the test BPM above or the
// active track's BPM. It does not depend on audio currentTime, so it remains
// reliable while music is loading, muted, or blocked by autoplay.
function getIntroBeatTiming() {
  const musicInfo = getMusicBeatInfo();
  const parsedMusicBpm = Number(musicInfo?.bpm);
  const musicBpm = Number.isFinite(parsedMusicBpm) && parsedMusicBpm > 0
    ? parsedMusicBpm
    : 120;
  const parsedTestBpm = Number(INTRO_TIMING.customBpm);
  const testBpm = Number.isFinite(parsedTestBpm) && parsedTestBpm > 0
    ? parsedTestBpm
    : musicBpm;
  const bpm = INTRO_TIMING.useCustomBpm ? testBpm : musicBpm;
  const beatsPerLine = Math.max(1, Number(INTRO_TIMING.beatsPerLine) || 2);
  const stepDuration = (60 / bpm) * beatsPerLine * 1000;

  return {
    bpm,
    delay: stepDuration,
    stepDuration,
  };
}

export default function GameIntro({ onComplete }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [isFinal, setIsFinal] = useState(false);
  const [finalWordIndex, setFinalWordIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  const finishIntro = useCallback(() => {
    if (finished) return;
    setFinished(true);
    onComplete();
  }, [finished, onComplete]);

  useEffect(() => {
    if (finished) return undefined;

    const { delay, stepDuration } = getIntroBeatTiming();
    const timer = window.setTimeout(() => {
      if (isFinal) {
        if (finalWordIndex < 2) {
          setFinalWordIndex((current) => current + 1);
        } else {
          finishIntro();
        }
        return;
      }

      const currentSlide = INTRO_SLIDES[slideIndex];
      if (lineIndex < currentSlide.lines.length - 1) {
        // Reveal one additional line; keep the earlier lines on screen.
        setLineIndex((current) => current + 1);
      } else if (slideIndex < INTRO_SLIDES.length - 1) {
        setSlideIndex((current) => current + 1);
        setLineIndex(0);
      } else {
        setIsFinal(true);
        setFinalWordIndex(0);
      }
    }, isFinal && finalWordIndex === 2 ? stepDuration : delay);

    return () => window.clearTimeout(timer);
  }, [slideIndex, lineIndex, isFinal, finalWordIndex, finished, finishIntro]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Tab") return;
      event.preventDefault();
      finishIntro();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finishIntro]);

  const slide = INTRO_SLIDES[slideIndex];
  const finalWords = ["LET'S", "WILD", "CARD!"];

  return (
    <main className={`game-intro ${isFinal ? "is-final" : ""}`} aria-live="polite">
      <div className="game-intro-grid" />
      <div className="game-intro-scanlines" />

      {!isFinal ? (
        <section key={slide.id} className={`game-intro-card ${slide.className}`}>
          <span className="game-intro-index">INTRODUCTION</span>
          <div className="game-intro-copy">
            {slide.lines.slice(0, lineIndex + 1).map((line, index) => (
              <span key={`${slide.id}-${index}`}>
                {line}
              </span>
            ))}
          </div>
          <span className="game-intro-progress">
            {String(slideIndex + 1).padStart(2, "0")} / 04
          </span>
        </section>
      ) : (
        <section className="game-intro-finale" aria-label="Let's Wild Card">
          <span className="game-intro-countdown">GET READY</span>
          <h1>
            {finalWords.slice(0, finalWordIndex + 1).map((word, index) => (
              <span
                key={word}
                className={index === 2 ? "game-intro-card-word" : ""}
              >
                {word}
              </span>
            ))}
          </h1>
          {finalWordIndex === 2 && (
            <span className="game-intro-impact">THE ARENA IS YOURS.</span>
          )}
        </section>
      )}

      <button type="button" className="game-intro-skip" onClick={finishIntro}>
        PRESS ANY KEY TO SKIP <span>▶</span>
      </button>
    </main>
  );
}
