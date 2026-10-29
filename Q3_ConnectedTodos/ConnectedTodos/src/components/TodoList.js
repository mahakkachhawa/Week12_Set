import React from "react";
import { connect } from "react-redux";
import { toggleTodo, removeTodo, clearCompleted } from "../redux/todos";

function TodoList({ items, onToggle, onRemove, onClearCompleted }) {
  const remaining = items.filter((item) => !item.done).length;
  const doneCount = items.length - remaining;

  return (
    <div>
      {items.length === 0 ? (
        <p id="emptyMessage" className="muted">No tasks yet</p>
      ) : (
        <ul id="todoList">
          {items.map((item) => (
            <li key={item.id}>
              <input
                id={`toggle-${item.id}`}
                type="checkbox"
                checked={item.done}
                onChange={() => onToggle(item.id)}
              />
              <span id={`text-${item.id}`}>{item.text}</span>
              <button id={`remove-${item.id}`} onClick={() => onRemove(item.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      <p id="remainingCount">{`Items left: ${remaining}`}</p>
      <button id="clearCompletedBtn" disabled={doneCount === 0} onClick={onClearCompleted}>
        Clear Completed
      </button>
    </div>
  );
}

// connect() reads the state it needs and passes the action dispatchers as props
const mapStateToProps = (state) => ({ items: state.items });
const mapDispatchToProps = {
  onToggle: toggleTodo,
  onRemove: removeTodo,
  onClearCompleted: clearCompleted,
};

export default connect(mapStateToProps, mapDispatchToProps)(TodoList);
