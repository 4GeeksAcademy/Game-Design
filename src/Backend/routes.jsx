import React, { useCallback, useState } from "react";
import GameIntro from "../Mechanics/Main Page/GameIntro.jsx";
import { Routes, Route, useLocation } from "react-router-dom";

// Import components from Mechanics folder
import Achievements from "../Mechanics/Main Page/Achievements.jsx";
import Inventory from "../Mechanics/Main Page/Inventory.jsx";
import Battle from "../Mechanics/Battle.jsx";
import TeamBattle from "../Mechanics/TeamBattle.jsx";
import LocalPvPBattle from "../Mechanics/LocalPvPBattle.jsx";
import Character from "../Mechanics/Character.jsx";
import Opponent from "../Mechanics/Opponent.jsx";
import VictoryScreen from "../Mechanics/VictoryScreen.jsx";
import Homescreen from "../Mechanics/Main Page/Homescreen.jsx";
import CharacterSelection from "../Mechanics/Main Page/CharacterSelection.jsx";
import Shop from "../Mechanics/Main Page/Shop.jsx";
import BotSimulator from "../Mechanics/BotSimulator.jsx";
import WatchMode from "../Mechanics/WatchMode";
import Tournament from "../Mechanics/Tournament.jsx";
import StoryMode from "../Mechanics/Main Page/Story/StoryMode.jsx";
import Festival from "../Mechanics/Main Page/Festival/Festival.jsx";
import StoryRewardScreen from "../Mechanics/Main Page/Story/StoryRewardScreen.jsx";
import StoryLevel1 from "../Mechanics/Main Page/Story/StoryLevel1.jsx";

function BattleRoute() {
  const location = useLocation();
  return location.state?.localPvP ? <LocalPvPBattle /> : <Battle />;
}

function TeamBattleRoute() {
  const location = useLocation();
  return location.state?.localPvP ? <LocalPvPBattle /> : <TeamBattle />;
}

export const AppRoutes = () => {
  const [introComplete, setIntroComplete] = useState(false);
  const finishIntro = useCallback(() => setIntroComplete(true), []);

  if (!introComplete) {
    return <GameIntro onComplete={finishIntro} />;
  }

  return (
    <Routes>
      <Route path="/watch-mode" element={<WatchMode />} />
      <Route path="/tournament" element={<Tournament />} />
      <Route path="/bot-simulator" element={<BotSimulator />} />
      <Route path="/" element={<Homescreen />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/character-select" element={<CharacterSelection />} />
      <Route path="/battle" element={<BattleRoute />} />
      <Route path="/team-battle" element={<TeamBattleRoute />} />
      <Route path="/character" element={<Character />} />
      <Route path="/opponent" element={<Opponent />} />
      <Route path="/victory" element={<VictoryScreen />} />
      <Route path="/story-mode" element={<StoryMode />} />
       <Route path="/Festival" element={<Festival />} />
       <Route path="/story-reward" element={<StoryRewardScreen />} />
      <Route path="/story-cutscene" element={<StoryLevel1 />} />
      <Route path="/achievements" element={<Achievements />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="*" element={<h1>404 Not Found</h1>} />
     
    </Routes>
  );
};
