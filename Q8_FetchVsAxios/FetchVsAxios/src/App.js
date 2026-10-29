import React, { useState } from "react";
import { getWithFetch, getWithAxios } from "./api/client";

const TODO_URL = "https://jsonplaceholder.typicode.com/todos/1";

function App() {
  const [loading, setLoading] = useState(false);
  const [todo, setTodo] = useState(null);
  const [error, setError] = useState("");
  const [lastClient, setLastClient] = useState("");
  const [fetchCount, setFetchCount] = useState(0);
  const [axiosCount, setAxiosCount] = useState(0);

  const load = async (client) => {
    if (loading) return;

    setLoading(true);
    setTodo(null);
    setError("");
    setLastClient(client === "fetch" ? "Fetch" : "Axios");
    if (client === "fetch") {
      setFetchCount((prev) => prev + 1);
    } else {
      setAxiosCount((prev) => prev + 1);
    }

    try {
      const data = client === "fetch" ? await getWithFetch(TODO_URL) : await getWithAxios(TODO_URL);
      setTodo(data);
    } catch (err) {
      setError(err.message); // both clients already produce the same messages
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1 id="title">Fetch vs Axios</h1>

      <button id="fetchBtn" disabled={loading} onClick={() => load("fetch")}>Load with Fetch</button>
      <button id="axiosBtn" disabled={loading} onClick={() => load("axios")}>Load with Axios</button>

      <p className="muted">
        Fetch requests: <span id="fetchCount">{fetchCount}</span> | Axios requests:{" "}
        <span id="axiosCount">{axiosCount}</span>
      </p>

      {lastClient && <p id="lastClient">{`Last client: ${lastClient}`}</p>}

      {loading && <p id="loading">Loading...</p>}
      {error && <p id="error" className="error">{error}</p>}

      {todo && (
        <div id="result" className="panel">
          <p id="todoTitle">{`Title: ${todo.title}`}</p>
          <p id="todoStatus">{`Completed: ${todo.completed ? "Yes" : "No"}`}</p>
        </div>
      )}
    </div>
  );
}

export default App;
