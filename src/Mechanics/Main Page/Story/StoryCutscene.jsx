import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { roster } from "../CharacterSelection.jsx";
import { storyExpressions } from "./StoryExpressions.js";
import "./StoryCutscene.css";

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

    const timer = setInterval(() => {
      index += 1;
      setVisibleCharacters(index);

      if (index >= fullText.length) {
        clearInterval(timer);
      }
    }, 24);

    return () => clearInterval(timer);
  }, [dialogueIndex, fullText]);

  // Continue the story or move to character selection.
  const advanceDialogue = () => {
    if (transitioning) return;

    if (!isTextComplete) {
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
        onClick={advanceDialogue}
        aria-label="Story scene. Click to advance dialogue."
      >
        <div className="vn-atmosphere" />

        {fighter && characterImage && (
          <div
            key={`${dialogue.characterId}-${dialogue.expression}-${dialogueIndex}`}
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
