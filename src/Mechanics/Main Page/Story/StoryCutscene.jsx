import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { roster } from "../CharacterSelection.jsx";
import { storyExpressions } from "./StoryExpressions.js";
import { storyBackgrounds } from "./StoryBackgrounds.js";
import { preloadStoryImages } from "./PreloadStoryImages.js";
import "./StoryCutscene.css";

function StoryBackground({ backgroundKey }) {
  const backgroundUrl = storyBackgrounds[backgroundKey];

  const [layers, setLayers] = useState({
    current: { key: backgroundKey, url: backgroundUrl },
    previous: null,
  });

  useEffect(() => {
    if (!backgroundUrl || layers.current?.key === backgroundKey) {
      return;
    }

    const image = new Image();
    let cancelled = false;

    const showBackground = () => {
      if (cancelled) return;

      setLayers((previousLayers) => {
        // Avoid updating state if this background is already current.
        if (previousLayers.current?.key === backgroundKey) {
          return previousLayers;
        }

        return {
          previous: previousLayers.current,
          current: {
            key: backgroundKey,
            url: backgroundUrl,
          },
        };
      });
    };

    image.onload = showBackground;
    image.onerror = showBackground;
    image.src = backgroundUrl;

    // The image may already be cached by the browser.
    if (image.complete) {
      showBackground();
    }

    return () => {
      cancelled = true;
    };
  }, [backgroundKey, backgroundUrl, layers.current?.key]);

    // Remove the old background after the crossfade completes.
useEffect(() => {
  if (!layers.previous) return;

  const timer = setTimeout(() => {
    setLayers((currentLayers) => ({
      ...currentLayers,
      previous: null,
    }));
  }, 700);

  return () => clearTimeout(timer);
}, [layers.previous]);

  return (
    <div className="vn-background-layers" aria-hidden="true">
      {layers.previous && (
        <div
          key={`previous-${layers.previous.key}`}
          className="vn-background-layer vn-background-old"
          style={{
            backgroundImage: `linear-gradient(
              rgba(8, 15, 32, 0.2),
              rgba(8, 15, 32, 0.45)
            ), url("${layers.previous.url}")`,
          }}
        />
      )}

      {layers.current?.url && (
        <div
          key={`current-${layers.current.key}`}
          className="vn-background-layer vn-background-current"
          style={{
            backgroundImage: `linear-gradient(
              rgba(8, 15, 32, 0.2),
              rgba(8, 15, 32, 0.45)
            ), url("${layers.current.url}")`,
          }}
        />
      )}
    </div>
  );
}

