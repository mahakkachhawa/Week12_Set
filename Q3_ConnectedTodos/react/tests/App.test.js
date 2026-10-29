import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { legacy_createStore as createStore } from "redux";
import "@testing-library/jest-dom";
import todosReducer, {
  addTodo,
  toggleTodo,
  removeTodo,
  clearCompleted,
  ADD_TODO,
  TOGGLE_TODO,
  REMOVE_TODO,
  CLEAR_COMPLETED,
} from "../redux/todos";
import AddTodo from "../components/AddTodo";
import TodoList from "../components/TodoList";
import App from "../App";

const START = { type: "@@TEST_INIT" };
const EMPTY = { items: [], nextId: 1 };

const deepFreeze = (value) => {
  Object.freeze(value);
  Object.values(value).forEach((inner) => {
    if (typeof inner === "object" && inner !== null && !Object.isFrozen(inner)) deepFreeze(inner);
  });
  return value;
};

const apply = (state, ...actions) => actions.reduce((current, action) => todosReducer(current, action), state);

const renderApp = () => {
  const store = createStore(todosReducer);
  const utils = render(
    <Provider store={store}>
      <App />
    </Provider>
  );
  return { store, ...utils };
};

const q = (container, selector) => container.querySelector(selector);
const text = (container, selector) => q(container, selector).textContent;
const click = (container, selector) => fireEvent.click(q(container, selector));
const addTask = (container, value) => {
  fireEvent.change(q(container, "#todoInput"), { target: { value } });
  click(container, "#addBtn");
};

describe("Connected Todos App (reducer + connect)", () => {
  test("verify_add_todo_trims_the_text_gives_increasing_ids_and_ignores_blank_text", () => {
    expect(todosReducer(undefined, START)).toEqual(EMPTY);
    expect([ADD_TODO, TOGGLE_TODO, REMOVE_TODO, CLEAR_COMPLETED]).toEqual([
      "todos/add",
      "todos/toggle",
      "todos/remove",
      "todos/clearCompleted",
    ]);
    expect(addTodo("x")).toEqual({ type: "todos/add", payload: "x" });
    expect(toggleTodo(2)).toEqual({ type: "todos/toggle", payload: 2 });

    const one = apply(undefined, addTodo("  Buy milk "));
    expect(one).toEqual({ items: [{ id: 1, text: "Buy milk", done: false }], nextId: 2 });

    const two = apply(one, addTodo("Walk"));
    expect(two.items.map((item) => item.id)).toEqual([1, 2]);
    expect(two.nextId).toBe(3);

    expect(todosReducer(two, addTodo("   "))).toBe(two);
    expect(todosReducer(two, addTodo(undefined))).toBe(two);
  });

  test("verify_toggle_todo_flips_done_and_ignores_unknown_ids", () => {
    const state = apply(undefined, addTodo("A"), addTodo("B"));
    const toggled = todosReducer(state, toggleTodo(2));
    expect(toggled.items.map((item) => item.done)).toEqual([false, true]);

    const back = todosReducer(toggled, toggleTodo(2));
    expect(back.items[1].done).toBe(false);

    expect(todosReducer(state, toggleTodo(99))).toBe(state);
  });

  test("verify_remove_and_clear_completed_keep_the_id_counter", () => {
    let state = apply(undefined, addTodo("A"), addTodo("B"), addTodo("C"));
    state = apply(state, toggleTodo(1), toggleTodo(3));

    const removed = todosReducer(state, removeTodo(2));
    expect(removed.items.map((item) => item.text)).toEqual(["A", "C"]);
    expect(todosReducer(state, removeTodo(99))).toBe(state);

    const cleared = todosReducer(state, clearCompleted());
    expect(cleared.items.map((item) => item.text)).toEqual(["B"]);
    expect(cleared.nextId).toBe(4);
    expect(todosReducer(cleared, clearCompleted())).toBe(cleared); // nothing completed
  });

  test("verify_reducer_never_mutates_the_previous_state", () => {
    const previous = deepFreeze(apply(undefined, addTodo("A"), addTodo("B"), toggleTodo(1)));
    [addTodo("C"), toggleTodo(2), removeTodo(1), clearCompleted()].forEach((action) => {
      const next = todosReducer(previous, action); // throws if a frozen object is changed
      expect(next).not.toBe(previous);
      expect(next.items).not.toBe(previous.items);
    });
    expect(previous.items.length).toBe(2);
  });

  test("verify_both_components_are_connected_to_the_store_with_connect", () => {
    expect(AddTodo.WrappedComponent).toBeDefined();
    expect(TodoList.WrappedComponent).toBeDefined();
  });

  test("verify_adding_a_task_shows_it_clears_the_input_and_updates_the_store", () => {
    const { container, store } = renderApp();
    expect(text(container, "#emptyMessage")).toBe("No tasks yet");

    addTask(container, "Buy milk");
    expect(text(container, "#text-1")).toBe("Buy milk");
    expect(q(container, "#todoInput").value).toBe("");
    expect(q(container, "#emptyMessage")).not.toBeInTheDocument();
    expect(store.getState().items).toEqual([{ id: 1, text: "Buy milk", done: false }]);
    expect(text(container, "#remainingCount")).toBe("Items left: 1");
  });

  test("verify_blank_task_shows_an_error_and_is_not_added", () => {
    const { container, store } = renderApp();
    addTask(container, "   ");
    expect(text(container, "#addError")).toBe("Enter a task");
    expect(store.getState().items.length).toBe(0);

    addTask(container, "Real task");
    expect(q(container, "#addError")).not.toBeInTheDocument();
    expect(store.getState().items.length).toBe(1);
  });

  test("verify_checkbox_toggles_done_and_updates_the_remaining_count", () => {
    const { container, store } = renderApp();
    addTask(container, "A");
    addTask(container, "B");
    expect(text(container, "#remainingCount")).toBe("Items left: 2");

    click(container, "#toggle-1");
    expect(q(container, "#toggle-1").checked).toBe(true);
    expect(text(container, "#remainingCount")).toBe("Items left: 1");
    expect(store.getState().items[0].done).toBe(true);

    click(container, "#toggle-1");
    expect(q(container, "#toggle-1").checked).toBe(false);
    expect(text(container, "#remainingCount")).toBe("Items left: 2");
  });

  test("verify_remove_button_deletes_only_that_task", () => {
    const { container, store } = renderApp();
    addTask(container, "A");
    addTask(container, "B");
    click(container, "#remove-1");

    expect(q(container, "#text-1")).not.toBeInTheDocument();
    expect(text(container, "#text-2")).toBe("B");
    expect(text(container, "#remainingCount")).toBe("Items left: 1");
    expect(store.getState().items.length).toBe(1);
  });

  test("verify_clear_completed_removes_only_completed_tasks_and_is_disabled_without_them", () => {
    const { container } = renderApp();
    expect(q(container, "#clearCompletedBtn")).toBeDisabled();

    addTask(container, "A");
    addTask(container, "B");
    addTask(container, "C");
    expect(q(container, "#clearCompletedBtn")).toBeDisabled();

    click(container, "#toggle-1");
    click(container, "#toggle-3");
    expect(q(container, "#clearCompletedBtn")).toBeEnabled();

    click(container, "#clearCompletedBtn");
    expect(q(container, "#text-1")).not.toBeInTheDocument();
    expect(q(container, "#text-3")).not.toBeInTheDocument();
    expect(text(container, "#text-2")).toBe("B");
    expect(q(container, "#clearCompletedBtn")).toBeDisabled();
  });
});
