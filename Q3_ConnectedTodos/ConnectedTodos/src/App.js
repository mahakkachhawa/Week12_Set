import React from "react";
import AddTodo from "./components/AddTodo";
import TodoList from "./components/TodoList";

function App() {
  return (
    <div className="app">
      <h1 id="title">Connected Todos</h1>
      <AddTodo />
      <TodoList />
    </div>
  );
}

export default App;
