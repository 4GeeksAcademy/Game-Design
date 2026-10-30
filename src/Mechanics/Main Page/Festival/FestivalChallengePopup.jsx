import React, { useEffect, useState } from "react";
import "./FestivalChallengePopup.css";

function FestivalChallengePopup() {
  const [notifications, setNotifications] = useState([]);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const handleChallengeCompleted = (event) => {
      const challenge = event.detail;

      setNotifications((current) => [
        ...current,
        {
          ...challenge,
          notificationId: `${Date.now()}-${Math.random()}`,
        },
      ]);
    };

    window.addEventListener(
      "festivalChallengeCompleted",
      handleChallengeCompleted,
    );

    window.addEventListener(
  "festivalDailyObjectiveCompleted",
  handleChallengeCompleted
);

    return () => {
      window.removeEventListener(
        "festivalChallengeCompleted",
        handleChallengeCompleted,
      );

      window.removeEventListener(
  "festivalDailyObjectiveCompleted",
  handleChallengeCompleted
);
    };
  }, []);

  useEffect(() => {
    if (notifications.length === 0) return;

    setIsExiting(false);

    const fadeTimer = setTimeout(() => {
      setIsExiting(true);
    }, 3000);

    const removeTimer = setTimeout(() => {
      setNotifications((current) => current.slice(1));
    }, 3500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [notifications[0]?.notificationId]);

  const activeChallenge = notifications[0];

  if (!activeChallenge) return null;

  return (
    <div
  className={`festival-completion-container ${
    isExiting ? "festival-popup-exit" : ""
  }`}
>
      <div className="festival-completion-popup">
        <div className="festival-completion-icon">
          {activeChallenge.icon || "🏆"}
        </div>

        <div className="festival-completion-content">
          <span className="festival-completion-label">CHALLENGE COMPLETED</span>

          <h3>{activeChallenge.title}</h3>

          <p>{activeChallenge.description}</p>

          <span className="festival-completion-points">
            +{activeChallenge.points} FESTIVAL POINTS
          </span>
        </div>
      </div>
    </div>
  );
}

export default FestivalChallengePopup;
