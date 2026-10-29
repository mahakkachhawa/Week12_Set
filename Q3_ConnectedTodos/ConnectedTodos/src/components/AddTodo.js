import React, { useState } from "react";
import { connect } from "react-redux";
import { addTodo } from "../redux/todos";

// A normal component: it only knows the props it receives
function AddTodo({ onAdd }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    if (text.trim() === "") {
      setError("Enter a task");
      return;
    }
    onAdd(text);
    setText("");
    setError("");
  };

  return (
    <div>
      <input
        id="todoInput"
        type="text"
        placeholder="New task"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <button id="addBtn" onClick={handleAdd}>Add</button>
      {error && <p id="addError" className="error">{error}</p>}
    </div>
  );
}

// connect() gives the component its action dispatchers as props
const mapDispatchToProps = { onAdd: addTodo };

export default connect(null, mapDispatchToProps)(AddTodo);
