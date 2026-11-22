import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import "@fortawesome/fontawesome-free/css/all.min.css";



import "./assets/img/rigo-baby.jpg";
import "./assets/img/Wild Cards Neon Graffiti Emblem.ico";

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from "./Backend/routes.jsx";
import AudioDirector from "./audio/AudioDirector.jsx";

// window.onload = function() {
//   //write your code here
//   console.log("Hello Rigo from the console!");
// };





const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(
  <React.StrictMode>
    <BrowserRouter basename="/Game-Design">
      <AudioDirector />
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>
);

export default AppRoutes