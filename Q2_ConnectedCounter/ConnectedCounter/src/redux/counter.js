// ACTION TYPES
export const INCREMENT = "INCREMENT";
export const DECREMENT = "DECREMENT";
export const ADD_AMOUNT = "ADD_AMOUNT";
export const RESET = "RESET";

// ACTION CREATORS: plain functions that return plain action objects
export const increment = () => ({ type: INCREMENT });
export const decrement = () => ({ type: DECREMENT });
export const addAmount = (amount) => ({ type: ADD_AMOUNT, payload: amount });
export const reset = () => ({ type: RESET });

const initialState = { count: 0, history: [] };

// REDUCER: a pure function (state, action) => new state. It never changes the old state.
function counterReducer(state = initialState, action) {
  switch (action.type) {
    case INCREMENT:
      return { count: state.count + 1, history: [...state.history, "+1"] };

    case DECREMENT:
      if (state.count === 0) return state; // nothing changes, so return the same state
      return { count: state.count - 1, history: [...state.history, "-1"] };

    case ADD_AMOUNT: {
      const amount = action.payload;
      if (!Number.isInteger(amount) || amount <= 0) return state; // ignore bad amounts
      return { count: state.count + amount, history: [...state.history, `+${amount}`] };
    }

    case RESET:
      return { count: 0, history: [] };

    default:
      return state; // unknown action: return the same state
  }
}

export default counterReducer;
