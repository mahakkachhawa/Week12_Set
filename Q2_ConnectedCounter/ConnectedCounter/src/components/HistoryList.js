import React from "react";
import { useSelector } from "react-redux";

function HistoryList() {
  const history = useSelector((state) => state.history);

  return (
    <div className="panel">
      <p id="historyCount">{`Operations: ${history.length}`}</p>

      {history.length === 0 ? (
        <p id="historyEmpty" className="muted">No operations yet</p>
      ) : (
        <ul id="historyList">
          {history.map((entry, index) => (
            <li key={index}>{entry}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default HistoryList;