function StoryCutscene({
  dialogue: storyDialogue,
  levelConfig: suppliedConfig,
  onComplete,
}) {
  const navigate = useNavigate();

  // Default configuration keeps the cutscene safe if opened directly.
  const levelConfig = suppliedConfig ?? {
    gameMode: "story",
    storyChapter: 1,
    storyLevel: 1,
    teamSize: "1v1",
    difficulty: "Normal",
    teamControl: "single-player",
    opponentId: "rockLee",
    background: null,
  };

  // Use dialogue supplied by the level component.
  const dialogueLines = storyDialogue ?? [
    {
      speaker: "NARRATOR",
      text: "A new challenge awaits. The road to becoming a champion begins here.",
      characterId: null,
      expression: "neutral",
      position: "center",
      animation: "fade",
      background: "opening",
    },
  ];

  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const typingTimerRef = useRef(null);
  const dialogue = dialogueLines[dialogueIndex];

  const fighter = dialogue?.characterId
    ? roster.find((item) => item.id === dialogue.characterId)
    : null;
  const expressionImage = dialogue?.characterId
    ? storyExpressions[dialogue.characterId]?.[dialogue.expression]
    : null;

  const characterImage = expressionImage ?? fighter?.image;
  const fullText = dialogue?.text ?? "";
  const isTextComplete = visibleCharacters >= fullText.length;
  const isLastLine = dialogueIndex === dialogueLines.length - 1;

  const finishCutscene = () => {
    if (onComplete) {
      onComplete();
      return;
    }

    // Preserve the old behavior when no callback is supplied.
    navigate("/character-select", {
      state: {
        ...levelConfig,
        gameMode: "story",
      },
    });
  };

  // Reveal the current line gradually.
useEffect(() => {
  setVisibleCharacters(0);

  let index = 0;

  // Clear any previous typing animation.
  if (typingTimerRef.current) {
    clearInterval(typingTimerRef.current);
  }

  typingTimerRef.current = setInterval(() => {
    index += 1;
    setVisibleCharacters(index);

    if (index >= fullText.length) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, 24);

  return () => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };
}, [dialogueIndex, fullText]);

  // Continue the story or move to character selection.
  const advanceDialogue = () => {
  if (transitioning) return;

  // If text is still typing, reveal it and stop the animation.
  if (!isTextComplete) {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    setVisibleCharacters(fullText.length);
    return;
  }

  if (isLastLine) {
    finishCutscene();
    return;
  }

  setTransitioning(true);

  setTimeout(() => {
    setDialogueIndex((index) => index + 1);
    setTransitioning(false);
  }, 180);
};

  // Space and Enter advance. Escape skips the cutscene.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) return;

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        advanceDialogue();
      }

      if (event.key === "Escape") {
        finishCutscene();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    dialogueIndex,
    visibleCharacters,
    transitioning,
    levelConfig,
    navigate,
    fullText,
    isTextComplete,
    isLastLine,
  ]);

  useEffect(() => {
    preloadStoryImages(storyBackgrounds, storyExpressions, roster);
  }, []);



  return (
    <main className="story-cutscene">
      <header className="vn-header">
        <div className="vn-logo">
          <span className="vn-logo-mark">VS</span>
          <span>FIGHTER'S ARENA</span>
        </div>

        <span className="vn-chapter">
          CHAPTER {levelConfig.storyChapter} · LEVEL {levelConfig.storyLevel}
        </span>

        <button type="button" className="vn-skip" onClick={finishCutscene}>
          SKIP ▶
        </button>
      </header>

      <section
        className={`vn-scene vn-bg-${dialogue.background} ${
          transitioning ? "vn-transitioning" : ""
        }`}
      >
        <StoryBackground backgroundKey={dialogue.background} />

        <div className="vn-atmosphere" />

        {fighter && characterImage && (
          <div
            key={dialogue.characterId}
            className={[
              "vn-character",
              `vn-position-${dialogue.position}`,
              `vn-motion-${dialogue.animation}`,
              `vn-expression-${dialogue.expression}`,
            ].join(" ")}
          >
            <img
              src={characterImage}
              alt={`${fighter.data.name}, ${dialogue.expression}`}
              draggable="false"
            />
          </div>
        )}

        <div className="vn-scene-caption">FIGHTER'S ARENA</div>
        <div className="vn-click-hint">CLICK TO CONTINUE</div>
      </section>

      <section className="vn-dialogue-area" onClick={advanceDialogue}>
        <div className="vn-dialogue-panel">
          <div className="vn-nameplate">{dialogue.speaker}</div>

          <p className="vn-dialogue-text" aria-live="polite">
            {fullText.slice(0, visibleCharacters)}
            {!isTextComplete && (
              <span className="vn-text-cursor" aria-hidden="true">
                ▌
              </span>
            )}
          </p>

          <button
            type="button"
            className="vn-next-button"
            onClick={(event) => {
              event.stopPropagation();
              advanceDialogue();
            }}
          >
            {isLastLine
              ? "CHOOSE YOUR FIGHTER"
              : isTextComplete
                ? "CONTINUE"
                : "SHOW TEXT"}{" "}
            <span>▶</span>
          </button>
        </div>

        <div className="vn-progress">
          <span>
            {String(dialogueIndex + 1).padStart(2, "0")}
            {" / "}
            {String(dialogueLines.length).padStart(2, "0")}
          </span>

          <div className="vn-progress-track">
            <div
              className="vn-progress-fill"
              style={{
                width: `${((dialogueIndex + 1) / dialogueLines.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

export default StoryCutscene;
