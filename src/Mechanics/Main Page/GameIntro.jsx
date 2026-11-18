import React, { useEffect, useState } from "react";
import "./GameIntro.css";

const INTRO_SLIDES = [
  {
    id: "credit",
    lines: ["A PRODUCTION", "CREATED BY A WELL-KNOWN", "FIFA SUPER SOCCER CONTENT CREATOR"],
    className: "game-intro-credit",
  },
  {
    id: "beta",
    lines: ["YOU'RE PLAYING THE BETA VERSION", "OF THE GAME—", "SO EXPECT MANY BUGS."],
    className: "game-intro-beta",
  },
  {
    id: "community",
    lines: ["JOIN THE DISCORD SERVER", "JSM HUB ON MY GITHUB PROFILE", "FOR MORE UPDATES."],
    className: "game-intro-community",
  },
];

const SLIDE_DURATION = 2600;
const FINAL_DURATION = 2600;

export default function GameIntro({ onComplete }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (finished) return undefined;

    const isFinal = slideIndex === INTRO_SLIDES.length;
    const timer = window.setTimeout(() => {
      if (isFinal) {
        onComplete();
      } else {
        setSlideIndex((current) => current + 1);
      }
    }, isFinal ? FINAL_DURATION : SLIDE_DURATION);

    return () => window.clearTimeout(timer);
  }, [slideIndex, finished, onComplete]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Tab") return;
      event.preventDefault();
      setFinished(true);
      onComplete();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onComplete]);

  const isFinal = slideIndex === INTRO_SLIDES.length;
  const slide = INTRO_SLIDES[slideIndex];

  return (
    <main className={`game-intro ${isFinal ? "is-final" : ""}`} aria-live="polite">
      <div className="game-intro-grid" />
      <div className="game-intro-scanlines" />

      {!isFinal ? (
        <section key={slide.id} className={`game-intro-card ${slide.className}`}>
          <span className="game-intro-index">WILD CARDS // SYSTEM MESSAGE</span>
          <div className="game-intro-copy">
            {slide.lines.map((line, index) => (
              <span key={line} style={{ "--line-index": index }}>
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
            <span>LET'S—</span>
            <span>WILD—</span>
            <span className="game-intro-card-word">CARD!</span>
          </h1>
          <span className="game-intro-impact">THE GAME IS YOURS.</span>
        </section>
      )}

      <button
        type="button"
        className="game-intro-skip"
        onClick={() => {
          setFinished(true);
          onComplete();
        }}
      >
        PRESS ANY KEY TO SKIP <span>▶</span>
      </button>
    </main>
  );
}
