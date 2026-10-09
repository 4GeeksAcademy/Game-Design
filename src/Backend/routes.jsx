import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import components from Mechanics folder
import Battle from '../Mechanics/Battle.jsx';
import Character from '../Mechanics/Character.jsx';
import Opponent from '../Mechanics/Opponent.jsx';
import VictoryScreen from '../Mechanics/VictoryScreen.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Battle />} />
      <Route path="/character" element={<Character />} />
      <Route path="/opponent" element={<Opponent />} />
      <Route path="/victory" element={<VictoryScreen />} />
      <Route path="*" element={<h1>404 Not Found</h1>} />
    </Routes>
  );
};