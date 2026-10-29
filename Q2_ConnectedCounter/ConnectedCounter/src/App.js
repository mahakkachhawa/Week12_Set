import React from "react";
import CounterDisplay from "./components/CounterDisplay";
import CounterControls from "./components/CounterControls";
import HistoryList from "./components/HistoryList";

// App does not create the store: the Provider in index.js shares it with every component
function App() {
  return (
    <div className="app">
      <h1 id="title">Connected Counter</h1>
      <CounterDisplay />
      <CounterControls />
      <HistoryList />
    </div>
  );
}

export default App;
