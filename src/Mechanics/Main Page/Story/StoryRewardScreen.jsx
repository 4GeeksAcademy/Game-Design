
import React from "react";
import { useEffect } from "react";
import { unlockAchievement } from "../Achievements.js";
import { useLocation, useNavigate } from "react-router-dom";
import { STORY_REWARDS } from "./StoryRewards.js";
import "./StoryRewardScreen.css";

function StoryRewardScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  const rewardKey = location.state?.rewardKey;
  const reward = STORY_REWARDS[rewardKey];
  useEffect(() => {
  if (reward?.achievementId) {
    unlockAchievement(reward.achievementId);
  }
}, [reward]);

  const continueStory = () => {
    navigate(location.state?.returnTo ?? "/story-mode", {
      state: location.state?.returnState ?? {
        gameMode: "story",
        storyChapter: 1,
        storyLevel: 1,
        level1Completed: true,
      },
    });
  };

  // Prevent displaying an invalid or missing reward.
  if (!reward) {
    return (
      <main className="story-reward-screen">
        <div className="story-reward-content">
          <h1>REWARD NOT FOUND</h1>
          <button onClick={continueStory}>
            RETURN TO STORY MODE
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="story-reward-screen">
      <div className="story-reward-content">

        <p className="story-reward-eyebrow">
          STORY MODE REWARD
        </p>

        <h1 className="story-reward-title">
          {reward.title}
        </h1>

        <div className="story-reward-character">
          <div className="story-reward-glow" />

          <img
            src={reward.artwork}
            alt={reward.characterName}
          />
        </div>

        <h2 className="story-reward-name">
          {reward.characterName}
        </h2>

        <p className="story-reward-unlocked">
          CHARACTER UNLOCKED!
        </p>

        <p className="story-reward-description">
          {reward.description}
        </p>

        <p className="story-reward-requirement">
          REWARD: {reward.requirement}
        </p>

        <button
          className="story-reward-continue"
          onClick={continueStory}
        >
          CONTINUE
        </button>

      </div>
    </main>
  );
}

export default StoryRewardScreen;
