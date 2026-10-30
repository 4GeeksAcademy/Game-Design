
import React, { useEffect, useState } from "react";
import "./FestivalChallengePopup.css";

function FestivalChallengePopup() {
  const [notifications, setNotifications] = useState([]);

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
      handleChallengeCompleted
    );

    return () => {
      window.removeEventListener(
        "festivalChallengeCompleted",
        handleChallengeCompleted
      );
    };
  }, []);

  useEffect(() => {
    if (notifications.length === 0) return;

    const timer = setTimeout(() => {
      setNotifications((current) => current.slice(1));
    }, 3500);

    return () => clearTimeout(timer);
  }, [notifications[0]?.notificationId]);

  const activeChallenge = notifications[0];

  if (!activeChallenge) return null;

  return (
    <div className="festival-completion-container">
      <div className="festival-completion-popup">
        <div className="festival-completion-icon">
          {activeChallenge.icon || "🏆"}
        </div>

        <div className="festival-completion-content">
          <span className="festival-completion-label">
            CHALLENGE COMPLETED
          </span>

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
