import React from 'react';
import logo from './logo.svg';
import './App.css';
import {HashRouter, Navigate, Route, Routes} from "react-router-dom";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate replace to="/home" />} />
        <Route path="/" element={<Navigate replace to="/home" />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
