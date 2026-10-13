import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import components from Mechanics folder
import Battle from '../Mechanics/Battle.jsx';
import Character from '../Mechanics/Character.jsx';
import Opponent from '../Mechanics/Opponent.jsx';
import VictoryScreen from '../Mechanics/VictoryScreen.jsx';
import Homescreen from '../Mechanics/Main Page/Homescreen.jsx';
import CharacterSelection from '../Mechanics/Main Page/CharacterSelection.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Homescreen />} />
      <Route path="/character-select" element={<CharacterSelection />} />
      <Route path="/battle" element={<Battle />} />
      <Route path="/character" element={<Character />} />
      <Route path="/opponent" element={<Opponent />} />
      <Route path="/victory" element={<VictoryScreen />} />
      <Route path="*" element={<h1>404 Not Found</h1>} />
    </Routes>
  );
};