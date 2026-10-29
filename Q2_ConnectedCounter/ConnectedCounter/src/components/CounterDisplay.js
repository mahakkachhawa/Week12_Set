import React from "react";
import { useSelector } from "react-redux";

// Reads the count from the store (no local state)
function CounterDisplay() {
  const count = useSelector((state) => state.count);

  return (
    <p>
      Count: <strong id="count">{count}</strong>
    </p>
  );
}

export default CounterDisplay;
