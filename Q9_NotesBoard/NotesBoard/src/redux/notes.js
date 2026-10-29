// ACTION TYPES
export const LOAD_REQUEST = "notes/loadRequest";
export const LOAD_SUCCESS = "notes/loadSuccess";
export const LOAD_FAILURE = "notes/loadFailure";
export const SAVE_REQUEST = "notes/saveRequest";
export const SAVE_SUCCESS = "notes/saveSuccess";
export const SAVE_FAILURE = "notes/saveFailure";

// ACTION CREATORS
export const loadRequest = () => ({ type: LOAD_REQUEST });
export const loadSuccess = (notes) => ({ type: LOAD_SUCCESS, payload: notes });
export const loadFailure = (message) => ({ type: LOAD_FAILURE, payload: message });
export const saveRequest = () => ({ type: SAVE_REQUEST });
export const saveSuccess = (note) => ({ type: SAVE_SUCCESS, payload: note });
export const saveFailure = (message) => ({ type: SAVE_FAILURE, payload: message });

const initialState = { notes: [], loading: false, saving: false, error: null };

// REDUCER
function notesReducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_REQUEST:
      return { ...state, loading: true, error: null };
    case LOAD_SUCCESS:
      return { ...state, loading: false, notes: action.payload };
    case LOAD_FAILURE:
      return { ...state, loading: false, error: action.payload };
    case SAVE_REQUEST:
      return { ...state, saving: true, error: null };
    case SAVE_SUCCESS:
      return { ...state, saving: false, notes: [...state.notes, action.payload] };
    case SAVE_FAILURE:
      return { ...state, saving: false, error: action.payload }; // notes are kept
    default:
      return state;
  }
}

export default notesReducer;
