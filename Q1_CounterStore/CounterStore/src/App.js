import React, { useEffect, useState } from "react";
import store from "./redux/store";
import { increment, decrement, addAmount, reset } from "./redux/counter";

// Provided in the starter code (not tested): it shows how a component can read
// the store with getState() and listen to changes with subscribe().
function App() {
  const [state, setState] = useState(store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => setState(store.getState()));
    return unsubscribe;
  }, []);

  return (
    <div className="app">
      <h1 id="title">Counter Store</h1>
      <p>
        Count: <strong id="count">{state.count}</strong>
      </p>
      <button onClick={() => store.dispatch(increment())}>+1</button>
      <button onClick={() => store.dispatch(decrement())}>-1</button>
      <button onClick={() => store.dispatch(addAmount(5))}>+5</button>
      <button onClick={() => store.dispatch(reset())}>Reset</button>
      <p className="muted">History: {state.history.join(" ") || "none"}</p>
    </div>
  );
}

export default App;
