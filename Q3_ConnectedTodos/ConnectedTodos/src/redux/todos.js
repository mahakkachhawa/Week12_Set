// ACTION TYPES
export const ADD_TODO = "todos/add";
export const TOGGLE_TODO = "todos/toggle";
export const REMOVE_TODO = "todos/remove";
export const CLEAR_COMPLETED = "todos/clearCompleted";

// ACTION CREATORS
export const addTodo = (text) => ({ type: ADD_TODO, payload: text });
export const toggleTodo = (id) => ({ type: TOGGLE_TODO, payload: id });
export const removeTodo = (id) => ({ type: REMOVE_TODO, payload: id });
export const clearCompleted = () => ({ type: CLEAR_COMPLETED });

const initialState = { items: [], nextId: 1 };

// REDUCER (pure: it never changes the old state)
function todosReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_TODO: {
      const text = typeof action.payload === "string" ? action.payload.trim() : "";
      if (text === "") return state;
      return {
        items: [...state.items, { id: state.nextId, text, done: false }],
        nextId: state.nextId + 1,
      };
    }

    case TOGGLE_TODO: {
      if (!state.items.some((item) => item.id === action.payload)) return state;
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload ? { ...item, done: !item.done } : item
        ),
      };
    }

    case REMOVE_TODO: {
      if (!state.items.some((item) => item.id === action.payload)) return state;
      return { ...state, items: state.items.filter((item) => item.id !== action.payload) };
    }

    case CLEAR_COMPLETED: {
      if (!state.items.some((item) => item.done)) return state;
      return { ...state, items: state.items.filter((item) => !item.done) };
    }

    default:
      return state;
  }
}

export default todosReducer;
