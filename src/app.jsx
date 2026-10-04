import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";



import "./assets/img/rigo-baby.jpg";
import "./assets/img/4geeks.ico";

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from "./Backend/routes.jsx";

// window.onload = function() {
//   //write your code here
//   console.log("Hello Rigo from the console!");
// };





const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>
);

export default AppRoutes